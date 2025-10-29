import { useState, useEffect, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { LoginModal } from "@/components/login-modal"
import { AddApiCard } from "@/components/add-api-card"
import { AddApiModal } from "@/components/add-api-modal"
import { ApiCard } from "@/components/api-card"
import { AppHeader } from "@/components/app-header"
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import { parseApiFromEvent } from "@/lib/api-parser"
import { useAllApis, useApiDataStore } from "@/lib/api-data-store"
import { API_KIND, APP_TAG } from "@/lib/nostr-constants"
import type { Api, NostrUser } from "@/lib/types"

export default function Home() {
  const [user, setUser] = useState<NostrUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAddApiModal, setShowAddApiModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  // Get APIs from cache or subscribe to fetch them
  const { allApis, isLoading, isEose, isCacheValid } = useAllApis()
  const setApis = useApiDataStore(state => state.setApis)
  const setLoading = useApiDataStore(state => state.setLoading)
  const setEose = useApiDataStore(state => state.setEose)
  
  // Track if we're showing stale data while refetching
  const [isShowingStaleData, setIsShowingStaleData] = useState(false)

  // Subscribe to all API events
  const { events: apiEvents, eose: apiEose } = useSubscribe(
    [{ kinds: [API_KIND], "#t": [APP_TAG] }],
    { bufferMs: 100 }
  )

  // Process APIs and update cache
  const apis = useMemo(() => {
    // If we have cached data and it's still valid, use it
    if (allApis.length > 0 && isCacheValid) {
      console.log(`[Home] Using cached APIs: ${allApis.length} (cache valid)`)
      return allApis
    }

    // If we have cached data but it's expired, show it while refetching
    if (allApis.length > 0 && !isCacheValid) {
      console.log(`[Home] Cache expired, showing cached data while refetching: ${allApis.length} APIs`)
      setIsShowingStaleData(true)
      // Don't return here - continue to process new events in background
    } else {
      setIsShowingStaleData(false)
    }

    console.log(`[Home] Processing ${apiEvents.length} API events`)
    const parsedApis = apiEvents
      .map(parseApiFromEvent)
      .filter((api): api is Api => api !== null)
    console.log(`[Home] Successfully parsed ${parsedApis.length} APIs`)
    
    // Update cache with new APIs if we got any
    if (parsedApis.length > 0) {
      setApis(parsedApis)
      setIsShowingStaleData(false) // Fresh data received
      return parsedApis
    }
    
    // If no new data but we have expired cached data, show that
    if (allApis.length > 0 && !isCacheValid) {
      console.log(`[Home] No new events, showing expired cached data: ${allApis.length} APIs`)
      return allApis
    }
    
    // Only return empty array if we truly have no data
    console.log(`[Home] No cached or new data available`)
    return []
  }, [apiEvents, allApis, isCacheValid, setApis])

  // Update loading states
  useEffect(() => {
    setLoading(!apiEose)
    setEose(!!apiEose)
  }, [apiEose, setLoading, setEose])

  // Filter APIs based on search query
  const filteredApis = apis.filter(api => 
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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

  const handleApiAdded = async () => {
    window.location.reload()
  }

  const handleAddApiClick = () => {
    if (user) {
      setShowAddApiModal(true)
    } else {
      setShowLoginModal(true)
    }
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

      <AddApiModal
        open={showAddApiModal}
        onOpenChange={setShowAddApiModal}
        onSuccess={handleApiAdded}
      />

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 font-mono tracking-tight">
            402.markets
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-2">
            API marketplace powered by Lightning Network and Cashu tokens
          </p>
          <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/docs" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
              View Documentation
            </Link>
            <button 
              onClick={() => {
                const apiGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3')
                if (apiGrid) {
                  apiGrid.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              className="inline-flex items-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium border border-border"
            >
              Browse APIs
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-muted-foreground px-2">
            <span className="font-mono">Pay-per-request</span>
            <span className="text-border hidden sm:inline">•</span>
            <span className="font-mono">No subscriptions</span>
            <span className="text-border hidden sm:inline">•</span>
            <span className="font-mono">Instant payments</span>
            <span className="text-border hidden sm:inline">•</span>
            <span className="font-mono">Censorship-resistant</span>
          </div>
        </div>

        {/* Technical Features */}
        <div className="max-w-7xl mx-auto mb-12 sm:mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-4 sm:p-6 rounded-lg border border-border bg-card">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 font-mono">L402</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Lightning API keys combine Macaroons with Lightning Network payments, enabling secure 
                pay-per-request authentication. Macaroons provide bearer tokens that can be verified 
                cryptographically without server lookups.
              </p>
            </div>

            <div className="p-4 sm:p-6 rounded-lg border border-border bg-card">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 font-mono">X-Cashu</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                HTTP 402 Payment Required responses with X-Cashu headers enable Cashu token payments. 
                Servers respond with payment requests containing amount, unit, accepted mints, and 
                locking conditions.
              </p>
            </div>

            <div className="p-4 sm:p-6 rounded-lg border border-border bg-card">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 font-mono">OpenAPI 3.0 Standards</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                All APIs follow OpenAPI 3.0 specifications for consistent documentation, 
                validation, and integration. Standardized schemas ensure seamless developer 
                experience across different API providers.
              </p>
            </div>

            <div className="p-4 sm:p-6 rounded-lg border border-border bg-card">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 font-mono">Nostr Protocol Storage</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                API metadata and discovery information stored on Nostr protocol for 
                censorship-resistant, decentralized access. No central authority controls 
                API listings or availability.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search APIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-lg"
            />
          </div>
          {/* Stale data indicator */}
          {isShowingStaleData && (
            <div className="text-center mt-2">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                Refreshing data...
              </span>
            </div>
          )}
        </div>

        {/* API Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Add API Card */}
          <AddApiCard onClick={handleAddApiClick} />
          
          {/* Loading State */}
          {isLoading && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex gap-2 mb-4">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* API Cards */}
          {!isLoading && filteredApis.map((api, index) => (
            <ApiCard key={api.id || api.eventId || `api-${index}`} api={api} navigate={navigate} />
          ))}
          

          {/* No Results */}
          {!isLoading && isEose && filteredApis.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">
                {searchQuery ? 'No APIs found matching your search.' : 'No APIs available yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
