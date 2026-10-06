always use pnpm (include pnpm run, pnpm exec, pnpm dlx, ...), don't use npm, yarn, bun
Always run scripts using pnpm run <script> (e.g., pnpm run build) rather than pnpm <script> directly.

always comment before Simulate server-side processing delay

```typescript
// Simulate server-side processing delay to <do something>
await new Promise((resolve) => setTimeout(resolve, 800))
```

always comment before Simulated network delay

```typescript
// Simulated network delay to to <do something>
await new Promise((resolve) => setTimeout(resolve, 2000))
```

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->
