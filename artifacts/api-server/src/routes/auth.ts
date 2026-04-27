import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";
import { signSession, getMerchantId } from "../lib/session";

const router: IRouter = Router();

const ZID_AUTHORIZE_URL = "https://oauth.zid.sa/oauth/authorize";
const ZID_TOKEN_URL = "https://oauth.zid.sa/oauth/token";

const ZID_CLIENT_ID = process.env["ZID_CLIENT_ID"];
const ZID_CLIENT_SECRET = process.env["ZID_CLIENT_SECRET"];

function getBaseUrl(req: Request): string {
  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const proto = forwardedProto ?? req.protocol;
  const host = forwardedHost ?? req.get("host");
  return `${proto}://${host}`;
}

function getRedirectUri(req: Request): string {
  return `${getBaseUrl(req)}/api/auth/callback`;
}

function startZidOAuth(req: Request, res: Response): void {
  if (!ZID_CLIENT_ID || !ZID_CLIENT_SECRET) {
    res.status(500).send("Zid OAuth credentials are not configured.");
    return;
  }

  const state = crypto.randomBytes(24).toString("hex");
  res.cookie("zid_oauth_state", state, {
    httpOnly: true,
    sameSite: "none",
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
}

// Primary "Connect Store" entry point.
router.get("/auth/zid", startZidOAuth);

// Backwards-compat alias for older button targets.
router.get("/auth/zid/start", startZidOAuth);

async function handleZidCallback(req: Request, res: Response): Promise<void> {
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
      sameSite: "none",
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.redirect("/dashboard");
  } catch (err) {
    logger.error({ err }, "Zid OAuth callback failed");
    res.redirect("/login?error=server_error");
  }
}

// Primary callback path — must match what you register in the Zid Partner
// Dashboard as the redirect URI: <base>/api/auth/callback
router.get("/auth/callback", handleZidCallback);

// Backwards-compat alias for older Zid app registrations that still point at
// /api/auth/zid/callback. Safe to remove once Zid only ever calls /api/auth/callback.
router.get("/auth/zid/callback", handleZidCallback);

router.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("session", {
    path: "/",
    sameSite: "none",
    secure: true,
  });
  res.json({ ok: true });
});

router.get("/debug/oauth", (req: Request, res: Response) => {
  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    client_id: ZID_CLIENT_ID ?? "MISSING",
    redirect_uri: redirectUri,
    response_type: "code",
    state: "DIAGNOSTIC_STATE_PLACEHOLDER",
  });
  const authorizeUrl = `${ZID_AUTHORIZE_URL}?${params.toString()}`;

  res.json({
    authorize_endpoint: ZID_AUTHORIZE_URL,
    token_endpoint: ZID_TOKEN_URL,
    client_id: ZID_CLIENT_ID ?? null,
    client_id_length: ZID_CLIENT_ID?.length ?? 0,
    client_secret_configured: Boolean(ZID_CLIENT_SECRET),
    client_secret_length: ZID_CLIENT_SECRET?.length ?? 0,
    redirect_uri: redirectUri,
    full_authorize_url: authorizeUrl,
    notes: [
      "client_id should match the 'Client ID' in your Zid Partner Dashboard (often a long alphanumeric string, NOT the short numeric App ID).",
      "redirect_uri must be registered VERBATIM in your Zid app's allowed redirect URIs.",
      "If Zid redirects to the merchant dashboard instead of the consent screen, the most common cause is a wrong client_id or an unpublished/uninstalled app.",
    ],
  });
});

router.get("/auth/me", async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("zid_tokens")
    .select("merchant_id, merchant_name, merchant_email, expires_at")
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) {
    req.log.error({ error }, "Failed to load merchant from Supabase");
    res.status(500).json({ authenticated: false });
    return;
  }

  if (!data) {
    res.status(401).json({ authenticated: false });
    return;
  }

  res.json({
    authenticated: true,
    merchant: {
      id: data.merchant_id,
      name: data.merchant_name,
      email: data.merchant_email,
    },
  });
});

export default router;
