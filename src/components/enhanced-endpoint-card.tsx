import { useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, Edit, Trash2, Copy, CheckCircle2 } from "lucide-react"
import type { Api } from "@/lib/types"

interface EnhancedEndpointCardProps {
  api: Api
  onEdit?: (api: Api) => void
  onDelete?: (api: Api) => void
  onAnalytics?: (api: Api) => void
}

export function EnhancedEndpointCard({ api, onEdit, onDelete, onAnalytics }: EnhancedEndpointCardProps) {
  const [copied, setCopied] = useState(false)
  const [status] = useState<"active" | "inactive">("active") // TODO: Get actual status

  // Mock data - in real implementation, this would come from analytics
  const stats = {
    requestsToday: Math.floor(Math.random() * 100),
    revenue: Math.floor(Math.random() * 1000)
  }

  const copyUrl = async () => {
    const url = `https://npub...402.markets${api.endpoints[0]?.path || ""}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-2 w-2 rounded-full ${status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
              <CardTitle className="font-mono text-lg">
                {api.endpoints[0]?.path || api.name}
              </CardTitle>
            </div>
            <CardDescription className="text-xs line-clamp-1">
              {api.endpoints[0]?.description || api.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* URL */}
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <span className="text-xs font-mono truncate flex-1">
            https://npub...402.markets{api.endpoints[0]?.path || ""}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyUrl}
            className="h-6 w-6 p-0"
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              {api.endpoints[0]?.method || "GET"}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Price:</span>
            <span className="font-mono font-semibold ml-2">
              {api.endpoints[0]?.pricePerThousand ? `${api.endpoints[0].pricePerThousand} sats` : "5 sats"}
            </span>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{stats.requestsToday} requests today</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAnalytics?.(api)}
            className="flex items-center justify-center gap-1"
            title="Analytics"
          >
            <BarChart3 className="h-3 w-3" />
            <span className="text-xs hidden sm:inline">Stats</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit?.(api)}
            className="flex items-center justify-center gap-1"
            title="Edit"
          >
            <Edit className="h-3 w-3" />
            <span className="text-xs hidden sm:inline">Edit</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={copyUrl}
            className="flex items-center justify-center gap-1"
            title="Copy URL"
          >
            <Copy className="h-3 w-3" />
            <span className="text-xs hidden sm:inline">Copy</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete?.(api)}
            className="flex items-center justify-center gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
            <span className="text-xs hidden sm:inline">Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

