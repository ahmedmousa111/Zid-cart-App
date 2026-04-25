import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, cartCampaigns, cartCampaignEvents } from "@workspace/db";

const router: IRouter = Router();

/**
 * Zid event names that mean "the customer has paid / cart was recovered".
 * Multiple aliases are accepted because Zid's event taxonomy varies by
 * subscription type and webhook generation.
 */
const RECOVERY_EVENTS = new Set([
  "checkout.completed",
  "order.create",
  "order.created",
  "order.completed",
  "order.placed",
  "cart.recovered",
  "abandoned_cart.recovered",
]);

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const received = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqualHex(expected, received);
}

type WebhookPayload = Record<string, unknown> & {
  event?: string;
  event_type?: string;
  event_name?: string;
  store_id?: string | number;
  manager_id?: string | number;
  cart_id?: string | number;
  store?: { id?: string | number };
  manager?: { id?: string | number };
  cart?: { id?: string | number };
  order?: { cart_id?: string | number; cart?: { id?: string | number } };
  data?: WebhookPayload;
};

function pickString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function extractEvent(
  payload: WebhookPayload,
  headers: Request["headers"],
): string {
  return (
    pickString(
      payload.event,
      payload.event_type,
      payload.event_name,
      payload.data?.event,
      headers["x-zid-event"],
      headers["x-event"],
    )?.toLowerCase() ?? ""
  );
}

function extractMerchantId(
  payload: WebhookPayload,
  headers: Request["headers"],
): string | null {
  return pickString(
    payload.store_id,
    payload.store?.id,
    payload.manager_id,
    payload.manager?.id,
    payload.data?.store_id,
    payload.data?.store?.id,
    payload.data?.manager_id,
    payload.data?.manager?.id,
    headers["x-manager-id"],
    headers["x-store-id"],
  );
}

function extractCartId(payload: WebhookPayload): string | null {
  return pickString(
    payload.cart_id,
    payload.cart?.id,
    payload.data?.cart_id,
    payload.data?.cart?.id,
    payload.order?.cart_id,
    payload.order?.cart?.id,
    payload.data?.order?.cart_id,
    payload.data?.order?.cart?.id,
  );
}

router.post("/webhooks/zid", async (req: Request, res: Response) => {
  const rawBody = req.body as unknown;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ error: "expected_raw_body" });
    return;
  }

  const secret = process.env["ZID_WEBHOOK_SECRET"];
  const signatureHeader = (req.headers["x-zid-signature"] ??
    req.headers["x-zid-webhook-signature"] ??
    req.headers["x-signature"]) as string | undefined;

  if (secret) {
    if (!verifySignature(rawBody, signatureHeader, secret)) {
      req.log.warn(
        { signatureHeaderPresent: Boolean(signatureHeader) },
        "Zid webhook signature verification failed",
      );
      res.status(401).json({ error: "invalid_signature" });
      return;
    }
  } else {
    req.log.warn(
      "ZID_WEBHOOK_SECRET is not set; webhook accepted without signature verification",
    );
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as WebhookPayload;
  } catch (err) {
    req.log.error({ err }, "Zid webhook body is not valid JSON");
    res.status(400).json({ error: "invalid_json" });
    return;
  }

  const eventName = extractEvent(payload, req.headers);
  const merchantId = extractMerchantId(payload, req.headers);
  const cartId = extractCartId(payload);

  req.log.info({ eventName, merchantId, cartId }, "Zid webhook received");

  if (!eventName || !merchantId) {
    res
      .status(202)
      .json({ ok: true, ignored: "missing_event_or_merchant_id" });
    return;
  }

  if (!RECOVERY_EVENTS.has(eventName)) {
    res.status(202).json({ ok: true, ignored: `event_not_handled:${eventName}` });
    return;
  }

  if (!cartId) {
    res.status(202).json({ ok: true, ignored: "no_cart_id_in_payload" });
    return;
  }

  const existing = await db
    .select()
    .from(cartCampaigns)
    .where(
      and(
        eq(cartCampaigns.merchantId, merchantId),
        eq(cartCampaigns.cartId, cartId),
      ),
    )
    .limit(1);

  if (!existing[0]) {
    res.status(202).json({ ok: true, ignored: "no_campaign_for_cart" });
    return;
  }

  if (existing[0].status === "recovered") {
    res.json({ ok: true, already_recovered: true });
    return;
  }

  const now = new Date();
  await db
    .update(cartCampaigns)
    .set({ status: "recovered", recoveredAt: now, updatedAt: now })
    .where(eq(cartCampaigns.id, existing[0].id));

  await db.insert(cartCampaignEvents).values({
    campaignId: existing[0].id,
    fromStatus: existing[0].status,
    toStatus: "recovered",
    channel: existing[0].lastChannel ?? null,
    note: `webhook:${eventName}`,
  });

  res.json({ ok: true, recovered: true, cart_id: cartId });
});

export default router;
