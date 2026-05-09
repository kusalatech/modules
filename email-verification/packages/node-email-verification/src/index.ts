export { createEmailVerification } from "./create.js";
export type {
  EmailVerificationConfig,
  VerificationResult,
  ConfirmationResult,
  VerificationStore,
  VerificationRecord,
  VerificationClaims,
  SigningConfig,
  EmailProvider,
  EmailMessage,
} from "./types.js";
export { MemoryVerificationStore } from "./store/memory.js";
export { PostgresVerificationStore } from "./store/postgres.js";
export type { PostgresStoreConfig } from "./store/postgres.js";
export { ConsoleEmailProvider } from "./providers/console.js";
export { SendGridEmailProvider } from "./providers/sendgrid.js";
export type { SendGridConfig } from "./providers/sendgrid.js";
export {
  signEmailVerificationJwt,
  verifyEmailVerificationJwt,
  normalizeEmail,
} from "./token.js";
export { SCHEMA_SQL, ddl } from "./schema.js";
