"use client"

import { useState, useEffect } from "react"
import type { ApiEndpoint } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Loader2, Zap, Clock, AlertCircle, Coins, CheckCircle2 } from "lucide-react"
import { CopyButton } from "./copy-button"
import { decodePaymentRequest, getDecodedToken, type PaymentRequest } from "@cashu/cashu-ts"
import { useEndpointCache } from "@/lib/api-cache-store"

interface ApiResponse {
  status: number
  data?: Record<string, unknown> | string | number | boolean | null
  error?: string
}

interface CashuProof {
  amount: number
  secret: string
}

interface ApiTestSectionProps {
  endpoint: ApiEndpoint
  domain: string
  api: {
    id: string
    name: string
    domain: string
    description: string
    tags: string[]
    endpoints: ApiEndpoint[]
    minPrice: number
    maxPrice: number
    supportedMints: string[]
    supportedPaymentMethods: ("L402" | "P2PK" | "Cashu")[]
    creatorPubkey?: string
    eventId?: string
  }
}

export function ApiTestSection({ endpoint, domain, api }: ApiTestSectionProps) {
  const [parameters, setParameters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    endpoint.parameters?.forEach((param) => {
      initial[param.name] = ""
    })
    return initial
  })

  const buildUrl = () => {
    const baseUrl = `https://${domain}${endpoint.path}`
    const params = new URLSearchParams()

    Object.entries(parameters).forEach(([key, value]) => {
      if (value.trim()) {
        params.append(key, value)
      }
    })

    const queryString = params.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  const fullUrl = buildUrl()

  // Get validation results for this endpoint using the cache
  const { data: validationResult } = useEndpointCache(api.domain, endpoint.method, endpoint.path)

  // Flow 1: Lightning
  const [lightningOpen, setLightningOpen] = useState(false)
  const [lightningInvoice, setLightningInvoice] = useState<string | null>(null)
  const [lightningMacaroon, setLightningMacaroon] = useState<string | null>(null)
  const [lightningInvoiceExpiry, setLightningInvoiceExpiry] = useState<number | null>(null)
  const [lightningTimeRemaining, setLightningTimeRemaining] = useState<number | null>(null)
  const [lightningPreimage, setLightningPreimage] = useState("")
  const [lightningLoading, setLightningLoading] = useState(false)
  const [lightningResponse, setLightningResponse] = useState<ApiResponse | null>(null)

  // Flow 2: Cashu Standard
  const [cashuStandardOpen, setCashuStandardOpen] = useState(false)
  const [cashuStandardToken, setCashuStandardToken] = useState("")
  const [cashuStandardLoading, setCashuStandardLoading] = useState(false)
  const [cashuStandardResponse, setCashuStandardResponse] = useState<ApiResponse | null>(null)
  const [cashuStandardValidation, setCashuStandardValidation] = useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    mint?: string
    totalAmount?: number
    unit?: string
  } | null>(null)

  // Flow 3: Cashu P2PK
  const [cashuP2pkOpen, setCashuP2pkOpen] = useState(false)
  const [cashuP2pkHeader, setCashuP2pkHeader] = useState<string | null>(null)
  const [cashuP2pkPaymentRequest, setCashuP2pkPaymentRequest] = useState<PaymentRequest | null>(null)
  const [cashuP2pkError, setCashuP2pkError] = useState<string | null>(null)
  const [cashuP2pkToken, setCashuP2pkToken] = useState("")
  const [cashuP2pkLoading, setCashuP2pkLoading] = useState(false)
  const [cashuP2pkResponse, setCashuP2pkResponse] = useState<ApiResponse | null>(null)
  const [cashuP2pkValidation, setCashuP2pkValidation] = useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    mint?: string
    totalAmount?: number
    unit?: string
    p2pkKeys?: string[]
  } | null>(null)
  const [showP2pkJsonView, setShowP2pkJsonView] = useState(false)

  // Timer effect for invoice expiry
  useEffect(() => {
    if (!lightningInvoiceExpiry) {
      setLightningTimeRemaining(null)
      return
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = lightningInvoiceExpiry - now
      setLightningTimeRemaining(remaining > 0 ? remaining : 0)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [lightningInvoiceExpiry])

  // Helper function to decode lightning invoice and extract expiry
  const decodeLightningInvoice = (invoice: string): number | null => {
    try {
      // Remove the "lnbc" or "lntb" prefix and extract the timestamp section
      const match = invoice.match(/^ln(bc|tb|bcrt)(\d+)/)
      if (!match) return null

      // Lightning invoices encode timestamp in the payload
      // For a more accurate decode, we'd need a full bolt11 decoder
      // For now, we'll assume a default expiry of 1 hour from creation
      // You can replace this with a proper bolt11 decoder library if needed
      const parts = invoice.slice(4).split("1")
      if (parts.length < 2) return null

      // Extract timestamp from the data part (simplified approach)
      // In production, use a library like 'light-bolt11-decoder' or 'bolt11'
      // const timestampSection = parts[0] // Not used in simplified approach

      // Most invoices default to 1 hour expiry, some may be 24 hours
      // Without full decoding, we'll estimate based on invoice creation
      // Ideally, use: import { decode } from 'bolt11'

      // For now, return current time + 1 hour as default
      return Math.floor(Date.now() / 1000) + 3600
    } catch (error) {
      console.error("Error decoding invoice:", error)
      return null
    }
  }

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "Expired"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // Flow 1: Get initial invoice
  const handleGetInvoice = async () => {
    setLightningLoading(true)
    setLightningInvoice(null)
    setLightningMacaroon(null)
    setLightningInvoiceExpiry(null)
    setLightningResponse(null)

    try {
      const response = await fetch(fullUrl, {
        method: endpoint.method,
      })

      if (response.status === 402) {
        const wwwAuth = response.headers.get("WWW-Authenticate")
        if (wwwAuth) {
          // Extract both macaroon and invoice from WWW-Authenticate header
          const macaroonMatch = wwwAuth.match(/macaroon="([^"]+)"/)
          const invoiceMatch = wwwAuth.match(/invoice="([^"]+)"/)
          
          if (macaroonMatch && invoiceMatch) {
            const macaroon = macaroonMatch[1]
            const invoice = invoiceMatch[1]
            setLightningMacaroon(macaroon)
            setLightningInvoice(invoice)
            const expiry = decodeLightningInvoice(invoice)
            setLightningInvoiceExpiry(expiry)
          }
        }
      }
    } catch (error) {
      setLightningResponse({
        status: 0,
        error: error instanceof Error ? error.message : "Network error",
      })
    } finally {
      setLightningLoading(false)
    }
  }

  // Flow 1: Submit with preimage
  const handleLightningSubmit = async () => {
    if (!lightningPreimage.trim() || !lightningMacaroon) {
      setLightningResponse({
        status: 400,
        error: "Please provide a preimage and ensure you have a valid macaroon",
      })
      return
    }

    setLightningLoading(true)

    try {
      const response = await fetch(fullUrl, {
        method: endpoint.method,
        headers: {
          Authorization: `L402 ${lightningMacaroon}:${lightningPreimage}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json().catch(() => null)

      setLightningResponse({
        status: response.status,
        data: data,
        error: response.ok ? undefined : "Payment verification failed",
      })
    } catch (error) {
      setLightningResponse({
        status: 0,
        error: error instanceof Error ? error.message : "Network error",
      })
    } finally {
      setLightningLoading(false)
    }
  }

  // Flow 2: Cashu Standard
  const handleCashuStandardSubmit = async () => {
    if (!cashuStandardToken.trim()) {
      setCashuStandardResponse({
        status: 400,
        error: "Please enter a Cashu token",
      })
      return
    }

    // Validate token first
    validateCashuToken(cashuStandardToken, endpoint.pricePerThousand)

    // Wait a bit for validation state to update
    await new Promise((resolve) => setTimeout(resolve, 100))

    setCashuStandardResponse(null)
    setCashuStandardLoading(true)

    try {
      const response = await fetch(fullUrl, {
        method: endpoint.method,
        headers: {
          Authorization: `Cashu ${cashuStandardToken}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json().catch(() => null)

      setCashuStandardResponse({
        status: response.status,
        data: data,
        error: response.ok ? undefined : "Payment failed or invalid token",
      })
    } catch (error) {
      setCashuStandardResponse({
        status: 0,
        error: error instanceof Error ? error.message : "Network error",
      })
    } finally {
      setCashuStandardLoading(false)
    }
  }

  // Flow 3: Get P2PK payment request (X-Cashu header)
  const handleGetP2pkRequest = async () => {
    setCashuP2pkLoading(true)
    setCashuP2pkHeader(null)
    setCashuP2pkPaymentRequest(null)
    setCashuP2pkError(null)
    setCashuP2pkResponse(null)

    try {
      const response = await fetch(fullUrl, {
        method: endpoint.method,
      })

      if (response.status === 402) {
        const xCashu = response.headers.get("X-Cashu")
        if (xCashu) {
          setCashuP2pkHeader(xCashu)
          try {
            const decodedRequest = decodePaymentRequest(xCashu)
            console.log("[v0] Decoded P2PK payment request:", decodedRequest)
            setCashuP2pkPaymentRequest(decodedRequest)
          } catch (decodeError) {
            console.error("Error decoding payment request:", decodeError)
            setCashuP2pkError(
              `Failed to decode payment request: ${decodeError instanceof Error ? decodeError.message : "Unknown error"}`,
            )
          }
        } else {
          const availableHeaders = Array.from(response.headers.keys()).join(", ")
          setCashuP2pkError(
            `X-Cashu header not exposed by server. The server needs to add "X-Cashu" to the Access-Control-Expose-Headers. Available headers: ${availableHeaders || "none"}`,
          )
        }
      } else {
        setCashuP2pkError(`Expected 402 Payment Required, but got ${response.status}`)
      }
    } catch (error) {
      setCashuP2pkResponse({
        status: 0,
        error: error instanceof Error ? error.message : "Network error",
      })
    } finally {
      setCashuP2pkLoading(false)
    }
  }

  // Flow 3: Cashu P2PK
  const handleCashuP2pkSubmit = async () => {
    if (!cashuP2pkToken.trim()) {
      setCashuP2pkResponse({
        status: 400,
        error: "Please enter a P2PK-locked Cashu token",
      })
      return
    }

    // Validate token first
    const expectedPubkey = cashuP2pkPaymentRequest?.nut10?.data
    const expectedAmount = cashuP2pkPaymentRequest?.amount
    validateP2pkToken(cashuP2pkToken, expectedPubkey, expectedAmount)

    // Wait a bit for validation state to update
    await new Promise((resolve) => setTimeout(resolve, 100))

    setCashuP2pkResponse(null)
    setCashuP2pkError(null)
    setCashuP2pkLoading(true)

    try {
      const response = await fetch(fullUrl, {
        method: endpoint.method,
        headers: {
          Authorization: `Cashu ${cashuP2pkToken}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json().catch(() => null)

      setCashuP2pkResponse({
        status: response.status,
        data: data,
        error: response.ok ? undefined : "Payment failed or invalid token",
      })
    } catch (error) {
      setCashuP2pkResponse({
        status: 0,
        error: error instanceof Error ? error.message : "Network error",
      })
    } finally {
      setCashuP2pkLoading(false)
    }
  }

  const validateCashuToken = (token: string, expectedAmount?: number) => {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const decoded = getDecodedToken(token)
      console.log("[v0] Decoded Cashu token:", decoded)

      // Validate mint URL
      if (!decoded.mint) {
        errors.push("Token is missing mint URL")
      } else {
        try {
          new URL(decoded.mint)
        } catch {
          errors.push(`Invalid mint URL: ${decoded.mint}`)
        }
      }

      // Validate unit
      if (!decoded.unit) {
        warnings.push("Token is missing unit, assuming 'sat'")
      } else if (decoded.unit !== "sat") {
        errors.push(`Invalid unit: ${decoded.unit} (expected 'sat')`)
      }

      // Validate proofs and calculate total amount
      if (!decoded.proofs || decoded.proofs.length === 0) {
        errors.push("Token has no proofs")
      } else {
        const totalAmount = decoded.proofs.reduce((sum: number, proof: CashuProof) => sum + proof.amount, 0)

        if (totalAmount === 0) {
          errors.push("Token has zero value")
        }

        if (expectedAmount && totalAmount < expectedAmount) {
          errors.push(`Insufficient amount: ${totalAmount} sat (expected ${expectedAmount} sat)`)
        }

        setCashuStandardValidation({
          isValid: errors.length === 0,
          errors,
          warnings,
          mint: decoded.mint,
          totalAmount,
          unit: decoded.unit || "sat",
        })
      }
    } catch (error) {
      console.error("[v0] Error decoding Cashu token:", error)
      errors.push(`Failed to decode token: ${error instanceof Error ? error.message : "Unknown error"}`)
      setCashuStandardValidation({
        isValid: false,
        errors,
        warnings,
      })
    }
  }

  const validateP2pkToken = (token: string, expectedPubkey?: string, expectedAmount?: number) => {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const decoded = getDecodedToken(token)
      console.log("[v0] Decoded P2PK Cashu token:", decoded)

      // Validate mint URL
      if (!decoded.mint) {
        errors.push("Token is missing mint URL")
      } else {
        try {
          new URL(decoded.mint)
        } catch {
          errors.push(`Invalid mint URL: ${decoded.mint}`)
        }
      }

      // Validate unit
      if (!decoded.unit) {
        warnings.push("Token is missing unit, assuming 'sat'")
      } else if (decoded.unit !== "sat") {
        errors.push(`Invalid unit: ${decoded.unit} (expected 'sat')`)
      }

      // Validate proofs and extract P2PK keys
      if (!decoded.proofs || decoded.proofs.length === 0) {
        errors.push("Token has no proofs")
      } else {
        const totalAmount = decoded.proofs.reduce((sum: number, proof: CashuProof) => sum + proof.amount, 0)
        const p2pkKeys: string[] = []

        // Extract P2PK public keys from proof secrets
        decoded.proofs.forEach((proof: CashuProof) => {
          try {
            const secret = JSON.parse(proof.secret)
            if (Array.isArray(secret) && secret[0] === "P2PK" && secret[1]?.data) {
              p2pkKeys.push(secret[1].data)
            }
          } catch {
            // Secret is not P2PK format, skip
          }
        })

        if (p2pkKeys.length === 0) {
          errors.push("Token has no P2PK-locked proofs")
        } else if (expectedPubkey && !p2pkKeys.includes(expectedPubkey)) {
          errors.push(`P2PK public key mismatch (expected ${expectedPubkey})`)
        }

        if (totalAmount === 0) {
          errors.push("Token has zero value")
        }

        if (expectedAmount && totalAmount < expectedAmount) {
          errors.push(`Insufficient amount: ${totalAmount} sat (expected ${expectedAmount} sat)`)
        }

        setCashuP2pkValidation({
          isValid: errors.length === 0,
          errors,
          warnings,
          mint: decoded.mint,
          totalAmount,
          unit: decoded.unit || "sat",
          p2pkKeys,
        })
      }
    } catch (error) {
      console.error("[v0] Error decoding P2PK Cashu token:", error)
      errors.push(`Failed to decode token: ${error instanceof Error ? error.message : "Unknown error"}`)
      setCashuP2pkValidation({
        isValid: false,
        errors,
        warnings,
      })
    }
  }

  const supportedPaymentMethods = validationResult?.supportedPaymentMethods || ['Cashu']
  const supportsL402 = supportedPaymentMethods.includes('L402')
  const supportsP2PK = supportedPaymentMethods.includes('P2PK')
  const supportsCashu = supportedPaymentMethods.includes('Cashu') && !supportsP2PK

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-mono">Test API</CardTitle>
        <CardDescription className="text-xs">Choose a payment method to test this endpoint</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {endpoint.parameters && endpoint.parameters.length > 0 && (
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <div className="text-sm font-medium">Parameters</div>
            <div className="space-y-3">
              {endpoint.parameters.map((param) => (
                <div key={param.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor={param.name} className="text-xs font-medium">
                      {param.name}
                    </label>
                    {param.required && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                        required
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs px-1.5 py-0 font-mono">
                      {param.type}
                    </Badge>
                  </div>
                  <Input
                    id={param.name}
                    type="text"
                    placeholder={param.description}
                    value={parameters[param.name] || ""}
                    onChange={(e) =>
                      setParameters((prev) => ({
                        ...prev,
                        [param.name]: e.target.value,
                      }))
                    }
                    className="text-xs font-mono"
                  />
                  <p className="text-xs text-muted-foreground">{param.description}</p>
                </div>
              ))}
            </div>

            {/* Show constructed URL */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground">Request URL:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background px-3 py-2 rounded text-xs font-mono break-all border border-border/50">
                  {fullUrl}
                </code>
                <CopyButton text={fullUrl} />
              </div>
            </div>
          </div>
        )}

        {/* Flow 1: Lightning */}
        {supportsL402 && (
          <Collapsible open={lightningOpen} onOpenChange={setLightningOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Lightning Network (L402)
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${lightningOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-4 p-4 rounded-lg border border-border bg-muted/30">
                {/* Step 1: Get Invoice */}
                <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Step 1: Get Invoice
                  </div>
                  <Button onClick={handleGetInvoice} disabled={lightningLoading} className="w-full" size="sm">
                    {lightningLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching Invoice
                      </>
                    ) : (
                      "Get Invoice"
                    )}
                  </Button>
                </div>

                {/* Step 2: Pay Invoice */}
                {lightningInvoice && (
                  <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Step 2: Pay Invoice{" "}
                      {validationResult?.invoiceData?.decodedAmount && `(${validationResult.invoiceData.decodedAmount} sats)`}
                    </div>

                    {/* Timer */}
                    {lightningTimeRemaining !== null && (
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                          lightningTimeRemaining === 0
                            ? "bg-destructive/10 text-destructive"
                            : lightningTimeRemaining < 300
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                              : "bg-muted"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">
                          {lightningTimeRemaining === 0
                            ? "Invoice Expired"
                            : `Expires in ${formatTimeRemaining(lightningTimeRemaining)}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all border border-border/50">
                        {lightningInvoice}
                      </code>
                      <CopyButton text={lightningInvoice} />
                    </div>
                  </div>
                )}

                {/* Step 3: Submit with Preimage */}
                {lightningInvoice && (
                  <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Step 3: Submit Preimage
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Preimage (hex)"
                        value={lightningPreimage}
                        onChange={(e) => setLightningPreimage(e.target.value)}
                        className="font-mono text-xs"
                        disabled={lightningLoading}
                      />
                      <Button
                        onClick={handleLightningSubmit}
                        disabled={lightningLoading}
                        size="sm"
                        className="shrink-0"
                      >
                        {lightningLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Testing
                          </>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Response */}
                {lightningResponse && (
                  <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={lightningResponse.status === 200 ? "default" : "destructive"}
                        className="text-xs font-mono"
                      >
                        {lightningResponse.status === 0 ? "ERROR" : `${lightningResponse.status}`}
                      </Badge>
                      {lightningResponse.error && (
                        <span className="text-xs text-destructive">{lightningResponse.error}</span>
                      )}
                    </div>
                    {lightningResponse.data && (
                      <div className="flex items-start gap-2">
                        <pre className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono overflow-x-auto max-h-48 border border-border/50">
                          {JSON.stringify(lightningResponse.data, null, 2)}
                        </pre>
                        <CopyButton text={JSON.stringify(lightningResponse.data, null, 2)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Flow 2: Cashu Standard */}
        {supportsCashu && (
          <Collapsible open={cashuStandardOpen} onOpenChange={setCashuStandardOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Coins className="h-4 w-4 text-orange-500" />
                  Ecash (Cashu)
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${cashuStandardOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-4 p-4 rounded-lg border border-border bg-muted/30">
                {/* Step 1: Enter Token */}
                <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Step 1: Enter Cashu Token
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="cashuA..."
                      value={cashuStandardToken}
                      onChange={(e) => {
                        setCashuStandardToken(e.target.value)
                        setCashuStandardValidation(null)
                      }}
                      className="font-mono text-xs"
                      disabled={cashuStandardLoading}
                    />
                    <Button
                      onClick={handleCashuStandardSubmit}
                      disabled={cashuStandardLoading}
                      size="sm"
                      className="shrink-0"
                    >
                      {cashuStandardLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Testing
                        </>
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </div>
                </div>

                {cashuStandardValidation && (
                  <div
                    className={`space-y-3 p-3 rounded-md border ${
                      cashuStandardValidation.isValid
                        ? "bg-green-500/10 border-green-500/50"
                        : "bg-destructive/10 border-destructive/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {cashuStandardValidation.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-2 flex-1">
                        <div
                          className={`text-xs font-medium ${
                            cashuStandardValidation.isValid ? "text-green-600 dark:text-green-500" : "text-destructive"
                          }`}
                        >
                          {cashuStandardValidation.isValid ? "Token Valid" : "Token Validation Failed"}
                        </div>

                        {/* Token Details */}
                        {cashuStandardValidation.mint && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Mint: </span>
                            <code className="font-mono">{cashuStandardValidation.mint}</code>
                          </div>
                        )}
                        {cashuStandardValidation.totalAmount !== undefined && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Amount: </span>
                            <span className="font-mono font-semibold">
                              {cashuStandardValidation.totalAmount} {cashuStandardValidation.unit}
                            </span>
                          </div>
                        )}

                        {/* Errors */}
                        {cashuStandardValidation.errors.length > 0 && (
                          <ul className="space-y-1">
                            {cashuStandardValidation.errors.map((error, idx) => (
                              <li key={idx} className="text-xs text-destructive/80">
                                • {error}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Warnings */}
                        {cashuStandardValidation.warnings.length > 0 && (
                          <ul className="space-y-1">
                            {cashuStandardValidation.warnings.map((warning, idx) => (
                              <li key={idx} className="text-xs text-yellow-600 dark:text-yellow-500">
                                • {warning}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Response */}
                {cashuStandardResponse && (
                  <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={cashuStandardResponse.status === 200 ? "default" : "destructive"}
                        className="text-xs font-mono"
                      >
                        {cashuStandardResponse.status === 0 ? "ERROR" : `${cashuStandardResponse.status}`}
                      </Badge>
                      {cashuStandardResponse.error && (
                        <span className="text-xs text-destructive">{cashuStandardResponse.error}</span>
                      )}
                    </div>
                    {cashuStandardResponse.data && (
                      <div className="flex items-start gap-2">
                        <pre className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono overflow-x-auto max-h-48 border border-border/50">
                          {JSON.stringify(cashuStandardResponse.data, null, 2)}
                        </pre>
                        <CopyButton text={JSON.stringify(cashuStandardResponse.data, null, 2)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Flow 3: Cashu P2PK */}
        {supportsP2PK && (
          <Collapsible open={cashuP2pkOpen} onOpenChange={setCashuP2pkOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Coins className="h-4 w-4 text-orange-500" />
                  Ecash (P2PK)
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${cashuP2pkOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-4 p-4 rounded-lg border border-border bg-muted/30">
                {/* Step 1: Get P2PK Payment Request */}
                <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Step 1: Get P2PK Payment Request
                  </div>
                  <Button onClick={handleGetP2pkRequest} disabled={cashuP2pkLoading} className="w-full" size="sm">
                    {cashuP2pkLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching P2PK Request
                      </>
                    ) : (
                      "Get P2PK Payment Request"
                    )}
                  </Button>
                </div>

                {cashuP2pkError && (
                  <div className="space-y-3 p-3 rounded-md bg-destructive/10 border border-destructive/50">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-destructive">Error</div>
                        <div className="text-xs text-destructive/80">{cashuP2pkError}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Show Decoded Payment Request */}
                {cashuP2pkPaymentRequest && (
                  <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Step 2: Pay Payment Request
                    </div>

                    {/* Payment Request Details Card */}
                    <div className="space-y-3 p-3 rounded-md bg-muted/50 border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <Coins className="h-3.5 w-3.5" />
                          Payment Request Details
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowP2pkJsonView(!showP2pkJsonView)}
                          className="h-7 text-xs"
                        >
                          {showP2pkJsonView ? "Rich View" : "JSON View"}
                        </Button>
                      </div>

                      {showP2pkJsonView ? (
                        <div className="flex items-start gap-2">
                          <pre className="flex-1 bg-background px-3 py-2 rounded text-xs font-mono overflow-x-auto max-h-96 border border-border/50">
                            {JSON.stringify(cashuP2pkPaymentRequest, null, 2)}
                          </pre>
                          <CopyButton text={JSON.stringify(cashuP2pkPaymentRequest, null, 2)} />
                        </div>
                      ) : (
                        <div className="grid gap-2 text-xs">
                        {/* Amount */}
                        {cashuP2pkPaymentRequest.amount && (
                          <div className="flex justify-between items-center py-1.5 px-2 rounded bg-background">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-mono font-semibold">
                              {cashuP2pkPaymentRequest.amount} {cashuP2pkPaymentRequest.unit}
                            </span>
                          </div>
                        )}

                        {/* Unit */}
                        <div className="flex justify-between items-center py-1.5 px-2 rounded bg-background">
                          <span className="text-muted-foreground">Unit:</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {cashuP2pkPaymentRequest.unit}
                          </Badge>
                        </div>

                        {/* Mint */}
                        {cashuP2pkPaymentRequest.mints && cashuP2pkPaymentRequest.mints.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-muted-foreground">Mint:</span>
                            {cashuP2pkPaymentRequest.mints.map((mint, idx) => (
                              <div key={idx} className="flex items-center gap-2 py-1.5 px-2 rounded bg-background">
                                <code className="flex-1 text-xs font-mono break-all">{mint}</code>
                                <CopyButton text={mint} />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* P2PK Public Key */}
                        {cashuP2pkPaymentRequest.nut10?.data && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">P2PK Public Key:</span>
                              <Badge variant="secondary" className="text-xs">
                                {cashuP2pkPaymentRequest.nut10.kind}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-background">
                              <code className="flex-1 text-xs font-mono break-all">
                                {cashuP2pkPaymentRequest.nut10.data}
                              </code>
                              <CopyButton text={cashuP2pkPaymentRequest.nut10.data} />
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {cashuP2pkPaymentRequest.description && (
                          <div className="flex justify-between items-center py-1.5 px-2 rounded bg-background">
                            <span className="text-muted-foreground">Description:</span>
                            <span className="text-xs">{cashuP2pkPaymentRequest.description}</span>
                          </div>
                        )}

                        {/* Single Use */}
                        {cashuP2pkPaymentRequest.singleUse !== undefined && (
                          <div className="flex justify-between items-center py-1.5 px-2 rounded bg-background">
                            <span className="text-muted-foreground">Single Use:</span>
                            <Badge
                              variant={cashuP2pkPaymentRequest.singleUse ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {cashuP2pkPaymentRequest.singleUse ? "Yes" : "No"}
                            </Badge>
                          </div>
                        )}

                        {/* Request ID */}
                        {cashuP2pkPaymentRequest.id && (
                          <div className="space-y-1.5">
                            <span className="text-muted-foreground">Request ID:</span>
                            <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-background">
                              <code className="flex-1 text-xs font-mono break-all">{cashuP2pkPaymentRequest.id}</code>
                              <CopyButton text={cashuP2pkPaymentRequest.id} />
                            </div>
                          </div>
                        )}
                        </div>
                      )}

                      {/* Raw Payment Request */}
                      <div className="space-y-1.5 pt-2 border-t border-border">
                        <span className="text-muted-foreground text-xs">Raw Payment Request:</span>
                        <div className="flex items-start gap-2">
                          <code className="flex-1 bg-background px-2 py-1.5 rounded text-xs font-mono break-all">
                            {cashuP2pkHeader}
                          </code>
                          <CopyButton text={cashuP2pkHeader || ""} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Submit P2PK Token */}
                {cashuP2pkPaymentRequest && (
                  <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Step 3: Submit P2PK Token
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="cashuA..."
                        value={cashuP2pkToken}
                        onChange={(e) => {
                          setCashuP2pkToken(e.target.value)
                          setCashuP2pkValidation(null)
                        }}
                        className="font-mono text-xs"
                        disabled={cashuP2pkLoading}
                      />
                      <Button
                        onClick={handleCashuP2pkSubmit}
                        disabled={cashuP2pkLoading}
                        size="sm"
                        className="shrink-0"
                      >
                        {cashuP2pkLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Testing
                          </>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {cashuP2pkValidation && (
                  <div
                    className={`space-y-3 p-3 rounded-md border ${
                      cashuP2pkValidation.isValid
                        ? "bg-green-500/10 border-green-500/50"
                        : "bg-destructive/10 border-destructive/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {cashuP2pkValidation.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-2 flex-1">
                        <div
                          className={`text-xs font-medium ${
                            cashuP2pkValidation.isValid ? "text-green-600 dark:text-green-500" : "text-destructive"
                          }`}
                        >
                          {cashuP2pkValidation.isValid ? "Token Valid" : "Token Validation Failed"}
                        </div>

                        {/* Token Details */}
                        {cashuP2pkValidation.mint && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Mint: </span>
                            <code className="font-mono">{cashuP2pkValidation.mint}</code>
                          </div>
                        )}
                        {cashuP2pkValidation.totalAmount !== undefined && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Amount: </span>
                            <span className="font-mono font-semibold">
                              {cashuP2pkValidation.totalAmount} {cashuP2pkValidation.unit}
                            </span>
                          </div>
                        )}
                        {cashuP2pkValidation.p2pkKeys && cashuP2pkValidation.p2pkKeys.length > 0 && (
                          <div className="text-xs space-y-1">
                            <span className="text-muted-foreground">P2PK Keys Found: </span>
                            {cashuP2pkValidation.p2pkKeys.map((key, idx) => (
                              <code key={idx} className="block font-mono text-xs break-all">
                                {key}
                              </code>
                            ))}
                          </div>
                        )}

                        {/* Errors */}
                        {cashuP2pkValidation.errors.length > 0 && (
                          <ul className="space-y-1">
                            {cashuP2pkValidation.errors.map((error, idx) => (
                              <li key={idx} className="text-xs text-destructive/80">
                                • {error}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Warnings */}
                        {cashuP2pkValidation.warnings.length > 0 && (
                          <ul className="space-y-1">
                            {cashuP2pkValidation.warnings.map((warning, idx) => (
                              <li key={idx} className="text-xs text-yellow-600 dark:text-yellow-500">
                                • {warning}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Response */}
                {cashuP2pkResponse && (
                  <div className="space-y-3 p-3 rounded-md bg-background border border-border/50">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={cashuP2pkResponse.status === 200 ? "default" : "destructive"}
                        className="text-xs font-mono"
                      >
                        {cashuP2pkResponse.status === 0 ? "ERROR" : `${cashuP2pkResponse.status}`}
                      </Badge>
                      {cashuP2pkResponse.error && (
                        <span className="text-xs text-destructive">{cashuP2pkResponse.error}</span>
                      )}
                    </div>
                    {cashuP2pkResponse.data && (
                      <div className="flex items-start gap-2">
                        <pre className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono overflow-x-auto max-h-48 border border-border/50">
                          {JSON.stringify(cashuP2pkResponse.data, null, 2)}
                        </pre>
                        <CopyButton text={JSON.stringify(cashuP2pkResponse.data, null, 2)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
