-- AGPL-3.0-or-later
-- Interop schema for one-time email verification tokens.

-- Postgres-flavored SQL. Other RDBMS can adapt types easily.

create table if not exists email_verification_tokens (
  jti text primary key,
  user_id text not null,
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz null
);

create index if not exists email_verification_tokens_user_id_idx
  on email_verification_tokens (user_id);

create index if not exists email_verification_tokens_email_idx
  on email_verification_tokens (email);

create index if not exists email_verification_tokens_expires_at_idx
  on email_verification_tokens (expires_at);

