import { z } from "zod"

// OpenAPI 3.0/3.1 Schema Definition - Only the schemas that are actually used
export const OpenAPIParameterSchema = z.object({
  name: z.string(),
  in: z.enum(["query", "header", "path", "cookie"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  schema: z
    .object({
      type: z.string(),
      format: z.string().optional(),
      default: z.any().optional(),
      enum: z.array(z.any()).optional(),
    })
    .optional(),
})

export const OpenAPIResponseSchema = z.object({
  description: z.string(),
  content: z
    .record(z.string(), z.object({
      schema: z.any().optional(),
      example: z.any().optional(),
    }))
    .optional(),
})

export const OpenAPITagSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
})

export const OpenAPIOperationSchema = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  operationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parameters: z.array(OpenAPIParameterSchema).optional(),
  requestBody: z.any().optional(), // More permissive
  responses: z.any().optional(), // More permissive
  "x-l402-price": z.number().optional(),
  "x-price-per-thousand": z.number().optional(),
}).passthrough() // Allow additional properties

export const OpenAPIPathItemSchema = z.object({
  get: OpenAPIOperationSchema.optional(),
  post: OpenAPIOperationSchema.optional(),
  put: OpenAPIOperationSchema.optional(),
  delete: OpenAPIOperationSchema.optional(),
  patch: OpenAPIOperationSchema.optional(),
  options: OpenAPIOperationSchema.optional(),
  head: OpenAPIOperationSchema.optional(),
  trace: OpenAPIOperationSchema.optional(),
  parameters: z.array(OpenAPIParameterSchema).optional(),
}).passthrough() // Allow additional properties

export const OpenAPIServerSchema = z.object({
  url: z.string(),
  description: z.string().optional(),
})

export const OpenAPIInfoSchema = z.object({
  title: z.string(),
  version: z.string(),
  description: z.string().optional(),
}).passthrough() // Allow additional properties like x-tags, x-supported-mints, etc.

export const OpenAPISchema = z.object({
  openapi: z.string(), // More permissive - just check it's a string
  info: OpenAPIInfoSchema,
  servers: z.array(OpenAPIServerSchema).optional(),
  tags: z.array(OpenAPITagSchema).optional(),
  paths: z.record(z.string(), z.any()).optional(), // Make paths completely flexible
  components: z
    .object({
      schemas: z.record(z.string(), z.any()).optional(),
      parameters: z.record(z.string(), z.any()).optional(),
      responses: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
}).passthrough() // Allow any additional properties

// Internal API representation (for display purposes)
export const ApiEndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "TRACE"]),
  path: z.string().min(1),
  description: z.string(),
  pricePerThousand: z.number().nonnegative(),
  parameters: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean(),
        description: z.string(),
      }),
    )
    .optional(),
  response: z
    .object({
      example: z.string(),
    })
    .optional(),
  invoiceData: z
    .object({
      macaroon: z.string(),
      invoice: z.string(),
      decodedAmount: z.number().optional(),
      paymentHash: z.string().optional(),
    })
    .optional(),
  cashuPaymentRequest: z
    .object({
      raw: z.string(),
      decoded: z
        .object({
          id: z.string(),
          amount: z.number().optional(),
          unit: z.string(),
          mints: z.array(z.string()),
          description: z.string().optional(),
          singleUse: z.boolean(),
          nut10: z
            .object({
              kind: z.string(),
              data: z.string(),
              tags: z.array(z.array(z.string())).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
})

export const ApiSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  domain: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  endpoints: z.array(ApiEndpointSchema).min(1),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  supportedMints: z.array(z.string()).optional(),
  supportedPaymentMethods: z.array(z.enum(["L402", "P2PK", "Cashu"])).optional(),
  creatorPubkey: z.string().optional(),
  creatorProfile: z
    .object({
      name: z.string().optional(),
      picture: z.string().optional(),
      nip05: z.string().optional(),
    })
    .optional(),
  dTag: z.string().optional(),
  eventId: z.string().optional(),
})

// Infer TypeScript types from Zod schemas
export type OpenAPISpec = z.infer<typeof OpenAPISchema>
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>
export type Api = z.infer<typeof ApiSchema>
