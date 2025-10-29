import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Zap } from "lucide-react"
import { loginWithExtension } from "@/lib/nostr"
import type { NostrUser } from "@/lib/types"

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess: (user: NostrUser) => void
}

export function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExtensionLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await loginWithExtension()
      if (result) {
        const user: NostrUser = {
          pubkey: result.pubkey,
          npub: result.npub,
          profile: {
            name: result.user.profile?.name,
            displayName: result.user.profile?.displayName,
            picture: result.user.profile?.image,
            banner: result.user.profile?.banner,
            about: result.user.profile?.about,
            nip05: result.user.profile?.nip05,
            lud16: result.user.profile?.lud16,
          },
        }
        onLoginSuccess(user)
        onOpenChange(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login with Nostr extension")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login with Nostr</DialogTitle>
          <DialogDescription>Connect your Nostr identity to access personalized features</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleExtensionLogin} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Login with Extension
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Requires a Nostr browser extension like Alby, nos2x, or Flamingo
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
