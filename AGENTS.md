# Agent guidance — inertiajs-use-api

A React hook for calling JSON API endpoints from Inertia.js apps. Pure-ESM library, no runtime deps, two peer deps (`react`, `@inertiajs/core`).

## Project layout

```
src/
├── index.ts        # barrel exports
├── use-api.ts      # the hook
├── configure.ts    # global config (parseErrors, toast handlers, XSRF, baseUrl)
├── errors.ts       # ApiError class
└── types.ts        # public types
tests/              # vitest + jsdom + @testing-library/react
SKILL.md            # Anthropic Skills file — for consumers' AI agents
```

## Development

```sh
bun install
bun run typecheck   # tsc --noEmit
bun run test:run    # vitest run — NOT `bun test`, which uses Bun's own runner
bun run test        # vitest watch
bun run build       # tsc → dist/
```

## Conventions to follow when modifying

- **The hook stays minimal.** Native `fetch` under the hood. Inertia's `router` is touched only for `intoProp` (`router.replaceProp`) and `reloadProps` (`router.reload`).
- **No app-specific behavior in the hook.** Anything backend-specific (error envelope shape, toast system, auth-token plumbing) goes through `configureUseApi`.
- **Don't import from `@inertiajs/react`.** It is not a peer dep. The library only depends on `@inertiajs/core`.
- **Use the public `replaceProp` API.** Don't reach into Inertia internals (`setPage`, the `page` singleton, etc.). The public API is stable since Inertia v2.
- **ESM only.** `tsconfig.json` uses `moduleResolution: Bundler`. Internal imports use `.js` suffixes so the emitted `dist/` works for both bundlers and Node ESM.
- **Add a test for every behavior change.** Tests mock both `globalThis.fetch` and `@inertiajs/core`'s `router` via `vi.mock`.

## When adding a new option

If you add a new `SubmitOptions` field or `configureUseApi` key, update:

1. `src/types.ts` (or `src/configure.ts` for global config)
2. `src/use-api.ts` (or the consumer)
3. `tests/use-api.test.tsx` — add a test that exercises it
4. `README.md` — both the prose example and the reference table
5. `SKILL.md` — only if the change is decision-shaping for an agent (new mode, gotcha, common mistake)

## Release flow

`.github/workflows/release.yml` runs on merged PRs:

1. `test` job — `bun install --frozen-lockfile`, `bun run typecheck`, `bun run test:run`
2. `release` job — `needs: test`. Uses `offload-project/release-champion` to publish to GitHub Packages.

`.github/workflows/test.yml` runs the same checks plus `bun run build` on every push and PR.

A failed `test` job blocks the publish.

## Things to avoid

- Adding runtime dependencies. The hook should stay zero-dep.
- Re-introducing toast/error logic that lived in the original `use-api.ts` (it was app-specific). Pluggable handlers only.
- Calling `setState` after the component unmounts. The existing `processing` reset already guards via in-flight refcounting; don't add unrelated state writes outside that pattern.
- Making the hook async-iterable or returning observables. Out of scope.
