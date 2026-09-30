import { memo } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import {
  ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown'
import type { EditorState } from 'lexical'
import type { DocumentSnapshot } from '#/lexical/core/-editor-data'
import { isLinkUrl } from '#/lexical/core/-editor-data'
import { EDITOR_NODES, EDITOR_THEME } from '#/lexical/core/-editor-config'
import { EditorToolbar } from '#/lexical/features/toolbars/fixed/client'
import { InlineToolbar } from '#/lexical/features/toolbars/inline/client'
import { SlashMenu } from '#/lexical/plugins/SlashMenu'
import { AddBlockHandlePlugin } from '#/lexical/plugins/handles/AddBlockHandlePlugin'
import { DraggableBlockPlugin } from '#/lexical/plugins/handles/DraggableBlockPlugin'
import { DocumentPlugin } from './-document-plugin'
import { EDITOR_TYPOGRAPHY } from '#/lexical/core/-editor-typography'

// Code blocks are not registered; inline code and all other supported shortcuts work.
const TRANSFORMERS = [
  ...ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
]

export const RichTextEditor = memo(function RichTextEditor({
  initialState,
  onChange,
}: {
  initialState: EditorState | null
  onChange: (snapshot: DocumentSnapshot) => void
}) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'DraftEditor',
        nodes: EDITOR_NODES,
        theme: EDITOR_THEME,
        editorState: initialState ?? undefined,
        onError: (error) => {
          throw error
        },
      }}
    >
      <EditorToolbar />
      <InlineToolbar />
      <div className="mt-[24px] border-l border-border pb-[16px] pl-[38px] pr-[18px] max-[699px]:pl-[18px] max-[699px]:pr-0 [&_[contenteditable='true']]:min-h-[290px] [&_[contenteditable='true']]:outline-offset-[8px]">
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-label="Article body"
                className={`${EDITOR_TYPOGRAPHY.content} min-h-72 break-words focus-visible:outline-ring`}
              />
            }
            placeholder={
              <p className="pointer-events-none absolute top-0 left-0 text-muted-foreground">
                Start writing your story…
              </p>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin validateUrl={isLinkUrl} />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <DocumentPlugin onChange={onChange} />
      <SlashMenu />
      <AddBlockHandlePlugin />
      <DraggableBlockPlugin />
    </LexicalComposer>
  )
})
