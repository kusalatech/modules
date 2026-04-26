import express from "express";
import { generateKeyPair } from "jose";
import nodemailer from "nodemailer";
import {
  signEmailVerificationJwt,
  verifyEmailVerificationJwt,
  PostgresVerificationStore,
} from "@kusala/email-verification";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://kusala:kusala@postgres:5432/kusala_dev";

const ISSUER = process.env.ISSUER ?? "kusala-studio";
const FROM_EMAIL = process.env.FROM_EMAIL ?? "no-reply@kusala.local";
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const SMTP_HOST = process.env.SMTP_HOST ?? "mailpit";
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025;

// Demo-only: ephemeral keypair. For real use, load stable keys from env/secret store.
const { publicKey, privateKey } = await generateKeyPair("EdDSA");
const kid = "demo-k1";

const store = new PostgresVerificationStore({ connectionString: DATABASE_URL });
const smtp = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
});

const app = express();
app.use(express.json());

app.post("/start", async (req, res) => {
  const { userId, email } = req.body ?? {};
  if (!userId || !email) return res.status(400).json({ error: "userId and email required" });

  const { token, claims } = await signEmailVerificationJwt({
    privateKey,
    kid,
    userId: String(userId),
    email: String(email),
    config: { issuer: ISSUER, ttlSeconds: 60 * 30 },
  });

  const expiresAt = new Date(claims.exp * 1000);
  await store.create({ jti: claims.jti, userId: claims.sub, email: claims.email, expiresAt });

  const link = `${BASE_URL}/confirm?token=${encodeURIComponent(token)}`;
  await smtp.sendMail({
    to: claims.email,
    from: FROM_EMAIL,
    subject: "Verify your email",
    text: `Click to verify: ${link}`,
  });

  res.json({ ok: true, jti: claims.jti, link });
});

app.get("/confirm", async (req, res) => {
  const token = req.query.token ? String(req.query.token) : "";
  if (!token) return res.status(400).send("missing token");

  const claims = await verifyEmailVerificationJwt({
    token,
    publicKey,
    expected: { issuer: ISSUER },
  });

  const consumed = await store.consume({ jti: claims.jti });
  if (!consumed.ok) return res.status(400).json(consumed);

  // Host app would mark user verified here.
  res.json({ ok: true, verified: true, userId: claims.sub, email: claims.email });
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`node-demo listening on ${BASE_URL}`);
});

