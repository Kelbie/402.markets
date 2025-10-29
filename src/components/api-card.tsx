import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Zap, Lock, Bitcoin, MoreVertical, Trash2 } from "lucide-react"
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import { parseProfileFromEvent } from "@/lib/profiles"
import { processReactions } from "@/lib/reactions"
import { useApiValidation } from "@/lib/use-endpoint-validation"
import { getPricingFromCache } from "@/lib/header-parsers"
import { REACTION_KIND, PROFILE_KIND } from "@/lib/nostr-constants"
import { ReactionDisplay } from "@/components/reaction-display"
import { deleteApi } from "@/lib/nostr"
import { useApiDataStore } from "@/lib/api-data-store"
import type { Api } from "@/lib/types"

interface ApiCardProps {
  api: Api
  navigate: (path: string) => void
  showActions?: boolean
}

export function ApiCard({ api, navigate, showActions = false }: ApiCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const setApis = useApiDataStore(state => state.setApis)
  const allApis = useApiDataStore(state => state.allApis)
  // Subscribe to reactions for this specific API event
  const { events: reactionEvents } = useSubscribe(
    api.eventId ? [{ kinds: [REACTION_KIND], "#e": [api.eventId] }] : false,
    { bufferMs: 100 }
  )

  // Subscribe to profile for this API's creator
  const { events: profileEvents } = useSubscribe(
    api.creatorPubkey ? [{ kinds: [PROFILE_KIND], authors: [api.creatorPubkey] }] : false,
    { bufferMs: 100 }
  )

  // Validate API endpoints
  const { isValidating: isApiValidating, validationResults } = useApiValidation(api)

  // Process reactions
  const reactions = useMemo(() => {
    if (reactionEvents.length === 0) return []
    const reactionsMap = processReactions(reactionEvents)
    return Array.from(reactionsMap.values())
  }, [reactionEvents])

  // Process profile
  const profile = useMemo(() => {
    if (profileEvents.length === 0) return null
    return parseProfileFromEvent(profileEvents[0])
  }, [profileEvents])

  // Calculate pricing from validation results
  const pricingInfo = useMemo(() => {
    const amounts: number[] = []
    const paymentMethods = new Set<string>()
    const mints = new Set<string>()

    for (const [, result] of validationResults) {
      if (result && typeof result === 'object' && 'isValid' in result && result.isValid) {
        // Add payment methods from stored data
        if ('supportedPaymentMethods' in result && Array.isArray(result.supportedPaymentMethods)) {
          result.supportedPaymentMethods.forEach((method: string) => paymentMethods.add(method))
        }
        
        // Use the helper function to get pricing info
        const pricing = getPricingFromCache(result)
        if (pricing.minPrice > 0) amounts.push(pricing.minPrice)
        if (pricing.maxPrice > 0) amounts.push(pricing.maxPrice)
        pricing.mints.forEach((mint: string) => mints.add(mint))
      }
    }

    // If no payment methods found, add Cashu as fallback
    if (paymentMethods.size === 0) {
      paymentMethods.add("Cashu")
    }

    return {
      amounts,
      paymentMethods: Array.from(paymentMethods),
      mints: Array.from(mints),
      hasValidEndpoints: amounts.length > 0
    }
  }, [validationResults])

  const handleClick = () => {
    if (api.dTag) {
      navigate(`/d/${api.dTag}`)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!api.dTag || !api.creatorPubkey) {
      alert("Cannot delete: missing event data")
      return
    }

    if (!confirm(`Are you sure you want to delete "${api.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteApi({ pubkey: api.creatorPubkey, dTag: api.dTag })
      // Remove the API from the local state
      const updatedApis = allApis.filter((a: Api) => a.id !== api.id)
      setApis(updatedApis)
      alert("API deleted successfully")
    } catch (error) {
      console.error("Failed to delete API:", error)
      alert(`Failed to delete API: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card 
      className="cursor-pointer hover:border-foreground/40 hover:shadow-sm transition-all"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-mono">{api.name}</h3>
            </div>
            <p className="font-mono text-xs mt-1 break-all text-muted-foreground">{api.domain}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isApiValidating ? (
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                <span>Validating...</span>
              </div>
            ) : pricingInfo.hasValidEndpoints ? (
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <Bitcoin className="h-3 w-3" />
                <span>{Math.min(...pricingInfo.amounts)}</span>
                {pricingInfo.amounts.length > 1 && (
                  <>
                    <span>-</span>
                    <span>{Math.max(...pricingInfo.amounts)}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <Bitcoin className="h-3 w-3" />
                <span>{api.minPrice}</span>
                {api.minPrice !== api.maxPrice && (
                  <>
                    <span>-</span>
                    <span>{api.maxPrice}</span>
                  </>
                )}
              </div>
            )}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete API
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {profile && (
          <Link 
            to={`/p/${api.creatorPubkey}`}
            className="flex items-center gap-2 mt-2 w-fit hover:opacity-70 transition-opacity"
          >
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={profile.picture || "/placeholder.svg"}
                alt={profile.name || "Creator"}
              />
              <AvatarFallback className="text-xs">
                {profile.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            {profile.name && (
              <span className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors">
                {profile.name}
              </span>
            )}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{api.description}</p>

        {pricingInfo.paymentMethods.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {pricingInfo.paymentMethods.includes("L402") && (
              <Badge variant="outline" className="text-xs font-mono px-2 py-0 gap-1">
                <Zap className="h-3 w-3" />
                L402
              </Badge>
            )}
            {pricingInfo.paymentMethods.includes("P2PK") && (
              <Badge variant="outline" className="text-xs font-mono px-2 py-0 gap-1">
                <Lock className="h-3 w-3" />
                P2PK
              </Badge>
            )}
            {pricingInfo.paymentMethods.includes("Cashu") && (
              <Badge variant="outline" className="text-xs font-mono px-2 py-0 gap-1">
                <Bitcoin className="h-3 w-3" />
                Cashu
              </Badge>
            )}
          </div>
        )}

        {pricingInfo.mints.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground font-mono mb-1.5">Supported Mints:</p>
            <div className="flex flex-wrap gap-1.5">
              {pricingInfo.mints.slice(0, 2).map((mint) => {
                const mintName = new URL(mint).hostname.replace("www.", "")
                return (
                  <Badge key={mint} variant="secondary" className="text-xs font-mono px-2 py-0">
                    {mintName}
                  </Badge>
                )
              })}
              {pricingInfo.mints.length > 2 && (
                <Badge variant="secondary" className="text-xs font-mono px-2 py-0">
                  +{pricingInfo.mints.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {api.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {api.tags.slice(0, 4).map((tag, index) => {
              const tagName = typeof tag === "string" ? tag : tag
              return (
                <Badge key={`${tagName}-${index}`} variant="secondary" className="text-xs font-mono px-2 py-0">
                  {tagName}
                </Badge>
              )
            })}
            {api.tags.length > 4 && (
              <Badge variant="secondary" className="text-xs font-mono px-2 py-0">
                +{api.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground font-mono">
          {api.endpoints.length} endpoint{api.endpoints.length !== 1 ? "s" : ""}
        </div>

        {reactions.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <ReactionDisplay reactions={reactions} compact />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
