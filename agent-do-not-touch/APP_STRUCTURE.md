# Texcra Monorepo Structure

Texcra is structured as a pnpm monorepo containing application workspaces and shared packages.

## Directory Layout

```
texcra/                                 # Workspace root
├── apps/
│   └── worker/                         # TanStack Start app (package: "worker")
│       ├── .agents/                    # Agent configs & skills
│       ├── .claude/                    # Claude skills (symlinks -> ../../.agents/skills/*)
│       ├── AGENTS.md                   # Agent guidelines & rules
│       ├── src/
│       │   ├── app/                    # Redux store & hooks
│       │   ├── components/             # React UI components & shadcn
│       │   ├── lexical/                # Rich text editor
│       │   ├── lib/                    # Client/shared utilities
│       │   ├── paraglide/              # i18n runtime & generated messages
│       │   ├── routes/                 # TanStack Router file-based routes
│       │   ├── sections/               # Page sections
│       │   ├── server/                 # Server functions & queries (post, relationship, upload)
│       │   ├── globals.css
│       │   └── router.tsx
│       ├── public/                     # Static assets
│       ├── drizzle/                    # Drizzle migrations
│       ├── messages/                   # i18n JSON message sources
│       ├── project.inlang/             # Inlang i18n project config
│       ├── scripts/                    # DB seeds, verification, schema export scripts
│       ├── package.json                # "worker" (depends on "shared": "workspace:*")
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── wrangler.toml
│       ├── drizzle.config.ts           # Points to ../../packages/shared/src/db/schema/index.ts
│       ├── tsr.config.json
│       ├── components.json
│       ├── .cta.json
│       └── worker-configuration.d.ts
├── packages/
│   └── shared/                         # Shared DB package (package: "shared")
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema/             # Drizzle tables (posts, authors, users, etc.)
│       │   │   │   ├── authors.ts
│       │   │   │   ├── categories.ts
│       │   │   │   ├── media.ts
│       │   │   │   ├── payload-folders.ts
│       │   │   │   ├── posts.ts
│       │   │   │   ├── posts-v.ts
│       │   │   │   ├── search.ts
│       │   │   │   ├── users.ts
│       │   │   │   └── index.ts
│       │   │   ├── dbml/               # Generated schema diagrams
│       │   │   └── index.ts            # getDb(), relations, Database type
│       │   └── index.ts                # Entrypoint: export * from './db/index'
│       ├── dbml/                       # DBML documentation & sequence diagrams
│       ├── package.json                # "shared"
│       └── tsconfig.json
├── .vscode/                            # VS Code workspace settings
├── .gitignore                          # Workspace-wide git ignores
├── .prettierignore                     # Workspace-wide prettier ignores
├── eslint.config.js                    # Shared ESLint configuration
├── prettier.config.js                  # Shared Prettier configuration
├── package.json                        # Root workspace scripts & dev tooling
├── pnpm-workspace.yaml                 # Defines apps/* and packages/*
└── skills-lock.json                    # TanStack intent skills lock
```

## Packages

- **`apps/worker`** (`worker`): TanStack Start full-stack web application designed for Cloudflare Workers.
- **`packages/shared`** (`shared`): Shared database schemas, Drizzle models, and connection factories (`getDb`).
