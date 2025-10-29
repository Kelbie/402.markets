import { useState, useEffect, useMemo } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import { parseApiFromEvent } from "@/lib/api-parser"
import { parseProfileFromEvent } from "@/lib/profiles"
import { processReactions } from "@/lib/reactions"
import { REACTION_KIND, PROFILE_KIND, API_KIND, APP_TAG } from "@/lib/nostr-constants"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Zap, Lock, Bitcoin } from "lucide-react"
import { LoginModal } from "@/components/login-modal"
import { ReactionDisplay } from "@/components/reaction-display"
import { AppHeader } from "@/components/app-header"
import { ProfileBanner } from "@/components/profile-banner"
import { useApiValidation } from "@/lib/use-endpoint-validation"
import type { Api, NostrUser } from "@/lib/types"

export default function Profile() {
  const { pubkey } = useParams()
  const [user, setUser] = useState<NostrUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const navigate = useNavigate()

  // Subscribe to API events for this user
  const { events: apiEvents, eose: apiEose } = useSubscribe(
    pubkey ? [{ kinds: [API_KIND], "#t": [APP_TAG], authors: [pubkey] }] : false,
    { bufferMs: 100 }
  )

  // Subscribe to profile for this user
  const { events: profileEvents } = useSubscribe(
    pubkey ? [{ kinds: [PROFILE_KIND], authors: [pubkey] }] : false,
    { bufferMs: 100 }
  )

  // Process APIs
  const apis = useMemo(() => {
    if (apiEvents.length === 0) return []
    
    const parsedApis: Api[] = []
    for (const event of apiEvents) {
      try {
        const apiData = parseApiFromEvent(event)
        if (apiData) {
          parsedApis.push({
            ...apiData,
            id: apiData.id || event.id,
            creatorPubkey: event.pubkey,
            dTag: event.tags.find(tag => tag[0] === 'd')?.[1] || '',
            eventId: event.id,
            minPrice: apiData.minPrice || 0,
            maxPrice: apiData.maxPrice || 0,
            supportedMints: apiData.supportedMints || [],
            supportedPaymentMethods: apiData.supportedPaymentMethods || []
          })
        }
      } catch (error) {
        console.error('Failed to parse API event:', error)
      }
    }
    
    return parsedApis.filter(api => {
      const isDeprecated = api.validationError?.toLowerCase().includes("deprecated")
      return !isDeprecated
    })
  }, [apiEvents])

  // Process profile
  const profile = useMemo(() => {
    if (profileEvents.length === 0) return null
    return parseProfileFromEvent(profileEvents[0])
  }, [profileEvents])

  useEffect(() => {
    const storedUser = localStorage.getItem("nostr_user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("Failed to parse stored user:", error)
      }
    }
  }, [])

  const handleLoginSuccess = (loggedInUser: NostrUser) => {
    setUser(loggedInUser)
    localStorage.setItem("nostr_user", JSON.stringify(loggedInUser))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("nostr_user")
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        user={user}
        currentPage="home"
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onLoginSuccess={handleLoginSuccess} />

      {pubkey && (
        <ProfileBanner 
          pubkey={pubkey} 
          profile={profile} 
          apiCount={apis.length} 
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <main>
          <div className="mb-6">
            <p className="text-sm text-muted-foreground font-mono">
              {apis.length} API{apis.length !== 1 ? "s" : ""}
              {!apiEose && " (loading...)"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apis.map((api) => (
              <ApiCard key={api.id} api={api} navigate={navigate} />
            ))}
          </div>

          {apis.length === 0 && apiEose && (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-mono">This user hasn't published any APIs yet.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// API Card Component (reused from Home page)
function ApiCard({ api, navigate }: { api: Api; navigate: (path: string) => void }) {
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
        
        // Extract pricing from L402 data
        if ('invoiceData' in result && result.invoiceData && typeof result.invoiceData === 'object' && 'decodedAmount' in result.invoiceData) {
          amounts.push((result.invoiceData as any).decodedAmount)
        }
        
        // Extract mints from P2PK data
        if ('cashuPaymentRequest' in result && result.cashuPaymentRequest && typeof result.cashuPaymentRequest === 'object' && 'decoded' in result.cashuPaymentRequest) {
          const decoded = (result.cashuPaymentRequest as any).decoded
          if (decoded && typeof decoded === 'object' && 'mints' in decoded && Array.isArray(decoded.mints)) {
            decoded.mints.forEach((mint: string) => mints.add(mint))
          }
        }
      }
    }

    return {
      minPrice: amounts.length > 0 ? Math.min(...amounts) : api.minPrice,
      maxPrice: amounts.length > 0 ? Math.max(...amounts) : api.maxPrice,
      paymentMethods: Array.from(paymentMethods),
      mints: Array.from(mints),
      amounts,
      hasValidEndpoints: amounts.length > 0
    }
  }, [api, validationResults])

  const handleClick = () => {
    if (api.dTag) {
      navigate(`/d/${api.dTag}`)
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
          </div>
        </div>
        {profile && (
          <Link 
            to={`/p/${api.creatorPubkey}`}
            className="flex items-center gap-2 mt-2 w-fit hover:opacity-70 transition-opacity"
            onClick={(e) => e.stopPropagation()}
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

        <div className="flex justify-between items-center">
          <ReactionDisplay reactions={reactions} compact />
          <div className="text-xs text-muted-foreground font-mono">
            {api.endpoints.length} endpoint{api.endpoints.length !== 1 ? "s" : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
