import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LogIn, Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { LoginModal } from "@/components/login-modal"
import { AddApiCard } from "@/components/add-api-card"
import { AddApiModal } from "@/components/add-api-modal"
import { ApiCard } from "@/components/api-card"
import { EnhancedEndpointCard } from "@/components/enhanced-endpoint-card"
import { EndpointWizardModal } from "@/components/endpoint-wizard-modal"
import { AppHeader } from "@/components/app-header"
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import { parseApiFromEvent } from "@/lib/api-parser"
import { useAllApis, useApiDataStore } from "@/lib/api-data-store"
import { API_KIND, APP_TAG } from "@/lib/nostr-constants"
import type { NostrUser, Api } from "@/lib/types"

export default function Dashboard() {
  const [user, setUser] = useState<NostrUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAddApiModal, setShowAddApiModal] = useState(false)
  const [showWizardModal, setShowWizardModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const navigate = useNavigate()

  // Get APIs from cache or subscribe to fetch them
  const { allApis, isLoading: cacheLoading, isEose: cacheEose, isCacheValid } = useAllApis()
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
      console.log(`[Dashboard] Using cached APIs: ${allApis.length} (cache valid)`)
      return allApis
    }

    // If we have cached data but it's expired, show it while refetching
    if (allApis.length > 0 && !isCacheValid) {
      console.log(`[Dashboard] Cache expired, showing cached data while refetching: ${allApis.length} APIs`)
      setIsShowingStaleData(true)
      // Don't return here - continue to process new events in background
    } else {
      setIsShowingStaleData(false)
    }

    console.log(`[Dashboard] Processing ${apiEvents.length} API events`)
    const parsedApis = apiEvents
      .map(parseApiFromEvent)
      .filter((api): api is Api => api !== null)
    console.log(`[Dashboard] Successfully parsed ${parsedApis.length} APIs`)
    
    // Update cache with new APIs if we got any
    if (parsedApis.length > 0) {
      setApis(parsedApis)
      setIsShowingStaleData(false) // Fresh data received
      return parsedApis
    }
    
    // If no new data but we have expired cached data, show that
    if (allApis.length > 0 && !isCacheValid) {
      console.log(`[Dashboard] No new events, showing expired cached data: ${allApis.length} APIs`)
      return allApis
    }
    
    // Only return empty array if we truly have no data
    console.log(`[Dashboard] No cached or new data available`)
    return []
  }, [apiEvents, allApis, isCacheValid, setApis])

  // Update loading states
  useEffect(() => {
    setLoading(!apiEose)
    setEose(!!apiEose)
  }, [apiEose, setLoading, setEose])

  // Filter APIs by user
  const userApis = useMemo(() => {
    if (!user?.pubkey) return []
    return apis.filter(api => api.creatorPubkey === user.pubkey)
  }, [apis, user?.pubkey])

  const isLoading = cacheLoading || !apiEose
  const isEose = cacheEose || apiEose

  // Filter APIs based on search query
  const filteredApis = userApis.filter(api => 
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

  const handleEdit = (api: Api) => {
    // TODO: Open edit modal with pre-filled data
    alert(`Edit functionality coming soon for: ${api.name}`)
  }

  const handleDelete = (api: Api) => {
    // TODO: Implement delete with confirmation
    if (confirm(`Are you sure you want to delete "${api.name}"?`)) {
      alert(`Delete functionality coming soon for: ${api.name}`)
    }
  }

  const handleAnalytics = (api: Api) => {
    // TODO: Navigate to analytics page with filtered view
    navigate(`/analytics?endpoint=${api.id}`)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          user={null}
          currentPage="dashboard"
          onLoginClick={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />

        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-mono font-bold mb-4">Dashboard</h2>
            <p className="text-muted-foreground font-mono mb-6">Please log in to view your APIs</p>
            <Button onClick={() => setShowLoginModal(true)}>
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
          </div>
        </div>

        <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        user={user}
        currentPage="dashboard"
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onLoginSuccess={handleLoginSuccess} />

      <AddApiModal
        open={showAddApiModal}
        onOpenChange={setShowAddApiModal}
        onSuccess={handleApiAdded}
      />

      <EndpointWizardModal
        open={showWizardModal}
        onOpenChange={setShowWizardModal}
        onSuccess={handleApiAdded}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-mono font-bold">My Endpoints</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your L402-protected API endpoints
            </p>
          </div>
          <Button onClick={() => setShowWizardModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Endpoint
          </Button>
        </div>
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search your APIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
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

        {/* API Grid/List */}
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
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

          {/* Enhanced Endpoint Cards */}
          {!isLoading && filteredApis.map((api, index) => (
            <EnhancedEndpointCard
              key={api.id || api.eventId || `api-${index}`}
              api={api}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAnalytics={handleAnalytics}
            />
          ))}

          {/* No Results */}
          {!isLoading && isEose && filteredApis.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                {searchQuery ? 'No endpoints found matching your search.' : 'You haven\'t created any endpoints yet.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowWizardModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Endpoint
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
