"use client"

import { useState, useCallback, useMemo } from "react"
import { NDKEvent } from "@nostr-dev-kit/ndk"
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import { ndk } from "./nostr"

export interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
  eventIds: Array<{ id: string; pubkey: string }>
}

interface UseReactionsOptions {
  eventId: string | null
  authorPubkey: string | null
  userPubkey?: string
  enabled?: boolean
}

export function useReactions({ eventId, authorPubkey, userPubkey, enabled = true }: UseReactionsOptions) {
  const [optimisticReactions, setOptimisticReactions] = useState<Map<string, NDKEvent>>(new Map())

  // Subscribe to reactions from the network using useSubscribe
  const { events: networkReactions, eose } = useSubscribe(
    eventId && enabled ? [{ kinds: [7], "#e": [eventId] }] : false,
    { bufferMs: 100 }
  )

  // Merge network and optimistic reactions, deduplicating by event ID
  const allReactions = useMemo(() => {
    const reactionMap = new Map<string, NDKEvent>()

    // Add all network reactions
    for (const event of networkReactions) {
      reactionMap.set(event.id, event)
    }

    // Add optimistic reactions that haven't been confirmed yet
    for (const [id, event] of optimisticReactions) {
      if (!reactionMap.has(id)) {
        reactionMap.set(id, event)
      }
    }

    return Array.from(reactionMap.values())
  }, [networkReactions, optimisticReactions])

  // Group reactions by emoji and calculate counts
  const reactions: Reaction[] = useMemo(() => {
    const emojiMap = new Map<
      string,
      { count: number; userReacted: boolean; eventIds: Array<{ id: string; pubkey: string }> }
    >()

    for (const event of allReactions) {
      const emoji = event.content || "❤️"
      const existing = emojiMap.get(emoji) || { count: 0, userReacted: false, eventIds: [] }

      emojiMap.set(emoji, {
        count: existing.count + 1,
        userReacted: existing.userReacted || (userPubkey ? event.pubkey === userPubkey : false),
        eventIds: [...existing.eventIds, { id: event.id, pubkey: event.pubkey }],
      })
    }

    return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
      emoji,
      ...data,
    }))
  }, [allReactions, userPubkey])

  // Add a reaction with optimistic update
  const addReaction = useCallback(
    async (emoji: string) => {
      if (!eventId || !authorPubkey) {
        throw new Error("Cannot add reaction: missing eventId or authorPubkey")
      }

      let reactionEventId: string | undefined

      try {
        await ndk.connect()

        if (!ndk.signer) {
          if (typeof window === "undefined" || !(window as any).nostr) {
            throw new Error("Nostr extension not found. Please install a Nostr extension like Alby or nos2x.")
          }

          const { NDKNip07Signer } = await import("@nostr-dev-kit/ndk")
          const nip07signer = new NDKNip07Signer()
          ndk.signer = nip07signer
        }

        // Create the reaction event
        const event = new NDKEvent(ndk)
        event.kind = 7
        event.content = emoji
        event.tags = [
          ["e", eventId],
          ["p", authorPubkey],
          ["k", "30078"],
        ]

        // Sign the event (this generates the event ID)
        await event.sign()
        reactionEventId = event.id

        // Add to optimistic state immediately
        setOptimisticReactions((prev) => {
          const next = new Map(prev)
          next.set(reactionEventId!, event)
          return next
        })

        // Publish the reaction
        await event.publish()

        // Remove from optimistic state after successful publish
        setOptimisticReactions((prev) => {
          const next = new Map(prev)
          next.delete(reactionEventId!)
          return next
        })

        return event
      } catch (error) {
        // Remove from optimistic state if publish failed
        if (reactionEventId) {
          setOptimisticReactions((prev) => {
            const next = new Map(prev)
            next.delete(reactionEventId!)
            return next
          })
        }
        throw error
      }
    },
    [eventId, authorPubkey],
  )

  return {
    reactions,
    addReaction,
    isLoading: !eose,
    eose,
  }
}
