import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef, PolOption } from '../data8';

/** Topic: Sustainability. Every id starts with "sustainability_" (policies and projects) or "e9_sustainability_" (events). */
const base = (name: string, blurb: string): PolOption => opt(name, blurb, {});

export const policies: PolicyDef[] = [
  { id: 'sustainability_netzero', group: 'customers', name: 'Net-zero pledge', blurb: 'Promise to reach "net zero", which means any carbon you still produce is balanced out by cutting or removing it elsewhere. You are checked every year.', options: [
    base('No pledge', 'You make no promises about carbon.'),
    opt('Pledge for 2050', 'A long-term promise with a yearly check. It shows you care and costs a little to track.', { rep: 0.03 }, 0.2),
    opt('Pledge for 2035', 'A bold promise that gets noticed. Fall behind and the yearly check becomes a headline.', { rep: 0.06, risk: [4, 3, 'A yearly check showed you were behind your carbon plan and the press noticed.'] }, 0.5)] },
  { id: 'sustainability_plastic', group: 'ops', stock: true, name: 'Plastic-reduction target', blurb: 'Set yourself a target for how much plastic goes into your products and packs.', options: [
    base('No target', 'You use whatever is cheapest.'),
    opt('Cut plastic by a quarter', 'Swap the easy plastic for paper or card. Costs a little more and people notice.', { rep: 0.02, c: 1.003 }, 0.1),
    opt('Plastic-free target', 'Customers love it, but alternatives cost more and sometimes fail.', { rep: 0.05, d: 1.005, c: 1.012, risk: [3, 2, 'A plastic-free material failed and a batch of goods was damaged.'] }, 0.2)] },
  { id: 'sustainability_scorecards', group: 'ops', stock: true, name: 'Supplier sustainability scorecards', blurb: 'Mark each supplier on pollution, fair pay and waste, the way a teacher marks homework.', options: [
    base('No checks', 'You buy on price and trust the labels.'),
    opt('Score suppliers once a year', 'A simple scorecard shows who to ask for better. Takes a little effort.', { rep: 0.015, c: 1.002 }, 0.1),
    opt('Score them and drop the worst', 'Strong stories to tell, and slightly dearer goods from cleaner suppliers.', { rep: 0.04, c: 1.01, risk: [3, 3, 'Dropping a supplier left you short of materials for a week.'] }, 0.2)] },
  { id: 'sustainability_greenfinance', group: 'finance', name: 'Green loan or bond', blurb: 'Borrow on the promise that the money funds environmental projects. A bond is a loan from investors, and you must report how the money was spent.', options: [
    base('Ordinary borrowing', 'You borrow in the usual way.'),
    opt('Green loan from your bank', 'A slightly bigger borrowing limit, plus some paperwork to prove the money was used well.', { od: 1.1, rep: 0.01 }, 0.1, 0.3),
    opt('Green bond for investors', 'Much more room to borrow and a good story, but legal fees and detailed yearly reports.', { od: 1.25, rep: 0.03 }, 0.3, 1.5)] },
  { id: 'sustainability_takeback', group: 'ops', stock: true, name: 'Take-back scheme', blurb: 'A circular economy keeps materials in use. You take old products back, then repair, recycle or resell them.', options: [
    base('Customers bin it', 'Old products end up in landfill.'),
    opt('Take-back bins', 'Customers hand old products back. Good will for a modest cost.', { ch: 0.99, rep: 0.02 }, 0.2, 0.4),
    opt('Refurbish and resell', 'Fix up returned goods and sell them on. Some savings on materials, plus a lot of workshop effort.', { c: 0.995, d: 1.01, rep: 0.03 }, 0.5, 1)] },
  { id: 'sustainability_commute', group: 'people', name: 'Commuting scheme', blurb: 'Help your team get to work with less traffic and fewer car fumes.', options: [
    base('Everyone finds their own way', 'People drive, walk or take the bus as they like.'),
    opt('Cycle-to-work scheme', 'Help staff buy bikes and cycle gear. Cheap, healthy and popular with some.', { m: 0.15, rep: 0.01 }, 0.1),
    opt('Season-ticket loans and car-share', 'Spread the cost of train and bus passes, and match up drivers.', { m: 0.2, ch: 0.99 }, 0.3),
    opt('Staff shuttle bus', 'A friendly bus from the station. People are grateful, and it costs real money to run.', { m: 0.3, cap: 1.005, rep: 0.02 }, 0.8)] },
  { id: 'sustainability_biodiversity', group: 'ops', name: 'Wildlife around your sites', blurb: 'Biodiversity means a rich variety of living things. Make your grounds friendlier to bees, birds and bugs.', options: [
    base('Tidy and bare', 'Paving, short grass and neat edges.'),
    opt('Wildflowers and bee hives', 'Easy, pretty and a nice talking point.', { rep: 0.03 }, 0.1, 0.2),
    opt('A proper wildlife habitat', 'Ponds, hedges and bird boxes. Staff enjoy it, and it takes real upkeep.', { rep: 0.05, m: 0.15 }, 0.3, 0.8)] },
  { id: 'sustainability_localradius', group: 'ops', stock: true, name: 'Local-sourcing radius', blurb: 'Promise to buy from suppliers within a set distance of your premises.', options: [
    base('Buy from anywhere', 'Whoever is cheapest wins.'),
    opt('Local where it is easy', 'Pick nearby suppliers when the price is close. A warm story for a small premium.', { rep: 0.03, d: 1.005, c: 1.004 }, 0.1),
    opt('A strict 50-mile pledge', 'A strong brand story. Fewer suppliers means higher prices and less backup.', { rep: 0.06, d: 1.01, c: 1.015, risk: [4, 3, 'A local supplier ran short and you had no backup.'] }, 0.2)] },
  { id: 'sustainability_communityfund', group: 'customers', name: 'Community-impact fund', blurb: 'A pot of money for local causes, from youth football kits to the village hall roof.', options: [
    base('No fund', 'You give when someone asks, if you remember.'),
    opt('A small yearly fund', 'Pick a few good causes each year.', { rep: 0.04 }, 0.2),
    opt('Staff vote on where it goes', 'People feel proud of where the money goes.', { rep: 0.05, m: 0.2 }, 0.4),
    opt('Fund plus paid volunteering days', 'The biggest gesture, with time off the day job for staff to help out.', { rep: 0.07, m: 0.3, cap: 0.99 }, 0.7)] },
];

export const events: EvSpec[] = [
  { id: 'e9_sustainability_ppa', title: 'A wind farm offers you a power deal', icon: 'bolt', good: true, per: 1.2, cd: 24, story: 'A wind-farm company offers to sell you electricity directly under a power-purchase agreement. That is a long contract that fixes the price of green power for years, whatever the market does.', choices: [
    S('long', 'Sign a ten-year deal', 'Deepest saving, but you are locked in if prices fall.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.6, good: { c: E(0.985, 12), rep: 1 }, bad: { c: E(1.01, 12) }, goodText: 'Market prices rose and your fixed price looked clever.', badText: 'Market prices fell and you were stuck paying more than your rivals.' } }),
    S('short', 'Sign for two years', 'A smaller saving with an easy exit.', 'A steady saving with no regrets.', { k: 0.01, acct: 'otherCosts', eff: { c: E(0.995, 12) } }),
    S('no', 'Stay on your current tariff', 'No change and no risk.', 'You kept things as they were.')] },
  { id: 'e9_sustainability_offsets', title: 'A carbon-offset broker calls', icon: 'leaf', good: true, per: 1.5, cd: 18, story: 'A broker offers to cancel out your carbon by paying for tree planting and clean cookers elsewhere. Prices vary wildly, and some offsets are far more genuine than others.', choices: [
    S('cheap', 'Buy the cheapest offsets', 'A low price, but quality is a lottery.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.5, good: { rep: 1 }, bad: { rep: -2 }, goodText: 'The offsets held up and you earned a little credit.', badText: 'A journalist found the trees had never been planted.' } }),
    S('certified', 'Buy independently certified offsets', 'Costs more but stands up to scrutiny.', 'Certified offsets gave you something solid to point to.', { k: 0.03, acct: 'otherCosts', eff: { rep: 2 } }),
    S('cut', 'Cut your own emissions instead', 'Slower, but the savings are real.', 'Fixing your own house saved money as well.', { k: 0.02, acct: 'otherCosts', eff: { c: E(0.99, 8), rep: 1 } })] },
  { id: 'e9_sustainability_greenwash', title: 'Greenwashing accusation', icon: 'flame', good: false, per: 1.2, cd: 30, story: 'A campaign group says your green claims are misleading. Greenwashing means making a business sound kinder to the planet than it really is, and it can bring fines and bad headlines.', choices: [
    S('evidence', 'Publish your evidence', 'Open and honest, but it exposes any gaps.', '', { k: 0.02, acct: 'otherCosts', gamble: { p: 0.7, good: { rep: 2 }, bad: { rep: -1 }, goodText: 'The numbers backed up most of your claims and people respected the openness.', badText: 'The numbers showed gaps, and the story ran for a week.' } }),
    S('fix', 'Admit it and tone down the claims', 'Cheap, and it ends the story fast.', 'A plain apology and honest wording ended the row.', { k: 0.01, acct: 'marketing', eff: { rep: 1 } }),
    S('hit', 'Hit back and deny it', 'Risky: if they are right, it gets much worse.', '', { gamble: { p: 0.35, good: { brand: 1.01 }, bad: { rep: -4, d: E(0.97, 4) }, goodText: 'The campaigners backed off.', badText: 'Proof emerged, and the cover-up was worse than the claim.' } })] },
  { id: 'e9_sustainability_report', title: 'Time for the sustainability report', icon: 'chart', good: true, per: 1.5, cd: 12, min: 12, story: 'A sustainability report is a public document explaining your impact on people and the planet and how you are improving. Banks, big customers and staff are asking if you will publish one.', choices: [
    S('audited', 'Publish a full report, independently checked', 'Costs real money and builds trust.', 'The report earned respect from customers, banks and staff.', { k: 0.04, acct: 'otherCosts', eff: { rep: 2, brand: 1.01 } }),
    S('short', 'Publish a short summary', 'Cheaper, and tells people less.', 'A tidy one-pager went on the website.', { k: 0.01, acct: 'otherCosts', eff: { rep: 1 } }),
    S('skip', 'Stay silent this year', 'Free, but people notice what is missing.', '', { gamble: { p: 0.6, good: {}, bad: { rep: -2 }, goodText: 'Nobody noticed.', badText: 'A customer asked where your report was, and the answer was awkward.' } })] },
  { id: 'e9_sustainability_audit', title: 'The energy audit report arrives', icon: 'bolt', good: true, per: 1.5, cd: 24, story: 'An energy audit of your premises is back. It lists many things you could do, from switching off old equipment to replacing the boiler, each with a payback time.', choices: [
    S('all', 'Do everything on the list', 'A big cost now for savings all year.', 'The works were messy, and then the bills fell.', { k: 0.06, acct: 'otherCosts', eff: { c: E(0.985, 12), morale: 1 } }),
    S('quick', 'Do the cheap quick wins', 'Small cost, solid return.', 'Draught-proofing and better settings paid back within months.', { k: 0.015, acct: 'otherCosts', eff: { c: E(0.994, 10) } }),
    S('file', 'File it in a drawer', 'Free, and the savings stay on the table.', 'The report gathered dust, and so did the savings.', { eff: { c: E(1.003, 6) } })] },
  { id: 'e9_sustainability_esg', title: 'An ESG rating arrives', icon: 'star', good: true, per: 1.2, cd: 24, story: 'A rating agency has scored you on ESG, which stands for environmental, social and governance. Investors and big customers use it to judge how responsibly you behave, and you have been sent a questionnaire.', choices: [
    S('consult', 'Hire a specialist to lift your score', 'Costs more, and it usually pays off.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.8, good: { rep: 2, d: E(1.02, 8) }, bad: {}, goodText: 'Your score jumped, and a big customer noticed.', badText: 'The score barely moved.' } }),
    S('answer', 'Fill in the questionnaire yourselves', 'Cheap, though gaps in your answers will show.', '', { k: 0.005, acct: 'otherCosts', gamble: { p: 0.55, good: { rep: 1 }, bad: { rep: -1 }, goodText: 'You scored respectably.', badText: 'Gaps in your answers pulled the score down.' } }),
    S('ignore', 'Ignore the questionnaire', 'Free, but the agency will guess about you.', 'With no answers from you, the agency guessed, and not kindly.', { eff: { rep: -1 } })] },
  { id: 'e9_sustainability_climaterisk', title: 'Your bank wants a climate-risk disclosure', icon: 'shield', good: false, per: 1.2, cd: 30, min: 18, story: 'Your bank asks how floods, heatwaves and tougher carbon rules could hurt your business, and wants it in writing. This is called a climate-risk disclosure, and banks use it to decide how safe you are to lend to.', choices: [
    S('full', 'Do a full climate-risk assessment', 'Thorough, a little scary, and banks like it.', 'You found weak spots, fixed a few, and your bank noticed.', { k: 0.03, acct: 'otherCosts', eff: { rep: 1, c: E(0.995, 12) } }),
    S('basic', 'Write a short note', 'Cheap, and might not satisfy them.', '', { k: 0.005, acct: 'otherCosts', gamble: { p: 0.6, good: { rep: 1 }, bad: { rep: -1 }, goodText: 'The bank accepted it as a good start.', badText: 'The bank said your note was too thin.' } }),
    S('refuse', 'Say it is commercially sensitive', 'Free, but banks dislike secrets.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -1, c: E(1.01, 6) }, goodText: 'They let it drop.', badText: 'The bank priced in the uncertainty and your costs went up.' } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'sustainability_carbonaccounts', name: 'Carbon accounts by product', blurb: 'Work out how much carbon each product creates, from raw materials to delivery. You cannot cut what you have not measured.', k: 0.5, months: 4, success: 80,
    win: { eff: { c: 0.995, rep: 0.01 }, text: 'The numbers showed where energy and materials were being wasted, and you fixed the worst.' },
    lose: { now: { morale: -1 }, text: 'The data was too patchy to trust, and the money was wasted.' } },
  { id: 'sustainability_water', name: 'Water-saving programme', blurb: 'Fix leaks, fit low-flow taps and collect rainwater so you pay for less water.', k: 0.4, months: 4, success: 85,
    win: { eff: { c: 0.995 }, monthly: -0.15, text: 'Low-flow taps, leak repairs and rainwater tanks cut the water bill for good.' },
    lose: { now: { c: E(1.01, 2) }, text: 'The leak was somewhere else entirely, and the works disrupted a week.' } },
  { id: 'sustainability_wastetoenergy', name: 'Waste-to-energy partnership', blurb: 'Team up with a local plant that turns your leftover waste into heat or power, instead of paying to have it taken away.', k: 1, months: 7, success: 65,
    win: { eff: { rep: 0.02 }, monthly: -0.4, text: 'A local plant now burns your leftover waste to make heat, and pays you for it.' },
    lose: { now: { rep: -1 }, text: 'The plant pulled out, and neighbours worried about smoke.' } },
  { id: 'sustainability_fairtrade', stock: true, name: 'Fair-trade certification', blurb: 'Pass an independent audit showing that the farmers and workers behind your goods are paid fairly. You can then use the fair-trade mark.', k: 0.8, months: 6, success: 75,
    win: { eff: { d: 1.015, c: 1.01, rep: 0.03 }, monthly: 0.1, text: 'You passed the audit and the logo went on the pack. Shoppers pay attention to it, though fairer prices cost you more.' },
    lose: { now: { rep: -1 }, text: 'The auditors found a supplier that broke the rules, and you must start again.' } },
  { id: 'sustainability_evfleet', name: 'Electric vehicle transition', blurb: 'Swap your diesel vans and cars for electric ones and fit charging points. The cost comes first and the savings later.', k: 1.5, months: 8, success: 80,
    win: { eff: { c: 0.99, rep: 0.03 }, text: 'Electric vehicles cost far less to run, and customers like seeing them around.' },
    lose: { now: { c: E(1.02, 4) }, text: 'Charging points arrived late, the vehicles sat idle, and you paid to hire diesel ones.' } },
  { id: 'sustainability_packaging', stock: true, name: 'Packaging redesign for recycling', blurb: 'Redesign your packs to use one easily recycled material instead of mixed layers that no one can sort.', k: 0.8, months: 5, success: 75,
    win: { eff: { c: 0.995, d: 1.005, rep: 0.02 }, text: 'The new packs use one recyclable material, which is cheaper to buy and which customers noticed.' },
    lose: { now: { c: E(1.01, 3) }, text: 'The new packs split in transit, and you paid for a lot of replacement goods.' } },
  { id: 'sustainability_ecolabel', stock: true, name: 'Eco-label for your products', blurb: 'Apply for a recognised eco-label, a mark on the pack showing independent experts have checked your environmental claims.', k: 0.6, months: 4, success: 70,
    win: { eff: { d: 1.02, rep: 0.02 }, monthly: 0.1, text: 'A recognised eco-label now sits on your packs, and it helps people choose you. The licence costs a little each month.' },
    lose: { now: { rep: -1 }, text: 'You failed the checks, and the application fee was lost.' } },
  { id: 'sustainability_retrofit', name: 'Green building retrofit', blurb: 'Fit insulation, better windows and a heat pump. A retrofit means improving an existing building rather than building a new one.', k: 2, months: 10, success: 80,
    win: { eff: { c: 0.99, m: 0.1, rep: 0.02 }, monthly: -0.3, text: 'Bills dropped and the building is warmer, quieter and a nicer place to work.' },
    lose: { now: { c: E(1.02, 3), morale: -2 }, text: 'The builders overran, the building was a mess for months, and the new heating never worked properly.' } },
  { id: 'sustainability_cleanline', stock: true, name: 'Cleaner production line', blurb: 'Replace your oldest machinery with a line that uses less energy and makes less waste, and a lot less noise.', k: 2.5, months: 10, success: 70,
    win: { eff: { c: 0.99, q: 0.02, rep: 0.02 }, monthly: -0.2, text: 'The new line wastes less, makes better goods and looks good on a site visit.' },
    lose: { now: { c: E(1.03, 4) }, text: 'The new equipment never ran smoothly, and you paid to put the old line back.' } },
];
