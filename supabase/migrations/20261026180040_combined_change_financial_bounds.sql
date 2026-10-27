-- Preserve the authenticated command core; only preview intermediate arithmetic changes.
create or replace function private.command_core(eid uuid,wid uuid,action text,p jsonb,expected integer,idem uuid,request_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 e public.events;rec public.idempotency_receipts;result jsonb;rid uuid;digest text;v_operation text;
 old_version integer;before_total bigint;after_total numeric;new_guests integer;
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
  before_total:=private.total(eid,e.guest_count);
  if new_guests not between 0 and 100000 then raise exception 'INVALID_INPUT';end if;
  -- Evaluate the complete proposal before enforcing the monetary cap. Exact numeric avoids
  -- intermediate overflow when a price reduction offsets a simultaneous quantity increase.
  select coalesce(sum(unit_price_minor::numeric * case pricing_basis when 'fixed' then 1 when 'per_guest' then new_guests else manual_quantity end),0)
  into after_total from public.budget_items where event_id=eid and state='active';
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
revoke all on function private.command_core(uuid,uuid,text,jsonb,integer,uuid,text) from public,anon,authenticated;
