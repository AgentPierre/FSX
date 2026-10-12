# Contributing — Menciu's Chopstix Ordering System (FSX)

Hard deadline: **17 Nov 2026**. No code or documentation changes after this date.

Repo: https://github.com/hiabnegash-lang/FSX. The old `AgentPierre/FSX` URL redirects here.
Update your remote once:

```bash
git remote set-url origin https://github.com/hiabnegash-lang/FSX.git
```

## Branches

| Branch                        | Purpose                                                                    | Who writes to it             |
| ----------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `main`                        | Releases only. What the sponsor sees at demos.                             | PR from `dev` at a milestone |
| `dev`                         | Integration. Everyone's finished work lands here first and is tested here. | PRs from task branches       |
| `feature/T<id>-<name>-<desc>` | One schedule task. Short-lived.                                            | You                          |
| `fix/T<id>-<name>-<desc>`     | A defect fix, usually T49.                                                 | You                          |

Examples: `feature/T23-perry-db-schema`, `feature/T29-jose-menu-cart`, `fix/T49-jose-cart-total`.

- **Always branch from `dev`**, never from `main` or someone else's branch.
- **One task per branch.** When the PR merges, GitHub deletes the branch. Start the next task fresh.
- **No long-lived personal branches** (`Perry-Takyi`, `Hiab-Negash`, …). Finish what's on them, PR
  it, and use task branches from then on.
- Both `main` and `dev` are protected: PR required, 1 approval, CI must pass, no force-push.

## The everyday loop

```bash
git checkout dev
git pull
git checkout -b feature/T29-jose-menu-cart

# work, commit often
git add -A
git commit -m "T29 - Add menu category nav"

git push -u origin feature/T29-jose-menu-cart
# open a PR into dev, fill in the template, tag Hiab
```

### Staying up to date

If `dev` moved on while you were working, bring it into your branch before opening the PR:

```bash
git fetch origin
git merge origin/dev
# fix any conflicts, run the checks, commit, push
```

Fix conflicts locally, not with GitHub's "Resolve conflicts" button, so you can run the app and the
checks before pushing. Never `git push --force` to a branch someone else is using.

## Commits

Start every commit with the task ID, then a short description of what changed:

```
T29 - Add sticky category nav to menu
T30 - Reject pickup times outside business hours
T49 - Fix cart total not updating on quantity change
```

Be specific: "Fix cart total not updating on quantity change" beats "Fix bug".

## Pull requests

- Into `dev`. Title: `T<id> - <what it does>`.
- Fill in the template in `.github/pull_request_template.md`, including **RTM IDs covered** (F1–F30).
  The IDs must match what actually changed.
- CI (lint, typecheck, build) must pass. Run `npm run lint`, `npm run typecheck` and
  `npm run build` before pushing.
- One approval required. Hiab reviews every PR into `dev`.
- **Squash and merge.** Each task becomes one commit on `dev`; your in-progress commits stay on the PR.

## Releases

At each milestone, Hiab opens a PR from `dev` into `main` and merges it with a merge commit, then tags it:

| Tag         | When                                  |
| ----------- | ------------------------------------- |
| `v0.1-demo` | Mid-project sponsor demo (T43, 2 Nov) |
| `v1.0`      | Final source package (T60, 16 Nov)    |

## Hard rules

- **Never commit secrets.** `.env.local` is gitignored; `.env.example` lists key names only.
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only. Never import them in a client component.
- Schema changes go through `supabase/migrations/`. Never edit the database by hand.
- Row Level Security on for every table.
- Prices are recalculated server-side from the database. Never trust a price from the browser.
- Money is integer cents. Never floats.
- An order is marked paid only by the Stripe webhook.
- Add no dependency without asking Hiab first.

## Local setup

```bash
git clone https://github.com/hiabnegash-lang/FSX.git && cd FSX
git checkout dev
npm install
cp .env.example .env.local   # values from Hiab, never commit this file
npm run dev
```

## Using Claude Code or Codex

Both read their instructions from the repo, so pulling `dev` updates them:

- **Claude Code** loads `CLAUDE.md` automatically at the start of each session.
- **Codex** loads `AGENTS.md`, which points it at `CLAUDE.md` and this file.

After pulling a change to these files, start a new chat so it picks them up.
