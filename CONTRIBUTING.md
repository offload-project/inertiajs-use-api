# Contributing to inertiajs-use-api

Thanks for your interest in contributing. This guide covers everything you need to get changes landed.

> **Working on this with an AI agent (Claude Code, Cursor, Windsurf, etc.)?** Point it at [`AGENTS.md`](./AGENTS.md) — it has the same context in a format agents pick up automatically.

## Reporting issues

Please use the [issue templates](./.github/ISSUE_TEMPLATE):

- **Bug** — something doesn't work as documented
- **Feature** — a new option, config key, or method
- **Docs** — README / SKILL.md / AGENTS.md / inline types
- **General** — questions, discussion, anything else

Bug reports go fastest when you include the `configureUseApi` snippet, the exact `useApi` call, and the server response — the template will prompt you.

## Local setup

Prerequisites:

- [Bun](https://bun.sh/) (or Node 20+ if you'd rather use `npm` — both work)
- Git

```sh
git clone https://github.com/offload-project/inertiajs-use-api.git
cd inertiajs-use-api
bun install
```

## Day-to-day commands

```sh
bun run typecheck   # tsc --noEmit
bun run test        # vitest in watch mode
bun run test:run    # vitest run (single pass — used in CI)
bun run build       # emit ESM + .d.ts into dist/

bun run lint        # biome lint --write
bun run lint:check  # biome lint
bun run format      # biome format --write
bun run format:check
bun run apply       # biome check --write (lint + format together)
```

> Use `bun run test`, **not** `bun test` — the latter invokes Bun's own runner, which doesn't understand vitest/jsdom and the suite will appear to fail.

## Project layout

```
src/
├── index.ts        # barrel exports
├── use-api.ts      # the hook
├── configure.ts    # global config (parseErrors, toast handlers, XSRF, baseUrl)
├── errors.ts       # ApiError
└── types.ts        # public types
tests/              # vitest + jsdom + @testing-library/react
SKILL.md            # Anthropic Skill shipped to consumers' AI agents
AGENTS.md           # in-repo agent guidance (Cursor / Windsurf / Cline)
```

## Conventions

The library is intentionally narrow. PRs that broaden the scope without a clear reason will likely be asked to change.

- **The hook stays minimal.** Native `fetch` under the hood. Inertia's `router` is touched **only** for `intoProp` (`router.replaceProp`) and `reloadProps` (`router.reload`).
- **No backend-specific behavior in the hook.** Error envelope shape, toast formatting, auth-token plumbing — all pluggable via `configureUseApi`. Don't hardcode Laravel or any other backend's conventions.
- **Public Inertia API only.** Don't reach into internals (`setPage`, the `page` singleton, etc.). `router.replaceProp` is public since v2 and stable.
- **No runtime dependencies.** Peer deps only.
- **ESM only.** Internal imports use `.js` suffixes so the emitted `dist/` works for bundlers and Node ESM both.
- **Biome handles lint + format.** Run `bun run apply` before opening a PR.

## Tests

Add or update a test for **every behavior change**. The suite lives in `tests/`.

- `globalThis.fetch` is mocked per test (`vi.spyOn`).
- `@inertiajs/core` is mocked at module level (`vi.mock`) — `router.replaceProp` and `router.reload` are spies.
- React hooks are exercised with `renderHook` + `act` from `@testing-library/react`.

If you're not sure how to test something, open a draft PR and ask.

## Documentation

When you change public API, update docs in this order:

1. **`README.md`** — both the prose example and the reference table when adding/removing/renaming options
2. **`SKILL.md`** — only when the change shifts an agent's decision-making (a new mode, a gotcha, a deprecation). Skip for purely additive options that don't change which feature to reach for.
3. **`AGENTS.md`** — when contributor conventions change
4. **JSDoc / inline types** — where helpful

The PR template will remind you.

## Pull requests

1. Branch off `main`. Use a descriptive name (`fix/abort-leak`, `feat/intoProp-options`).
2. Make focused commits — easier to review and bisect later.
3. Before opening the PR:
   - `bun run typecheck`
   - `bun run test:run`
   - `bun run build`
   - `bun run apply` (lint + format)
4. Open the PR using the template. Fill in the Verification and Docs-kept-in-sync sections honestly — empty checkboxes are fine if N/A.
5. CI ([`.github/workflows/test.yml`](./.github/workflows/test.yml)) will run the same checks. A green test job is required.

## Release flow (for context)

Releases are cut by maintainers on PR merge via [`.github/workflows/release.yml`](./.github/workflows/release.yml), which:

1. Re-runs typecheck + tests against the merge commit (gates the release).
2. Publishes to GitHub Packages via `offload-project/release-champion`.

Contributors don't need to bump versions or edit changelogs — the release action handles it.

## Code of conduct

By participating in this project, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Reporting security issues

Don't open public issues for security vulnerabilities — see [`SECURITY.md`](./SECURITY.md) for the private reporting process.
