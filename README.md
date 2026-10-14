# Marketplace Integration Lab

Hackathon learning app for a fictional Nigerian service marketplace. Browse seed listings, create **runtime** bookings, and run **labelled simulated payments**. No Stripe/Paystack live charges and no real money movement.

**Current milestone: 2C — Vercel deployment readiness (Neon Postgres).**

Future learning milestones may explore marketplace provider integrations such as Stripe Connect. This milestone has no provider integration and makes no payment-product eligibility claims.

| Milestone | Status in this repo |
| --- | --- |
| 1 — Marketplace UI + seed catalog | Done (committed) |
| 2A — Provider/Admin dashboards | Done (working tree / prior agent) |
| 2B — Booking persistence + simulated payments | Done (evolved off JSON file) |
| 2C — Neon Postgres + public-demo hardening | This work |

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

The CLI scripts and database tests load this ignored `.env.local` through Next.js's environment loader. Keep DB-test confirmations out of Production and Preview deployment settings.

Never prefix these with `NEXT_PUBLIC_`. Never commit real values. Prefer Vercel Deployment Protection for public previews; the demo token gate is only a lightweight shared gate, not authentication. Visitors enter the code at `/demo-access`; it is exchanged for a short-lived HttpOnly cookie and is not put in a URL.

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
   - Home page loads with seed listings.
   - Create a booking from a listing → pending payment.
   - Simulate failure, then success — banners state that the outcome is simulated and no real money moved.
   - `/provider` and `/admin` show the new runtime row (enter the shared code at `/demo-access` if the token gate is configured).
   - Redeploy or restart does not lose the runtime booking.

## Public-demo safety

- Payments remain **simulated** only.
- `/admin` and `/provider` are **not** authenticated admin systems; banners say so.
- Prefer **Vercel Deployment Protection** for shared links. The optional `DEMO_ACCESS_TOKEN` gate is a shared demo code, not user authentication; it is entered at `/demo-access`, never embedded in a URL, and grants an eight-hour HttpOnly cookie.
- Booking inputs are validated server-side; DB/driver errors are mapped to generic messages. Dashboard reads display an unavailable state instead of silently falling back to seed-only totals.
- The booking form tells visitors to use fictional details. Do not submit real personal or financial information.
- Runtime data and secrets stay out of Git (`.env*`, `/data/*` except `.gitkeep`).

## Security limitations (current)

- No user accounts, CSRF hardening beyond Next defaults, or role-based access.
- Demo gate is a shared code, not per-user auth. Deployments without `DEMO_ACCESS_TOKEN` leave the dashboards open unless Vercel Deployment Protection is enabled.
- Customer name/email entered in the demo are stored in Postgres — use fictional values only.
- A configured but unreachable or unmigrated database makes runtime data views unavailable; restore connectivity or apply migrations before presenting the demo.
- Reset commands require both an explicit non-production assertion and an exact database-name match, but operators must still verify the Neon branch and URL before running them.

## License / intent

Learning / hackathon demo — not a production payments platform.
