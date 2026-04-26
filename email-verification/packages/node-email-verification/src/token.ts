import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import type { SigningConfig, VerificationClaims } from "./types.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function nowSeconds(now = new Date()): number {
  return Math.floor(now.getTime() / 1000);
}

export function createJti(): string {
  // URL-safe, compact, unique enough for one-time tokens.
  return nanoid(21);
}

export async function signEmailVerificationJwt(params: {
  privateKey: CryptoKey;
  kid: string;
  userId: string;
  email: string;
  config: SigningConfig;
  now?: Date;
  nonce?: string;
}): Promise<{ token: string; claims: VerificationClaims }> {
  const {
    privateKey,
    kid,
    userId,
    email,
    config,
    now = new Date(),
    nonce,
  } = params;

  const iat = nowSeconds(now);
  const exp = iat + config.ttlSeconds;

  const claims: VerificationClaims = {
    iss: config.issuer,
    aud: config.audience ?? "email-verify",
    sub: userId,
    email: normalizeEmail(email),
    jti: createJti(),
    iat,
    exp,
    purpose: "email_verification",
    ...(nonce ? { nonce } : {}),
  };

  const token = await new SignJWT(claims)
    .setProtectedHeader({
      alg: "Ed25519",
      typ: config.typ ?? "KUSALA-EMAIL-VERIFY+JWT",
      kid,
    })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setIssuer(claims.iss)
    .setAudience(claims.aud)
    .setSubject(claims.sub)
    .sign(privateKey);

  return { token, claims };
}

export async function verifyEmailVerificationJwt(params: {
  token: string;
  publicKey: CryptoKey;
  expected: {
    issuer: string;
    audience?: "email-verify";
    typ?: "KUSALA-EMAIL-VERIFY+JWT";
    clockSkewSeconds?: number;
  };
  now?: Date;
}): Promise<VerificationClaims> {
  const { token, publicKey, expected, now = new Date() } = params;

  const { payload, protectedHeader } = await jwtVerify(token, publicKey, {
    issuer: expected.issuer,
    audience: expected.audience ?? "email-verify",
    typ: expected.typ ?? "KUSALA-EMAIL-VERIFY+JWT",
    clockTolerance: expected.clockSkewSeconds ?? 60,
    currentDate: now,
    algorithms: ["Ed25519"],
  });

  const purpose = payload["purpose"];
  if (purpose !== "email_verification") {
    throw new Error("Invalid token purpose");
  }

  // Ensure we have the required claims with expected types.
  const claims: VerificationClaims = {
    iss: String(payload.iss),
    aud: "email-verify",
    sub: String(payload.sub),
    email: String(payload.email),
    jti: String(payload.jti),
    iat: Number(payload.iat),
    exp: Number(payload.exp),
    purpose: "email_verification",
    ...(payload.nonce ? { nonce: String(payload.nonce) } : {}),
  };

  // Defense-in-depth: require kid presence for key-rotation discipline.
  if (!protectedHeader.kid) {
    throw new Error("Missing kid");
  }

  return claims;
}

