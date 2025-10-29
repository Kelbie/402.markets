import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserProfileButton } from "@/components/user-profile-button"
import { MobileNav } from "@/components/mobile-nav"
import type { NostrUser } from "@/lib/types"

interface AppHeaderProps {
  user: NostrUser | null
  currentPage: 'home' | 'dashboard' | 'docs' | 'settings' | 'analytics'
  onLoginClick: () => void
  onLogout: () => void
  subtitle?: string
}

export function AppHeader({ 
  user, 
  currentPage, 
  onLoginClick, 
  onLogout, 
  subtitle 
}: AppHeaderProps) {
  const defaultSubtitle = currentPage === 'home' 
    ? ""
    : currentPage === 'docs'
    ? "API documentation and examples"
    : currentPage === 'dashboard'
    ? "Your published APIs"
    : currentPage === 'settings'
    ? "Configure your Lightning, Cashu, and Nostr settings"
    : currentPage === 'analytics'
    ? "Track your endpoint performance and revenue"
    : ""

  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4">
            {user && <MobileNav />}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/favicon.png" alt="402.markets" width={24} height={24} className="h-5 w-5 md:h-6 md:w-6" />
              <h1 className="text-base md:text-lg font-mono font-semibold">402.markets</h1>
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="sm" className={currentPage === 'home' ? 'bg-accent' : ''}>
                  Browse
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className={currentPage === 'dashboard' ? 'bg-accent' : ''}>
                  Dashboard
                </Button>
              </Link>
              <Link to="/analytics">
                <Button variant="ghost" size="sm" className={currentPage === 'analytics' ? 'bg-accent' : ''}>
                  Analytics
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="sm" className={currentPage === 'settings' ? 'bg-accent' : ''}>
                  Settings
                </Button>
              </Link>
              <Link to="/docs">
                <Button variant="ghost" size="sm" className={currentPage === 'docs' ? 'bg-accent' : ''}>
                  Docs
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <UserProfileButton user={user} onLogout={onLogout} />
            ) : (
              <Button variant="ghost" size="sm" onClick={onLoginClick}>
                <LogIn className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Login</span>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground font-mono mt-2 md:mt-1">
          {subtitle || defaultSubtitle}
        </p>
      </div>
    </header>
  )
}
