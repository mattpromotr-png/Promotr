# Promotr repository guide

`PROMOTR_CODEX_BUILD_PROMPT.md` is the immutable client contract. Do not reread it for routine work.

For implementation, read these compact files first:

1. `docs/project-context.md` — scope, decisions, constraints, and source-of-truth rules.
2. `docs/architecture.md` — boundaries, data flow, security, and directory layout.
3. `docs/implementation-plan.md` — acceptance-mapped gates and current progress.
4. `docs/visual-system.md` — UI direction extracted from the reference images.

Only consult the original client prompt when a compact document is ambiguous or when verifying final acceptance. Keep the MVP tightly scoped, use fixtures when credentials are missing, and record genuine blockers in `docs/implementation-plan.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
