import { decodeInvoice, parseL402Header } from './invoice-utils'
import { decodePaymentRequest } from '@cashu/cashu-ts'

export interface ParsedHeaders {
  // Raw headers
  xCashu?: string
  wwwAuthenticate?: string
  
  // Parsed data
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
}

/**
 * Parse response headers to extract payment information
 * @param response - The fetch response object
 * @returns Parsed headers with payment data
 */
export function parsePaymentHeaders(response: Response): ParsedHeaders {
  const supportedPaymentMethods: ('L402' | 'P2PK' | 'Cashu')[] = []
  const result: ParsedHeaders = {
    supportedPaymentMethods
  }
  
  // Parse WWW-Authenticate header for L402 Lightning payments
  const wwwAuth = response.headers.get("WWW-Authenticate")
  if (wwwAuth) {
    result.wwwAuthenticate = wwwAuth
    const parsed = parseL402Header(wwwAuth)
    if (parsed) {
      const decoded = decodeInvoice(parsed.invoice)
      result.invoiceData = {
        macaroon: parsed.macaroon,
        invoice: parsed.invoice,
        decodedAmount: decoded?.amount,
        paymentHash: decoded?.paymentHash,
      }
      supportedPaymentMethods.push('L402')
    }
  }
  
  // Parse X-Cashu header for P2PK Cashu payments
  const xCashu = response.headers.get("X-Cashu")
  if (xCashu) {
    result.xCashu = xCashu
    try {
      const decoded = decodePaymentRequest(xCashu)
      result.cashuPaymentRequest = {
        raw: xCashu,
        decoded: decoded
      }
      supportedPaymentMethods.push('P2PK')
    } catch (error) {
      console.error(`[HeaderParsers] Failed to decode Cashu payment request:`, error)
      result.cashuPaymentRequest = {
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
  
  result.supportedPaymentMethods = supportedPaymentMethods
  return result
}

/**
 * Extract payment methods from cached data
 * @param cachedData - Cached endpoint data
 * @returns Array of supported payment methods
 */
export function getPaymentMethodsFromCache(cachedData: any): ('L402' | 'P2PK' | 'Cashu')[] {
  if (!cachedData) return ['Cashu']
  
  const methods: ('L402' | 'P2PK' | 'Cashu')[] = []
  
  if (cachedData.wwwAuthenticate || cachedData.invoiceData) {
    methods.push('L402')
  }
  
  if (cachedData.xCashu || cachedData.cashuPaymentRequest) {
    methods.push('P2PK')
  }
  
  // If no specific payment methods found, default to Cashu
  if (methods.length === 0) {
    methods.push('Cashu')
  }
  
  return methods
}

/**
 * Get pricing information from cached data
 * @param cachedData - Cached endpoint data
 * @returns Pricing information
 */
export function getPricingFromCache(cachedData: any): {
  minPrice: number
  maxPrice: number
  mints: string[]
} {
  if (!cachedData) {
    return { minPrice: 0, maxPrice: 0, mints: [] }
  }
  
  const amounts: number[] = []
  const mints = new Set<string>()
  
  // Extract amount from L402 invoice
  if (cachedData.invoiceData?.decodedAmount) {
    amounts.push(cachedData.invoiceData.decodedAmount)
  }
  
  // Extract mints from P2PK data
  if (cachedData.cashuPaymentRequest?.decoded?.mints) {
    cachedData.cashuPaymentRequest.decoded.mints.forEach((mint: string) => mints.add(mint))
  }
  
  return {
    minPrice: amounts.length > 0 ? Math.min(...amounts) : 0,
    maxPrice: amounts.length > 0 ? Math.max(...amounts) : 0,
    mints: Array.from(mints)
  }
}
