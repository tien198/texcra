import { Feather } from 'lucide-react'

export function Breadcrumb() {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-[12px] text-muted-foreground [&>span:last-child]:text-foreground [&>span:last-child]:font-medium"
    >
      <a
        href="/"
        aria-label="Draft home"
        className="flex items-center gap-[8px] font-sans text-[20px] font-semibold leading-[28px] tracking-[-0.025em] text-foreground"
      >
        <Feather
          className="size-[20px] shrink-0 text-primary"
          aria-hidden="true"
        />
        <span>
          draft<span className="text-primary">.</span>
        </span>
      </a>
      <span>/</span>
      <span>Posts</span>
      <span>/</span>
      <span>5</span>
    </nav>
  )
}
