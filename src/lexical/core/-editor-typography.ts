// Preserve the document's original typography in the editor and server fallback.
export const EDITOR_TYPOGRAPHY = {
  title:
    'font-editor-serif text-[length:clamp(2rem,3.5vw,2.65rem)] font-normal leading-[1.18] tracking-[-0.045em]',
  content: 'text-[0.9375rem] leading-[1.9] text-foreground',
  paragraph: '[&:not(:first-child)]:mt-6',
  heading: {
    h1: 'mt-6 text-[1.35rem] font-semibold leading-[1.4] tracking-[-0.025em] first:mt-0',
    h2: 'mt-6 text-[1.35rem] font-semibold leading-[1.4] tracking-[-0.025em] first:mt-0',
    h3: 'mt-6 text-[1.1rem] font-semibold leading-[1.5]',
    h4: 'mt-6 text-[1.1rem] font-semibold leading-[1.5]',
    h5: 'mt-6 text-[1.1rem] font-semibold leading-[1.5]',
    h6: 'mt-6 text-[1.1rem] font-semibold leading-[1.5]',
  },
  quote:
    'mt-6 border-l-2 border-primary pl-6 font-editor-serif text-[1.1rem] text-muted-foreground italic',
  link: 'text-primary underline underline-offset-[3px]',
  list: {
    ul: 'my-6 ml-6 list-disc [&>li]:mt-2',
    ol: 'my-6 ml-6 list-decimal [&>li]:mt-2',
    nested: { listitem: 'list-none' },
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: '[text-decoration-line:underline_line-through]',
    code: 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-[monospace] text-[0.875em]',
  },
}
