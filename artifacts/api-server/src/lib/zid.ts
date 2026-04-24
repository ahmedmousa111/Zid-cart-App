import { supabaseAdmin } from "./supabase";
import { logger } from "./logger";

const ZID_TOKEN_URL = "https://oauth.zid.sa/oauth/token";

const ZID_CLIENT_ID = process.env["ZID_CLIENT_ID"];
const ZID_CLIENT_SECRET = process.env["ZID_CLIENT_SECRET"];

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh if expiring within 5 min

type ZidTokenRow = {
  merchant_id: string;
  access_token: string;
  refresh_token: string | null;
  authorization_token: string | null;
  expires_at: string | null;
};

type ZidTokenResponse = {
  access_token: string;
  refresh_token?: string;
  authorization?: string;
  expires_in?: number;
  token_type?: string;
};

export async function refreshZidToken(
  row: ZidTokenRow,
): Promise<ZidTokenRow | null> {
  if (!row.refresh_token) {
    logger.warn(
      { merchantId: row.merchant_id },
      "No refresh_token available; cannot refresh",
    );
    return null;
  }
  if (!ZID_CLIENT_ID || !ZID_CLIENT_SECRET) {
    logger.error("Zid OAuth credentials missing; cannot refresh");
    return null;
  }

  const res = await fetch(ZID_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ZID_CLIENT_ID,
      client_secret: ZID_CLIENT_SECRET,
      refresh_token: row.refresh_token,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error(
      { merchantId: row.merchant_id, status: res.status, body: text.slice(0, 500) },
      "Zid refresh_token exchange failed",
    );
    return null;
  }

  const data = (await res.json()) as ZidTokenResponse;
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  const updated: ZidTokenRow = {
    merchant_id: row.merchant_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? row.refresh_token,
    authorization_token: data.authorization ?? row.authorization_token,
    expires_at: expiresAt,
  };

  const { error } = await supabaseAdmin
    .from("zid_tokens")
    .update({
      access_token: updated.access_token,
      refresh_token: updated.refresh_token,
      authorization_token: updated.authorization_token,
      expires_at: updated.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("merchant_id", row.merchant_id);

  if (error) {
    logger.error(
      { merchantId: row.merchant_id, error },
      "Failed to persist refreshed token",
    );
    return null;
  }

  logger.info(
    { merchantId: row.merchant_id, expiresAt },
    "Refreshed Zid access token",
  );
  return updated;
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt).getTime();
  return Number.isFinite(exp) && exp - Date.now() < REFRESH_BUFFER_MS;
}

export async function getValidZidToken(
  merchantId: string,
): Promise<ZidTokenRow | null> {
  const { data, error } = await supabaseAdmin
    .from("zid_tokens")
    .select(
      "merchant_id, access_token, refresh_token, authorization_token, expires_at",
    )
    .eq("merchant_id", merchantId)
    .maybeSingle<ZidTokenRow>();

  if (error || !data) return null;

  if (isExpiringSoon(data.expires_at)) {
    const refreshed = await refreshZidToken(data);
    return refreshed ?? data;
  }

  return data;
}
