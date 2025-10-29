import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Link } from "react-router-dom"
import { User, LogOut } from "lucide-react"
import type { NostrUser } from "@/lib/types"

interface UserProfileButtonProps {
  user: NostrUser
  onLogout: () => void
}

export function UserProfileButton({ user, onLogout }: UserProfileButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.profile?.picture} alt={user.profile?.name || "User"} />
            <AvatarFallback className="text-xs">
              {user.profile?.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-mono">
            {user.profile?.name || user.pubkey.slice(0, 8)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/p/${user.pubkey}`} className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
