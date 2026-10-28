-- FR-020: administrative entitlements only. No user or webhook can grant a plan.
-- These are safety limits for the synthetic pilot, not a commercial price promise.
create table private.workspace_entitlements (
 workspace_id uuid primary key references public.workspaces(id),
 plan text not null check(plan in ('pilot','professional','agency')),
 state text not null check(state in ('active','suspended')),
 valid_until timestamptz not null,
 event_limit integer not null check(event_limit between 1 and 1000),
 ai_daily_limit integer not null check(ai_daily_limit between 0 and 100),
 member_limit integer not null check(member_limit between 1 and 100),
 storage_limit_bytes bigint not null check(storage_limit_bytes between 0 and 1073741824),
 updated_at timestamptz not null default now()
);
alter table private.workspace_entitlements enable row level security;
revoke all on private.workspace_entitlements from public,anon,authenticated;
create function private.entitlement_limit(w uuid,kind text) returns bigint language plpgsql stable security definer set search_path='' as $$
declare r private.workspace_entitlements;begin
 select * into r from private.workspace_entitlements where workspace_id=w and state='active' and valid_until>now();
 return case kind when 'events' then coalesce(r.event_limit,100) when 'ai' then coalesce(r.ai_daily_limit,20) when 'members' then coalesce(r.member_limit,20) when 'storage' then coalesce(r.storage_limit_bytes,209715200) else null end;
end $$;
revoke all on function private.entitlement_limit(uuid,text) from public,anon,authenticated;

-- Guards are inside the original transaction, after idempotency replay and under
-- the existing workspace row lock, so concurrent requests cannot oversubscribe.
do $$declare source text;marker text;begin
 source:=pg_get_functiondef('private.command_core(uuid,uuid,text,jsonb,integer,uuid,text)'::regprocedure);
 marker:='old_version:=coalesce(e.version,0);';
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'Unexpected core quota marker';end if;
 source:=replace(source,marker,marker||$q$
 if (action='create' or (action='update' and e.status='archived' and p->>'status'<>'archived')) and (select count(*) from public.events where workspace_id=wid and status<>'archived')>=private.entitlement_limit(wid,'events') then raise exception 'ENTITLEMENT_LIMIT';end if;
 $q$);
 marker:='if daily>=20 then';
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'Unexpected AI quota marker';end if;
 execute replace(source,marker,'if daily>=private.entitlement_limit(wid,''ai'') then');
 source:=pg_get_functiondef('private.team_command(uuid,text,jsonb,integer,uuid,text)'::regprocedure);
 marker:='>=20 then';
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'Unexpected membership quota marker';end if;
 execute replace(source,marker,'>=private.entitlement_limit(wid,''members'') then');
 source:=pg_get_functiondef('private.document_command(uuid,text,jsonb,integer,uuid,text)'::regprocedure);
 marker:='+size>209715200';
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'Unexpected storage quota marker';end if;
 execute replace(source,marker,'+size>private.entitlement_limit(e.workspace_id,''storage'')');
end $$;

create function private.workspace_dashboard(w uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r private.workspace_entitlements;begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 if not private.can_manage(w) then raise exception 'NOT_FOUND';end if;
 select * into r from private.workspace_entitlements where workspace_id=w and state='active' and valid_until>now();
 return jsonb_build_object('workspaceId',w,'plan',coalesce(r.plan,'pilot'),'validUntil',r.valid_until,'billingAvailable',false,
 'limits',jsonb_build_object('activeEvents',private.entitlement_limit(w,'events'),'aiAttemptsPerUtcDay',private.entitlement_limit(w,'ai'),'members',private.entitlement_limit(w,'members'),'storageBytes',private.entitlement_limit(w,'storage')),
 'usage',jsonb_build_object('activeEvents',(select count(*) from public.events where workspace_id=w and status<>'archived'),'aiAttemptsToday',(select count(*) from public.ai_usage_records where workspace_id=w and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),'members',(select count(*) from public.workspace_members where workspace_id=w and state='active'),'storageBytes',coalesce((select sum(byte_size::bigint) from public.event_documents where workspace_id=w and original_cleanup='pending'),0)),
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'status',e.status,'timeZone',e.time_zone,'startsAt',e.starts_at,'incompleteTasks',(select count(*) from public.tasks where event_id=e.id and status<>'done'),'overdueTasks',(select count(*) from public.tasks where event_id=e.id and status<>'done' and due_at<now())) order by e.created_at desc) from public.events e where e.workspace_id=w and e.status<>'archived'),'[]'::jsonb));
end $$;
revoke all on function private.workspace_dashboard(uuid) from public,anon,authenticated;
grant execute on function private.workspace_dashboard(uuid) to authenticated;
create function public.workspace_dashboard(p_workspace_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.workspace_dashboard(p_workspace_id)$$;
revoke all on function public.workspace_dashboard(uuid) from public,anon;
grant execute on function public.workspace_dashboard(uuid) to authenticated;
