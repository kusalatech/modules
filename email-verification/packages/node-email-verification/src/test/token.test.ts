import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair } from "jose";
import { signEmailVerificationJwt, verifyEmailVerificationJwt } from "../token.js";

test("sign/verify round-trip (alg=Ed25519)", async () => {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA");

  const { token, claims } = await signEmailVerificationJwt({
    privateKey,
    kid: "k1",
    userId: "user-123",
    email: "USER@Example.com",
    config: { issuer: "kusala-studio", ttlSeconds: 300 },
  });

  const verified = await verifyEmailVerificationJwt({
    token,
    publicKey,
    expected: { issuer: "kusala-studio" },
  });

  assert.equal(verified.sub, "user-123");
  assert.equal(verified.email, "user@example.com");
  assert.equal(verified.jti, claims.jti);
  assert.equal(verified.purpose, "email_verification");
});

