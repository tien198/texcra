import type React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { $getNodeByKey } from 'lexical'
import type { LexicalEditor } from 'lexical'
import { $isBlockNode } from '#/lexical/-block-node'

/**
 * Hook that manages a single field of a block node.
 * Integrates directly with Lexical's HistoryPlugin for robust undo/redo.
 */
export function useBlockField(
  editor: LexicalEditor,
  nodeKey: string,
  fieldName: string,
  initialValue: string,
) {
  const [value, setValue] = useState(initialValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef(initialValue)

  // Sync with initialValue prop when it changes (e.g. document load/switch)
  useEffect(() => {
    setValue(initialValue)
    latestValueRef.current = initialValue
  }, [initialValue])

  // Synchronously commit pending value to Lexical
  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      const valueToSave = latestValueRef.current
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isBlockNode(node)) {
          node.setBlockData({ [fieldName]: valueToSave })
        }
      })
    }
  }, [editor, nodeKey, fieldName])

  // Listen for undo/redo (historic tag) from Lexical HistoryPlugin
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, tags }) => {
      if (tags.has('historic')) {
        // Cancel any pending uncommitted debounced save
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
        editorState.read(() => {
          const node = $getNodeByKey(nodeKey)
          if ($isBlockNode(node)) {
            const rawValue = node.__blockData[fieldName] as unknown
            const nodeValue = typeof rawValue === 'string' ? rawValue : ''
            setValue(nodeValue)
            latestValueRef.current = nodeValue
          }
        })
      }
    })
  }, [editor, nodeKey, fieldName])

  // Flush pending changes when unmounting
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        const valueToSave = latestValueRef.current
        editor.update(() => {
          const node = $getNodeByKey(nodeKey)
          if ($isBlockNode(node)) {
            node.setBlockData({ [fieldName]: valueToSave })
          }
        })
      }
    }
  }, [editor, nodeKey, fieldName])

  const onChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const newValue = e.target.value
      setValue(newValue)
      latestValueRef.current = newValue

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null
        editor.update(() => {
          const node = $getNodeByKey(nodeKey)
          if ($isBlockNode(node)) {
            node.setBlockData({ [fieldName]: newValue })
          }
        })
      }, 300)
    },
    [editor, nodeKey, fieldName],
  )

  const onKeyDown = useCallback(
    (
      e: React.KeyboardEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'z' || e.key === 'y' || e.key === 'Z')
      ) {
        // Flush pending changes before Lexical processes undo/redo shortcut
        flush()
      }
    },
    [flush],
  )

  return { value, onChange, onBlur: flush, onKeyDown }
}
