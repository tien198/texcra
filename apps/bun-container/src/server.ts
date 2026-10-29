import { app } from './app'
import { APP_CONFIG } from './config'

export { app }
export type { App } from './app'

if (import.meta.main) {
  app.listen(
    {
      hostname: APP_CONFIG.server.hostname,
      port: APP_CONFIG.server.port,
    },
    (server) => {
      console.log(
        `Image processor listening on ${server.hostname}:${server.port}`,
      )
    },
  )
}
