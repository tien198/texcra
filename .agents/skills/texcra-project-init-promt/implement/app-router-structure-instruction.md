# App Router Instructions

These instructions apply to every route and file under `src/app/`.

## Route structure

Use this structure for pages composed of multiple substantial sections:

```text
<route>/
├── page.tsx
└── sections/
    └── <section-name>/
        ├── index.tsx
        ├── comps/
        │   ├── <section-part>.tsx
        └── hooks/
            └── <section-name>-hook-name.ts
```

- Keep `page.tsx` thin. It should own route metadata, route-level data loading, and section composition in reading order.
- Treat each folder under a route's `sections/` directory as a route-local feature. Its `index.tsx` is the public entry point and exports one named section component.
- Put small, section-specific presentational components in that section's `comps/` directory.
- Promote a component to `src/components/` or a section to `src/sections/` only when it is genuinely reused across routes.
- Store route-specific images in `public/images/<route-name>/` and render content images with `next/image`.
- Use lowercase kebab-case for non-special file and directory names. Preserve Next.js special filenames such as `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx`.
- Do not add `sections/`, `comps/`, or `hooks/` directories when a route is simple enough to remain readable without them.

## Server and client boundaries

- Keep pages, layouts, section entry points, and static presentational components as Server Components by default.
- Add `"use client"` only to files that require hooks, event handlers, browser APIs, or client-only libraries. Do not mark an entire page or section as a Client Component for one interactive behavior.
- Isolate interactivity in the smallest practical Client Component and compose it from server-rendered content where possible.
- For animated sections, use a thin client `<SectionName>-mtion>` component that owns the root ref and animation hook while receiving server-rendered section markup through `children`.
- Props crossing into a Client Component must be React-serializable. Passing already-rendered `children` is the preferred boundary for motion wrappers.
- Before changing routing, metadata, caching, data fetching, or Server/Client composition, read the relevant installed guide in `node_modules/next/dist/docs/` as required by the repository-level `AGENTS.md`.

## Components and data

- Keep data and types close to their sole consumer. Extract them only when sharing or file complexity justifies it.
- Keep repeated content in typed data arrays near the section that owns it, then render it through a focused item component.
- Prefer explicit prop types and named component exports. Route files must use the default exports required by Next.js.
- Avoid barrel files unless they create a deliberate public boundary; import a section from its own `index.tsx` rather than exposing its internal components.
- Do not import another section's private `comps/` or `hooks/`. Promote shared behavior to an appropriate common directory first.

## Semantic markup and accessibility

- Give every major content section a semantic `<section>` root and connect its visible heading with `aria-labelledby`.
- Preserve heading hierarchy: one `<h1>` for the page, `<h2>` for major sections, and `<h3>` for repeated items or subsections.
- Prefer meaningful elements such as `main`, `nav`, `article`, `figure`, `figcaption`, `blockquote`, and `dl` over generic containers.
- Provide meaningful image `alt` text. Use an empty `alt` only for genuinely decorative images.
- Ensure interactive elements are keyboard accessible, have visible focus states, and expose an accessible name.
- Never make essential content dependent on JavaScript or animation becoming available.

## Styling and responsive layout

- Build mobile styles first and use the project's established breakpoints for larger layouts.
- Reuse tokens defined by the global theme instead of introducing near-duplicate colors, spacing, typography, or shadows.
- Keep route-level layout in the page or section entry point and component-specific styling with the component that owns it.
- Preserve the project's existing maximum content widths and horizontal gutters unless the design calls for a deliberate exception.
- Use class composition utilities already present in the repository when conditional classes become difficult to read.

## Adding or changing a route section

1. Create `sections/<section-name>/index.tsx` with semantic, server-rendered content.
2. Extract only cohesive repeated or visual units into `comps/`.
3. Add a client wrapper and hook only when the section requires animation or interactivity.
4. Import the section from its folder in the route's `page.tsx` and place it in the intended reading order.
5. Verify the section at representative mobile and desktop widths, with keyboard navigation, and with reduced motion enabled.

## Validation

- Run `npm run lint` after TypeScript or JSX changes.
- Run `npm run build` after changing routing, layouts, metadata, images, data-loading behavior, or Server/Client boundaries.
- Treat hydration warnings, inaccessible hidden content, missing image sizing information, and animation instances that survive unmounting as regressions.
