## DMAIC + review-driven dev loop (practical)

AGPL-3.0-or-later

This repo is structured to support a tight, reviewable, low-defect iteration cycle.

### Define
- Define the verification contract in `spec/` (claims, invariants, failure modes).

### Measure
- Conformance is measured by:
  - unit tests in each language package
  - shared invariants (typ/aud/purpose/exp checks, one-time store semantics)

### Analyze
- When a test fails, perform 5-Whys on:
  - claim mismatch?
  - algorithm mismatch?
  - clock skew?
  - store atomicity?

### Improve
- Prefer spec changes + conformance tests before refactors.

### Control
- Keep adapters small:
  - token logic isolated
  - provider isolated
  - store isolated

