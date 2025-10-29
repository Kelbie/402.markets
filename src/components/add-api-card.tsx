import { Card, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"

interface AddApiCardProps {
  onClick: () => void
}

export function AddApiCard({ onClick }: AddApiCardProps) {
  return (
    <Card 
      className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <Plus className="h-8 w-8 text-muted-foreground mb-2" />
        <h3 className="font-mono font-semibold mb-1">Add New API</h3>
        <p className="text-sm text-muted-foreground">Publish your API to the marketplace</p>
      </CardContent>
    </Card>
  )
}
