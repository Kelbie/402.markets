import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { publishApi } from "@/lib/nostr-api"
import type { Api } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface EditApiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  api: Api
  rawContent?: string
}

export function EditApiModal({ open, onOpenChange, onSuccess, api, rawContent }: EditApiModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (rawContent) {
      // Use raw content from the event (could be OpenAPI or legacy format)
      setFormData(rawContent)
    } else {
      // Convert internal API format to OpenAPI spec for editing
      const openapiSpec = {
        openapi: "3.0.0",
        info: {
          title: api.name,
          version: "1.0.0",
          description: api.description,
          tags: api.tags,
        },
        servers: [
          {
            url: api.domain,
            description: "API server",
          },
        ],
        paths: api.endpoints.reduce((paths, endpoint) => {
          const method = endpoint.method.toLowerCase()
          if (!paths[endpoint.path]) {
            paths[endpoint.path] = {}
          }
          paths[endpoint.path][method] = {
            summary: endpoint.description,
            description: endpoint.description,
            parameters: endpoint.parameters?.map((p) => ({
              name: p.name,
              in: "query",
              description: p.description,
              required: p.required,
              schema: {
                type: p.type,
              },
            })),
            responses: {
              "200": {
                description: "Successful response",
                content: endpoint.response
                  ? {
                      "application/json": {
                        example: JSON.parse(endpoint.response.example || "{}"),
                      },
                    }
                  : undefined,
              },
            },
          }
          return paths
        }, {} as any),
      }
      setFormData(JSON.stringify(openapiSpec, null, 2))
    }
  }, [api, rawContent])

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      const apiData = JSON.parse(formData)

      // Validate it's valid JSON at minimum
      if (!apiData) {
        throw new Error("Invalid JSON")
      }

      // Use the same d tag to update the existing event
      await publishApi(apiData, api.dTag)

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("[v0] Error updating API:", err)
      setError(err instanceof Error ? err.message : "Failed to update API")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit API</DialogTitle>
          <DialogDescription>
            Edit the OpenAPI specification below to update your API. Publishing with the same d tag will replace the
            previous version.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="api-data">OpenAPI Specification (JSON)</Label>
            <Textarea
              id="api-data"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="Enter OpenAPI spec as JSON..."
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update API
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
