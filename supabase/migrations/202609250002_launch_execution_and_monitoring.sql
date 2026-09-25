alter table public.protected_market_drafts
  add column if not exists reference_key text;

create unique index if not exists protected_market_drafts_reference_key_idx
  on public.protected_market_drafts (reference_key)
  where reference_key is not null;

create table if not exists public.launch_attempts (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null,
  operator_id bigint not null references public.operators(id) on delete cascade,
  idempotency_key uuid not null,
  status text not null default 'PREPARING'
    check (status in ('PREPARING', 'READY', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'EXPIRED')),
  configuration_hash text,
  plan_hash text,
  message_hash text,
  recent_blockhash text,
  expires_at_block_height bigint,
  serialized_transaction text,
  base_mint text,
  quote_mint text,
  config_address text,
  virtual_pool_address text,
  transaction_signature text,
  failure_detail jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operator_id, idempotency_key),
  unique (id, operator_id),
  constraint launch_attempts_owned_draft_fk
    foreign key (draft_id, operator_id)
    references public.protected_market_drafts(id, operator_id)
    on delete cascade
);

create index if not exists launch_attempts_draft_created_idx
  on public.launch_attempts (draft_id, created_at desc);
create index if not exists launch_attempts_operator_created_idx
  on public.launch_attempts (operator_id, created_at desc);
create unique index if not exists launch_attempts_one_active_per_draft_idx
  on public.launch_attempts (draft_id)
  where status in ('PREPARING', 'READY', 'SUBMITTED');
create unique index if not exists launch_attempts_signature_idx
  on public.launch_attempts (transaction_signature)
  where transaction_signature is not null;

create table if not exists public.protected_markets (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique,
  operator_id bigint not null references public.operators(id) on delete cascade,
  operator_agent_id bigint not null,
  base_mint text not null,
  quote_mint text not null,
  quote_symbol text not null,
  config_address text not null unique,
  virtual_pool_address text not null unique,
  migration_pool_address text,
  launch_signature text not null unique,
  configuration_hash text not null,
  plan_hash text not null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'GRADUATED', 'ROLLOVER_REQUIRED', 'STOPPED')),
  lifecycle_state text not null default 'CURRENT'
    check (lifecycle_state in ('CURRENT', 'REVIEW_REQUIRED', 'RETIRED', 'SUCCESSOR_AVAILABLE')),
  raw_state jsonb not null default '{}'::jsonb,
  launched_at timestamptz not null default now(),
  last_monitored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, operator_id),
  constraint protected_markets_owned_draft_fk
    foreign key (draft_id, operator_id)
    references public.protected_market_drafts(id, operator_id)
    on delete restrict,
  constraint protected_markets_owned_agent_fk
    foreign key (operator_agent_id, operator_id)
    references public.operator_agents(id, operator_id)
    on delete restrict
);

create index if not exists protected_markets_operator_status_idx
  on public.protected_markets (operator_id, status, updated_at desc);
create index if not exists protected_markets_quote_status_idx
  on public.protected_markets (quote_mint, status);

create table if not exists public.market_monitoring_snapshots (
  id bigint generated always as identity primary key,
  market_id uuid not null references public.protected_markets(id) on delete cascade,
  observed_at timestamptz not null default now(),
  lifecycle_state text not null,
  dbc_state text not null,
  curve_progress_bps integer check (curve_progress_bps between 0 and 10000),
  fee_bps numeric(12, 6),
  base_reserve numeric,
  quote_reserve numeric,
  raw_payload jsonb not null default '{}'::jsonb,
  previous_hash text,
  receipt_hash text not null unique
);

create index if not exists monitoring_snapshots_market_observed_idx
  on public.market_monitoring_snapshots (market_id, observed_at desc);

create table if not exists public.market_alerts (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.protected_markets(id) on delete cascade,
  operator_id bigint not null references public.operators(id) on delete cascade,
  severity text not null check (severity in ('INFO', 'WARNING', 'CRITICAL')),
  code text not null,
  title text not null,
  detail text not null,
  evidence_hash text,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists market_alerts_operator_open_idx
  on public.market_alerts (operator_id, created_at desc)
  where acknowledged_at is null;
create index if not exists market_alerts_market_created_idx
  on public.market_alerts (market_id, created_at desc);

create table if not exists public.lifecycle_manifests (
  id uuid primary key default gen_random_uuid(),
  instrument_mint text not null,
  source_url text not null,
  source_observed_at timestamptz not null,
  content_hash text not null,
  manifest_hash text not null unique,
  manifest jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists lifecycle_manifests_instrument_observed_idx
  on public.lifecycle_manifests (instrument_mint, source_observed_at desc);

create table if not exists public.sentinel_runs (
  id uuid primary key default gen_random_uuid(),
  operator_id bigint references public.operators(id) on delete set null,
  market_id uuid references public.protected_markets(id) on delete set null,
  idempotency_key text not null unique,
  trigger text not null check (trigger in ('SCHEDULED', 'ON_DEMAND', 'CLAWPUMP_X402', 'MCP')),
  verdict text not null,
  request jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  document jsonb not null,
  previous_hash text,
  run_hash text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists sentinel_runs_market_created_idx
  on public.sentinel_runs (market_id, created_at desc);
create index if not exists sentinel_runs_operator_created_idx
  on public.sentinel_runs (operator_id, created_at desc);

create table if not exists public.decision_receipts (
  id uuid primary key default gen_random_uuid(),
  sentinel_run_id uuid not null unique references public.sentinel_runs(id) on delete cascade,
  market_id uuid references public.protected_markets(id) on delete set null,
  receipt_hash text not null unique,
  receipt jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists decision_receipts_market_created_idx
  on public.decision_receipts (market_id, created_at desc);

drop trigger if exists launch_attempts_set_updated_at on public.launch_attempts;
create trigger launch_attempts_set_updated_at
before update on public.launch_attempts
for each row execute function public.set_updated_at();

drop trigger if exists protected_markets_set_updated_at on public.protected_markets;
create trigger protected_markets_set_updated_at
before update on public.protected_markets
for each row execute function public.set_updated_at();

alter table public.launch_attempts enable row level security;
alter table public.protected_markets enable row level security;
alter table public.market_monitoring_snapshots enable row level security;
alter table public.market_alerts enable row level security;
alter table public.lifecycle_manifests enable row level security;
alter table public.sentinel_runs enable row level security;
alter table public.decision_receipts enable row level security;

revoke all on table public.launch_attempts from anon, authenticated;
revoke all on table public.protected_markets from anon, authenticated;
revoke all on table public.market_monitoring_snapshots from anon, authenticated;
revoke all on table public.market_alerts from anon, authenticated;
revoke all on table public.lifecycle_manifests from anon, authenticated;
revoke all on table public.sentinel_runs from anon, authenticated;
revoke all on table public.decision_receipts from anon, authenticated;

comment on table public.launch_attempts is 'Idempotent wallet-approval attempts for exact reviewed launch transactions.';
comment on table public.protected_markets is 'Confirmed Meteora markets registered for continuous lifecycle monitoring.';
comment on table public.market_monitoring_snapshots is 'Append-only DBC and lifecycle observations for registered markets.';
comment on table public.sentinel_runs is 'Durable scheduled, on-demand, x402, and MCP Sentinel decisions.';
