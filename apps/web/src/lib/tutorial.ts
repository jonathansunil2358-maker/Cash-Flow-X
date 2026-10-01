import { DIFFICULTIES, formatGBP, INDUSTRIES, prestigeThreshold, UPGRADES, type GameState, type IndustryId } from '@cfx/engine';
import { startingMarketing } from './coach';

/** Where a tutorial step points: matches a `data-tour` attribute in the game screen. */
export type TourTarget = 'scene' | 'clock' | 'cash' | 'stats' | 'dock-team' | 'dock-upgrades' | 'dock-finance' | 'dock-missions' | 'dock-books';

export interface TourStep {
  target?: TourTarget;
  title: string;
  body: string;
  /** A sector-specific pointer, shown as a highlighted tip under the body. */
  tip?: string;
  facts?: { label: string; value: string }[];
}

interface SectorGuide {
  welcome: string;
  /** What the headquarters on the island is. */
  place: string;
  cash: string;
  team: string;
  /** A good first upgrade, and why. */
  upgrade: { id: string; why: string };
  finance: string;
  watch: string;
  /** How customers pay, for the welcome card. */
  paid: string;
}

const GUIDES: Record<IndustryId, SectorGuide> = {
  software: {
    welcome: 'You sell a subscription app to small businesses. There is no stock to buy and gross margin is about 88%, but developers are expensive and customers leave if the product falls behind.',
    place: 'glass office tower',
    cash: '30% of customers pay for a year up front. That cash lands now, but it is deferred revenue: a liability you earn month by month. Cash in the bank is not the same as profit.',
    team: 'Customer success staff look after more customers, Developers keep the product ahead of rivals like Stackly, and Sales reps multiply the reach of your marketing.',
    upgrade: { id: 'crm', why: 'Each level lets 12% more of the market hear about you, and it unlocks the Customer success platform, which cuts churn.' },
    finance: 'SaaS rarely needs heavy debt: customers prepay and there is no stock. If you raise equity, do it when your valuation is high so you give away less.',
    watch: 'Watch customers and churn: recurring revenue compounds when you keep more than you lose.',
    paid: 'Monthly, 30% yearly',
  },
  clothing: {
    welcome: 'You design and sell clothing, partly to wholesale accounts. You must buy stock before you can sell it, and unsold stock slowly loses value.',
    place: 'boutique',
    cash: 'Wholesale customers take 45 days to pay, but your suppliers want paying sooner. You can be profitable on paper and still run out of cash: working capital is the whole game.',
    team: 'Warehouse & production staff raise output, Designers improve the collection, and Wholesale reps open more accounts.',
    upgrade: { id: 'webshop', why: 'Selling online grows your market by 10% a level, and it unlocks the Warehouse system, which cuts stock write-offs.' },
    finance: 'Stock needs funding. Your overdraft limit grows with receivables and inventory, and a term loan can carry you through a big season.',
    watch: 'Keep an eye on stock cover in Team › Inventory policy: too little loses sales, too much ties up cash.',
    paid: 'Wholesale on 45 days',
  },
  restaurant: {
    welcome: 'You run a restaurant. Guests pay on the spot, but rent is heavy, it takes a lot of staff and food spoils fast. Your £35k kitchen fit-out is already built.',
    place: 'restaurant',
    cash: 'Cash comes in straight away, which helps. But most costs are fixed, so a few covers more or less swings profit hard. That is operating leverage.',
    team: 'Kitchen & floor staff set how many covers you can serve, Chefs raise food quality, and Events & partnerships fill the tables.',
    upgrade: { id: 'kitchen', why: 'More covers from the same rent: operating leverage working for you. It also unlocks the Walk-in fridge, which cuts food waste.' },
    finance: 'The kitchen fit-out is depreciated over 7 years, so it reaches profit slowly even though the cash has already gone.',
    watch: 'Keep stock cover low (it is perishable) and fill every table you can.',
    paid: 'On the spot',
  },
  fitness: {
    welcome: 'You run a gym. Members pay by direct debit and 20% prepay for the year. The premises and £40k of equipment are big fixed costs, so you need members fast.',
    place: 'gym',
    cash: 'Direct debits arrive every month like clockwork. Annual memberships are cash now but deferred revenue on the balance sheet, earned over 12 months.',
    team: 'Each trainer can look after about 160 members. Class programme leads improve the experience, and Membership advisors bring more people through the door.',
    upgrade: { id: 'app', why: '4% of members cancel every month. It cuts churn by 8% a level.' },
    finance: 'Big kit can be leased instead of bought (IFRS 16). It goes on the balance sheet as a right-of-use asset with a matching lease liability.',
    watch: 'Watch members against capacity: a full gym with low churn is a cash machine.',
    paid: 'Direct debit, 20% yearly',
  },
  ecommerce: {
    welcome: 'You sell products online. Gross margin is only about 40% and winning customers is expensive, so every percent counts.',
    place: 'fulfilment warehouse',
    cash: 'Card payments settle in 3 days and suppliers give you 30. Sell stock quickly and it pays for itself before the invoice is due: a negative cash conversion cycle.',
    team: 'Fulfilment staff pack more orders, Product & UX improves the site, and Growth marketers stretch your ad spend further.',
    upgrade: { id: 'robots', why: 'Each fulfilment worker packs 20% more orders a level, spreading your fixed costs, and it unlocks the Freight contract, which cuts unit costs.' },
    finance: 'Brand decays 10% a month when you stop spending, so budget for marketing like rent: it never really stops.',
    watch: 'Watch gross margin and how much marketing it takes to win each order.',
    paid: 'Card, settles in 3 days',
  },
  automotive: {
    welcome: 'You convert classic cars to electric. Each one needs about £12k of parts held in stock for two months. Your £25k of workshop tooling is already installed.',
    place: 'workshop',
    cash: 'Dealers pay in 30 days and suppliers give you 60, but parts sit in stock for months. Each car ties up a lot of cash before it earns a penny.',
    team: 'You can build less than one car a month yourself. Technicians build more, Engineers improve conversion quality, and Dealer account managers find buyers.',
    upgrade: { id: 'battery', why: 'Parts are your biggest cost. It cuts them by 4% a level.' },
    finance: 'This is capital-hungry: you will almost certainly need a bank loan. Covenants are tested every quarter, and two breaches in a row mean the loan is recalled.',
    watch: 'Watch cash against your overdraft limit: going past it means insolvency.',
    paid: 'Dealers on 30 days',
  },
};

/** Compact money without a trailing .0 ("£10m", not "£10.0m"). */
const money = (p: number) => formatGBP(p, { compact: true }).replace(/\.0(?=[km])/, '');

/** The first-run walkthrough, written for the player's sector and difficulty. */
export function tourSteps(game: GameState, prestigeCount: number): TourStep[] {
  const ind = INDUSTRIES[game.industryId];
  const g = GUIDES[game.industryId];
  const diff = DIFFICULTIES[game.difficulty];
  const upgrade = UPGRADES[game.industryId].find((u) => u.id === g.upgrade.id && !u.requires);
  const sub = ind.model === 'subscription';
  const good = Math.round(diff.positiveShare * 100);
  return [
    {
      title: `Welcome to ${game.companyName}!`,
      body: `${g.welcome} Here is a quick tour of how to run it.`,
      facts: [
        { label: sub ? 'Price' : `Per ${ind.unitSingular}`, value: `${formatGBP(ind.basePrice, { compact: ind.basePrice >= 1_000_000 })}${sub ? '/mo' : ''}` },
        { label: 'Paid', value: g.paid },
        { label: 'Starting cash', value: money(game.ledger.balances.cash) },
      ],
    },
    {
      target: 'scene',
      title: `Your ${g.place}`,
      body: `This island is your business. Every upgrade you buy appears as a new building, and your staff and customers walk around as you grow.`,
    },
    {
      target: 'clock',
      title: 'Time flies',
      body: 'A month passes about every 10 seconds. Tap II to pause. x2 unlocks at founder level 2 and x4 at level 5. Time also stops while a panel is open; you can turn that off in Settings.',
    },
    { target: 'cash', title: 'Cash is king', body: g.cash, tip: 'Run out of cash beyond your overdraft and the company is insolvent.' },
    {
      target: 'stats',
      title: 'Your scoreboard',
      body: `Revenue, profit and ${sub ? `${ind.unitPlural} signed up` : `${ind.unitPlural} sold`} last month. It fills in after your first month.`,
      tip: g.watch,
    },
    {
      target: 'dock-team',
      title: 'Run the business',
      body: `Business is where you hire and set your price, marketing, ${sub ? '' : 'stock and '}credit terms. ${g.team}`,
      tip: sub
        ? `On your own you can serve about ${ind.founderCapacity} ${ind.unitPlural}. Hire before you hit the cap, or new sign-ups are turned away.`
        : `We've started you on ${money(startingMarketing(ind))} a month of marketing. Watch the adviser under your scoreboard for what to change next.`,
    },
    {
      target: 'dock-upgrades',
      title: 'Upgrades',
      body: 'Upgrades are capex: the cash goes now, but the cost reaches profit slowly through depreciation over 5 years.',
      tip: upgrade ? `A good first pick: ${upgrade.name}. ${g.upgrade.why}` : undefined,
    },
    { target: 'dock-finance', title: 'Funding', body: 'Borrow, raise equity, pay dividends or invest spare cash. Every source of money has a cost.', tip: g.finance },
    {
      target: 'dock-missions',
      title: 'Missions & gems',
      body: 'Missions and daily rewards give XP and gems. Levelling up unlocks faster speeds and new features, and gems buy boosts.',
    },
    {
      target: 'dock-books',
      title: 'The Books',
      body: 'Behind the fun is a full set of double-entry books: P&L, balance sheet, cash flow, ratios, forecasts and a valuation of your company.',
    },
    {
      title: diff.canPrestige ? 'Events & your goal' : 'Events & survival',
      body: `On ${diff.name}, ${good}% of events are good news. Small ones pop up as messages; big ones pause the game and ask you to choose.`,
      tip: diff.canPrestige
        ? `Grow your stake to ${money(prestigeThreshold(prestigeCount))} to prestige: you earn Legacy points for permanent perks and start a new company.`
        : 'Hard mode: one life and no prestige. Survive, grow, and climb the Hardcore leaderboard.',
    },
  ];
}
