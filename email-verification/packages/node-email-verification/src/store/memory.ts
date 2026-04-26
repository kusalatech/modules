import type { VerificationRecord, VerificationStore } from "../types.js";

export class MemoryVerificationStore implements VerificationStore {
  private records = new Map<string, VerificationRecord>();

  async create(params: {
    jti: string;
    userId: string;
    email: string;
    expiresAt: Date;
  }): Promise<void> {
    const { jti, userId, email, expiresAt } = params;
    const record: VerificationRecord = {
      jti,
      userId,
      email,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.records.set(jti, record);
  }

  async consume(params: { jti: string; now?: Date }) {
    const now = params.now ?? new Date();
    const record = this.records.get(params.jti);
    if (!record) return { ok: false as const, reason: "not_found" as const };
    if (record.usedAt) return { ok: false as const, reason: "already_used" as const };
    if (record.expiresAt.getTime() <= now.getTime()) {
      return { ok: false as const, reason: "expired" as const };
    }
    record.usedAt = now;
    this.records.set(record.jti, record);
    return { ok: true as const, record };
  }
}

