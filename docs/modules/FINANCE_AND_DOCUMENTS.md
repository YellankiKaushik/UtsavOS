# Vendor finance and private document review

## Financial records

Vendor finance links quotations, commitments, invoices and user-recorded payments to event/workspace scope. Exact paise arithmetic, locks, versions and transaction guards bound commitments and prevent invalid overpayment. Concurrent mutation tests exercise financial invariants. These are **records**: the application does not transfer funds, execute checkout or verify supplier availability/authenticity.

Source: `src/domain/vendor-finance.ts`, `src/application/finance-http.ts`, `src/components/vendor-finance.tsx`, migration `20261027201649_p1_vendor_finance.sql`. Local/native and ordinary hosted RPC evidence exists; do not conflate it with a payment-provider integration.

## Private originals and quotations

PDF originals remain in private Supabase Storage. Upload/download uses ordinary authorized server-held user sessions rather than public object URLs or a privileged browser key. A bounded separate Node parser extracts canonical page text without application secrets. Uploaded document text is untrusted; links/instructions inside it are not executed.

Manual source review lets users inspect and confirm quotation fields. AI suggestions, when separately enabled, require exact Unicode source spans and consistent nullable values/confidence; they cannot directly create a commitment or payment. The genuine `quotation.v2` smoke is component evidence only. `FEATURE_DOCUMENT_EXTRACTION=false` remains the release setting until full hosted extraction/review/acceptance is verified.

Source: `src/domain/documents.ts`, `src/application/document-http.ts`, `src/infrastructure/documents/files.ts`, `scripts/pdf-extract-worker.mjs` and the private-document/provenance migrations. Hosted private PDF isolation/upload/download and manual source review passed. Unsupported images need a manual transcript; OCR is not claimed.

Storage authorization serializes upload reservation against event deletion. Lifecycle completion checks actual original-object absence and preserves financial/audit holds. [Workspace and data contract](WORKSPACE_AND_DATA.md) describes the remaining full-account/backup limitations.
