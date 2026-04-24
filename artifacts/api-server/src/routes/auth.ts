import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ZID_AUTHORIZE_URL = "https://oauth.zid.sa/oauth/authorize";
const ZID_TOKEN_URL = "https://oauth.zid.sa/oauth/token";

const ZID_CLIENT_ID = process.env["ZID_CLIENT_ID"];
const ZID_CLIENT_SECRET = process.env["ZID_CLIENT_SECRET"];
const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "dev-session-secret";

function getBaseUrl(req: Request): string {
  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const proto = forwardedProto ?? req.protocol;
  const host = forwardedHost ?? req.get("host");
  return `${proto}://${host}`;
}

function getRedirectUri(req: Request): string {
  return `${getBaseUrl(req)}/api/auth/zid/callback`;
}

function signSession(merchantId: string): string {
  const payload = Buffer.from(merchantId).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

router.get("/auth/zid/start", (req: Request, res: Response) => {
  if (!ZID_CLIENT_ID || !ZID_CLIENT_SECRET) {
    res.status(500).send("Zid OAuth credentials are not configured.");
    return;
  }

  const state = crypto.randomBytes(24).toString("hex");
  res.cookie("zid_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 10 * 60 * 1000,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: ZID_CLIENT_ID,
    redirect_uri: getRedirectUri(req),
    response_type: "code",
    state,
  });

  res.redirect(`${ZID_AUTHORIZE_URL}?${params.toString()}`);
});

router.get("/auth/zid/callback", async (req: Request, res: Response) => {
  const { code, state, error: zidError } = req.query;
  const cookieState = req.cookies?.["zid_oauth_state"];

  res.clearCookie("zid_oauth_state", { path: "/" });

  if (zidError) {
    req.log.warn({ zidError }, "Zid returned an error");
    res.redirect("/login?error=zid_denied");
    return;
  }

  if (!code || typeof code !== "string") {
    res.redirect("/login?error=missing_code");
    return;
  }

  if (!state || state !== cookieState) {
    res.redirect("/login?error=invalid_state");
    return;
  }

  if (!ZID_CLIENT_ID || !ZID_CLIENT_SECRET) {
    res.status(500).send("Zid OAuth credentials are not configured.");
    return;
  }

  try {
    const tokenRes = await fetch(ZID_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ZID_CLIENT_ID,
        client_secret: ZID_CLIENT_SECRET,
        code,
        redirect_uri: getRedirectUri(req),
      }).toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      req.log.error(
        { status: tokenRes.status, body: text },
        "Zid token exchange failed",
      );
      res.redirect("/login?error=token_exchange_failed");
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      authorization?: string;
      expires_in?: number;
      token_type?: string;
      store?: { id?: string | number; name?: string };
      merchant?: { id?: string | number; name?: string; email?: string };
    };

    const merchantId = String(
      tokenData.merchant?.id ?? tokenData.store?.id ?? crypto.randomUUID(),
    );
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    const { error: dbError } = await supabaseAdmin
      .from("zid_tokens")
      .upsert(
        {
          merchant_id: merchantId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token ?? null,
          authorization_token: tokenData.authorization ?? null,
          expires_at: expiresAt,
          merchant_name:
            tokenData.merchant?.name ?? tokenData.store?.name ?? null,
          merchant_email: tokenData.merchant?.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "merchant_id" },
      );

    if (dbError) {
      req.log.error({ dbError }, "Failed to store Zid token in Supabase");
      res.redirect("/login?error=storage_failed");
      return;
    }

    res.cookie("session", signSession(merchantId), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.redirect("/dashboard");
  } catch (err) {
    logger.error({ err }, "Zid OAuth callback failed");
    res.redirect("/login?error=server_error");
  }
});

router.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("session", { path: "/" });
  res.json({ ok: true });
});

export default router;
