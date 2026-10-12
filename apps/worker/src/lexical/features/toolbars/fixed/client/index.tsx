import { useRef, useState } from 'react'
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import type { BaseSelection } from 'lexical'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import {
  Bold,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'
import { useToolbar } from '#/lexical/-use-toolbar'
import { ToolbarButton } from '#/lexical/-toolbar-button'
import { ImageDialog } from '#/lexical/-image-dialog'
import { LinkDialog } from '#/lexical/-link-dialog'
import { $createImageNode } from '#/lexical/-image-node'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Separator } from '#/components/ui/separator'
import { CardHeader } from '#/components/ui/card'

export function EditorToolbar() {
  const { editor, format, canUndo, canRedo } = useToolbar()
  const [dialog, setDialog] = useState<'image' | 'link' | null>(null)
  const selection = useRef<BaseSelection | null>(null)

  function rememberSelection() {
    editor.getEditorState().read(() => {
      selection.current = $getSelection()?.clone() ?? null
    })
  }

  function restoreSelection() {
    if (selection.current) $setSelection(selection.current.clone())
    else $getRoot().selectEnd()
  }

  return (
    <>
      <CardHeader
        role="group"
        aria-label="Text formatting"
        className="flex min-h-[43px] flex-wrap items-center gap-1 rounded-none border border-border bg-card text-card-foreground px-[8px] py-[5px] [&_[data-slot=button][aria-pressed=true]]:bg-secondary [&_[data-slot=button][aria-pressed=true]]:text-secondary-foreground [&_[data-slot=button]]:size-[30px] [&_[data-slot=button]]:text-muted-foreground [&_[data-slot=button]:hover]:text-foreground [&_[data-slot=native-select]]:border-0 [&_[data-slot=native-select]]:bg-transparent dark:[&_[data-slot=native-select]]:bg-transparent [&_[data-slot=native-select]]:text-[13px] [&_[data-slot=native-select]]:text-foreground"
      >
        <ToolbarButton
          label="Undo"
          disabled={!canUndo}
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!canRedo}
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        >
          <Redo2 />
        </ToolbarButton>
        <div className="mx-2 h-5">
          <Separator orientation="vertical" />
        </div>
        <NativeSelect
          aria-label="Block style"
          value={
            ['paragraph', 'h2', 'h3', 'quote'].includes(format.block)
              ? format.block
              : 'paragraph'
          }
          onFocus={rememberSelection}
          onChange={(event) => {
            const value = event.target.value
            editor.update(() => {
              restoreSelection()
              if (format.block === 'bullet' || format.block === 'number')
                editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
              const current = $getSelection()
              if ($isRangeSelection(current))
                $setBlocksType(current, () =>
                  value === 'h2' || value === 'h3'
                    ? $createHeadingNode(value)
                    : value === 'quote'
                      ? $createQuoteNode()
                      : $createParagraphNode(),
                )
            })
            editor.focus()
          }}
        >
          <NativeSelectOption value="paragraph">Paragraph</NativeSelectOption>
          <NativeSelectOption value="h2">Heading 2</NativeSelectOption>
          <NativeSelectOption value="h3">Heading 3</NativeSelectOption>
          <NativeSelectOption value="quote">Quote</NativeSelectOption>
        </NativeSelect>
        <div className="mx-2 h-5">
          <Separator orientation="vertical" />
        </div>
        <ToolbarButton
          label="Bold"
          active={format.bold}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={format.italic}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={format.underline}
          onClick={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
          }
        >
          <Underline />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={format.strikethrough}
          onClick={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
          }
        >
          <Strikethrough />
        </ToolbarButton>
        <div className="mx-2 h-5">
          <Separator orientation="vertical" />
        </div>
        <ToolbarButton
          label="Bullet list"
          active={format.block === 'bullet'}
          onClick={() =>
            editor.dispatchCommand(
              format.block === 'bullet'
                ? REMOVE_LIST_COMMAND
                : INSERT_UNORDERED_LIST_COMMAND,
              undefined,
            )
          }
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={format.block === 'number'}
          onClick={() =>
            editor.dispatchCommand(
              format.block === 'number'
                ? REMOVE_LIST_COMMAND
                : INSERT_ORDERED_LIST_COMMAND,
              undefined,
            )
          }
        >
          <ListOrdered />
        </ToolbarButton>
        <div className="mx-2 h-5">
          <Separator orientation="vertical" />
        </div>
        <ToolbarButton
          label={format.link ? 'Edit link' : 'Add link (select text first)'}
          active={!!format.link}
          disabled={!format.hasSelection && !format.link}
          onClick={() => {
            rememberSelection()
            setDialog('link')
          }}
        >
          <Link />
        </ToolbarButton>
        <ToolbarButton
          label="Insert image"
          onClick={() => {
            rememberSelection()
            setDialog('image')
          }}
        >
          <ImagePlus />
        </ToolbarButton>
      </CardHeader>
      {dialog === 'image' && (
        <ImageDialog
          onClose={() => setDialog(null)}
          onSubmit={(image) => {
            editor.update(() => {
              restoreSelection()
              const node = $createImageNode(image)
              $insertNodeToNearestRoot(node)
            })
          }}
        />
      )}
      {dialog === 'link' && (
        <LinkDialog
          initial={format.link}
          onClose={() => setDialog(null)}
          onSubmit={(url) =>
            editor.update(() => {
              restoreSelection()
              editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
            })
          }
        />
      )}
    </>
  )
}
