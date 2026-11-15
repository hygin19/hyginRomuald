-- HONORE AVIATOR — schéma applicatif (compatible Supabase / PostgreSQL)
-- Exécuté automatiquement par `npm run bootstrap` (scripts/bootstrap.mjs).

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  username text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  balance_mga bigint not null default 50000 check (balance_mga >= 0),
  created_at timestamptz not null default now()
);

-- Lie les profils à Supabase Auth quand GoTrue est présent (local ou hébergé).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    alter table public.profiles drop constraint if exists profiles_auth_fkey;
    alter table public.profiles
      add constraint profiles_auth_fkey foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

create table if not exists public.game_rounds (
  id bigserial primary key,
  round_no integer not null unique,
  crash_multiplier numeric(8, 2) not null check (crash_multiplier >= 1),
  started_at timestamptz not null,
  fly_start_at timestamptz not null,
  fly_end_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists game_rounds_recent_idx on public.game_rounds (round_no desc);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  round_id bigint not null references public.game_rounds (id) on delete cascade,
  amount_mga bigint not null check (amount_mga between 50 and 500000),
  auto_cashout numeric(8, 2),
  status text not null default 'placed' check (status in ('placed', 'cashed', 'lost')),
  cashed_out_multiplier numeric(8, 2),
  payout_mga bigint,
  created_at timestamptz not null default now(),
  cashed_out_at timestamptz,
  unique (user_id, round_id)
);
create index if not exists bets_user_idx on public.bets (user_id, created_at desc);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_round_no integer not null,
  predicted_multiplier numeric(8, 2) not null,
  confidence integer not null default 55 check (confidence between 1 and 99),
  result text not null default 'pending' check (result in ('pending', 'gagne', 'perdu')),
  created_at timestamptz not null default now()
);
create index if not exists predictions_user_idx on public.predictions (user_id, created_at desc);
create index if not exists predictions_pending_idx on public.predictions (result, target_round_no);

-- Historique manuel des multiplicateurs (module séparé, saisie manuelle only).
-- Deux copies indépendantes, même UUID : `multiplier_history` est la table
-- Supabase PostgreSQL, `multiplier_history_entity` la copie applicative
-- (équivalent de l'entité MultiplierHistory côté base de l'application).
create table if not exists public.multiplier_history (
  id uuid primary key,
  multiplier numeric(12, 4) not null check (multiplier > 0),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  source text not null default 'manual' check (source = 'manual'),
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced')),
  updated_at timestamptz not null default now()
);
create index if not exists multiplier_history_occurred_idx
  on public.multiplier_history (created_by, occurred_at desc);

create table if not exists public.multiplier_history_entity (
  id uuid primary key,
  multiplier numeric(12, 4) not null check (multiplier > 0),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  source text not null default 'manual' check (source = 'manual'),
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced')),
  updated_at timestamptz not null default now()
);
create index if not exists multiplier_history_entity_occurred_idx
  on public.multiplier_history_entity (created_by, occurred_at desc);
