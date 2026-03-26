# Session handoff (MBB Kanban)

Use this file for context in new chats: `@docs/handoff.md` or paste sections as needed.

## Project

- **Stack:** Next.js 14 (Pages Router), React, Supabase, Tailwind, Vercel.
- **Repo:** `ChrisCotton/kanban-mbb-app` on GitHub.
- **Default branch:** `main` (feature work was merged from `feature/insights-and-milestones`).

## Supabase

- **Project ref (public):** `emxejsyyelcdpejxuvfd` → URL shape: `https://emxejsyyelcdpejxuvfd.supabase.co`
- **Paused projects:** DNS / connection failures; unpause in [Supabase Dashboard](https://supabase.com/dashboard). Hitting the project root may return `{"error":"requested path is invalid"}` — that is normal; APIs use `/auth/v1/...`, `/rest/v1/...`, etc.
- **Local env:** `.env.local` — needs at least `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server routes often need `SUPABASE_SERVICE_ROLE_KEY`.

### Useful scripts (run from repo root)

| Command | Purpose |
|--------|---------|
| `npm run auth:list-users` | Lists Auth users (uses service role from `.env.local`). See `scripts/list-auth-users.js`. |
| `node scripts/reset-auth-password.js <email> <new-password>` | Admin password reset (service role). |

## Vercel

- **Preset:** Next.js, **root directory:** `./` (repo root).
- **CLI linking:** `.vercel` lives in **`kanban-mbb-app/`**. From a parent folder, use e.g. `vercel --cwd kanban-mbb-app <subcommand>` so the linked project is found.
- **Required env (production):** `NEXT_PUBLIC_SUPABASE_URL`, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (must match what the app reads — not only `SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY` for API routes. Optional: `NEXT_PUBLIC_APP_URL`, AI keys as used by features.
- **Sensitive env vars:** Values are often **not shown again** in the Vercel UI after save — that is expected.

## Cursor / MCP

- **Context7:** Remote MCP is reliable when local `npx`/Node is not on the GUI PATH: `https://mcp.context7.com/mcp` (see Upstash Context7 docs).
- **`.cursor/mcp.json`:** May contain **secrets** (e.g. Supabase access tokens for MCP). **Do not commit** tokens; keep local or use env patterns your team agrees on.

### Handoff workflow (project skills)

| Skill | Location | Purpose |
|--------|----------|---------|
| **writeho** | `.cursor/skills/writeho/SKILL.md` | Agent updates this file (`docs/handoff.md`) from session outcomes; say `/writeho` or “update handoff.” |
| **readho** | `.cursor/skills/readho/SKILL.md` | Agent reads `docs/handoff.md` and tells the user to attach context; say `/readho` or “load handoff.” |

- New chats: reference **`@docs/handoff.md`** in the prompt (or paste sections). Skills do not auto-inject memory; they standardize *how* to write/read this doc.
- Commit skill files when they change: `.cursor/skills/writeho/`, `.cursor/skills/readho/`.

## Recent product / code notes

- **Auth pages:** Show/hide password on login and signup (`pages/auth/login.js`, `pages/auth/signup.js`).
- **Vercel build:** A batch of **TypeScript strictness** fixes landed on `main` (arrays typed as `never[]`, `Category` / `hourly_rate_usd`, goals store types, `searchTasks` + `goalInfo`, etc.).
- **Tests:** `pages/vision-board.test.js` was **moved** to `__tests__/pages/vision-board.test.js` so Next.js does not treat it as a route; Jest-style tests should stay out of `pages/`.

## Security reminders

- Never commit `.env.local`, service role keys, or MCP tokens.
- Rotate any credential that was ever committed or pasted in chat.

## Optional follow-ups

- Confirm Supabase **Auth → URL configuration** includes the production Vercel URL (site URL + redirect URLs).
- Remove duplicate or wrongly named env vars in Vercel if both `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` were added — the app expects the **`NEXT_PUBLIC_`** name for the anon key in client code.

---

*Last updated: added writeho/readho project skills and handoff workflow section; refresh when infra or workflow changes materially.*
