# API overview

- `GET /api/health` — database connectivity.
- `POST /api/auth/register` — `{ email, password, displayName }`.
- `POST /api/auth/login` — `{ email, password }`.
- `POST /api/auth/logout` — clears the HTTP-only session cookie.
- `GET /api/auth/me` — current authenticated account.
- `GET /api/apps?q=&category=` — published app catalog.
- `GET /api/apps/:id` — details for a published app.
- `GET /api/apps/:id/download` — download published APK.
- `GET /api/developer/apps` — current developer's submissions.
- `POST /api/developer/apps` — multipart form containing app metadata and `apk` file; new submissions are pending review.
- `PATCH /api/admin/apps/:id/review` — administrator-only status change to `published`, `rejected`, or `suspended`.

## Administrator review

There is no admin UI in this release. Create a normal account first, then promote the intended administrator using a trusted database session:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

Do not expose database credentials or allow self-service role changes. Authenticated endpoints use an HTTP-only session cookie. Ownership is checked server-side.
