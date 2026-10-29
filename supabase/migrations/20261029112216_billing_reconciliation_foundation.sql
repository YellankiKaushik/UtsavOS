-- Offline/test-mode foundation. No live webhook route or commercial plan is enabled.
-- Only a separately authorized worker may bind customers, configure prices or reconcile.
create table private.billing_prices (
 price_id text primary key check(length(price_id) between 1 and 200),
 plan text not null check(plan in ('professional','agency')),
 event_limit integer not null check(event_limit between 1 and 1000),
 ai_daily_limit integer not null check(ai_daily_limit between 0 and 100),
 member_limit integer not null check(member_limit between 1 and 100),
 storage_limit_bytes bigint not null check(storage_limit_bytes between 0 and 1073741824)
);
create table private.billing_bindings (
 workspace_id uuid primary key references public.workspaces(id),
 customer_id text unique not null check(length(customer_id) between 1 and 200),
 subscription_id text unique not null check(length(subscription_id) between 1 and 200),
 test_mode boolean not null default true check(test_mode),
 epoch bigint not null default 0,
 lease uuid, lease_until timestamptz,
 subscription_state text,
 reconciled_at timestamptz
);
create table private.billing_receipts (
 event_id text primary key check(length(event_id) between 1 and 200),
 digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 subscription_id text not null references private.billing_bindings(subscription_id),
 state text not null default 'queued' check(state in ('queued','applied','dead')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 retry_at timestamptz not null default now(),
 last_error text check(last_error in ('provider_unavailable','invalid_snapshot','worker_failure')),
 received_at timestamptz not null default now(),
 applied_at timestamptz
);
create index billing_due on private.billing_receipts(retry_at) where state='queued';
alter table private.billing_prices enable row level security;
alter table private.billing_bindings enable row level security;
alter table private.billing_receipts enable row level security;
revoke all on private.billing_prices,private.billing_bindings,private.billing_receipts from public,anon,authenticated;

create function private.billing_enqueue(e text,d text,s text,test boolean) returns text language plpgsql security definer set search_path='' as $$
declare r private.billing_receipts;begin
 if test is distinct from true then raise exception 'BILLING_LIVE_DISABLED';end if;
 if not exists(select 1 from private.billing_bindings where subscription_id=s and test_mode) then raise exception 'BILLING_UNBOUND';end if;
 insert into private.billing_receipts(event_id,digest,subscription_id) values(e,d,s) on conflict do nothing;
 select * into strict r from private.billing_receipts where event_id=e;
 if r.digest<>d or r.subscription_id<>s then raise exception 'BILLING_RECEIPT_CONFLICT';end if;
 return r.state;
end $$;

-- Claims serialize by subscription BEFORE retrieving the current provider snapshot.
-- Event created timestamps are deliberately not used as ordering/version guarantees.
create function private.billing_claim(e text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.billing_receipts;b private.billing_bindings;token uuid;begin
 select * into r from private.billing_receipts where event_id=e for update;
 if not found or r.state<>'queued' or r.retry_at>now() then return null;end if;
 select * into strict b from private.billing_bindings where subscription_id=r.subscription_id for update;
 if b.lease_until>now() then return null;end if;
 if r.attempts>=5 then update private.billing_receipts set state='dead',last_error='worker_failure' where event_id=e;return null;end if;
 token:=gen_random_uuid();
 update private.billing_bindings set epoch=epoch+1,lease=token,lease_until=now()+interval '2 minutes' where workspace_id=b.workspace_id returning * into b;
 update private.billing_receipts set attempts=attempts+1 where event_id=e;
 return jsonb_build_object('lease',token,'epoch',b.epoch::text,'subscriptionId',b.subscription_id);
end $$;

create function private.billing_complete(e text,token uuid,v bigint,snapshot jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r private.billing_receipts;b private.billing_bindings;p private.billing_prices;until_at timestamptz;st text;begin
 select * into strict r from private.billing_receipts where event_id=e for update;
 select * into strict b from private.billing_bindings where subscription_id=r.subscription_id for update;
 if r.state<>'queued' or b.lease is distinct from token or b.epoch<>v or b.lease_until<=now() then raise exception 'BILLING_STALE_LEASE';end if;
 if jsonb_typeof(snapshot)<>'object' or (snapshot->>'testMode') is distinct from 'true' or snapshot->>'customerId' is distinct from b.customer_id or snapshot->>'subscriptionId' is distinct from b.subscription_id then raise exception 'BILLING_INVALID_SNAPSHOT';end if;
 st:=snapshot->>'status';
 if st is null or st not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused') then raise exception 'BILLING_INVALID_SNAPSHOT';end if;
 select * into p from private.billing_prices where price_id=snapshot->>'priceId';
 if not found then raise exception 'BILLING_UNKNOWN_PRICE';end if;
 until_at:=(snapshot->>'periodEnd')::timestamptz;
 if until_at is null or not isfinite(until_at) then raise exception 'BILLING_INVALID_SNAPSHOT';end if;
 if st in ('active','trialing') and until_at>now() then
  insert into private.workspace_entitlements(workspace_id,plan,state,valid_until,event_limit,ai_daily_limit,member_limit,storage_limit_bytes)
   values(b.workspace_id,p.plan,'active',least(until_at,now()+interval '24 hours'),p.event_limit,p.ai_daily_limit,p.member_limit,p.storage_limit_bytes)
   on conflict(workspace_id) do update set plan=excluded.plan,state=excluded.state,valid_until=excluded.valid_until,event_limit=excluded.event_limit,ai_daily_limit=excluded.ai_daily_limit,member_limit=excluded.member_limit,storage_limit_bytes=excluded.storage_limit_bytes,updated_at=now();
 else
  update private.workspace_entitlements set state='suspended',valid_until=now(),updated_at=now() where workspace_id=b.workspace_id;
 end if;
 update private.billing_bindings set subscription_state=st,reconciled_at=now(),lease=null,lease_until=null where workspace_id=b.workspace_id;
 update private.billing_receipts set state='applied',applied_at=now(),last_error=null where event_id=e;
end $$;

create function private.billing_retry(e text,token uuid,v bigint,code text) returns void language plpgsql security definer set search_path='' as $$
declare r private.billing_receipts;b private.billing_bindings;begin
 if code not in ('provider_unavailable','invalid_snapshot','worker_failure') or code is null then raise exception 'BILLING_INVALID_ERROR';end if;
 select * into strict r from private.billing_receipts where event_id=e for update;
 select * into strict b from private.billing_bindings where subscription_id=r.subscription_id for update;
 if r.state<>'queued' or b.lease is distinct from token or b.epoch<>v or b.lease_until<=now() then raise exception 'BILLING_STALE_LEASE';end if;
 update private.billing_receipts set state=case when attempts>=5 then 'dead' else 'queued' end,last_error=code,retry_at=now()+make_interval(secs=>least(3600,(30*power(2,attempts))::integer)) where event_id=e;
 update private.billing_bindings set lease=null,lease_until=null where workspace_id=b.workspace_id;
end $$;
revoke all on function private.billing_enqueue(text,text,text,boolean),private.billing_claim(text),private.billing_complete(text,uuid,bigint,jsonb),private.billing_retry(text,uuid,bigint,text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.billing_enqueue(text,text,text,boolean),private.billing_claim(text),private.billing_complete(text,uuid,bigint,jsonb),private.billing_retry(text,uuid,bigint,text) to service_role;
