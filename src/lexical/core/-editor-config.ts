import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { ImageNode } from '#/lexical/-image-node'
import { EDITOR_TYPOGRAPHY } from './-editor-typography'

import { BlockNode } from '#/lexical/-block-node'

export const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  ImageNode,
  BlockNode,
]

export const EDITOR_THEME = EDITOR_TYPOGRAPHY
