import { NDKEvent } from "@nostr-dev-kit/ndk"
import { ApiSchema, OpenAPISchema, type OpenAPISpec } from "./schemas"
import type { Api } from "./types"

export function convertOpenAPIToApi(openapi: OpenAPISpec): Omit<Api, "id" | "creatorPubkey" | "dTag" | "eventId" | "rawContent"> {
  const endpoints: any[] = []

  let domain = "unknown"
  const servers = openapi.servers || []
  if (servers.length > 0) {
    try {
      const url = new URL(servers[0].url)
      domain = url.host
    } catch {
      // If URL parsing fails, use the raw URL
      domain = servers[0].url.replace(/^https?:\/\//, "").replace(/\/$/, "")
    }
  }

  const tags: string[] = []
  if (openapi.tags && Array.isArray(openapi.tags) && openapi.tags.length > 0) {
    // OpenAPI tags are objects with {name, description}, extract just the names
    tags.push(...openapi.tags.map((tag) => (typeof tag === "string" ? tag : tag.name)))
  } else if (openapi.info["x-tags"] && Array.isArray(openapi.info["x-tags"])) {
    tags.push(...openapi.info["x-tags"])
  }

  if (openapi.paths) {
    console.log(`[API Parser] Converting ${Object.keys(openapi.paths).length} paths`)
    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      if (!pathItem) continue

      const methods = ["get", "post", "put", "delete", "patch", "options", "head", "trace"] as const

      for (const method of methods) {
        const operation = pathItem[method as keyof typeof pathItem]
        if (!operation) continue

        console.log(`[API Parser] Converting ${method.toUpperCase()} ${path}`)

        const pricePerThousand = (operation as any)["x-price-per-thousand"] || (operation as any)["x-l402-price"] || 0

        // Convert parameters
        const parameters = (operation as any).parameters?.map((param: any) => ({
          name: param.name,
          type: param.schema?.type || "string",
          required: param.required || false,
          description: param.description || "",
        })) || []

        // Convert response
        const response = (operation as any).responses?.["200"] ? {
          example: JSON.stringify((operation as any).responses["200"].content?.["application/json"]?.example || {})
        } : undefined

        endpoints.push({
          method: method.toUpperCase(),
          path,
          description: (operation as any).description || (operation as any).summary || "",
          pricePerThousand,
          parameters,
          response,
        })
      }
    }
  }

  return {
    name: openapi.info.title,
    domain,
    description: openapi.info.description || "",
    tags,
    endpoints,
    minPrice: 0,
    maxPrice: 0,
    supportedMints: (openapi.info["x-supported-mints"] as string[]) || [],
    supportedPaymentMethods: (openapi.info["x-supported-payment-methods"] as ("L402" | "P2PK" | "Cashu")[]) || [],
  }
}

export function parseAndValidateApi(
  content: string,
  eventId: string,
): Omit<Api, "id" | "creatorPubkey" | "dTag" | "eventId" | "rawContent"> | null {
  console.log(`[API Parser] Event ${eventId}: Starting validation`)
  console.log(`[API Parser] Event ${eventId}: Content length: ${content.length}`)
  console.log(`[API Parser] Event ${eventId}: Content preview: ${content.substring(0, 200)}...`)

  const trimmedContent = content.trim().toLowerCase()

  if (trimmedContent === "deprecated" || trimmedContent === '"deprecated"') {
    console.log(`[API Parser] Event ${eventId}: Content is marked as deprecated`)
    return null
  }

  if (trimmedContent.length === 0) {
    console.log(`[API Parser] Event ${eventId}: Content is empty`)
    return null
  }

  try {
    const data = JSON.parse(content)
    console.log(`[API Parser] Event ${eventId}: JSON parsed successfully`)
    console.log(`[API Parser] Event ${eventId}: Data keys:`, Object.keys(data))

    // Try OpenAPI validation first
    const openapiResult = OpenAPISchema.safeParse(data)

    if (openapiResult.success) {
      console.log(`[API Parser] Event ${eventId}: ✓ Valid OpenAPI spec "${openapiResult.data.info.title}"`)
      const apiData = convertOpenAPIToApi(openapiResult.data)
      console.log(`[API Parser] Event ${eventId}: Converted to API with ${apiData.endpoints.length} endpoints`)
      return apiData
    } else {
      console.log(`[API Parser] Event ${eventId}: OpenAPI validation failed:`, {
        errorCount: openapiResult.error.issues.length,
        errors: openapiResult.error.issues.map((e: any) => ({
          path: e.path.join("."),
          message: e.message,
          code: e.code,
          received: e.received,
        })),
      })
    }

    // Fallback to legacy format validation
    console.log(`[API Parser] Event ${eventId}: Trying legacy format validation...`)
    const result = ApiSchema.safeParse(data)

    if (!result.success) {
      console.log(`[API Parser] Event ${eventId}: ✗ Legacy validation also failed:`, {
        errorCount: result.error.issues.length,
        errors: result.error.issues.map((e: any) => ({
          path: e.path.join("."),
          message: e.message,
          code: e.code,
          received: e.received,
        })),
      })
      return null
    }

    console.log(`[API Parser] Event ${eventId}: ✓ Valid API (legacy format) "${result.data.name}"`)
    return {
      ...result.data,
      minPrice: result.data.minPrice ?? 0,
      maxPrice: result.data.maxPrice ?? 0,
      supportedMints: result.data.supportedMints ?? [],
      supportedPaymentMethods: result.data.supportedPaymentMethods ?? [],
    }
  } catch (error) {
    console.log(`[API Parser] Event ${eventId}: ✗ JSON parse error:`, {
      error: error instanceof Error ? error.message : String(error),
      contentPreview: content.substring(0, 100),
    })
    return null
  }
}

export function parseApiFromEvent(event: NDKEvent): Api | null {
  try {
    const apiData = parseAndValidateApi(event.content, event.id)

    if (!apiData) {
      return null
    }

    const dTag = event.tags.find((tag) => tag[0] === "d")?.[1]

    return {
      ...apiData,
      id: event.id, // Use event ID as unique identifier
      creatorPubkey: event.pubkey,
      dTag,
      eventId: event.id,
    }
  } catch {
    return null
  }
}
