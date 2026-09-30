import { $applyNodeReplacement, DecoratorNode } from 'lexical'
import type {
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import type { ReactElement } from 'react'
import type { ImagePayload } from '#/lexical/core/-editor-data'
import { isWebUrl } from '#/lexical/core/-editor-data'
import { EditorImage } from './-editor-image'

export type SerializedImageNode = Spread<ImagePayload, SerializedLexicalNode>

/** A React image block in the editor; a semantic figure in exported HTML. */
export class ImageNode extends DecoratorNode<ReactElement> {
  __src: string
  __alt: string
  __caption: string

  static getType(): string {
    return 'editor-image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      { src: node.__src, alt: node.__alt, caption: node.__caption },
      node.__key,
    )
  }

  constructor(
    image: ImagePayload = { src: '', alt: '', caption: '' },
    key?: NodeKey,
  ) {
    super(key)
    this.__src = isWebUrl(image.src) ? image.src : ''
    this.__alt = typeof image.alt === 'string' ? image.alt : ''
    this.__caption = typeof image.caption === 'string' ? image.caption : ''
  }

  static importJSON(node: SerializedImageNode): ImageNode {
    return $createImageNode(node).updateFromJSON(node)
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: 'editor-image',
      version: 1,
      ...this.getImage(),
    }
  }

  static importDOM(): DOMConversionMap {
    return {
      figure: (element) => {
        const img = element.querySelector('img')
        if (!img || !isWebUrl(img.src)) return null
        return {
          conversion: () => ({
            node: $createImageNode({
              src: img.src,
              alt: img.alt,
              caption: element.querySelector('figcaption')?.textContent ?? '',
            }),
            after: () => [],
          }),
          priority: 2,
        }
      },
      img: (element) => {
        if (!(element instanceof HTMLImageElement) || !isWebUrl(element.src))
          return null
        return {
          conversion: () => ({
            node: $createImageNode({
              src: element.src,
              alt: element.alt,
              caption: '',
            }),
          }),
          priority: 1,
        }
      },
    }
  }

  createDOM(): HTMLElement {
    const element = document.createElement('div')
    element.className = 'my-6'
    return element
  }

  updateDOM(): false {
    return false
  }
  isInline(): false {
    return false
  }

  getImage(): ImagePayload {
    const node = this.getLatest()
    return { src: node.__src, alt: node.__alt, caption: node.__caption }
  }

  setImage(image: ImagePayload): this {
    const node = this.getWritable()
    node.__src = isWebUrl(image.src) ? image.src : ''
    node.__alt = image.alt
    node.__caption = image.caption
    return node
  }

  getTextContent(): string {
    return this.getLatest().__caption
  }

  exportDOM(): DOMExportOutput {
    const { src, alt, caption } = this.getImage()
    const figure = document.createElement('figure')
    const img = document.createElement('img')
    if (src) img.src = src
    img.alt = alt
    img.loading = 'lazy'
    img.decoding = 'async'
    figure.append(img)
    if (caption) {
      const figcaption = document.createElement('figcaption')
      figcaption.textContent = caption
      figure.append(figcaption)
    }
    return { element: figure }
  }

  decorate(): ReactElement {
    return <EditorImage nodeKey={this.getKey()} image={this.getImage()} />
  }
}

export function $createImageNode(image: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(image))
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode
}
