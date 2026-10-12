import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Plus } from 'lucide-react'
import { $getNearestNodeFromDOMNode, $createParagraphNode } from 'lexical'

export function AddBlockHandlePlugin() {
  const [editor] = useLexicalComposerContext()
  const [position, setPosition] = useState({ top: 0, left: 0, show: false })
  const blockRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const rootElement = editor.getRootElement()
      if (!rootElement) return

      const rect = rootElement.getBoundingClientRect()

      if (
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom &&
        e.clientX >= rect.left - 60 &&
        e.clientX <= rect.right
      ) {
        let closestNode: HTMLElement | null = null
        let minDistance = Infinity

        for (const _child of Array.from(rootElement.children)) {
          const child = _child as HTMLElement
          const childRect = child.getBoundingClientRect()
          if (
            e.clientY >= childRect.top - 5 &&
            e.clientY <= childRect.bottom + 5
          ) {
            closestNode = child
            break
          }
          const distance = Math.min(
            Math.abs(e.clientY - childRect.top),
            Math.abs(e.clientY - childRect.bottom),
          )
          if (distance < minDistance) {
            minDistance = distance
            closestNode = child
          }
        }

        if (
          closestNode &&
          (closestNode.tagName === 'P' ||
            closestNode.tagName.match(/^H[1-6]$/) ||
            closestNode.tagName === 'BLOCKQUOTE' ||
            closestNode.tagName === 'UL' ||
            closestNode.tagName === 'OL' ||
            closestNode.classList.contains('custom-block-wrapper'))
        ) {
          const nodeRect = closestNode.getBoundingClientRect()
          setPosition({
            top: nodeRect.top + window.scrollY,
            left: rect.left + window.scrollX - 44, // Offset to the left
            show: true,
          })
          blockRef.current = closestNode
          return
        }
      }

      const handleEl = document.getElementById('add-block-handle')
      if (handleEl && handleEl.contains(e.target as Node)) return

      setPosition((prev) => ({ ...prev, show: false }))
    }

    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [editor])

  const handleAddClick = () => {
    editor.update(() => {
      if (blockRef.current) {
        const node = $getNearestNodeFromDOMNode(blockRef.current)
        if (node) {
          const newParagraph = $createParagraphNode()
          node.insertAfter(newParagraph)
          newParagraph.select()
        }
      }
    })
  }

  return createPortal(
    <div
      id="add-block-handle"
      className={`absolute z-50 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity ${position.show ? '' : 'hidden'}`}
      style={{ top: position.top, left: position.left, height: '24px' }}
    >
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Add block"
        onClick={handleAddClick}
      >
        <Plus size={16} />
      </button>
    </div>,
    document.body,
  )
}
