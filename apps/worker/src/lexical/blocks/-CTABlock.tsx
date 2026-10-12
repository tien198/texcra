import { useBlockField } from './-use-block-field'
import type { BlockComponentProps } from './-registry'

export function CTABlock({ data, nodeKey, editor }: BlockComponentProps) {
  const title = useBlockField(editor, nodeKey, 'title', data.title || '')
  const buttonText = useBlockField(
    editor,
    nodeKey,
    'buttonText',
    data.buttonText || '',
  )

  return (
    <div className="p-6 rounded-lg border bg-muted flex flex-col items-center justify-center text-center gap-4">
      <input
        className="font-bold text-lg bg-transparent border-none outline-none w-full text-center placeholder:text-muted-foreground"
        placeholder="Call to Action"
        {...title}
      />
      <span className="px-4 py-2 bg-primary text-primary-foreground rounded-md inline-flex">
        <input
          className="bg-transparent border-none outline-none text-center text-primary-foreground placeholder:text-primary-foreground/50 w-24"
          placeholder="Click Here"
          {...buttonText}
        />
      </span>
    </div>
  )
}
