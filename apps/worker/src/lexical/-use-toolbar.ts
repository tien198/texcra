import { useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from 'lexical'
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text'
import { $isListNode } from '@lexical/list'
import { $isLinkNode } from '@lexical/link'

const EMPTY_FORMAT = {
  block: 'paragraph',
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  link: '',
  hasSelection: false,
}

export function useToolbar() {
  const [editor] = useLexicalComposerContext()
  const [format, setFormat] = useState(EMPTY_FORMAT)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    const update = () => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const anchor = selection.anchor.getNode()
      const element = anchor.getTopLevelElement()
      const list = $findMatchingParent(anchor, $isListNode)
      const link = $findMatchingParent(anchor, $isLinkNode)
      const next = {
        block: $isListNode(list)
          ? list.getListType()
          : $isHeadingNode(element)
            ? element.getTag()
            : $isQuoteNode(element)
              ? 'quote'
              : 'paragraph',
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline'),
        strikethrough: selection.hasFormat('strikethrough'),
        link: $isLinkNode(link) ? link.getURL() : '',
        hasSelection: !selection.isCollapsed(),
      }
      setFormat((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      )
    }
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) =>
        editorState.read(update),
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          update()
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (value) => {
          setCanUndo(value)
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (value) => {
          setCanRedo(value)
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return { editor, format, canUndo, canRedo }
}
