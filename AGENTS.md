# AGENTS.md

Instructions for coding agents (Codex and others) working in this repo.

**Before doing anything, read `CLAUDE.md` and `CONTRIBUTING.md` in the repo root.** `CLAUDE.md` is
the project context and rules. `CONTRIBUTING.md` is the git workflow. Both apply to you exactly as
they apply to Claude Code. If anything here conflicts with them, they win.

## Git workflow, short version

- Branch from `dev`: `feature/T<id>-<name>-<desc>` (or `fix/T<id>-…` for defects).
- Commit messages start with the task ID: `T29 - Add sticky category nav to menu`.
- Open a PR into `dev`. Never commit to or push to `main` or `dev` directly.
- Before pushing, run `npm run lint`, `npm run typecheck` and `npm run build`.
- Never force-push a shared branch. Never commit `.env.local` or any secret.

## Rules you must not break

- Ask before adding any dependency.
- Prices are recomputed server-side. Money is integer cents.
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only.
- Schema changes only through `supabase/migrations/`, with RLS on every table.
- An order becomes paid only through the Stripe webhook.
