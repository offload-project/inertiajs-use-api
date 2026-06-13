---
name: inertiajs-use-api
description: Use when writing or reviewing code that calls JSON API routes (typically /api/*) from an Inertia.js + React app. Triggers on the `useApi` hook from the `inertiajs-use-api` package, or when the user wants form-like state (data/errors/processing/cancel) for a non-Inertia endpoint and optionally wants to pipe the response into Inertia page props readable via `usePage()`. Covers the one-time `configureUseApi` setup, the `intoProp` vs `reloadProps` decision, and common Laravel/XSRF gotchas.
---

# inertiajs-use-api

A React hook for calling JSON API endpoints from Inertia.js apps. Like Inertia's `useForm`, but for plain JSON routes.

## When to reach for this

- The user is in an Inertia + React project.
- The endpoint returns JSON (not a full Inertia page) — typically `/api/*`.
- They want `useForm`-style ergonomics: `data`, `errors`, `processing`, `cancel`, lifecycle callbacks.
- Optionally: they want the response to land in `usePage().props` so the rest of the page reads it like any other Inertia prop.

## When NOT to use it

- **Endpoint returns an Inertia page** (`Inertia::render(...)` on the server): use `useForm` or `router.post/visit` from `@inertiajs/react`.
- **Non-React adapter** (Vue, Svelte): this library is React-only.
- **You need caching, refetching, dedup, query keys**: TanStack Query / SWR fit better. `useApi` is one-shot per call.

## Quick start

Three steps to a working call:

**1. Install**

```sh
npm install inertiajs-use-api
# peer deps you should already have: @inertiajs/core@^2||^3, react@^18||^19
```

**2. Wire `configureUseApi` once at app boot** (e.g. `resources/js/app.tsx`)

Without this, `api.errors` will stay empty on validation failures.

```ts
import { configureUseApi } from "inertiajs-use-api";

configureUseApi({
  parseErrors: (body) => {
    const errs = (body as { errors?: Record<string, string[] | string> }).errors ?? {};
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(errs)) {
      flat[k] = Array.isArray(v) ? v[0]! : String(v);
    }
    return flat;
  },
  parseMessage: (body) => (body as { message?: string }).message ?? null,
});
```

**3. Use the hook in a component**

```tsx
import { useApi } from "inertiajs-use-api";

type Form = { name: string };
type User = { id: number; name: string };

function CreateUser() {
  const api = useApi<Form, User>({ name: "" });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const user = await api.post("/api/users");
          // `user` is typed as User; api.response is also set
        } catch {
          // ApiError thrown; api.errors is populated for UI
        }
      }}
    >
      <input
        value={api.data.name}
        onChange={(e) => api.setData("name", e.target.value)}
      />
      {api.errors.name && <span>{api.errors.name}</span>}
      <button disabled={api.processing}>Create</button>
    </form>
  );
}
```

That's it — everything below is options on top of this base.

## The two prop-integration modes

`useApi` exposes two ways to update Inertia page props after a successful response. Pick based on where the source of truth lives:

| Use `intoProp` (client-side write) when…              | Use `reloadProps` (server roundtrip) when…              |
| ----------------------------------------------------- | ------------------------------------------------------- |
| The API response already contains exactly the value   | The server computes the prop (auth scoping, derivation) |
| You want zero extra HTTP                              | You want server-side authorization on what's visible    |
| Throwaway / UI-only data                              | Persistent page state                                   |

Under the hood:
- `intoProp` → `router.replaceProp(name, () => response)` — public Inertia v2+ API, no roundtrip.
- `reloadProps` → `router.reload({ only: [...] })` — partial reload, normal Inertia semantics.

## One-time setup the user must do

`useApi` reads from a global config. **By default it does not parse errors.** If field errors don't show up in `api.errors`, this is almost always why.

Wire this once at app boot (usually `resources/js/app.tsx`):

```ts
import { configureUseApi } from "inertiajs-use-api";

configureUseApi({
  // Laravel-style 422 envelope; adjust for your backend
  parseErrors: (body) => {
    const errs = (body as { errors?: Record<string, string[] | string> }).errors ?? {};
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(errs)) {
      flat[k] = Array.isArray(v) ? v[0]! : String(v);
    }
    return flat;
  },
  parseMessage: (body) => (body as { message?: string }).message ?? null,

  // Wire to whatever toast library the app uses
  onSuccessToast: (toast) => /* fireToast({ type: "success", message: toast as string }) */,
  onErrorToast:   (toast) => /* fireToast({ type: "error",   message: toast as string }) */,
});
```

Other useful config keys: `baseUrl`, `defaultHeaders`, `getXsrfToken`, `xsrfHeaderName`, `onResponse`.

## The hook shape

```ts
const api = useApi<TForm, TResponse>(initialData);

// State
api.data           // TForm
api.errors         // Partial<Record<keyof TForm | string, string>>
api.hasErrors      // boolean
api.processing     // boolean — true while ANY request is in flight
api.response       // TResponse | null — last successful response body
api.wasSuccessful  // boolean
api.status         // number | null — HTTP status of last response

// Mutations
api.setData(field, value);            // or setData(partial)
api.reset();                           // back to initialData, clears state
api.clearErrors();
api.cancel();                          // aborts all in-flight requests

// Requests — return Promise<TResponse>, throw ApiError on non-2xx
await api.get   (url, options?);
await api.post  (url, options?);
await api.put   (url, options?);
await api.patch (url, options?);
await api.delete(url, options?);
await api.submit("post", url, options?);
```

## SubmitOptions

```ts
{
  data?:    Partial<TForm>;            // overrides the hook's data for this call
  params?:  Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  signal?:  AbortSignal;

  intoProp?:      string | ((response) => Record<string, unknown>);
  reloadProps?:   string | string[];
  reloadOptions?: Omit<ReloadOptions, "only">;

  successToast?: unknown;              // forwarded to configured onSuccessToast
  errorToast?:   unknown | false;      // false suppresses error toast for this call

  onBefore?:  () => void;
  onSuccess?: (response: TResponse) => void;
  onError?:   (errors, raw, status) => void;
  onFinish?:  () => void;              // always runs
}
```

## Typical component example

```tsx
import { useApi } from "inertiajs-use-api";

type Form = { name: string; email: string };
type User = { id: number; name: string; email: string };

function CreateUserForm() {
  const api = useApi<Form, User>({ name: "", email: "" });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.post("/api/users", {
            successToast: "User created",
            reloadProps: ["users"],
          });
        } catch {
          // ApiError thrown — api.errors is populated; UI re-renders
        }
      }}
    >
      <input
        value={api.data.name}
        onChange={(e) => api.setData("name", e.target.value)}
      />
      {api.errors.name && <span>{api.errors.name}</span>}
      <button disabled={api.processing}>Create</button>
    </form>
  );
}
```

## Common gotchas

- **Peer-dep is `@inertiajs/core@^2 || ^3`.** `router.replaceProp` was added in v2. Inertia v1 apps can't use `intoProp` (the rest of the hook still works).
- **`@inertiajs/react` is NOT a peer dep.** The library only depends on `@inertiajs/core`. Read updated props via `usePage()` from whatever adapter the app uses.
- **XSRF token defaults to the `XSRF-TOKEN` cookie** (Laravel convention), sent as `X-XSRF-TOKEN`. Override via `getXsrfToken` / `xsrfHeaderName` in `configureUseApi`.
- **All in-flight requests share `processing`.** `cancel()` aborts them all.
- **`router` is invoked only on success.** A failing request never calls `replaceProp` or `reload`.
- **`bun test` won't run the suite** — it uses Bun's runner, not vitest. Use `bun run test` (or `npm test`).
- **`ApiError` is thrown on non-2xx.** Wrap in try/catch only when you need to act beyond the populated `errors` (e.g. specific status handling).

## Quick decision tree

```
Need to call a JSON API route from an Inertia+React component?
├─ Just need the response in local state? → await api.get(url) → use api.response
├─ Need it visible to other components via usePage()?
│   ├─ Server should compute the value (auth, scoping)?       → reloadProps
│   └─ API response IS the value, want no extra roundtrip?    → intoProp
└─ Need both refresh + local response? → use both options together
```
