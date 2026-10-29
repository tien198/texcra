import sharp from 'sharp'
import { APP_CONFIG } from '../config'

// Bound native parallelism and libvips cache independently of the HTTP busy guard.
sharp.concurrency(APP_CONFIG.sharp.concurrency)
sharp.cache(APP_CONFIG.sharp.cache)

/** Import sharp from here so the runtime limits above are always applied first. */
export { sharp }
