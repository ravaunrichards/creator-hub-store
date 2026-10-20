# Security checklist before public launch

- Enforce HTTPS; set `COOKIE_SECURE=true`; use unique secrets and managed secret storage.
- Add CSRF protections and email verification/account recovery.
- Run antivirus/malware scanning and file-format validation in isolated workers. APK ZIP signatures alone do not prove safety.
- Verify Android package ID and signing certificate, maintain immutable package hashes, and prevent filename/path injection.
- Add an admin-only moderation interface with audit trails; only approved packages may be downloaded.
- Add report/takedown workflows, rate limits, upload quotas, abuse detection, and storage lifecycle policies.
- Move uploads to private object storage and scan before publication; serve files with safe content headers.
- Back up database and files, test restore, and monitor logs without recording passwords, cookies, or private data.
- Complete privacy, developer terms, copyright, consumer protection, and jurisdictional review.
