import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $generateHtmlFromNodes } from '@lexical/html'
import { $getRoot, $isElementNode } from 'lexical'
import type { LexicalNode } from 'lexical'
import { $isHeadingNode } from '@lexical/rich-text'
import type { DocumentSnapshot } from '#/lexical/core/-editor-data'
import { $isImageNode } from './-image-node'
import { cleanEditorHtml } from '#/lexical/document/-document-export'

export function DocumentPlugin({
  onChange,
}: {
  onChange: (snapshot: DocumentSnapshot) => void
}) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    function update() {
      const editorState = editor.getEditorState()
      if (editorState.isEmpty()) return
      editorState.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()
        const headings: DocumentSnapshot['headings'] = []
        const images: DocumentSnapshot['images'] = []
        function visit(node: LexicalNode) {
          if ($isHeadingNode(node))
            headings.push({
              key: node.getKey(),
              text: node.getTextContent(),
              level: Number(node.getTag().slice(1)),
            })
          if ($isImageNode(node)) images.push({ alt: node.getImage().alt })
          if ($isElementNode(node)) node.getChildren().forEach(visit)
        }
        visit(root)
        onChange({
          json: editorState.toJSON(),
          html: cleanEditorHtml($generateHtmlFromNodes(editor)),
          text,
          words: text.trim() ? text.trim().split(/\s+/u).length : 0,
          headings,
          images,
        })
      })
    }
    update()
    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size > 0 || dirtyLeaves.size > 0) update()
    })
  }, [editor, onChange])
  return null
}
