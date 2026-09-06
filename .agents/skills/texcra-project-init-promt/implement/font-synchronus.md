# Font and Theme Synchronization

Work only on fonts and theme colors. Do not edit localized copy or message catalogs.

## Fonts

1. Use Pencil MCP to inspect every relevant frame and record each font family, style, and weight in use.
2. Reuse the project's existing font setup when possible and load only the required variants.
3. For Next.js App Router, configure supported Google fonts with `next/font/google` in `app/layout.tsx` and expose them through CSS variables.
4. For TanStack Start or fonts unsupported by `next/font`, follow the repository's existing font-loading convention. Do not add Next.js-only APIs.

Next.js reference pattern:

```typescript
import { Alumni_Sans } from "next/font/google";

const alumniSans = Alumni_Sans({
  variable: "--font-alumni-sans",
  subsets: ["latin"],
  weight: "400",
});
```

## Theme Colors

- Convert repeated design colors into theme variables, using Culori when normalization or conversion is needed.
- Preserve existing variable names. Values may change to match the approved design.
- Add variables only when no existing token expresses the design role.
- Use theme variables instead of hard-coded colors wherever a suitable token exists.

Verify that fonts load with the required weights and that theme colors match Pencil. In the Markdown report, list every changed or added variable with its final value and purpose.
