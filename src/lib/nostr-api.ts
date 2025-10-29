import { NDKEvent, NDKNip07Signer } from "@nostr-dev-kit/ndk"
import { ndk } from "./nostr"
import type { Api } from "./types"
import { ApiSchema, OpenAPISchema, type OpenAPISpec } from "./schemas"

// Kind for API marketplace data (parameterized replaceable event)
export const API_KIND = 30078
export const APP_TAG = "402.markets"

export async function publishApi(
  apiData: OpenAPISpec | Omit<Api, "supportedMints" | "supportedPaymentMethods">,
  dTag?: string,
): Promise<void> {
  try {
    // Validate as OpenAPI spec
    const openapiResult = OpenAPISchema.safeParse(apiData)
    let contentToPublish: string

    if (openapiResult.success) {
      console.log("[v0] Publishing OpenAPI spec")
      contentToPublish = JSON.stringify(apiData)
    } else {
      // Fallback to old format validation
      const validationResult = ApiSchema.safeParse(apiData)
      if (!validationResult.success) {
        throw new Error(
          `Invalid API data: ${validationResult.error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        )
      }
      console.log("[v0] Publishing API in legacy format")
      contentToPublish = JSON.stringify(apiData)
    }

    await ndk.connect()

    if (!ndk.signer) {
      console.log("[v0] No signer found, creating NIP-07 signer from extension")

      if (typeof window === "undefined" || !(window as any).nostr) {
        throw new Error("Nostr extension not found. Please install a Nostr extension like Alby or nos2x.")
      }

      const nip07signer = new NDKNip07Signer()
      ndk.signer = nip07signer
      console.log("[v0] NIP-07 signer created and set")
    }

    console.log("[v0] Publishing API with signer:", !!ndk.signer)

    const event = new NDKEvent(ndk)
    event.kind = API_KIND
    event.content = contentToPublish

    const dTagValue = dTag || crypto.randomUUID()

    event.tags = [
      ["d", dTagValue],
      ["t", APP_TAG],
    ]

    console.log("[v0] Event created, attempting to publish:", {
      kind: event.kind,
      dTag: dTagValue,
      appTag: APP_TAG,
      hasSigner: !!ndk.signer,
    })

    await event.publish()
    console.log("[v0] Successfully published API")
  } catch (error) {
    console.error("[v0] Error publishing API:", error)
    throw error
  }
}
