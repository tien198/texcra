---
name: project-init-promt
description: Design frontends in Pencil MCP or implement an existing Pencil design in Next.js or TanStack Start. Use for UI design, design-to-code, localized-copy transcription, translation (i18n), font synchronization, or theme-token alignment.
---

# Frontend Workflow

Use Pencil MCP as the source of truth for design frames, content, styles, and assets. Follow the user's requested scope and preserve unrelated or uncommitted work.

## Choose One Mode

Select exactly one top-level mode:

- **Design:** create or revise the UI in Pencil. Do not edit application code.
- **Implementation:** convert an existing Pencil design into code. Do not redesign or edit the Pencil file.

Do not design and implement in the same run. If the user requests both, finish Design, provide its deliverables, and wait for explicit approval before starting Implementation.

## Design

1. Read [design/required-variables.md](design/required-variables.md) and enforce its input gate.
2. Do not read or execute the design brief until every required value is present.
3. Then read [design/design-guidline.md](design/design-guidline.md) and perform the requested design work through Pencil MCP.
4. Inspect the finished Pencil frame and provide the report required by the brief.

## Implementation

Access Pencil design. Inspect it through Pencil MCP and inspect the target repository before editing. Match the design while reusing the project's stack, components, tokens, and conventions.

Determine the requested implementation option from the user's prompt. If it is unclear, ask the user to choose one or more of these options and wait for the answer:

1. **Localization:** read and follow only [implement/transcribe.md](implement/transcribe.md).
2. **Font and theme synchronization:** read and follow only [implement/font-synchronus.md](implement/font-synchronus.md).
3. **Core UI:** implement structure, components, styling, and assets from Pencil, if the project is building on NextJS, reference [app-router-structure-instruction.md](implement/app-router-structure-instruction.md). If the project is building on TanStack Start, reference the Tanstack Intent

Execute only the selected options. Do not read references for unselected options. If multiple options are selected, complete and verify each separately; never mix localization edits with font/theme edits.

## Completion

- Compare the result with the relevant Pencil frames.
- Run the repository's relevant checks.
- Report completed work, validation results, and any remaining mismatch or blocker.
- If Pencil MCP or the requested design is unavailable, stop and identify the missing access instead of guessing.
