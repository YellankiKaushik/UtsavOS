-- FR-018. Financial records describe owner-entered evidence; no money is moved.
alter table public.vendor_requirements add constraint vendor_scope_unique unique(workspace_id,event_id,id);
create table public.vendor_quotes(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,vendor_requirement_id uuid not null,
 supplier_name text not null check(length(trim(supplier_name)) between 1 and 160),reference text not null check(length(trim(reference)) between 1 and 120),
 total_minor bigint not null check(total_minor between 1 and 9000000000000),currency text not null default 'INR' check(currency='INR'),
 expires_on date,notes text not null default '' check(length(notes)<=2000),state text not null default 'received' check(state in ('received','withdrawn')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,event_id,vendor_requirement_id) references public.vendor_requirements(workspace_id,event_id,id),unique(workspace_id,event_id,id)
);
create index quotes_event on public.vendor_quotes(event_id,created_at,id);
create table public.vendor_commitments(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,quote_id uuid not null unique,
 total_minor bigint not null check(total_minor between 1 and 9000000000000),deposit_due_minor bigint not null default 0 check(deposit_due_minor between 0 and total_minor),
 state text not null default 'active' check(state in ('active','cancelled')),created_at timestamptz not null default now(),cancelled_at timestamptz,cancellation_reason text check(length(cancellation_reason) between 1 and 500),
 foreign key(workspace_id,event_id,quote_id) references public.vendor_quotes(workspace_id,event_id,id),unique(workspace_id,event_id,id)
);
create index commitments_event on public.vendor_commitments(event_id,state,id);
create table public.vendor_invoices(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,commitment_id uuid not null,
 reference text not null check(length(trim(reference)) between 1 and 120),amount_minor bigint not null check(amount_minor between 1 and 9000000000000),
 issued_on date not null,due_on date,state text not null default 'issued' check(state in ('issued','void')),void_reason text check(length(void_reason) between 1 and 500),
 created_at timestamptz not null default now(),check(due_on is null or due_on>=issued_on),
 foreign key(workspace_id,event_id,commitment_id) references public.vendor_commitments(workspace_id,event_id,id),unique(workspace_id,event_id,id)
);
create unique index invoice_reference on public.vendor_invoices(commitment_id,lower(trim(reference)));
create index invoices_event on public.vendor_invoices(event_id,commitment_id,state,id);
create table public.vendor_payment_records(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,invoice_id uuid not null,
 reference text not null check(length(trim(reference)) between 1 and 120),amount_minor bigint not null check(amount_minor between 1 and 9000000000000),
 paid_on date not null,method text not null check(method in ('bank_transfer','cash','card','other')),
 state text not null default 'recorded' check(state in ('recorded','reversed')),reversal_reason text check(length(reversal_reason) between 1 and 500),reversed_at timestamptz,
 created_at timestamptz not null default now(),foreign key(workspace_id,event_id,invoice_id) references public.vendor_invoices(workspace_id,event_id,id)
);
create unique index payment_reference on public.vendor_payment_records(workspace_id,lower(trim(reference)));
create index payments_event on public.vendor_payment_records(event_id,invoice_id,state,id);
do $$declare t text;begin foreach t in array array['vendor_quotes','vendor_commitments','vendor_invoices','vendor_payment_records'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy finance_read on public.%I for select to authenticated using(private.can_event(event_id,''read''))',t);
end loop;end $$;

create function private.protect_committed_vendor() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='DELETE' or not new.is_locked) and exists(select 1 from public.vendor_commitments c join public.vendor_quotes q on q.id=c.quote_id where q.vendor_requirement_id=old.id and c.state='active') then raise exception 'PROTECTED_RESOURCE';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function private.protect_committed_vendor() from public,anon,authenticated;
create trigger protect_committed_vendor before update or delete on public.vendor_requirements for each row execute function private.protect_committed_vendor();

create function private.finance_snapshot(eid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e public.events;begin e:=private.check_event(eid);
 return jsonb_build_object('eventVersion',e.version,
  'quotes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'vendorRequirementId',vendor_requirement_id,'supplierName',supplier_name,'reference',reference,'totalMinor',total_minor::text,'expiresOn',expires_on,'notes',notes,'state',state) order by created_at desc,id) from public.vendor_quotes where event_id=eid),'[]'::jsonb),
  'commitments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'quoteId',quote_id,'totalMinor',total_minor::text,'depositDueMinor',deposit_due_minor::text,'state',state,'cancellationReason',cancellation_reason)) from public.vendor_commitments where event_id=eid),'[]'::jsonb),
  'invoices',coalesce((select jsonb_agg(jsonb_build_object('id',id,'commitmentId',commitment_id,'reference',reference,'amountMinor',amount_minor::text,'issuedOn',issued_on,'dueOn',due_on,'state',state,'voidReason',void_reason)) from public.vendor_invoices where event_id=eid),'[]'::jsonb),
  'payments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'invoiceId',invoice_id,'reference',reference,'amountMinor',amount_minor::text,'paidOn',paid_on,'method',method,'state',state,'reversalReason',reversal_reason)) from public.vendor_payment_records where event_id=eid),'[]'::jsonb),
  'summary',jsonb_build_object('committedMinor',coalesce((select sum(total_minor)::text from public.vendor_commitments where event_id=eid and state='active'),'0'),'invoicedMinor',coalesce((select sum(amount_minor)::text from public.vendor_invoices where event_id=eid and state='issued'),'0'),'paidMinor',coalesce((select sum(amount_minor)::text from public.vendor_payment_records where event_id=eid and state='recorded'),'0')));
end $$;
create function private.finance_command(eid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.events;q public.vendor_quotes;c public.vendor_commitments;i public.vendor_invoices;payment public.vendor_payment_records;receipt public.idempotency_receipts;rid uuid;vid uuid;amount bigint;deposit bigint;ref text;reason text;digest text;op text;result jsonb;begin
 if action is null or action not in ('quote','withdraw_quote','commit','cancel_commitment','invoice','void_invoice','payment','reverse_payment') or p is null or octet_length(p::text)>16000 or idem is null or length(coalesce(request_id,'')) not between 1 and 100 then raise exception 'INVALID_INPUT';end if;
 perform private.team_lock_event(eid,case when action in ('quote','withdraw_quote') then 'edit' else 'approve' end);
 select * into e from public.events where id=eid for update;
 op:='finance:'||action||':'||eid;
 digest:=encode(sha256(convert_to(jsonb_build_object('payload',p,'version',expected)::text,'UTF8')),'hex');
 select * into receipt from public.idempotency_receipts where workspace_id=e.workspace_id and actor_id=auth.uid() and operation=op and key=idem;
 if receipt.id is not null then if receipt.request_hash<>digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;return receipt.response_ref||jsonb_build_object('replayed',true);end if;
 if expected is null or expected<>e.version then raise exception 'VERSION_CONFLICT';end if;
 rid:=(p->>'id')::uuid;
 if action='quote' then
  vid:=(p->>'vendorRequirementId')::uuid;amount:=(p->>'totalMinor')::bigint;
  if p->>'totalMinor' is null or p->>'totalMinor' !~ '^[1-9][0-9]{0,12}$' then raise exception 'INVALID_MONEY';end if;
  if not exists(select 1 from public.vendor_requirements where id=vid and event_id=eid) then raise exception 'NOT_FOUND';end if;
  if rid is not null then
   select * into q from public.vendor_quotes where id=rid and event_id=eid and state='received';
   if q.id is null then raise exception 'NOT_FOUND';end if;
   if exists(select 1 from public.vendor_commitments where quote_id=rid) then raise exception 'PROTECTED_RESOURCE';end if;
  elsif (select count(*) from public.vendor_quotes where event_id=eid)>=500 then raise exception 'ITEM_LIMIT';end if;
  rid:=coalesce(rid,gen_random_uuid());
  insert into public.vendor_quotes(id,workspace_id,event_id,vendor_requirement_id,supplier_name,reference,total_minor,expires_on,notes)
  values(rid,e.workspace_id,eid,vid,p->>'supplierName',p->>'reference',amount,(p->>'expiresOn')::date,coalesce(p->>'notes',''))
  on conflict(id) do update set vendor_requirement_id=excluded.vendor_requirement_id,supplier_name=excluded.supplier_name,reference=excluded.reference,total_minor=excluded.total_minor,expires_on=excluded.expires_on,notes=excluded.notes,updated_at=now();
 elsif action='withdraw_quote' then
  select * into q from public.vendor_quotes where id=rid and event_id=eid and state='received';if q.id is null then raise exception 'NOT_FOUND';end if;
  if exists(select 1 from public.vendor_commitments where quote_id=rid and state='active') then raise exception 'PROTECTED_RESOURCE';end if;
  update public.vendor_quotes set state='withdrawn',updated_at=now() where id=rid and event_id=eid and state='received';if not found then raise exception 'NOT_FOUND';end if;
 elsif action='commit' then
  if p->'confirmed' is distinct from 'true'::jsonb then raise exception 'INVALID_INPUT';end if;
  select * into q from public.vendor_quotes where id=(p->>'quoteId')::uuid and event_id=eid and state='received';
  if q.id is null then raise exception 'NOT_FOUND';end if;
  if q.expires_on<current_date then raise exception 'QUOTE_EXPIRED';end if;
  if exists(select 1 from public.vendor_commitments where quote_id=q.id) then raise exception 'PROTECTED_RESOURCE';end if;
  if exists(select 1 from public.vendor_commitments c2 join public.vendor_quotes q2 on q2.id=c2.quote_id where q2.vendor_requirement_id=q.vendor_requirement_id and c2.state='active') then raise exception 'PROTECTED_RESOURCE';end if;
  if (select count(*) from public.vendor_commitments where event_id=eid)>=200 then raise exception 'ITEM_LIMIT';end if;
  deposit:=(p->>'depositDueMinor')::bigint;
  if deposit is null or p->>'depositDueMinor' !~ '^(0|[1-9][0-9]{0,12})$' or deposit>q.total_minor then raise exception 'INVALID_MONEY';end if;
  if coalesce((select sum(total_minor::numeric) from public.vendor_commitments where event_id=eid and state='active'),0)+q.total_minor>9000000000000 then raise exception 'BUDGET_OVERFLOW';end if;
  rid:=gen_random_uuid();insert into public.vendor_commitments(id,workspace_id,event_id,quote_id,total_minor,deposit_due_minor) values(rid,e.workspace_id,eid,q.id,q.total_minor,deposit);
  update public.vendor_requirements set is_locked=true,status='confirmed',updated_at=now() where id=q.vendor_requirement_id;
 elsif action='cancel_commitment' then
  select * into c from public.vendor_commitments where id=rid and event_id=eid and state='active';if c.id is null then raise exception 'NOT_FOUND';end if;
  if exists(select 1 from public.vendor_invoices where commitment_id=rid and state='issued') then raise exception 'FINANCIAL_RECORD_IN_USE';end if;
  reason:=trim(p->>'reason');if reason is null or length(reason) not between 1 and 500 then raise exception 'INVALID_INPUT';end if;
  update public.vendor_commitments set state='cancelled',cancelled_at=now(),cancellation_reason=reason where id=rid;
 elsif action='invoice' then
  select * into c from public.vendor_commitments where id=(p->>'commitmentId')::uuid and event_id=eid and state='active';if c.id is null then raise exception 'NOT_FOUND';end if;
  amount:=(p->>'amountMinor')::bigint;ref:=trim(p->>'reference');
  if p->>'amountMinor' is null or p->>'amountMinor' !~ '^[1-9][0-9]{0,12}$' or amount>9000000000000 then raise exception 'INVALID_MONEY';end if;
  if coalesce((select sum(amount_minor::numeric) from public.vendor_invoices where commitment_id=c.id and state='issued'),0)+amount>c.total_minor then raise exception 'COMMITMENT_EXCEEDED';end if;
  if exists(select 1 from public.vendor_invoices where commitment_id=c.id and lower(trim(reference))=lower(ref)) then raise exception 'DUPLICATE_REFERENCE';end if;
  if (select count(*) from public.vendor_invoices where event_id=eid)>=500 then raise exception 'ITEM_LIMIT';end if;
  rid:=gen_random_uuid();insert into public.vendor_invoices(id,workspace_id,event_id,commitment_id,reference,amount_minor,issued_on,due_on) values(rid,e.workspace_id,eid,c.id,ref,amount,(p->>'issuedOn')::date,(p->>'dueOn')::date);
 elsif action='void_invoice' then
  select * into i from public.vendor_invoices where id=rid and event_id=eid and state='issued';if i.id is null then raise exception 'NOT_FOUND';end if;
  if exists(select 1 from public.vendor_payment_records where invoice_id=rid and state='recorded') then raise exception 'FINANCIAL_RECORD_IN_USE';end if;
  reason:=trim(p->>'reason');if reason is null or length(reason) not between 1 and 500 then raise exception 'INVALID_INPUT';end if;
  update public.vendor_invoices set state='void',void_reason=reason where id=rid;
 elsif action='payment' then
  if p->'confirmed' is distinct from 'true'::jsonb then raise exception 'INVALID_INPUT';end if;
  select * into i from public.vendor_invoices where id=(p->>'invoiceId')::uuid and event_id=eid and state='issued';if i.id is null then raise exception 'NOT_FOUND';end if;
  amount:=(p->>'amountMinor')::bigint;ref:=trim(p->>'reference');
  if p->>'amountMinor' is null or p->>'amountMinor' !~ '^[1-9][0-9]{0,12}$' or amount>9000000000000 then raise exception 'INVALID_MONEY';end if;
  if coalesce((select sum(amount_minor::numeric) from public.vendor_payment_records where invoice_id=i.id and state='recorded'),0)+amount>i.amount_minor then raise exception 'OVERPAYMENT';end if;
  if exists(select 1 from public.vendor_payment_records where workspace_id=e.workspace_id and lower(trim(reference))=lower(ref)) then raise exception 'DUPLICATE_REFERENCE';end if;
  if (select count(*) from public.vendor_payment_records where event_id=eid)>=2000 then raise exception 'ITEM_LIMIT';end if;
  if (p->>'paidOn')::date>current_date+1 then raise exception 'INVALID_INPUT';end if;
  rid:=gen_random_uuid();insert into public.vendor_payment_records(id,workspace_id,event_id,invoice_id,reference,amount_minor,paid_on,method) values(rid,e.workspace_id,eid,i.id,ref,amount,(p->>'paidOn')::date,p->>'method');
 else
  select * into payment from public.vendor_payment_records where id=rid and event_id=eid and state='recorded';if payment.id is null then raise exception 'NOT_FOUND';end if;
  reason:=trim(p->>'reason');if reason is null or length(reason) not between 1 and 500 then raise exception 'INVALID_INPUT';end if;
  update public.vendor_payment_records set state='reversed',reversal_reason=reason,reversed_at=now() where id=rid;
 end if;
 update public.events set version=version+1,updated_at=now() where id=eid returning * into e;
 insert into public.audit_events(workspace_id,event_id,actor_id,action,resource_type,resource_id,safe_diff,request_id) values(e.workspace_id,eid,auth.uid(),'finance_'||action,'vendor_finance',rid,jsonb_build_object('fromVersion',expected,'toVersion',e.version),request_id);
 result:=jsonb_build_object('id',rid,'version',e.version);
 insert into public.idempotency_receipts(workspace_id,actor_id,operation,key,request_hash,response_ref) values(e.workspace_id,auth.uid(),op,idem,digest,result);return result;
end $$;
create function public.vendor_finance(p_event_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.finance_snapshot(p_event_id)$$;
create function public.vendor_finance_command(p_event_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.finance_command(p_event_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
revoke all on function private.finance_snapshot(uuid),private.finance_command(uuid,text,jsonb,integer,uuid,text),public.vendor_finance(uuid),public.vendor_finance_command(uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
grant execute on function private.finance_snapshot(uuid),private.finance_command(uuid,text,jsonb,integer,uuid,text),public.vendor_finance(uuid),public.vendor_finance_command(uuid,text,jsonb,integer,uuid,text) to authenticated;
