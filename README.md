# Onboarding Portal API

To install dependencies:

```sh
bun install
```

To run locally on the Cloudflare Workers runtime:

```sh
bun run dev
```

open http://localhost:8787

To validate the Worker bundle without deploying:

```sh
bun run cf:check
```

To deploy to Cloudflare Workers:

```sh
bun run deploy
```

This project is configured for Cloudflare Workers Builds from a connected
GitHub repository. Runtime variables are managed in the Cloudflare dashboard,
and `keep_vars` is enabled in `wrangler.jsonc` so repo deploys do not overwrite
dashboard-managed variables.

In Cloudflare, open the Worker, then go to Settings > Variables and Secrets and
add the runtime values from `.env.example`. Use Secret for sensitive values.

Required runtime values:

```sh
NODE_ENV=production
DATABASE_URL=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=7
ALLOW_ADMIN_REGISTRATION=false
COOKIE_SECURE=true
CORS_ORIGIN=...
EMAIL_FROM=...
PUBLIC_APP_URL=...
RESUBMISSION_TOKEN_TTL_DAYS=7
```

Optional integration values:

```sh
COOKIE_DOMAIN=...
GOOGLE_DRIVE_CLIENT_EMAIL=...
GOOGLE_DRIVE_PRIVATE_KEY=...
GOOGLE_DRIVE_PARENT_FOLDER_ID=...
RESEND_API_KEY=...
EMAIL_REPLY_TO=...
EMAIL_TEST_TO=...
```

Live notifications use the `NOTIFICATION_HUB` Durable Object binding defined in
`wrangler.jsonc`; it is deployed automatically with the Worker.
