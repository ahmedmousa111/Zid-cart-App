import { Router, type IRouter, type Request, type Response } from "express";
import { getMerchantId } from "../lib/session";
import {
  fetchAbandonedCarts,
  ZidCartsError,
  ZidNotAuthenticatedError,
} from "../lib/zid-carts";
import { db, cartCampaigns } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/carts", async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  try {
    const carts = await fetchAbandonedCarts(merchantId);

    // Overlay the local campaign status (so a cart that's been "contacted"
    // or "recovered" through our system shows that, not Zid's stale status).
    const campaignRows = await db
      .select({
        cartId: cartCampaigns.cartId,
        status: cartCampaigns.status,
        recoveredAt: cartCampaigns.recoveredAt,
      })
      .from(cartCampaigns)
      .where(eq(cartCampaigns.merchantId, merchantId));

    const byCart = new Map(campaignRows.map((r) => [r.cartId, r]));

    const merged = carts.map((c) => {
      const local = byCart.get(c.id);
      if (!local) return c;
      return {
        ...c,
        status: local.status,
        recovered_at:
          local.recoveredAt?.toISOString() ?? c.recovered_at,
      };
    });

    res.json({ carts: merged });
  } catch (err) {
    if (err instanceof ZidNotAuthenticatedError) {
      res.status(401).json({ error: "no_token" });
      return;
    }
    if (err instanceof ZidCartsError) {
      res.status(502).json({
        error: "zid_api_failed",
        status: err.status,
        message: err.body,
      });
      return;
    }
    req.log.error({ err }, "Failed to fetch carts from Zid");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
