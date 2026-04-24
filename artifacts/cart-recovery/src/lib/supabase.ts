import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl) {
  throw new Error(
    "VITE_SUPABASE_URL is required. Add it to your environment secrets.",
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY is required. Add it to your environment secrets.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Store = {
  id: string;
  name: string;
  platform: string;
  domain: string | null;
  created_at: string;
};

export type AbandonedCart = {
  id: string;
  store_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  cart_total: number;
  currency: string;
  items_count: number;
  status: "pending" | "recovered" | "lost" | "contacted";
  abandoned_at: string;
  recovered_at: string | null;
  created_at: string;
};
