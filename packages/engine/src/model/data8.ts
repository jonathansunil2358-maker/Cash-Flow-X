/**
 * Version 9 data: business policies (dials with a few options each) and a catalogue of business events.
 * Pure data, no engine imports, so the event builder in events.ts and the policy engine in play8.ts can both use it.
 */
export type PolicyGroup = 'ops' | 'people' | 'customers' | 'finance';
export interface PolEff {
  /** Demand, unit-cost, capacity and churn multipliers. */
  d?: number; c?: number; cap?: number; ch?: number;
  /** Per month: quality points, morale points, reputation points, brand multiplier. */
  q?: number; m?: number; rep?: number; br?: number;
  /** Recruitment-fee and overdraft-limit multipliers. */
  hire?: number; od?: number;
  /** Risk each month: [chance %, cost as a % of monthly sales, what happened]. */
  risk?: [number, number, string];
}
export interface PolOption { name: string; blurb: string; eff: PolEff; /** One-off cost in months of sales. */ setup?: number; /** Running cost as % of monthly sales (negative = savings). */ monthly?: number }
export interface PolicyDef { id: string; group: PolicyGroup; /** Only for this industry (set automatically for sector topics). */ sector?: string; /** Management topic (see data9/index.ts); policies without one belong to the four basic panels. */ topic?: string; name: string; blurb: string; stock?: boolean; options: PolOption[] }

const off: PolOption = { name: 'Off', blurb: 'Do nothing special.', eff: {} };
const opt = (name: string, blurb: string, eff: PolEff, monthly = 0, setup = 0): PolOption => ({ name, blurb, eff, monthly, setup });

export const POLICIES: PolicyDef[] = [
  // ---- Operations -------------------------------------------------------------------------------
  { id: 'energy', group: 'ops', name: 'Energy tariff', blurb: 'How you buy power.', options: [
    off, opt('Fixed price', 'A steady bill with a small premium.', {}, 0.4), opt('Variable price', 'Cheaper on average, but prices can spike.', { risk: [8, 1.5, 'Energy prices spiked this month.'] }, 0.15)] },
  { id: 'solar', group: 'ops', name: 'Rooftop solar', blurb: 'Pay now, save every month.', options: [off, opt('Install panels', 'A big one-off cost, then savings on power.', { rep: 0.02 }, -0.6, 2)] },
  { id: 'recycling', group: 'ops', name: 'Scrap recycling loop', blurb: 'Sell your waste on.', options: [off, opt('Sort and sell scrap', 'Small steady income from scrap.', {}, -0.2, 0.5)] },
  { id: 'fleet', group: 'ops', name: 'Van fleet', blurb: 'Branded vans on the road.', options: [
    off, opt('Two branded vans', 'Visible and reliable deliveries.', { d: 1.005 }, 0.3, 0.6), opt('A full fleet', 'Everywhere you look.', { d: 1.015, rep: 0.02 }, 1, 1.5)] },
  { id: 'lockers', group: 'ops', name: 'Click-and-collect lockers', blurb: 'Pick-up points for customers.', options: [off, opt('Install lockers', 'Convenient for customers.', { d: 1.01 }, 0.15, 0.6)] },
  { id: 'subbox', group: 'ops', name: 'Subscription box', blurb: 'A regular box of your goods.', stock: true, options: [off, opt('Launch the box', 'Customers stay longer and spend a little more.', { ch: 0.97, d: 1.01 }, 0.4, 0.5)] },
  { id: 'peak', group: 'ops', name: 'Seasonal pricing', blurb: 'Charge more when it is busy.', options: [off, opt('Peak premium', 'More income in busy months but a few customers grumble.', { d: 0.99 }, -0.5)] },
  { id: 'tiers', group: 'ops', name: 'Product tiers', blurb: 'What range you sell.', options: [
    off, opt('Basic only', 'Cheaper to make, less to shout about.', { c: 0.99, d: 0.99 }), opt('Premium line', 'Costs more, builds quality.', { c: 1.02, d: 1.03, q: 0.03 }, 0.2, 0.4)] },
  { id: 'returns', group: 'ops', name: 'Returns policy', blurb: 'What you do with unhappy customers.', options: [
    off, opt('Strict', 'Saves money, annoys some customers.', { ch: 1.03, c: 0.995 }), opt('Generous', 'Customers love it and some take advantage.', { ch: 0.96, d: 1.005 }, 0.4)] },
  { id: 'warranty', group: 'ops', name: 'Warranty length', blurb: 'How long you stand behind a sale.', options: [
    off, opt('One year', 'Trust, with a few claims.', { d: 1.01, risk: [6, 2, 'A batch of warranty claims came in.'] }), opt('Three years', 'Strong trust, bigger claims.', { d: 1.02, risk: [10, 4, 'A wave of warranty claims came in.'] })] },
  { id: 'stockpol', group: 'ops', name: 'Stock policy', blurb: 'Lean or safe.', stock: true, options: [
    off, opt('Just in time', 'Lower costs, but now and then you run out.', { c: 0.99, risk: [6, 3, 'A stock-out cost you sales.'] }), opt('Safety stock', 'A buffer costs money to hold.', { c: 1.005 }, 0.2)] },
  { id: 'dual', group: 'ops', name: 'Supplier sourcing', blurb: 'One supplier or two.', options: [
    off, opt('Single supplier', 'Cheapest, but if they slip you pay.', { c: 0.99, risk: [4, 5, 'Your only supplier let you down.'] }), opt('Two suppliers', 'A little dearer, no single point of failure.', { c: 1 }, 0.15)] },
  { id: 'night', group: 'ops', name: 'Night shift', blurb: 'More hours, more tired people.', options: [off, opt('Run a night shift', 'More output for a wage premium.', { cap: 1.05, m: -0.2 }, 0.8)] },
  { id: 'fourday', group: 'ops', name: 'Four-day week', blurb: 'An experiment in working less.', options: [off, opt('Try it', 'Happier people, slightly less output.', { cap: 0.97, m: 0.4, q: 0.02 })] },
  { id: 'kaizen', group: 'ops', name: 'Kaizen events', blurb: 'Small improvements, every month.', options: [off, opt('Monthly improvement day', 'Costs fall a little.', { c: 0.995, q: 0.01 }, 0.15)] },
  { id: 'packaging', group: 'ops', name: 'Packaging', blurb: 'How your goods arrive.', options: [
    off, opt('Cheap', 'Saves money, looks it.', { c: 0.99, d: 0.99 }), opt('Eco', 'Costs more and customers like it.', { c: 1.01, d: 1.02, rep: 0.03 }), opt('Premium', 'A real unboxing moment.', { c: 1.02, d: 1.03, br: 1.001 })] },
  { id: 'community', group: 'ops', name: 'Community hours', blurb: 'Open your premises to the neighbourhood.', options: [off, opt('Weekly open hours', 'Good will costs very little.', { rep: 0.05 }, 0.1)] },
  // ---- People -----------------------------------------------------------------------------------
  { id: 'socialclub', group: 'people', name: 'Social club', blurb: 'A budget for team events.', options: [off, opt('Fund a club', 'A happier team.', { m: 0.3 }, 0.2)] },
  { id: 'parental', group: 'people', name: 'Parental leave', blurb: 'How generous you are to new parents.', options: [off, opt('Generous leave', 'People stay and tell their friends.', { m: 0.2, rep: 0.02 }, 0.2)] },
  { id: 'safety', group: 'people', name: 'Safety programme', blurb: 'Fewer accidents.', options: [
    opt('Minimum', 'Legal minimum, with the odd accident.', { risk: [3, 5, 'A workplace accident cost you time and money.'] }), opt('Proper training', 'Fewer accidents.', { risk: [1.5, 5, 'A workplace accident cost you time and money.'] }, 0.1), opt('Safety culture', 'Almost none.', { risk: [0.5, 5, 'A workplace accident cost you time and money.'], m: 0.1 }, 0.25)] },
  { id: 'wellbeing', group: 'people', name: 'Wellbeing programme', blurb: 'A gym, a counsellor, quiet rooms.', options: [off, opt('Offer wellbeing support', 'Happier, steadier people.', { m: 0.5, ch: 0.99 }, 0.5)] },
  { id: 'referral', group: 'people', name: 'Referral bonuses', blurb: 'Staff find staff.', options: [off, opt('Pay referral bonuses', 'Cheaper hiring.', { hire: 0.85 }, 0.1)] },
  { id: 'hiremix', group: 'people', name: 'Hiring mix', blurb: 'Graduates or experience.', options: [
    off, opt('Hire graduates', 'Cheaper to recruit, slower to start.', { hire: 0.8, cap: 0.99 }), opt('Hire experienced people', 'Dearer to recruit and productive.', { hire: 1.15, cap: 1.02 })] },
  { id: 'union', group: 'people', name: 'Union relations', blurb: 'How you work with staff representatives.', options: [off, opt('Recognise a union', 'More trust, a little more cost.', { m: 0.3, c: 1.01 })] },
  { id: 'apprentice', group: 'people', name: 'Apprenticeships', blurb: 'Train your own.', options: [off, opt('Run a scheme', 'Cheaper hiring and growing skills.', { hire: 0.85, cap: 1.005 }, 0.2)] },
  { id: 'followsun', group: 'people', name: 'Follow-the-sun teams', blurb: 'Staff in other time zones.', options: [off, opt('Add overseas teams', 'Longer working day.', { cap: 1.03, m: -0.1 }, 0.6)] },
  { id: 'crosstrain', group: 'people', name: 'Cross-training', blurb: 'Everyone can cover for everyone.', options: [off, opt('Train across roles', 'More flexible capacity.', { cap: 1.015 }, 0.2)] },
  { id: 'interns', group: 'people', name: 'Intern programme', blurb: 'Summer interns who may stay.', options: [off, opt('Take on interns', 'Cheaper hiring and a little extra help.', { hire: 0.9, cap: 1.005 }, 0.15)] },
  { id: 'mentorpairs', group: 'people', name: 'Mentoring pairs', blurb: 'Senior and junior staff paired up.', options: [off, opt('Pair people up', 'Skills pass on.', { m: 0.2, q: 0.01 })] },
  { id: 'valuesculture', group: 'people', name: 'Company values', blurb: 'What you stand for.', options: [
    off, opt('Customers first', 'Reputation grows, margin shrinks a bit.', { rep: 0.05, c: 1.005 }), opt('Team first', 'People are happy and loyal.', { m: 0.3 }), opt('Results first', 'Output up, mood down.', { cap: 1.02, m: -0.2 })] },
  { id: 'esop', group: 'people', name: 'Employee share pool', blurb: 'Staff own a slice of the success.', options: [off, opt('Offer shares to staff', 'People feel like owners.', { m: 0.4, ch: 0.99 }, 0.3)] },
  { id: 'pension', group: 'people', name: 'Pension scheme', blurb: 'What you put in for retirement.', options: [
    off, opt('Basic', 'The legal minimum.', { m: 0.1 }, 0.3), opt('Generous', 'People notice.', { m: 0.3, ch: 0.99 }, 0.8)] },
  // ---- Customers --------------------------------------------------------------------------------
  { id: 'giftcards', group: 'customers', name: 'Gift cards', blurb: 'Sell cards for later.', options: [off, opt('Sell gift cards', 'More sales around gifts, some never get used.', { d: 1.01 }, -0.1)] },
  { id: 'referralc', group: 'customers', name: 'Customer referrals', blurb: 'Reward customers who bring friends.', options: [off, opt('Referral codes', 'Friends bring friends.', { d: 1.015 }, 0.3)] },
  { id: 'reply', group: 'customers', name: 'Reply style', blurb: 'How you answer reviews.', options: [
    off, opt('Humble', 'Warm and apologetic.', { rep: 0.04 }), opt('Witty', 'Memorable, occasionally risky.', { br: 1.001, risk: [3, 1, 'A joke landed badly online.'] }), opt('Formal', 'Safe and bland.', { rep: 0.01 })] },
  { id: 'voice', group: 'customers', name: 'Brand voice', blurb: 'How your brand sounds.', options: [
    off, opt('Friendly', 'Chatty and warm.', { d: 1.005, ch: 0.99 }), opt('Premium', 'Calm and high-end.', { d: 1.01, c: 1.005 }), opt('Playful', 'Fun and loud.', { br: 1.002, rep: -0.01 })] },
  { id: 'sponsor', group: 'customers', name: 'Local team sponsorship', blurb: 'Your name on a shirt.', options: [off, opt('Sponsor a team', 'Visible and loved.', { d: 1.01, rep: 0.03 }, 0.5)] },
  { id: 'charityline', group: 'customers', name: 'Charity product line', blurb: 'Some of the price goes to a cause.', options: [off, opt('Launch a charity line', 'People feel good buying.', { rep: 0.08, d: 1.005 }, 0.2)] },
  { id: 'stampcards', group: 'customers', name: 'Stamp cards', blurb: 'Buy nine, get one free.', options: [off, opt('Hand out stamp cards', 'Regulars come back.', { ch: 0.97 }, 0.2)] },
  { id: 'anchor', group: 'customers', name: 'Price display', blurb: 'How prices are shown.', options: [off, opt('Anchor with a high-end option', 'The middle option looks like a bargain.', { d: 1.005 })] },
  { id: 'samples', group: 'customers', name: 'Free samples', blurb: 'Let people try it.', options: [off, opt('Give away samples', 'Trial turns into sales.', { d: 1.015 }, 0.5)] },
  { id: 'ambassadors', group: 'customers', name: 'Brand ambassadors', blurb: 'Fans who speak for you.', options: [off, opt('Sign ambassadors', 'A lift in demand.', { d: 1.02, br: 1.001 }, 0.6)] },
  { id: 'bundles', group: 'customers', name: 'Partner bundles', blurb: 'Packages with a friendly brand.', options: [off, opt('Offer bundles', 'More per order, a little more cost.', { d: 1.01, c: 1.003 })] },
  { id: 'adthemes', group: 'customers', name: 'Seasonal ad themes', blurb: 'Campaigns that follow the calendar.', options: [off, opt('Run seasonal campaigns', 'Timely and effective.', { d: 1.01 }, 0.3)] },
  { id: 'unboxing', group: 'customers', name: 'Unboxing experience', blurb: 'The first moment.', options: [off, opt('Upgrade the unboxing', 'People film it.', { br: 1.001, d: 1.005 }, 0.3)] },
  { id: 'complaints', group: 'customers', name: 'Complaints desk', blurb: 'Who picks up the phone.', options: [
    off, opt('Fast response team', 'Problems fixed quickly.', { rep: 0.04, ch: 0.99 }, 0.4)] },
  // ---- Finance ----------------------------------------------------------------------------------
  { id: 'earlypay', group: 'finance', name: 'Early-payment discounts', blurb: 'Pay suppliers early for a discount.', options: [off, opt('Take the discounts', 'Cheaper goods if you have the cash.', { c: 0.992 }, 0.15)] },
  { id: 'revolver', group: 'finance', name: 'Revolving credit line', blurb: 'A standby facility.', options: [off, opt('Arrange a facility', 'A bigger overdraft, with a commitment fee.', { od: 1.3 }, 0.1, 0.3)] },
  { id: 'rdcredit', group: 'finance', name: 'R&D tax credit', blurb: 'Claim relief on research.', options: [off, opt('File for relief', 'Some of your research spend comes back.', {}, -0.15, 0.2)] },
  { id: 'collections', group: 'finance', name: 'Collections service', blurb: 'Chase late payers.', options: [off, opt('Hire a collections agency', 'Fewer unpaid bills.', { risk: [0, 0, ''] }, 0.2)] },
];

export const policyById = (id: string): PolicyDef | undefined => POLICIES.find((p) => p.id === id);

// -------------------------------------------------------------------------------------------------
// Events
// -------------------------------------------------------------------------------------------------
export interface EvEff { d?: [number, number]; c?: [number, number]; morale?: number; rep?: number; brand?: number; quality?: number }
export interface EvGamble { p: number; good: EvEff; bad: EvEff; goodText: string; badText: string }
export interface EvChoice {
  id: string; label: string; hint: string;
  /** Cost as a share of a month's sales (with a floor of £800). */
  k?: number; acct?: 'otherCosts' | 'marketing' | 'wages' | 'dealCosts';
  /** Income instead of a cost, as a share of a month's sales. */
  income?: number;
  eff?: EvEff; gamble?: EvGamble; text: string;
}
export type EvGate = 'rivals' | 'stock' | 'team' | 'listed' | 'cash';
export interface EvSpec { id: string; topic?: string; sector?: string; title: string; icon: string; good: boolean; story: string; min?: number; per: number; cd: number; gate?: EvGate; choices: EvChoice[] }

const S = (id: string, label: string, hint: string, text: string, rest: Partial<EvChoice> = {}): EvChoice => ({ id, label, hint, text, ...rest });
const E = (d: number, m: number): [number, number] => [d, m];

export const EVENTS8: EvSpec[] = [
  { id: 'e8_election', title: 'A new mayor', icon: 'flag', good: false, per: 2, cd: 40, story: 'A new mayor has been elected, with plans that could change business rates, roads and licences for your whole sector.', choices: [
    S('lobby', 'Lobby the new council', 'Pay for a seat at the table.', 'Your voice was heard, and the rules were kinder.', { k: 0.03, eff: { rep: 1 } }),
    S('adapt', 'Adapt quietly', 'Free, but costs rise for six months.', 'You adjusted, and the new rules bit a little.', { eff: { c: E(1.02, 6) } }),
    S('donate', 'Support their campaign', 'A gamble: it helps if they remember you.', '', { k: 0.02, gamble: { p: 0.6, good: { d: E(1.02, 8) }, bad: { rep: -2 }, goodText: 'They remembered you with friendlier rules.', badText: 'It leaked, and some customers were unimpressed.' } })] },
  { id: 'e8_heist', title: 'Robbers target your office', icon: 'key', good: false, per: 2, cd: 30, story: 'Word is that thieves have been casing premises on your street, and yours looks like a tempting one.', choices: [
    S('guards', 'Hire security for a while', 'Costs money, deters thieves.', 'The guards stood in the doorway and nothing happened.', { k: 0.03, eff: { rep: 1 } }),
    S('insure', 'Rely on insurance', 'Free now. If it happens, you pay and claim.', '', { gamble: { p: 0.35, good: {}, bad: { morale: -3, rep: -1 }, goodText: 'Nothing happened.', badText: 'They got in. Insurance paid some, and the team was shaken.' } }),
    S('lock', 'Fit better locks', 'A cheap fix with a good record.', 'The new locks held.', { k: 0.01 })] },
  { id: 'e8_rumours', title: 'Gossip in the corridors', icon: 'chat', good: false, per: 3, cd: 18, gate: 'team', story: 'A rumour has spread that layoffs are coming. It is not true, but people are updating their CVs.', choices: [
    S('meet', 'Call an all-hands meeting', 'Be open and answer questions.', 'The honesty helped, and things settled.', { eff: { morale: 2 } }),
    S('memo', 'Send a reassuring memo', 'Cheap, and not everyone believes it.', '', { gamble: { p: 0.5, good: { morale: 1 }, bad: { morale: -3 }, goodText: 'The memo calmed things.', badText: 'People thought the memo proved the rumour.' } }),
    S('ignore', 'Ignore it', 'Rumours fade, or they do not.', '', { gamble: { p: 0.4, good: {}, bad: { morale: -5 }, goodText: 'It blew over.', badText: 'The rumour hardened into fact in people\'s minds.' } })] },
  { id: 'e8_film', title: 'A film crew asks to follow you', icon: 'camera', good: true, per: 2, cd: 40, story: 'A small production company wants to film a month in the life of your business for a series about local firms.', choices: [
    S('yes', 'Say yes and be yourself', 'Honest and entertaining.', '', { gamble: { p: 0.7, good: { brand: 1.04, d: E(1.02, 4) }, bad: { rep: -2 }, goodText: 'The episode was warm and viewers loved you.', badText: 'The edit made one awkward moment the headline.' } }),
    S('polish', 'Polish everything first', 'A cleaner picture, at a cost.', 'It looked great and slightly staged.', { k: 0.02, eff: { brand: 1.02 } }),
    S('no', 'Politely decline', 'Keep your focus.', 'You stayed out of the spotlight.')] },
  { id: 'e8_supplierstrike', title: 'Your supplier\'s staff walk out', icon: 'bolt', good: false, per: 2, cd: 24, gate: 'stock', story: 'A key supplier\'s workers are on strike. Deliveries are late, and nobody knows for how long.', choices: [
    S('wait', 'Wait it out', 'Free, but costs rise while supplies are short.', 'The strike ended after weeks, and the backlog took time to clear.', { eff: { c: E(1.04, 3) } }),
    S('mediate', 'Offer to help mediate', 'Costs money and builds goodwill.', 'You helped broker a deal, and the supplier remembered.', { k: 0.02, eff: { rep: 1, c: E(1.02, 2) } }),
    S('switch', 'Switch suppliers for now', 'A scramble that costs extra.', 'The new supplier cost more, but goods arrived.', { eff: { c: E(1.05, 2) } })] },
  { id: 'e8_friendship', title: 'A rival\'s founder reaches out', icon: 'handshake', good: true, per: 2, cd: 36, gate: 'rivals', story: 'The founder of a rival firm suggests lunch. "We have more in common than not," they say.', choices: [
    S('friend', 'Become friendly rivals', 'Share tips, compete fairly.', '', { gamble: { p: 0.7, good: { rep: 2, quality: 1 }, bad: { d: E(0.98, 3) }, goodText: 'You swapped ideas and both improved.', badText: 'They used your openness against you.' } }),
    S('polite', 'Keep it polite and distant', 'A safe middle path.', 'Pleasant, and nothing changed.'),
    S('decline', 'Decline', 'You are here to win.', 'You made it clear where you stand.', { eff: { brand: 1.005 } })] },
  { id: 'e8_memo', title: 'An internal memo escapes', icon: 'key', good: false, per: 2, cd: 24, story: 'A candid internal memo about costs has been leaked online. Some of it reads badly out of context.', choices: [
    S('own', 'Own it and explain', 'Honest and calm.', 'Most people respected how you handled it.', { eff: { rep: 1 } }),
    S('spin', 'Spin it', 'Hire PR help to reframe the story.', '', { k: 0.02, gamble: { p: 0.6, good: { rep: 1 }, bad: { rep: -3 }, goodText: 'The spin worked.', badText: 'The spin looked worse than the memo.' } }),
    S('silence', 'Say nothing', 'Hope it passes.', 'It passed, with a few bruises.', { eff: { rep: -1 } })] },
  { id: 'e8_retire', title: 'A long-serving colleague retires', icon: 'heart', good: true, per: 3, cd: 30, gate: 'team', min: 24, story: 'One of your longest-serving people is retiring after many years. The team wants to mark it.', choices: [
    S('party', 'Throw a proper party', 'A send-off to remember.', 'It was a lovely day, and everyone remembered why they work here.', { k: 0.015, acct: 'otherCosts', eff: { morale: 4 } }),
    S('card', 'A card and a cake', 'Modest and sincere.', 'Short, sweet and appreciated.', { eff: { morale: 1 } }),
    S('skip', 'Let it pass quietly', 'No fuss.', 'It went unmarked, and some felt it.', { eff: { morale: -2 } })] },
  { id: 'e8_treasure', title: 'Something odd in the basement', icon: 'gem', good: true, per: 1.5, cd: 60, story: 'Renovation work has turned up an old chest behind a wall. Inside is something that looks valuable.', choices: [
    S('sell', 'Sell it', 'A windfall.', 'An auction house paid well.', { income: 0.6 }),
    S('display', 'Put it on display', 'A talking point for customers.', 'People came to see it.', { eff: { brand: 1.03, d: E(1.01, 6) } }),
    S('museum', 'Give it to the local museum', 'Goodwill, no cash.', 'The town loved you for it.', { eff: { rep: 3 } })] },
  { id: 'e8_neighbour', title: 'A neighbour complains about noise', icon: 'chat', good: false, per: 3, cd: 20, story: 'The people next door say your business is too noisy and have threatened legal action.', choices: [
    S('settle', 'Settle and fit sound-proofing', 'Costs money, ends it.', 'The wall went up and the complaints stopped.', { k: 0.03 }),
    S('fight', 'Fight it', 'Half the time you win cleanly.', '', { k: 0.015, gamble: { p: 0.5, good: { rep: 1 }, bad: { rep: -2, morale: -1 }, goodText: 'The case was dropped.', badText: 'You lost, and paid costs.' } }),
    S('charm', 'Invite them round', 'Cheap and sometimes works.', '', { gamble: { p: 0.6, good: { rep: 1 }, bad: {}, goodText: 'Over coffee they softened.', badText: 'It did not change their minds.' } })] },
  { id: 'e8_midlife', title: 'The board asks for a reinvention', icon: 'crown', good: false, per: 1.5, cd: 60, min: 48, story: 'After years of steady trading, your advisers say the company risks looking tired. They suggest a bold refresh.', choices: [
    S('refresh', 'Invest in a full refresh', 'Costs a lot, lifts demand.', 'A new look and new energy.', { k: 0.1, acct: 'marketing', eff: { d: E(1.04, 8), brand: 1.03 } }),
    S('tweak', 'A modest tweak', 'Small cost, small gain.', 'A tidy-up, with a small lift.', { k: 0.03, acct: 'marketing', eff: { d: E(1.01, 4) } }),
    S('stay', 'Stay the course', 'Free.', 'You kept calm and carried on.')] },
  { id: 'e8_defector', title: 'A rival\'s star wants to join you', icon: 'star', good: true, per: 2, cd: 30, gate: 'rivals', story: 'A well-known person at a rival firm has quietly asked about joining you. They come with a reputation, and some baggage.', choices: [
    S('hire', 'Hire them', 'A lift, and maybe some drama.', '', { k: 0.03, acct: 'wages', gamble: { p: 0.65, good: { quality: 2, d: E(1.02, 6) }, bad: { morale: -3 }, goodText: 'They delivered at once.', badText: 'Their ego upset the team.' } }),
    S('pass', 'Pass politely', 'You keep the peace.', 'You wished them well.'),
    S('tip', 'Tell the rival', 'Integrity, with a thank-you.', 'The rival was grateful, and word spread.', { eff: { rep: 2 } })] },
  { id: 'e8_sibling', title: 'A family shareholder disagrees', icon: 'chat', good: false, per: 1.5, cd: 48, story: 'A relative who holds a small stake wants you to change direction, and says so loudly at family dinners.', choices: [
    S('listen', 'Hear them out properly', 'Costs a weekend, rebuilds trust.', 'They felt heard and softened.', { eff: { morale: 1, rep: 1 } }),
    S('buy', 'Offer to buy them out', 'Costs money, ends it.', 'The chapter closed.', { k: 0.06, acct: 'dealCosts' }),
    S('firm', 'Stand your ground', 'Free, and a cold winter.', '', { gamble: { p: 0.5, good: {}, bad: { morale: -2 }, goodText: 'They backed down.', badText: 'It spilled into the office.' } })] },
  { id: 'e8_breakdown', title: 'A key machine breaks down', icon: 'bolt', good: false, per: 4, cd: 12, story: 'A machine you rely on has stopped. The engineer says it can be fixed, but it is old.', choices: [
    S('repair', 'Repair it', 'Cheaper now, may fail again.', '', { k: 0.02, gamble: { p: 0.6, good: {}, bad: { d: E(0.97, 3) }, goodText: 'It runs again, good as before.', badText: 'It failed again at a bad time.' } }),
    S('replace', 'Replace it', 'A bigger cost, a better machine.', 'The new machine is faster and quieter.', { k: 0.06, eff: { c: E(0.99, 12), quality: 1 } }),
    S('rent', 'Rent a replacement', 'A steady fee, no worries.', 'A rented machine covered the gap.', { k: 0.03 })] },
  { id: 'e8_grant', title: 'A grant is open for businesses like yours', icon: 'coin', good: true, per: 3, cd: 24, story: 'The government has opened a small-business grant. Applying means a fair amount of paperwork.', choices: [
    S('apply', 'Apply properly', 'Costs a little in time and help.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.6, good: { rep: 1 }, bad: {}, goodText: 'You were awarded the grant.', badText: 'You were not successful this time.' } }),
    S('consult', 'Hire a grant consultant', 'Higher chance of success.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.85, good: { rep: 1 }, bad: {}, goodText: 'The consultant\'s application won.', badText: 'Even their application missed.' } }),
    S('skip', 'Skip it', 'Not worth the paperwork.', 'You left the money on the table.')] },
  { id: 'e8_union', title: 'Staff ask about a union', icon: 'flag', good: false, per: 2, cd: 40, gate: 'team', min: 18, story: 'A group of your staff have asked whether you would recognise a union.', choices: [
    S('welcome', 'Welcome it', 'Better trust, slightly higher costs.', 'The relationship started well.', { eff: { morale: 3, c: E(1.01, 12) } }),
    S('forum', 'Offer a staff forum instead', 'A middle road.', 'A forum was set up, and it was a start.', { eff: { morale: 1 } }),
    S('resist', 'Resist', 'Free, with a sour mood.', 'Tensions rose.', { eff: { morale: -4 } })] },
  { id: 'e8_intern', title: 'Summer interns are on offer', icon: 'chat', good: true, per: 3, cd: 12, gate: 'team', story: 'A local college is offering summer interns. Some may be brilliant, and some will be a lot of work.', choices: [
    S('take', 'Take a group', 'Some will impress you.', '', { k: 0.01, acct: 'wages', gamble: { p: 0.7, good: { quality: 1, morale: 1 }, bad: { morale: -1 }, goodText: 'A couple of stars emerged.', badText: 'It was hard work for little return.' } }),
    S('one', 'Take one', 'Easier to manage.', 'One intern worked out well.', { eff: { quality: 0.5 } }),
    S('no', 'Not this year', 'No.', 'You skipped it.')] },
  { id: 'e8_ideabox', title: 'The ideas box is overflowing', icon: 'lightbulb', good: true, per: 3, cd: 14, gate: 'team', story: 'Your staff ideas box has a heap of suggestions. Some are silly, and a few could be gold.', choices: [
    S('review', 'Review them all properly', 'Takes time and pays off.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.75, good: { c: E(0.99, 8), morale: 2 }, bad: { morale: 1 }, goodText: 'Two ideas were genuinely good.', badText: 'Nothing special, but people felt heard.' } }),
    S('pick', 'Pick the best one', 'Fast.', 'You chose one and it worked.', { eff: { quality: 0.5 } }),
    S('bin', 'Ignore them', 'Free.', 'People stopped using the box.', { eff: { morale: -2 } })] },
  { id: 'e8_reviews', title: 'Review season', icon: 'chart', good: true, per: 3, cd: 12, gate: 'team', min: 12, story: 'It is time for performance reviews. How you handle them will shape the year.', choices: [
    S('fair', 'Honest and fair', 'Some uncomfortable chats.', 'People knew where they stood.', { eff: { morale: 2, quality: 0.5 } }),
    S('generous', 'Generous ratings', 'Everyone is happy.', 'Pay went up, and so did expectations.', { k: 0.02, acct: 'wages', eff: { morale: 4 } }),
    S('skipit', 'Skip reviews this year', 'Free.', 'People noticed.', { eff: { morale: -3 } })] },
  { id: 'e8_relocate', title: 'A key person wants to relocate', icon: 'chat', good: false, per: 2, cd: 30, gate: 'team', story: 'One of your most important people needs to move abroad for family reasons.', choices: [
    S('remote', 'Let them work remotely', 'Keep their skills, with some friction.', '', { gamble: { p: 0.7, good: { quality: 0.5 }, bad: { morale: -1 }, goodText: 'It worked better than expected.', badText: 'Time zones were a pain.' } }),
    S('help', 'Pay for a handover', 'An orderly goodbye.', 'The handover was smooth.', { k: 0.02, acct: 'wages' }),
    S('let', 'Let them go', 'You lose the knowledge.', 'They left, and so did a lot of know-how.', { eff: { quality: -1, morale: -1 } })] },
  { id: 'e8_exit', title: 'An exit interview tells a story', icon: 'chat', good: false, per: 3, cd: 18, gate: 'team', story: 'Someone leaving has been unusually frank in their exit interview about what is wrong here.', choices: [
    S('act', 'Act on it', 'Fix the problem they raised.', 'The fix was simple, and others noticed.', { k: 0.015, acct: 'otherCosts', eff: { morale: 3 } }),
    S('note', 'Make a note', 'Free, little change.', 'It went in a file.', { eff: { morale: 0 } }),
    S('dismiss', 'Dismiss it', 'Sour grapes, you say.', '', { gamble: { p: 0.5, good: {}, bad: { morale: -3 }, goodText: 'It was nothing.', badText: 'Others quietly agreed with them.' } })] },
  { id: 'e8_hackathon', title: 'Staff propose a hackathon weekend', icon: 'lightbulb', good: true, per: 3, cd: 18, gate: 'team', story: 'A few staff want to give up a weekend to build prototypes. Pizza has been promised.', choices: [
    S('go', 'Back it with pizza and prizes', 'A fun weekend.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.65, good: { quality: 2, morale: 2 }, bad: { morale: 1 }, goodText: 'A prototype turned into a real improvement.', badText: 'Fun, though nothing came of it.' } }),
    S('weekday', 'Run it on a weekday', 'Cost of lost time, no complaints.', 'People liked the time off.', { eff: { quality: 0.5, morale: 1 } }),
    S('no', 'Decline', 'Keep weekends sacred.', 'The idea fizzled.')] },
  { id: 'e8_flash', title: 'A chance for a flash sale', icon: 'bolt', good: true, per: 4, cd: 10, story: 'A competitor is clearing stock. You could run a quick flash sale of your own to catch the interest.', choices: [
    S('big', 'Go big: 30% off for a weekend', 'A rush, with a margin hit.', '', { k: 0.03, acct: 'marketing', gamble: { p: 0.65, good: { d: E(1.06, 2), brand: 1.01 }, bad: { d: E(0.98, 2) }, goodText: 'The queue went round the block.', badText: 'It cannibalised your regular sales.' } }),
    S('small', 'A modest 10% off', 'A gentle nudge.', 'A decent bump with little risk.', { k: 0.01, acct: 'marketing', eff: { d: E(1.02, 2) } }),
    S('no', 'Hold your prices', 'Protect the brand.', 'You kept your nerve.', { eff: { brand: 1.002 } })] },
  { id: 'e8_advisory', title: 'Customers offer feedback calls', icon: 'chat', good: true, per: 3, cd: 18, story: 'Some of your best customers have offered to hop on a call to tell you what they really think.', choices: [
    S('listen', 'Run a proper session', 'Insight, and a little sheepishness.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.8, good: { quality: 1.5, rep: 1 }, bad: { morale: -1 }, goodText: 'You heard three things you did not know.', badText: 'It was a hard hour.' } }),
    S('survey', 'Send a survey instead', 'Cheaper and shallower.', 'A few useful nuggets.', { eff: { quality: 0.5 } }),
    S('skip', 'Skip it', 'You know your customers.', 'You assumed you knew.')] },
  { id: 'e8_collab', title: 'A brand wants a limited edition', icon: 'star', good: true, per: 2.5, cd: 24, story: 'A popular brand has asked to team up on a limited-edition product with both names on the box.', choices: [
    S('yes', 'Do the collab', 'Buzz, with some risk.', '', { k: 0.03, acct: 'marketing', gamble: { p: 0.7, good: { d: E(1.05, 3), brand: 1.04 }, bad: { rep: -1 }, goodText: 'It sold out in days.', badText: 'It did not land with either audience.' } }),
    S('small', 'A tiny pilot run', 'Safe and small.', 'It did modestly well.', { k: 0.01, acct: 'marketing', eff: { brand: 1.01 } }),
    S('no', 'Pass', 'Keep your own identity.', 'You declined politely.')] },
  { id: 'e8_spotlight', title: 'A customer deserves a thank-you', icon: 'heart', good: true, per: 3, cd: 12, story: 'One of your longest-standing customers has just celebrated ten years with you. A small gesture would go a long way.', choices: [
    S('shout', 'A public thank-you', 'Costs little, feels great.', 'The story was shared widely.', { k: 0.005, acct: 'marketing', eff: { brand: 1.01, rep: 1 } }),
    S('gift', 'Send a gift', 'A personal touch.', 'They wrote you a lovely letter.', { k: 0.003, acct: 'marketing', eff: { rep: 1 } }),
    S('nothing', 'Do nothing', 'Not your style.', 'Nothing happened.')] },
  { id: 'e8_forum', title: 'Your community forum gets heated', icon: 'chat', good: false, per: 3, cd: 18, story: 'A few loud voices on your customer forum are stirring up arguments, and newcomers are noticing.', choices: [
    S('moderate', 'Hire a moderator', 'Costs a little and keeps things civil.', 'The tone improved.', { k: 0.01, acct: 'otherCosts', eff: { rep: 1 } }),
    S('step', 'Step in yourself', 'Free, time-consuming.', '', { gamble: { p: 0.6, good: { rep: 1 }, bad: { morale: -1 }, goodText: 'Your reply calmed things down.', badText: 'You were drawn into the argument.' } }),
    S('leave', 'Leave them to it', 'Nothing.', 'The forum got quieter, and then emptier.', { eff: { rep: -1 } })] },
  { id: 'e8_complaintspike', title: 'Complaints spike', icon: 'alert', good: false, per: 3, cd: 14, story: 'Complaints have doubled in a fortnight. Something is going wrong, and not everyone has said what.', choices: [
    S('dig', 'Dig into the cause', 'Costs a little, finds the fault.', 'You found it and fixed it.', { k: 0.015, acct: 'otherCosts', eff: { rep: 1, quality: 1 } }),
    S('extra', 'Put extra people on the phones', 'Quick relief.', 'Calls got answered, though the cause remains.', { k: 0.01, acct: 'wages', eff: { rep: 0 } }),
    S('wait', 'Wait and see', 'Free.', '', { gamble: { p: 0.4, good: {}, bad: { rep: -3 }, goodText: 'It settled by itself.', badText: 'It got worse, and people noticed.' } })] },
  { id: 'e8_agent', title: 'A distributor offers to carry you', icon: 'handshake', good: true, per: 2.5, cd: 24, story: 'A regional distributor offers to put your products in their catalogue, on the condition of a discount.', choices: [
    S('deal', 'Sign at a 12% discount', 'More reach, a thinner margin.', 'Orders started to flow.', { eff: { d: E(1.04, 12), c: E(1.015, 12) } }),
    S('trial', 'A three-month trial', 'Low risk.', 'A decent trial run.', { eff: { d: E(1.015, 3) } }),
    S('no', 'Decline', 'Keep your margin.', 'You said no thanks.')] },
  { id: 'e8_energy', title: 'Energy prices jump', icon: 'bolt', good: false, per: 3, cd: 24, story: 'Energy prices have jumped across the market. Your bills will follow.', choices: [
    S('fix', 'Lock in a fixed deal now', 'Costs a little, stops the bleeding.', 'The fixed deal capped your bill.', { k: 0.01, acct: 'otherCosts', eff: { c: E(1.005, 6) } }),
    S('save', 'Cut your usage', 'A campaign of switching things off.', 'Staff got on board and bills eased.', { eff: { c: E(1.015, 4), morale: -1 } }),
    S('ride', 'Ride it out', 'Free.', 'The price stayed high for months.', { eff: { c: E(1.03, 6) } })] },
  { id: 'e8_audit', title: 'A customer audits your standards', icon: 'alert', good: false, per: 2.5, cd: 24, story: 'A large customer has announced that it will audit your working practices before placing its next order.', choices: [
    S('prep', 'Prepare properly', 'Pay for a pre-audit.', '', { k: 0.02, acct: 'otherCosts', gamble: { p: 0.9, good: { d: E(1.03, 8), rep: 1 }, bad: {}, goodText: 'You passed with distinction.', badText: 'You passed, with notes.' } }),
    S('bluff', 'Wing it', 'Free, risky.', '', { gamble: { p: 0.45, good: { d: E(1.02, 6) }, bad: { rep: -3, d: E(0.97, 3) }, goodText: 'You got away with it.', badText: 'They found problems, and told others.' } }),
    S('refuse', 'Refuse the audit', 'You lose the order.', 'The customer went elsewhere.', { eff: { d: E(0.99, 4) } })] },
];

// -------------------------------------------------------------------------------------------------
// Projects: spend money now, wait a few months, and either win a lasting benefit or lose the money
// -------------------------------------------------------------------------------------------------
export interface InitiativeDef {
  id: string; topic?: string; sector?: string; name: string; blurb: string;
  /** Cost as a share of a month's sales (with a floor of £800). */
  k: number;
  /** Months until the result. */
  months: number;
  /** Chance of success, 30 to 95. */
  success: number;
  /** Only available to stock-holding businesses. */
  stock?: boolean;
  /** Benefit if it works: a lasting policy-style effect, and/or a one-off effect. */
  win: { eff?: PolEff; monthly?: number; now?: EvEff; text: string };
  /** If it fails: a one-off effect and some text. */
  lose: { now?: EvEff; text: string };
}
export const PROJECTS8: InitiativeDef[] = [];
export const initiativeById = (id: string): InitiativeDef | undefined => PROJECTS8.find((p) => p.id === id);

import { EVENTS9, POLICIES9, PROJECTS9 } from './data9';
POLICIES.push(...POLICIES9);
EVENTS8.push(...EVENTS9);
PROJECTS8.push(...PROJECTS9);
