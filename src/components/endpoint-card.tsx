import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bitcoin, Zap } from "lucide-react"
import { CopyButton } from "./copy-button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApiEndpoint } from "@/lib/types"

interface EndpointCardProps {
  endpoint: ApiEndpoint
  domain: string
  validationResult?: any
}

const methodColors = {
  GET: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  POST: "bg-green-500/10 text-green-500 border-green-500/20",
  PUT: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  PATCH: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  OPTIONS: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  HEAD: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  TRACE: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

export function EndpointCard({ endpoint, domain, validationResult }: EndpointCardProps) {
  const fullUrl = `https://${domain}${endpoint.path}`

  // Use validation results for payment method detection if available
  const supportedPaymentMethods = validationResult?.supportedPaymentMethods || []
  const supportsL402 = supportedPaymentMethods.includes('L402')
  const supportsP2PK = supportedPaymentMethods.includes('P2PK')
  const supportedMints = validationResult?.cashuPaymentRequest?.decoded?.mints || []

  // Debug logging
  if (validationResult) {
    console.log('[EndpointCard] Validation result:', validationResult)
    console.log('[EndpointCard] Invoice data:', validationResult?.invoiceData)
    console.log('[EndpointCard] Decoded amount:', validationResult?.invoiceData?.decodedAmount)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Badge variant="outline" className={`font-mono text-xs px-2 py-1 ${methodColors[endpoint.method]}`}>
              {endpoint.method}
            </Badge>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-mono break-all">{endpoint.path}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground shrink-0">
            <Bitcoin className="h-3 w-3" />
            {validationResult?.invoiceData?.decodedAmount ? (
              <span>{validationResult.invoiceData.decodedAmount}</span>
            ) : (
              <Skeleton className="h-4 w-12" />
            )}
          </div>
        </div>
        <CardDescription className="font-mono text-xs mt-2">{endpoint.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-mono text-muted-foreground">Endpoint URL</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">{fullUrl}</code>
            <CopyButton text={fullUrl} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono text-muted-foreground">Payment Methods</div>
          <div className="flex items-center gap-2 flex-wrap">
            {!supportsL402 && !supportsP2PK ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <>
                {supportsL402 && (
                  <Badge
                    variant="outline"
                    className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-mono text-xs"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    L402
                  </Badge>
                )}
                {supportsP2PK && (
                  <Badge
                    variant="outline"
                    className="bg-purple-500/10 text-purple-500 border-purple-500/20 font-mono text-xs"
                  >
                    <Bitcoin className="h-3 w-3 mr-1" />
                    P2PK
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/20 font-mono text-xs"
                >
                  <Bitcoin className="h-3 w-3 mr-1" />
                  Cashu
                </Badge>
              </>
            )}
          </div>
        </div>

        {supportsP2PK && supportedMints.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-muted-foreground">Supported Mints</div>
            <div className="flex flex-wrap gap-2">
              {supportedMints.map((mint: string) => (
                <div key={mint} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs font-mono">
                  <span className="text-muted-foreground break-all">{mint}</span>
                  <CopyButton text={mint} />
                </div>
              ))}
            </div>
          </div>
        )}

        {endpoint.parameters && endpoint.parameters.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-muted-foreground">Parameters</div>
            <div className="space-y-2">
              {endpoint.parameters.map((param) => (
                <div key={param.name} className="bg-muted px-3 py-2 rounded space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono font-semibold">{param.name}</code>
                    <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0">
                      {param.type}
                    </Badge>
                    {param.required && (
                      <Badge variant="destructive" className="text-xs font-mono px-1.5 py-0">
                        required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{param.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {endpoint.response && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-muted-foreground">Response Example</div>
            <div className="flex items-start gap-2">
              <pre className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono overflow-x-auto">
                {JSON.stringify(JSON.parse(endpoint.response.example), null, 2)}
              </pre>
              <CopyButton text={endpoint.response.example} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
