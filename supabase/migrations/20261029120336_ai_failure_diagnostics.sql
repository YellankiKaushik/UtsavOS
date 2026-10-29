-- Persist allowlisted failure diagnostics, never raw errors, prompts or headers.
do $$declare source text;marker text;replacement text;begin
 source:=pg_get_functiondef('private.command_before_teams(uuid,uuid,text,jsonb,integer,uuid,text)'::regprocedure);
 marker:='usage_metadata=jsonb_strip_nulls(jsonb_build_object(''routingProvider'',left(meta->>''routingProvider'',150),''reportedCost'',left(meta->>''reportedCost'',100)))';
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'Unexpected usage diagnostics definition';end if;
 replacement:=$m$usage_metadata=jsonb_strip_nulls(jsonb_build_object(
  'routingProvider',left(meta->>'routingProvider',150),'reportedCost',left(meta->>'reportedCost',100),
  'failureCategory',case when meta->>'failureCategory' in ('authentication','authorization','quota','routing','dns','tls','network','capability','model','rate_limit','credits','timeout','cancelled','unavailable','refusal','invalid_output') then meta->>'failureCategory' end,
  'providerStatus',case when meta->>'providerStatus' ~ '^[45][0-9]{2}$' then (meta->>'providerStatus')::integer end,
  'validationStage',case when meta->>'validationStage' in ('json','schema','semantic','size','response') then meta->>'validationStage' end,
  'validationRule',case when meta->>'validationRule' in ('event_type','duplicate_ids','unknown_dependency','dependency_cycle','tbd_date','deadline','unsupported_claim','pricing_quantity','money','schema','unknown') then meta->>'validationRule' end,
  'finishReason',case when meta->>'finishReason' in ('stop','length','tool_calls','content_filter','error','unknown') then meta->>'finishReason' end
 ))$m$;
 execute replace(source,marker,replacement);
end $$;
