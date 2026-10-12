# Homepage UI/UX Design Brief

> Create a polished, conversion-focused Vietnamese homepage based on the existing website and the project’s current design system.

## 1. Objective

Use **Pencil MCP** to design a new homepage for the company described below.

- Use **Vietnamese** for all customer-facing content.
- Follow the established web UI and existing project conventions.
- Make **light mode** the default experience.

## 2. Project Information

| Field                     | Value            |
| ------------------------- | ---------------- |
| Industry                  | `[Industry]`     |
| Company name              | `[Company Name]` |
| Website URL               | `[Website URL]`  |
| Company description       | `[Description]`  |
| Primary company highlight | `[Highlight]`    |

### SEO Keywords

`[SEO Keywords]`

Act as a `[Expert Field]` expert with deep knowledge of the `[Industry]` industry. Write concise, compelling, customer-focused content with one clear message per section.

## 3. Contact Information

| Channel           | Details     |
| ----------------- | ----------- |
| Trụ sở chính      | `[Address]` |
| Email             | `[Email]`   |
| Điện thoại / Zalo | `[Phone]`   |

## 4. Design-System Requirements

1. Inspect `@globals.css` and bring its existing CSS variables into the Pencil design.
2. Use **Culori** when converting or normalizing color values.
3. You may adjust the values of existing theme variables to support the intended UI/UX direction.
4. Preserve every existing CSS variable name.
5. Add new variables only when necessary.
6. Do not use hard-coded colors when a suitable theme variable exists.

## 5. Homepage Direction

The homepage should:

- Clearly communicate what the company offers.
- Give strong visual emphasis to `[Highlight]`.
- Build credibility and make the primary customer action obvious.
- Incorporate the target SEO keywords naturally into headings and body copy.
- Present contact options clearly, especially phone and Zalo.
- Use a desktop composition that can be adapted cleanly to mobile during implementation.

## 6. Deliverables

- A complete homepage design in Pencil.
- Desktop only layout.
- A short Markdown report containing:
  - Every existing theme variable whose value was changed.
  - Every new theme variable added.
  - The final value and purpose of each changed or added variable.

## 7. Constraints

- Preserve unrelated existing work.
- Keep the interface in Vietnamese.
- Keep light mode as the default.
- Maintain accessible contrast and legible typography.
- Do not invent company facts; return to the required-input gate if a required value is missing.
