alter table public.protected_market_drafts
  drop constraint if exists protected_market_drafts_owned_agent_fk;
alter table public.protected_market_drafts
  add constraint protected_market_drafts_owned_agent_fk
    foreign key (operator_agent_id, operator_id)
    references public.operator_agents(id, operator_id)
    on delete restrict
    deferrable initially deferred;

alter table public.launch_preflights
  drop constraint if exists launch_preflights_owned_draft_fk;
alter table public.launch_preflights
  add constraint launch_preflights_owned_draft_fk
    foreign key (draft_id, operator_id)
    references public.protected_market_drafts(id, operator_id)
    on delete cascade
    deferrable initially deferred;

alter table public.launch_attempts
  drop constraint if exists launch_attempts_owned_draft_fk;
alter table public.launch_attempts
  add constraint launch_attempts_owned_draft_fk
    foreign key (draft_id, operator_id)
    references public.protected_market_drafts(id, operator_id)
    on delete cascade
    deferrable initially deferred;

alter table public.protected_markets
  drop constraint if exists protected_markets_owned_draft_fk;
alter table public.protected_markets
  add constraint protected_markets_owned_draft_fk
    foreign key (draft_id, operator_id)
    references public.protected_market_drafts(id, operator_id)
    on delete restrict
    deferrable initially deferred;

alter table public.protected_markets
  drop constraint if exists protected_markets_owned_agent_fk;
alter table public.protected_markets
  add constraint protected_markets_owned_agent_fk
    foreign key (operator_agent_id, operator_id)
    references public.operator_agents(id, operator_id)
    on delete restrict
    deferrable initially deferred;

create or replace function public.claim_reference_launch_ownership(
  p_target_operator_id bigint,
  p_clawpump_agent_id text,
  p_reference_key text default 'CONT_SPCXX_V1'
)
returns table (
  id bigint,
  operator_id bigint,
  clawpump_agent_id text,
  clawpump_wallet_address text,
  agent_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agent_id bigint;
  v_current_operator_id bigint;
  v_draft_id uuid;
begin
  if not exists (
    select 1 from public.operators where operators.id = p_target_operator_id
  ) then
    raise exception 'Target operator does not exist.';
  end if;

  select operator_agents.id, operator_agents.operator_id
    into v_agent_id, v_current_operator_id
  from public.operator_agents
  where operator_agents.clawpump_agent_id = p_clawpump_agent_id
  for update;

  if v_agent_id is null then
    raise exception 'Configured ClawPump agent mapping does not exist.';
  end if;

  if v_current_operator_id = p_target_operator_id then
    return query
      select
        operator_agents.id,
        operator_agents.operator_id,
        operator_agents.clawpump_agent_id,
        operator_agents.clawpump_wallet_address,
        operator_agents.agent_name
      from public.operator_agents
      where operator_agents.id = v_agent_id;
    return;
  end if;

  select protected_market_drafts.id
    into v_draft_id
  from public.protected_market_drafts
  where protected_market_drafts.reference_key = p_reference_key
  for update;

  if v_draft_id is not null and exists (
    select 1
    from public.protected_market_drafts
    where protected_market_drafts.id = v_draft_id
      and protected_market_drafts.operator_agent_id <> v_agent_id
  ) then
    raise exception 'Reference draft is associated with a different agent.';
  end if;

  if exists (
    select 1
    from public.protected_markets
    where protected_markets.operator_agent_id = v_agent_id
       or protected_markets.draft_id = v_draft_id
  ) then
    raise exception 'A launched protected market prevents reference ownership transfer.';
  end if;

  if v_draft_id is not null and exists (
    select 1
    from public.launch_attempts
    where launch_attempts.draft_id = v_draft_id
      and launch_attempts.status not in ('FAILED', 'EXPIRED')
  ) then
    raise exception 'An active launch attempt prevents reference ownership transfer.';
  end if;

  set constraints
    protected_market_drafts_owned_agent_fk,
    launch_preflights_owned_draft_fk,
    launch_attempts_owned_draft_fk,
    protected_markets_owned_draft_fk,
    protected_markets_owned_agent_fk
    deferred;

  update public.operator_agents
  set operator_id = p_target_operator_id
  where operator_agents.id = v_agent_id;

  if v_draft_id is not null then
    update public.protected_market_drafts
    set operator_id = p_target_operator_id
    where protected_market_drafts.id = v_draft_id;

    update public.launch_preflights
    set operator_id = p_target_operator_id
    where launch_preflights.draft_id = v_draft_id;

    update public.launch_attempts
    set operator_id = p_target_operator_id
    where launch_attempts.draft_id = v_draft_id;
  end if;

  return query
    select
      operator_agents.id,
      operator_agents.operator_id,
      operator_agents.clawpump_agent_id,
      operator_agents.clawpump_wallet_address,
      operator_agents.agent_name
    from public.operator_agents
    where operator_agents.id = v_agent_id;
end;
$$;

revoke all on function public.claim_reference_launch_ownership(bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_reference_launch_ownership(bigint, text, text)
  to service_role;

comment on function public.claim_reference_launch_ownership(bigint, text, text) is
  'Atomically hands an unlaunched first-party reference agent and its draft evidence to the configured operator.';
