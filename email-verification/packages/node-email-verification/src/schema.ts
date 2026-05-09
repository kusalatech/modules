export function ddl(tableName: string): string {
  return `
    create table if not exists ${tableName} (
      jti text primary key,
      user_id text not null,
      email text not null,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null,
      used_at timestamptz null
    );
    create index if not exists ${tableName}_user_id_idx
      on ${tableName} (user_id);
    create index if not exists ${tableName}_email_idx
      on ${tableName} (email);
    create index if not exists ${tableName}_expires_at_idx
      on ${tableName} (expires_at);
  `;
}

export const SCHEMA_SQL = ddl("email_verification_tokens");
