import { decode } from "light-bolt11-decoder"

export interface DecodedInvoice {
  amount?: number // in satoshis
  paymentHash?: string
  description?: string
  timestamp?: number
  expiry?: number
}

export function decodeInvoice(invoice: string): DecodedInvoice | null {
  try {
    const decoded = decode(invoice)

    const result: DecodedInvoice = {}

    // Extract sections from decoded invoice
    for (const section of decoded.sections) {
      switch (section.name) {
        case "amount":
          // Amount is in millisatoshis, convert to satoshis
          result.amount = section.value ? Math.floor(Number(section.value) / 1000) : undefined
          break
        case "payment_hash":
          result.paymentHash = section.value as string
          break
        case "description":
          result.description = section.value as string
          break
        case "timestamp":
          result.timestamp = section.value as number
          break
        case "expiry":
          result.expiry = section.value as number
          break
      }
    }

    return result
  } catch (error) {
    console.error("Failed to decode invoice:", error)
    return null
  }
}

export function parseL402Header(wwwAuthHeader: string): { macaroon: string; invoice: string } | null {
  try {
    // Parse: L402 macaroon="...", invoice="..."
    const macaroonMatch = wwwAuthHeader.match(/macaroon="([^"]+)"/)
    const invoiceMatch = wwwAuthHeader.match(/invoice="([^"]+)"/)

    if (!macaroonMatch || !invoiceMatch) {
      return null
    }

    return {
      macaroon: macaroonMatch[1],
      invoice: invoiceMatch[1],
    }
  } catch (error) {
    console.error("Failed to parse L402 header:", error)
    return null
  }
}
