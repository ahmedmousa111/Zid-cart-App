import { supabaseAdmin } from "./supabase";
import { refreshZidToken } from "./zid";
import { logger } from "./logger";

const RUN_INTERVAL_MS = 15 * 60 * 1000; // every 15 min
const REFRESH_WINDOW_MS = 30 * 60 * 1000; // refresh tokens expiring in next 30 min

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function runRefreshSweep(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const cutoff = new Date(Date.now() + REFRESH_WINDOW_MS).toISOString();
    const { data, error } = await supabaseAdmin
      .from("zid_tokens")
      .select(
        "merchant_id, access_token, refresh_token, authorization_token, expires_at",
      )
      .not("refresh_token", "is", null)
      .not("expires_at", "is", null)
      .lt("expires_at", cutoff);

    if (error) {
      logger.error({ error }, "Refresh sweep: failed to query tokens");
      return;
    }

    if (!data || data.length === 0) return;

    logger.info({ count: data.length }, "Refresh sweep: refreshing tokens");

    for (const row of data) {
      try {
        await refreshZidToken(row);
      } catch (err) {
        logger.error(
          { merchantId: row.merchant_id, err },
          "Refresh sweep: error refreshing token",
        );
      }
    }
  } finally {
    running = false;
  }
}

export function startTokenRefresher(): void {
  if (timer) return;
  // Initial run after a short delay so server can finish booting
  setTimeout(() => {
    runRefreshSweep().catch((err) =>
      logger.error({ err }, "Initial refresh sweep failed"),
    );
  }, 30 * 1000);

  timer = setInterval(() => {
    runRefreshSweep().catch((err) =>
      logger.error({ err }, "Refresh sweep failed"),
    );
  }, RUN_INTERVAL_MS);

  // Allow process to exit cleanly
  if (typeof timer.unref === "function") timer.unref();

  logger.info(
    { intervalMs: RUN_INTERVAL_MS, windowMs: REFRESH_WINDOW_MS },
    "Zid token refresher started",
  );
}

export function stopTokenRefresher(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
