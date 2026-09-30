import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import { $applyNodeReplacement, DecoratorNode } from 'lexical'
import type { ReactElement } from 'react'
import { BlockDispatcher } from './-block-dispatcher'

export type BlockPayload = {
  blockType: string
  blockData: Record<string, any>
}

export type SerializedBlockNode = Spread<BlockPayload, SerializedLexicalNode>

export class BlockNode extends DecoratorNode<ReactElement> {
  __blockType: string
  __blockData: Record<string, any>

  static getType(): string {
    return 'custom-block'
  }

  static clone(node: BlockNode): BlockNode {
    return new BlockNode(
      { blockType: node.__blockType, blockData: node.__blockData },
      node.__key,
    )
  }

  constructor(payload: BlockPayload, key?: NodeKey) {
    super(key)
    this.__blockType = payload.blockType
    this.__blockData = payload.blockData
  }

  static importJSON(node: SerializedBlockNode): BlockNode {
    return $createBlockNode(node)
  }

  exportJSON(): SerializedBlockNode {
    return {
      ...super.exportJSON(),
      type: 'custom-block',
      version: 1,
      blockType: this.__blockType,
      blockData: this.__blockData,
    }
  }

  createDOM(): HTMLElement {
    const element = document.createElement('div')
    element.className = 'custom-block-wrapper mt-6 first:mt-0'
    return element
  }

  updateDOM(): false {
    return false
  }

  isInline(): false {
    return false
  }

  setBlockData(newData: Record<string, any>): void {
    const writable = this.getWritable()
    writable.__blockData = { ...writable.__blockData, ...newData }
  }

  decorate(): ReactElement {
    return (
      <BlockDispatcher
        nodeKey={this.getKey()}
        type={this.__blockType}
        data={this.__blockData}
      />
    )
  }
}

export function $createBlockNode(payload: BlockPayload): BlockNode {
  return $applyNodeReplacement(new BlockNode(payload))
}

export function $isBlockNode(
  node: LexicalNode | null | undefined,
): node is BlockNode {
  return node instanceof BlockNode
}
