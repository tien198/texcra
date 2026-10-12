import {
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  MoreVertical,
} from 'lucide-react'
import { Button } from '#/components/ui/button'

export function EditorActions({
  hasSnapshot,
  preview,
  onTogglePreview,
}: {
  hasSnapshot: boolean
  preview: boolean
  onTogglePreview: () => void
}) {
  return (
    <div
      className={
        'flex items-center gap-[10px] max-[699px]:w-full max-[699px]:justify-end [&_button]:h-[34px]'
      }
    >
      <Button
        variant="outline"
        size="icon"
        className={`w-[34px] px-0 bg-transparent hover:text-foreground ${
          preview ? 'text-foreground bg-accent' : 'text-muted-foreground'
        }`}
        disabled={!hasSnapshot}
        onClick={onTogglePreview}
      >
        {preview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="w-[34px] px-0 bg-transparent text-muted-foreground hover:text-foreground"
      >
        <ExternalLink className="size-4" />
      </Button>

      <Button
        variant="outline"
        className="px-[16px] bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-50"
        disabled
      >
        Save Draft
      </Button>

      <div className="flex items-center">
        <Button className="px-[16px] rounded-r-none font-medium">
          Publish changes
        </Button>
        <div className="w-[1px] h-[34px] bg-background/20 z-10" />
        <Button size="icon" className="w-[34px] px-0 rounded-l-none">
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="w-[34px] px-0 bg-transparent text-muted-foreground hover:text-foreground"
      >
        <MoreVertical className="size-4" />
      </Button>
    </div>
  )
}
