-- Expose only the opaque source ID in authorized finance reads; original access stays contact-scoped.
do $$declare source text;marker text:='''expiresOn'',expires_on,''notes'',notes,''state'',state)';begin
 source:=pg_get_functiondef('private.finance_snapshot(uuid)'::regprocedure);
 if length(source)-length(replace(source,marker,''))<>length(marker) then raise exception 'Unexpected finance snapshot definition';end if;
 execute replace(source,marker,'''expiresOn'',expires_on,''notes'',notes,''state'',state,''sourceDocumentId'',source_document_id)');
end $$;
