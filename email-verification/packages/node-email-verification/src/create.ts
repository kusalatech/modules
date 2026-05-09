import type {
  EmailVerificationConfig,
  VerificationResult,
  ConfirmationResult,
  VerificationStore,
} from "./types.js";
import { signEmailVerificationJwt, verifyEmailVerificationJwt } from "./token.js";
import { PostgresVerificationStore } from "./store/postgres.js";
import type { IncomingMessage, ServerResponse } from "node:http";

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function createEmailVerification(config: EmailVerificationConfig) {
  const {
    signingKey,
    verificationKey,
    kid,
    issuer,
    ttlSeconds = 1800,
    sendEmail,
    onVerified,
    baseUrl,
    confirmPath = "/verify/confirm",
  } = config;

  const resolvedStore: VerificationStore =
    config.store
    ?? (config.pool
      ? new PostgresVerificationStore({ pool: config.pool })
      : config.connectionString
        ? new PostgresVerificationStore({ connectionString: config.connectionString })
        : new PostgresVerificationStore({ connectionString: "" }));

  async function startVerification(params: {
    userId: string;
    email: string;
  }): Promise<VerificationResult> {
    const { userId, email } = params;
    if (!userId || !email) {
      return { ok: false, error: "userId and email required" };
    }

    const { token, claims } = await signEmailVerificationJwt({
      privateKey: signingKey,
      kid,
      userId: String(userId),
      email: String(email),
      config: { issuer, ttlSeconds },
    });

    const expiresAt = new Date(claims.exp * 1000);
    await resolvedStore.create({
      jti: claims.jti,
      userId: claims.sub,
      email: claims.email,
      expiresAt,
    });

    const link = `${baseUrl}${confirmPath}?token=${encodeURIComponent(token)}`;
    await sendEmail({ to: claims.email, link })

    return { ok: true, jti: claims.jti };
  }

  async function confirmVerification(params: {
    token: string;
  }): Promise<ConfirmationResult> {
    const { token } = params;
    if (!token) {
      return { ok: false, error: "missing token" };
    }

    let claims;
    try {
      claims = await verifyEmailVerificationJwt({
        token,
        publicKey: verificationKey,
        expected: { issuer },
      });
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }

    const consumed = await resolvedStore.consume({ jti: claims.jti });
    if (!consumed.ok) {
      return { ok: false, error: consumed.reason };
    }

    if (onVerified) {
      await onVerified({ userId: claims.sub, email: claims.email });
    }

    return { ok: true, userId: claims.sub, email: claims.email };
  }

  function sendExpress(req: IncomingMessage, res: ServerResponse) {
    readBody(req).then(async (body) => {
      let parsed: { userId?: string; email?: string };
      try {
        parsed = JSON.parse(body);
      } catch {
        json(res, 400, { ok: false, error: "invalid json body" });
        return;
      }
      const result = await startVerification({
        userId: parsed.userId ?? "",
        email: parsed.email ?? "",
      });
      json(res, result.ok ? 200 : 400, result);
    });
  }

  function confirmExpress(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const token = url.searchParams.get("token") ?? "";
    confirmVerification({ token }).then((result) => {
      json(res, result.ok ? 200 : 400, result);
    });
  }

  async function sendWeb(request: Request): Promise<Response> {
    let parsed: { userId?: string; email?: string };
    try {
      parsed = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "invalid json body" },
        { status: 400 },
      );
    }
    const result = await startVerification({
      userId: parsed.userId ?? "",
      email: parsed.email ?? "",
    });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }

  async function confirmWeb(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const result = await confirmVerification({ token });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }

  return {
    send: sendExpress,
    confirm: confirmExpress,
    sendWeb,
    confirmWeb,
  };
}
