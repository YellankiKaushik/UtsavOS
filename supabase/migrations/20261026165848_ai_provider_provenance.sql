-- Additive provider provenance; existing financial/state command remains authoritative.
alter table public.ai_drafts
 add column provider_id text check(provider_id in ('gemini','openrouter')),
 add column requested_model_id text check(length(requested_model_id)<=150),
 add column actual_model_id text check(length(actual_model_id)<=150),
 add column provider_request_id text check(length(provider_request_id)<=200),
 add column fallback_occurred boolean not null default false,
 add column latency_ms integer check(latency_ms between 0 and 120000),
 add column attempt_count integer check(attempt_count between 1 and 3);
alter table public.ai_usage_records
 add column provider_id text check(provider_id in ('gemini','openrouter')),
 add column requested_model_id text check(length(requested_model_id)<=150),
 add column actual_model_id text check(length(actual_model_id)<=150),
 add column provider_request_id text check(length(provider_request_id)<=200),
 add column fallback_occurred boolean not null default false,
 add column latency_ms integer check(latency_ms between 0 and 120000),
 add column attempt_count integer check(attempt_count between 1 and 3),
 add column error_code text check(length(error_code)<=80),
 add column usage_metadata jsonb not null default '{}'::jsonb check(octet_length(usage_metadata::text)<=4096);

alter function private.command(uuid,uuid,text,jsonb,integer,uuid,text) rename to command_core;
revoke all on function private.command_core(uuid,uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
create function private.command(eid uuid,wid uuid,action text,p jsonb,expected integer,idem uuid,request_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;meta jsonb;rid uuid;workspace uuid;
begin
 result:=private.command_core(eid,wid,action,p,expected,idem,request_id);
 if coalesce((result->>'replayed')::boolean,false) then return result;end if;
 rid:=(result->>'id')::uuid;meta:=coalesce(p->'provenance','{}'::jsonb);
 if jsonb_typeof(meta)<>'object' or octet_length(meta::text)>4096 then raise exception 'INVALID_INPUT';end if;
 if action='reserve_ai' then
  select workspace_id into workspace from public.ai_usage_records where id=rid;
  -- Core holds the workspace row lock through this transaction. At most one active generation per workspace.
  if exists(select 1 from public.ai_usage_records where workspace_id=workspace and id<>rid and status='started' and created_at>now()-interval '60 seconds') then raise exception 'AI_BUSY';end if;
 end if;
 if action in ('reserve_ai','complete_ai') then
  update public.ai_usage_records set
   provider_id=coalesce(meta->>'provider',provider_id),requested_model_id=coalesce(meta->>'requestedModel',requested_model_id),
   actual_model_id=coalesce(meta->>'actualModel',actual_model_id),provider_request_id=coalesce(meta->>'providerRequestId',provider_request_id),
   fallback_occurred=coalesce((meta->>'fallbackOccurred')::boolean,fallback_occurred),latency_ms=coalesce((meta->>'latencyMs')::integer,latency_ms),
   attempt_count=coalesce((meta->>'attemptCount')::integer,attempt_count),error_code=meta->>'errorCode',
   usage_metadata=jsonb_strip_nulls(jsonb_build_object('routingProvider',left(meta->>'routingProvider',150),'reportedCost',left(meta->>'reportedCost',100)))
  where id=rid and actor_id=auth.uid();
 elsif action='save_draft' then
  update public.ai_drafts set provider_id=meta->>'provider',requested_model_id=meta->>'requestedModel',actual_model_id=meta->>'actualModel',
   provider_request_id=meta->>'providerRequestId',fallback_occurred=coalesce((meta->>'fallbackOccurred')::boolean,false),
   latency_ms=(meta->>'latencyMs')::integer,attempt_count=(meta->>'attemptCount')::integer where id=rid and created_by=auth.uid();
 end if;
 return result;
end $$;
revoke all on function private.command(uuid,uuid,text,jsonb,integer,uuid,text) from public,anon;
grant execute on function private.command(uuid,uuid,text,jsonb,integer,uuid,text) to authenticated;
-- Invalidate an already-used public SQL wrapper so pooled connections resolve the new entry point.
create or replace function public.event_command(p_event_id uuid,p_workspace_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text)
returns jsonb language sql security invoker set search_path='' as $$
 select private.command(p_event_id,p_workspace_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id);
$$;
revoke all on function public.event_command(uuid,uuid,text,jsonb,integer,uuid,text) from public,anon;
grant execute on function public.event_command(uuid,uuid,text,jsonb,integer,uuid,text) to authenticated;
