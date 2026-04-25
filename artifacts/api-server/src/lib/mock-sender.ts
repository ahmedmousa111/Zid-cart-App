import { logger } from "./logger";

export type Channel = "email" | "sms";

export type SendInput = {
  channel: Channel;
  to: string;
  subject?: string;
  body: string;
  merchantId: string;
  cartId: string;
};

export type SendResult = {
  provider: string;
  messageId: string;
  sentAt: string;
};

/**
 * MOCK message sender. Logs the outgoing message and returns a fake
 * provider response. Swap this file's implementation for Twilio / SendGrid
 * later; the contract (input + return shape) is what `routes/campaigns.ts`
 * relies on.
 */
export async function mockSend(input: SendInput): Promise<SendResult> {
  const { channel, to, subject, body, merchantId, cartId } = input;

  const messageId = `mock_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const sentAt = new Date().toISOString();

  logger.info(
    {
      provider: "mock",
      channel,
      to,
      subject: subject ?? null,
      merchantId,
      cartId,
      messageId,
      sentAt,
      bodyPreview: body.length > 200 ? `${body.slice(0, 200)}…` : body,
    },
    `[MOCK ${channel.toUpperCase()}] message dispatched (no real send)`,
  );

  // Also surface the full body in dev so the developer can copy/paste it.
  if (process.env["NODE_ENV"] !== "production") {
    // eslint-disable-next-line no-console
    console.log(
      `\n──────── MOCK ${channel.toUpperCase()} → ${to} ────────\n` +
        (subject ? `Subject: ${subject}\n` : "") +
        `${body}\n` +
        `────────────────────────────────────────\n`,
    );
  }

  return { provider: "mock", messageId, sentAt };
}

export function defaultRecoveryMessage(args: {
  customerName: string | null;
  cartTotal: number;
  currency: string;
}): { subject: string; body: string } {
  const name = args.customerName?.trim() || "عميلنا العزيز";
  const subject = "أكمل طلبك واستفد من سلتك";
  const body =
    `مرحبًا ${name}،\n\n` +
    `لاحظنا أنك تركت سلة بقيمة ${args.cartTotal} ${args.currency} دون إكمال الطلب.\n` +
    `أكمل الشراء الآن قبل نفاد المنتجات. شكرًا لاختيارك متجرنا!`;
  return { subject, body };
}
