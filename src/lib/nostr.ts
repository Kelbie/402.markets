import NDK, { NDKNip07Signer, type NDKUser } from "@nostr-dev-kit/ndk"

export const RELAYS = ["wss://relay.damus.io", "wss://relay.primal.net"]

export const ndk = new NDK({
  explicitRelayUrls: RELAYS,
})

export async function checkNip07Extension(): Promise<boolean> {
  if (typeof window === "undefined") return false
  return !!(window as any).nostr
}

export async function loginWithExtension(): Promise<{ pubkey: string; npub: string; user: NDKUser } | null> {
  try {
    if (!(await checkNip07Extension())) {
      throw new Error("No Nostr extension found. Please install a Nostr extension like Alby or nos2x.")
    }

    const nip07signer = new NDKNip07Signer()

    ndk.connect()
    ndk.signer = nip07signer

    const pubkey = await (window as any).nostr.getPublicKey()
    if (!pubkey) {
      throw new Error("Failed to get public key from extension")
    }

    const user = ndk.getUser({ pubkey })
    await user.fetchProfile()

    return {
      pubkey,
      npub: user.npub,
      user,
    }
  } catch (error) {
    console.error("Error logging in with Nostr extension:", error)
    throw error
  }
}

export async function getCurrentUserPubkey(): Promise<string | null> {
  try {
    if (!(await checkNip07Extension())) return null

    const pubkey = await (window as any).nostr.getPublicKey()
    return pubkey || null
  } catch (error) {
    console.error("Error getting current user pubkey:", error)
    return null
  }
}

export async function deleteApi(eventData: { pubkey: string; dTag: string }): Promise<boolean> {
  try {
    if (!(await checkNip07Extension())) {
      throw new Error("No Nostr extension found")
    }

    const currentUserPubkey = await getCurrentUserPubkey()
    if (!currentUserPubkey || currentUserPubkey !== eventData.pubkey) {
      throw new Error("You can only delete your own APIs")
    }

    // Create kind 30078 event with "Deprecated" content to invalidate the API
    const event = {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["d", eventData.dTag],
        ["t", "402.markets"],
      ],
      content: "Deprecated",
    }

    // Sign and publish the event
    const signedEvent = await (window as any).nostr.signEvent(event)

    await ndk.connect()
    const ndkEvent = new (await import("@nostr-dev-kit/ndk")).NDKEvent(ndk, signedEvent)
    await ndkEvent.publish()

    console.log("[v0] Published deprecation event for API:", eventData.dTag)
    return true
  } catch (error) {
    console.error("[v0] Error deprecating API:", error)
    throw error
  }
}
