import { useState, useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'

const PRESETS = [
  { label: 'Responsive', width: '100%', height: '100%' },
  { label: 'Mobile', width: 375, height: 667 },
  { label: 'Tablet', width: 768, height: 1024 },
  { label: 'Desktop', width: 1440, height: 900 },
]

export function DocumentPreview({
  html,
  onWidthChange,
}: {
  html: string
  onWidthChange?: (width: number | string) => void
}) {
  const [preset, setPreset] = useState('Responsive')
  const [width, setWidth] = useState<number | string>('100%')
  const [height, setHeight] = useState<number | string>('100%')
  const [zoom, setZoom] = useState(100)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = e.target.value
    setPreset(p)
    const selected = PRESETS.find((x) => x.label === p)
    if (selected) {
      setWidth(selected.width)
      setHeight(selected.height)
      onWidthChange?.(selected.width)
    }
  }

  const handleOpenNewTab = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const isPercentHeight = typeof height === 'string' && height.includes('%')

  return (
    <div className="flex flex-col gap-4 sticky top-4 h-[calc(100dvh-179px)]">
      <div className="flex flex-col flex-1 border border-border rounded-md overflow-hidden bg-card text-card-foreground shadow-xs">
        {/* Toolbar */}
        <div className="flex items-center justify-center gap-4 bg-muted/20 text-foreground p-2 text-xs border-b border-border">
          <NativeSelect
            value={preset}
            onChange={handlePresetChange}
            size="sm"
            className="bg-transparent border-none text-foreground [&>select]:text-foreground [&>select]:focus-visible:ring-0 [&>svg]:text-muted-foreground"
          >
            {PRESETS.map((p) => (
              <NativeSelectOption key={p.label} value={p.label}>
                {p.label}
              </NativeSelectOption>
            ))}
            <NativeSelectOption value="Custom">Custom</NativeSelectOption>
          </NativeSelect>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={width}
              onChange={(e) => {
                setWidth(e.target.value)
                setPreset('Custom')
                onWidthChange?.(e.target.value)
              }}
              className="w-16 h-7 bg-background border-input text-foreground px-1 text-center font-mono text-[11px]"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="text"
              value={height}
              onChange={(e) => {
                setHeight(e.target.value)
                setPreset('Custom')
              }}
              className="w-16 h-7 bg-background border-input text-foreground px-1 text-center font-mono text-[11px]"
            />
          </div>

          <NativeSelect
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            size="sm"
            className="bg-transparent border-none text-foreground [&>select]:text-foreground [&>select]:focus-visible:ring-0 [&>svg]:text-muted-foreground"
          >
            <NativeSelectOption value={50}>50%</NativeSelectOption>
            <NativeSelectOption value={75}>75%</NativeSelectOption>
            <NativeSelectOption value={100}>100%</NativeSelectOption>
            <NativeSelectOption value={125}>125%</NativeSelectOption>
            <NativeSelectOption value={150}>150%</NativeSelectOption>
          </NativeSelect>

          <button
            type="button"
            onClick={handleOpenNewTab}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="size-4" />
          </button>
        </div>

        {/* Preview Area */}
        <div
          ref={containerRef}
          className="flex-1 w-full bg-muted/20 overflow-auto relative flex items-start justify-center"
        >
          <div
            className="bg-background shadow-xs transition-all duration-200 origin-top flex-shrink-0"
            style={{
              width: '100%',
              minHeight: isPercentHeight ? height : `${height}px`,
              height: isPercentHeight ? height : `${height}px`,
              transform: `scale(${zoom / 100})`,
              marginBottom: `${Math.max(0, (zoom / 100 - 1) * 100)}%`, // Prevent scroll clipping when scaled up
            }}
          >
            <iframe
              title="Article preview"
              sandbox=""
              srcDoc={html}
              className="w-full h-full border-none bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
