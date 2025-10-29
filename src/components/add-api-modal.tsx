import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { publishApi } from "@/lib/nostr-api"
import { Loader2 } from "lucide-react"

interface AddApiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const OPENAPI_EXAMPLE = {
  openapi: "3.0.0",
  info: {
    title: "Hello World",
    version: "1.0.0",
    description: "A L402 payment gateway example"
  },
  servers: [
    {
      url: "https://402.up.railway.app",
      description: "API server"
    }
  ],
  paths: {
    "/api/hello": {
      get: {
        summary: "Search for Nostr profiles by query string",
        description: "Search for Nostr profiles by query string",
        parameters: [],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                example: {
                  "message": "Hello World!"
                }
              }
            }
          }
        }
      }
    },
    "/api/joke": {
      get: {
        summary: "Get a random dad joke",
        description: "Get a random dad joke",
        parameters: [],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                example: {
                  "attachments": [
                    {
                      "fallback": "If you want a job in the moisturizer industry, the best advice I can give is to apply daily."
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/api/nostr/search": {
      get: {
        summary: "Search for Nostr profiles by query string",
        description: "Search for Nostr profiles by query string",
        parameters: [
          {
            name: "query",
            in: "query",
            description: "Search query for Nostr profiles",
            required: true,
            schema: {
              type: "string"
            }
          },
          {
            name: "limit",
            in: "query",
            description: "Maximum number of results to return (default: 5)",
            required: false,
            schema: {
              type: "integer"
            }
          },
          {
            name: "sort",
            in: "query",
            description: "Sort order (e.g., 'globalPagerank')",
            required: false,
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                example: {
                  "query": "kelbie",
                  "limit": 5,
                  "sort": "globalPagerank",
                  "results": [
                    {
                      "name": "kelbie",
                      "picture": "https://m.primal.net/HoYp.jpg"
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}

export function AddApiModal({ open, onOpenChange, onSuccess }: AddApiModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      const apiData = JSON.parse(formData)

      // Validate required OpenAPI fields
      if (!apiData.openapi || !apiData.info || !apiData.paths) {
        throw new Error("Invalid OpenAPI spec: missing required fields (openapi, info, paths)")
      }

      await publishApi(apiData)

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("[v0] Error submitting API:", err)
      setError(err instanceof Error ? err.message : "Failed to publish API")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New API</DialogTitle>
          <DialogDescription>
            Submit an OpenAPI 3.0 specification to publish your API to the marketplace.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="openapi-spec">OpenAPI 3.0 Specification</Label>
            <p className="text-sm text-muted-foreground">
              Paste your OpenAPI 3.0 JSON specification below. Use the{" "}
              <a 
                href="https://editor.swagger.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Swagger Editor
              </a>{" "}
              to create and export your specification as JSON.
            </p>
            <Textarea
              id="openapi-spec"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              placeholder=""
              className="min-h-[400px] font-mono text-sm"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish API"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
