# Kusala Modules — Project Standards

## Commit Convention

We use **Conventional Commits** (`type(scope): description`).

### Types

| Type     | When to use                                       |
|----------|---------------------------------------------------|
| `feat`   | New capability for consumers (library API, stores, providers, handlers) |
| `fix`    | Bug fix                                           |
| `refactor` | Internal restructuring — no consumer-visible change |
| `docs`   | Spec, README, AGENTS.md, or inline doc changes     |
| `test`   | Adding or updating tests                          |
| `chore`  | Tooling, CI, dependencies, non-code project config |
| `style`  | Formatting, whitespace — no logic change           |

### Scope

Use the package or subsystem name: `node-pkg`, `python-pkg`, `node-demo`, `django-demo`, `openspec`, `spec`.

### Message body

Explain **why** (not what). Reference OpenSpec requirements where relevant. Keep body lines under 72 chars.

```
feat(node-pkg): add createEmailVerification() one-call factory

The old API required hosts to manually wire signJwt → store.create → sendEmail
across every route handler. The new factory encapsulates all orchestration:

    const verify = createEmailVerification({ signingKey, store, sendEmail, baseUrl })
    app.post('/verify', verify.send)

Closes R4 (Library API) and R5 (Minimal Boilerplate) from the OpenSpec spec.
```

## Code Standards

### Language & Runtime
- **TypeScript** — strict mode, ES2022 target, ESM only (`"type": "module"`)
- **Node** >= 20 (Ed25519 Web Crypto API is experimental before 20)

### Style
- No semicolons (unless required for ASI safety)
- Single quotes
- 2-space indent
- No JSDoc/TSDoc comments on internal code; type signature IS the documentation
- Use `const` and `let` — never `var`
- Prefer `Map`/`Set` over plain objects for dictionaries
- Top-level `await` is fine in ESM modules (Node >= 16.12)

### Architecture

```
┌──────────────────────────────────────────────────┐
│                  Host App (Express/Next.js)       │
│  createEmailVerification({ keys, store, send })   │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│              @kusala/email-verification            │
│                                                    │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Token   │  │    Store     │  │   Provider  │ │
│  │ sign/    │  │  create/     │  │  send()     │ │
│  │ verify   │  │  consume     │  │             │ │
│  └──────────┘  └──────┬───────┘  └─────────────┘ │
│                       │                            │
│                       ▼                            │
│              ┌──────────────┐                     │
│              │   Schema     │                     │
│              │  (auto-mig)  │                     │
│              └──────────────┘                     │
└───────────────────────────────────────────────────┘
```

### Key patterns
- **Factory functions** (`createX(config)`) over classes for public API — simpler tree-shaking, easier mocking
- **Store interface** `VerificationStore` — implement to support any backend
- **No SDK lock-in** — use native `fetch` for API calls, avoid heavy SDK deps
- **Auto-migrate** by default — idempotent `CREATE TABLE IF NOT EXISTS` so host apps don't need manual schema setup

### Testing
- Use Node's built-in `node:test` + `node:assert/strict` — no test framework dependency
- Test the **public API** through Web API handlers (`sendWeb`/`confirmWeb`) — not internal implementation
- Integration tests: full sign → store → verify → consume → reject replay

## OpenSpec Workflow

- Source-of-truth specs live in `openspec/specs/`
- Active changes in `openspec/changes/`
- Use `/opsx:propose`, `/opsx:apply`, `/opsx:archive` to manage changes
- Specs define requirements with **Scenarios** (GIVEN/WHEN/THEN)
- Deltas are ADDED/MODIFIED/REMOVED relative to main specs

## Dependency Guidelines

- Minimize runtime deps — prefer Node built-ins (`node:crypto`, `node:test`, `node:http`)
- When an HTTP client is needed, prefer native `fetch` (Node >= 18)
- When a DB client is needed, prefer `pg` (not an ORM) for the built-in store — ORM adapters live in host app
