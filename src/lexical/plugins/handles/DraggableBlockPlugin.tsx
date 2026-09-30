import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { GripVertical } from 'lucide-react'
import { $getNearestNodeFromDOMNode } from 'lexical'

const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block'

export function DraggableBlockPlugin() {
  const [editor] = useLexicalComposerContext()
  const [position, setPosition] = useState({ top: 0, left: 0, show: false })
  const blockRef = useRef<HTMLElement | null>(null)
  const isDraggingRef = useRef(false)
  const targetLineRef = useRef<HTMLDivElement>(null)
  const dropTargetRef = useRef<{ elem: HTMLElement; isBelow: boolean } | null>(
    null,
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) return

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
            left: rect.left + window.scrollX - 20, // offset slightly less since it's the right-most element now
            show: true,
          })
          blockRef.current = closestNode
          return
        }
      }

      const handleEl = document.getElementById('draggable-block-handle')
      if (handleEl && handleEl.contains(e.target as Node)) return

      setPosition((prev) => ({ ...prev, show: false }))
    }

    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [editor])

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!isDraggingRef.current) return false
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move'
      }

      const rootElement = editor.getRootElement()
      if (!rootElement) return false

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

      if (closestNode && targetLineRef.current) {
        const childRect = closestNode.getBoundingClientRect()
        const isBelow = e.clientY >= childRect.top + childRect.height / 2
        dropTargetRef.current = { elem: closestNode, isBelow }

        targetLineRef.current.style.opacity = '1'
        targetLineRef.current.style.top = `${(isBelow ? childRect.bottom : childRect.top) + window.scrollY}px`
        targetLineRef.current.style.left = `${childRect.left + window.scrollX}px`
        targetLineRef.current.style.width = `${childRect.width}px`
      }

      return true
    }

    const onDrop = (e: DragEvent) => {
      if (!isDraggingRef.current) return false
      e.preventDefault()

      const dragData = e.dataTransfer?.getData(DRAG_DATA_FORMAT)
      if (!dragData) return false

      editor.update(() => {
        const draggedNode = $getNearestNodeFromDOMNode(blockRef.current!)
        if (!draggedNode) return

        if (dropTargetRef.current) {
          const targetNode = $getNearestNodeFromDOMNode(
            dropTargetRef.current.elem,
          )
          if (targetNode && targetNode !== draggedNode) {
            if (dropTargetRef.current.isBelow) {
              targetNode.insertAfter(draggedNode)
            } else {
              targetNode.insertBefore(draggedNode)
            }
          }
        }
      })

      isDraggingRef.current = false
      if (targetLineRef.current) {
        targetLineRef.current.style.opacity = '0'
      }
      setPosition((prev) => ({ ...prev, show: false }))
      return true
    }

    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [editor])

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!blockRef.current) return
    let nodeKey = ''
    editor.update(() => {
      if (blockRef.current) {
        const node = $getNearestNodeFromDOMNode(blockRef.current)
        if (node) {
          nodeKey = node.getKey()
        }
      }
    })
    isDraggingRef.current = true
    e.dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey)
    e.dataTransfer.setDragImage(blockRef.current, 0, 0)
  }

  const onDragEnd = () => {
    isDraggingRef.current = false
    if (targetLineRef.current) {
      targetLineRef.current.style.opacity = '0'
    }
    setPosition((prev) => ({ ...prev, show: false }))
  }

  return createPortal(
    <>
      <div
        id="draggable-block-handle"
        className={`absolute z-50 flex items-center gap-1 transition-opacity ${position.show && !isDraggingRef.current ? 'opacity-50 hover:opacity-100' : 'opacity-0'}`}
        style={{ top: position.top, left: position.left, height: '24px' }}
      >
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="flex h-6 w-4 cursor-grab active:cursor-grabbing items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Drag to move"
        >
          <GripVertical size={16} />
        </div>
      </div>
      <div
        ref={targetLineRef}
        className="absolute z-40 h-1 bg-primary transition-all opacity-0 pointer-events-none"
      />
    </>,
    document.body,
  )
}
