-- LOCAL SYNTHETIC FIXTURE v1. Never seed into customer production.
-- This identity has no password or external email delivery. It cannot sign in.
-- An operator creates separate confirmed test identities for live Auth tests.
insert into auth.users(id,email,aud,role,created_at,updated_at)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','synthetic-seed@utsavos.invalid','authenticated','authenticated',now(),now())
on conflict(id) do nothing;
do $$
declare w uuid;e uuid;r jsonb;v integer;fixture_actor uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
begin
 perform set_config('request.jwt.claim.sub',fixture_actor::text,true);
 w:=public.create_personal_workspace();
 r:=public.event_command(null,w,'create','{"type":"wedding","title":"SYNTHETIC SEED — Garden celebration","dateStatus":"tbd","startsAt":null,"timeZone":"Asia/Kolkata","guestCount":150,"currency":"INR","budgetMinor":"50000000","preferences":"Synthetic fixture; no real vendor facts"}',null,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001','synthetic-seed-v1');
 e:=(r->>'id')::uuid;v:=(r->>'version')::integer;
 r:=public.event_command(e,null,'put_budget','{"fields":{"title":"Synthetic catering allowance","category":"catering","pricingBasis":"per_guest","unitPriceMinor":"85000","quantity":null,"sourceKind":"user_estimate","sourceLabel":"Synthetic fixture","isLocked":false}}',v,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002','synthetic-seed-v1');v:=(r->>'version')::integer;
 r:=public.event_command(e,null,'put_budget','{"fields":{"title":"Synthetic other fixed estimates","category":"other","pricingBasis":"fixed","unitPriceMinor":"25000000","quantity":null,"sourceKind":"user_estimate","sourceLabel":"Synthetic fixture","isLocked":false}}',v,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003','synthetic-seed-v1');v:=(r->>'version')::integer;
 r:=public.event_command(e,null,'put_budget','{"fields":{"title":"Synthetic protected photographer","category":"photography","pricingBasis":"fixed","unitPriceMinor":"5000000","quantity":null,"sourceKind":"user_estimate","sourceLabel":"Synthetic fixture; no real commitment","isLocked":true}}',v,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004','synthetic-seed-v1');v:=(r->>'version')::integer;
 r:=public.event_command(e,null,'put_task','{"fields":{"title":"Review venue capacity before changing guests","dueAt":null,"priority":"high","dependencyIds":[]}}',v,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb005','synthetic-seed-v1');v:=(r->>'version')::integer;
 perform public.event_command(e,null,'put_vendor','{"fields":{"title":"Synthetic photographer requirement","category":"photography","status":"confirmed","quoteSource":"Synthetic user-attested fixture; no real booking","isLocked":true}}',v,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb006','synthetic-seed-v1');
 perform set_config('request.jwt.claim.sub','',true);
end $$;
