import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const toggleTheme = () => {
    // Simple theme toggle for now
    document.documentElement.classList.toggle('dark')
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme}>
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="h-4 w-4 hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
