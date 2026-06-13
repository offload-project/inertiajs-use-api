---
name: Bug Report
about: Report a bug
title: "[Bug]: "
labels: bug
assignees: ''
---

### Description
A clear and concise description of the bug.

### Expected Behavior
What you expected to happen.

### Actual Behavior
What actually happened. Include the full error message / stack trace if any.

### Reproduction

**Your `configureUseApi` setup** (or "not configured")
```ts
// paste the configureUseApi({...}) call from your app boot
```

**The `useApi` call that's failing**
```ts
// const api = useApi<Form, Response>({ ... });
// await api.post("/api/...", { ... });
```

**Endpoint type**
- [ ] Plain JSON API route (e.g. `/api/*`)
- [ ] Inertia route (returns `Inertia::render(...)`)

**Server response**
- Status code:
- Response body (sanitized):
```json
{}
```

**Are `intoProp` or `reloadProps` involved?** Yes / No — if yes, paste the option.

### Environment

**Package versions** (must-have)
- `inertiajs-use-api`:
- `@inertiajs/core`:
- `react`:

**Browser / runtime**
- Browser + version:
- OS:
- Node version (only if SSR is in play):

**Build setup**
- Backend framework + version (e.g. Laravel 11):
- Bundler (Vite / Webpack / Next.js / Remix / ...):
- Package manager (bun / npm / pnpm / yarn):
- TypeScript version (only if it's a type error):

### Minimal repro (optional but very helpful)
Link to a minimal reproduction repo, sandbox, or a failing test case.

### Additional Context
Anything else — Inertia adapter (`@inertiajs/react` / other), relevant middleware, recent upgrades, etc.
