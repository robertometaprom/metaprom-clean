import "server-only";

import { Resend } from "resend";

import {
  getResendApiKey,
  getSupportFromAddress,
  SUPPORT_INTERNAL_RECIPIENT,
} from "@/lib/support/config";
import type { SupportFormInput } from "@/lib/support/public";

export type SupportMailer = {
  send(input: SupportFormInput): Promise<{ ok: true } | { ok: false }>;
};

let installedMailer: SupportMailer | null = null;

export function installSupportMailerForTests(mailer: SupportMailer | null) {
  installedMailer = mailer;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildSupportEmail(input: SupportFormInput): { subject: string; text: string; html: string } {
  const subject = `[Metaprom AI Support] ${input.category} — ${input.name}`;
  const text = [
    "New Metaprom AI Support form submission",
    "",
    `Name: ${input.name}`,
    `Customer email: ${input.email}`,
    `Category: ${input.category}`,
    `Language: ${input.locale}`,
    "",
    "Message:",
    input.message,
    "",
    "Reply to the customer email above. This mailbox is internal only.",
  ].join("\n");

  const html = `
    <p><strong>New Metaprom AI Support form submission</strong></p>
    <p>
      <strong>Name:</strong> ${escapeHtml(input.name)}<br />
      <strong>Customer email:</strong> ${escapeHtml(input.email)}<br />
      <strong>Category:</strong> ${escapeHtml(input.category)}<br />
      <strong>Language:</strong> ${escapeHtml(input.locale)}
    </p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(input.message).replaceAll("\n", "<br />")}</p>
    <p>Reply to the customer email above. This mailbox is internal only.</p>
  `;

  return { subject, text, html };
}

const resendMailer: SupportMailer = {
  async send(input) {
    const apiKey = getResendApiKey();
    if (!apiKey) return { ok: false };

    const resend = new Resend(apiKey);
    const content = buildSupportEmail(input);
    try {
      const { data, error } = await resend.emails.send(
        {
          from: getSupportFromAddress(),
          to: [SUPPORT_INTERNAL_RECIPIENT],
          replyTo: input.email,
          subject: content.subject,
          text: content.text,
          html: content.html,
        },
        { idempotencyKey: `support/${input.requestId}` },
      );

      if (error || !data?.id) return { ok: false };
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
};

export function getSupportMailer(): SupportMailer {
  return installedMailer ?? resendMailer;
}
