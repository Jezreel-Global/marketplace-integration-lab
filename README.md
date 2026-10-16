# Marketplace Integration Lab

Hackathon learning app for a fictional Nigerian service marketplace. Browse seed listings, create **runtime** bookings, and run **labelled simulated payments**. No Stripe/Paystack live charges and no real money movement.

**Current milestone: 3B — secure seller identity foundation. Stripe remains disabled and no Stripe API flow is implemented.**

This milestone adds only a disabled Stripe Connect readiness guard. It makes no provider API calls or payment-product eligibility claims.

| Milestone | Status in this repo |
| --- | --- |
| 1 — Marketplace UI + seed catalog | Done (committed) |
| 2A — Provider/Admin dashboards | Done (working tree / prior agent) |
| 2B — Booking persistence + simulated payments | Done (evolved off JSON file) |
| 2C — Neon Postgres + public-demo hardening | Done |
| 3A — Stripe Connect readiness guard | Account eligibility and payment API flow remain unverified and disabled |
| 3B — Secure seller identity foundation | Clerk sign-in and separate seller profile; migration not applied |

## Architecture

```
src/app/                 App Router pages + Server Actions
src/components/          UI (booking form, simulated payment controls)
src/data/seed.ts         Read-only seed listings/providers/bookings
src/lib/marketplace-repository.ts
                         Business rules (validation, fees, transitions)
src/lib/store/           Persistence port
  postgres-adapter.ts    Neon PostgreSQL (runtime path)
  memory-adapter.ts      In-process store for unit tests
src/lib/stripe/          Server-only readiness validation (no API calls)
src/lib/seller-auth.ts   Clerk-backed server session identity
src/lib/seller-profile-service.ts  Seller identity/profile rules
db/migrations/           Versioned SQL schema
scripts/                 migrate / reset-demo / optional JSON import
```

- **Seed data** lives in TypeScript and is never written by the app.
- **Runtime bookings / payment attempts** live in Neon tables `runtime_bookings` and `runtime_payment_attempts`; seed fixtures remain in TypeScript and are never persisted by the app.
- `001_runtime_bookings.sql` creates the runtime tables and indexes; `002_runtime_state_constraints.sql` constrains persisted state, mode, and source values. `npm run db:migrate` applies versioned migrations transactionally and records applied versions in `schema_migrations`.
- Fees are always computed with `calculatePlatformFee` on the server. Payment attempts and booking transitions are written in a row-locked transaction.
- Client components never receive `DATABASE_URL`. Runtime reads fail visibly with a safe message instead of presenting seed-only data as a complete database result.

## Environment variables

Copy `.env.example` to `.env.local` (gitignored):

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes for booking mutations & Vercel | Neon/Vercel Postgres connection string |
| `DEMO_ACCESS_TOKEN` | Recommended on public demos | Optional shared-code gate for `/admin` and `/provider` |
| `DATABASE_TEST_NON_PRODUCTION` | Only for DB tests | Must be `YES` for a disposable non-production database |
| `DATABASE_TEST_DATABASE` | Only for DB tests | Exact database name matching the `DATABASE_URL` path |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Optional for seller auth | Clerk development publishable key; public by design |
| `CLERK_SECRET_KEY` | Optional for seller auth | Clerk development secret; server-only, never prefix with `NEXT_PUBLIC_` |
| `ADMIN_CLERK_USER_IDS` | Required for `/admin` | Comma-separated Clerk user IDs allowed to administer the demo; server-only |

The CLI scripts and database tests load this ignored `.env.local` through Next.js's environment loader. Keep DB-test confirmations out of Production and Preview deployment settings.

Never prefix server secrets with `NEXT_PUBLIC_`. The Clerk publishable key is the only public key; keep `CLERK_SECRET_KEY` in ignored `.env.local` and server-side deployment settings. Never commit real values. Prefer Vercel Deployment Protection for public previews; the demo token gate is only a lightweight shared gate, not authentication. Visitors enter the code at `/demo-access`; it is exchanged for a short-lived HttpOnly cookie and is not put in a URL.

## Secure seller identity (Milestone 3B)

Clerk provides real seller sign-up, sign-in, sign-out, and server-verified sessions. The app uses Clerk's stable user ID as seller identity; email addresses and browser-supplied IDs/roles do not establish identity. Seller profiles are stored separately from fictional seed providers in `seller_profiles`. This milestone adds no Stripe account, payout, payment activity, or seed-provider association.

To enable local authentication, create a Clerk development application and place its publishable key in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and secret key in `CLERK_SECRET_KEY` in ignored `.env.local`. Configure sign-up email verification in Clerk if email sign-up is enabled. Do not paste credentials into chat or expose the secret key to client code. Without both values, seller routes show setup guidance and seller operations fail closed; no successful session is simulated. Public browsing and booking creation remain available. Simulated outcomes are restricted to allowlisted administrators until runtime bookings have authenticated customer ownership.

Customers can browse and create bookings without signing in. Seller sign-up and sign-in return to `/seller` to create or view the account-specific profile. That profile does not provide access to fictional providers. `/provider` is a public seed-only illustration; `/admin` requires the separate server-side Clerk user-ID allowlist.

The `/admin` page and simulated payment/cancellation controls require a verified Clerk session whose user ID appears in the server-only `ADMIN_CLERK_USER_IDS` comma-separated allowlist. Missing Clerk configuration, a missing or malformed allowlist, signed-out sessions, and non-allowlisted users fail closed. Configure the same variable in ignored `.env.local` for local use and in the appropriate server-side Vercel environment settings before expecting an administrator to access the demo. `/provider` remains a public, seed-only illustration and is not linked to Clerk seller profiles.

Migration `003_seller_profiles.sql` creates the seller-profile table and unique Clerk identity constraint. It is a reviewed migration and is not applied automatically; apply it only after confirming the intended Neon database. Profile persistence also requires `DATABASE_URL`.

## Stripe Connect readiness gate

Milestone 3A adds server-only configuration validation and an admin readiness panel. It does **not** install the Stripe SDK or make Stripe API calls. Stripe Connect is disabled unless STRIPE_CONNECT_ENABLED=true; a test key by itself never enables it. Live secret keys are rejected. The panel never displays credentials and reports country/capability eligibility as unverified even when test credentials are configured.

Configuration variables are STRIPE_CONNECT_ENABLED (defaults to false), STRIPE_SECRET_KEY (test-mode only), and STRIPE_WEBHOOK_SECRET. For local testing, keep actual test credentials in ignored .env.local. In Vercel, configure server-only variables separately under Project Settings → Environment Variables, and leave the flag false in every environment until eligibility is confirmed. Never put Stripe secrets in NEXT_PUBLIC_* variables or commit them. The flag is a readiness setting, not proof of account eligibility or a payment flow.

The existing marketplace uses fictional Nigerian providers and NGN prices. Confirm the platform account country, intended seller countries, Connect capabilities, charge type, and presentment/settlement currencies with Stripe before implementing account creation, onboarding, Checkout, or transfers. Do not infer eligibility from the Nigeria “Extended network” listing or customer payment-method support. Simulated payments remain the only runnable payment flow and never move money.

## Neon database (Vercel Marketplace) — your dashboard actions

Do **not** invent a connection string. Create the database yourself:

1. Open the project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Open the project’s **Storage** or **Integrations / Marketplace** area and select **Neon Postgres**.
3. Accept the integration and create a database (or link an existing Neon project); choose a non-production Neon branch for local/preview testing.
4. Copy the pooled or direct connection string Vercel/Neon shows into:
   - Vercel → Project → **Settings → Environment Variables** → `DATABASE_URL` (Production + Preview).
   - Local `.env.local` as `DATABASE_URL=...` (same or a separate Neon branch/DB).
5. Set `DEMO_ACCESS_TOKEN` to a long random value for a public demo, or enable Vercel Deployment Protection. Keep this value private; share it separately from the app URL.

Then apply migrations (local machine against that URL):

```bash
cd ~/projects/marketplace-demo
cp .env.example .env.local   # then paste your real DATABASE_URL
npm install
npm run db:migrate
```

## Local development

```bash
npm install
# .env.local must include DATABASE_URL for creating bookings
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `DATABASE_URL`, seed pages still render; **create / simulate / cancel** return a safe “database not configured” error.

### Optional: import an old JSON demo store

Only if you still have `data/demo-store.json` from Milestone 2B. Not run automatically:

```bash
npm run db:import-json -- data/demo-store.json
```

### Demo reset (non-production only)

Resets **runtime** tables only; the seed catalog in code is untouched. Run this only against a disposable development/preview database. The command refuses to connect unless you provide both explicit confirmations and the exact database name from the `DATABASE_URL` path:

```bash
DEMO_RESET_CONFIRM=YES DEMO_RESET_NON_PRODUCTION=YES DEMO_RESET_DATABASE=marketplace_preview DATABASE_URL='(non-production URL from Neon)' npm run db:reset-demo
```

Replace the database name with the exact target name. Never use this command against Production. Do **not** wire it to app startup or a public HTTP route.

## Tests

```bash
# Unit / workflow tests (in-memory store — no database required)
npm test

# Postgres integration tests, only against a disposable non-production DB.
# Set these in .env.local after confirming DATABASE_URL points to that DB:
# DATABASE_TEST_NON_PRODUCTION=YES
# DATABASE_TEST_DATABASE=marketplace_preview
npm run test:db
```

If `npm run test:db` reports skipped tests, the database URL or explicit non-production confirmations are missing — **not** that integration tests passed. The integration suite exercises persisted transitions, concurrent inserts, state constraints, and reading from a fresh Node process.

Reset guard behavior is covered without connecting to a database. A real reset should only be tested against a disposable non-production database.

Also run:

```bash
npm run lint
git diff --check
npm run build
```

## Deploy to Vercel (GitHub)

1. Push this repository to GitHub (when you are ready; this milestone does not push for you).
2. Vercel → **Add New Project** → import the GitHub repo.
3. Framework preset: Next.js. Build command `npm run build`, output default.
4. Ensure `DATABASE_URL` (and optional `DEMO_ACCESS_TOKEN`) are set for Production/Preview **before** the first successful booking on the deployment.
5. Deploy. After the first deploy, run migrations once against the Production database if you have not already:

   ```bash
   DATABASE_URL='(production URL from Vercel/Neon)' npm run db:migrate
   ```

6. Verify:
   - Home page loads with seed listings and does not list runtime booking IDs.
   - Create a booking from a listing → pending payment and a generic confirmation; runtime details are not visible to signed-out customers.
   - An allowlisted administrator can inspect runtime rows at `/admin` and simulate failure, then success; banners state that the outcome is simulated and no real money moved.
   - `/provider` remains seed-only and does not display runtime bookings.
   - Redeploy or restart does not lose the runtime booking.

## Public-demo safety

- Payments remain **simulated** only.
- `/admin` requires a Clerk-verified user ID listed in `ADMIN_CLERK_USER_IDS`. The optional `DEMO_ACCESS_TOKEN` can add a shared-code gate but does not replace this authorization.
- `/provider` is a public illustration containing static fictional seed records only; it does not show runtime or private seller data.
- Prefer **Vercel Deployment Protection** for public previews.
- Runtime booking details and simulated controls are unavailable to customers until bookings are associated with authenticated customer identities. Public booking confirmations do not expose runtime booking IDs, names, email addresses, or payment attempts.
- Booking inputs are validated server-side; DB/driver errors are mapped to generic messages. Dashboard reads display an unavailable state instead of silently falling back to seed-only totals.
- The booking form tells visitors to use fictional details. Do not submit real personal or financial information.
- Runtime data and secrets stay out of Git (`.env*`, `/data/*` except `.gitkeep`).

## Security limitations (current)

- Seller authentication is limited to a minimal profile and is not linked to fictional providers. Runtime booking ownership is not modeled, so customer access to a booking detail page is intentionally withheld; only allowlisted administrators can inspect runtime records and simulate outcomes.
- The admin allowlist is a deployment-managed ID list, not a self-service role system. Keep it server-side and update it only through a trusted environment configuration process.
- Customer name/email entered in the demo are stored in Postgres and visible to allowlisted administrators — use fictional values only.
- A configured but unreachable or unmigrated database makes runtime data views unavailable; restore connectivity or apply migrations before presenting the demo.
- Reset commands require both an explicit non-production assertion and an exact database-name match, but operators must still verify the Neon branch and URL before running them.

## License / intent

Learning / hackathon demo — not a production payments platform.
