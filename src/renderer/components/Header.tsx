import { cn } from '../lib/utils'
import { Button } from './ui/button'

interface HeaderProps {
  isAuthenticated: boolean
  onLogin: () => void
  onLogout: () => void
}

export function Header({ isAuthenticated, onLogin, onLogout }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          Prompt Bench
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              isAuthenticated
                ? "bg-emerald-500 animate-pulse-subtle"
                : "bg-red-400"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {isAuthenticated ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {isAuthenticated ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Logout
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={onLogin}
          >
            Connect Gmail
          </Button>
        )}
      </div>
    </header>
  )
}
