import type { EmailProvider, EmailMessage } from "../types.js";

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<{ provider: string; messageId?: string }> {
    // Intentionally minimal: useful for local dev and tests.
    // Do not log full HTML in prod; treat as dev-only provider.
    // eslint-disable-next-line no-console
    console.log("[kusala-email-verification] send email", {
      to: message.to,
      from: message.from,
      subject: message.subject,
      text: message.text,
    });
    return { provider: "console" };
  }
}

