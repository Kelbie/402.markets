import { create } from 'zustand'
import { decodeInvoice, parseL402Header } from './invoice-utils'
import { decodePaymentRequest } from '@cashu/cashu-ts'

export interface CachedEndpointData {
  // Raw headers from the response
  xCashu?: string
  wwwAuthenticate?: string
  
  // Parsed data for easy access
  invoiceData?: {
    macaroon: string
    invoice: string
    decodedAmount?: number
    paymentHash?: string
  }
  
  cashuPaymentRequest?: {
    raw: string
    decoded?: {
      id?: string
      amount?: number
      unit?: string
      mints?: string[]
      description?: string
      singleUse?: boolean
      nut10?: {
        kind: string
        data: string
        tags?: string[][]
      }
    } | null
  }
  
  // Derived payment methods
  supportedPaymentMethods: ('L402' | 'P2PK' | 'Cashu')[]
  
  // Cache metadata
  timestamp: number
  isValid: boolean
  lastChecked: number
}

interface ApiCacheState {
  // Cache by domain + endpoint path + method (shared across APIs)
  cache: Map<string, CachedEndpointData>
  
  // Currently validating endpoints
  validating: Set<string>
  
  // Actions
  getCachedData: (domain: string, method: string, path: string) => CachedEndpointData | null
  isEndpointValidating: (domain: string, method: string, path: string) => boolean
  fetchEndpointData: (domain: string, method: string, path: string) => Promise<CachedEndpointData>
  clearCache: () => void
  clearEndpointCache: (domain: string, method: string, path: string) => void
}

const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

const getCacheKey = (domain: string, method: string, path: string): string => {
  return `${domain}:${method}:${path}`
}

const isCacheExpired = (timestamp: number): boolean => {
  return Date.now() - timestamp > CACHE_EXPIRY_MS
}

export const useApiCacheStore = create<ApiCacheState>((set, get) => ({
  cache: new Map(),
  validating: new Set(),
  
  getCachedData: (domain: string, method: string, path: string) => {
    const cacheKey = getCacheKey(domain, method, path)
    const cached = get().cache.get(cacheKey)
    
    if (!cached) return null
    
    // Check if cache is expired
    if (isCacheExpired(cached.timestamp)) {
      // Remove expired cache entry
      set(state => {
        const newCache = new Map(state.cache)
        newCache.delete(cacheKey)
        return { cache: newCache }
      })
      return null
    }
    
    return cached
  },
  
  isEndpointValidating: (domain: string, method: string, path: string) => {
    const cacheKey = getCacheKey(domain, method, path)
    return get().validating.has(cacheKey)
  },
  
  fetchEndpointData: async (domain: string, method: string, path: string) => {
    const cacheKey = getCacheKey(domain, method, path)
    const state = get()
    
    // Check if already validating
    if (state.validating.has(cacheKey)) {
      // Wait for existing validation to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const result = get().cache.get(cacheKey)
          if (result) {
            clearInterval(checkInterval)
            resolve(result)
          }
        }, 100)
      })
    }
    
    // Check cache first
    const cached = state.getCachedData(domain, method, path)
    if (cached) {
      return cached
    }
    
    // Mark as validating
    set(state => ({
      validating: new Set(state.validating).add(cacheKey)
    }))
    
    try {
      const fullUrl = `https://${domain}${path}`
      console.log(`[ApiCacheStore] Fetching ${method} ${fullUrl}`)
      
      const response = await fetch(fullUrl, { 
        method,
        signal: AbortSignal.timeout(10000)
      })
      
      console.log(`[ApiCacheStore] Response status: ${response.status}`)
      console.log(`[ApiCacheStore] Response headers:`, Object.fromEntries(response.headers.entries()))
      
      const supportedPaymentMethods: ('L402' | 'P2PK' | 'Cashu')[] = []
      
      const cachedData: CachedEndpointData = {
        supportedPaymentMethods,
        timestamp: Date.now(),
        isValid: response.ok || response.status === 402,
        lastChecked: Date.now()
      }
      
      // Extract headers
      const wwwAuth = response.headers.get("WWW-Authenticate")
      const xCashu = response.headers.get("X-Cashu")
      
      if (wwwAuth) {
        cachedData.wwwAuthenticate = wwwAuth
        const parsed = parseL402Header(wwwAuth)
        if (parsed) {
          const decoded = decodeInvoice(parsed.invoice)
          cachedData.invoiceData = {
            macaroon: parsed.macaroon,
            invoice: parsed.invoice,
            decodedAmount: decoded?.amount,
            paymentHash: decoded?.paymentHash,
          }
          supportedPaymentMethods.push('L402')
        }
      }
      
      if (xCashu) {
        cachedData.xCashu = xCashu
        try {
          const decoded = decodePaymentRequest(xCashu)
          cachedData.cashuPaymentRequest = {
            raw: xCashu,
            decoded: decoded
          }
          supportedPaymentMethods.push('P2PK')
        } catch (error) {
          console.error(`[ApiCacheStore] Failed to decode Cashu payment request:`, error)
          cachedData.cashuPaymentRequest = {
            raw: xCashu,
            decoded: null
          }
          // Still add P2PK support even if decoding failed
          supportedPaymentMethods.push('P2PK')
        }
      }
      
      // If no payment methods found, add Cashu as fallback
      if (supportedPaymentMethods.length === 0) {
        supportedPaymentMethods.push('Cashu')
      }
      
      // Update the cached data with the final payment methods
      cachedData.supportedPaymentMethods = supportedPaymentMethods
      
      console.log(`[ApiCacheStore] Cached data for ${cacheKey}:`, cachedData)
      
      // Store in cache
      set(state => ({
        cache: new Map(state.cache).set(cacheKey, cachedData)
      }))
      
      return cachedData
      
    } catch (error) {
      console.error(`[ApiCacheStore] Failed to fetch endpoint ${domain}${path}:`, error)
      
      const cachedData: CachedEndpointData = {
        supportedPaymentMethods: ['Cashu'], // Default fallback
        timestamp: Date.now(),
        isValid: false,
        lastChecked: Date.now()
      }
      
      // Store error result in cache
      set(state => ({
        cache: new Map(state.cache).set(cacheKey, cachedData)
      }))
      
      return cachedData
    } finally {
      // Remove from validating set
      set(state => {
        const newValidating = new Set(state.validating)
        newValidating.delete(cacheKey)
        return { validating: newValidating }
      })
    }
  },
  
  clearCache: () => {
    set({ cache: new Map(), validating: new Set() })
  },
  
  clearEndpointCache: (domain: string, method: string, path: string) => {
    const cacheKey = getCacheKey(domain, method, path)
    set(state => {
      const newCache = new Map(state.cache)
      newCache.delete(cacheKey)
      return { cache: newCache }
    })
  }
}))

// Helper hook for easy access to cached data
export const useEndpointCache = (domain: string, method: string, path: string) => {
  const getCachedData = useApiCacheStore(state => state.getCachedData)
  const isEndpointValidating = useApiCacheStore(state => state.isEndpointValidating)
  const fetchEndpointData = useApiCacheStore(state => state.fetchEndpointData)
  
  const cachedData = getCachedData(domain, method, path)
  const isValidating = isEndpointValidating(domain, method, path)
  
  const fetchData = () => fetchEndpointData(domain, method, path)
  
  return {
    data: cachedData,
    isValidating,
    fetchData,
    hasData: !!cachedData,
    isExpired: cachedData ? isCacheExpired(cachedData.timestamp) : false
  }
}
