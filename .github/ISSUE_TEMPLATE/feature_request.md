---
name: Feature Request
about: Suggest a new feature or improvement
title: "[Feature]: "
labels: enhancement
assignees: ''
---

### Feature Description
What feature would you like to see?

### Why Is This Needed?
What problem are you trying to solve? A concrete use-case example helps a lot.

### Scope
What part of the library would this touch?

- [ ] New `SubmitOptions` field (per-call option)
- [ ] New `configureUseApi` key (global config / pluggable adapter)
- [ ] New field on the `UseApi` return object
- [ ] New method on the hook
- [ ] Inertia integration (`intoProp` / `reloadProps` behavior)
- [ ] Types only
- [ ] Tooling / build / docs
- [ ] Other:

### Inertia interaction
Does this feature need to call `router.replaceProp`, `router.reload`, or otherwise interact with Inertia page state? If yes, briefly describe how.

### Suggested API
A snippet of how the feature would be called. Even a rough sketch is useful.

```ts
// example
```

### Compatibility check
Reviewers will weigh proposals against the library's stance:

- The hook stays minimal — native `fetch` under the hood, Inertia router touched only for `intoProp` / `reloadProps`.
- Backend-specific behavior (error envelope shape, toast formatting, auth-token plumbing) stays pluggable via `configureUseApi` rather than baked into the hook.
- No runtime dependencies beyond the existing peer deps.

If your proposal might bend any of these, please call out why the tradeoff is worth it.

### Additional Context
Links, related issues, prior art in other libraries, etc.
