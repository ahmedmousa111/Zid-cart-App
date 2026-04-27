import { getValidZidToken } from "./zid";
import { logger } from "./logger";

const ZID_ABANDONED_CARTS_URL =
  "https://api.zid.sa/v1/managers/store/abandoned-carts?page=1&page_size=50";

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

export type NormalizedCart = {
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

export class ZidCartsError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Zid API error (${status})`);
    this.status = status;
    this.body = body;
  }
}

export class ZidNotAuthenticatedError extends Error {
  constructor(public readonly reason: "no_token") {
    super(reason);
  }
}

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
      customer.mobile ?? customer.phone ?? raw.customer_mobile ?? null,
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

export async function fetchAbandonedCarts(
  merchantId: string,
): Promise<NormalizedCart[]> {
  const tokenRow = await getValidZidToken(merchantId);
  if (!tokenRow?.access_token || !tokenRow.authorization_token) {
    throw new ZidNotAuthenticatedError("no_token");
  }

  // Zid Partner API quirk: the OAuth response returns BOTH `access_token`
  // and `authorization`. Authenticated merchant-resource calls require:
  //   Authorization: Bearer <authorization>     (the long-lived merchant auth)
  //   X-Manager-Token: <access_token>           (the short-lived OAuth token)
  // Swapping these is the #1 cause of a 401 "Unauthenticated" response.
  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokenRow.authorization_token}`,
    "X-Manager-Token": tokenRow.access_token,
    Accept: "application/json",
    "Accept-Language": "ar",
    Role: "Manager",
  };

  const res = await fetch(ZID_ABANDONED_CARTS_URL, { headers });
  if (!res.ok) {
    const text = await res.text();
    logger.error(
      { merchantId, status: res.status, body: text.slice(0, 500) },
      "Zid abandoned carts API failed",
    );
    throw new ZidCartsError(res.status, text.slice(0, 500));
  }

  const json = (await res.json()) as ZidAbandonedCartsResponse;
  const rawCarts =
    json.carts ?? json.abandoned_carts ?? json.data ?? json.results ?? [];

  return rawCarts.map((c, i) => normalizeCart(c, i));
}

export async function fetchAbandonedCartById(
  merchantId: string,
  cartId: string,
): Promise<NormalizedCart | null> {
  const carts = await fetchAbandonedCarts(merchantId);
  return carts.find((c) => c.id === cartId) ?? null;
}
