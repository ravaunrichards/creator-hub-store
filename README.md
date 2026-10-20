# Creator Hub Store

An original Android-first app marketplace and developer publishing starter. It is a separate project and does not connect to or modify any other Creator Hub project.

## Included
- Responsive web marketplace with search, categories, app detail cards, developer sign-in/registration, and a developer submission form.
- Express API with PostgreSQL persistence, account authentication, app metadata submission, listing moderation status, and package download endpoint.
- Developer uploads accept APK files only, with upload size limits and server-side MIME/extension checks. Uploaded packages are private until an administrator approves them.
- SQL schema, Docker Compose, setup/security docs, and automated validation tests.

## Important honest limitations
This is a functional starter for a store, not a fully audited public app marketplace. It does not yet include antivirus/sandbox scanning, a full admin moderation UI, payment processing, analytics dashboards, signed app provenance verification, or native Android installer integration. Do not publicly release user uploads until malware scanning, human review, backups, abuse response, and legal/privacy review are in place. APK download is provided by the web browser; Android installation remains subject to device settings and Android security prompts. AAB files are not directly installable; developers must provide APKs or generate compatible APKs from bundles.

## Requirements
- Node.js 20+
- PostgreSQL 16+ (or Docker)

## Run with Docker
1. Copy `.env.example` to `.env`.
2. Replace `SESSION_SECRET` and database password with unique strong secrets.
3. Run `docker compose up --build`.
4. Open `http://localhost:3000`.

## Run locally
1. Create a PostgreSQL database and user.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. `npm install`
4. `npm start`
5. Open `http://localhost:3000`.

Tests: `npm test` (no database required for unit tests).

## Before public launch
- Use HTTPS and set `COOKIE_SECURE=true`.
- Configure object storage, backups, malware scanning, package hashing, moderation, and abuse reporting.
- Add email verification and password reset.
- Create a privacy policy, terms, developer agreement, content rules, and takedown process.
- Restrict admin access, monitor API/storage spend, and test database restoration.
- Review Android distribution, consumer protection, privacy, copyright, and applicable local laws.
- Never commit `.env` or upload credentials.
