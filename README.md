npx skills add https://github.com/cloudflare/skills

```bash
ln -s apps/worker/.agents/
ln -s apps/worker/AGENTS.md
```

## Image uploads

The image pipeline streams a raw file from `/api/upload` to a Durable Object and the Bun container in `apps/bun-container`. Sharp preserves the original and creates seven WebP variants. The container writes through a private Worker bridge to `texcra-media`; the Worker saves the complete metadata in D1 before returning public R2 URLs. Shared contracts and validation live at `shared/image-processing` in `packages/shared`.

Use pnpm for dependencies and scripts. Bun 1.4.3 is installed as a workspace development tool; the container runs the same Bun version with Sharp 0.35.5. The Docker image uses port 3001 and requires the repository root as its build context.

```bash
pnpm install --frozen-lockfile
pnpm --config.verify-deps-before-run=false --filter shared run test
pnpm --config.verify-deps-before-run=false --filter bun-container run typecheck
pnpm --config.verify-deps-before-run=false --filter bun-container run test
pnpm --config.verify-deps-before-run=false --filter bun-container run test:large
pnpm --config.verify-deps-before-run=false --filter worker run test:image-upload
pnpm --config.verify-deps-before-run=false --filter worker run test:image-d1
pnpm --config.verify-deps-before-run=false --filter worker run build
```

The pnpm configuration flag prevents version 11 from automatically installing dependencies during checks. Install explicitly when changing manifests, and keep the lockfile in sync. The D1 integration test creates an isolated temporary database and removes it afterward.

To check one real upload against a running local Worker (port 3000 by default):

```bash
pnpm --config.verify-deps-before-run=false run worker:smoke:upload /absolute/path/photo.jpg
```

The command sends the file once with a new upload ID, then reads the original and seven variants from local R2 through Wrangler and compares the D1 row with the response. It checks the original checksum, WebP headers and stored byte lengths; it does not perform a full image decode. It leaves the uploaded images and D1 row in local storage. Wrangler/Docker must already be running with the current build, D1 migrations applied, and a valid `MEDIA_PUBLIC_BASE_URL`. Use `--url http://localhost:8787/api/upload` for another port and `--persist-to /absolute/path/state` if the running Wrangler uses a custom persistence directory. These options are forwarded through the same command.

For the complete local upload flow, start a Docker-compatible engine, apply the existing D1 migration locally, build the app, and run Wrangler:

```bash
pnpm --config.verify-deps-before-run=false --filter worker run db:migrate:local
pnpm --config.verify-deps-before-run=false --filter worker run build
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler types worker-configuration.d.ts --strict-vars=false --config wrangler.toml
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler dev --local --config wrangler.toml
```

Nitro builds the Worker and retains the exports from `exports.cloudflare.ts`. Wrangler reads `apps/worker/wrangler.toml` directly: the Worker entrypoint, static assets, Dockerfile, Docker build context, and D1 migration paths are relative to that file. Nitro's `cloudflare.deployConfig` is disabled, so the build needs no script to rewrite generated configuration. `no_bundle` and the ESModule rules let Wrangler package Nitro's prebuilt server modules; the `ASSETS` binding serves `.output/public`.

When switching from the previous build workflow, remove the old generated `apps/worker/.wrangler/deploy/config.json` once, and remove `apps/worker/.output/server/wrangler.json` if it remains after rebuilding. Preserve `.wrangler/state`, which contains local data. Rebuild before starting Wrangler after server changes. `pnpm run dev` remains the Vite/Nitro development command; check container integration with the built Worker and Wrangler.

Use `--config wrangler.toml` for Wrangler commands run through `--filter worker`. Deployment and CI should build the Cloudflare preset first and select this config explicitly. To check deployment packaging without uploading:

```bash
NITRO_PRESET=cloudflare-module pnpm --config.verify-deps-before-run=false --filter worker run build
pnpm --config.verify-deps-before-run=false --filter worker exec wrangler deploy --dry-run --config wrangler.toml
```

Before testing public delivery, set the real D1 database ID and `MEDIA_PUBLIC_BASE_URL` in `apps/worker/wrangler.toml`, enable public access for `texcra-media`, and connect the selected public domain. `MEDIA_PUBLIC_BASE_URL` is the R2 public origin, **not the container URL**. It is intentionally empty for now. Local R2 emulation does not establish a production public origin. Originals are retained in this public bucket too.

Authentication is intentionally pass-through in `src/server/upload-authorization.ts`, as requested. Same-origin checks, format validation, and resource limits are implemented; identity/access policy is deferred to the follow-up authentication work.

The initial limits are 20 MiB per input, 40 megapixels, a 4 KiB metadata header, 30 seconds for startup, 120 seconds for processing, and five processor slots with one upload per slot. Busy slots return a retryable error. Retries for the same file and options reuse their upload ID. Durable write receipts prevent cleanup from racing an in-flight R2 write, and ambiguous D1 commits preserve uploaded objects. Cleanup retries are bounded; an unresolved write acknowledgement leaves its slot fenced and emits `image_job_recovery` diagnostics for investigation.

## Future Node.js deployment

Nitro remains the deployment layer. Cloudflare is the default preset; a Node server can be built and started with:

```bash
NITRO_PRESET=node-server pnpm --config.verify-deps-before-run=false --filter worker run build
pnpm --config.verify-deps-before-run=false --filter worker run start:node
```

The app accesses Cloudflare bindings through Nitro's request runtime context. The Node build can start and serve the application without importing `cloudflare:workers`. A future Node deployment still needs database and image-processing adapters; uploads currently return a structured 503 when those bindings are absent. Both presets use `.output`, so rebuild with `NITRO_PRESET=cloudflare-module` before returning to Wrangler.

See [the implementation plan](plans/0-pre-process-image-plan.md) for contracts, dimensions, recovery behavior, and verification status.
