-- FR-017. Roles are database membership, never user-editable JWT metadata.
alter table public.workspace_members drop constraint workspace_members_role_check;
update public.workspace_members set role='planner_member' where role='member';
alter table public.workspace_members add constraint workspace_members_role_check check(role in ('owner','planner_manager','planner_member','client_viewer'));
alter table public.workspaces add column team_version integer not null default 1 check(team_version>=1);
create table public.event_assignments (
 workspace_id uuid not null,event_id uuid not null,user_id uuid not null,
 can_edit boolean not null default true,can_approve boolean not null default false,can_view_contacts boolean not null default false,
 primary key(event_id,user_id),foreign key(workspace_id,event_id) references public.events(workspace_id,id),
 foreign key(workspace_id,user_id) references public.workspace_members(workspace_id,user_id)
);
create index assignments_user on public.event_assignments(user_id,workspace_id,event_id);
create table private.team_invites (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),
 email text not null check(length(email)<=254),role text not null check(role in ('planner_manager','planner_member','client_viewer')),
 token_hash bytea not null unique,expires_at timestamptz not null,revoked_at timestamptz,accepted_at timestamptz,accepted_by uuid references auth.users(id)
);
create index team_invites_workspace on private.team_invites(workspace_id,expires_at);
create table private.team_receipts(actor_id uuid not null references auth.users(id),key uuid not null,digest bytea not null,result jsonb not null,primary key(actor_id,key));
create table private.team_audit(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),actor_id uuid not null references auth.users(id),action text not null,resource_id uuid,safe_diff jsonb not null,occurred_at timestamptz not null default now());
alter table public.event_assignments enable row level security;
alter table private.team_invites enable row level security;
alter table private.team_receipts enable row level security;
alter table private.team_audit enable row level security;
revoke all on public.event_assignments,private.team_invites,private.team_receipts,private.team_audit from public,anon,authenticated;
grant select on public.event_assignments to authenticated;

-- VOLATILE deliberately re-reads authorization after waiting for a workspace lock.
create function private.can_manage(w uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin return exists(select 1 from public.workspace_members where workspace_id=w and user_id=auth.uid() and state='active' and role in ('owner','planner_manager'));end $$;
create function private.can_event(eid uuid,cap text) returns boolean language plpgsql security definer set search_path='' as $$
declare w uuid;r text;assignment public.event_assignments;begin
 if auth.uid() is null or cap not in ('read','edit','approve','contacts') or cap is null then return false;end if;
 select workspace_id into w from public.events where id=eid;
 select role into r from public.workspace_members where workspace_id=w and user_id=auth.uid() and state='active';
 if r in ('owner','planner_manager') then return true;end if;
 if r is distinct from 'planner_member' then return false;end if;
 select * into assignment from public.event_assignments where event_id=eid and user_id=auth.uid();
 return assignment.event_id is not null and case cap when 'read' then true when 'edit' then assignment.can_edit when 'approve' then assignment.can_edit and assignment.can_approve when 'contacts' then assignment.can_view_contacts else false end;
end $$;
create or replace function private.check_event(e uuid) returns public.events language plpgsql security definer set search_path='' as $$
declare r public.events;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 select * into r from public.events where id=e;
 if r.id is null or not private.can_event(e,'read') then raise exception 'NOT_FOUND';end if;return r;
end $$;
create function private.team_lock_event(eid uuid,cap text) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 select workspace_id into w from public.events where id=eid;
 perform 1 from public.workspaces where id=w for update;
 if not private.can_event(eid,cap) then raise exception 'NOT_FOUND';end if;
end $$;

-- Preserve the proven command implementation, adding authorization at every entry.
alter function private.command(uuid,uuid,text,jsonb,integer,uuid,text) rename to command_before_teams;
revoke all on function private.command_before_teams(uuid,uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
create function private.command(eid uuid,wid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if action='create' then
  perform 1 from public.workspaces where id=wid for update;
  if not private.can_manage(wid) then raise exception 'NOT_FOUND';end if;
 else
  perform private.team_lock_event(eid,case when action in ('approve','reject','accept') then 'approve' else 'edit' end);
  if action='update' and p->>'status'='archived' and not private.can_manage((select workspace_id from public.events where id=eid)) then raise exception 'ACCESS_DENIED';end if;
 end if;
 return private.command_before_teams(eid,wid,action,p,expected,idem,request_id);
end $$;
-- The single create-owner predicate becomes an explicit manager capability.
do $$declare source text;begin
 source:=pg_get_functiondef('private.command_core(uuid,uuid,text,jsonb,integer,uuid,text)'::regprocedure);
 if length(source)-length(replace(source,'private.is_owner(wid)',''))<>length('private.is_owner(wid)') then raise exception 'Unexpected core authorization definition';end if;
 execute replace(source,'private.is_owner(wid)','private.can_manage(wid)');
end $$;

alter function private.function_command(uuid,text,jsonb,integer,uuid,text) rename to function_command_before_teams;
revoke all on function private.function_command_before_teams(uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
create function private.function_command(eid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$begin perform private.team_lock_event(eid,'edit');return private.function_command_before_teams(eid,action,p,expected,idem,request_id);end $$;
alter function private.guest_command(uuid,text,jsonb,integer,uuid,text) rename to guest_command_before_teams;
revoke all on function private.guest_command_before_teams(uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
create function private.guest_command(eid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$begin perform private.team_lock_event(eid,'edit');if not private.can_event(eid,'contacts') then raise exception 'NOT_FOUND';end if;return private.guest_command_before_teams(eid,action,p,expected,idem,request_id);end $$;
alter function private.guest_snapshot(uuid) rename to guest_snapshot_before_teams;
revoke all on function private.guest_snapshot_before_teams(uuid) from public,anon,authenticated;
create function private.guest_snapshot(eid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin if not private.can_event(eid,'contacts') then raise exception 'NOT_FOUND';end if;return private.guest_snapshot_before_teams(eid);end $$;

-- Replace public SQL bodies explicitly to invalidate pooled/inlined old references.
create or replace function public.event_command(p_event_id uuid,p_workspace_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.command(p_event_id,p_workspace_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
create or replace function public.event_function_command(p_event_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.function_command(p_event_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
create or replace function public.guest_command(p_event_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.guest_command(p_event_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
create or replace function public.guest_directory(p_event_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.guest_snapshot(p_event_id)$$;

create policy team_workspace_read on public.workspaces for select to authenticated using(exists(select 1 from public.workspace_members where workspace_id=id and user_id=auth.uid() and state='active'));
create policy own_membership_read on public.workspace_members for select to authenticated using(user_id=auth.uid());
create policy assignments_read on public.event_assignments for select to authenticated using(private.is_owner(workspace_id) or user_id=auth.uid());
do $$declare t text;begin
 foreach t in array array['events','budget_items','tasks','task_dependencies','vendor_requirements','ai_drafts','replan_proposals','audit_events','event_functions'] loop
  execute format('create policy team_event_read on public.%I for select to authenticated using(private.can_event(%I,''read''))',t,case when t='events' then 'id' else 'event_id' end);
 end loop;
 foreach t in array array['guest_households','guests','guest_attendance'] loop
  execute format('create policy team_contact_read on public.%I for select to authenticated using(private.can_event(event_id,''contacts''))',t);
 end loop;
end $$;

create function private.team_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 return jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'kind',w.kind,'version',w.team_version,'role',m.role,
  'members',case when m.role='owner' then (select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'role',role,'state',state)),'[]'::jsonb) from public.workspace_members where workspace_id=w.id) else '[]'::jsonb end,
  'invitations',case when m.role='owner' then (select coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'role',role,'expiresAt',expires_at,'revoked',revoked_at is not null,'accepted',accepted_at is not null)),'[]'::jsonb) from private.team_invites where workspace_id=w.id and expires_at>now()-interval '7 days') else '[]'::jsonb end,
  'events',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'type',e.type,'startsAt',e.starts_at,'timeZone',e.time_zone,'canOpen',private.can_event(e.id,'read'),'canEdit',private.can_event(e.id,'edit'),'canApprove',private.can_event(e.id,'approve'),'canViewContacts',private.can_event(e.id,'contacts')) order by e.created_at desc),'[]'::jsonb) from public.events e where e.workspace_id=w.id and (m.role in ('owner','planner_manager') or exists(select 1 from public.event_assignments where event_id=e.id and user_id=auth.uid()))),
  'assignments',case when m.role='owner' then (select coalesce(jsonb_agg(jsonb_build_object('eventId',event_id,'userId',user_id,'canEdit',can_edit,'canApprove',can_approve,'canViewContacts',can_view_contacts)),'[]'::jsonb) from public.event_assignments where workspace_id=w.id) else '[]'::jsonb end
 ) order by w.created_at) from public.workspaces w join public.workspace_members m on m.workspace_id=w.id where m.user_id=auth.uid() and m.state='active'),'[]'::jsonb));
end $$;

create function private.team_command(wid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.workspaces;receipt private.team_receipts;invitation private.team_invites;rid uuid;target uuid;eid uuid;r text;email_address text;digest bytea;result jsonb;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 if idem is null or p is null or octet_length(p::text)>12000 or length(coalesce(request_id,'')) not between 1 and 100 or action is null or action not in ('create','invite','accept','revoke_invite','member','assign') then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended('team:'||auth.uid()::text,0));
 digest:=sha256(convert_to(jsonb_build_object('workspace',wid,'action',action,'payload',case when action='invite' then p-'tokenHash' else p end,'version',expected)::text,'UTF8'));
 if action='accept' then
  if p->>'token' is null or p->>'token' !~ '^[a-f0-9]{64}$' then raise exception 'NOT_FOUND';end if;
  select * into invitation from private.team_invites where token_hash=sha256(convert_to(p->>'token','UTF8'));
  wid:=invitation.workspace_id;
 end if;
 if action<>'create' then
  select * into w from public.workspaces where id=wid for update;
  if w.id is null then raise exception 'NOT_FOUND';end if;
  if action='accept' then
   select * into invitation from private.team_invites where id=invitation.id;
   select lower(email) into email_address from auth.users where id=auth.uid();
   if invitation.revoked_at is not null or invitation.expires_at<=now() or invitation.email is distinct from email_address then raise exception 'NOT_FOUND';end if;
  elsif not private.is_owner(wid) then raise exception 'NOT_FOUND';end if;
 end if;
 select * into receipt from private.team_receipts where actor_id=auth.uid() and key=idem;
 if receipt.actor_id is not null then if receipt.digest<>digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;return receipt.result||jsonb_build_object('replayed',true);end if;
 if action not in ('create','accept') and (expected is null or expected<>w.team_version) then raise exception 'VERSION_CONFLICT';end if;
 if action='create' then
  if (select count(*) from public.workspace_members where user_id=auth.uid() and role='owner' and state='active')>=10 then raise exception 'ITEM_LIMIT';end if;
  insert into public.workspaces(name,kind) values(p->>'name','agency') returning * into w;wid:=w.id;rid:=wid;
  insert into public.workspace_members(workspace_id,user_id,role) values(wid,auth.uid(),'owner');
 elsif action='invite' then
  email_address:=lower(trim(p->>'email'));r:=p->>'role';
  if email_address is null or email_address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or r is null or r not in ('planner_manager','planner_member','client_viewer') or p->>'tokenHash' is null or p->>'tokenHash' !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_INPUT';end if;
  if (select count(*) from private.team_invites where workspace_id=wid and revoked_at is null and accepted_at is null and expires_at>now())>=50 then raise exception 'ITEM_LIMIT';end if;
  insert into private.team_invites(workspace_id,email,role,token_hash,expires_at) values(wid,email_address,r,decode(p->>'tokenHash','hex'),now()+interval '72 hours') returning id into rid;
 elsif action='accept' then
  if invitation.accepted_at is not null then raise exception 'INVITE_ALREADY_USED';end if;
  if exists(select 1 from public.workspace_members where workspace_id=wid and user_id=auth.uid() and role='owner') then raise exception 'ACCESS_DENIED';end if;
  if (select count(*) from public.workspace_members where workspace_id=wid and state='active')>=20 then raise exception 'ITEM_LIMIT';end if;
  insert into public.workspace_members(workspace_id,user_id,role) values(wid,auth.uid(),invitation.role)
   on conflict(workspace_id,user_id) do update set role=excluded.role,state='active',revoked_at=null,joined_at=now();
  delete from public.event_assignments where workspace_id=wid and user_id=auth.uid();
  update private.team_invites set accepted_at=now(),accepted_by=auth.uid() where id=invitation.id;rid:=auth.uid();
 elsif action='revoke_invite' then
  rid:=(p->>'id')::uuid;update private.team_invites set revoked_at=now() where id=rid and workspace_id=wid and accepted_at is null and revoked_at is null;if not found then raise exception 'NOT_FOUND';end if;
 elsif action='member' then
  target:=(p->>'userId')::uuid;r:=p->>'role';
  if r is null or r not in ('planner_manager','planner_member','client_viewer') or coalesce(p->>'state','') not in ('active','revoked') then raise exception 'INVALID_INPUT';end if;
  update public.workspace_members set role=r,state=p->>'state',revoked_at=case when p->>'state'='revoked' then now() else null end where workspace_id=wid and user_id=target and role<>'owner' and state='active';if not found then raise exception 'NOT_FOUND';end if;
  delete from public.event_assignments where workspace_id=wid and user_id=target;rid:=target;
 else
  target:=(p->>'userId')::uuid;eid:=(p->>'eventId')::uuid;
  if not exists(select 1 from public.events where id=eid and workspace_id=wid) or not exists(select 1 from public.workspace_members where workspace_id=wid and user_id=target and state='active' and role in ('planner_member','client_viewer')) then raise exception 'NOT_FOUND';end if;
  if jsonb_typeof(p->'assigned') is distinct from 'boolean' or jsonb_typeof(p->'canEdit') is distinct from 'boolean' or jsonb_typeof(p->'canApprove') is distinct from 'boolean' or jsonb_typeof(p->'canViewContacts') is distinct from 'boolean' then raise exception 'INVALID_INPUT';end if;
  if (p->>'assigned')::boolean then
   insert into public.event_assignments(workspace_id,event_id,user_id,can_edit,can_approve,can_view_contacts) values(wid,eid,target,(p->>'canEdit')::boolean,(p->>'canApprove')::boolean,(p->>'canViewContacts')::boolean)
   on conflict(event_id,user_id) do update set can_edit=excluded.can_edit,can_approve=excluded.can_approve,can_view_contacts=excluded.can_view_contacts;
  else delete from public.event_assignments where event_id=eid and user_id=target;end if;rid:=eid;
 end if;
 update public.workspaces set team_version=team_version+1,updated_at=now() where id=wid returning * into w;
 insert into private.team_audit(workspace_id,actor_id,action,resource_id,safe_diff) values(wid,auth.uid(),action,rid,jsonb_build_object('toVersion',w.team_version));
 result:=jsonb_build_object('id',rid,'workspaceId',wid,'version',w.team_version);
 insert into private.team_receipts values(auth.uid(),idem,digest,result);return result;
end $$;

create function public.team_overview() returns jsonb language sql stable security invoker set search_path='' as $$select private.team_overview()$$;
create function private.event_permissions(eid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform private.check_event(eid);return jsonb_build_object('canEdit',private.can_event(eid,'edit'),'canApprove',private.can_event(eid,'approve'),'canViewContacts',private.can_event(eid,'contacts'));end $$;
create function public.event_permissions(p_event_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.event_permissions(p_event_id)$$;
revoke all on function private.event_permissions(uuid),public.event_permissions(uuid) from public,anon,authenticated;
grant execute on function private.event_permissions(uuid),public.event_permissions(uuid) to authenticated;
create function public.team_command(p_workspace_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.team_command(p_workspace_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
revoke all on function private.can_manage(uuid),private.can_event(uuid,text),private.team_lock_event(uuid,text),private.team_overview(),private.team_command(uuid,text,jsonb,integer,uuid,text),private.command(uuid,uuid,text,jsonb,integer,uuid,text),private.function_command(uuid,text,jsonb,integer,uuid,text),private.guest_command(uuid,text,jsonb,integer,uuid,text),private.guest_snapshot(uuid),public.team_overview(),public.team_command(uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
grant execute on function private.can_manage(uuid),private.can_event(uuid,text),private.team_overview(),private.team_command(uuid,text,jsonb,integer,uuid,text),private.command(uuid,uuid,text,jsonb,integer,uuid,text),private.function_command(uuid,text,jsonb,integer,uuid,text),private.guest_command(uuid,text,jsonb,integer,uuid,text),private.guest_snapshot(uuid),public.team_overview(),public.team_command(uuid,text,jsonb,integer,uuid,text) to authenticated;
revoke all on all functions in schema private from public;
