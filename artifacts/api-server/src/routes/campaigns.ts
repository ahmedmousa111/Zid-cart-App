import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { getMerchantId } from "../lib/session";
import {
  fetchAbandonedCarts,
  fetchAbandonedCartById,
  ZidCartsError,
  ZidNotAuthenticatedError,
  type NormalizedCart,
} from "../lib/zid-carts";
import {
  defaultRecoveryMessage,
  mockSend,
  type Channel,
} from "../lib/mock-sender";
import {
  db,
  cartCampaigns,
  cartCampaignEvents,
  CAMPAIGN_STATUS,
  type CampaignStatus,
} from "@workspace/db";

const router: IRouter = Router();

const CHANNEL_PREFERENCE: Channel[] = ["email", "sms"];
const TERMINAL_STATUSES: CampaignStatus[] = ["recovered", "lost"];

function pickChannelFor(cart: NormalizedCart): Channel | null {
  if (cart.customer_email) return "email";
  if (cart.customer_phone) return "sms";
  return null;
}

function recipientFor(cart: NormalizedCart, channel: Channel): string | null {
  if (channel === "email") return cart.customer_email;
  if (channel === "sms") return cart.customer_phone;
  return null;
}

router.get("/campaigns", async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  const statusFilter = req.query["status"];
  const where =
    typeof statusFilter === "string" &&
    (CAMPAIGN_STATUS as readonly string[]).includes(statusFilter)
      ? and(
          eq(cartCampaigns.merchantId, merchantId),
          eq(cartCampaigns.status, statusFilter as CampaignStatus),
        )
      : eq(cartCampaigns.merchantId, merchantId);

  const rows = await db
    .select()
    .from(cartCampaigns)
    .where(where)
    .orderBy(desc(cartCampaigns.updatedAt));

  res.json({ campaigns: rows });
});

router.get(
  "/campaigns/pending-carts",
  async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    if (!merchantId) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }

    try {
      const carts = await fetchAbandonedCarts(merchantId);

      const existing = await db
        .select({
          cartId: cartCampaigns.cartId,
          status: cartCampaigns.status,
        })
        .from(cartCampaigns)
        .where(eq(cartCampaigns.merchantId, merchantId));

      const byCart = new Map(existing.map((r) => [r.cartId, r.status]));

      const pending = carts.filter((c) => {
        const localStatus = byCart.get(c.id);
        if (!localStatus) return c.status === "pending";
        return !TERMINAL_STATUSES.includes(localStatus) &&
          localStatus !== "contacted";
      });

      res.json({ pending_carts: pending, count: pending.length });
    } catch (err) {
      if (err instanceof ZidNotAuthenticatedError) {
        res.status(401).json({ error: "no_token" });
        return;
      }
      if (err instanceof ZidCartsError) {
        res
          .status(502)
          .json({ error: "zid_api_failed", status: err.status, message: err.body });
        return;
      }
      req.log.error({ err }, "Failed to list pending carts");
      res.status(500).json({ error: "server_error" });
    }
  },
);

router.post("/campaigns/contact", async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  const cartId = String(req.body?.cart_id ?? "").trim();
  if (!cartId) {
    res.status(400).json({ error: "missing_cart_id" });
    return;
  }

  const requestedChannel = req.body?.channel as Channel | undefined;
  if (
    requestedChannel !== undefined &&
    !CHANNEL_PREFERENCE.includes(requestedChannel)
  ) {
    res.status(400).json({ error: "invalid_channel" });
    return;
  }

  try {
    const cart = await fetchAbandonedCartById(merchantId, cartId);
    if (!cart) {
      res.status(404).json({ error: "cart_not_found" });
      return;
    }

    const channel = requestedChannel ?? pickChannelFor(cart);
    if (!channel) {
      res
        .status(422)
        .json({ error: "no_contact_channel", message: "Cart customer has no email or phone" });
      return;
    }

    const recipient = recipientFor(cart, channel);
    if (!recipient) {
      res.status(422).json({
        error: "missing_recipient",
        message: `Customer has no ${channel} on file`,
      });
      return;
    }

    const { subject, body } =
      typeof req.body?.message === "string" && req.body.message.trim()
        ? { subject: "أكمل طلبك", body: String(req.body.message) }
        : defaultRecoveryMessage({
            customerName: cart.customer_name,
            cartTotal: cart.cart_total,
            currency: cart.currency,
          });

    const sendResult = await mockSend({
      channel,
      to: recipient,
      subject: channel === "email" ? subject : undefined,
      body,
      merchantId,
      cartId: cart.id,
    });

    const now = new Date();
    const existing = await db
      .select()
      .from(cartCampaigns)
      .where(
        and(
          eq(cartCampaigns.merchantId, merchantId),
          eq(cartCampaigns.cartId, cart.id),
        ),
      )
      .limit(1);

    let campaignRow;
    if (existing[0]) {
      const fromStatus = existing[0].status;
      const updated = await db
        .update(cartCampaigns)
        .set({
          status: "contacted",
          lastChannel: channel,
          lastMessage: body,
          lastProviderMessageId: sendResult.messageId,
          attempts: existing[0].attempts + 1,
          contactedAt: now,
          updatedAt: now,
          customerName: cart.customer_name,
          customerEmail: cart.customer_email,
          customerPhone: cart.customer_phone,
          cartTotal: cart.cart_total,
          currency: cart.currency,
          itemsCount: cart.items_count,
          abandonedAt: cart.abandoned_at ? new Date(cart.abandoned_at) : null,
        })
        .where(eq(cartCampaigns.id, existing[0].id))
        .returning();
      campaignRow = updated[0];

      await db.insert(cartCampaignEvents).values({
        campaignId: existing[0].id,
        fromStatus,
        toStatus: "contacted",
        channel,
        note: `mock send id=${sendResult.messageId}`,
      });
    } else {
      const inserted = await db
        .insert(cartCampaigns)
        .values({
          merchantId,
          cartId: cart.id,
          customerName: cart.customer_name,
          customerEmail: cart.customer_email,
          customerPhone: cart.customer_phone,
          cartTotal: cart.cart_total,
          currency: cart.currency,
          itemsCount: cart.items_count,
          status: "contacted",
          lastChannel: channel,
          lastMessage: body,
          lastProviderMessageId: sendResult.messageId,
          attempts: 1,
          abandonedAt: cart.abandoned_at ? new Date(cart.abandoned_at) : null,
          contactedAt: now,
        })
        .returning();
      campaignRow = inserted[0];

      if (campaignRow) {
        await db.insert(cartCampaignEvents).values({
          campaignId: campaignRow.id,
          fromStatus: "pending",
          toStatus: "contacted",
          channel,
          note: `mock send id=${sendResult.messageId}`,
        });
      }
    }

    res.json({
      ok: true,
      campaign: campaignRow,
      send: sendResult,
    });
  } catch (err) {
    if (err instanceof ZidNotAuthenticatedError) {
      res.status(401).json({ error: "no_token" });
      return;
    }
    if (err instanceof ZidCartsError) {
      res
        .status(502)
        .json({ error: "zid_api_failed", status: err.status, message: err.body });
      return;
    }
    req.log.error({ err }, "Failed to dispatch contact campaign");
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/campaigns/:cartId/status", async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  const cartId = String(req.params["cartId"] ?? "").trim();
  if (!cartId) {
    res.status(400).json({ error: "missing_cart_id" });
    return;
  }

  const nextStatus = req.body?.status as string | undefined;
  if (
    !nextStatus ||
    !(CAMPAIGN_STATUS as readonly string[]).includes(nextStatus)
  ) {
    res.status(400).json({
      error: "invalid_status",
      allowed: CAMPAIGN_STATUS,
    });
    return;
  }

  const note = typeof req.body?.note === "string" ? req.body.note : null;
  const now = new Date();
  const next = nextStatus as CampaignStatus;

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
    res.status(404).json({ error: "campaign_not_found" });
    return;
  }
  const row = existing[0];

  const updated = await db
    .update(cartCampaigns)
    .set({
      status: next,
      recoveredAt: next === "recovered" ? now : row.recoveredAt,
      updatedAt: now,
    })
    .where(eq(cartCampaigns.id, row.id))
    .returning();

  await db.insert(cartCampaignEvents).values({
    campaignId: row.id,
    fromStatus: row.status,
    toStatus: next,
    channel: row.lastChannel ?? null,
    note,
  });

  res.json({ ok: true, campaign: updated[0] });
});

router.get(
  "/campaigns/:cartId/events",
  async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    if (!merchantId) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }

    const cartId = String(req.params["cartId"] ?? "").trim();
    const row = await db
      .select()
      .from(cartCampaigns)
      .where(
        and(
          eq(cartCampaigns.merchantId, merchantId),
          eq(cartCampaigns.cartId, cartId),
        ),
      )
      .limit(1);

    if (!row[0]) {
      res.status(404).json({ error: "campaign_not_found" });
      return;
    }

    const events = await db
      .select()
      .from(cartCampaignEvents)
      .where(eq(cartCampaignEvents.campaignId, row[0].id))
      .orderBy(desc(cartCampaignEvents.createdAt));

    res.json({ campaign: row[0], events });
  },
);

export default router;
