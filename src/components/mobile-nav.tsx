import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      
      {open && (
        <div className="absolute top-16 left-4 right-4 bg-background border border-border rounded-md shadow-lg z-50 p-4">
          <nav className="flex flex-col gap-2">
            <Link to="/" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className={`w-full justify-start ${location.pathname === "/" ? "bg-accent" : ""}`}>
                Browse APIs
              </Button>
            </Link>
            <Link to="/dashboard" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start ${location.pathname === "/dashboard" ? "bg-accent" : ""}`}
              >
                Dashboard
              </Button>
            </Link>
            <Link to="/analytics" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start ${location.pathname === "/analytics" ? "bg-accent" : ""}`}
              >
                Analytics
              </Button>
            </Link>
            <Link to="/settings" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start ${location.pathname === "/settings" ? "bg-accent" : ""}`}
              >
                Settings
              </Button>
            </Link>
            <Link to="/docs" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start ${location.pathname === "/docs" ? "bg-accent" : ""}`}
              >
                Docs
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}
