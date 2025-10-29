import { cn } from "@/lib/utils"

export interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
  eventIds: Array<{ id: string; pubkey: string }>
}

interface ReactionDisplayProps {
  reactions: Reaction[]
  compact?: boolean
}

const REACTION_EMOJIS = ["👍", "👎", "😀", "🎉", "😕", "❤️", "🚀", "👀"]

export function ReactionDisplay({ reactions, compact = false }: ReactionDisplayProps) {
  const getReactionData = (emoji: string): Reaction => {
    return reactions.find((r) => r.emoji === emoji) || { emoji, count: 0, userReacted: false, eventIds: [] }
  }

  const visibleReactions = REACTION_EMOJIS.map((emoji) => getReactionData(emoji)).filter((r) => r.count > 0)

  if (visibleReactions.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visibleReactions.map(({ emoji, count }) => (
        <div
          key={emoji}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-background/50",
            compact ? "text-xs" : "text-sm",
          )}
        >
          <span className={compact ? "text-sm" : "text-base"}>{emoji}</span>
          <span className="text-xs text-muted-foreground font-mono">{count}</span>
        </div>
      ))}
    </div>
  )
}
