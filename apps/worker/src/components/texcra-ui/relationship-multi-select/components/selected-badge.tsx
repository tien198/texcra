'use client'

import { SquarePen, X } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { SelectedBadgeProps } from '../types'

export function SelectedBadge({
  item,
  disabled = false,
  className,
  onStartEdit,
  onRemove,
}: SelectedBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground select-none shrink-0',
        className,
      )}
    >
      <span className="truncate max-w-[180px]">{item.label}</span>
      <div className="flex items-center gap-0.5 text-secondary-foreground/70 ml-0.5">
        <button
          type="button"
          aria-label={`Edit ${item.label}`}
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit(item)
          }}
          className="p-0.5 rounded hover:text-secondary-foreground hover:bg-secondary-foreground/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          title="Edit"
        >
          <SquarePen className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label={`Remove ${item.label}`}
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(item, e)
          }}
          className="p-0.5 rounded hover:text-secondary-foreground hover:bg-secondary-foreground/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          title="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
