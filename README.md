# Cash Flow X

A turn-based business tycoon game built on a real double-entry accounting engine. Start with £100,000 of share
capital and try to build a £10m company in ten years without running out of cash.

Every decision (hiring, pricing, borrowing, stock purchases, acquisitions) posts balanced journal entries. The
income statement, balance sheet and cash flow statement are **derived from the ledger**, so they tie by
construction, and an integrity check proves it every month.

## What's in it

| Area | Detail |
| --- | --- |
| Ledger | 31-account chart of accounts, integer-pence double entry, unbalanced postings rejected, year-end close to retained earnings |
| Statements | Income statement, balance sheet (current/non-current split), indirect-method cash flow, trial balance, searchable journal |
| Accounting | Accruals (PAYE/NI), prepayments (quarterly rent), deferred revenue (IFRS 15 annual subscriptions), weighted-average inventory, straight-line depreciation, bad debts, UK corporation tax with marginal relief and losses carried forward, goodwill and IAS 36 impairment, FVTPL investments |
| Finance | Amortising loans priced on leverage, quarterly covenants (debt/EBITDA, interest cover) with penalty rate and recall, asset-based overdraft, equity raises with dilution, dividends capped at distributable reserves |
| Operations | 6 data-driven industries, 3 staff roles, price elasticity, brand/reach, capacity, stock cover, customer and supplier credit terms, automation capex |
| Market | Named competitors that react to you (price cuts when your share jumps, now and then a product launch), 9 seeded economic events (recession, rate rise, credit crunch, and more) |
| Seasons & promotions | Each sector has a seasonal demand curve (restaurants peak in December, gyms in January, shops before Christmas). Run a 10/20/30% promotion for 1 to 3 months: it lifts sales through price elasticity, costs margin, and leaves a quiet month and a cooldown |
| Morale, pay & training | One team morale number (0-100) set by pay level (below / market / above), a training budget and money worries. It drives productivity, and low morale makes people leave and raises the poaching risk |
| R&D projects | Point three R&D staff at a named multi-month project (new product line, cost cutting, quality leap). It costs money every month, can fail, and pays off permanently through the same modifiers as upgrades |
| Analysis | 16 ratios with definitions and industry benchmarks, profit bridge (waterfall), 12-month forecast using the real engine, EV/EBITDA vs revenue multiple vs 5-year DCF |
| M&A | Acquisition targets with seller-adjusted EBITDA, paid due diligence, consolidation, goodwill |
| Modes | Endless sandbox on Easy / Medium / Hard, plus the "Profitable but broke" working-capital case study |
| Difficulty | Easy £100k (70% good events, unlimited rebirths), Medium £50k (60%, 3 rebirths per prestige), Hard £25k (35%, one life, no prestige, no perks) |
| Events | ~20% chance a month. Automatic events (booms, rate moves, grants, break-ins) plus choice cards that pause the game (client terms, poached staff, breakdowns, tax inspections, rent reviews, angel investors, bulk deals, grants) |
| Upgrades | Eight levelled upgrades per sector (capacity, market, reach, quality, churn, spoilage, costs), each capitalised as PP&E, with prerequisite chains; each stands as its own building on the island |
| Leasing | Start-up equipment can be bought or leased (IFRS 16 right-of-use asset, lease liability, interest/principal split) |
| Prestige | At a £10m owner stake (2.5x higher each time) sell up for Legacy points = floor(√(stake ÷ £1m)) and gems; spend points in a 15-perk tree. Perks, gems and banked boosts survive; cash and upgrades reset. Reach it from the Prestige button in the bottom bar |
| Prestige rank | Every prestige is a permanent rank (Operator, Director, Executive, up to Legend): +2% demand on every new company per rank, capped at +30%, on Easy and Medium. The server supplies your rank from its own records, so it cannot be claimed from the client |
| Daily challenge | One shared company per UTC day for 24 months with no perks, boosts or prestige. The server picks the company, allows one ranked attempt a day, and scores only finished, replay-verified companies. Practise offline as often as you like |
| Stats, sharing & sound | Lifetime stats and company history, a shareable picture of any finished company, and synthesized sound effects and haptics (switchable in Settings) |
| Boosts | Gem-bought timed boosts (Rush hour, Lucky charm, Megaphone) that carry over between runs |
| Online | Google sign-in; runs verified in chunks by the Worker (same engine, compact checkpoints, checksums); server-owned Legacy points, perks and prestiges |
| Updates | Games saved on an older version are upgraded in place (`migrateState` in the engine) and carry on with the new rules, so an update never wipes a company. An online company that was being verified is carried over to the server once (`POST /runs/:id/carryover`): the server accepts it only for runs from before the update, and only if it is the same company, its books balance and its growth is plausible. After that, every month is verified by replay again |
| Holding companies | Open join, 30 members, visibility (full / summary / hidden), level perks from combined valuation, weekly goals, members investing in each other (new shares, 49% cap, dividends, buy-outs) |
| Leaderboards | Net worth, prestige count and holding companies; all-time and monthly seasons with gem rewards; Hardcore badge |

## Repository layout

```
packages/engine   Pure TypeScript simulation + accounting (no DOM, no I/O). (state, action) -> state
apps/web          React + Vite + Tailwind + Recharts + Zustand. Deployed to Cloudflare Pages
apps/api          Cloudflare Worker (Hono + D1 via Drizzle): leaderboard with server-side replay verification
```

## Running locally

Requires Node 20+.

```bash
npm install
```

```bash
npm test
```

```bash
npm run dev
```

The game runs at http://localhost:5173. In development it talks to a local game server and signs you in by name
(no Google needed; `apps/web/.env.development` and `apps/api/.dev.vars` switch this on). Start the server in a
second terminal:

```bash
npm run db:migrate:local -w @cfx/api
```

```bash
npm run dev:api
```

To play fully offline instead (no accounts, holding companies or leaderboards), remove `VITE_API_URL` from
`apps/web/.env.development`.

### Other useful commands

| Command | What it does |
| --- | --- |
| `npm test` | Engine tests: ledger rules, statements tie every month for every industry, property-based random play, determinism/replay, tax, loans, valuation, golden snapshot |
| `npm run e2e` | Playwright (desktop + mobile): onboarding, real-time play, the books, save/load, the 3D scene, and the online flow (sign-in, verified sync, holding company, leaderboards). Starts the local server itself |
| `npm run smoke -w @cfx/api` | Against the local server: four players play real games and sync them in chunks; checks prestige, perks, holding companies, an investment with dividends and buy-out, leaderboards, and that tampered or out-of-order runs are refused |
| `npm run balance -w @cfx/engine` | Balancing report: a heuristic bot plays every industry for 10 years |
| `npm run bench -w @cfx/engine` | Times a full 10-year replay (the Worker's CPU budget) |
| `npm run typecheck` | Typecheck all workspaces |

## Deploying to Cloudflare (free tier)

You need a free Cloudflare account and a free Google Cloud account (for Google sign-in).

1. **Log in to Cloudflare** (opens a browser):

   ```bash
   npx wrangler login
   ```

2. **Create the database** and paste the printed `database_id` into `apps/api/wrangler.toml`:

   ```bash
   npx wrangler d1 create cash-flow-x
   ```

3. **Create the tables** in the remote database:

   ```bash
   npm run db:migrate:remote -w @cfx/api
   ```

4. **Deploy the game server.** Note the `https://cash-flow-x-api.<you>.workers.dev` URL it prints:

   ```bash
   npm run deploy:api
   ```

5. **Deploy the web app once** to get its address (creates the Pages project and prints your `*.pages.dev` URL):

   ```bash
   npm run deploy:web
   ```

6. **Create the Google sign-in client** at console.cloud.google.com:
   - Create a project, then open **APIs & Services › OAuth consent screen**: choose *External*, fill in the app name
     and your email, and publish it. Only the basic profile scopes are used.
   - Open **APIs & Services › Credentials › Create credentials › OAuth client ID**, type *Web application*.
   - Under **Authorised JavaScript origins** add your `https://<project>.pages.dev` URL and `http://localhost:5173`.
     No redirect URIs are needed.
   - Copy the client ID (it ends in `.apps.googleusercontent.com`). It is not a secret.

7. **Give the server the client ID.** Add `GOOGLE_CLIENT_ID = "<the client ID>"` under `[vars]` in
   `apps/api/wrangler.toml`. If your Pages URL isn't `https://cash-flow-x.pages.dev`, add it to `ALLOWED_ORIGINS` there
   too. Then redeploy:

   ```bash
   npm run deploy:api
   ```

8. **Point the web app at both.** Create `apps/web/.env.production` (see `apps/web/.env.example`) with
   `VITE_API_URL=https://cash-flow-x-api.<you>.workers.dev` and `VITE_GOOGLE_CLIENT_ID=<the client ID>`, then:

   ```bash
   npm run deploy:web
   ```

9. **Check the server:** `https://cash-flow-x-api.<you>.workers.dev/health` should show `"googleConfigured":true`
   and `"devAuth":false`. Never set `DEV_AUTH` in production.

Alternatively, connect the GitHub repository in the Cloudflare dashboard (Workers & Pages › Create › Pages › Connect
to Git) with build command `npm run build`, output directory `apps/web/dist`, and the two `VITE_` variables set as
environment variables.

**CPU budget:** Workers Free allows 10 ms CPU per request. Runs are verified in chunks: each sync replays only the
months since the last one from a compact checkpoint (about 15 KB). A yearly sync benchmarks at ~4 ms
(`npx tsx packages/engine/scripts/bench-sync.ts`); a sync may cover at most 36 months.

**Anti-cheat:** the server replays every decision, so the cash, profits, valuations, prestiges, Legacy points, perks
and holding company levels behind the leaderboards are all verified. Gems (and the boosts they buy) are earned on the
device and are not verified; boosts are capped at 4 per in-game year and a run can start with at most 3.

## Design notes

- **Money** is integer pence everywhere; `allocate()` splits amounts with the largest-remainder method so subledgers
  (receivables/payables queues, deferred revenue schedule, fixed asset register, loan schedules) always reconcile to
  their control accounts to the penny.
- **Cash flow classification** is attached to each journal entry. P&L lines are only allowed in operating entries,
  so the indirect method can start from profit and provably equals the operating cash actually posted.
- **Determinism:** the PRNG state lives in the game state, so a seed plus an action log reproduces a game exactly.
  That is what makes server-side score verification possible.
- **Simplifications** (deliberate, and stated in-game): acquired net assets at book value as a proxy for fair value,
  corporation tax paid 9 months after year end for all company sizes, a single cash-generating unit for impairment.

Educational simulation, not financial advice.
