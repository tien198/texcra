import { useCallback, useEffect, useState } from 'react'
import { createEditor } from 'lexical'
import type { EditorState } from 'lexical'
import { EDITOR_NODES } from '#/lexical/core/-editor-config'
import {
  DEFAULT_TITLE,
  DEFAULT_HERO_IMAGE,
  DEFAULT_SEO,
  getStoredDraft,
} from '#/lexical/core/-editor-data'
import { useAppDispatch, useAppSelector } from '#/app/hooks'
import {
  loadDraftData,
  setError,
  setStatus,
} from '#/lexical/editor-RTK/editorSlice'
import type { Post } from '#/server/post/types'

export interface UseDraftManagementOptions {
  post: Post
}

export function useDraftManagement({
  post,
}: UseDraftManagementOptions) {
  const dispatch = useAppDispatch()
  const isLoaded = useAppSelector((state) => state.editor.isLoaded)
  const postId = String(post.id)

  const [lexicalInitialState, setLexicalInitialState] =
    useState<EditorState | null>(null)
  const [draftVersion, setDraftVersion] = useState(0)
  const [hasDraft, setHasDraft] = useState(false)

  // Reset editor draft state when navigating between different posts
  useEffect(() => {
    setLexicalInitialState(null)
    setHasDraft(false)
  }, [postId])

  const editorKey = `${postId}:${draftVersion}`

  useEffect(() => {
    if (!isLoaded) {
      const raw = getStoredDraft(postId)

      let serverEditorState: EditorState | null = null
      try {
        const editor = createEditor({
          nodes: EDITOR_NODES,
          onError: (err) => {
            throw err
          },
        })
        const contentStr =
          typeof post.content === 'string'
            ? post.content
            : JSON.stringify(post.content)
        serverEditorState = editor.parseEditorState(contentStr)
      } catch (err) {
        console.error('Failed to parse server content', err)
      }

      setLexicalInitialState(serverEditorState)
      setHasDraft(!!raw)

      dispatch(
        loadDraftData({
          title: post.title || DEFAULT_TITLE,
          heroImage:
            typeof post.heroImage === 'string'
              ? post.heroImage
              : post.heroImage?.url || DEFAULT_HERO_IMAGE,
          seo: {
            title: post.meta_title || post.title || DEFAULT_SEO.title,
            description: post.meta_description || DEFAULT_SEO.description,
            image:
              post.meta_image_id ||
              (typeof post.heroImage === 'string'
                ? post.heroImage
                : post.heroImage?.url) ||
              DEFAULT_SEO.image,
            canonicalUrl: DEFAULT_SEO.canonicalUrl,
          },
          snapshot: null,
          authors: (post.authors || []).map((a: any) => ({
            value: String(typeof a === 'object' ? a.id : a),
            label:
              typeof a === 'object'
                ? a.name || a.email || String(a.id)
                : String(a),
          })),
          categories: (post.categories || []).map((c: any) => ({
            value: String(typeof c === 'object' ? c.id : c),
            label: typeof c === 'object' ? c.title || String(c.id) : String(c),
          })),
          error: '',
        }),
      )
    }
  }, [isLoaded, postId, dispatch, post])

  const handleRestoreDraft = useCallback(() => {
    if (
      !window.confirm(
        'Current content will be overwritten by the saved draft. Are you sure?',
      )
    ) {
      return
    }
    try {
      const raw = getStoredDraft(postId)
      if (!raw) return

      const value = JSON.parse(raw)
      if (
        value?.version !== 1 ||
        typeof value.editor !== 'string' ||
        (!value.settings && !value.seo)
      ) {
        throw new Error('Invalid draft')
      }

      const draftTitle = value.title ?? value.settings?.title ?? DEFAULT_TITLE
      const draftHeroImage =
        value.heroImage !== undefined
          ? value.heroImage
          : (value.settings?.heroImage ?? DEFAULT_HERO_IMAGE)
      const draftSeo = {
        title: value.seo?.title ?? DEFAULT_SEO.title,
        description:
          value.seo?.description ??
          value.settings?.description ??
          DEFAULT_SEO.description,
        image: value.seo?.image ?? DEFAULT_SEO.image,
        canonicalUrl:
          value.seo?.canonicalUrl ??
          value.settings?.canonicalUrl ??
          DEFAULT_SEO.canonicalUrl,
      }

      const editor = createEditor({
        nodes: EDITOR_NODES,
        onError: (err) => {
          throw err
        },
      })
      const parsedEditorState = editor.parseEditorState(value.editor)
      if (parsedEditorState.isEmpty()) throw new Error('Empty editor state')

      setLexicalInitialState(parsedEditorState)
      setDraftVersion((v) => v + 1)
      setHasDraft(false)

      dispatch(
        loadDraftData({
          title: draftTitle,
          heroImage: draftHeroImage,
          seo: draftSeo,
          snapshot: null,
          error: '',
        }),
      )
    } catch {
      setHasDraft(false)
      dispatch(
        setError(
          'Your saved draft could not be opened. It has been kept untouched. Export this session to keep your changes.',
        ),
      )
      dispatch(setStatus('Draft recovery needed'))
    }
  }, [postId, dispatch])

  const handleDismissDraft = useCallback(() => {
    setHasDraft(false)
    dispatch(setError(''))
    dispatch(setStatus('Loaded'))
  }, [dispatch])

  return {
    lexicalInitialState,
    editorKey,
    hasDraft,
    handleRestoreDraft,
    handleDismissDraft,
  }
}
