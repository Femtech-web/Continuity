create extension if not exists pgcrypto;

create table if not exists public.operators (
  id bigint generated always as identity primary key,
  wallet_address text not null unique check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_auth_challenges (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  nonce_hash text not null unique,
  message text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wallet_auth_challenges_wallet_created_idx
  on public.wallet_auth_challenges (wallet_address, created_at desc);
create index if not exists wallet_auth_challenges_expiry_idx
  on public.wallet_auth_challenges (expires_at)
  where consumed_at is null;

create table if not exists public.operator_sessions (
  id bigint generated always as identity primary key,
  operator_id bigint not null references public.operators(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists operator_sessions_operator_idx
  on public.operator_sessions (operator_id, created_at desc);
create index if not exists operator_sessions_active_expiry_idx
  on public.operator_sessions (expires_at)
  where revoked_at is null;

create table if not exists public.operator_agents (
  id bigint generated always as identity primary key,
  operator_id bigint not null references public.operators(id) on delete cascade,
  clawpump_agent_id text not null unique,
  clawpump_wallet_address text not null check (clawpump_wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  agent_name text not null,
  created_at timestamptz not null default now(),
  unique (operator_id, clawpump_agent_id),
  unique (id, operator_id)
);

create index if not exists operator_agents_operator_idx
  on public.operator_agents (operator_id, created_at desc);

create table if not exists public.protected_market_drafts (
  id uuid primary key default gen_random_uuid(),
  operator_id bigint not null references public.operators(id) on delete cascade,
  operator_agent_id bigint not null,
  token_name text not null check (char_length(token_name) between 2 and 48),
  token_symbol text not null check (token_symbol ~ '^[A-Z0-9]{2,10}$'),
  token_description text not null check (char_length(token_description) between 20 and 500),
  token_image_url text,
  quote_symbol text not null,
  quote_mint text not null check (quote_mint ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  config jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PREFLIGHT_READY', 'PREFLIGHT_FAILED', 'APPROVED', 'SUBMITTED', 'CONFIRMED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, operator_id),
  constraint protected_market_drafts_owned_agent_fk
    foreign key (operator_agent_id, operator_id)
    references public.operator_agents(id, operator_id)
    on delete restrict
);

create index if not exists protected_market_drafts_operator_idx
  on public.protected_market_drafts (operator_id, updated_at desc);
create index if not exists protected_market_drafts_agent_idx
  on public.protected_market_drafts (operator_agent_id);
create index if not exists protected_market_drafts_status_idx
  on public.protected_market_drafts (status, updated_at desc);

create table if not exists public.launch_preflights (
  id bigint generated always as identity primary key,
  draft_id uuid not null,
  operator_id bigint not null references public.operators(id) on delete cascade,
  plan_hash text not null,
  configuration_hash text not null,
  state text not null check (state in ('PASSED', 'FAILED')),
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint launch_preflights_owned_draft_fk
    foreign key (draft_id, operator_id)
    references public.protected_market_drafts(id, operator_id)
    on delete cascade
);

create index if not exists launch_preflights_draft_idx
  on public.launch_preflights (draft_id, created_at desc);
create index if not exists launch_preflights_operator_idx
  on public.launch_preflights (operator_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists operators_set_updated_at on public.operators;
create trigger operators_set_updated_at
before update on public.operators
for each row execute function public.set_updated_at();

drop trigger if exists protected_market_drafts_set_updated_at on public.protected_market_drafts;
create trigger protected_market_drafts_set_updated_at
before update on public.protected_market_drafts
for each row execute function public.set_updated_at();

alter table public.operators enable row level security;
alter table public.wallet_auth_challenges enable row level security;
alter table public.operator_sessions enable row level security;
alter table public.operator_agents enable row level security;
alter table public.protected_market_drafts enable row level security;
alter table public.launch_preflights enable row level security;

revoke all on table public.operators from anon, authenticated;
revoke all on table public.wallet_auth_challenges from anon, authenticated;
revoke all on table public.operator_sessions from anon, authenticated;
revoke all on table public.operator_agents from anon, authenticated;
revoke all on table public.protected_market_drafts from anon, authenticated;
revoke all on table public.launch_preflights from anon, authenticated;

comment on table public.operators is 'Wallet-authenticated Continuity market operators.';
comment on table public.operator_agents is 'ClawPump agents created through Continuity and bound to one operator.';
comment on table public.protected_market_drafts is 'No-effect launch proposals; an onchain market exists only after wallet approval and confirmation.';
