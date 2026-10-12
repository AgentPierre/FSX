## Task

<!-- Schedule task ID, e.g. T29. PR title: "T29 - <what it does>" -->

## What and why

<!-- One or two sentences. -->

## RTM IDs covered

<!-- Required. List requirement IDs from the RTM (F1–F30), e.g. F4, F5, F9 -->

## Checklist

- [ ] No secrets committed
- [ ] No server-only key imported client-side
- [ ] Prices recomputed server-side; money in integer cents
- [ ] RLS not bypassed; schema changes are in `supabase/migrations/`
- [ ] No new dependency (or the developer lead approved it)
- [ ] Lint, typecheck and build pass
