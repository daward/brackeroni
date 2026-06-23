# Brackeroni
Tournament-tree decision making for private and friends-only brackets.

## Current State
The repository now contains:

1. Product rules in `domain.md`
2. Implementation decisions in `architecture.md`
3. A Next.js application scaffold in plain JavaScript
4. An OpenAPI document exposed at `/api/openapi`
5. A first-pass PostgreSQL schema under [db/001_initial_schema.sql](/abs/path/C:/code/brackeroni/db/001_initial_schema.sql:1)
6. Google sign-in support through `next-auth`

## Run Locally
1. Install dependencies with `npm.cmd install`
2. Copy `.env.example` to `.env.local`
3. Set `DATABASE_URL`
4. Run `npm.cmd run db:check`
5. Run `npm.cmd run db:migrate`
6. Start the app with `npm.cmd run dev`
7. Open `http://localhost:3000`

## Neon Setup
If you are using Neon:

1. Create a new Neon project
2. Copy the Postgres connection string from the Neon console
3. Paste it into `.env.local` as `DATABASE_URL`
4. Keep `sslmode=require` if Neon includes it in the URL

Example:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST/DBNAME?sslmode=require
AUTH_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
```

After that:

1. Run `npm.cmd run db:check`
2. Run `npm.cmd run db:migrate`
3. Run `npm.cmd run dev`

## Authentication
The app now supports Google sign-in through `next-auth`.

Required environment variables for real auth:

1. `AUTH_SECRET`
2. `GOOGLE_CLIENT_ID`
3. `GOOGLE_CLIENT_SECRET`

You must also configure the Google OAuth app with your local and deployed callback URLs, including:

1. `http://localhost:3000/api/auth/callback/google`
2. Your deployed `/api/auth/callback/google` URL

## Development Auth Shim
For local development, the app can still resolve a current user from:

1. `x-dev-user-email` and optional `x-dev-user-name` request headers, or
2. `DEV_USER_EMAIL` and `DEV_USER_NAME` in `.env.local`

The shim upserts an `app_user` row automatically.

## Initial Routes
1. `/`
2. `/vote`
3. `/create`
4. `/api/health`
5. `/api/openapi`

## Next Work
1. Build the friends invite and share-link flow on top of real identity
2. Improve image suggestion quality or move to a stronger provider
3. Expand test coverage around auth-protected behavior
4. Continue polishing bracket creation and management flows
