import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Deals and acquisitions. Filled in by hand; every id must start with "mna_" (policies and projects) or "e9_mna_" (events). */
export const policies: PolicyDef[] = [
  // 502 Post-merger culture survey
  { id: 'mna_culturesurvey', group: 'people', name: 'Post-deal culture survey', blurb: 'When two teams join up, a survey shows who is unhappy before they quietly leave.', options: [
    opt('No survey', 'You trust your instincts about how the joined-up team feels.', {}),
    opt('Quick pulse survey', 'Five questions, a day to answer, and a short list of worries to fix.', { m: 0.15 }, 0.08),
    opt('Survey plus team workshops', 'You listen properly and act on it. People feel heard, though the workshops take time away from the day job.', { m: 0.3, cap: 0.995 }, 0.25)] },
  // 503 Synergy tracking scoreboard
  { id: 'mna_synergy', group: 'finance', name: 'Synergy scoreboard', blurb: 'Synergies are the savings and extra sales you hoped for when joining two businesses. A scoreboard checks they really turn up.', options: [
    opt('No tracking', 'You assume the savings are happening somewhere.', {}),
    opt('Monthly scoreboard', 'Every promised saving gets an owner and a number. Costs drift down, and people feel a little watched.', { c: 0.995, m: -0.05 }, 0.12),
    opt('Scoreboard with bonuses', 'Pay is linked to hitting the numbers. Bigger savings, and more pressure and corner-cutting.', { c: 0.99, m: -0.15, q: -0.01 }, 0.3)] },
  // 509 Customer-overlap checks before deals
  { id: 'mna_overlap', group: 'customers', name: 'Customer-overlap checks', blurb: 'Before a deal, check how many customers the two firms share, and whether big ones may walk away when they see a single supplier.', options: [
    opt('No checks', 'You find out after signing.', {}),
    opt('Quick customer-list check', 'Compare the two customer lists and flag the big overlaps.', { ch: 0.99 }, 0.08),
    opt('Full check with calls to key clients', 'You phone the biggest customers before the deal. Fewer nasty surprises, and it takes weeks.', { ch: 0.98, d: 1.005 }, 0.2, 0.4)] },
  // 510 Brand-portfolio rationalisation after buying several firms
  { id: 'mna_brands', group: 'customers', name: 'Brand portfolio', blurb: 'After buying several firms you may own several brands. You can keep them all, or tidy up and risk annoying loyal customers.', options: [
    opt('Keep every brand', 'Customers see the names they know. You pay for several of everything.', {}),
    opt('One master brand', 'Cheaper to run and stronger together, but fans of the old names may drift away.', { c: 0.99, br: 1.001, ch: 1.02 }),
    opt('A few flagship brands', 'Keep the best-loved names and retire the weak ones. Costs a little to unwind.', { c: 0.995, ch: 1.01 }, 0, 0.3)] },
  // 511 Staff-redundancy rules during integrations
  { id: 'mna_redundancy', group: 'people', name: 'Integration job rules', blurb: 'When two firms merge there are usually duplicate jobs. How you handle them tells everyone who you are.', options: [
    opt('Case by case', 'Each role is judged on its own merits.', {}),
    opt('No forced redundancies pledge', 'You promise nobody will be pushed out. Trust soars, and you carry duplicate roles for longer.', { m: 0.4, rep: 0.03, ch: 0.98, c: 1.01 }),
    opt('Fast restructuring', 'Duplicates go quickly. Costs fall, and the people left behind keep looking over their shoulders.', { c: 0.985, m: -0.4, ch: 1.03, rep: -0.02 })] },
  // 519 Vendor-financing from sellers
  { id: 'mna_vendorfinance', group: 'finance', name: 'Paying sellers in instalments', blurb: 'Vendor financing means the sellers let you pay for a business over time instead of all at once. You keep more cash in the bank, but you owe them.', options: [
    opt('Pay in full on completion', 'Clean and final. It uses up a lot of cash.', {}),
    opt('Seller instalments', 'Part of the price is paid over a few years. A bigger cash cushion, and instalments to meet.', { od: 1.12 }, 0.35, 0.2),
    opt('Instalments tied to results', 'The less you earn, the less you pay. Handy in a downturn, and the sellers may argue about how results are counted.', { od: 1.2, risk: [4, 4, 'The former owners argued over how your results were counted.'] }, 0.5, 0.3)] },
  // 525 Integration-office staffing
  { id: 'mna_integrationoffice', group: 'ops', name: 'Integration office', blurb: 'A small team whose only job is to join two firms smoothly: moving systems, people and customers.', options: [
    opt('Managers do it on the side', 'Free, and the day job suffers.', {}),
    opt('One integration lead', 'A single person keeps the plan on track.', { q: 0.01, m: 0.1 }, 0.4),
    opt('A full integration office', 'A proper team with a plan, a budget and a weekly progress check. Customers barely notice the join.', { q: 0.02, m: 0.2, ch: 0.985, cap: 1.01 }, 1.1)] },
];

export const events: EvSpec[] = [
  // 501 Earn-out disputes with former owners
  { id: 'e9_mna_earnout', title: 'The earn-out argument', icon: 'shield', good: false, per: 1.2, cd: 30, min: 18,
    story: 'The former owners of a small business you bought say you have not run it the way you promised. They want the full earn-out: extra payments they were promised if the business hit targets after the sale. You say the targets were missed fairly.', choices: [
      S('pay', 'Pay the full amount', 'Costly, but it ends the matter and keeps the peace.', 'You paid up, shook hands and kept your good name.', { k: 0.06, acct: 'dealCosts', eff: { rep: 1 } }),
      S('middle', 'Negotiate a middle sum', 'Legal costs, and a fair chance of a quiet settlement.', '', { k: 0.03, acct: 'dealCosts', gamble: { p: 0.65, good: { rep: 1 }, bad: { morale: -1, rep: -1 }, goodText: 'Both sides gave a little, and the matter was closed.', badText: 'The talks went sour and word got around.' } }),
      S('fight', 'Fight it with lawyers', 'Cheaper if you win, and a scrap if you do not.', '', { k: 0.02, acct: 'dealCosts', gamble: { p: 0.45, good: { rep: 1 }, bad: { rep: -2, morale: -1 }, goodText: 'The judge agreed the targets were fairly missed.', badText: 'You lost, and the story reached the local paper.' } })] },
  // 504 Break-up fees in competitive auctions
  { id: 'e9_mna_auction', title: 'A bidding war with a break-up fee', icon: 'handshake', good: true, per: 1, cd: 24, gate: 'rivals',
    story: 'A small firm you like is up for auction, and a rival is bidding too. The seller wants a break-up fee: money you must pay if you win and then pull out. A high fee makes your offer look serious, and costs a lot if you change your mind.', choices: [
      S('high', 'Bid high and accept the fee', 'More likely to win, and a costly walk-away.', '', { k: 0.03, acct: 'dealCosts', gamble: { p: 0.6, good: { d: E(1.04, 10), brand: 1.01 }, bad: { rep: -1 }, goodText: 'You won the auction, and the new customers began to flow.', badText: 'The rival outbid you at the last minute, and you lost the deposit.' } }),
      S('low', 'Bid sensibly with no fee', 'You will probably lose, but it costs nothing.', '', { gamble: { p: 0.3, good: { d: E(1.03, 8) }, bad: {}, goodText: 'The rival blinked, and you won it cheaply.', badText: 'The rival outbid you, and you walked away with your cash.' } }),
      S('stay', 'Stay out', 'No risk and no prize.', 'You kept your cash and your cool, and watched someone else celebrate.')] },
  // 508 Merger-control approvals timeline
  { id: 'e9_mna_clearance', title: 'The competition regulator calls', icon: 'shield', good: false, per: 1, cd: 30, min: 18,
    story: 'A deal you are working on is big enough that the competition authority must approve it, to make sure customers are not left with too little choice. Reviews can take months, and the deal sits in limbo while staff wonder what is going on.', choices: [
      S('remedy', 'Offer to sell off a small overlap', 'Costs something, and speeds things up.', 'The authority accepted your offer and cleared the deal early.', { k: 0.04, acct: 'dealCosts', eff: { rep: 1 } }),
      S('wait', 'Sit through the full review', 'Free, slow and nerve-racking for staff.', 'The review dragged on, and everyone got tired of waiting.', { eff: { morale: -2, d: E(0.99, 4) } }),
      S('abandon', 'Walk away from the deal', 'You lose the fees spent, and you can get back to normal.', 'You called it off and turned your attention back to the day job.', { k: 0.02, acct: 'dealCosts', eff: { morale: 1 } })] },
  // 514 Minority stake purchases with option to buy more
  { id: 'e9_mna_minority', title: 'A founder offers a minority stake', icon: 'handshake', good: true, per: 1, cd: 24,
    story: 'The founder of a promising small firm will sell you a minority stake (less than half) now, with an option: the right, but not the duty, to buy the rest later at an agreed price. It is a way to try before you buy.', choices: [
      S('both', 'Buy the stake and the option', 'Costs more, and keeps the door open.', '', { k: 0.06, acct: 'dealCosts', gamble: { p: 0.75, good: { d: E(1.03, 10), quality: 1 }, bad: { rep: -1 }, goodText: 'The two firms worked well together, and the option is a valuable card to hold.', badText: 'The founder changed direction, and your stake became a headache.' } }),
      S('stake', 'Buy the stake only', 'Cheaper, with no promise of more.', 'You now share in their success, and nothing more is expected of you.', { k: 0.03, acct: 'dealCosts', eff: { d: E(1.01, 8) } }),
      S('pass', 'Not now', 'You keep your money for the day job.', 'You thanked them and kept the founder\'s number.')] },
  // 515 Distressed-asset auctions
  { id: 'e9_mna_distressed', title: 'A failing rival\'s assets go under the hammer', icon: 'coin', good: true, per: 1, cd: 24, gate: 'rivals',
    story: 'A struggling firm in your market has gone into administration, and its stock, equipment and customer list are being sold at auction. Bargains can be real, and so can hidden problems.', choices: [
      S('best', 'Bid for the best assets', 'A high cost, and the prize could be large.', '', { k: 0.07, acct: 'dealCosts', gamble: { p: 0.6, good: { d: E(1.05, 10), c: E(0.99, 12) }, bad: { morale: -2, rep: -1 }, goodText: 'You won the best kit and the customer list at a fraction of their value.', badText: 'The kit turned out to be worn out, and the customers had already left.' } }),
      S('list', 'Pick off the customer list', 'Cheaper, and a smaller prize.', 'You bought the customer list, and a few of them came across.', { k: 0.025, acct: 'dealCosts', eff: { d: E(1.025, 8) } }),
      S('pass', 'Let it go', 'No risk and no prize.', 'You let it pass, and another firm snapped up the bargains.')] },
  // 517 Information-memorandum quality for sellers
  { id: 'e9_mna_infomemo', title: 'A buyer wants your information memorandum', icon: 'gem', good: true, per: 1, cd: 30, min: 18,
    story: 'A serious buyer is interested in your firm and has asked for your information memorandum: a long brochure that tells the whole story of the business, its numbers and its prospects. A sloppy one makes buyers wary. A polished one makes you look like a catch.', choices: [
      S('adviser', 'Hire an adviser to write it', 'Costly and polished.', 'The brochure was glossy and persuasive, and word of it spread through the buyers\' circle.', { k: 0.04, acct: 'dealCosts', eff: { rep: 2, brand: 1.01 } }),
      S('diy', 'Write it yourselves', 'Cheap and honest, though it may look amateur.', '', { gamble: { p: 0.55, good: { rep: 1, quality: 1 }, bad: { rep: -1 }, goodText: 'Writing it taught you your own business, and the buyer liked the honesty.', badText: 'It had typos, and the buyer wondered what else was loose.' } }),
      S('numbers', 'Send the numbers only', 'Free, and the buyer may lose interest.', '', { gamble: { p: 0.4, good: {}, bad: { rep: -2 }, goodText: 'The numbers spoke for themselves, and the buyer stayed keen.', badText: 'The buyer found it thin and told others you were not serious.' } })] },
  // 518 Warranty-and-indemnity insurance on deals
  { id: 'e9_mna_wi', title: 'Hidden problems in the firm you are buying', icon: 'shield', good: false, per: 1.2, cd: 24,
    story: 'You are about to buy a small firm. The sellers promise it has no hidden problems, but if one pops up later (an old tax bill, a lawsuit) the cost lands on you. Warranty-and-indemnity insurance pays out if the sellers\' promises (the warranties) turn out to be false.', choices: [
      S('insure', 'Buy the insurance', 'A fixed fee for peace of mind.', 'The policy was a nuisance to arrange, and you slept well afterwards.', { k: 0.03, acct: 'dealCosts', eff: { morale: 1 } }),
      S('sellers', 'Ask the sellers to stand behind their promises', 'Free to ask, and they may haggle or get sniffy.', '', { gamble: { p: 0.55, good: { rep: 1 }, bad: { rep: -1, morale: -1 }, goodText: 'The sellers signed a strong promise, and trust grew.', badText: 'They took offence at being doubted, and the talks turned frosty.' } }),
      S('uninsured', 'Go ahead uninsured', 'Free now, and risky if something is lurking.', '', { gamble: { p: 0.7, good: {}, bad: { c: E(1.04, 8), rep: -1 }, goodText: 'Nothing was lurking, and you saved the premium.', badText: 'A hidden tax bill and an old lawsuit ate into your profits.' } })] },
  // 520 Hostile-bid defence tactics
  { id: 'e9_mna_hostile', title: 'A hostile bid arrives', icon: 'flame', good: false, per: 0.8, cd: 40, min: 24, gate: 'rivals',
    story: 'A bigger firm has made an unwanted offer for your company, going straight to your shareholders over your head. That is a hostile bid. Staff are nervous, and rivals are circling.', choices: [
      S('knight', 'Find a friendlier buyer', 'A kinder suitor, found at a price.', '', { k: 0.05, acct: 'dealCosts', gamble: { p: 0.55, good: { morale: 2, rep: 2 }, bad: { morale: -3, rep: -1 }, goodText: 'A white knight appeared with a kinder offer, and the hostile bidder walked away.', badText: 'Nobody else came forward, and the search made you look weak.' } }),
      S('campaign', 'Run a public campaign for independence', 'Rally customers, staff and holders.', '', { k: 0.03, acct: 'marketing', gamble: { p: 0.6, good: { brand: 1.03, morale: 2, d: E(1.02, 6) }, bad: { rep: -2 }, goodText: 'Customers rallied behind you, and holders turned the bid down.', badText: 'The campaign came across as desperate.' } }),
      S('talk', 'Open talks about a fair price', 'Free to listen, and it unsettles the team.', '', { gamble: { p: 0.4, good: { morale: 1, rep: 1 }, bad: { morale: -4 }, goodText: 'Talks made the bidder drop their price and their threats, and you stayed independent.', badText: 'Word of the talks leaked, and people began looking for new jobs.' } })] },
  // 522 IT-systems integration overruns
  { id: 'e9_mna_itoverrun', title: 'The systems merge is running late', icon: 'gear', good: false, per: 1.2, cd: 18,
    story: 'Joining the computer systems of two firms was meant to take three months. It is now month five, data keeps going missing between the old and new systems, and staff are retyping orders by hand.', choices: [
      S('contractors', 'Bring in specialist contractors', 'Costly, and it gets finished.', 'The contractors finished the job in a fortnight, and everyone breathed out.', { k: 0.05, acct: 'otherCosts', eff: { quality: 1 } }),
      S('extend', 'Extend the deadline', 'Free in cash, expensive in patience.', 'The extra months dragged, and workarounds piled up.', { eff: { c: E(1.015, 6), morale: -2 } }),
      S('trim', 'Cut features and launch what works', 'Quick, though gaps remain.', '', { gamble: { p: 0.6, good: { quality: 1 }, bad: { quality: -2, rep: -1 }, goodText: 'The cut-down system did the basics well, and everyone could get back to work.', badText: 'A gap in the new system lost some orders, and customers noticed.' } })] },
  // 523 Customer-churn after a rebrand
  { id: 'e9_mna_rebrandchurn', title: 'Customers drift after the rebrand', icon: 'alert', good: false, per: 1.2, cd: 20,
    story: 'You renamed the business you bought, and many of its old customers did not recognise you. Orders are slipping, and some say they will go back to their old supplier.', choices: [
      S('welcome', 'Offer a welcome-back deal', 'Costs a discount, and wins many back.', 'A friendly letter and a discount brought most of them back.', { k: 0.03, acct: 'marketing', eff: { d: E(1.02, 4), rep: 1 } }),
      S('dual', 'Show the old name beside the new', 'Free, and a little clumsy.', 'The old name on the door calmed people down, though the look was muddled.', { eff: { d: E(1.01, 4), brand: 0.99 } }),
      S('stay', 'Stay the course', 'Free, and the drift may continue.', '', { gamble: { p: 0.5, good: { brand: 1.02 }, bad: { d: E(0.97, 6), rep: -1 }, goodText: 'People got used to the new name, and the brand grew stronger.', badText: 'Customers kept drifting away, and some wrote angry reviews.' } })] },
  // 524 Deal-fatigue that hurts day-to-day running
  { id: 'e9_mna_fatigue', title: 'Deal fatigue sets in', icon: 'coffee', good: false, per: 1.2, cd: 20,
    story: 'Months of late-night deal meetings have worn everyone out. Customer emails take days to answer, and mistakes are creeping in because the leaders are always on calls.', choices: [
      S('pause', 'Pause all deals for a quarter', 'Costs momentum, and restores focus.', 'The break did everyone good, and the day job got its energy back.', { eff: { morale: 3, quality: 1, d: E(0.99, 3) } }),
      S('cover', 'Hire temporary cover for the day job', 'Costs wages, and protects customers.', 'The temporary staff kept things ticking over while the deal team finished.', { k: 0.04, acct: 'wages', eff: { morale: 1, quality: 1 } }),
      S('push', 'Push through to the finish', 'Free. Close the deal first, rest later.', '', { gamble: { p: 0.5, good: { morale: 1 }, bad: { morale: -4, quality: -2 }, goodText: 'The deal closed, and everyone slept for a weekend.', badText: 'Mistakes piled up, and two good people handed in their notice.' } })] },
];

export const projects: InitiativeDef[] = [
  // 505 Reverse takeover of a smaller listed shell
  { id: 'mna_reversetakeover', name: 'Reverse takeover of a listed shell', blurb: 'A shell is a small listed company with no real business. Merge into it, and you get a public profile and easier credit without a full flotation. It is quicker, but you inherit whatever the shell is hiding.',
    k: 2, months: 8, success: 50,
    win: { eff: { od: 1.12, d: 1.01 }, monthly: 0.3, now: { rep: 2, brand: 1.02 }, text: 'The merger went through. Your name is now more widely known and banks are warmer, though the public reporting costs money every month.' },
    lose: { now: { rep: -2, morale: -2 }, text: 'The shell turned out to hide old debts, and the deal collapsed in public.' } },
  // 506 Carve-out of a division into a new company
  { id: 'mna_carveout', name: 'Carve out a division', blurb: 'Split part of the business off into its own company with its own bosses. The rest of the firm gets simpler, and the new company can chase its own goals.',
    k: 1.2, months: 6, success: 60,
    win: { eff: { c: 0.99, cap: 1.01 }, now: { quality: 1, morale: 1 }, text: 'The split went smoothly. The main business is simpler and sharper, and the new company has its own spark.' },
    lose: { now: { morale: -3, rep: -1 }, text: 'Nobody knew who owned what, and the carve-out left everyone confused and cross.' } },
  // 507 Management buy-in of a struggling firm
  { id: 'mna_mbi', name: 'Management buy-in of a struggling firm', blurb: 'A management buy-in is when outside managers buy a failing company and run it themselves. Cheap to get into, but the firm may be in worse shape than it looks.',
    k: 1.5, months: 9, success: 45,
    win: { eff: { d: 1.03, cap: 1.01, c: 1.005 }, now: { rep: 1 }, text: 'The turnaround worked. The struggling firm now brings in steady sales, with a few old habits you are still sorting out.' },
    lose: { now: { d: E(0.98, 4), rep: -1, morale: -2 }, text: 'The firm was in worse trouble than anyone knew, and cleaning up the mess drained time and goodwill.' } },
  // 512 Supplier-contract renegotiation after merging
  { id: 'mna_supplierdeal', name: 'Renegotiate supplier contracts', blurb: 'Two firms together buy twice as much, so you can ask suppliers for better prices. Suppliers do not enjoy being squeezed, though.',
    k: 0.4, months: 4, success: 70,
    win: { eff: { c: 0.99 }, now: { rep: 1 }, text: 'Suppliers agreed to better terms in return for a bigger and steadier order book.' },
    lose: { now: { c: E(1.02, 4), rep: -1 }, text: 'Your suppliers dug in, and the relationship was left cooler and a bit dearer.' } },
  // 513 Joint-venture agreements with rivals
  { id: 'mna_jointventure', name: 'Joint venture with a rival', blurb: 'A joint venture is a new business owned together by you and a rival. You share the costs and the risk, and you also share your secrets.',
    k: 1, months: 6, success: 55,
    win: { eff: { d: 1.02, c: 0.99 }, monthly: 0.15, now: { rep: 1 }, text: 'The two firms found a common project that suits both. Costs are shared, and a joint team has some paperwork to keep up.' },
    lose: { now: { d: E(0.98, 4), rep: -1 }, text: 'Trust broke down, and you each went home with less than you brought.' } },
  // 516 Roll-up strategy for fragmented markets
  { id: 'mna_rollup', name: 'Roll-up of a fragmented market', blurb: 'In a fragmented market there are lots of tiny firms and no big one. A roll-up buys several and merges them to gain size and buying power. It is a lot of juggling.',
    k: 2.5, months: 12, success: 50,
    win: { eff: { d: 1.03, c: 0.99 }, monthly: 0.3, now: { brand: 1.02, rep: 1 }, text: 'You gathered up several small firms, and you now have size, loyal customers and better prices, though running them all takes a real team.' },
    lose: { now: { d: E(0.97, 4), morale: -3 }, text: 'The firms you gathered up did not fit together, and the juggling dropped a lot of balls.' } },
  // 521 Cross-border acquisition with currency risk
  { id: 'mna_crossborder', name: 'Buy a firm abroad', blurb: 'A foreign firm can open a new market, but its profits arrive in another currency, so every swing in the exchange rate moves your results.',
    k: 2, months: 8, success: 55,
    win: { eff: { d: 1.03 }, monthly: 0.2, now: { brand: 1.01, rep: 1 }, text: 'The foreign firm settled in and sales grew. Hedging against currency swings and long-haul travel cost you every month.' },
    lose: { now: { d: E(0.97, 5), rep: -1 }, text: 'A currency swing wiped out the early profits, and the foreign team was hard to manage from afar.' } },
];
