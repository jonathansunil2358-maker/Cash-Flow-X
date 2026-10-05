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
| Modes | Endless sandbox on Easy / Medium / Hard, plus four case studies (see Teaching below) |
| Difficulty | Easy £100k (70% good events, unlimited rebirths), Medium £50k (60%, 3 rebirths per prestige), Hard £25k (35%, one life, no prestige, no perks) |
| Events | ~20% chance a month. Automatic events (booms, rate moves, grants, break-ins) plus choice cards that pause the game (client terms, poached staff, breakdowns, tax inspections, rent reviews, angel investors, bulk deals, grants) |
| Upgrades | Eight levelled upgrades per sector (capacity, market, reach, quality, churn, spoilage, costs), each capitalised as PP&E, with prerequisite chains; each stands as its own building on the island |
| Leasing | Start-up equipment can be bought or leased (IFRS 16 right-of-use asset, lease liability, interest/principal split) |
| Prestige | At a £10m owner stake (2.5x higher each time) earn Legacy points = floor(√(stake ÷ £1m)) and gems; spend points in a 15-perk tree. Your company carries on untouched (nothing resets): prestige raises your rank, which lifts demand at once and for every future company, and the next target is higher. Reach it from the Prestige button in the bottom bar |
| Prestige rank | Every prestige is a permanent rank (Operator, Director, Executive, up to Legend): +2% demand per rank (applies to your running company straight away and to every new one), capped at +30%, on Easy and Medium. The server supplies your rank from its own records, so it cannot be claimed from the client |
| Daily challenge | One shared company per UTC day for 24 months with no perks, boosts or prestige. The server picks the company, allows one ranked attempt a day, and scores only finished, replay-verified companies. Practise offline as often as you like |
| Stats, sharing & sound | Lifetime stats and company history, a shareable picture of any finished company, and synthesized sound effects and haptics (switchable in Settings) |
| Boosts | Gem-bought timed boosts (Rush hour, Lucky charm, Megaphone) that carry over between runs |
| Online | Google sign-in; runs verified in chunks by the Worker (same engine, compact checkpoints, checksums); server-owned Legacy points, perks and prestiges |
| Updates | Games saved on an older version are upgraded in place (`migrateState` in the engine) and carry on with the new rules, so an update never wipes a company. An online company that was being verified is carried over to the server once (`POST /runs/:id/carryover`): the server accepts it only for runs from before the update, and only if it is the same company, its books balance and its growth is plausible. After that, every month is verified by replay again |
| Holding companies | Open join, 30 members, visibility (full / summary / hidden), level perks from combined valuation, weekly goals, members investing in each other (new shares, 49% cap, dividends, buy-outs) |
| Surprise & story | Hot and cold streaks, market rumours that may be true, a sudden-death big bet, rare black swans, mystery boxes and a sticker album, hidden achievements. Named rival bosses, a yearly mentor, customer letters, press interviews, founder life, team careers |
| Showing off | Island decorations, a logo maker, photo mode with filters, a trophy hall, a year-in-review card and winner replays. Everything here is cosmetic: it never changes the numbers |
| Smarter play | Advisors that sometimes disagree, risk meter, break-even, a six-month cash calendar, autopilot standing orders (part of the replayed action log), saved what-if plans, a plan marketplace, side ventures that settle after 6 to 12 months |
| Community | Friend duels, a weekend tournament bracket, a shared community goal, a rival of the week, and a "watch the winner" replay that re-runs the real engine. Needs sign-in |
| Progression | Company culture picked at the start (validated and replayed by the server like the extra challenges), reputation tiers, a monthly season pass, founder skills (conveniences only), sector mastery badges |
| Mood | Optional adaptive music, island weather that follows the seasons, a different sound for each kind of news, crowd reactions and confetti for firsts |
| Teaching | A daily "spot the mistake" trial balance, a daily ratio detective, a yearly audit day (a clean audit lifts reputation), an explain-it glossary built from your own company, and four case studies (profitable but broke, the cash crunch, the growth trap, the price war) |
| Story & operations | A takeover approach, culture events (parties, strikes, safety inspections), a yearly trade fair, lawsuits, spy offers, office pranks and IPO day. Pick your supplier (cheap and risky, or dear and dependable), franchise your name for royalties, and see who your customers are |
| Personality | A pet mascot, employee of the month, names for your buildings, a newspaper front page about your real numbers, a founder diary, team hats, and an island that can follow your clock. All cosmetic |
| Challenge modes | Boss rounds every three years, a speedrun to a £1m company, the Ironman badge, a chaos dial (Calm or Mayhem), a gym turnaround case study, a weekly puzzle league checked by the server, and seed sharing |
| Collecting | Extra island land with new decorations, achievement trails with bigger prizes, unlockable soundtracks and a museum of your past companies |
| More learning | Accountant's desk (which journal entry?), a tax season sprint, and a mock interview where an investor quizzes you on your own ratios |
| Story campaign | A ten-chapter campaign of case-study companies, a nemesis who returns from your last company, backstory origins (banker, engineer, marketer, dropout), a whistleblower and recall crisis, and a documentary of your run |
| Business depth v3 | A product designer slider, a star hiring market, buying your own building, a collaboration, export markets with currency swings, and customer reviews you can answer |
| Mini-games | Negotiation, pitch day, stock-take and cash-flow tetris. They pay gems on your device only; only the puzzle league is checked by the server |
| Together | Co-op links where a friend advises or watches your live company (only you can act), trading cards you can gift, a holding-company rivalry, a monthly season theme and a hall-of-fame skyline |
| Feel | Penny the guide, a seasonal island, sound packs, accessibility settings (font, text size, colour-safe, calm mode), keyboard shortcuts and a replay theatre |
| Long term | A dynasty family tree with inheritance gems, mastery challenges, and a £100m empire venture |
| Growing pains | Hiring past 10, 25, 50 and 100 staff moves you to bigger premises (a capitalised fit-out and a higher base rent, with a warning before you hire), and running above 95% of capacity for months builds team strain that wears down quality, reputation and capacity |
| Deals and money | Buy a named rival (goodwill, integration costs, impairment risk), sell the whole company to one of three bidders, take a venture-capital round (three term sheets, one with a liquidation preference), run a crowdfunding campaign, hedge currency and costs, and file patents for licence income |
| People and culture | A training academy, office/hybrid/remote work styles, a yearly innovation day, poaching a star from a rival (and rivals poaching yours), and "the heir" start-up origin |
| Customers and brand | A loyalty programme, a service desk of monthly complaints, influencer deals, five named regular customers and a Black Friday campaign |
| Big strategy | A group of companies (a second-sector subsidiary), a yearly draft of one of three boons, an economic-cycle desk with a stance, a green track and a charity/ESG rating |
| Together, v4 | Visit a friend's island with a like or a greeting, a shared holding-company landmark funded from members' dividends, a trust-based cosmetics market, mentor and mentee rewards, and a scenario maker with share codes |
| Feel, v4 | Seasonal festivals with limited hats, a free-play sandbox (unranked), an island timelapse recorded on your device, and an island radio that reads out your real numbers |
| Mergers and acquisitions, v5 | A deal room with new listings all year, four extra due-diligence checks, a synergy forecast, culture fit, haggling against a hidden reserve price, bidding wars, deal structures (cash, shares, earn-out), an acquisition loan, integration plans with trouble events, retention bonuses, a rebrand choice, competition-regulator reviews, hostile bids on rivals, merger of equals, selling an acquired business, a negotiated trade sale and a deal history |
| Fun, v6 | Rival moves, industry shocks, activist investors, cyber attacks and founder breaks as choice events; a supply-chain choice, product lifecycle and refresh, pop-up shops, a pricing lab, franchise standards, named managers, department focus branches, cyber security levels; four more daily games (boardroom pitch, crisis call centre, auction house, spot the fraud); an awards night recap and a company timeline; joint ventures between two players and weekly guild trade wars |
| Fun, v7 | An insider's tip, board coups, extreme weather, tax inspections and celebrity offers as choice events; seasonal temps, loyalty tiers, a warehouse layout puzzle, tenders against a hidden rival, yearly quality inspections, anniversaries, an office mascot, event cards and a founder's book; four more daily games (forecast, hiring, route planner, price war); supplier deals between players and a weekly co-op boss |
| Fun, v8 | A leak to a rival, recall drills, viral posts, supplier scares and a mentor's warning as choice events; a customer council each quarter, stock control against shrinkage, a yearly training budget split, outsourcing, limited-range batches, a monument hall, a company yearbook picture; four more daily games (lease haggle, spot the trend, ad budget, payroll puzzle); business-school badges and a seasonal stamp album; friendly one-week growth bets and a guild supply chain |
| Business policies, v9 | Over fifty dials in four panels (operations, people, customers, finance) such as energy tariffs, solar, packaging, warranties, night shifts, four-day weeks, union relations, pensions, brand voice, sponsorship and standby credit, each with set-up costs, running costs or risks; and 34 new business events (elections, heists, strikes, grants, breakdowns, reviews, flash sales, audits and more) |
| Management, v10 | A Management section with 24 topic cards (accounting, tax, lending, equity, deals, property, supply chain, pricing, marketing, R&D, HR, quality, insurance, legal, rivals, the economy, export, expansion, sustainability, IT, customer service, governance, exits, management tools): over 200 more policy dials, over 220 more business events and 158 timed initiatives you pay for, wait on and either win or lose |
| Sector mechanics, v11 | 150 sector-only policies, events and initiatives for software, clothing, restaurants, fitness clubs, e-commerce and EV conversion firms (free tiers and technical debt, collections and fashion week, menu engineering and kitchen fires, January rushes and instructor pay, warehouse robots and chargebacks, battery contracts and recalls); each only appears for its own sector |
| Ten more sectors, v12 | Bakery chain, farm and farm shop, hotel, craft brewery, game studio, haulage, pharmacy, construction firm, toy maker and a space launch startup, each with its own economics (prices, margins, spoilage, credit terms, seasonality), eight upgrades and 25 sector-only policies, events and initiatives (250 in all). They borrow the look of a similar original sector, and daily/weekly challenges and sticker pages stay on the original six |
| Buy back shares, v13 | Angel and venture rounds are now tracked as shareholders. From the Investors tab you can buy 25%, 50% or all of any investor's stake back at your valuation: angels and funds who have done well ask up to 35% more, new investors are locked in for six months, and players in your holding company are paid at fair value only. Charged to retained earnings; the server replays it like any other action |
| Living market, v14 | Rivals keep changing: start-ups appear, weak firms go bust, rivals buy each other, and the strong ones float on the stock market. There are always 5 to 10 at a time and the market stays about as tough overall (total rival strength is held constant). A Stocks tab in the Books shows a live ticker, an index, each listed rival's price and chart, market news, and lets you buy and sell their shares with company cash (fair value through profit or loss, 0.5% fee, at most 30% of a firm, paid out at a premium if they are taken over). Share prices follow each rival's share of your market, so beating a rival drags its stock down. The tick-by-tick wobble on screen is cosmetic; trades use the monthly closing price |
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
