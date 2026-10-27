-- FR-016. Contacts stay owner-scoped; invite capabilities expose only frozen guest/function scopes.
create table public.guest_households (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,
 name text not null check(length(trim(name)) between 1 and 120),notes text not null default '' check(length(notes)<=500),
 state text not null default 'active' check(state in ('active','archived')),
 foreign key(workspace_id,event_id) references public.events(workspace_id,id),unique(workspace_id,event_id,id)
);
create table public.guests (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,household_id uuid not null,
 display_name text not null check(length(trim(display_name)) between 1 and 120),
 email text check(email is null or (length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 phone text check(phone is null or phone ~ '^[+0-9 ()-]{3,32}$'),notes text not null default '' check(length(notes)<=500),
 state text not null default 'active' check(state in ('active','archived')),
 foreign key(workspace_id,event_id,household_id) references public.guest_households(workspace_id,event_id,id),unique(workspace_id,event_id,id)
);
create index households_event on public.guest_households(event_id,state,id);
create index guests_event_household on public.guests(event_id,state,household_id,id);
create table public.guest_attendance (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,guest_id uuid not null,event_function_id uuid,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id,event_id,guest_id) references public.guests(workspace_id,event_id,id),
 foreign key(workspace_id,event_id,event_function_id) references public.event_functions(workspace_id,event_id,id),
 unique nulls not distinct(guest_id,event_function_id)
);
create index attendance_event on public.guest_attendance(event_id,event_function_id,status);
create table private.guest_invites (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,household_id uuid not null,
 token_hash bytea not null unique,guest_ids uuid[] not null,function_ids uuid[] not null,include_event boolean not null,
 expires_at timestamptz not null,revoked_at timestamptz,window_started_at timestamptz not null default now(),responses integer not null default 0,
 foreign key(workspace_id,event_id,household_id) references public.guest_households(workspace_id,event_id,id)
);
create index guest_invites_event on private.guest_invites(event_id,household_id);
create table private.rsvp_receipts (
 invite_id uuid not null references private.guest_invites(id),key uuid not null,request_hash bytea not null,
 primary key(invite_id,key)
);
revoke all on private.guest_invites,private.rsvp_receipts from public,anon,authenticated;
alter table private.guest_invites enable row level security;
alter table private.rsvp_receipts enable row level security;
do $$declare t text;begin
 foreach t in array array['guest_households','guests','guest_attendance'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy guest_owner_read on public.%I for select to authenticated using(private.is_owner(workspace_id))',t);
 end loop;
end $$;

create function private.guest_snapshot(eid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e public.events;begin
 e:=private.check_event(eid);
 return jsonb_build_object('eventVersion',e.version,
 'households',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'notes',notes) order by name,id) from public.guest_households where event_id=eid and state='active'),'[]'::jsonb),
 'guests',coalesce((select jsonb_agg(jsonb_build_object('id',id,'householdId',household_id,'displayName',display_name,'email',email,'phone',phone,'notes',notes) order by display_name,id) from public.guests where event_id=eid and state='active'),'[]'::jsonb),
 'attendance',coalesce((select jsonb_agg(jsonb_build_object('guestId',a.guest_id,'functionId',a.event_function_id,'status',a.status)) from public.guest_attendance a join public.guests g on g.id=a.guest_id where a.event_id=eid and g.state='active'),'[]'::jsonb),
 'functions',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title) order by starts_at nulls last,id) from public.event_functions where event_id=eid and state='active'),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'householdId',household_id,'expiresAt',expires_at,'revoked',revoked_at is not null) order by expires_at desc) from private.guest_invites where event_id=eid),'[]'::jsonb));
end $$;

create function private.guest_command(eid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.events;rid uuid;hid uuid;gid uuid;fid uuid;scope_id uuid;receipt public.idempotency_receipts;digest text;op text;result jsonb;hours integer;selected_guests uuid[];selected_functions uuid[];include_main boolean;begin
 e:=private.check_event(eid);select * into e from public.events where id=eid for update;
 if idem is null or p is null or octet_length(p::text)>32000 or length(coalesce(request_id,'')) not between 1 and 100 then raise exception 'INVALID_INPUT';end if;
 if action is null or action not in ('household','guest','archive_household','archive_guest','attendance','invite','revoke_invite') then raise exception 'UNSUPPORTED_OPERATION';end if;
 op:='guest_'||action||':'||eid;
 digest:=encode(sha256(convert_to(jsonb_build_object('payload',case when action='invite' then p-'tokenHash' else p end,'version',expected)::text,'UTF8')),'hex');
 select * into receipt from public.idempotency_receipts where workspace_id=e.workspace_id and actor_id=auth.uid() and operation=op and key=idem;
 if receipt.id is not null then if receipt.request_hash<>digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;return receipt.response_ref||jsonb_build_object('replayed',true);end if;
 if expected is null or expected<>e.version then raise exception 'VERSION_CONFLICT';end if;
 rid:=(p->>'id')::uuid;
 if action='household' then
  if rid is not null and not exists(select 1 from public.guest_households where id=rid and event_id=eid and state='active') then raise exception 'NOT_FOUND';end if;
  if rid is null and (select count(*) from public.guest_households where event_id=eid and state='active')>=500 then raise exception 'ITEM_LIMIT';end if;
  rid:=coalesce(rid,gen_random_uuid());
  insert into public.guest_households(id,workspace_id,event_id,name,notes) values(rid,e.workspace_id,eid,p->'fields'->>'name',coalesce(p->'fields'->>'notes',''))
   on conflict(id) do update set name=excluded.name,notes=excluded.notes;
 elsif action='guest' then
  hid:=(p->'fields'->>'householdId')::uuid;
  if not exists(select 1 from public.guest_households where id=hid and event_id=eid and state='active') then raise exception 'NOT_FOUND';end if;
  if rid is not null and not exists(select 1 from public.guests where id=rid and event_id=eid and state='active') then raise exception 'NOT_FOUND';end if;
  if (select count(*) from public.guests where household_id=hid and state='active' and id is distinct from rid)>=50 then raise exception 'ITEM_LIMIT';end if;
  if rid is null and (select count(*) from public.guests where event_id=eid and state='active')>=1000 then raise exception 'ITEM_LIMIT';end if;
  if rid is not null then update private.guest_invites set revoked_at=now() where event_id=eid and rid=any(guest_ids) and household_id<>hid and revoked_at is null;end if;
  rid:=coalesce(rid,gen_random_uuid());
  insert into public.guests(id,workspace_id,event_id,household_id,display_name,email,phone,notes)
  values(rid,e.workspace_id,eid,hid,p->'fields'->>'displayName',nullif(p->'fields'->>'email',''),nullif(p->'fields'->>'phone',''),coalesce(p->'fields'->>'notes',''))
  on conflict(id) do update set household_id=excluded.household_id,display_name=excluded.display_name,email=excluded.email,phone=excluded.phone,notes=excluded.notes;
 elsif action='archive_household' then
  if exists(select 1 from public.guests where household_id=rid and event_id=eid and state='active') then raise exception 'HOUSEHOLD_IN_USE';end if;
  update public.guest_households set state='archived' where id=rid and event_id=eid and state='active';if not found then raise exception 'NOT_FOUND';end if;
  update private.guest_invites set revoked_at=now() where household_id=rid and revoked_at is null;
 elsif action='archive_guest' then
  update public.guests set state='archived' where id=rid and event_id=eid and state='active';if not found then raise exception 'NOT_FOUND';end if;
  update private.guest_invites set revoked_at=now() where event_id=eid and rid=any(guest_ids) and revoked_at is null;
 elsif action='attendance' then
  gid:=(p->>'guestId')::uuid;fid:=(p->>'functionId')::uuid;
  if not exists(select 1 from public.guests where id=gid and event_id=eid and state='active') or (fid is not null and not exists(select 1 from public.event_functions where id=fid and event_id=eid and state='active')) then raise exception 'NOT_FOUND';end if;
  if p->>'status'='uninvited' then
   delete from public.guest_attendance where guest_id=gid and event_function_id is not distinct from fid;
   update private.guest_invites set revoked_at=now() where event_id=eid and gid=any(guest_ids) and (case when fid is null then include_event else fid=any(function_ids) end) and revoked_at is null;
  else
   insert into public.guest_attendance(workspace_id,event_id,guest_id,event_function_id,status) values(e.workspace_id,eid,gid,fid,p->>'status')
   on conflict(guest_id,event_function_id) do update set status=excluded.status,updated_at=now();
  end if;rid:=gid;
 elsif action='invite' then
  hid:=(p->>'householdId')::uuid;hours:=(p->>'expiresInHours')::integer;
  selected_guests:=array(select jsonb_array_elements_text(p->'guestIds')::uuid);selected_functions:=array(select jsonb_array_elements_text(p->'functionIds')::uuid);include_main:=(p->>'includeEvent')::boolean;
  if hours is null or hours not between 1 and 168 or p->>'tokenHash' !~ '^[a-f0-9]{64}$' or p->>'tokenHash' is null or include_main is null then raise exception 'INVALID_INPUT';end if;
  if cardinality(selected_guests) not between 1 and 50 or cardinality(selected_functions)+include_main::integer not between 1 and 10 or cardinality(selected_guests)<>(select count(distinct x) from unnest(selected_guests) x) or cardinality(selected_functions)<>(select count(distinct x) from unnest(selected_functions) x) then raise exception 'INVALID_INPUT';end if;
  if not exists(select 1 from public.guest_households where id=hid and event_id=eid and state='active') or exists(select 1 from unnest(selected_guests) g where not exists(select 1 from public.guests where id=g and household_id=hid and event_id=eid and state='active')) or exists(select 1 from unnest(selected_functions) f where not exists(select 1 from public.event_functions where id=f and event_id=eid and state='active')) then raise exception 'NOT_FOUND';end if;
  if (select count(*) from private.guest_invites where event_id=eid)>=1000 then raise exception 'ITEM_LIMIT';end if;
  rid:=gen_random_uuid();insert into private.guest_invites(id,workspace_id,event_id,household_id,token_hash,guest_ids,function_ids,include_event,expires_at)
   values(rid,e.workspace_id,eid,hid,decode(p->>'tokenHash','hex'),selected_guests,selected_functions,include_main,now()+make_interval(hours=>hours));
  foreach gid in array selected_guests loop
   if include_main then insert into public.guest_attendance(workspace_id,event_id,guest_id,status) values(e.workspace_id,eid,gid,'pending') on conflict(guest_id,event_function_id) do nothing;end if;
   foreach fid in array selected_functions loop insert into public.guest_attendance(workspace_id,event_id,guest_id,event_function_id,status) values(e.workspace_id,eid,gid,fid,'pending') on conflict(guest_id,event_function_id) do nothing;end loop;
  end loop;
 else
  update private.guest_invites set revoked_at=now() where id=rid and event_id=eid and revoked_at is null;if not found then raise exception 'NOT_FOUND';end if;
 end if;
 update public.events set version=version+1,updated_at=now() where id=eid returning * into e;
 insert into public.audit_events(workspace_id,event_id,actor_id,action,resource_type,resource_id,safe_diff,request_id)
 values(e.workspace_id,eid,auth.uid(),'guest_'||action,'guest_directory',rid,jsonb_build_object('fromVersion',expected,'toVersion',e.version),request_id);
 result:=jsonb_build_object('id',rid,'version',e.version);
 insert into public.idempotency_receipts(workspace_id,actor_id,operation,key,request_hash,response_ref) values(e.workspace_id,auth.uid(),op,idem,digest,result);
 return result;
end $$;

create function private.rsvp_view(token text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare invitation private.guest_invites;e public.events;begin
 if token is null or token !~ '^[a-f0-9]{64}$' then raise exception 'NOT_FOUND';end if;
 select * into invitation from private.guest_invites where token_hash=sha256(convert_to(token,'UTF8')) and revoked_at is null and expires_at>now();
 if invitation.id is null then raise exception 'NOT_FOUND';end if;
 select * into e from public.events where id=invitation.event_id;
 if e.status='archived' then raise exception 'NOT_FOUND';end if;
 if exists(select 1 from unnest(invitation.guest_ids) gid where not exists(select 1 from public.guests where id=gid and state='active' and household_id=invitation.household_id)) or exists(select 1 from unnest(invitation.function_ids) fid where not exists(select 1 from public.event_functions where id=fid and state='active')) then raise exception 'NOT_FOUND';end if;
 return jsonb_build_object('eventTitle',e.title,'expiresAt',invitation.expires_at,
  'guests',(select jsonb_agg(jsonb_build_object('id',id,'displayName',display_name) order by display_name,id) from public.guests where id=any(invitation.guest_ids)),
  'scopes',(case when invitation.include_event then jsonb_build_array(jsonb_build_object('id',null,'title',e.title)) else '[]'::jsonb end)||coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title) order by starts_at nulls last,id) from public.event_functions where id=any(invitation.function_ids)),'[]'::jsonb),
  'answers',coalesce((select jsonb_agg(jsonb_build_object('guestId',guest_id,'functionId',event_function_id,'status',status)) from public.guest_attendance where guest_id=any(invitation.guest_ids) and ((event_function_id is null and invitation.include_event) or event_function_id=any(invitation.function_ids))),'[]'::jsonb));
end $$;

create function private.rsvp_respond(token text,answers jsonb,idem uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare invitation private.guest_invites;receipt private.rsvp_receipts;answer jsonb;gid uuid;fid uuid;digest bytea;begin
 perform private.rsvp_view(token);
 select * into invitation from private.guest_invites where token_hash=sha256(convert_to(token,'UTF8'));
 -- Match all owner commands: event lock precedes invitation lock to avoid lock-order inversion.
 perform 1 from public.events where id=invitation.event_id for update;
 select * into invitation from private.guest_invites where id=invitation.id for update;
 if invitation.revoked_at is not null or invitation.expires_at<=now() then raise exception 'NOT_FOUND';end if;
 -- A host may have archived a guest, function or event while this request waited.
 perform private.rsvp_view(token);
 if idem is null or jsonb_typeof(answers) is distinct from 'array' or jsonb_array_length(answers) not between 1 and 500 or octet_length(answers::text)>90000 then raise exception 'INVALID_INPUT';end if;
 digest:=sha256(convert_to(answers::text,'UTF8'));
 select * into receipt from private.rsvp_receipts where invite_id=invitation.id and key=idem;
 if receipt.invite_id is not null then if receipt.request_hash<>digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;return private.rsvp_view(token)||jsonb_build_object('replayed',true);end if;
 if invitation.window_started_at<=now()-interval '1 minute' then update private.guest_invites set responses=0,window_started_at=now() where id=invitation.id;invitation.responses:=0;end if;
 if invitation.responses>=5 then raise exception 'RATE_LIMITED';end if;
 if (select count(*) from jsonb_array_elements(answers))<>(select count(distinct (x->>'guestId',x->>'functionId')) from jsonb_array_elements(answers) x) then raise exception 'INVALID_INPUT';end if;
 for answer in select * from jsonb_array_elements(answers) loop
  gid:=(answer->>'guestId')::uuid;fid:=(answer->>'functionId')::uuid;
  if gid is null or not gid=any(invitation.guest_ids) or (fid is null and not invitation.include_event) or (fid is not null and not fid=any(invitation.function_ids)) or coalesce(answer->>'status','') not in ('accepted','declined') then raise exception 'INVALID_SELECTION';end if;
  update public.guest_attendance set status=answer->>'status',updated_at=now() where guest_id=gid and event_function_id is not distinct from fid;
  if not found then raise exception 'NOT_FOUND';end if;
 end loop;
 update private.guest_invites set responses=responses+1 where id=invitation.id;
 update public.events set version=version+1,updated_at=now() where id=invitation.event_id;
 insert into public.audit_events(workspace_id,event_id,actor_id,action,resource_type,resource_id,safe_diff,request_id)
 values(invitation.workspace_id,invitation.event_id,null,'guest_rsvp','guest_invitation',invitation.id,jsonb_build_object('answersRecorded',jsonb_array_length(answers)),idem::text);
 insert into private.rsvp_receipts values(invitation.id,idem,digest);
 return private.rsvp_view(token);
end $$;

revoke all on function private.guest_snapshot(uuid),private.guest_command(uuid,text,jsonb,integer,uuid,text),private.rsvp_view(text),private.rsvp_respond(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function private.guest_snapshot(uuid),private.guest_command(uuid,text,jsonb,integer,uuid,text) to authenticated;
grant usage on schema private to anon;
grant execute on function private.rsvp_view(text),private.rsvp_respond(text,jsonb,uuid) to anon,authenticated;
create function public.guest_directory(p_event_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.guest_snapshot(p_event_id)$$;
create function public.guest_command(p_event_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.guest_command(p_event_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
create function public.rsvp_view(p_token text) returns jsonb language sql stable security invoker set search_path='' as $$select private.rsvp_view(p_token)$$;
create function public.rsvp_respond(p_token text,p_answers jsonb,p_idempotency_key uuid) returns jsonb language sql security invoker set search_path='' as $$select private.rsvp_respond(p_token,p_answers,p_idempotency_key)$$;
revoke all on function public.guest_directory(uuid),public.guest_command(uuid,text,jsonb,integer,uuid,text),public.rsvp_view(text),public.rsvp_respond(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.guest_directory(uuid),public.guest_command(uuid,text,jsonb,integer,uuid,text) to authenticated;
grant execute on function public.rsvp_view(text),public.rsvp_respond(text,jsonb,uuid) to anon,authenticated;
