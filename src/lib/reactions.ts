import { NDKEvent } from "@nostr-dev-kit/ndk"

export interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
  eventIds: Array<{ id: string; pubkey: string }>
}

export function processReactions(events: NDKEvent[], userPubkey?: string): Map<string, Reaction> {
  const reactions = new Map<string, Reaction>()

  for (const event of events) {
    const emoji = event.content || "+"
    const eventId = event.tags.find((tag) => tag[0] === "e")?.[1]
    
    if (!eventId) continue

    if (!reactions.has(emoji)) {
      reactions.set(emoji, {
        emoji,
        count: 0,
        userReacted: false,
        eventIds: []
      })
    }

    const reaction = reactions.get(emoji)!
    reaction.count++
    reaction.eventIds.push({ id: event.id, pubkey: event.pubkey })
    
    if (userPubkey && event.pubkey === userPubkey) {
      reaction.userReacted = true
    }
  }

  return reactions
}
