-- FR-021: owner event exports and eligible operational-data erasure.
-- Account deletion, financial/legal holds and provider backups require review.
create or replace function private.event_permissions(eid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare e public.events;begin e:=private.check_event(eid);return jsonb_build_object('canEdit',private.can_event(eid,'edit'),'canApprove',private.can_event(eid,'approve'),'canViewContacts',private.can_event(eid,'contacts'),'canManageData',private.is_owner(e.workspace_id));end $$;
create table private.event_lifecycle (
 event_id uuid primary key references public.events(id),workspace_id uuid not null references public.workspaces(id),
 state text not null check(state in ('pending_cleanup','retention_review','erased')),
 requested_by uuid not null references auth.users(id),requested_at timestamptz not null default now(),completed_at timestamptz
);
create table private.lifecycle_receipts(actor_id uuid not null references auth.users(id),key uuid not null,digest bytea not null,result jsonb not null,primary key(actor_id,key));
alter table private.event_lifecycle enable row level security;
alter table private.lifecycle_receipts enable row level security;
revoke all on private.event_lifecycle,private.lifecycle_receipts from public,anon,authenticated;

create function private.lifecycle_status(eid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e public.events;r private.event_lifecycle;begin
 e:=private.check_event(eid);if not private.is_owner(e.workspace_id) then raise exception 'NOT_FOUND';end if;
 select * into r from private.event_lifecycle where event_id=eid;
 return jsonb_build_object('eventVersion',e.version,'state',coalesce(r.state,'none'),'requestedAt',r.requested_at,'completedAt',r.completed_at,'originalsPending',(select count(*) from public.event_documents where event_id=eid and original_cleanup='pending'),'financialRecordsRetained',exists(select 1 from public.vendor_commitments where event_id=eid));
end $$;
create function private.event_export(eid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e public.events;begin
 e:=private.check_event(eid);if not private.is_owner(e.workspace_id) then raise exception 'NOT_FOUND';end if;
 return jsonb_build_object('schemaVersion',1,'exportedAt',now(),'scope','event operational data; originals downloaded separately; invitation capabilities excluded','planning',private.snapshot(eid),'functions',private.functions_snapshot(eid),'guests',private.guest_snapshot(eid)-'invitations','finance',private.finance_snapshot(eid),
 'aiDrafts',coalesce((select jsonb_agg(to_jsonb(a)) from public.ai_drafts a where event_id=eid),'[]'::jsonb),'replanProposals',coalesce((select jsonb_agg(to_jsonb(p)) from public.replan_proposals p where event_id=eid),'[]'::jsonb),
 'documents',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'filename',d.filename,'mediaType',d.media_type,'byteSize',d.byte_size,'state',d.state,'originalCleanup',d.original_cleanup,'pages',t.pages,'extractions',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'payload',x.payload,'state',x.state,'provenance',x.provenance)),'[]'::jsonb) from public.quotation_extractions x where x.document_id=d.id))) from public.event_documents d left join private.document_texts t on t.document_id=d.id where d.event_id=eid),'[]'::jsonb));
end $$;

create function private.lifecycle_command(eid uuid,action text,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.events;r private.event_lifecycle;receipt private.lifecycle_receipts;digest bytea;result jsonb;objects_remain boolean;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 select * into e from public.events where id=eid;
 perform 1 from public.workspaces where id=e.workspace_id for update;
 if not private.is_owner(e.workspace_id) then raise exception 'NOT_FOUND';end if;
 select * into e from public.events where id=eid for update;
 if idem is null or length(coalesce(request_id,'')) not between 1 and 100 or action is null or action not in ('request_deletion','erase') then raise exception 'INVALID_INPUT';end if;
 digest:=sha256(convert_to(jsonb_build_object('event',eid,'action',action,'version',expected)::text,'UTF8'));
 select * into receipt from private.lifecycle_receipts where actor_id=auth.uid() and key=idem;
 if found then if receipt.digest<>digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;return receipt.result||jsonb_build_object('replayed',true);end if;
 if expected is null or expected<>e.version then raise exception 'VERSION_CONFLICT';end if;
 select * into r from private.event_lifecycle where event_id=eid;
 if action='request_deletion' then
  if r.event_id is not null then raise exception 'PROTECTED_RESOURCE';end if;
  insert into private.event_lifecycle(event_id,workspace_id,state,requested_by) values(eid,e.workspace_id,
   case when exists(select 1 from public.vendor_commitments where event_id=eid) or exists(select 1 from public.ai_usage_records where event_id=eid and status='started' and created_at>now()-interval '10 minutes') then 'retention_review' else 'pending_cleanup' end,auth.uid()) returning * into r;
  update private.guest_invites set revoked_at=coalesce(revoked_at,now()) where event_id=eid;
  if r.state='pending_cleanup' then update public.event_documents set state='archived' where event_id=eid;end if;
 else
  if r.state is distinct from 'pending_cleanup' then raise exception 'RETENTION_REVIEW_REQUIRED';end if;
  if exists(select 1 from public.vendor_commitments where event_id=eid) then raise exception 'RETENTION_REVIEW_REQUIRED';end if;
  if to_regclass('storage.objects') is not null then
   execute 'select exists(select 1 from storage.objects o join public.event_documents d on d.object_path=o.name where o.bucket_id=''utsavos-documents'' and d.event_id=$1)' into objects_remain using eid;
   if objects_remain then raise exception 'DOCUMENT_NOT_READY';end if;
  elsif exists(select 1 from public.event_documents where event_id=eid and original_cleanup='pending') then raise exception 'DOCUMENT_NOT_READY';end if;
  delete from private.rsvp_receipts where invite_id in(select id from private.guest_invites where event_id=eid);
  delete from private.guest_invites where event_id=eid;
  delete from public.guest_attendance where event_id=eid;
  delete from public.guests where event_id=eid;
  delete from public.guest_households where event_id=eid;
  delete from public.quotation_extractions where event_id=eid;
  delete from public.vendor_quotes where event_id=eid;
  delete from private.document_texts where document_id in(select id from public.event_documents where event_id=eid);
  delete from public.event_documents where event_id=eid;
  delete from public.task_dependencies where event_id=eid;
  delete from public.tasks where event_id=eid;
  delete from public.budget_items where event_id=eid;
  delete from public.vendor_requirements where event_id=eid;
  delete from public.event_functions where event_id=eid;
  delete from public.ai_drafts where event_id=eid;
  delete from public.replan_proposals where event_id=eid;
  delete from public.event_assignments where event_id=eid;
  delete from public.idempotency_receipts where workspace_id=e.workspace_id and response_ref->>'eventId'=eid::text;
  update public.audit_events set safe_diff='{"redacted":true}'::jsonb where event_id=eid;
  update public.events set title='Deleted celebration',preferences='',guest_count=0,budget_minor=0,date_status='tbd',starts_at=null,status='archived' where id=eid;
  update private.event_lifecycle set state='erased',completed_at=now() where event_id=eid;
 end if;
 update public.events set version=version+1,updated_at=now() where id=eid;
 insert into public.audit_events(workspace_id,event_id,actor_id,action,resource_type,resource_id,safe_diff,request_id) values(e.workspace_id,eid,auth.uid(),'data_'||action,'event',eid,jsonb_build_object('fromVersion',e.version,'toVersion',e.version+1),request_id);
 result:=private.lifecycle_status(eid);
 insert into private.lifecycle_receipts values(auth.uid(),idem,digest,result);
 return result;
end $$;

-- Every existing write path takes this lock and rechecks the lifecycle after waiting.
create or replace function private.team_lock_event(eid uuid,cap text) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 select workspace_id into w from public.events where id=eid;
 perform 1 from public.workspaces where id=w for update;
 if not private.can_event(eid,cap) then raise exception 'NOT_FOUND';end if;
 if exists(select 1 from private.event_lifecycle where event_id=eid) then raise exception 'DATA_LIFECYCLE_HOLD';end if;
end $$;
do $$declare source text;marker text;begin
 source:=pg_get_functiondef('private.document_access(text,text)'::regprocedure);
 marker:='if cap=''insert'' then return';
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'Unexpected storage access marker';end if;
 execute replace(source,marker,'if cap=''insert'' then return not exists(select 1 from private.event_lifecycle where event_id=d.event_id) and');
end $$;

create function public.event_export(p_event_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.event_export(p_event_id)$$;
create function public.event_lifecycle_status(p_event_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.lifecycle_status(p_event_id)$$;
create function public.event_lifecycle_command(p_event_id uuid,p_action text,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.lifecycle_command(p_event_id,p_action,p_expected_version,p_idempotency_key,p_request_id)$$;
revoke all on function private.event_export(uuid),private.lifecycle_status(uuid),private.lifecycle_command(uuid,text,integer,uuid,text),public.event_export(uuid),public.event_lifecycle_status(uuid),public.event_lifecycle_command(uuid,text,integer,uuid,text) from public,anon,authenticated;
grant execute on function private.event_export(uuid),private.lifecycle_status(uuid),private.lifecycle_command(uuid,text,integer,uuid,text),public.event_export(uuid),public.event_lifecycle_status(uuid),public.event_lifecycle_command(uuid,text,integer,uuid,text) to authenticated;

-- An account request is durable, but cannot claim Auth/backup erasure or bypass
-- retention review. The operator resolves it through a separate privileged process.
create table private.account_data_requests(user_id uuid primary key references auth.users(id),id uuid not null unique default gen_random_uuid(),state text not null check(state in ('pending_review','cancelled')),requested_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table private.account_data_request_audit(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),action text not null,occurred_at timestamptz not null default now());
alter table private.account_data_requests enable row level security;
alter table private.account_data_request_audit enable row level security;
revoke all on private.account_data_requests,private.account_data_request_audit from public,anon,authenticated;
create function private.account_data_request(action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.account_data_requests;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 if action is null or action not in ('status','request','cancel') then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended('account-data:'||auth.uid()::text,0));
 select * into r from private.account_data_requests where user_id=auth.uid();
 if (action='request' and (r.user_id is null or r.state='cancelled')) or (action='cancel' and r.state='pending_review') then
  if (select count(*) from private.account_data_request_audit where user_id=auth.uid() and occurred_at>now()-interval '1 day')>=5 then raise exception 'RATE_LIMITED';end if;
  insert into private.account_data_requests(user_id,state) values(auth.uid(),case when action='request' then 'pending_review' else 'cancelled' end)
   on conflict(user_id) do update set state=excluded.state,requested_at=case when action='request' then now() else private.account_data_requests.requested_at end,updated_at=now() returning * into r;
  insert into private.account_data_request_audit(user_id,action) values(auth.uid(),action);
 end if;
 return jsonb_build_object('id',r.id,'state',coalesce(r.state,'none'),'requestedAt',r.requested_at,'completed',false);
end $$;
create function public.account_data_request(p_action text) returns jsonb language sql security invoker set search_path='' as $$select private.account_data_request(p_action)$$;
revoke all on function private.account_data_request(text),public.account_data_request(text) from public,anon,authenticated;
grant execute on function private.account_data_request(text),public.account_data_request(text) to authenticated;
