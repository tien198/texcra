# Localized Copy Transcription

Work only on localization. Do not change layout, styling, fonts, or theme tokens.

1. Use Pencil MCP to inspect the English and Vietnamese frames.
2. Transcribe English copy into `messages/en.json`.
3. Transcribe Vietnamese copy into `messages/vi.json`.
4. Use identical message keys in both files.
5. Replace user-visible literals in the UI with generated imports from `/paraglide/messages.js`.

Transcribe the design copy exactly; do not invent or silently translate missing source text. Preserve unrelated work, edit locale and configuration files narrowly, and do not restore deleted files.

Validate both JSON files and the project's existing message-generation workflow before completing this phase.
