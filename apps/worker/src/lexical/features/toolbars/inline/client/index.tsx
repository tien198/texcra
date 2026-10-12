import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical'
import { useToolbar } from '#/lexical/-use-toolbar'
import { ToolbarButton } from '#/lexical/-toolbar-button'
import { Bold, Italic, Link, Strikethrough, Underline } from 'lucide-react'
import { LinkDialog } from '#/lexical/-link-dialog'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'

export function InlineToolbar() {
  const [editor] = useLexicalComposerContext()
  const { format } = useToolbar()
  const popupRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, show: false })
  const [dialog, setDialog] = useState<'link' | null>(null)
  const selectionRef = useRef<any>(null)

  function updatePopup() {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        setPosition((prev) => ({ ...prev, show: false }))
        return
      }

      const nativeSelection = window.getSelection()
      if (!nativeSelection || nativeSelection.rangeCount === 0) {
        setPosition((prev) => ({ ...prev, show: false }))
        return
      }

      const domRange = nativeSelection.getRangeAt(0)
      const rect = domRange.getBoundingClientRect()

      setPosition({
        top: rect.top - 50 + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
        show: true,
      })
    })
  }

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updatePopup()
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor])

  useEffect(() => {
    document.addEventListener('selectionchange', updatePopup)
    return () => document.removeEventListener('selectionchange', updatePopup)
  }, [])

  if (!position.show && !dialog) return null

  return createPortal(
    <>
      {position.show && !dialog && (
        <div
          ref={popupRef}
          className="absolute z-50 flex items-center gap-1 rounded-md border border-border bg-popover text-popover-foreground px-1 py-1 shadow-md -translate-x-1/2 [&_[data-slot=button][aria-pressed=true]]:bg-secondary [&_[data-slot=button][aria-pressed=true]]:text-secondary-foreground [&_[data-slot=button]]:size-[30px] [&_[data-slot=button]]:text-muted-foreground [&_[data-slot=button]:hover]:text-foreground"
          style={{ top: position.top, left: position.left }}
        >
          <ToolbarButton
            label="Bold"
            active={format.bold}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
          >
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={format.italic}
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
            }
          >
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={format.underline}
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
            }
          >
            <Underline size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            active={format.strikethrough}
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
            }
          >
            <Strikethrough size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Edit link"
            active={!!format.link}
            onClick={() => {
              editor.getEditorState().read(() => {
                selectionRef.current = $getSelection()?.clone() ?? null
              })
              setDialog('link')
              setPosition((prev) => ({ ...prev, show: false }))
            }}
          >
            <Link size={16} />
          </ToolbarButton>
        </div>
      )}
      {dialog === 'link' && (
        <LinkDialog
          initial={format.link}
          onClose={() => setDialog(null)}
          onSubmit={(url) => {
            editor.update(() => {
              if (selectionRef.current) {
                $setSelection(selectionRef.current.clone())
              }
              editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
            })
            setDialog(null)
          }}
        />
      )}
    </>,
    document.body,
  )
}
