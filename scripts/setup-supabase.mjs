// scripts/setup-supabase.mjs
// Run: node scripts/setup-supabase.mjs <SERVICE_ROLE_KEY>
// This creates all database tables in your Supabase project

const SERVICE_ROLE_KEY = process.argv[2];
const SUPABASE_URL = 'https://ymsctbbrzfmowfevqwfu.supabase.co';

if (!SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/setup-supabase.mjs <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const SQL = `
-- TRANSACTIONS TABLE
create table if not exists public.transactions (
  id                text        primary key,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  date              text        not null,
  party_name        text        not null default '',
  description       text        not null default '',
  category          text        not null default '',
  payment_method    text        not null default '',
  reference_number  text        not null default '',
  debit_paisa       bigint      not null default 0,
  credit_paisa      bigint      not null default 0,
  notes             text        not null default '',
  is_deleted        boolean     not null default false,
  deleted_at        bigint,
  created_at        bigint      not null,
  updated_at        bigint      not null,
  sync_status       text        not null default 'synced'
);

-- SETTINGS TABLE
create table if not exists public.settings (
  id                        text    primary key default 'singleton',
  user_id                   uuid    not null references auth.users(id) on delete cascade,
  opening_balance_paisa     bigint  not null default 0,
  opening_balance_date      text    not null default '',
  opening_balance_note      text    not null default '',
  business_title            text    not null default 'Business Ledger',
  currency_symbol           text    not null default 'Rs.',
  date_format               text    not null default 'DD-MMM-YYYY',
  pdf_header                text    not null default 'Business Statement',
  durood_banner_visible     boolean not null default true,
  last_sync_at              bigint  not null default 0,
  updated_at                bigint  not null,
  sync_status               text    not null default 'synced'
);

-- CATEGORIES TABLE
create table if not exists public.categories (
  id          text    primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  name        text    not null,
  is_default  boolean not null default false,
  created_at  bigint  not null
);

-- PAYMENT METHODS TABLE
create table if not exists public.payment_methods (
  id          text    primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  name        text    not null,
  is_default  boolean not null default false,
  created_at  bigint  not null
);

-- INDEXES
create index if not exists idx_transactions_user_id    on public.transactions(user_id);
create index if not exists idx_transactions_date       on public.transactions(date);
create index if not exists idx_transactions_updated_at on public.transactions(updated_at);
create index if not exists idx_categories_user_id      on public.categories(user_id);
create index if not exists idx_payment_methods_user_id on public.payment_methods(user_id);
create index if not exists idx_settings_user_id        on public.settings(user_id);

-- ROW LEVEL SECURITY
alter table public.transactions    enable row level security;
alter table public.settings        enable row level security;
alter table public.categories      enable row level security;
alter table public.payment_methods enable row level security;

-- Drop existing policies if any (safe to re-run)
drop policy if exists "Users manage own transactions"    on public.transactions;
drop policy if exists "Users manage own settings"        on public.settings;
drop policy if exists "Users manage own categories"      on public.categories;
drop policy if exists "Users manage own payment_methods" on public.payment_methods;

-- Create policies
create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own payment_methods" on public.payment_methods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
`;

async function run() {
  console.log('🔗 Connecting to Supabase...');
  console.log('Project:', SUPABASE_URL);
  console.log('');

  // Use Supabase REST API with service_role key to execute SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql: SQL }),
  });

  if (!response.ok) {
    // Try via pg-gateway approach - use the management API
    console.log('Trying Management API...');
    const mgmtResponse = await fetch(
      `https://api.supabase.com/v1/projects/ymsctbbrzfmowfevqwfu/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: SQL }),
      }
    );

    if (!mgmtResponse.ok) {
      const err = await mgmtResponse.text();
      console.error('❌ Failed:', err);
      console.log('');
      console.log('📋 Please run supabase-schema.sql manually in Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/ymsctbbrzfmowfevqwfu/sql/new');
      process.exit(1);
    }

    const result = await mgmtResponse.json();
    console.log('✅ Tables created via Management API!', result);
    return;
  }

  console.log('✅ Database tables created successfully!');
  console.log('');

  // Now create the user account
  await createUser();
}

async function createUser() {
  const email = 'admin@leadger.app';
  const password = 'Change@Me123!';

  console.log('👤 Creating user account...');

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  const result = await response.json();

  if (response.ok) {
    console.log('✅ User account created!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  LOGIN CREDENTIALS (change password after first login)');
    console.log('  Email:    ' + email);
    console.log('  Password: ' + password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🌐 Open: http://localhost:5175');
    console.log('🔐 Login with the credentials above');
    console.log('⚠️  Change password in Settings after first login!');
  } else if (result.message?.includes('already')) {
    console.log('ℹ️  User already exists — use your existing credentials to login.');
  } else {
    console.error('❌ User creation failed:', result.message || result);
    console.log('   Create manually at: https://supabase.com/dashboard/project/ymsctbbrzfmowfevqwfu/auth/users');
  }
}

run().catch(console.error);
