import { Globe } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { setLocale, useLocale } from '#/lib/paraglide-message/hooks/useLocale'

export function LanguageSelect() {
  const locale = useLocale()

  return (
    <Select
      value={locale}
      onValueChange={(nextLocale) => {
        if (nextLocale !== null) {
          void setLocale(nextLocale)
        }
      }}
    >
      <SelectTrigger
        aria-label={locale === 'vi' ? 'Chọn ngôn ngữ' : 'Select language'}
        className="shrink-0 gap-[7px] rounded-[2px] border-[#ffffff2e] bg-[#ffffff08] px-[11px] py-0 font-manrope text-[11px] font-medium tracking-[1.2px] hover:bg-white/10 data-[size=default]:h-9 [&>svg]:size-3 [&>svg]:text-current"
      >
        <Globe className="size-3.5!" aria-hidden="true" />
        <SelectValue>{locale.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent
        align="end"
        alignItemWithTrigger={false}
        sideOffset={8}
        className="min-w-36 rounded-[2px] bg-[#061828] p-1 font-manrope text-[#f7f7f5] ring-white/20"
      >
        <SelectItem
          value="en"
          className="rounded-[2px] px-3 py-2 pr-8 text-xs data-highlighted:bg-white/10 data-highlighted:text-white"
        >
          <span lang="en">English</span>
        </SelectItem>
        <SelectItem
          value="vi"
          className="rounded-[2px] px-3 py-2 pr-8 text-xs data-highlighted:bg-white/10 data-highlighted:text-white"
        >
          <span lang="vi">Tiếng Việt</span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
