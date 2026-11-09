-- Politiques RLS pour HONORE AVIATOR sur un projet Supabase hébergé.
-- À exécuter après db/schema.sql dans l'éditeur SQL Supabase.
--
-- L'application écrit exclusivement côté serveur (clé service_role) : ces
-- politiques protègent les lectures faites directement depuis un client
-- Supabase avec la clé anon.

alter table public.profiles enable row level security;
alter table public.game_rounds enable row level security;
alter table public.bets enable row level security;
alter table public.predictions enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Profils : chacun lit le sien, les admins lisent tout.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = 'user');

-- Manches : lecture publique des manches terminées.
drop policy if exists rounds_select_all on public.game_rounds;
create policy rounds_select_all on public.game_rounds
  for select using (true);

-- Mises : lecture de ses propres mises, les admins lisent tout.
-- Aucune écriture client : les paris passent par le serveur.
drop policy if exists bets_select_own on public.bets;
create policy bets_select_own on public.bets
  for select using (auth.uid() = user_id or public.is_admin());

-- Prédictions : idem.
drop policy if exists predictions_select_own on public.predictions;
create policy predictions_select_own on public.predictions
  for select using (auth.uid() = user_id or public.is_admin());
