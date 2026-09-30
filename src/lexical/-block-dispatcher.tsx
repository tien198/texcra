import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { BLOCK_REGISTRY } from '#/lexical/blocks/-registry'

export function BlockDispatcher({
  nodeKey,
  type,
  data,
}: {
  nodeKey: string
  type: string
  data: any
}) {
  const [editor] = useLexicalComposerContext()
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey)

  const config = BLOCK_REGISTRY[type]
  if (!config)
    return (
      <div className="p-4 border border-red-500 bg-red-50 text-red-700">
        Unknown block type: {type}
      </div>
    )

  const { Component } = config

  return (
    <div
      className={`relative rounded-md transition-colors ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      onClick={() => {
        clearSelection()
        setSelected(true)
      }}
    >
      <Component data={data} nodeKey={nodeKey} editor={editor} />
    </div>
  )
}
