import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { RelationshipField } from '../-relationship-field'
import { slugify } from '../../../../../../../lexical/core/-editor-data'

export function PostMetadata({ title }: { title: string }) {
  return (
    <>
      <div className={'grid gap-[8px]'}>
        <Label htmlFor="published-at">Published At</Label>
        <Input id="published-at" type="datetime-local" />
      </div>
      <RelationshipField label="Authors" />
      <div className={'grid gap-[8px]'}>
        <Label htmlFor="post-slug">Slug</Label>
        <div
          className={
            'relative [&_[data-slot=input]]:bg-muted/10 [&_[data-slot=input]]:text-foreground/80 dark:[&_[data-slot=input]]:bg-input/20 dark:[&_[data-slot=input]]:text-foreground/80 [&_[data-slot=input]]:pr-[52px] [&_[data-slot=input]]:text-ellipsis'
          }
        >
          <Input id="post-slug" value={slugify(title)} readOnly />
          <button
            type="button"
            className={
              'absolute right-[12px] top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground hover:cursor-pointer hover:text-primary transition-colors'
            }
            onClick={() => {}}
          >
            Auto
          </button>
        </div>
      </div>
    </>
  )
}
