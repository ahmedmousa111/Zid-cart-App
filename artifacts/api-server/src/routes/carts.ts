import { Router, type IRouter, type Request, type Response } from "express";
import { getMerchantId } from "../lib/session";
import { getValidZidToken } from "../lib/zid";

const router: IRouter = Router();

const ZID_ABANDONED_CARTS_URL =
  "https://api.zid.sa/v1/managers/store/abandoned-carts";

type ZidCartCustomer = {
  id?: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  phone?: string;
};

type ZidCart = {
  id?: string | number;
  cart_id?: string | number;
  customer?: ZidCartCustomer;
  customer_name?: string;
  customer_email?: string;
  customer_mobile?: string;
  total?: { amount?: number; currency?: string } | number;
  cart_total?: number;
  currency?: string;
  products_count?: number;
  items_count?: number;
  products?: unknown[];
  status?: string;
  created_at?: string;
  abandoned_at?: string;
  updated_at?: string;
};

type ZidAbandonedCartsResponse = {
  carts?: ZidCart[];
  data?: ZidCart[];
  abandoned_carts?: ZidCart[];
  results?: ZidCart[];
};

type NormalizedCart = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  cart_total: number;
  currency: string;
  items_count: number;
  status: "pending" | "contacted" | "recovered" | "lost";
  abandoned_at: string;
  recovered_at: string | null;
};

function normalizeCart(raw: ZidCart, idx: number): NormalizedCart {
  const customer = raw.customer ?? {};
  const fullName =
    customer.name ??
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ??
    raw.customer_name ??
    null;

  let total = 0;
  let currency = "SAR";
  if (typeof raw.total === "object" && raw.total !== null) {
    total = Number(raw.total.amount ?? 0);
    currency = raw.total.currency ?? raw.currency ?? "SAR";
  } else if (typeof raw.total === "number") {
    total = raw.total;
    currency = raw.currency ?? "SAR";
  } else {
    total = Number(raw.cart_total ?? 0);
    currency = raw.currency ?? "SAR";
  }

  const itemsCount =
    raw.products_count ??
    raw.items_count ??
    (Array.isArray(raw.products) ? raw.products.length : 0);

  const status: NormalizedCart["status"] = (() => {
    const s = (raw.status ?? "").toLowerCase();
    if (s.includes("recover")) return "recovered";
    if (s.includes("contact")) return "contacted";
    if (s.includes("lost") || s.includes("expir")) return "lost";
    return "pending";
  })();

  return {
    id: String(raw.id ?? raw.cart_id ?? `cart-${idx}`),
    customer_name: fullName?.trim() ? fullName.trim() : null,
    customer_email: customer.email ?? raw.customer_email ?? null,
    customer_phone:
      customer.mobile ??
      customer.phone ??
      raw.customer_mobile ??
      null,
    cart_total: total,
    currency,
    items_count: itemsCount,
    status,
    abandoned_at:
      raw.abandoned_at ??
      raw.updated_at ??
      raw.created_at ??
      new Date().toISOString(),
    recovered_at: status === "recovered" ? raw.updated_at ?? null : null,
  };
}

router.get("/carts", async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  const tokenRow = await getValidZidToken(merchantId);

  if (!tokenRow?.access_token) {
    res.status(401).json({ error: "no_token" });
    return;
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${tokenRow.access_token}`,
      Accept: "application/json",
      "Accept-Language": "ar",
      "Content-Type": "application/json",
    };
    if (tokenRow.authorization_token) {
      headers["X-Manager-Token"] = tokenRow.authorization_token;
    }

    const zidRes = await fetch(ZID_ABANDONED_CARTS_URL, { headers });

    if (!zidRes.ok) {
      const text = await zidRes.text();
      req.log.error(
        { status: zidRes.status, body: text },
        "Zid abandoned carts API failed",
      );
      res.status(502).json({
        error: "zid_api_failed",
        status: zidRes.status,
        message: text.slice(0, 500),
      });
      return;
    }

    const json = (await zidRes.json()) as ZidAbandonedCartsResponse;
    const rawCarts =
      json.carts ?? json.abandoned_carts ?? json.data ?? json.results ?? [];

    const normalized = rawCarts.map((c, i) => normalizeCart(c, i));

    res.json({ carts: normalized });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch carts from Zid");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
