# Security Policy

## Supported versions

Security fixes are applied to the latest minor of the current major release.

| Version              | Supported           |
| -------------------- | ------------------- |
| latest `1.x`         | ✅                  |
| older `1.x` minors   | ❌ (please upgrade) |

When a new major (`2.x`) ships, the previous major will continue to receive security fixes for at least 6 months. This table will be updated at that time.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.**

Use [GitHub Security Advisories](https://github.com/offload-project/inertiajs-use-api/security/advisories/new) to report privately. This lets us discuss, fix, and coordinate disclosure before details become public.

When reporting, please include:

- A description of the issue and its potential impact.
- Steps to reproduce, or a minimal proof-of-concept.
- Affected versions (if known).
- Any suggested fix or mitigation (optional).

## Response expectations

- **Acknowledgement:** within 5 business days.
- **Initial assessment:** within 10 business days.
- **Fix timeline:** depends on severity. Critical issues get prioritized; lower-severity issues may be batched into the next regular release.

We'll keep you updated on progress and credit you in the advisory unless you'd prefer to stay anonymous.

## Scope

Things in scope for this project:

- Vulnerabilities in the `useApi` hook, `configureUseApi`, or any exported code.
- Issues that could expose XSRF tokens, leak request/response data across components, or allow malicious responses to corrupt Inertia page state.
- Type-system issues that produce unsafe runtime behavior.

Things **not** in scope (please report upstream instead):

- Vulnerabilities in `@inertiajs/core`, `react`, or other peer/transitive dependencies — please file with the respective project.
- Backend application vulnerabilities — those belong with the application maintainers.
- Issues caused by misconfiguration in a consuming app (e.g., a `parseErrors` implementation that returns unsanitized HTML).

## Disclosure

Once a fix is published, we will:

1. Publish a GitHub Security Advisory with details and credit.
2. Tag a patch release.
3. Update the changelog with a brief mention (without exploit details prior to the disclosure window).

Thanks for helping keep the project and its users safe.
