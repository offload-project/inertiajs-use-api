## Description

Brief summary of what this PR changes and why.

Fixes # (issue)

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (changes public API: hook signature, `SubmitOptions`, `UseApi`, `configureUseApi`, exported types)
- [ ] Docs only
- [ ] Tooling / build / CI
- [ ] Refactor (no behavior change)

## What changed

A short bullet list of the user-facing or contributor-facing changes.

-
-

## Verification

- [ ] `bun run typecheck` passes
- [ ] `bun run test:run` passes (added/updated tests for new behavior)
- [ ] `bun run build` produces clean output
- [ ] `bun run lint:check` and `bun run format:check` pass

Briefly describe what you tested manually (if anything):

## Docs kept in sync

Tick whatever applies based on what changed:

- [ ] `README.md` — updated when adding/removing/renaming a public option, field, or method
- [ ] `SKILL.md` — updated when the change shifts an agent's decision (new mode, gotcha, deprecation)
- [ ] `AGENTS.md` — updated when contributor conventions changed
- [ ] JSDoc / inline types — updated where helpful

## Public API impact

- [ ] No public API changes
- [ ] Added something (back-compatible)
- [ ] Renamed / removed / changed signature (breaking — call out in description)

## Inertia interaction

Only relevant if the PR touches `intoProp`, `reloadProps`, or anything else that calls `router.*`:

- [ ] Still uses the public `@inertiajs/core` API (no reaching into internals like `setPage` / the `page` singleton)
- [ ] Works against both `@inertiajs/core@^2` and `@inertiajs/core@^3`

## Additional context

Anything reviewers should know — alternative approaches considered, follow-ups, screenshots, etc.
