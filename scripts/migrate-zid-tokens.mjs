import pg from "pg";

const { Client } = pg;

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("SUPABASE_DB_URL is not set");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const SQL = `
create table if not exists public.zid_tokens (
  merchant_id text primary key,
  access_token text not null,
  refresh_token text,
  authorization_token text,
  expires_at timestamptz,
  merchant_name text,
  merchant_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.zid_tokens enable row level security;
`;

try {
  await client.connect();
  await client.query(SQL);
  const { rows } = await client.query(
    "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'zid_tokens' order by ordinal_position",
  );
  console.log("Table zid_tokens created. Columns:");
  for (const r of rows) console.log(` - ${r.column_name} (${r.data_type})`);
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
