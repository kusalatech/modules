import type pg from "pg";

export type VerificationPurpose = "email_verification";

export type SigningConfig = {
  issuer: string;
  audience?: "email-verify";
  typ?: "KUSALA-EMAIL-VERIFY+JWT";
  ttlSeconds: number;
  clockSkewSeconds?: number;
};

export type VerificationClaims = {
  iss: string;
  aud: "email-verify";
  sub: string;
  email: string;
  jti: string;
  iat: number;
  exp: number;
  purpose: VerificationPurpose;
  nonce?: string;
};

export type VerificationRecord = {
  jti: string;
  userId: string;
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type VerificationStore = {
  create(params: {
    jti: string;
    userId: string;
    email: string;
    expiresAt: Date;
  }): Promise<void>;

  consume(params: { jti: string; now?: Date }): Promise<
    | { ok: true; record: VerificationRecord }
    | { ok: false; reason: "not_found" | "expired" | "already_used" }
  >;
};

export type EmailMessage = {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
};

export type EmailProvider = {
  send(message: EmailMessage): Promise<{ provider: string; messageId?: string }>;
};

export type EmailVerificationConfig = {
  signingKey: CryptoKey;
  verificationKey: CryptoKey;
  kid: string;
  issuer: string;
  ttlSeconds?: number;
  store?: VerificationStore;
  connectionString?: string;
  pool?: pg.Pool;
  sendEmail: (params: { to: string; link: string; subject?: string }) => Promise<void>;
  onVerified?: (params: { userId: string; email: string }) => Promise<void>;
  baseUrl: string;
  confirmPath?: string;
};

export type VerificationResult =
  | { ok: true; jti: string }
  | { ok: false; error: string };

export type ConfirmationResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; error: string };
