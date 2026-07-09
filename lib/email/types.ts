export type EmailMessage = {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailSendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export interface EmailProvider {
  name: string;
  isConfigured(): boolean;
  send(msg: EmailMessage): Promise<EmailSendResult>;
}
