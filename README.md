<p style="text-align:center;">
    <img src="https://img.shields.io/github/package-json/v/offload-project/inertiajs-use-api" alt="version">
    <img alt="GitHub Actions Release Workflow Status" src="https://img.shields.io/github/actions/workflow/status/offload-project/inertiajs-use-api/release.yml?label=Build">
    <img alt="GitHub Actions Test Workflow Status" src="https://img.shields.io/github/actions/workflow/status/offload-project/inertiajs-use-api/test.yml?label=Test">
</p>

# inertiajs-use-api

A React hook for calling JSON API endpoints from [Inertia.js](https://inertiajs.com) apps. Like Inertia's `useForm`, but for plain JSON routes — with optional piping of responses back into Inertia page props.

```ts
const api = useApi<{ name: string }, User[]>({ name: "" });

// Pipe the response straight into page.props.users (client-side, no roundtrip):
await api.get("/api/users", { intoProp: "users" });

// Or trigger a partial reload from the server:
await api.post("/users", { reloadProps: ["users", "stats"] });
```

## Why

Inertia's built-in `router` and `useForm` are great for navigating between Inertia pages, but they expect Inertia responses. For plain JSON API routes (`/api/*`), you typically drop down to `fetch` and lose the ergonomics — processing flag, field errors, abort, lifecycle callbacks, etc.

`useApi` gives you that ergonomics back, and lets you pipe responses into Inertia page props when you want them to live in `usePage()` alongside server-rendered data.

## Install

```sh
npm install inertiajs-use-api
```

Peer dependencies:

- `@inertiajs/core@^2 || ^3`
- `react@^18 || ^19`

## Quick start

```tsx
import { useApi } from "inertiajs-use-api";

type Form = { name: string; email: string };
type User = { id: number; name: string; email: string };

function CreateUserForm() {
  const api = useApi<Form, User>({ name: "", email: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await api.post("/api/users", {
        successToast: "User created",
        reloadProps: ["users"],
      });
      // user is the typed response body
    } catch {
      // ApiError thrown — api.errors is populated
    }
  };

  return (
    <form onSubmit={submit}>
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

## Inertia prop integration

### `intoProp` — write the response into `page.props` client-side

Uses `router.replaceProp` under the hood (no server roundtrip). The data flows straight into `usePage().props`.

```tsx
import { useApi } from "inertiajs-use-api";
import { usePage } from "@inertiajs/react";

function UserList() {
  const api = useApi<{}, User[]>({});

  useEffect(() => {
    api.get("/api/users", { intoProp: "users" });
  }, []);

  const { users } = usePage<{ users: User[] }>().props;
  return <ul>{users?.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

You can also map a single response into multiple props:

```tsx
await api.get("/api/dashboard", {
  intoProp: (res) => ({ users: res.users, stats: res.stats }),
});
```

### `reloadProps` — refresh props from the server

Uses `router.reload({ only })`. The server is the source of truth.

```tsx
await api.post("/api/users", { reloadProps: ["users", "stats"] });
```

Pass extra options via `reloadOptions` (anything Inertia's `ReloadOptions` accepts, except `only`):

```tsx
await api.post("/api/users", {
  reloadProps: "users",
  reloadOptions: { preserveScroll: true },
});
```

### Choosing between them

| Use `intoProp` when…                                         | Use `reloadProps` when…                                 |
|--------------------------------------------------------------|---------------------------------------------------------|
| The API endpoint already returns the data you want in props. | The server computes the props (auth filters, scoping…). |
| You want to avoid an extra HTTP request.                     | You want server-side validation of what the user sees.  |
| You're piping into client-only state.                        | You want Inertia's normal partial-reload semantics.     |

## Configuration

Configure the library once at app boot — the hook reads from a global config so calls stay terse.

```ts
// app.tsx
import { configureUseApi } from "inertiajs-use-api";

configureUseApi({
  // Optional base URL for relative paths
  baseUrl: "/",

  // Parse your backend's error envelope into a flat { field: message } map
  parseErrors: (body) => {
    const errs = (body as { errors?: Record<string, string[] | string> }).errors ?? {};
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(errs)) {
      flat[k] = Array.isArray(v) ? v[0]! : String(v);
    }
    return flat;
  },

  // Extract a human-readable message (used as the default error toast text)
  parseMessage: (body) => (body as { message?: string }).message ?? null,

  // Wire your toast/notification system
  onSuccessToast: (toast) => fireToast({ type: "success", message: toast as string }),
  onErrorToast: (toast) => fireToast({ type: "error", message: toast as string }),

  // Optional: inspect every response body (e.g. to extract a server-side toast envelope)
  onResponse: (body, status, ok) => {
    const alerts = (body as { toastAlerts?: ToastMessage[] })?.toastAlerts;
    if (alerts?.length) fireToasts(alerts);
  },
});
```

### Config reference

| Option           | Type                                       | Default                   |
|------------------|--------------------------------------------|---------------------------|
| `baseUrl`        | `string`                                   | `undefined`               |
| `defaultHeaders` | `Record<string, string>`                   | `undefined`               |
| `getXsrfToken`   | `() => string \| null`                     | reads `XSRF-TOKEN` cookie |
| `xsrfHeaderName` | `string`                                   | `"X-XSRF-TOKEN"`          |
| `parseErrors`    | `(body, status) => Record<string, string>` | returns `{}`              |
| `parseMessage`   | `(body, status) => string \| null`         | returns `null`            |
| `onSuccessToast` | `(toast: unknown) => void`                 | no-op                     |
| `onErrorToast`   | `(toast: unknown) => void`                 | no-op                     |
| `onResponse`     | `(body, status, ok) => void`               | no-op                     |

## API

### `useApi<TForm, TResponse>(initialData?)`

Returns an object with:

| Field                       | Type                                                       |
|-----------------------------|------------------------------------------------------------|
| `data`                      | `TForm`                                                    |
| `setData`                   | `(field \| partial, value?) => void`                       |
| `errors`                    | `Partial<Record<keyof TForm \| string, string>>`           |
| `hasErrors`                 | `boolean`                                                  |
| `processing`                | `boolean`                                                  |
| `response`                  | `TResponse \| null`                                        |
| `wasSuccessful`             | `boolean`                                                  |
| `status`                    | `number \| null`                                           |
| `reset`                     | `() => void`                                               |
| `clearErrors`               | `() => void`                                               |
| `cancel`                    | `() => void` — aborts all in-flight requests for this hook |
| `submit`                    | `(method, url, options?) => Promise<TResponse>`            |
| `get/post/put/patch/delete` | `(url, options?) => Promise<TResponse>`                    |

### `SubmitOptions`

| Option          | Type                                                               | Notes                                                                   |
|-----------------|--------------------------------------------------------------------|-------------------------------------------------------------------------|
| `data`          | `Partial<TForm>`                                                   | Overrides the hook's `data` body                                        |
| `params`        | `Record<string, string \| number \| boolean \| null \| undefined>` | Query string. `null`/`undefined` values are skipped                     |
| `headers`       | `Record<string, string>`                                           | Merged on top of defaults                                               |
| `signal`        | `AbortSignal`                                                      | Aborting it (or calling `cancel()`) aborts the request                  |
| `intoProp`      | `string \| (response) => Record<string, unknown>`                  | Writes into `page.props` via `router.replaceProp`                       |
| `reloadProps`   | `string \| string[]`                                               | After success, triggers `router.reload({ only })`                       |
| `reloadOptions` | `Omit<ReloadOptions, "only">`                                      | Extra options forwarded to `router.reload`                              |
| `successToast`  | `unknown`                                                          | Forwarded to `onSuccessToast`                                           |
| `errorToast`    | `unknown \| false`                                                 | Forwarded to `onErrorToast`. `false` suppresses the toast for this call |
| `onBefore`      | `() => void`                                                       |                                                                         |
| `onSuccess`     | `(response: TResponse) => void`                                    |                                                                         |
| `onError`       | `(errors, raw, status) => void`                                    |                                                                         |
| `onFinish`      | `() => void`                                                       | Always called                                                           |

### `ApiError`

Thrown on non-2xx responses.

```ts
import { ApiError } from "inertiajs-use-api";

try {
  await api.post("/api/users");
} catch (e) {
  if (e instanceof ApiError) {
    console.log(e.status, e.message, e.body);
  }
}
```

## Notes

- The hook uses native `fetch` and reads/writes Inertia state only when you ask it to (`intoProp`, `reloadProps`).
- `@inertiajs/react` is **not** a peer dep — only `@inertiajs/core` is. Use whichever Inertia adapter your app uses to read updated props.
- All in-flight requests for a given hook share `processing` and can be cancelled together via `cancel()`.

## For AI agents

This package ships an [Anthropic Skill](https://docs.claude.com/en/docs/agents-and-tools/skills) at the package root so coding agents (Claude Code, Claude.ai) can use the library correctly without needing to grep through source.

The skill covers when to reach for `useApi` vs `useForm`, the `intoProp` vs `reloadProps` decision, the one-time `configureUseApi` wiring an app needs, and common Laravel/XSRF gotchas.

**To install it for Claude Code:**

```sh
mkdir -p ~/.claude/skills/inertiajs-use-api
cp node_modules/inertiajs-use-api/SKILL.md ~/.claude/skills/inertiajs-use-api/SKILL.md
```

Or symlink it so it stays in sync with package upgrades:

```sh
ln -s "$PWD/node_modules/inertiajs-use-api/SKILL.md" ~/.claude/skills/inertiajs-use-api/SKILL.md
```

Contributors hacking on the library itself should read [`AGENTS.md`](./AGENTS.md) — picked up automatically by Cursor, Windsurf, Cline, and similar in-repo agents.

## License

MIT
