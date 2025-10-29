import { useEffect, useState, useCallback } from 'react'
import { useEndpointCache, useApiCacheStore } from './api-cache-store'
import type { Api, ApiEndpoint } from './types'

export function useEndpointValidation(api: Api, endpoint: ApiEndpoint) {
  const { data: validationData, isValidating, fetchData } = useEndpointCache(api.domain, endpoint.method, endpoint.path)

  useEffect(() => {
    // Auto-fetch if no data available
    if (!validationData) {
      fetchData()
    }
  }, [api.domain, endpoint.method, endpoint.path, validationData, fetchData])

  return {
    validationData,
    isValidating,
    refetch: fetchData
  }
}

export function useApiValidation(api: Api | null) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<Map<string, unknown>>(new Map())

  const validateAllEndpoints = useCallback(async () => {
    if (!api) {
      console.log('[useApiValidation] No API provided, skipping validation')
      return
    }
    
    console.log('[useApiValidation] Starting validation for API:', api.name, 'with', api.endpoints.length, 'endpoints')
    setIsValidating(true)
    const results = new Map()

    try {
      // Use the cache store to fetch all endpoints
      const fetchEndpointData = useApiCacheStore.getState().fetchEndpointData
      
      // Validate all endpoints in parallel
      const validationPromises = api.endpoints.map(async (endpoint) => {
        const key = `${api.id}-${endpoint.method}-${endpoint.path}`
        console.log('[useApiValidation] Validating endpoint:', key)
        const result = await fetchEndpointData(api.domain, endpoint.method, endpoint.path)
        console.log('[useApiValidation] Validation result for', key, ':', result)
        results.set(key, result)
        return { endpoint, result }
      })

      await Promise.all(validationPromises)
      console.log('[useApiValidation] All validations complete, results:', results)
      setValidationResults(results)
    } catch (error) {
      console.error('Failed to validate API endpoints:', error)
    } finally {
      setIsValidating(false)
    }
  }, [api])

  // Auto-validate when API changes
  useEffect(() => {
    if (api && api.endpoints.length > 0) {
      validateAllEndpoints()
    }
  }, [api, validateAllEndpoints])

  return {
    isValidating,
    validationResults,
    validateAllEndpoints
  }
}
