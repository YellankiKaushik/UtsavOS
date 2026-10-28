-- FR-019. Private originals and source text never enter anonymous event/RSVP reads.
create table public.event_documents(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,created_by uuid not null references auth.users(id),
 filename text not null check(length(filename) between 1 and 160 and filename !~ '[[:cntrl:]/\\]'),
 media_type text not null check(media_type in ('application/pdf','image/png','image/jpeg','text/plain')),
 byte_size integer not null check(byte_size between 1 and 2097152),object_path text not null unique,
 state text not null default 'pending_upload' check(state in ('pending_upload','ready','quarantined','archived')),
 original_cleanup text not null default 'pending' check(original_cleanup in ('pending','removed')),
 created_at timestamptz not null default now(),verified_at timestamptz,
 foreign key(workspace_id,event_id) references public.events(workspace_id,id),unique(workspace_id,event_id,id)
);
create index documents_event on public.event_documents(event_id,state,created_at,id);
create table private.document_texts(
 document_id uuid primary key references public.event_documents(id),pages jsonb not null,
 source_kind text not null check(source_kind in ('pdf_text','plain_text','manual_transcript')),updated_at timestamptz not null default now()
);
create table public.quotation_extractions(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,event_id uuid not null,document_id uuid not null,
 payload jsonb not null check(octet_length(payload::text)<=65536),provenance jsonb not null check(octet_length(provenance::text)<=4096),
 state text not null default 'pending_review' check(state in ('pending_review','accepted','rejected')),
 quote_id uuid references public.vendor_quotes(id),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 foreign key(workspace_id,event_id,document_id) references public.event_documents(workspace_id,event_id,id)
);
create index extraction_document on public.quotation_extractions(document_id,created_at,id);
alter table public.vendor_quotes add column source_document_id uuid,
 add foreign key(workspace_id,event_id,source_document_id) references public.event_documents(workspace_id,event_id,id);
create index quotes_source_document on public.vendor_quotes(source_document_id) where source_document_id is not null;
alter table public.event_documents enable row level security;
alter table public.quotation_extractions enable row level security;
alter table private.document_texts enable row level security;
revoke all on public.event_documents,public.quotation_extractions,private.document_texts from public,anon,authenticated;
grant select on public.event_documents,public.quotation_extractions to authenticated;
create policy document_contacts_read on public.event_documents for select to authenticated using(private.can_event(event_id,'contacts'));
create policy extraction_contacts_read on public.quotation_extractions for select to authenticated using(private.can_event(event_id,'contacts'));

create function private.document_access(path text,cap text) returns boolean language plpgsql security definer set search_path='' as $$
declare d public.event_documents;begin
 select * into d from public.event_documents where object_path=path;
 if d.id is null or not private.can_event(d.event_id,'contacts') then return false;end if;
 if cap='read' then return d.state in ('ready','archived','quarantined') or (d.state='pending_upload' and d.created_by=auth.uid());end if;
 if not private.can_event(d.event_id,'edit') then return false;end if;
 if cap='insert' then return d.state='pending_upload' and d.created_by=auth.uid() and d.created_at>now()-interval '30 minutes';end if;
 if cap='delete' then return d.state in ('archived','quarantined');end if;return false;
end $$;
revoke all on function private.document_access(text,text) from public,anon,authenticated;
grant execute on function private.document_access(text,text) to authenticated;
-- PGlite unit fixtures omit Storage; real Supabase and the storage-specific fixture execute this branch.
do $$begin
 if to_regclass('storage.objects') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('utsavos-documents','utsavos-documents',false,2097152,array['application/pdf','image/png','image/jpeg','text/plain']) on conflict(id) do nothing;
  if exists(select 1 from storage.buckets where id='utsavos-documents' and (public or file_size_limit is null or file_size_limit>2097152 or allowed_mime_types is null or not allowed_mime_types<@array['application/pdf','image/png','image/jpeg','text/plain']::text[])) then raise exception 'Existing document bucket configuration requires review';end if;
  create policy utsavos_documents_read on storage.objects for select to authenticated using(bucket_id='utsavos-documents' and private.document_access(name,'read'));
  create policy utsavos_documents_insert on storage.objects for insert to authenticated with check(bucket_id='utsavos-documents' and private.document_access(name,'insert'));
  create policy utsavos_documents_delete on storage.objects for delete to authenticated using(bucket_id='utsavos-documents' and private.document_access(name,'delete'));
 end if;
end $$;

create function private.document_detail(eid uuid,did uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.event_documents;t private.document_texts;begin
 if not private.can_event(eid,'contacts') then raise exception 'NOT_FOUND';end if;
 select * into d from public.event_documents where id=did and event_id=eid and state<>'archived';if d.id is null then raise exception 'NOT_FOUND';end if;
 select * into t from private.document_texts where document_id=did;
 return jsonb_build_object('document',to_jsonb(d)-'object_path','sourceKind',t.source_kind,'pages',coalesce(t.pages,'[]'::jsonb),'extractions',coalesce((select jsonb_agg(jsonb_build_object('id',id,'payload',payload,'provenance',provenance,'state',state,'quoteId',quote_id) order by created_at desc) from public.quotation_extractions where document_id=did),'[]'::jsonb));
end $$;
create function private.document_command(eid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.events;d public.event_documents;extraction public.quotation_extractions;receipt public.idempotency_receipts;rid uuid;did uuid;path text;mime text;size integer;pages jsonb;page jsonb;field jsonb;span jsonb;source_text text;digest text;op text;result jsonb;finance jsonb;begin
 if action is null or action not in ('prepare','finish','quarantine','archive','confirm_cleanup','save_text','save_extraction','record_quote','reject_extraction') or idem is null or p is null or octet_length(p::text)>600000 or length(coalesce(request_id,'')) not between 1 and 100 then raise exception 'INVALID_INPUT';end if;
 perform private.team_lock_event(eid,'edit');if not private.can_event(eid,'contacts') then raise exception 'NOT_FOUND';end if;
 select * into e from public.events where id=eid for update;
 op:='document:'||action||':'||eid;digest:=encode(sha256(convert_to(jsonb_build_object('payload',p,'version',expected)::text,'UTF8')),'hex');
 select * into receipt from public.idempotency_receipts where workspace_id=e.workspace_id and actor_id=auth.uid() and operation=op and key=idem;
 if receipt.id is not null then if receipt.request_hash<>digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;return receipt.response_ref||jsonb_build_object('replayed',true);end if;
 if expected is null or expected<>e.version then raise exception 'VERSION_CONFLICT';end if;
 did:=(p->>'documentId')::uuid;
 if action='prepare' then
  mime:=p->>'mediaType';size:=(p->>'byteSize')::integer;
  if mime is null or mime not in ('application/pdf','image/png','image/jpeg','text/plain') or size is null or size not between 1 and 2097152 then raise exception 'INVALID_INPUT';end if;
  if (select count(*) from public.event_documents where event_id=eid and original_cleanup='pending')>=100 or coalesce((select sum(byte_size::bigint) from public.event_documents where workspace_id=e.workspace_id and original_cleanup='pending'),0)+size>209715200 then raise exception 'ITEM_LIMIT';end if;
  rid:=gen_random_uuid();path:=e.workspace_id||'/'||eid||'/'||rid||'/original.'||case mime when 'application/pdf' then 'pdf' when 'image/png' then 'png' when 'image/jpeg' then 'jpg' else 'txt' end;
  insert into public.event_documents(id,workspace_id,event_id,created_by,filename,media_type,byte_size,object_path) values(rid,e.workspace_id,eid,auth.uid(),p->>'filename',mime,size,path);
 else
  select * into d from public.event_documents where id=did and event_id=eid and (state<>'archived' or action='confirm_cleanup');if d.id is null then raise exception 'NOT_FOUND';end if;rid:=did;
  if action='finish' then
   if d.state<>'pending_upload' then raise exception 'DOCUMENT_NOT_READY';end if;
   if not exists(select 1 from storage.objects where bucket_id='utsavos-documents' and name=d.object_path and (metadata->>'size')::bigint=d.byte_size and metadata->>'mimetype'=d.media_type) then raise exception 'DOCUMENT_NOT_READY';end if;
   update public.event_documents set state='ready',verified_at=now() where id=did;
  elsif action='confirm_cleanup' then
   if d.state not in ('archived','quarantined') or exists(select 1 from storage.objects where bucket_id='utsavos-documents' and name=d.object_path) then raise exception 'DOCUMENT_NOT_READY';end if;
   update public.event_documents set original_cleanup='removed' where id=did;
  elsif action in ('archive','quarantine') then
   if exists(select 1 from public.vendor_quotes q join public.vendor_commitments c on c.quote_id=q.id where q.source_document_id=did) then raise exception 'RETENTION_REVIEW_REQUIRED';end if;
   update public.event_documents set state=case when action='archive' then 'archived' else 'quarantined' end where id=did;
  elsif action='save_text' then
   if d.state<>'ready' then raise exception 'DOCUMENT_NOT_READY';end if;
   if exists(select 1 from public.quotation_extractions where document_id=did) then raise exception 'PROTECTED_RESOURCE';end if;
   pages:=p->'pages';
   if coalesce(p->>'sourceKind','') not in ('pdf_text','plain_text','manual_transcript') or jsonb_typeof(pages) is distinct from 'array' or jsonb_array_length(pages) not between 1 and 30 or octet_length(pages::text)>500000 then raise exception 'INVALID_INPUT';end if;
   if p->>'sourceKind'='pdf_text' and d.media_type<>'application/pdf' or p->>'sourceKind'='plain_text' and d.media_type<>'text/plain' then raise exception 'INVALID_INPUT';end if;
   for page in select * from jsonb_array_elements(pages) loop
    if jsonb_typeof(page->'text') is distinct from 'string' or length(page->>'text')>50000 or (page->>'page')::integer not between 1 and jsonb_array_length(pages) then raise exception 'INVALID_INPUT';end if;
   end loop;
   if (select count(distinct x->>'page') from jsonb_array_elements(pages) x)<>jsonb_array_length(pages) then raise exception 'INVALID_INPUT';end if;
   insert into private.document_texts(document_id,pages,source_kind) values(did,pages,p->>'sourceKind') on conflict(document_id) do update set pages=excluded.pages,source_kind=excluded.source_kind,updated_at=now();
  elsif action='save_extraction' then
   if d.state<>'ready' then raise exception 'DOCUMENT_NOT_READY';end if;
   select t.pages into pages from private.document_texts t where t.document_id=did;
   if pages is null or p->'payload'->>'schemaVersion' is distinct from '1' or p->'payload'->>'currency' is distinct from 'INR' or jsonb_typeof(p->'payload'->'fields') is distinct from 'object' then raise exception 'INVALID_SOURCE_SPAN';end if;
   if (select count(*) from jsonb_object_keys(p->'payload'->'fields'))<>4 or exists(select 1 from jsonb_object_keys(p->'payload'->'fields') k where k not in ('supplierName','reference','totalMinor','expiresOn')) then raise exception 'INVALID_SOURCE_SPAN';end if;
   if (select count(*) from public.quotation_extractions where document_id=did)>=20 then raise exception 'ITEM_LIMIT';end if;
   for field in select value from jsonb_each(p->'payload'->'fields') loop
    if jsonb_typeof(field) is distinct from 'object' or field->'value' is null or jsonb_typeof(field->'value') not in ('string','null') or jsonb_typeof(field->'confidence') is distinct from 'number' or (field->>'confidence')::numeric not between 0 and 1 then raise exception 'INVALID_SOURCE_SPAN';end if;
    if field->'value'='null'::jsonb and field->'source' is distinct from 'null'::jsonb then raise exception 'INVALID_SOURCE_SPAN';end if;
    if field->'value' is distinct from 'null'::jsonb then
     span:=field->'source';
     select x->>'text' into source_text from jsonb_array_elements(pages) x where (x->>'page')::integer=(span->>'page')::integer;
     if source_text is null or span->>'quote' is null or (span->>'start')::integer<0 or (span->>'end')::integer<=(span->>'start')::integer or (span->>'end')::integer>length(source_text) or substr(source_text,(span->>'start')::integer+1,(span->>'end')::integer-(span->>'start')::integer) is distinct from span->>'quote' then raise exception 'INVALID_SOURCE_SPAN';end if;
    end if;
   end loop;
   if p->'payload'->'fields'->'totalMinor'->'value'<>'null'::jsonb and (p->'payload'->'fields'->'totalMinor'->>'value' !~ '^[1-9][0-9]{0,12}$' or (p->'payload'->'fields'->'totalMinor'->>'value')::bigint>9000000000000) then raise exception 'INVALID_MONEY';end if;
   rid:=gen_random_uuid();insert into public.quotation_extractions(id,workspace_id,event_id,document_id,payload,provenance,created_by) values(rid,e.workspace_id,eid,did,p->'payload',coalesce(p->'provenance','{}'::jsonb),auth.uid());
  elsif action='reject_extraction' then
   rid:=(p->>'extractionId')::uuid;update public.quotation_extractions set state='rejected' where id=rid and document_id=did and state='pending_review';if not found then raise exception 'NOT_FOUND';end if;
  else
   if d.state<>'ready' or p->'confirmed' is distinct from 'true'::jsonb then raise exception 'INVALID_INPUT';end if;
   if p->>'extractionId' is not null then
    select * into extraction from public.quotation_extractions where id=(p->>'extractionId')::uuid and document_id=did and state='pending_review';if extraction.id is null then raise exception 'NOT_FOUND';end if;
   end if;
   finance:=private.finance_command(eid,'quote',(p->'fields')||jsonb_build_object('id',null),expected,idem,request_id);rid:=(finance->>'id')::uuid;
   update public.vendor_quotes set source_document_id=did where id=rid;
   if extraction.id is not null then update public.quotation_extractions set state='accepted',quote_id=rid where id=extraction.id;end if;
  end if;
 end if;
 if finance is null then update public.events set version=version+1,updated_at=now() where id=eid returning * into e;
 else select * into e from public.events where id=eid;end if;
 insert into public.audit_events(workspace_id,event_id,actor_id,action,resource_type,resource_id,safe_diff,request_id) values(e.workspace_id,eid,auth.uid(),'document_'||action,'private_document',coalesce(did,rid),jsonb_build_object('fromVersion',expected,'toVersion',e.version),request_id);
 result:=jsonb_build_object('id',rid,'version',e.version);
 insert into public.idempotency_receipts(workspace_id,actor_id,operation,key,request_hash,response_ref) values(e.workspace_id,auth.uid(),op,idem,digest,result);return result;
end $$;
create function public.document_detail(p_event_id uuid,p_document_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.document_detail(p_event_id,p_document_id)$$;
create function public.document_command(p_event_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.document_command(p_event_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
revoke all on function private.document_detail(uuid,uuid),private.document_command(uuid,text,jsonb,integer,uuid,text),public.document_detail(uuid,uuid),public.document_command(uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
grant execute on function private.document_detail(uuid,uuid),private.document_command(uuid,text,jsonb,integer,uuid,text),public.document_detail(uuid,uuid),public.document_command(uuid,text,jsonb,integer,uuid,text) to authenticated;

-- A quotation's original must still be available when the commitment is recorded.
alter function private.finance_command(uuid,text,jsonb,integer,uuid,text) rename to finance_command_before_documents;
revoke all on function private.finance_command_before_documents(uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
create function private.finance_command(eid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare source_id uuid;begin
 perform private.team_lock_event(eid,case when action in ('quote','withdraw_quote') then 'edit' else 'approve' end);
 perform 1 from public.events where id=eid for update;
 if action='commit' then
  select source_document_id into source_id from public.vendor_quotes where id=(p->>'quoteId')::uuid and event_id=eid;
  if source_id is not null and not exists(select 1 from public.event_documents where id=source_id and state='ready') then raise exception 'DOCUMENT_NOT_READY';end if;
 end if;
 return private.finance_command_before_documents(eid,action,p,expected,idem,request_id);
end $$;
revoke all on function private.finance_command(uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
grant execute on function private.finance_command(uuid,text,jsonb,integer,uuid,text) to authenticated;
create or replace function public.vendor_finance_command(p_event_id uuid,p_action text,p_payload jsonb,p_expected_version integer,p_idempotency_key uuid,p_request_id text) returns jsonb language sql security invoker set search_path='' as $$select private.finance_command(p_event_id,p_action,p_payload,p_expected_version,p_idempotency_key,p_request_id)$$;
