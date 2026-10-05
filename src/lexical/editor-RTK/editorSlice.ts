import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  DEFAULT_SEO,
  DEFAULT_TITLE,
  DEFAULT_HERO_IMAGE,
} from '#/lexical/core/-editor-data'
import type { SEO, DocumentSnapshot } from '#/lexical/core/-editor-data'
import type { Option } from '#/components/texcra-ui/relationship-multi-select'

export interface EditorState {
  postId: string | null
  title: string
  heroImage: string | null
  seo: SEO
  snapshot: DocumentSnapshot | null
  authors: Option[]
  categories: Option[]
  relatedPosts: Option[]
  status: string
  error: string
  isLoaded: boolean
}

const initialState: EditorState = {
  postId: null,
  title: DEFAULT_TITLE,
  heroImage: DEFAULT_HERO_IMAGE,
  seo: DEFAULT_SEO,
  snapshot: null,
  authors: [],
  categories: [],
  relatedPosts: [],
  status: 'Loading draft…',
  error: '',
  isLoaded: false,
}

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setPostId(state, action: PayloadAction<string>) {
      if (state.postId !== action.payload) {
        state.postId = action.payload
        state.title = DEFAULT_TITLE
        state.heroImage = DEFAULT_HERO_IMAGE
        state.seo = DEFAULT_SEO
        state.snapshot = null
        state.authors = []
        state.categories = []
        state.relatedPosts = []
        state.error = ''
        state.status = 'Loading draft…'
        state.isLoaded = false
      }
    },
    setTitle(state, action: PayloadAction<string>) {
      state.title = action.payload
    },
    setHeroImage(state, action: PayloadAction<string | null>) {
      state.heroImage = action.payload
    },
    setSeo(state, action: PayloadAction<Partial<SEO>>) {
      state.seo = { ...state.seo, ...action.payload }
    },
    setSnapshot(state, action: PayloadAction<DocumentSnapshot>) {
      state.snapshot = action.payload
    },
    setAuthors(state, action: PayloadAction<Option[]>) {
      state.authors = action.payload
    },
    setCategories(state, action: PayloadAction<Option[]>) {
      state.categories = action.payload
    },
    setRelatedPosts(state, action: PayloadAction<Option[]>) {
      state.relatedPosts = action.payload
    },
    setStatus(state, action: PayloadAction<string>) {
      state.status = action.payload
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload
    },
    loadDraftData(
      state,
      action: PayloadAction<{
        title: string
        heroImage: string | null
        seo: SEO
        snapshot: DocumentSnapshot | null
        error: string
        authors?: Option[]
        categories?: Option[]
        relatedPosts?: Option[]
      }>,
    ) {
      state.title = action.payload.title
      state.heroImage = action.payload.heroImage
      state.seo = action.payload.seo
      state.snapshot = action.payload.snapshot
      state.error = action.payload.error
      if (action.payload.authors !== undefined) {
        state.authors = action.payload.authors
      }
      if (action.payload.categories !== undefined) {
        state.categories = action.payload.categories
      }
      if (action.payload.relatedPosts !== undefined) {
        state.relatedPosts = action.payload.relatedPosts
      }
      state.status = action.payload.error ? 'Draft recovery needed' : 'Loaded'
      state.isLoaded = true
    },
  },
})

export const {
  setPostId,
  setTitle,
  setHeroImage,
  setSeo,
  setSnapshot,
  setAuthors,
  setCategories,
  setRelatedPosts,
  setStatus,
  setError,
  loadDraftData,
} = editorSlice.actions
export default editorSlice.reducer
