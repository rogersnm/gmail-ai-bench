# Gmail Electron

An Electron app that wraps Gmail with an LLM-powered prompt bench. Create natural language prompts to automate Gmail actions using Claude on AWS Bedrock.

## Features

- **Gmail Integration**: Native Gmail experience in a desktop app
- **LLM Prompt Bench**: Write natural language prompts to interact with your email
- **Claude on Bedrock**: Uses Anthropic's Claude via AWS Bedrock for intelligent email automation
- **Tool Use**: Claude can search, read, send, archive, label, and organize emails
- **Saved Prompts**: Save and reuse your favorite prompts

## Prerequisites

- Node.js 18+
- AWS account with Bedrock access and Claude model enabled
- Google Cloud project with Gmail API enabled

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/rogersnm/gmail-ai-bench.git
cd gmail-ai-bench
npm install
```

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Gmail API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Select **Desktop app** as the application type
6. Download the credentials JSON
7. Save it as `resources/client_secret.json`

### 3. AWS Bedrock Setup

1. Ensure you have AWS CLI configured (`~/.aws/credentials`)
2. Enable Claude model access in your AWS Bedrock console
3. Set environment variables (or use defaults):

```bash
export BEDROCK_REGION=eu-south-2
export BEDROCK_MODEL=eu.anthropic.claude-opus-4-5-20251101-v1:0
```

### 4. Run the App

```bash
# Development
npm run dev

# Production build
npm run build
npm run start
```

## Usage

1. **Connect Gmail**: Click "Connect Gmail" and authorize the app
2. **Write a prompt**: Enter a natural language instruction in the prompt editor
3. **Run**: Click "Run" or press `Cmd+Enter` to execute
4. **View results**: Watch the execution log for tool calls and responses

### Example Prompts

- "Find all unread emails from the last week and summarize them"
- "Search for emails from Amazon and list my recent orders"
- "Draft a reply to the most recent email from John"
- "Archive all newsletters older than 30 days"
- "Find emails with attachments from this month"

## Available Tools

The LLM has access to these Gmail operations:

| Tool | Description |
|------|-------------|
| `search_emails` | Search emails using Gmail query syntax |
| `read_email` | Read full content of an email |
| `send_email` | Send a new email |
| `create_draft` | Create a draft email |
| `archive_email` | Archive an email |
| `trash_email` | Move email to trash |
| `mark_as_read` | Mark email as read |
| `mark_as_unread` | Mark email as unread |
| `add_label` | Add a label to an email |
| `remove_label` | Remove a label from an email |
| `get_labels` | List all available labels |

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── index.ts          # App entry point
│   ├── gmail-view.ts     # BrowserView for Gmail
│   ├── auth/             # Google OAuth
│   ├── gmail/            # Gmail API client
│   ├── llm/              # Bedrock integration
│   └── storage/          # Prompt persistence
├── renderer/             # React prompt bench UI
│   ├── App.tsx
│   └── components/
├── preload/              # IPC bridge
└── shared/               # Shared types
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BEDROCK_REGION` | `eu-south-2` | AWS region for Bedrock |
| `BEDROCK_MODEL` | `eu.anthropic.claude-opus-4-5-20251101-v1:0` | Claude model ID |
| `AWS_PROFILE` | `default` | AWS credentials profile |

## License

MIT License - see [LICENSE](LICENSE) for details.

## Security Notes

- OAuth tokens are stored locally with encryption
- Gmail API credentials (`client_secret.json`) should never be committed
- The app only requests necessary Gmail scopes
- All LLM processing happens via your own AWS account
