import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import { parseApiFromEvent } from "@/lib/api-parser"
import { parseProfileFromEvent } from "@/lib/profiles"
import { useApiValidation } from "@/lib/use-endpoint-validation"
import { getPricingFromCache } from "@/lib/header-parsers"
import { useReactions } from "@/lib/use-reactions"
import { PROFILE_KIND, API_KIND, APP_TAG } from "@/lib/nostr-constants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Bitcoin, ExternalLink, Edit, Loader2, AlertCircle } from "lucide-react"
import { EndpointCard } from "@/components/endpoint-card"
import { ApiTestSection } from "@/components/api-test-section"
import { ReactionPicker } from "@/components/reaction-picker"
import { CopyButton } from "@/components/copy-button"
import { LoginModal } from "@/components/login-modal"
import { EditApiModal } from "@/components/edit-api-modal"
import { AppHeader } from "@/components/app-header"
import type { NostrUser } from "@/lib/types"

export default function ApiDetail() {
  const { d } = useParams<{ d: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<NostrUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [viewMode, setViewMode] = useState<"rich" | "json" | "yaml">("rich")

  // Subscribe to API events for the d tag
  const { events: apiEvents, eose: apiEose } = useSubscribe(
    d ? [{ kinds: [API_KIND], "#t": [APP_TAG], "#d": [d] }] : false,
    { bufferMs: 100 }
  )

  // Process API data directly from subscription events
  const { api, validationFailed } = useMemo(() => {
    if (apiEvents.length === 0) {
      return { api: null, validationFailed: false }
    }

    const event = apiEvents[0]
    
    try {
      const apiData = parseApiFromEvent(event)
      if (apiData) {
        const processedApi = {
          ...apiData,
          id: apiData.id || event.id,
          creatorPubkey: event.pubkey,
          dTag: d,
          eventId: event.id,
          minPrice: apiData.minPrice || 0,
          maxPrice: apiData.maxPrice || 0,
          supportedMints: apiData.supportedMints || [],
          supportedPaymentMethods: apiData.supportedPaymentMethods || []
        }
        
        return {
          api: processedApi,
          validationFailed: false
        }
      }
    } catch {
      console.error("Failed to parse API")
    }

    return { api: null, validationFailed: true }
  }, [apiEvents, d])

  // Get raw content directly from the event
  const rawContent = apiEvents.length > 0 ? apiEvents[0].content : ""

  // Subscribe to creator profile
  const { events: profileEvents } = useSubscribe(
    api?.creatorPubkey ? [{ kinds: [PROFILE_KIND], authors: [api.creatorPubkey] }] : false,
    { bufferMs: 100 }
  )

  // Process profile
  const creatorProfile = useMemo(() => {
    if (profileEvents.length === 0) return null
    return parseProfileFromEvent(profileEvents[0])
  }, [profileEvents])

  // Use reactions hook
  const {
    reactions,
    isLoading: reactionsLoading,
    addReaction,
  } = useReactions({
    eventId: api?.eventId || null,
    authorPubkey: api?.creatorPubkey || null,
    userPubkey: user?.pubkey,
  })

  // Validate API endpoints
  const { isValidating, validationResults } = useApiValidation(api)
  
  // Debug API object
  console.log('[ApiDetail] API object:', api)
  console.log('[ApiDetail] API ID:', api?.id)
  console.log('[ApiDetail] API eventId:', api?.eventId)

  // Calculate pricing from validation results
  const pricingInfo = useMemo(() => {
    if (!api) return { minPrice: 0, maxPrice: 0, paymentMethods: [], mints: [] }

    console.log('[ApiDetail] Validation results:', validationResults)
    console.log('[ApiDetail] Is validating:', isValidating)

    const amounts: number[] = []
    const paymentMethods = new Set<string>()
    const mints = new Set<string>()

    for (const [key, result] of validationResults) {
      console.log('[ApiDetail] Processing validation result:', key, result)
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

    const result = {
      minPrice: amounts.length > 0 ? Math.min(...amounts) : api.minPrice,
      maxPrice: amounts.length > 0 ? Math.max(...amounts) : api.maxPrice,
      paymentMethods: Array.from(paymentMethods),
      mints: Array.from(mints),
    }

    console.log('[ApiDetail] Pricing info result:', result)
    return result
  }, [api, validationResults, isValidating])


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

  useEffect(() => {
    if (api) {
      document.title = `402.markets - ${api.name}`
    }
  }, [api])

  const isCreator = user && api?.creatorPubkey && user.pubkey === api.creatorPubkey

  const handleLoginSuccess = (loggedInUser: NostrUser) => {
    setUser(loggedInUser)
    localStorage.setItem("nostr_user", JSON.stringify(loggedInUser))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("nostr_user")
  }

  const handleEditSuccess = () => {
    window.location.reload()
  }

  const handleReact = async (emoji: string) => {
    console.log("[v0] handleReact called with emoji:", emoji)

    if (!user) {
      console.log("[v0] User not logged in")
      setShowLoginModal(true)
      return
    }

    if (!api?.eventId || !api?.creatorPubkey) {
      console.log("[v0] No API event ID or creator pubkey")
      return
    }

    try {
      await addReaction(emoji)
      console.log("[v0] Reaction added successfully")
    } catch (error) {
      console.error("[v0] Error handling reaction:", error)
    }
  }

  const jsonToYaml = (jsonString: string): string => {
    try {
      const obj = JSON.parse(jsonString)
      return convertToYaml(obj, 0)
    } catch {
      return "Error converting to YAML"
    }
  }

  const convertToYaml = (obj: unknown, indent: number): string => {
    const spaces = "  ".repeat(indent)
    let yaml = ""

    if (Array.isArray(obj)) {
      obj.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          yaml += `${spaces}-\n${convertToYaml(item, indent + 1)}`
        } else {
          yaml += `${spaces}- ${item}\n`
        }
      })
    } else if (typeof obj === "object" && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          yaml += `${spaces}${key}:\n${convertToYaml(value, indent + 1)}`
        } else if (typeof value === "object" && value !== null) {
          yaml += `${spaces}${key}:\n${convertToYaml(value, indent + 1)}`
        } else {
          const stringValue = typeof value === "string" ? `"${value}"` : value
          yaml += `${spaces}${key}: ${stringValue}\n`
        }
      })
    }

    return yaml
  }


  if (!apiEose && !api) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          user={user}
          currentPage="home"
          onLoginClick={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-mono">Loading API...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (apiEose && !api) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          user={user}
          currentPage="home"
          onLoginClick={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className="text-lg text-muted-foreground font-mono">API not found</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!api) return null

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        user={user}
        currentPage="home"
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onLoginSuccess={handleLoginSuccess} />

      {isCreator && (
        <EditApiModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSuccess={handleEditSuccess}
          api={api}
          rawContent={rawContent}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to APIs
            </Button>
            <div className="flex items-center gap-2">
              {isCreator && (
                <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit API
                </Button>
              )}
            </div>
          </div>

          {validationFailed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This API failed validation and may not display correctly. It might be using an old format.
                {isCreator && " Click Edit to update it to the OpenAPI 3.0 specification."}
              </AlertDescription>
            </Alert>
          )}

            <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as "rich" | "json" | "yaml")}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="rich">Rich View</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="yaml">YAML</TabsTrigger>
            </TabsList>

            <TabsContent value="rich" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-mono font-bold">{api.name}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-sm font-mono text-muted-foreground">{api.domain}</code>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  {creatorProfile && api.creatorPubkey && (
                    <Link 
                      to={`/p/${api.creatorPubkey}`}
                      className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={creatorProfile.picture || "/placeholder.svg"}
                          alt={creatorProfile.name || "Creator"}
                        />
                        <AvatarFallback>{creatorProfile.name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <div className="font-medium hover:text-foreground/70 transition-colors">
                          {creatorProfile.name || "Anonymous"}
                        </div>
                        {creatorProfile.nip05 && (
                          <div className="text-xs text-muted-foreground">{creatorProfile.nip05}</div>
                        )}
                      </div>
                    </Link>
                  )}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{api.description}</p>

                <div className="pt-2">
                  {reactionsLoading ? (
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  ) : (
                    <ReactionPicker reactions={reactions} onReact={handleReact} disabled={!user} />
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {api.tags.map((tag, index) => {
                    const tagName = typeof tag === "string" ? tag : String(tag)
                    return (
                      <Badge key={`${tagName}-${index}`} variant="secondary" className="text-xs font-mono">
                        {tagName}
                      </Badge>
                    )
                  })}
                </div>

                <div className="flex items-center gap-4 text-sm font-mono">
                  <div className="flex items-center gap-1.5">
                    <Bitcoin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Price range:</span>
                    {isValidating ? (
                      <Skeleton className="h-5 w-24" />
                    ) : (
                      <span className="font-semibold">
                        {pricingInfo.minPrice} - {pricingInfo.maxPrice} sats
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {api.endpoints.length} endpoint{api.endpoints.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-mono font-semibold">Endpoints</h2>
                <div className="space-y-4">
                  {api.endpoints.map((endpoint, index) => {
                    const cacheKey = `${api.id}-${endpoint.method}-${endpoint.path}`
                    const validationResult = validationResults.get(cacheKey)
                    console.log(`[ApiDetail] Cache key: ${cacheKey}`)
                    console.log(`[ApiDetail] API ID: ${api.id}`)
                    console.log(`[ApiDetail] Endpoint ${endpoint.method} ${endpoint.path}:`, validationResult)
                    console.log(`[ApiDetail] All validation results keys:`, Array.from(validationResults.keys()))
                    return (
                      <div key={index} className="space-y-4">
                        <EndpointCard 
                          endpoint={endpoint} 
                          domain={api.domain} 
                          validationResult={validationResult}
                        />
                        <ApiTestSection endpoint={endpoint} domain={api.domain} api={api} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="json" className="mt-6">
              <div className="relative rounded-lg border bg-muted/50 p-4 overflow-auto max-h-[600px]">
                <div className="absolute top-2 right-2">
                  <CopyButton text={rawContent ? JSON.stringify(JSON.parse(rawContent), null, 2) : ""} />
                </div>
                <pre className="text-xs font-mono">
                  <code>{rawContent ? JSON.stringify(JSON.parse(rawContent), null, 2) : "No content available"}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="yaml" className="mt-6">
              <div className="relative rounded-lg border bg-muted/50 p-4 overflow-auto max-h-[600px]">
                <div className="absolute top-2 right-2">
                  <CopyButton text={rawContent ? jsonToYaml(rawContent) : ""} />
                </div>
                <pre className="text-xs font-mono">
                  <code>{rawContent ? jsonToYaml(rawContent) : "No content available"}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
