-- Independent P1 module. HTTP/UI exposure is off by default; owner authorization is always required.
create table public.event_functions(
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null,event_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 140),
 starts_at timestamptz, ends_at timestamptz, time_zone text not null check(length(time_zone) between 1 and 100),
 status text not null default 'planned' check(status in ('planned','active','completed','cancelled')),
 notes text not null default '' check(length(notes)<=2000),
 state text not null default 'active' check(state in ('active','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at is null or (starts_at is not null and ends_at>=starts_at)),
 foreign key(workspace_id,event_id) references public.events(workspace_id,id),
 unique(workspace_id,event_id,id)
);
create index functions_event_start on public.event_functions(event_id,state,starts_at,id);
alter table public.event_functions enable row level security;
create policy functions_owner_read on public.event_functions for select to authenticated using(private.is_owner(workspace_id));
revoke all on public.event_functions from public,anon,authenticated;
grant select on public.event_functions to authenticated;
alter table public.tasks add column event_function_id uuid,
 add foreign key(workspace_id,event_id,event_function_id) references public.event_functions(workspace_id,event_id,id);
alter table public.budget_items add column event_function_id uuid,
 add foreign key(workspace_id,event_id,event_function_id) references public.event_functions(workspace_id,event_id,id);
alter table public.vendor_requirements add column event_function_id uuid,
 add foreign key(workspace_id,event_id,event_function_id) references public.event_functions(workspace_id,event_id,id);
create index tasks_function on public.tasks(event_function_id) where event_function_id is not null;
create index budget_function on public.budget_items(event_function_id) where event_function_id is not null;
create index vendors_function on public.vendor_requirements(event_function_id) where event_function_id is not null;

create function private.functions_snapshot(eid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e public.events;items jsonb;
begin
 e:=private.check_event(eid);
 select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'title',f.title,'startsAt',f.starts_at,'endsAt',f.ends_at,'timeZone',f.time_zone,'status',f.status,'notes',f.notes,
 'resources',jsonb_build_object(
 'tasks',(select coalesce(jsonb_agg(t.id order by t.id),'[]'::jsonb) from public.tasks t where t.event_function_id=f.id),
 'budgetItems',(select coalesce(jsonb_agg(b.id order by b.id),'[]'::jsonb) from public.budget_items b where b.event_function_id=f.id and b.state='active'),
 'vendors',(select coalesce(jsonb_agg(v.id order by v.id),'[]'::jsonb) from public.vendor_requirements v where v.event_function_id=f.id)
 )) order by f.starts_at nulls last,f.id),'[]'::jsonb) into items from public.event_functions f where f.event_id=eid and f.state='active';
 return jsonb_build_object('eventVersion',e.version,'items',items);
end $$;
create function private.function_command(eid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.events;f public.event_functions;rid uuid;digest text;op text;receipt public.idempotency_receipts;result jsonb;changed integer;details jsonb;
begin
 e:=private.check_event(eid);
 select * into e from public.events where id=eid for update;
 if idem is null or length(coalesce(request_id,'')) not between 1 and 100 or p is null or octet_length(p::text)>16000 then raise exception 'INVALID_INPUT';end if;
 if action not in ('put','archive','link') then raise exception 'UNSUPPORTED_OPERATION';end if;
 op:='function_'||action||':'||eid;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(e.workspace_id::text||auth.uid()::text||op||idem::text,0));
 digest:=encode(sha256(convert_to(jsonb_build_object('event',eid,'action',action,'payload',p,'expectedVersion',expected)::text,'UTF8')),'hex');
 select * into receipt from public.idempotency_receipts where workspace_id=e.workspace_id and actor_id=auth.uid() and operation=op and key=idem;
 if receipt.id is not null then
  if receipt.request_hash<>digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return receipt.response_ref||jsonb_build_object('replayed',true);
 end if;
 if expected is null or expected<>e.version then raise exception 'VERSION_CONFLICT';end if;
 rid:=(p->>'id')::uuid;
 if rid is not null then
  select * into f from public.event_functions where id=rid and event_id=eid and state='active';
  if f.id is null then raise exception 'NOT_FOUND';end if;
 end if;
 if action='put' then
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p->'fields'->>'timeZone') then raise exception 'INVALID_TIME_ZONE';end if;
  if rid is null and (select count(*) from public.event_functions where event_id=eid and state='active')>=50 then raise exception 'ITEM_LIMIT';end if;
  rid:=coalesce(rid,gen_random_uuid());
  insert into public.event_functions(id,workspace_id,event_id,title,starts_at,ends_at,time_zone,status,notes)
  values(rid,e.workspace_id,eid,p->'fields'->>'title',(p->'fields'->>'startsAt')::timestamptz,(p->'fields'->>'endsAt')::timestamptz,p->'fields'->>'timeZone',p->'fields'->>'status',coalesce(p->'fields'->>'notes',''))
  on conflict(id) do update set title=excluded.title,starts_at=excluded.starts_at,ends_at=excluded.ends_at,time_zone=excluded.time_zone,status=excluded.status,notes=excluded.notes,updated_at=now();
  details:=jsonb_build_object('before',case when f.id is null then null else jsonb_build_object('title',f.title,'startsAt',f.starts_at,'endsAt',f.ends_at,'timeZone',f.time_zone,'status',f.status) end,'after',(p->'fields')-'notes');
 elsif action='archive' then
  if f.id is null then raise exception 'NOT_FOUND';end if;
  if exists(select 1 from public.tasks where event_function_id=rid) or exists(select 1 from public.budget_items where event_function_id=rid and state='active') or exists(select 1 from public.vendor_requirements where event_function_id=rid) then raise exception 'FUNCTION_IN_USE';end if;
  update public.event_functions set state='archived',updated_at=now() where id=rid;
  details:=jsonb_build_object('title',f.title);
 else
  if f.id is null or jsonb_typeof(p->'assigned') is distinct from 'boolean' then raise exception 'INVALID_INPUT';end if;
  if p->>'kind'='task' then
   update public.tasks set event_function_id=case when (p->>'assigned')::boolean then rid else null end where id=(p->>'resourceId')::uuid and event_id=eid and ((p->>'assigned')::boolean or event_function_id=rid);
  elsif p->>'kind'='budget' then
   update public.budget_items set event_function_id=case when (p->>'assigned')::boolean then rid else null end where id=(p->>'resourceId')::uuid and event_id=eid and state='active' and not is_locked and ((p->>'assigned')::boolean or event_function_id=rid);
  elsif p->>'kind'='vendor' then
   update public.vendor_requirements set event_function_id=case when (p->>'assigned')::boolean then rid else null end where id=(p->>'resourceId')::uuid and event_id=eid and not is_locked and ((p->>'assigned')::boolean or event_function_id=rid);
  else raise exception 'UNSUPPORTED_OPERATION';end if;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'RESOURCE_UNAVAILABLE';end if;
  details:=jsonb_build_object('kind',p->>'kind','resourceId',p->>'resourceId','assigned',p->'assigned');
 end if;
 update public.events set version=version+1,updated_at=now() where id=eid returning * into e;
 insert into public.audit_events(workspace_id,event_id,actor_id,action,resource_type,resource_id,safe_diff,request_id)
 values(e.workspace_id,eid,auth.uid(),'function_'||action,'event_function',rid,details||jsonb_build_object('fromVersion',expected,'toVersion',e.version),request_id);
 result:=jsonb_build_object('id',rid,'version',e.version,'functions',private.functions_snapshot(eid));
 insert into public.idempotency_receipts(workspace_id,actor_id,operation,key,request_hash,response_ref) values(e.workspace_id,auth.uid(),op,idem,digest,result);
 return result;
end $$;
revoke all on function private.functions_snapshot(uuid),private.function_command(uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
grant execute on function private.functions_snapshot(uuid),private.function_command(uuid,text,jsonb,integer,uuid,text) to authenticated;
create function public.event_functions_snapshot(p_event_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.functions_snapshot(p_event_id)$$;
create function public.event_function_command(p_event_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.function_command(p_event_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
revoke all on function public.event_functions_snapshot(uuid),public.event_function_command(uuid,text,jsonb,integer,uuid,text) from public,anon;
grant execute on function public.event_functions_snapshot(uuid),public.event_function_command(uuid,text,jsonb,integer,uuid,text) to authenticated;
