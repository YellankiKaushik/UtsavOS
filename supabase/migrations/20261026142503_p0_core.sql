-- P0 normalized state. No service-role path; guarded RPCs use auth.uid().
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
 kind text not null default 'personal' check(kind in ('personal','agency')),
 personal_owner_user_id uuid unique references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
 workspace_id uuid not null references public.workspaces(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','member')), state text not null default 'active' check(state in ('active','revoked')),
 joined_at timestamptz not null default now(), revoked_at timestamptz, primary key(workspace_id,user_id)
);
create index workspace_members_user on public.workspace_members(user_id,workspace_id);
create table public.events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 type text not null check(type in ('wedding','birthday','community')), title text not null check(length(trim(title)) between 1 and 140),
 date_status text not null check(date_status in ('tbd','scheduled')), starts_at timestamptz, time_zone text not null,
 guest_count integer not null check(guest_count between 0 and 100000), currency text not null default 'INR' check(currency='INR'),
 budget_minor bigint not null check(budget_minor between 0 and 9000000000000), preferences text not null default '' check(length(preferences)<=2000),
 version integer not null default 1 check(version>=1),status text not null default 'planning' check(status in ('planning','active','completed','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((date_status='tbd' and starts_at is null) or (date_status='scheduled' and starts_at is not null)), unique(workspace_id,id)
);
create index events_workspace_date on public.events(workspace_id,created_at desc,id desc);
create table public.budget_items (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 140),category text not null check(length(category) between 1 and 80),
 pricing_basis text not null check(pricing_basis in ('fixed','per_guest','per_unit')),
 unit_price_minor bigint not null check(unit_price_minor between 0 and 9000000000000),manual_quantity integer,
 source_kind text not null check(source_kind in ('ai_estimate','user_estimate','vendor_quote')),source_label text check(length(source_label)<=500),
 is_locked boolean not null default false,state text not null default 'active' check(state in ('active','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((pricing_basis='per_unit' and manual_quantity is not null and manual_quantity between 0 and 100000) or (pricing_basis in ('fixed','per_guest') and manual_quantity is null)),
 foreign key(workspace_id,event_id) references public.events(workspace_id,id), unique(workspace_id,event_id,id)
);
create index budget_event on public.budget_items(event_id,state);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 200),description text check(length(description)<=4000),
 status text not null default 'todo' check(status in ('todo','in_progress','done','blocked')),
 due_at timestamptz,priority text not null default 'normal' check(priority in ('low','normal','high')),is_locked boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,event_id) references public.events(workspace_id,id),unique(workspace_id,event_id,id)
);
create index tasks_event_due on public.tasks(event_id,due_at,id);
create table public.task_dependencies (
 workspace_id uuid not null,event_id uuid not null,task_id uuid not null,depends_on_task_id uuid not null,created_at timestamptz not null default now(),
 primary key(task_id,depends_on_task_id),check(task_id<>depends_on_task_id),
 foreign key(workspace_id,event_id,task_id) references public.tasks(workspace_id,event_id,id) on delete cascade,
 foreign key(workspace_id,event_id,depends_on_task_id) references public.tasks(workspace_id,event_id,id)
);
create index dependencies_parent on public.task_dependencies(depends_on_task_id);
create table public.vendor_requirements (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 140),category text not null check(length(category) between 1 and 80),
 status text not null default 'needed' check(status in ('needed','researching','shortlisted','confirmed','not_needed')),
 notes text check(length(notes)<=4000),quote_source text check(length(quote_source)<=500),is_locked boolean not null default false,
 estimated_cost_minor bigint check(estimated_cost_minor between 0 and 9000000000000),due_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,event_id) references public.events(workspace_id,id)
);
create index vendors_event on public.vendor_requirements(event_id,status);
create table public.ai_drafts (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,base_version integer not null,
 model_id text not null,prompt_version text not null default 'event-plan.v1',schema_version integer not null default 1 check(schema_version=1),
 payload jsonb not null check(octet_length(payload::text)<=65536),status text not null default 'ready' check(status in ('ready','accepted','partial','discarded','invalid')),
 created_by uuid not null references auth.users(id),expires_at timestamptz not null default now()+interval '24 hours',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(workspace_id,event_id) references public.events(workspace_id,id)
);
create index drafts_event on public.ai_drafts(event_id,created_at desc);
create table public.replan_proposals (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,base_version integer not null,
 proposed_change jsonb not null,typed_operations jsonb not null,warnings jsonb not null,calculated_effects jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','expired','superseded')),
 created_by uuid not null references auth.users(id),approved_by uuid references auth.users(id),expires_at timestamptz not null default now()+interval '30 minutes',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(workspace_id,event_id) references public.events(workspace_id,id)
);
create index proposals_event on public.replan_proposals(event_id,created_at desc);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,actor_id uuid references auth.users(id),
 action text not null,resource_type text not null,resource_id uuid,safe_diff jsonb not null,request_id text not null,occurred_at timestamptz not null default now(),
 foreign key(workspace_id,event_id) references public.events(workspace_id,id)
);
create index audit_event on public.audit_events(event_id,occurred_at desc,id desc);
create table public.idempotency_receipts (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),actor_id uuid not null references auth.users(id),
 operation text not null,key uuid not null,request_hash text not null,response_ref jsonb not null,expires_at timestamptz not null default now()+interval '24 hours',
 created_at timestamptz not null default now(),unique(workspace_id,actor_id,operation,key)
);
create table public.ai_usage_records (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),actor_id uuid not null references auth.users(id),event_id uuid not null,
 model_id text not null,operation text not null check(operation in ('plan','explain')),input_tokens integer check(input_tokens>=0),output_tokens integer check(output_tokens>=0),
 status text not null check(status in ('started','success','failed')),estimated_cost_minor bigint check(estimated_cost_minor>=0),
 created_at timestamptz not null default now(),foreign key(workspace_id,event_id) references public.events(workspace_id,id)
);
create index ai_usage_workspace on public.ai_usage_records(workspace_id,created_at);

create function private.is_owner(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.workspace_members where workspace_id=w and user_id=auth.uid() and state='active' and role='owner');
$$;
create function private.check_event(e uuid) returns public.events language plpgsql security definer set search_path='' as $$
declare r public.events;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 select * into r from public.events where id=e;
 if r.id is null or not private.is_owner(r.workspace_id) then raise exception 'NOT_FOUND'; end if;
 return r;
end $$;

create function private.validate_event() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.time_zone) then raise exception 'INVALID_TIME_ZONE'; end if;
 return new;
end $$;
create trigger validate_event before insert or update on public.events for each row execute function private.validate_event();

-- Explicit grants and read policies for every exposed table. Mutation grants are absent.
do $$ declare t text; begin
 foreach t in array array['workspaces','workspace_members','events','budget_items','tasks','task_dependencies','vendor_requirements','ai_drafts','replan_proposals','audit_events','idempotency_receipts','ai_usage_records'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  if t='workspaces' then execute 'create policy owner_read on public.workspaces for select to authenticated using (private.is_owner(id))';
  else execute format('create policy owner_read on public.%I for select to authenticated using (private.is_owner(workspace_id))',t); end if;
 end loop;
end $$;

create function private.provision() returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 select id into w from public.workspaces where personal_owner_user_id=auth.uid();
 if w is not null then
  if not private.is_owner(w) then raise exception 'ACCESS_DENIED';end if;
  return w;
 end if;
 insert into public.workspaces(name,personal_owner_user_id) values('Personal workspace',auth.uid()) returning id into w;
 insert into public.workspace_members(workspace_id,user_id,role) values(w,auth.uid(),'owner');return w;
end $$;
create function public.create_personal_workspace() returns uuid language sql security invoker set search_path='' as $$ select private.provision(); $$;

create function private.event_json(e public.events) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',e.id,'workspaceId',e.workspace_id,'type',e.type,'title',e.title,'dateStatus',e.date_status,'startsAt',e.starts_at,'timeZone',e.time_zone,'guestCount',e.guest_count,'currency',e.currency,'budgetMinor',e.budget_minor::text,'preferences',e.preferences,'version',e.version,'status',e.status,'createdAt',e.created_at);
$$;
create function private.snapshot(eid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.events; result jsonb;
begin
 e:=private.check_event(eid);
 select jsonb_build_object('event',private.event_json(e),
 'budgetItems',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'title',b.title,'category',b.category,'pricingBasis',b.pricing_basis,'unitPriceMinor',b.unit_price_minor::text,'quantity',b.manual_quantity,'sourceKind',b.source_kind,'sourceLabel',b.source_label,'isLocked',b.is_locked,'state',b.state) order by b.created_at,b.id) from public.budget_items b where b.event_id=eid and b.state='active'),'[]'::jsonb),
 'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'description',t.description,'status',t.status,'dueAt',t.due_at,'priority',t.priority,'isLocked',t.is_locked,'dependencyIds',coalesce((select jsonb_agg(d.depends_on_task_id) from public.task_dependencies d where d.task_id=t.id),'[]'::jsonb)) order by t.due_at nulls last,t.id) from public.tasks t where t.event_id=eid),'[]'::jsonb),
 'vendors',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'category',v.category,'status',v.status,'notes',v.notes,'quoteSource',v.quote_source,'isLocked',v.is_locked,'estimatedCostMinor',v.estimated_cost_minor::text,'dueAt',v.due_at) order by v.created_at,v.id) from public.vendor_requirements v where v.event_id=eid),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.event_snapshot(p_event_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.snapshot(p_event_id); $$;

create function private.total(eid uuid, guests integer) returns bigint language plpgsql security definer set search_path='' as $$
declare n numeric;
begin
 if guests is null or guests<0 or guests>100000 then raise exception 'INVALID_GUEST_COUNT';end if;
 select coalesce(sum(unit_price_minor::numeric*case pricing_basis when 'fixed' then 1 when 'per_guest' then guests else manual_quantity end),0) into n from public.budget_items where event_id=eid and state='active';
 if n>9000000000000 or n<0 then raise exception 'BUDGET_OVERFLOW';end if;return n::bigint;
end $$;
create function private.assert_dag(eid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public.tasks where event_id=eid)>1000 then raise exception 'TASK_LIMIT';end if;
 if exists(with recursive reach(task_id,parent_id) as (
  select d.task_id,d.depends_on_task_id from public.task_dependencies d where d.event_id=eid
  union select r.task_id,d.depends_on_task_id from reach r join public.task_dependencies d on d.task_id=r.parent_id and d.event_id=eid
 ) select 1 from reach where task_id=parent_id) then raise exception 'DEPENDENCY_CYCLE';end if;
end $$;

-- Shared internal item upsert: literal branches, never dynamic SQL.
create function private.put_item(e public.events,kind text,rid uuid,p jsonb,removing boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare locked boolean;oldjson jsonb;dep text;
begin
 if rid is null then
  if kind='budget' and (select count(*) from public.budget_items where event_id=e.id and state='active')>=500 then raise exception 'ITEM_LIMIT';end if;
  if kind='vendor' and (select count(*) from public.vendor_requirements where event_id=e.id)>=200 then raise exception 'ITEM_LIMIT';end if;
  rid:=gen_random_uuid();
 else
  if kind='budget' then select is_locked,to_jsonb(b) into locked,oldjson from public.budget_items b where id=rid and event_id=e.id and state='active';
  elsif kind='task' then select is_locked,to_jsonb(t) into locked,oldjson from public.tasks t where id=rid and event_id=e.id;
  elsif kind='vendor' then select is_locked,to_jsonb(v) into locked,oldjson from public.vendor_requirements v where id=rid and event_id=e.id;
  else raise exception 'INVALID_OPERATION';end if;
  if oldjson is null then raise exception 'NOT_FOUND';end if;
  -- A locked row can only be explicitly unlocked in a separate mutation.
  if locked then
   if removing or p<>jsonb_build_object('isLocked',false) then raise exception 'PROTECTED_RESOURCE';end if;
   if kind='budget' then update public.budget_items set is_locked=false,updated_at=now() where id=rid;
   elsif kind='task' then update public.tasks set is_locked=false,updated_at=now() where id=rid;
   else update public.vendor_requirements set is_locked=false,updated_at=now() where id=rid;end if;return rid;
  end if;
 end if;
 if removing then
  if kind='budget' then update public.budget_items set state='archived',updated_at=now() where id=rid;
  elsif kind='task' then delete from public.task_dependencies where task_id=rid;delete from public.tasks where id=rid;
  elsif kind='vendor' then delete from public.vendor_requirements where id=rid;
  else raise exception 'INVALID_OPERATION';end if;return rid;
 end if;
 if kind='budget' then
  insert into public.budget_items(id,workspace_id,event_id,title,category,pricing_basis,unit_price_minor,manual_quantity,source_kind,source_label,is_locked)
  values(rid,e.workspace_id,e.id,p->>'title',p->>'category',p->>'pricingBasis',(p->>'unitPriceMinor')::bigint,(p->>'quantity')::integer,p->>'sourceKind',p->>'sourceLabel',coalesce((p->>'isLocked')::boolean,false))
  on conflict(id) do update set title=excluded.title,category=excluded.category,pricing_basis=excluded.pricing_basis,unit_price_minor=excluded.unit_price_minor,manual_quantity=excluded.manual_quantity,source_kind=excluded.source_kind,source_label=excluded.source_label,is_locked=excluded.is_locked,updated_at=now();
 elsif kind='task' then
  if jsonb_array_length(coalesce(p->'dependencyIds','[]'::jsonb))>100 then raise exception 'INVALID_INPUT';end if;
  insert into public.tasks(id,workspace_id,event_id,title,description,status,due_at,priority,is_locked)
  values(rid,e.workspace_id,e.id,p->>'title',p->>'description',coalesce(p->>'status','todo'),(p->>'dueAt')::timestamptz,coalesce(p->>'priority','normal'),coalesce((p->>'isLocked')::boolean,false))
  on conflict(id) do update set title=excluded.title,description=excluded.description,status=excluded.status,due_at=excluded.due_at,priority=excluded.priority,is_locked=excluded.is_locked,updated_at=now();
  delete from public.task_dependencies where task_id=rid;
  for dep in select jsonb_array_elements_text(coalesce(p->'dependencyIds','[]'::jsonb)) loop
   insert into public.task_dependencies(workspace_id,event_id,task_id,depends_on_task_id) values(e.workspace_id,e.id,rid,dep::uuid);
  end loop;
 elsif kind='vendor' then
  insert into public.vendor_requirements(id,workspace_id,event_id,title,category,status,notes,quote_source,is_locked,estimated_cost_minor,due_at)
  values(rid,e.workspace_id,e.id,p->>'title',p->>'category',coalesce(p->>'status','needed'),p->>'notes',p->>'quoteSource',coalesce((p->>'isLocked')::boolean,false),(p->>'estimatedCostMinor')::bigint,(p->>'dueAt')::timestamptz)
  on conflict(id) do update set title=excluded.title,category=excluded.category,status=excluded.status,notes=excluded.notes,quote_source=excluded.quote_source,is_locked=excluded.is_locked,estimated_cost_minor=excluded.estimated_cost_minor,due_at=excluded.due_at,updated_at=now();
 else raise exception 'INVALID_OPERATION';end if;
 return rid;
end $$;

create function private.command(eid uuid,wid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 e public.events;rec public.idempotency_receipts;result jsonb;rid uuid;digest text;v_operation text;
 old_version integer;before_total bigint;after_total bigint;new_guests integer;
 b public.budget_items;pr public.replan_proposals;dr public.ai_drafts;
 operations jsonb:='[]'::jsonb;warnings jsonb:='[]'::jsonb;entry jsonb;item jsonb;selection jsonb;mapping jsonb:='{}'::jsonb;deps jsonb;draft_key text;selected_count integer:=0;available_count integer:=0;
 authoritative boolean:=true;details jsonb:='{}'::jsonb;affected jsonb;daily integer;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 if idem is null or length(coalesce(request_id,'')) not between 1 and 100 or octet_length(p::text)>100000 then raise exception 'INVALID_INPUT';end if;
 if action='create' then
  if not private.is_owner(wid) then raise exception 'NOT_FOUND';end if;
 else
  e:=private.check_event(eid);wid:=e.workspace_id;
  select * into e from public.events where id=eid for update;
 end if;
 v_operation:=action||':'||coalesce(eid::text,'new');
 -- Serialize identical commands including create and non-authoritative saves.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(wid::text||auth.uid()::text||v_operation||idem::text,0));
 digest:=encode(sha256(convert_to(jsonb_build_object('event',eid,'action',action,'payload',p,'expectedVersion',expected)::text,'UTF8')),'hex');
 select * into rec from public.idempotency_receipts where workspace_id=wid and actor_id=auth.uid() and key=idem and idempotency_receipts.operation=v_operation;
 if rec.id is not null then
  if rec.request_hash<>digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return rec.response_ref || jsonb_build_object('replayed',true);
 end if;
 if action not in ('create','complete_ai','save_draft') and (expected is null or e.version<>expected) then raise exception 'VERSION_CONFLICT';end if;
 old_version:=coalesce(e.version,0);
 if action='create' then
  insert into public.events(workspace_id,type,title,date_status,starts_at,time_zone,guest_count,currency,budget_minor,preferences,status)
  values(wid,p->>'type',p->>'title',p->>'dateStatus',(p->>'startsAt')::timestamptz,p->>'timeZone',(p->>'guestCount')::integer,p->>'currency',(p->>'budgetMinor')::bigint,coalesce(p->>'preferences',''),coalesce(p->>'status','planning')) returning * into e;
  eid:=e.id;rid:=e.id;
 elsif action='update' then
  if p ? 'guestCount' and (p->>'guestCount')::integer<>e.guest_count then raise exception 'REPLAN_REQUIRED';end if;
  update public.events set title=p->>'title',type=p->>'type',date_status=p->>'dateStatus',starts_at=(p->>'startsAt')::timestamptz,time_zone=p->>'timeZone',currency=p->>'currency',budget_minor=(p->>'budgetMinor')::bigint,preferences=coalesce(p->>'preferences',''),status=coalesce(p->>'status','planning') where id=eid;
  rid:=eid;
 elsif action in ('put_budget','put_task','put_vendor','delete_budget','delete_task','delete_vendor') then
  if action in ('put_budget','delete_budget') and p->>'id' is not null then select jsonb_build_object('previousTitle',title,'previousCategory',category,'previousUnitPriceMinor',unit_price_minor::text,'previousPricingBasis',pricing_basis,'previousQuantity',manual_quantity) into details from public.budget_items where id=(p->>'id')::uuid and event_id=eid;end if;
  rid:=private.put_item(e,split_part(action,'_',2),(p->>'id')::uuid,p->'fields',left(action,6)='delete');
 elsif action='save_draft' then
  authoritative:=false;
  if expected is null or expected<1 or expected>e.version then raise exception 'VERSION_CONFLICT';end if;
  if jsonb_typeof(p->'payload')<>'object' or (p->'payload'->>'eventType')<>e.type or p->'payload'->>'schemaVersion'<>'1' then raise exception 'AI_INVALID_OUTPUT';end if;
  insert into public.ai_drafts(workspace_id,event_id,base_version,model_id,payload,created_by) values(wid,eid,expected,p->>'modelId',p->'payload',auth.uid()) returning id into rid;
 elsif action='accept' then
  select * into dr from public.ai_drafts where id=(p->>'draftId')::uuid and event_id=eid for update;
  if dr.id is null then raise exception 'NOT_FOUND';end if;
  if dr.base_version<>e.version or dr.status<>'ready' then raise exception 'VERSION_CONFLICT';end if;
  if dr.expires_at<=now() then raise exception 'PROPOSAL_EXPIRED';end if;
  selection:=p->'selectedDraftItemIds';
  if jsonb_typeof(selection)<>'array' or jsonb_array_length(selection)=0 or jsonb_array_length(selection)>49 or (select count(distinct x) from jsonb_array_elements_text(selection) x)<>jsonb_array_length(selection) then raise exception 'INVALID_SELECTION';end if;
  if jsonb_array_length(dr.payload->'budgetSuggestions')>12 or jsonb_array_length(dr.payload->'tasks')>25 or jsonb_array_length(dr.payload->'vendorRequirements')>12 then raise exception 'AI_INVALID_OUTPUT';end if;
  -- Preassign IDs so task dependencies can refer forward within a selected draft.
  for item in select value from jsonb_array_elements(dr.payload->'tasks') loop
   if selection ? (item->>'draftId') then mapping:=mapping||jsonb_build_object(item->>'draftId',gen_random_uuid());end if;
  end loop;
  for item in select value from jsonb_array_elements(dr.payload->'budgetSuggestions') loop
   available_count:=available_count+1;
   if selection ? (item->>'draftId') then
    if item->>'sourceKind'<>'ai_estimate' or item->>'evidenceStatus'<>'unverified' then raise exception 'AI_INVALID_OUTPUT';end if;
    item:=item||jsonb_build_object('title',coalesce(p->'edits'->(item->>'draftId')->>'title',item->>'title'),'unitPriceMinor',coalesce(p->'edits'->(item->>'draftId')->>'unitPriceMinor',item->>'unitPriceMinor'));
    rid:=private.put_item(e,'budget',null,item||jsonb_build_object('sourceKind','ai_estimate','sourceLabel','AI assumption — confirm','isLocked',false));selected_count:=selected_count+1;
   end if;
  end loop;
  for item in select value from jsonb_array_elements(dr.payload->'tasks') loop
   available_count:=available_count+1;
   if selection ? (item->>'draftId') then
    if (e.date_status='tbd' and item->>'dueAt' is not null) or ((item->>'dueAt')::timestamptz>e.starts_at) then raise exception 'AI_INVALID_OUTPUT';end if;
    -- New task ID was generated internally, not taken from untrusted draft.
    insert into public.tasks(id,workspace_id,event_id,title,priority,due_at) values((mapping->>(item->>'draftId'))::uuid,wid,eid,coalesce(p->'edits'->(item->>'draftId')->>'title',item->>'title'),item->>'priority',(item->>'dueAt')::timestamptz);
    selected_count:=selected_count+1;
   end if;
  end loop;
  for item in select value from jsonb_array_elements(dr.payload->'tasks') loop
   if selection ? (item->>'draftId') then
    for draft_key in select jsonb_array_elements_text(item->'dependsOnDraftIds') loop
     if not (mapping ? draft_key) then raise exception 'MISSING_PREREQUISITE';end if;
     insert into public.task_dependencies(workspace_id,event_id,task_id,depends_on_task_id) values(wid,eid,(mapping->>(item->>'draftId'))::uuid,(mapping->>draft_key)::uuid);
    end loop;
   end if;
  end loop;
  for item in select value from jsonb_array_elements(dr.payload->'vendorRequirements') loop
   available_count:=available_count+1;
   if selection ? (item->>'draftId') then item:=item||jsonb_build_object('title',coalesce(p->'edits'->(item->>'draftId')->>'title',item->>'title'));rid:=private.put_item(e,'vendor',null,item||jsonb_build_object('status','needed','isLocked',false));selected_count:=selected_count+1;end if;
  end loop;
  if selected_count<>jsonb_array_length(selection) then raise exception 'INVALID_SELECTION';end if;
  update public.ai_drafts set status=case when selected_count=available_count then 'accepted' else 'partial' end,updated_at=now() where id=dr.id;
  details:=jsonb_build_object('draftId',dr.id,'selectedCount',selected_count);rid:=dr.id;
 elsif action='preview' then
  authoritative:=false;new_guests:=coalesce((p->>'newGuestCount')::integer,e.guest_count);
  before_total:=private.total(eid,e.guest_count);after_total:=private.total(eid,new_guests);
  if new_guests<>e.guest_count then operations:=operations||jsonb_build_array(jsonb_build_object('id','guest-count','kind','set_event_guest_count','oldValue',e.guest_count,'newValue',new_guests,'mandatory',true));end if;
  if jsonb_array_length(coalesce(p->'priceChanges','[]'::jsonb))>12 then raise exception 'INVALID_INPUT';end if;
  if (select count(*)<>count(distinct v->>'budgetItemId') from jsonb_array_elements(coalesce(p->'priceChanges','[]'::jsonb)) v) then raise exception 'INVALID_INPUT';end if;
  for entry in select value from jsonb_array_elements(coalesce(p->'priceChanges','[]'::jsonb)) loop
   select * into b from public.budget_items where id=(entry->>'budgetItemId')::uuid and event_id=eid and state='active';
   if b.id is null then raise exception 'NOT_FOUND';end if;
   if b.is_locked or coalesce(p->'protectResourceIds','[]'::jsonb) ? b.id::text then raise exception 'PROTECTED_RESOURCE';end if;
   if lower(b.category)<>'catering' then raise exception 'UNSUPPORTED_OPERATION';end if;
   if (entry->>'newUnitPriceMinor') !~ '^(0|[1-9][0-9]{0,12})$' or (entry->>'newUnitPriceMinor')::numeric>9000000000000 then raise exception 'INVALID_MONEY';end if;
   after_total:=after_total+((entry->>'newUnitPriceMinor')::bigint-b.unit_price_minor)*case b.pricing_basis when 'fixed' then 1 when 'per_guest' then new_guests else b.manual_quantity end;
   if (entry->>'newUnitPriceMinor')::bigint<>b.unit_price_minor then operations:=operations||jsonb_build_array(jsonb_build_object('id','price-'||b.id,'kind','set_budget_item_unit_price','budgetItemId',b.id,'oldValue',b.unit_price_minor::text,'newValue',entry->>'newUnitPriceMinor','mandatory',true));end if;
  end loop;
  if jsonb_array_length(operations)=0 then raise exception 'NO_CHANGE';end if;
  if after_total<0 or after_total>9000000000000 then raise exception 'BUDGET_OVERFLOW';end if;
  warnings:=jsonb_build_array(jsonb_build_object('code','CAPACITY_NOT_VERIFIED','message','Venue capacity is unknown. Confirm supplier quantities and venue capacity.'));
  if after_total>e.budget_minor then warnings:=warnings||jsonb_build_array(jsonb_build_object('code',case when coalesce((p->>'doNotExceedBudget')::boolean,true) then 'BUDGET_CONSTRAINT_UNRESOLVED' else 'OVER_BUDGET' end,'message','Projected costs exceed the event budget. Review the deficit before approval.'));end if;
  if new_guests<>e.guest_count and exists(select 1 from public.budget_items where event_id=eid and is_locked and pricing_basis='per_guest' and state='active') then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','LOCKED_QUANTITY_IMPACT','message','Locked unit prices are preserved; guest-dependent totals change. Confirm supplier commitments.'));end if;
  select coalesce(jsonb_agg(id),'[]'::jsonb) into affected from public.tasks where event_id=eid and status<>'done';
  details:=jsonb_build_object('baseVersion',e.version,'proposedChange',p,'operations',operations,'before',jsonb_build_object('projectedMinor',before_total::text,'remainingMinor',(e.budget_minor-before_total)::text,'overBudget',before_total>e.budget_minor),'effects',jsonb_build_object('projectedMinor',after_total::text,'remainingMinor',(e.budget_minor-after_total)::text,'overBudget',after_total>e.budget_minor),'deltaMinor',(after_total-before_total)::text,'warnings',warnings,'affectedTasks',affected,'explanation','Costs are recalculated from stored prices and quantities. Review open tasks, supplier quantities and venue capacity. Vendor selections and locked unit prices are preserved.');
  insert into public.replan_proposals(workspace_id,event_id,base_version,proposed_change,typed_operations,warnings,calculated_effects,created_by) values(wid,eid,e.version,p,operations,warnings,details,auth.uid()) returning id into rid;
 elsif action in ('approve','reject') then
  select * into pr from public.replan_proposals where id=(p->>'proposalId')::uuid and event_id=eid for update;
  if pr.id is null then raise exception 'NOT_FOUND';end if;
  if pr.status<>'pending' or pr.base_version<>e.version then raise exception 'VERSION_CONFLICT';end if;
  if pr.expires_at<=now() then raise exception 'PROPOSAL_EXPIRED';end if;
  rid:=pr.id;
  if action='reject' then authoritative:=false;update public.replan_proposals set status='rejected',updated_at=now() where id=rid;
  else
   selection:=p->'selectedOperationIds';
   if jsonb_typeof(selection)<>'array' or jsonb_array_length(selection)<>jsonb_array_length(pr.typed_operations) or (select count(distinct x) from jsonb_array_elements_text(selection) x)<>jsonb_array_length(selection) then raise exception 'INVALID_OPERATIONS';end if;
   for entry in select value from jsonb_array_elements(pr.typed_operations) loop
    if not (selection ? (entry->>'id')) then raise exception 'INVALID_OPERATIONS';end if;
    if entry->>'kind'='set_event_guest_count' then
     if (entry->>'oldValue')::integer<>e.guest_count then raise exception 'VERSION_CONFLICT';end if;
     update public.events set guest_count=(entry->>'newValue')::integer where id=eid;
    elsif entry->>'kind'='set_budget_item_unit_price' then
     select * into b from public.budget_items where id=(entry->>'budgetItemId')::uuid and event_id=eid and state='active';
     if b.id is null then raise exception 'NOT_FOUND';end if;
     if b.is_locked or coalesce(pr.proposed_change->'protectResourceIds','[]'::jsonb) ? b.id::text then raise exception 'PROTECTED_RESOURCE';end if;
     if b.unit_price_minor::text<>entry->>'oldValue' then raise exception 'VERSION_CONFLICT';end if;
     if lower(b.category)<>'catering' then raise exception 'UNSUPPORTED_OPERATION';end if;
     update public.budget_items set unit_price_minor=(entry->>'newValue')::bigint,updated_at=now() where id=b.id;
    else raise exception 'INVALID_OPERATIONS';end if;
   end loop;
   select * into e from public.events where id=eid;
   after_total:=private.total(eid,e.guest_count);
   if after_total>e.budget_minor and coalesce((pr.proposed_change->>'doNotExceedBudget')::boolean,true) then raise exception 'UNRESOLVED_CONSTRAINT';end if;
   if after_total::text<>pr.calculated_effects->'effects'->>'projectedMinor' then raise exception 'VERSION_CONFLICT';end if;
   update public.replan_proposals set status='approved',approved_by=auth.uid(),updated_at=now() where id=rid;
   details:=jsonb_build_object('proposalId',rid,'operations',pr.typed_operations,'projectedMinor',after_total::text);
  end if;
 elsif action='reserve_ai' then
  authoritative:=false;
  -- Workspace row lock serializes quota reservations across different events/instances.
  perform 1 from public.workspaces where id=wid for update;
  select count(*) into daily from public.ai_usage_records where workspace_id=wid and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  if daily>=20 then raise exception 'RATE_LIMITED';end if;
  if exists(select 1 from public.ai_usage_records where workspace_id=wid and created_at>now()-interval '5 seconds') then raise exception 'RATE_LIMITED';end if;
  insert into public.ai_usage_records(workspace_id,event_id,actor_id,model_id,operation,status) values(wid,eid,auth.uid(),p->>'modelId',p->>'operation','started') returning id into rid;
 elsif action='complete_ai' then
  authoritative:=false;rid:=(p->>'usageId')::uuid;
  update public.ai_usage_records set status=p->>'status',input_tokens=(p->>'inputTokens')::integer,output_tokens=(p->>'outputTokens')::integer where id=rid and event_id=eid and actor_id=auth.uid() and status='started';
  if not found then raise exception 'NOT_FOUND';end if;
 else raise exception 'INVALID_OPERATION';end if;

 if authoritative then
  select * into e from public.events where id=eid;
  perform private.total(eid,e.guest_count);perform private.assert_dag(eid);
  if action<>'create' then update public.events set version=version+1,updated_at=now() where id=eid returning * into e;end if;
  insert into public.audit_events(workspace_id,event_id,actor_id,action,resource_type,resource_id,safe_diff,request_id)
  values(wid,eid,auth.uid(),action,split_part(action,'_',2),rid,details||jsonb_build_object('fromVersion',old_version,'toVersion',e.version,'guestCount',e.guest_count,'budgetMinor',e.budget_minor::text),request_id);
 end if;
 result:=jsonb_build_object('id',rid,'eventId',eid,'version',e.version,'snapshot',private.snapshot(eid));
 if action='preview' then result:=result||jsonb_build_object('proposal',details||jsonb_build_object('id',rid,'status','pending','expiresAt',now()+interval '30 minutes'));end if;
 insert into public.idempotency_receipts(workspace_id,actor_id,operation,key,request_hash,response_ref) values(wid,auth.uid(),v_operation,idem,digest,result);
 return result;
end $$;

create function public.event_command(p_event_id uuid,p_workspace_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$
 select private.command(p_event_id,p_workspace_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id);
$$;

-- Revoke default function EXECUTE; expose only guarded entry points.
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.create_personal_workspace() from public,anon;
revoke all on function public.event_snapshot(uuid) from public,anon;
revoke all on function public.event_command(uuid,uuid,text,jsonb,integer,uuid,text) from public,anon;
grant execute on function private.is_owner(uuid),private.provision(),private.snapshot(uuid),private.command(uuid,uuid,text,jsonb,integer,uuid,text) to authenticated;
grant execute on function public.create_personal_workspace(),public.event_snapshot(uuid),public.event_command(uuid,uuid,text,jsonb,integer,uuid,text) to authenticated;







