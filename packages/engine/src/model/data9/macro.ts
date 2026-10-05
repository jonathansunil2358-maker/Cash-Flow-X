import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: The wider economy. Rates, inflation, currencies and shocks. Every id starts with "macro_" (policies and projects) or "e9_macro_" (events). */
export const policies: PolicyDef[] = [
  // 776 Interest-rate-cycle chart and outlook
  { id: 'macro_rates', group: 'finance', name: 'Interest-rate outlook', blurb: 'Interest rates, the price of borrowing, rise and fall in cycles. Decide how closely you follow the cycle and how much you bet on it.', options: [
    opt('Ignore the rate cycle', 'Keep your loans as they are and do not try to time anything.', {}),
    opt('Follow the outlook', 'A short monthly briefing on where rates are heading. Lenders like firms that plan ahead, so your bank offers a bigger overdraft.', { od: 1.08 }, 0.2),
    opt('Bet on the cycle', 'Keep your loans on floating rates, which are cheaper while rates are low or falling. A surprise rise lands straight on your bill.', { risk: [7, 3, 'Interest rates jumped and your floating-rate loan got dearer.'] }, -0.6)] },
  // 777 Inflation measures affecting wages and prices
  { id: 'macro_inflation', group: 'finance', name: 'Inflation playbook', blurb: 'Inflation, the general rise in prices, pushes up your costs and your people\'s pay hopes. Choose who feels it: your customers, your staff or your own margin.', options: [
    opt('Absorb it', 'Leave prices and pay alone and let your margin take the strain.', {}),
    opt('Raise prices with inflation', 'Your margin stays whole, but a few customers grumble and drift away.', { d: 0.985 }, -0.7),
    opt('Raise pay with inflation', 'People keep up with the cost of living and stay cheerful. It costs you every month.', { m: 0.4 }, 0.6),
    opt('Share the pain', 'Modest rises in both prices and pay, so nobody is squeezed too hard.', { d: 0.99, m: 0.25 }, -0.1)] },
  // 781 Commodity-price index for your sector
  { id: 'macro_commodity', group: 'ops', stock: true, name: 'Raw-material buying plan', blurb: 'Prices of your raw materials follow a sector index that can leap or tumble. Decide how you buy.', options: [
    opt('Buy as you go', 'Pay whatever the going price is each time you order.', {}),
    opt('Buy ahead on dips', 'Stock up when the index is low. Cheaper on average, but prices sometimes fall further after you buy.', { c: 0.99, risk: [5, 2, 'Raw-material prices fell after you had bought ahead, so your stock cost more than it needed to.'] }, 0.2),
    opt('Index-linked contracts', 'Suppliers charge the index price plus a small margin. A bigger saving when prices drop, and a nasty bill when they spike.', { c: 0.985, risk: [10, 3, 'The price index spiked and your index-linked contracts passed the full rise on to you.'] }, 0.1)] },
  // 784 Unemployment and hiring ease
  { id: 'macro_hiring', group: 'people', name: 'Hiring through the jobs cycle', blurb: 'When unemployment is high, good people are easy to find. When it is low, they are scarce and dear. Decide how you hire through the cycle.', options: [
    opt('Hire as you need', 'Recruit when a gap appears and take the market as it comes.', {}),
    opt('Hire when jobs are scarce', 'Snap up good people while many are looking, and carry some extra payroll in case the work follows.', { hire: 0.88, cap: 1.005 }, 0.35),
    opt('Wait for the perfect fit', 'Hold out for exactly the right person. Slower and dearer, but fewer misfits.', { hire: 1.1, q: 0.01, cap: 0.995 })] },
  // 793 Tourism swings
  { id: 'macro_tourism', group: 'customers', name: 'Tourist trade', blurb: 'Visitor numbers swing with the weather, exchange rates and the news. Decide how much of your business depends on them.', options: [
    opt('Serve whoever walks in', 'Do not change anything for visitors, either way.', {}),
    opt('Court the tourists', 'Multilingual signs, visitor deals and a spot on the tourist trail. Great in a busy summer, grim in a slump.', { d: 1.015, risk: [5, 3, 'A tourism slump left you with empty tills.'] }, 0.3),
    opt('Locals first', 'Loyal local regulars who stay put all year, though you miss out on the holiday crowds.', { rep: 0.03, ch: 0.99, d: 0.99 })] },
];

export const events: EvSpec[] = [
  // 778 Exchange-rate swings by currency pair
  { id: 'e9_macro_fxswing', title: 'The pound lurches', icon: 'globe', good: false, per: 1.2, cd: 20,
    story: 'Currency markets have gone wild and the pound has swung hard against the dollar and the euro. An exchange rate is just the price of one currency in another, so when it moves, anything you buy or sell abroad gets dearer or cheaper overnight.', choices: [
      S('lock', 'Lock in a rate with your bank', 'A small fee buys months of certainty.', 'The bank fixed today\'s rate in advance, so the swings passed you by. Boring, which is exactly what you wanted.', { k: 0.01, acct: 'otherCosts' }),
      S('ride', 'Ride the swings', 'A coin toss: the rate may help you or hurt you.', '', { gamble: { p: 0.5, good: { c: E(0.97, 4) }, bad: { c: E(1.04, 4) }, goodText: 'The rate moved your way and your imports got cheaper.', badText: 'The rate moved against you and your imports got dearer.' } }),
      S('reprice', 'Adjust your prices to match', 'Protects your margin, but a few customers grumble.', 'You nudged prices to cover the swing. A few customers grumbled, but your margins held.', { eff: { d: E(0.985, 4) } })] },
  // 780 Consumer-confidence index effects on demand
  { id: 'e9_macro_gloom', title: 'Shoppers feel gloomy', icon: 'chart', good: false, per: 1.5, cd: 14,
    story: 'The monthly consumer-confidence survey, which asks households how they feel about their money, has dropped sharply. Gloomy shoppers put off big purchases and hunt for bargains, so every business feels it a little.', choices: [
      S('promo', 'Run a reassurance promotion', 'Costs a little and keeps people coming through the door.', 'Friendly offers and warm messages kept customers coming through the gloom.', { k: 0.03, acct: 'marketing', eff: { d: E(1.02, 4) } }),
      S('hold', 'Hold your prices and wait', 'Free, but sales sag until the mood lifts.', 'You held your nerve and your prices. Sales dipped for a few months until confidence came back.', { eff: { d: E(0.98, 4) } }),
      S('budget', 'Launch a budget range', 'Cheaper to make and cheaper to buy, but a touch less special.', 'A simple budget range caught the cautious shopper, though the brand felt a little less special.', { eff: { d: E(1.015, 6), c: E(0.99, 6), brand: 0.995 } })] },
  // 782 Government-spending announcements
  { id: 'e9_macro_publicspend', title: 'The government opens its purse', icon: 'crown', good: true, per: 1.2, cd: 18,
    story: 'The government has announced a big spending drive on schools, roads and hospitals. Public bodies will be buying lots of things and firms of all sizes want a slice. Winning public contracts means plenty of forms and a long wait to be paid.', choices: [
      S('bid', 'Bid for a contract yourself', 'Costs time and fees, and you may lose.', '', { k: 0.02, acct: 'otherCosts', gamble: { p: 0.5, good: { d: E(1.05, 8), rep: 1 }, bad: {}, goodText: 'You won a contract and the orders rolled in.', badText: 'Your bid was close, but another firm won it.' } }),
      S('sub', 'Offer to subcontract', 'A smaller prize, but much better odds.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.75, good: { d: E(1.025, 6) }, bad: {}, goodText: 'The main contractor passed you a steady stream of work.', badText: 'The main bid failed and took your hopes with it.' } }),
      S('skip', 'Stay out of public work', 'No paperwork, no extra orders.', 'You stuck with your private customers. Less hassle, and no extra business either.')] },
  // 783 Housing-market effects on spending
  { id: 'e9_macro_housing', title: 'House prices wobble', icon: 'key', good: false, per: 1, cd: 20,
    story: 'House prices have started to fall. Homeowners feel poorer, even if they have not lost a penny, so they cut back on treats, home improvements and big purchases. When house prices rise, the opposite happens.', choices: [
      S('plans', 'Offer easy payment plans', 'Spreads the cost for nervous customers, with some risk of non-payment.', '', { k: 0.015, acct: 'marketing', gamble: { p: 0.6, good: { d: E(1.03, 6) }, bad: { d: E(0.99, 3), rep: -1 }, goodText: 'Spreading the cost brought in customers who would otherwise have waited.', badText: 'Some customers fell behind with payments and chasing them soured things.' } }),
      S('trim', 'Trim your range and costs', 'Saves money, but you sell a little less.', 'You cut the slow sellers and tightened costs. Sales dipped slightly, and so did your bills.', { eff: { c: E(0.99, 6), d: E(0.985, 6) } }),
      S('aim', 'Aim at renters and the cautious', 'A new audience, a new pitch, and a bit of effort.', 'A pitch aimed at people who do not own a home brought in some fresh customers.', { k: 0.01, acct: 'marketing', eff: { d: E(1.01, 6) } })] },
  // 785 Stock-market crash effects on valuations
  { id: 'e9_macro_crash', title: 'The stock market crashes', icon: 'chart', good: false, per: 1, cd: 30, gate: 'listed',
    story: 'Share prices across the whole market have tumbled by a fifth in a few days. Yours have fallen with everyone else\'s, although your business itself has not changed. Investors are jumpy and staff who own shares are looking worried.', choices: [
      S('calm', 'Write a calm letter to shareholders', 'Cheap, honest and often enough.', 'A steady, honest letter helped. The share price did not bounce back overnight, but the panic eased.', { k: 0.005, acct: 'otherCosts', eff: { rep: 1 } }),
      S('buyback', 'Announce a share buy-back', 'Spends real cash to show confidence in your own company.', 'You bought some of your own shares cheaply. It signalled confidence, though the cash is gone.', { k: 0.08, acct: 'dealCosts', eff: { rep: 2, brand: 1.01 } }),
      S('cut', 'Cut costs to protect profits', 'Steadies the numbers, but the team feels the pinch.', 'Costs fell and profits held up, but the team felt the squeeze.', { eff: { c: E(0.985, 6), morale: -3 } })] },
  // 786 Trade-war tariffs
  { id: 'e9_macro_tariffs', title: 'A trade war breaks out', icon: 'globe', good: false, per: 1.2, cd: 20, gate: 'stock',
    story: 'Two big countries have started taxing each other\'s imports. A tariff is a tax on goods crossing a border, and it makes imported parts and products dearer. Some of what you buy is suddenly costing more.', choices: [
      S('absorb', 'Absorb the tax', 'Customers notice nothing, your margin shrinks.', 'You swallowed the extra cost to keep customers happy. Your margin took the hit.', { eff: { c: E(1.03, 8) } }),
      S('pass', 'Pass it on in your prices', 'Protects the margin, loses a few customers.', 'You raised prices to cover the tax. Some customers shopped elsewhere.', { eff: { d: E(0.98, 6), c: E(1.01, 6) } }),
      S('source', 'Find suppliers in tariff-free countries', 'Costs effort now, might pay off for years.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.65, good: { c: E(0.98, 10) }, bad: { c: E(1.04, 4) }, goodText: 'The new suppliers turned out cheaper than the old ones, even before the tax.', badText: 'The new suppliers needed a lot of checking and cost extra at first.' } })] },
  // 787 Energy-price shocks
  { id: 'e9_macro_energycrisis', title: 'A national energy crisis', icon: 'bolt', good: false, per: 1, cd: 30,
    story: 'Gas and electricity prices have rocketed across the country because of a shortage of supply. The government is offering a support scheme for firms, but you have to apply and prove that your bills have jumped.', choices: [
      S('apply', 'Apply for the support scheme', 'Cheap to try, and it may not pay out.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.7, good: { c: E(1.01, 6) }, bad: { c: E(1.04, 6) }, goodText: 'The scheme covered most of the rise and your bills barely moved.', badText: 'Your application missed a deadline and the full rise hit you.' } }),
      S('shorter', 'Shorten your opening hours', 'Uses less power, sells a little less.', 'You closed the quiet hours. You used less power and sold slightly less.', { eff: { d: E(0.98, 6), c: E(1.01, 6) } }),
      S('efficiency', 'Invest in energy saving', 'Costs now, keeps the rise small for a year.', 'Better lighting, smarter heating and lids on the fridges kept the rise to a trickle.', { k: 0.05, acct: 'otherCosts', eff: { c: E(1.005, 12) } })] },
  // 788 Labour-market shortages by trade
  { id: 'e9_macro_skillsgap', title: 'Skilled people are scarce', icon: 'gear', good: false, per: 1.3, cd: 16, gate: 'team',
    story: 'Every firm in your trade is short of skilled workers. The few experienced people on the market can name their price, and without enough of them, work is piling up.', choices: [
      S('poach', 'Pay a premium to poach people', 'Expensive, quick and effective.', 'The new hires settled in fast, though everyone else started asking about their own pay.', { k: 0.04, acct: 'wages', eff: { quality: 1, d: E(1.01, 6) } }),
      S('train', 'Train your own people', 'Slow and uncertain, but it builds loyalty.', '', { k: 0.02, acct: 'wages', gamble: { p: 0.65, good: { quality: 1.5, morale: 2 }, bad: { morale: -1 }, goodText: 'Your trainees came on well and the team felt invested in.', badText: 'Training took longer than hoped and slowed the rest of the team down.' } }),
      S('stretch', 'Stretch the team', 'Free, but long days wear people down.', 'You made do with fewer people. Long days wore everybody down and some orders slipped.', { eff: { morale: -3, d: E(0.985, 4) } })] },
  // 789 Central-bank decisions
  { id: 'e9_macro_cbank', title: 'The central bank moves rates', icon: 'key', good: false, per: 1.5, cd: 12,
    story: 'The central bank, which sets the main interest rate for the whole country, has just announced a surprise rise. Borrowing gets dearer for everyone and savers earn a little more. Shoppers with mortgages suddenly have less to spend.', choices: [
      S('fix', 'Fix your loans now', 'A small fee locks the old rate before the next rise.', 'You locked in a rate before the next rise. A small fee for a lot of calm.', { k: 0.01, acct: 'otherCosts' }),
      S('cut', 'Cut back on spending', 'Saves money, but your own customers may do the same.', 'You tightened your belt. Costs eased and sales cooled slightly.', { eff: { c: E(0.99, 6), d: E(0.99, 4) } }),
      S('nothing', 'Do nothing', 'The rise may fade, or it may bite.', '', { gamble: { p: 0.5, good: {}, bad: { c: E(1.02, 6) }, goodText: 'The rise barely touched you.', badText: 'Your variable-rate loans got dearer and the extra cost fed through.' } })] },
  // 790 Banking-crisis credit crunch
  { id: 'e9_macro_creditcrunch', title: 'Banks stop lending', icon: 'shield', good: false, per: 0.8, cd: 40,
    story: 'A crisis in the banking world has made lenders nervous. They are refusing new loans and trimming credit lines, even for healthy firms. This is called a credit crunch, and it can make a good business run short of cash.', choices: [
      S('draw', 'Draw on all your credit now', 'Cash in hand while the door is open, but you pay interest on it.', 'You borrowed while the door was still open and paid interest on money you did not yet need.', { k: 0.02, acct: 'otherCosts', eff: { rep: 1 } }),
      S('squeeze', 'Cut spending hard', 'Free, but it hurts the team and your sales.', 'You cut every cost you could. The business got leaner, and a lot less fun.', { eff: { c: E(0.98, 6), d: E(0.985, 4), morale: -3 } }),
      S('other', 'Hunt for other lenders', 'Takes time, and might not work.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.55, good: { rep: 1, morale: 1 }, bad: { morale: -2 }, goodText: 'A friendly local lender stepped in and the team breathed again.', badText: 'Nobody would lend, and weeks of searching were wasted.' } })] },
  // 791 Immigration-rule changes
  { id: 'e9_macro_visarules', title: 'Rules for hiring from abroad change', icon: 'globe', good: false, per: 1, cd: 24, gate: 'team',
    story: 'The government has changed the rules for hiring workers from other countries: new forms, new fees and a higher minimum pay level. Some of your team, and some of the people you hoped to hire, are affected.', choices: [
      S('sponsor', 'Pay to sponsor your people', 'Costs fees, and people remember it.', 'Paying the fees showed your team that you value them. Several decided to stay for the long term.', { k: 0.03, acct: 'wages', eff: { morale: 3 } }),
      S('local', 'Recruit and train closer to home', 'Slower and costlier at first.', 'Local recruiting took longer than hoped, but the new people settled in well.', { k: 0.02, acct: 'wages', eff: { quality: 0.5 } }),
      S('outsource', 'Outsource part of the work', 'Fills the gap, but quality is harder to control.', 'Outsourcing covered the gap, though quality wobbled and the bills crept up.', { eff: { c: E(1.015, 6), quality: -1 } })] },
  // 792 Minimum-wage rises
  { id: 'e9_macro_minwage', title: 'The minimum wage goes up', icon: 'chart', good: false, per: 1.3, cd: 16, gate: 'team',
    story: 'The legal minimum hourly pay will rise next month. Your lowest-paid people get a raise, and to keep things fair you may feel pressure to lift everyone\'s pay a little too.', choices: [
      S('absorb', 'Absorb the cost', 'Your margin shrinks, your people are pleased.', 'You paid the extra and kept prices where they were. Staff noticed and appreciated it.', { eff: { c: E(1.015, 8), morale: 1 } }),
      S('price', 'Raise prices a little', 'Protects your margin, loses a few customers.', 'A small price rise covered the extra wages. A few customers noticed.', { eff: { d: E(0.985, 6) } }),
      S('machine', 'Invest in labour-saving kit', 'Costs now, cuts the wage bill later, and some people worry.', 'New equipment took care of the dull jobs and cut hours, though some people worried about their roles.', { k: 0.05, acct: 'otherCosts', eff: { c: E(0.99, 12), morale: -1 } })] },
  // 794 Pandemic-style demand shocks
  { id: 'e9_macro_illness', title: 'A fast-spreading illness changes everything', icon: 'shield', good: false, per: 0.7, cd: 40,
    story: 'A new illness is spreading quickly. People stay home, avoid crowds and order online. Some businesses lose almost every customer overnight while others are swamped, and nobody knows how long it will last.', choices: [
      S('pivot', 'Pivot to delivery and online', 'Costs money to set up, and may arrive too late.', '', { k: 0.06, acct: 'otherCosts', gamble: { p: 0.7, good: { d: E(1.04, 8), brand: 1.01 }, bad: { d: E(0.97, 4) }, goodText: 'Customers loved the new way to buy and many kept using it.', badText: 'Setting up took too long and the moment passed.' } }),
      S('hunker', 'Cut costs and wait it out', 'Survival mode: lean, quiet and gloomy.', 'You shrank to survive. Costs fell, but so did sales and spirits.', { eff: { d: E(0.95, 6), c: E(0.97, 6), morale: -2 } }),
      S('care', 'Invest in safety and staff care', 'Visible care builds trust, even while sales dip.', 'Visible care for staff and customers built lasting trust, even while sales dipped.', { k: 0.03, acct: 'wages', eff: { morale: 3, rep: 1, d: E(0.98, 4) } })] },
  // 795 Supply-chain bottlenecks across the economy
  { id: 'e9_macro_ports', title: 'The world\'s ports clog up', icon: 'parcel', good: false, per: 1.3, cd: 18, gate: 'stock',
    story: 'Ships are stuck outside ports and lorries are queuing for miles. Goods and parts that normally take days now take weeks, and every business that relies on deliveries feels it at once. These hold-ups are called supply-chain bottlenecks.', choices: [
      S('air', 'Pay for air freight', 'Expensive, but your shelves stay full.', 'Air freight cost a fortune, but your shelves stayed full while rivals ran short.', { k: 0.04, acct: 'otherCosts' }),
      S('wait', 'Wait for the queue to clear', 'Free, but gaps on the shelves cost sales.', 'You waited it out. Gaps on the shelves meant lost sales for a few weeks.', { eff: { d: E(0.97, 3) } }),
      S('near', 'Switch to nearby suppliers', 'A bit dearer, but deliveries turn up on time.', 'Nearer suppliers cost more, but delivered on time and the quality was good.', { eff: { c: E(1.02, 6), quality: 0.5 } })] },
  // 796 Boom-time hiring wars
  { id: 'e9_macro_poaching', title: 'Everyone is hiring', icon: 'star', good: false, per: 1.2, cd: 14, gate: 'team',
    story: 'The economy is booming and employers are fighting over staff with signing bonuses and fancy perks. Recruiters are ringing your best people every week. A hiring war is great for workers and painful for bosses.', choices: [
      S('bonus', 'Pay retention bonuses', 'Expensive, and it works.', 'Your best people stayed, a little richer and a lot more loyal.', { k: 0.04, acct: 'wages', eff: { morale: 3 } }),
      S('culture', 'Sell your culture and the chance to grow', 'Cheap, but only works if people believe it.', '', { gamble: { p: 0.6, good: { morale: 3, rep: 1 }, bad: { morale: -3 }, goodText: 'Many people valued the chance to grow here more than a bigger pay packet.', badText: 'Words were not enough. A few left and others grumbled.' } }),
      S('let', 'Let them go and hire later', 'Saves money now, loses know-how.', 'You lost some know-how and the team felt uneasy about who might be next.', { eff: { quality: -1, morale: -2 } })] },
  // 798 Technology-bubble sentiment
  { id: 'e9_macro_hype', title: 'A tech bubble inflates', icon: 'laptop', good: true, per: 1, cd: 30,
    story: 'Investors are going wild for anything labelled tech or AI. Prices of tech shares have shot up far beyond what the firms actually earn. This kind of excitement is called a bubble, and bubbles tend to pop.', choices: [
      S('ride', 'Give your brand a flashy tech angle', 'Could be a hit, could be embarrassing.', '', { k: 0.03, acct: 'marketing', gamble: { p: 0.55, good: { brand: 1.04, d: E(1.03, 4) }, bad: { rep: -2, brand: 0.98 }, goodText: 'The hype carried you and customers were curious.', badText: 'The bubble popped and you looked a bit silly.' } }),
      S('pilot', 'Run a small tech pilot', 'A modest bet that costs little.', 'A small pilot got a little attention and risked nothing much.', { k: 0.01, acct: 'marketing', eff: { brand: 1.01 } }),
      S('sober', 'Stay sensible and boring', 'Free, and customers notice you are solid.', 'You ignored the fashion. When the bubble popped, customers noted that you were still standing.', { eff: { rep: 1 } })] },
  // 799 Natural-disaster regional shocks
  { id: 'e9_macro_flood', title: 'Floods hit your region', icon: 'mountain', good: false, per: 1, cd: 30,
    story: 'Heavy storms have flooded roads and buildings across your region. Some customers and suppliers are cut off, and nearby premises are under water. A disaster like this hits one place hard while the rest of the country carries on.', choices: [
      S('rebuild', 'Rush repairs and reopen early', 'Expensive, but customers notice you are back.', 'You reopened ahead of schedule and customers remembered who was first back on their feet.', { k: 0.06, acct: 'otherCosts', eff: { rep: 1 } }),
      S('help', 'Open your doors to help the town', 'Costs a little and sales dip, but the town remembers.', 'You gave help and shelter, and the whole town remembered it for years.', { k: 0.02, acct: 'otherCosts', eff: { rep: 3, d: E(0.98, 3) } }),
      S('pause', 'Close until it clears', 'Costs nothing, loses weeks of sales.', 'You shut up shop and spent nothing, but lost a few weeks of sales.', { eff: { d: E(0.93, 3) } })] },
  // 800 Election-year uncertainty
  { id: 'e9_macro_election', title: 'Election-year jitters', icon: 'star', good: false, per: 1, cd: 36,
    story: 'There is a general election this year. Nobody knows who will win or what they will change, so many customers and firms put off big spending until after the vote. Business people call this uncertainty, and it makes planning hard.', choices: [
      S('delay', 'Postpone big decisions until after the vote', 'Free, but a quiet few months.', 'You kept your powder dry and waited. It was a quiet few months, and then things moved again.', { eff: { d: E(0.99, 6) } }),
      S('plan', 'Plan for both outcomes', 'Costs a little, saves a panic.', 'Two plans on the shelf meant no panic, whoever won.', { k: 0.01, acct: 'otherCosts', eff: { rep: 1 } }),
      S('push', 'Push on regardless', 'Rivals may freeze while you move, or new rules may catch you out.', '', { gamble: { p: 0.55, good: { d: E(1.03, 6) }, bad: { d: E(0.97, 4) }, goodText: 'Rivals froze and you picked up their customers.', badText: 'The new rules landed on you unprepared.' } })] },
];

export const projects: InitiativeDef[] = [
  // 779 Recession indicators and early warnings
  { id: 'macro_recession', name: 'Recession-proofing review', blurb: 'A recession is a long dip when the whole economy shrinks. Build a dashboard of early-warning signs, such as jobs, confidence and orders, and a plan for each one.', k: 0.5, months: 6, success: 75,
    win: { eff: { c: 0.995, od: 1.08 }, monthly: 0.1, text: 'The review gave you a dashboard of warning signs and a plan for each. You spot trouble sooner, waste less, and your bank noticed.' },
    lose: { now: { morale: -1 }, text: 'The review was all charts and no action. The team shrugged and the dashboard gathered dust.' } },
  // 797 Demographic shifts over decades
  { id: 'macro_demographics', name: 'Plan for the changing population', blurb: 'Populations change slowly: more older people, fewer young ones, new neighbourhoods. A year of research and a gradual shift in what you sell could set you up for decades.', k: 0.8, months: 12, success: 65,
    win: { eff: { d: 1.03, ch: 0.99 }, now: { brand: 1.01 }, text: 'Your research spotted where your future customers live and what they want. The shift in your range hit the mark.' },
    lose: { now: { d: E(0.99, 6) }, text: 'You aimed at a group that never quite turned up, and some of your old customers felt ignored.' } },
];
