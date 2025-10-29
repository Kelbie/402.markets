import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Api } from './types'

interface ApiDataStore {
  // All APIs list for home page
  allApis: Api[]
  
  // Cache by d-tag for quick lookup
  apisByDtag: Record<string, Api>
  
  // Cache timestamp for expiration
  lastUpdated: number
  
  // Loading states (not persisted)
  isLoading: boolean
  isEose: boolean
  
  // Actions
  setApi: (api: Api) => void
  setApis: (apis: Api[]) => void
  getApiByDtag: (dTag: string) => Api | null
  getApiById: (id: string) => Api | null
  getAllApis: () => Api[]
  setLoading: (isLoading: boolean) => void
  setEose: (isEose: boolean) => void
  clearCache: () => void
  isCacheValid: () => boolean
}

const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

export const useApiDataStore = create<ApiDataStore>()(
  persist(
    (set, get) => ({
      allApis: [],
      apisByDtag: {},
      lastUpdated: 0,
      isLoading: false,
      isEose: false,
      
      setApi: (api: Api) => {
        set(state => {
          const newApisByDtag = { ...state.apisByDtag }
          
          if (api.dTag) {
            newApisByDtag[api.dTag] = api
          }
          
          // Update allApis if this API is not already in the list
          const existingIndex = state.allApis.findIndex(existingApi => 
            existingApi.eventId === api.eventId || existingApi.id === api.id
          )
          
          const newAllApis = [...state.allApis]
          if (existingIndex >= 0) {
            newAllApis[existingIndex] = api
          } else {
            newAllApis.push(api)
          }
          
          return {
            allApis: newAllApis,
            apisByDtag: newApisByDtag,
            lastUpdated: Date.now()
          }
        })
      },
      
      setApis: (apis: Api[]) => {
        set(() => {
          const apisByDtag: Record<string, Api> = {}
          
          // Build d-tag lookup
          apis.forEach(api => {
            if (api.dTag) {
              apisByDtag[api.dTag] = api
            }
          })
          
          return {
            allApis: apis,
            apisByDtag,
            lastUpdated: Date.now()
          }
        })
      },
      
      getApiByDtag: (dTag: string) => {
        return get().apisByDtag[dTag] || null
      },
      
      getApiById: (id: string) => {
        return get().allApis.find(api => api.eventId === id || api.id === id) || null
      },
      
      getAllApis: () => {
        return get().allApis
      },
      
      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },
      
      setEose: (isEose: boolean) => {
        set({ isEose })
      },
      
      clearCache: () => {
        set({
          allApis: [],
          apisByDtag: {},
          lastUpdated: 0
        })
      },
      
      isCacheValid: () => {
        const { lastUpdated } = get()
        return Date.now() - lastUpdated < CACHE_DURATION
      }
    }),
    {
      name: 'api-marketplace-cache',
      // Only persist the data, not loading states
      partialize: (state) => ({
        allApis: state.allApis,
        apisByDtag: state.apisByDtag,
        lastUpdated: state.lastUpdated
      })
    }
  )
)

// Helper hook for getting all APIs
export const useAllApis = () => {
  const allApis = useApiDataStore(state => state.allApis)
  const isLoading = useApiDataStore(state => state.isLoading)
  const isEose = useApiDataStore(state => state.isEose)
  const isCacheValid = useApiDataStore(state => state.isCacheValid)
  
  return { allApis, isLoading, isEose, isCacheValid: isCacheValid() }
}

// Helper hook for getting a specific API by d-tag
export const useApiByDtag = (dTag: string | undefined) => {
  const getApiByDtag = useApiDataStore(state => state.getApiByDtag)
  const isCacheValid = useApiDataStore(state => state.isCacheValid)
  const api = dTag ? getApiByDtag(dTag) : null
  
  return { api, isCacheValid: isCacheValid() }
}
