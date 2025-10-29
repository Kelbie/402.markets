"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
  eventIds: Array<{ id: string; pubkey: string }> // Track event IDs with their pubkeys to identify user's reactions
}

interface ReactionPickerProps {
  reactions: Reaction[]
  onReact: (emoji: string) => void
  disabled?: boolean
}

const REACTION_EMOJIS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "👎", label: "Thumbs down" },
  { emoji: "😀", label: "Grin" },
  { emoji: "🎉", label: "Party" },
  { emoji: "😕", label: "Confused" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "👀", label: "Eyes" },
]

export function ReactionPicker({ reactions, onReact, disabled }: ReactionPickerProps) {
  const [open, setOpen] = useState(false)

  const getReactionData = (emoji: string): Reaction => {
    return reactions.find((r) => r.emoji === emoji) || { emoji, count: 0, userReacted: false, eventIds: [] }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Display only reactions that have events */}
      {REACTION_EMOJIS.map(({ emoji, label }) => {
        const reactionData = getReactionData(emoji)
        
        // Only show emojis that have reactions or that the user has reacted to
        if (reactionData.count === 0 && !reactionData.userReacted) {
          return null
        }

        return (
          <Button
            key={emoji}
            variant="outline"
            size="sm"
            onClick={() => onReact(emoji)}
            disabled={disabled}
            className={cn(
              "h-8 px-3 gap-1.5 font-mono text-sm transition-all",
              reactionData.userReacted && "bg-primary/10 border-primary hover:bg-primary/20"
            )}
            title={label}
          >
            <span className="text-base leading-none">{emoji}</span>
            <span className="text-xs">{reactionData.count}</span>
          </Button>
        )
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent" title="Add reaction">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {REACTION_EMOJIS.map(({ emoji, label }) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-xl hover:bg-accent"
                onClick={() => {
                  console.log("[v0] Emoji clicked in popover:", emoji)
                  onReact(emoji)
                  setOpen(false)
                }}
                title={label}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
