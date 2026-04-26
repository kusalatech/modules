## Email Verification Token Contract (Interop Spec)

License: AGPL-3.0-or-later

### Purpose

This specification defines a **portable, cross-language** email verification token format and the required validation rules so both Node.js and Django (Python) implementations behave identically.

This is **not** a session token spec. Tokens are single-use and require server-side storage to prevent replay.

### Format

- **JWS Compact Serialization** (three dot-separated base64url sections)
- Signed with **Ed25519** keys using JOSE `kty: "OKP"`, `crv: "Ed25519"`

#### JOSE header (protected)

Implementations MUST:
- pin the algorithm list in verification code (do not accept algorithm negotiation)
- reject unknown `typ`

Header fields:
- `alg`: `"Ed25519"` (fully-specified per RFC 9864; preferred)
- `typ`: `"KUSALA-EMAIL-VERIFY+JWT"`
- `kid`: key identifier string (required for key rotation)

Note: Some JOSE libraries still accept the deprecated polymorphic `alg: "EdDSA"` (RFC 8037), but new implementations SHOULD use `alg: "Ed25519"` (RFC 9864).

#### Payload claims

All timestamps use NumericDate (seconds since epoch) for widest library compatibility.

Required claims:
- `iss`: string (issuer; e.g. `"kusala-studio"`)
- `aud`: string (audience; e.g. `"email-verify"`)
- `sub`: string (user identifier)
- `email`: string (email address to verify; lowercase normalization recommended)
- `jti`: string (unique token id; used for one-time storage)
- `iat`: number (issued-at, NumericDate)
- `exp`: number (expiry, NumericDate)
- `purpose`: string, MUST equal `"email_verification"`

Optional claims:
- `nonce`: string (if you want extra binding to a UI flow)

Validation rules:
- signature verifies with the key selected by `kid`
- `typ` matches exactly
- `purpose === "email_verification"`
- `aud === "email-verify"`
- `exp` is in the future (clock skew allowance permitted; recommend 60s)
- `iat` is not unreasonably far in the future (recommend <= 60s skew)
- `email` matches the email on the server-side one-time record for `jti` (defense-in-depth)

### One-time use (replay protection)

Implementations MUST store a one-time record keyed by `jti` and MUST atomically mark it consumed.

On successful confirm:
- mark record as used (set `used_at`)
- mark user email as verified (outside the scope of this spec)

