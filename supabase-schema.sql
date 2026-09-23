-- ============================================================
-- Business Ledger — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────
-- 1. TRANSACTIONS TABLE
-- ─────────────────────────────────────────
create table if not exists public.transactions (
  id                text        primary key,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  date              text        not null,       -- YYYY-MM-DD
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

-- ─────────────────────────────────────────
-- 2. SETTINGS TABLE
-- ─────────────────────────────────────────
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

-- ─────────────────────────────────────────
-- 3. CATEGORIES TABLE
-- ─────────────────────────────────────────
create table if not exists public.categories (
  id          text    primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  name        text    not null,
  is_default  boolean not null default false,
  created_at  bigint  not null
);

-- ─────────────────────────────────────────
-- 4. PAYMENT METHODS TABLE
-- ─────────────────────────────────────────
create table if not exists public.payment_methods (
  id          text    primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  name        text    not null,
  is_default  boolean not null default false,
  created_at  bigint  not null
);

-- ─────────────────────────────────────────
-- 5. INDEXES for fast lookups
-- ─────────────────────────────────────────
create index if not exists idx_transactions_user_id    on public.transactions(user_id);
create index if not exists idx_transactions_date       on public.transactions(date);
create index if not exists idx_transactions_updated_at on public.transactions(updated_at);
create index if not exists idx_categories_user_id      on public.categories(user_id);
create index if not exists idx_payment_methods_user_id on public.payment_methods(user_id);
create index if not exists idx_settings_user_id        on public.settings(user_id);

-- ─────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────
alter table public.transactions    enable row level security;
alter table public.settings        enable row level security;
alter table public.categories      enable row level security;
alter table public.payment_methods enable row level security;

-- Transactions: user can only see/edit their own
create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Settings: user can only see/edit their own
create policy "Users manage own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Categories: user can only see/edit their own
create policy "Users manage own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Payment methods: user can only see/edit their own
create policy "Users manage own payment_methods" on public.payment_methods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- DONE! Your database is ready.
-- ─────────────────────────────────────────

-- ═══════════════════════════════════════════
-- V2 MIGRATION — Financial Accounts Feature
-- ═══════════════════════════════════════════

-- ─────────────────────────────────────────
-- 7. ACCOUNTS TABLE
-- ─────────────────────────────────────────
create table if not exists public.accounts (
  id                    text        primary key,
  user_id               uuid        not null references auth.users(id) on delete cascade,
  name                  text        not null,
  type                  text        not null default 'bank',
  icon                  text        not null default '🏦',
  color                 text        not null default '#4A90D9',
  opening_balance_paisa bigint      not null default 0,
  is_active             boolean     not null default true,
  created_at            bigint      not null,
  updated_at            bigint      not null,
  sync_status           text        not null default 'synced'
);

-- ─────────────────────────────────────────
-- 8. ADD ACCOUNT COLUMNS TO TRANSACTIONS
-- ─────────────────────────────────────────
alter table public.transactions add column if not exists account_id  text not null default '';
alter table public.transactions add column if not exists transfer_id text not null default '';

-- ─────────────────────────────────────────
-- 9. INDEXES for accounts
-- ─────────────────────────────────────────
create index if not exists idx_accounts_user_id         on public.accounts(user_id);
create index if not exists idx_transactions_account_id  on public.transactions(account_id);
create index if not exists idx_transactions_transfer_id on public.transactions(transfer_id);

-- ─────────────────────────────────────────
-- 10. RLS for accounts
-- ─────────────────────────────────────────
alter table public.accounts enable row level security;

create policy "Users manage own accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

