-- Preserve historical v1 metadata; only requests explicitly carrying v2 use v2.
alter table public.ai_drafts add constraint ai_drafts_prompt_version_known
 check(prompt_version in ('event-plan.v1','event-plan.v2'));
do $$declare source text;marker text;begin
 source:=pg_get_functiondef('private.command_before_teams(uuid,uuid,text,jsonb,integer,uuid,text)'::regprocedure);
 marker:='latency_ms=(meta->>''latencyMs'')::integer,attempt_count=(meta->>''attemptCount'')::integer where id=rid and created_by=auth.uid();';
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'Unexpected draft provenance definition';end if;
 execute replace(source,marker,'prompt_version=coalesce(meta->>''promptVersion'',''event-plan.v1''),'||marker);
end $$;
