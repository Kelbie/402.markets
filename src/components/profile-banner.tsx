import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import type { NostrProfile } from "@/lib/types"

interface ProfileBannerProps {
  pubkey: string
  profile: NostrProfile | null
  apiCount: number
}

export function ProfileBanner({ pubkey, profile, apiCount }: ProfileBannerProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const displayName = profile?.name || pubkey.slice(0, 8) + "..."
  const avatarUrl = profile?.picture || `https://api.dicebear.com/7.x/shapes/svg?seed=${pubkey}`
  const isProfileLoading = !profile

  return (
    <div className="relative bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Avatar */}
          <div className="relative">
            {imageLoading && <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full absolute inset-0" />}
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
              <AvatarImage
                src={avatarUrl || "/placeholder.svg"}
                alt={displayName}
                onLoad={() => setImageLoading(false)}
              />
              <AvatarFallback className="text-2xl md:text-3xl font-semibold">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left space-y-2">
            {isProfileLoading ? (
              <Skeleton className="h-10 md:h-12 w-48 mx-auto md:mx-0" />
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold">{displayName}</h1>
            )}

            {profile?.about && <p className="text-muted-foreground max-w-2xl">{profile.about}</p>}

            {/* Stats */}
            <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
              <div className="text-center md:text-left">
                <div className="text-2xl font-bold font-mono">{apiCount}</div>
                <div className="text-sm text-muted-foreground">API{apiCount !== 1 ? "s" : ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
