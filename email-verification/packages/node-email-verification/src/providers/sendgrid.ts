import type { EmailProvider, EmailMessage } from "../types.js";

export type SendGridConfig = {
  apiKey: string;
};

export class SendGridEmailProvider implements EmailProvider {
  private apiKey: string;

  constructor(config: SendGridConfig) {
    this.apiKey = config.apiKey;
  }

  async send(message: EmailMessage): Promise<{ provider: string; messageId?: string }> {
    // Minimal SendGrid v3 Mail Send API call, avoiding SDK lock-in.
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: message.from },
        subject: message.subject,
        content: [
          ...(message.text ? [{ type: "text/plain", value: message.text }] : []),
          ...(message.html ? [{ type: "text/html", value: message.html }] : []),
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`SendGrid send failed: ${res.status} ${res.statusText} ${body}`);
    }

    const messageId = res.headers.get("x-message-id") ?? undefined;
    return { provider: "sendgrid", messageId };
  }
}

