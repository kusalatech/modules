import pg from "pg";
import type { VerificationRecord, VerificationStore } from "../types.js";

const { Pool } = pg;

export type PostgresStoreConfig = {
  connectionString: string;
  tableName?: string;
};

export class PostgresVerificationStore implements VerificationStore {
  private pool: pg.Pool;
  private tableName: string;

  constructor(config: PostgresStoreConfig) {
    this.pool = new Pool({ connectionString: config.connectionString });
    this.tableName = config.tableName ?? "email_verification_tokens";
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async create(params: {
    jti: string;
    userId: string;
    email: string;
    expiresAt: Date;
  }): Promise<void> {
    const { jti, userId, email, expiresAt } = params;
    const q = `
      insert into ${this.tableName} (jti, user_id, email, expires_at)
      values ($1, $2, $3, $4)
      on conflict (jti) do nothing
    `;
    await this.pool.query(q, [jti, userId, email, expiresAt]);
  }

  async consume(params: { jti: string; now?: Date }) {
    const now = params.now ?? new Date();

    // First, fetch current state so we can return a stable reason.
    const sel = await this.pool.query(
      `select jti, user_id, email, created_at, expires_at, used_at
       from ${this.tableName}
       where jti = $1`,
      [params.jti],
    );

    if (sel.rowCount === 0) return { ok: false as const, reason: "not_found" as const };

    const row = sel.rows[0] as {
      jti: string;
      user_id: string;
      email: string;
      created_at: Date;
      expires_at: Date;
      used_at: Date | null;
    };

    if (row.used_at) return { ok: false as const, reason: "already_used" as const };
    if (row.expires_at.getTime() <= now.getTime()) return { ok: false as const, reason: "expired" as const };

    // Atomic consume.
    const upd = await this.pool.query(
      `update ${this.tableName}
       set used_at = $2
       where jti = $1 and used_at is null and expires_at > $2
       returning jti, user_id, email, created_at, expires_at, used_at`,
      [params.jti, now],
    );

    if (upd.rowCount === 0) return { ok: false as const, reason: "already_used" as const };

    const used = upd.rows[0] as {
      jti: string;
      user_id: string;
      email: string;
      created_at: Date;
      expires_at: Date;
      used_at: Date | null;
    };

    const record: VerificationRecord = {
      jti: used.jti,
      userId: used.user_id,
      email: used.email,
      createdAt: used.created_at,
      expiresAt: used.expires_at,
      usedAt: used.used_at,
    };

    return { ok: true as const, record };
  }
}

