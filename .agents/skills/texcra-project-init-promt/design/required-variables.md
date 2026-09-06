## Required-input gate

Before running the design prompt, verify that every required variable below has a value.

A variable is missing if it is absent, blank, or still contains its literal placeholder.

If any required variable is missing:

1. Do not generate content, edit files, or continue the workflow.
2. Do not invent or infer the missing value.
3. Ask the user one concise question listing exactly which variables are missing.
4. Resume only after all missing values have been supplied.

| Variable         | Description                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `[Industry]`     | Industry or business sector in which the company operates.                                           |
| `[Company Name]` | Official company or brand name.                                                                      |
| `[Website URL]`  | Existing company website or project URL used as design context.                                      |
| `[Description]`  | Short description of the company, its products, or its services.                                     |
| `[Highlight]`    | Primary company strength, differentiator, offer, or message to emphasize.                            |
| `[Expert Field]` | Area of expertise the content writer should adopt.                                                   |
| `[Address]`      | Company headquarters or primary business address.                                                    |
| `[Email]`        | Primary customer contact email address.                                                              |
| `[Phone]`        | Primary phone or Zalo contact number.                                                                |
| `[SEO Keywords]` | Target search terms supplied as a list.                                                               |

## Reused Variables

- `[Industry]` appears in the project information table and expert-role instruction.
- `[Highlight]` appears in the project information table and homepage direction section.
