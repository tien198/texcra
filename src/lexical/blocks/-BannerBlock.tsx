import { useState, useEffect, useRef } from 'react'
import { $getNodeByKey } from 'lexical'
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  X,
} from 'lucide-react'
import { cn } from '#/lib/utils'
import { $isBlockNode } from '#/lexical/-block-node'
import { useBlockField } from './-use-block-field'
import type { BlockComponentProps } from './-registry'

export type BannerStyle = 'info' | 'warning' | 'success' | 'destructive' | 'tip'

interface BannerStyleConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  containerClass: string
  accentBorderClass: string
  iconBadgeClass: string
  iconClass: string
  selectClass: string
}

const BANNER_STYLES: Record<BannerStyle, BannerStyleConfig> = {
  info: {
    label: 'Info',
    icon: Info,
    containerClass:
      'bg-sky-500/10 border-sky-500/25 text-sky-950 dark:bg-sky-500/15 dark:border-sky-500/30 dark:text-sky-100',
    accentBorderClass: 'border-l-sky-500 dark:border-l-sky-400',
    iconBadgeClass:
      'bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-300',
    iconClass: 'text-sky-600 dark:text-sky-400',
    selectClass:
      'text-sky-700 hover:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    containerClass:
      'bg-amber-500/10 border-amber-500/25 text-amber-950 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-100',
    accentBorderClass: 'border-l-amber-500 dark:border-l-amber-400',
    iconBadgeClass:
      'bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-400',
    selectClass:
      'text-amber-800 hover:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25',
  },
  success: {
    label: 'Success',
    icon: CheckCircle2,
    containerClass:
      'bg-emerald-500/10 border-emerald-500/25 text-emerald-950 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-100',
    accentBorderClass: 'border-l-emerald-500 dark:border-l-emerald-400',
    iconBadgeClass:
      'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    selectClass:
      'text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25',
  },
  destructive: {
    label: 'Critical',
    icon: AlertCircle,
    containerClass:
      'bg-rose-500/10 border-rose-500/25 text-rose-950 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-100',
    accentBorderClass: 'border-l-rose-500 dark:border-l-rose-400',
    iconBadgeClass:
      'bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-300',
    iconClass: 'text-rose-600 dark:text-rose-400',
    selectClass:
      'text-rose-800 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25',
  },
  tip: {
    label: 'Tip',
    icon: Lightbulb,
    containerClass:
      'bg-violet-500/10 border-violet-500/25 text-violet-950 dark:bg-violet-500/15 dark:border-violet-500/30 dark:text-violet-100',
    accentBorderClass: 'border-l-violet-500 dark:border-l-violet-400',
    iconBadgeClass:
      'bg-violet-500/15 text-violet-600 dark:bg-violet-500/25 dark:text-violet-300',
    iconClass: 'text-violet-600 dark:text-violet-400',
    selectClass:
      'text-violet-800 hover:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25',
  },
}

function normalizeStyle(style?: string): BannerStyle {
  if (!style) return 'info'
  if (style in BANNER_STYLES) return style as BannerStyle
  if (style === 'danger' || style === 'error') return 'destructive'
  if (style === 'note') return 'tip'
  return 'info'
}

export function BannerBlock({ data, nodeKey, editor }: BlockComponentProps) {
  const currentStyleKey = normalizeStyle(data.style)
  const [style, setStyle] = useState<BannerStyle>(currentStyleKey)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setStyle(normalizeStyle(data.style))
  }, [data.style])

  const title = useBlockField(editor, nodeKey, 'title', data.title || '')
  const description = useBlockField(
    editor,
    nodeKey,
    'description',
    data.description || '',
  )

  const config = BANNER_STYLES[style]
  const IconComponent = config.icon

  const handleStyleChange = (newStyle: BannerStyle) => {
    setStyle(newStyle)
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isBlockNode(node)) {
        node.setBlockData({ style: newStyle })
      }
    })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (node) {
        node.remove()
      }
    })
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    title.onKeyDown(e)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      descriptionRef.current?.focus()
    }
  }

  return (
    <div
      className={cn(
        'group/banner relative flex items-start gap-3.5 rounded-xl border border-l-4 p-4 shadow-xs transition-all duration-200',
        config.containerClass,
        config.accentBorderClass,
      )}
    >
      {/* Icon Badge */}
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg shadow-2xs transition-transform duration-200 group-hover/banner:scale-105',
          config.iconBadgeClass,
        )}
      >
        <IconComponent className={cn('size-4.5 shrink-0', config.iconClass)} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        {/* Top Header Row: Title input + Controls */}
        <div className="flex items-center justify-between gap-3">
          <input
            className="w-full bg-transparent text-sm font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60 focus:placeholder:text-muted-foreground/40 transition-colors"
            placeholder="Banner title..."
            {...title}
            onKeyDown={handleTitleKeyDown}
          />

          {/* Actions: Style Switcher + Delete */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Native styled dropdown pill */}
            <div className="relative inline-flex items-center">
              <select
                value={style}
                onChange={(e) =>
                  handleStyleChange(e.target.value as BannerStyle)
                }
                className={cn(
                  'h-6 cursor-pointer appearance-none rounded-md border border-current/20 bg-background/60 backdrop-blur-xs py-0 pl-2 pr-5 text-[11px] font-medium tracking-wide outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring dark:bg-background/40',
                  config.selectClass,
                )}
                aria-label="Select banner style"
                title="Change banner style"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="destructive">Critical</option>
                <option value="tip">Tip</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 size-3 opacity-60" />
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all hover:bg-black/5 hover:text-foreground group-hover/banner:opacity-100 focus-visible:opacity-100 dark:hover:bg-white/10"
              aria-label="Delete banner"
              title="Delete banner"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Description textarea */}
        <textarea
          ref={descriptionRef}
          rows={1}
          className="w-full resize-none field-sizing-content bg-transparent text-sm leading-relaxed text-foreground/85 outline-none placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/30 transition-colors"
          placeholder="Write a clear description or additional details..."
          {...description}
        />
      </div>
    </div>
  )
}
