import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair } from "jose";
import { signEmailVerificationJwt, verifyEmailVerificationJwt } from "../token.js";
import { createEmailVerification } from "../create.js";
import { MemoryVerificationStore } from "../store/memory.js";

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

test("createEmailVerification - start + confirm flow", async () => {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA");

  let sentLink = "";
  let verifiedUser = "";

  const ev = createEmailVerification({
    signingKey: privateKey,
    verificationKey: publicKey,
    kid: "k1",
    issuer: "test-app",
    ttlSeconds: 300,
    store: new MemoryVerificationStore(),
    sendEmail: async ({ link }) => { sentLink = link; },
    onVerified: async ({ userId }) => { verifiedUser = userId; },
    baseUrl: "http://localhost:3000",
  });

  const start = await ev.sendWeb(
    new Request("http://localhost:3000/verify", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", email: "test@example.com" }),
    }),
  );
  assert.equal(start.status, 200);
  const startBody = await start.json();
  assert.equal(startBody.ok, true);
  assert.ok(startBody.jti);
  assert.ok(sentLink.includes("/verify/confirm?token="));

  const token = new URL(sentLink).searchParams.get("token")!;
  const confirm = await ev.confirmWeb(
    new Request(`http://localhost:3000/verify/confirm?token=${token}`),
  );
  assert.equal(confirm.status, 200);
  const confirmBody = await confirm.json();
  assert.equal(confirmBody.ok, true);
  assert.equal(confirmBody.userId, "u1");
  assert.equal(confirmBody.email, "test@example.com");
  assert.equal(verifiedUser, "u1");

  const replay = await ev.confirmWeb(
    new Request(`http://localhost:3000/verify/confirm?token=${token}`),
  );
  const replayBody = await replay.json();
  assert.equal(replayBody.ok, false);
  assert.equal(replayBody.error, "already_used");
});

test("createEmailVerification - rejects missing fields", async () => {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA");
  const ev = createEmailVerification({
    signingKey: privateKey,
    verificationKey: publicKey,
    kid: "k1",
    issuer: "test",
    ttlSeconds: 300,
    store: new MemoryVerificationStore(),
    sendEmail: async () => {},
    baseUrl: "http://localhost:3000",
  });

  const res = await ev.sendWeb(
    new Request("http://localhost:3000/verify", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
});
