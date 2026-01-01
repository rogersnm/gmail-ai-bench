import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { BrowserWindow, shell } from 'electron'
import * as http from 'http'
import * as url from 'url'
import Store from 'electron-store'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const store = new Store<{ tokens: object | null }>({
  name: 'gmail-oauth',
  encryptionKey: 'gmail-ai-bench-secure-key',
})

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
]

const REDIRECT_PORT = 8234
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`

let oauth2Client: OAuth2Client | null = null

function getCredentials(): { client_id: string; client_secret: string } | null {
  const credentialsPath = join(process.cwd(), 'resources', 'client_secret.json')

  if (!existsSync(credentialsPath)) {
    console.error('client_secret.json not found in resources folder')
    return null
  }

  try {
    const content = readFileSync(credentialsPath, 'utf-8')
    const credentials = JSON.parse(content)
    const installed = credentials.installed || credentials.web
    return {
      client_id: installed.client_id,
      client_secret: installed.client_secret,
    }
  } catch (error) {
    console.error('Error reading credentials:', error)
    return null
  }
}

export function getOAuth2Client(): OAuth2Client | null {
  if (oauth2Client) {
    return oauth2Client
  }

  const credentials = getCredentials()
  if (!credentials) {
    return null
  }

  oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    REDIRECT_URI
  )

  // Load saved tokens if available
  const savedTokens = store.get('tokens')
  if (savedTokens) {
    oauth2Client.setCredentials(savedTokens as object)
  }

  return oauth2Client
}

export function isAuthenticated(): boolean {
  const client = getOAuth2Client()
  if (!client) return false

  const tokens = store.get('tokens')
  return !!tokens
}

export async function authenticate(): Promise<void> {
  const client = getOAuth2Client()
  if (!client) {
    throw new Error('Could not initialize OAuth client. Make sure client_secret.json exists.')
  }

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })

  return new Promise((resolve, reject) => {
    // Start local server to receive callback
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url?.startsWith('/oauth2callback')) {
          const query = url.parse(req.url, true).query
          const code = query.code as string

          if (code) {
            const { tokens } = await client.getToken(code)
            client.setCredentials(tokens)
            store.set('tokens', tokens)

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>')

            server.close()
            resolve()
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Authentication failed</h1></body></html>')
            server.close()
            reject(new Error('No authorization code received'))
          }
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end('<html><body><h1>Authentication error</h1></body></html>')
        server.close()
        reject(error)
      }
    })

    server.listen(REDIRECT_PORT, () => {
      // Open browser for authentication
      shell.openExternal(authUrl)
    })

    server.on('error', (error) => {
      reject(error)
    })

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close()
      reject(new Error('Authentication timeout'))
    }, 5 * 60 * 1000)
  })
}

export function logout(): void {
  store.delete('tokens')
  if (oauth2Client) {
    oauth2Client.revokeCredentials()
    oauth2Client = null
  }
}
