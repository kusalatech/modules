import express from "express";
import { generateKeyPair } from "jose";
import { createEmailVerification } from "@kusala/email-verification";
import nodemailer from "nodemailer";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://kusala:kusala@postgres:5432/kusala_dev";
const ISSUER = process.env.ISSUER ?? "kusala-studio";
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "no-reply@kusala.local";
const SMTP_HOST = process.env.SMTP_HOST ?? "mailpit";
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025;

const { publicKey, privateKey } = await generateKeyPair("EdDSA");

const smtp = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: false });

const verify = createEmailVerification({
  signingKey: privateKey,
  verificationKey: publicKey,
  kid: "demo-k1",
  issuer: ISSUER,
  connectionString: DATABASE_URL,
  sendEmail: async ({ to, link }) => {
    await smtp.sendMail({ to, from: FROM_EMAIL, subject: "Verify your email", text: `Click: ${link}` });
  },
  baseUrl: BASE_URL,
});

const app = express();
app.use(express.json());
app.post("/start", verify.send);
app.get("/confirm", verify.confirm);
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`node-demo on ${BASE_URL}`));
