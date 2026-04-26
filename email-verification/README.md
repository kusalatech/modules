# Kusala Studio – Email Verification Kit

AGPL-3.0-or-later

This repository provides a **spec-first, interoperable email-verification flow** that can be integrated into:

- Node.js applications
- Django (Python) applications

It is designed to start with **SendGrid** while keeping a clean provider adapter boundary so additional providers can be added later.

## Structure

- `spec/`: Canonical, language-agnostic contract + test vectors
- `packages/node-email-verification/`: Node.js implementation
- `packages/python-email-verification/`: Python implementation (Django-friendly)

## Status

Working core is implemented:

- **Token**: JWS compact (Ed25519, JOSE `alg: "Ed25519"`)
- **Stores**: in-memory + Postgres-backed one-time `jti` consume
- **Providers**: SendGrid adapter + dev `ConsoleEmailProvider`
- **Dev infra**: Podman `compose.yaml` includes Postgres + Mailpit

## Local development (Podman)

Bring up infra + demo services:

```bash
podman compose up -d --build
```

Check:

```bash
make dev-ps
```

Bring down:

```bash
make dev-down
```

Mailpit UI is on `http://localhost:8025`.

### Demo endpoints

- **Node demo**: `http://localhost:3000`
  - `POST /start` body: `{"userId":"u1","email":"u1@example.com"}`
  - `GET /confirm?token=...`
- **Django demo**: `http://localhost:8000`
  - `POST /start` body: `{"userId":"u1","email":"u1@example.com"}`
  - `GET /confirm?token=...`

