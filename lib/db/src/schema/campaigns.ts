import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const CAMPAIGN_STATUS = [
  "pending",
  "contacted",
  "recovered",
  "lost",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

export const CAMPAIGN_CHANNEL = ["email", "sms", "none"] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNEL)[number];

export const cartCampaigns = pgTable(
  "cart_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    merchantId: text("merchant_id").notNull(),
    cartId: text("cart_id").notNull(),

    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),

    cartTotal: doublePrecision("cart_total").notNull().default(0),
    currency: text("currency").notNull().default("SAR"),
    itemsCount: integer("items_count").notNull().default(0),

    status: text("status", { enum: CAMPAIGN_STATUS })
      .notNull()
      .default("pending"),
    lastChannel: text("last_channel", { enum: CAMPAIGN_CHANNEL }),
    lastMessage: text("last_message"),
    lastProviderMessageId: text("last_provider_message_id"),
    attempts: integer("attempts").notNull().default(0),

    abandonedAt: timestamp("abandoned_at", { withTimezone: true }),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("cart_campaigns_merchant_cart_uniq").on(
      t.merchantId,
      t.cartId,
    ),
    index("cart_campaigns_merchant_status_idx").on(t.merchantId, t.status),
  ],
);

export const cartCampaignEvents = pgTable(
  "cart_campaign_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => cartCampaigns.id, { onDelete: "cascade" }),
    fromStatus: text("from_status", { enum: CAMPAIGN_STATUS }),
    toStatus: text("to_status", { enum: CAMPAIGN_STATUS }).notNull(),
    channel: text("channel", { enum: CAMPAIGN_CHANNEL }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("cart_campaign_events_campaign_idx").on(t.campaignId)],
);

export const insertCartCampaignSchema = createInsertSchema(cartCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCartCampaignSchema = createSelectSchema(cartCampaigns);
export type CartCampaign = z.infer<typeof selectCartCampaignSchema>;
export type InsertCartCampaign = z.infer<typeof insertCartCampaignSchema>;
