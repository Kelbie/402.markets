import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useApiCacheStore, type CachedEndpointData } from './api-cache-store'
import type { Api, ApiEndpoint } from './types'

// Use the same interface as the cache store
type EndpointValidationData = CachedEndpointData

interface EndpointValidationContextType {
  getEndpointValidation: (api: Api, endpoint: ApiEndpoint) => EndpointValidationData | null
  validateEndpoint: (api: Api, endpoint: ApiEndpoint) => Promise<EndpointValidationData>
  isEndpointValidating: (api: Api, endpoint: ApiEndpoint) => boolean
}

const EndpointValidationContext = createContext<EndpointValidationContextType | undefined>(undefined)

interface EndpointValidationProviderProps {
  children: ReactNode
}

export function EndpointValidationProvider({ children }: EndpointValidationProviderProps) {
  // Use the Zustand store for caching
  const getCachedData = useApiCacheStore(state => state.getCachedData)
  const isEndpointValidating = useApiCacheStore(state => state.isEndpointValidating)
  const fetchEndpointData = useApiCacheStore(state => state.fetchEndpointData)

  const getEndpointValidation = useCallback((api: Api, endpoint: ApiEndpoint): EndpointValidationData | null => {
    return getCachedData(api.domain, endpoint.method, endpoint.path)
  }, [getCachedData])

  const validateEndpoint = useCallback(async (api: Api, endpoint: ApiEndpoint): Promise<EndpointValidationData> => {
    return fetchEndpointData(api.domain, endpoint.method, endpoint.path)
  }, [fetchEndpointData])

  const isEndpointValidatingCallback = useCallback((api: Api, endpoint: ApiEndpoint): boolean => {
    return isEndpointValidating(api.domain, endpoint.method, endpoint.path)
  }, [isEndpointValidating])

  const value: EndpointValidationContextType = {
    getEndpointValidation,
    validateEndpoint,
    isEndpointValidating: isEndpointValidatingCallback
  }

  return (
    <EndpointValidationContext.Provider value={value}>
      {children}
    </EndpointValidationContext.Provider>
  )
}

export function useEndpointValidation() {
  const context = useContext(EndpointValidationContext)
  if (context === undefined) {
    throw new Error('useEndpointValidation must be used within an EndpointValidationProvider')
  }
  return context
}
