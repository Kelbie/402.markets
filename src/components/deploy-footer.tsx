import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Rocket, Loader2, ChevronUp, ChevronDown } from "lucide-react"

interface Change {
  field: string
  description: string
  oldValue?: string
  newValue?: string
}

interface DeployFooterProps {
  changes: Change[]
  onDeploy: () => Promise<void> | void
  onDiscard?: () => void
  isDeploying?: boolean
}

export function DeployFooter({ changes, onDeploy, onDiscard, isDeploying = false }: DeployFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (changes.length === 0) return null

  const handleDeploy = async () => {
    await onDeploy()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
      {/* Expanded changes summary */}
      {isExpanded && (
        <div className="border-b bg-muted/50 max-h-48 overflow-y-auto">
          <div className="container mx-auto px-4 py-3">
            <div className="space-y-2">
              {changes.map((change, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                    {change.field}
                  </Badge>
                  <p className="text-muted-foreground flex-1">{change.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main footer bar */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <div>
              <p className="font-semibold text-sm">
                {changes.length} {changes.length === 1 ? 'change' : 'changes'} pending
              </p>
              <p className="text-xs text-muted-foreground">
                {isExpanded ? 'Click to collapse' : 'Click to see details'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDiscard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDiscard}
                disabled={isDeploying}
              >
                Discard
              </Button>
            )}
            <Button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="gap-2"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Deploy Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

