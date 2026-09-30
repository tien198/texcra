import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'

/** Loading skeleton shown before the browser editor hydrates. */
export function EditorFallback() {
  return (
    <div
      className={
        'grid min-h-[calc(100dvh-179px)] grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] max-[1023px]:grid-cols-[minmax(0,1fr)_280px] max-[699px]:flex max-[699px]:flex-col'
      }
    >
      <div className={'min-w-0'}>
        <div className="grid gap-[8px] pb-[24px] pl-[var(--admin-gutter)] pr-[40px] pt-[30px] max-[1399px]:pr-[32px] max-[699px]:pr-[var(--admin-gutter)]">
          <Label>
            Title <span className="text-destructive">*</span>
          </Label>
          <Skeleton className="h-[36px] w-full" />
        </div>
        <div
          className="flex h-[57px] w-full items-center justify-start gap-[20px] border-b border-border px-[var(--admin-gutter)]"
          aria-hidden="true"
        >
          <div className="flex h-full items-center border-b-[2px] border-primary pb-[2px] text-[16px] font-semibold">
            Content
          </div>
          <div className="flex h-full items-center pb-[2px] text-[16px] font-semibold text-muted-foreground">
            Meta
          </div>
          <div className="flex h-full items-center pb-[2px] text-[16px] font-semibold text-muted-foreground">
            SEO
          </div>
        </div>
        <div className="px-[var(--admin-gutter)] pb-[40px] pt-[22px] max-[699px]:pb-[28px]">
          <div className="mb-6 grid gap-2">
            <Label>Hero Image</Label>
            <Skeleton className="h-[200px] w-full rounded-md border-2 border-dashed bg-transparent" />
          </div>
          <Skeleton className="mt-[24px] h-[400px] w-full rounded-md" />
        </div>
      </div>
      <aside
        className={
          'flex flex-col gap-[22px] border-l border-border pb-[40px] pl-[40px] pr-[var(--admin-gutter)] pt-[30px] max-[1399px]:pl-[28px] max-[699px]:border-l-0 max-[699px]:border-t max-[699px]:px-[var(--admin-gutter)] max-[699px]:py-[24px]'
        }
      >
        <div className={'grid gap-[8px]'}>
          <Label>Published At</Label>
          <Skeleton className="h-[36px] w-full" />
        </div>
        <div className={'grid gap-[8px]'}>
          <Label>Authors</Label>
          <Skeleton className="h-[36px] w-full" />
        </div>
        <div className={'grid gap-[8px]'}>
          <Label>Slug</Label>
          <Skeleton className="h-[36px] w-full" />
        </div>
      </aside>
    </div>
  )
}
