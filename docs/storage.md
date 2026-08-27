# Private object storage

The storage boundary accepts validated, tenant-owned objects and returns metadata suitable for a database record. No cloud storage provider or credential is configured yet.

## Security guarantees

- Object keys begin with `shops/{shopId}/` and use generated identifiers rather than customer names or original filenames.
- The application verifies both stored ownership metadata and the tenant key prefix before access.
- Supported foundation types are JPEG, PNG, WebP, HEIC, PDF, and plain text, with a 25 MB limit.
- Every object records a SHA-256 digest so extracted diagnostic or financial data can remain traceable to its source.
- Provider adapters must keep objects private and issue short-lived signed read access only after server-side authorization.
- Browser-supplied MIME types and filenames remain untrusted. Future upload handlers must inspect file signatures and scan content before making it available.
- Permanent deletion is intentionally absent from the foundation interface. Protected service, diagnostic, accounting, and audit history requires retention policy and explicit authorization.

## Provider requirements

A future provider must support encryption at rest, TLS, private buckets, short-lived signed access, lifecycle controls, access logging, separate environment namespaces, and scoped credentials. Provider selection is deferred to avoid paid-service lock-in.
