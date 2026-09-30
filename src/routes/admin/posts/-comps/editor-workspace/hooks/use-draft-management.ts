import { useCallback, useEffect, useRef, useState } from 'react'
import { createEditor } from 'lexical'
import type { EditorState } from 'lexical'
import { EDITOR_NODES } from '#/lexical/core/-editor-config'
import {
  DEFAULT_TITLE,
  DEFAULT_HERO_IMAGE,
  DEFAULT_SEO,
  getStoredDraft,
} from '#/lexical/core/-editor-data'
import type { SEO, DocumentSnapshot } from '#/lexical/core/-editor-data'
import { useAppDispatch } from '#/app/hooks'
import { loadDraftData } from '#/lexical/editor-RTK/editorSlice'

export interface UseDraftManagementOptions {
  postId: string
  isLoaded: boolean
  title: string
  heroImage: string | null
  seo: SEO
  snapshot: DocumentSnapshot | null
}

export function useDraftManagement({
  postId,
  isLoaded,
  title,
  heroImage,
  seo,
  snapshot,
}: UseDraftManagementOptions) {
  const dispatch = useAppDispatch()
  const [lexicalInitialState, setLexicalInitialState] =
    useState<EditorState | null>(null)
  const [draftVersion, setDraftVersion] = useState(0)
  const [hasDraft, setHasDraft] = useState(false)

  // Keep a ref to the latest values so callbacks and effects don't re-run or recreate on every keystroke
  const stateRef = useRef({ title, heroImage, seo, snapshot })
  useEffect(() => {
    stateRef.current = { title, heroImage, seo, snapshot }
  }, [title, heroImage, seo, snapshot])

  // Reset editor draft state when navigating between different posts
  useEffect(() => {
    setLexicalInitialState(null)
    setHasDraft(false)
  }, [postId])

  const editorKey = `${postId}:${draftVersion}`

  useEffect(() => {
    if (!isLoaded) {
      const raw = getStoredDraft(postId)
      if (raw) {
        setHasDraft(true)
      } else {
        setHasDraft(false)
        const {
          title: currentTitle,
          heroImage: currentHeroImage,
          seo: currentSeo,
          snapshot: currentSnapshot,
        } = stateRef.current
        dispatch(
          loadDraftData({
            title: currentTitle,
            heroImage: currentHeroImage,
            seo: currentSeo,
            snapshot: currentSnapshot,
            error: '',
          }),
        )
      }
    }
  }, [isLoaded, postId, dispatch])

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
      const {
        title: currentTitle,
        heroImage: currentHeroImage,
        seo: currentSeo,
      } = stateRef.current
      dispatch(
        loadDraftData({
          title: currentTitle,
          heroImage: currentHeroImage,
          seo: currentSeo,
          snapshot: null,
          error:
            'Your saved draft could not be opened. It has been kept untouched. Export this session to keep your changes.',
        }),
      )
    }
  }, [postId, dispatch])

  const handleDismissDraft = useCallback(() => {
    setHasDraft(false)
    const {
      title: currentTitle,
      heroImage: currentHeroImage,
      seo: currentSeo,
      snapshot: currentSnapshot,
    } = stateRef.current
    dispatch(
      loadDraftData({
        title: currentTitle,
        heroImage: currentHeroImage,
        seo: currentSeo,
        snapshot: currentSnapshot,
        error: '',
      }),
    )
  }, [dispatch])

  return {
    lexicalInitialState,
    editorKey,
    hasDraft,
    handleRestoreDraft,
    handleDismissDraft,
  }
}
