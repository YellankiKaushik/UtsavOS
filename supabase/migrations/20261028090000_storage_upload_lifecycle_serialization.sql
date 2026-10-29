-- A Storage INSERT begun before a deletion hold must commit before cleanup can
-- inspect object absence. A waiting INSERT must re-read the hold after its lock.
do $$declare source text;marker text;begin
 source:=pg_get_functiondef('private.document_access(text,text)'::regprocedure);
 marker:='select * into d from public.event_documents where object_path=path;';
 if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'Unexpected document access lock marker';end if;
 execute replace(source,marker,marker||$q$
 if cap='insert' and d.id is not null then
  perform 1 from public.workspaces where id=d.workspace_id for update;
  select * into d from public.event_documents where object_path=path;
 end if;
 $q$);
end $$;
