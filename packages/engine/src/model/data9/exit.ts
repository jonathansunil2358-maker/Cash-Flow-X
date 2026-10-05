import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Exit, IPO and succession. Filled in by hand; every id must start with "exit_" (policies and projects) or "e9_exit_" (events). */
export const policies: PolicyDef[] = [
  // 962 Dual-class share structures
  { id: 'exit_share_structure', group: 'finance', name: 'Share structure', blurb: 'Whether every share carries the same say in company decisions.', options: [
    opt('One share, one vote', 'The simple, fair default. Investors like it and nobody gets special treatment.', {}),
    opt('Founder super-votes', 'Your shares carry extra votes, so you keep control. Decisions are quick, and investors and lenders are warier.', { cap: 1.01, rep: -0.03, od: 0.95 }),
    opt('Staff voting trust', 'A trust holds a block of votes for the staff. People feel like owners, and the extra paperwork slows decisions.', { m: 0.3, cap: 0.995 }, 0.1)] },
  // 956 Family-succession planning
  { id: 'exit_family_succession', group: 'people', name: 'Family succession', blurb: 'Succession means who takes over when you step back. In a family firm, that can be a delicate question.', options: [
    opt('No plan yet', 'You will cross that bridge when you come to it.', {}),
    opt('Groom a family heir', 'A family member trains for the top job. They learn fast, and staff outside the family worry about their own prospects.', { rep: 0.01, q: 0.01, m: -0.1 }, 0.4),
    opt('Open contest for the top job', 'Family and staff compete on merit. Fair, and sometimes awkward. Outside candidates cost more to recruit.', { m: 0.1, hire: 1.1 }, 0.2)] },
  // 954 Buyer-shortlist tiers
  { id: 'exit_buyer_tiers', group: 'finance', name: 'Buyer shortlist', blurb: 'Even if you never plan to sell, it helps to know who might buy you one day.', options: [
    opt('Talk to whoever calls', 'No list and no plan. You react when someone shows up.', {}),
    opt('Three-name shortlist', 'Keep three likely buyers warm with the odd coffee and a friendly update.', { rep: 0.02 }, 0.2),
    opt('Tiered list of ten', 'Sort ten possible buyers into tiers, from dream buyer to backup, and stay in touch with all of them. Rumours can leak.', { rep: 0.03, d: 1.005, risk: [3, 1.5, 'A rumour that you were up for sale unsettled the team.'] }, 0.4)] },
  // 970 Post-exit consultancy agreements
  { id: 'exit_consultancy', group: 'people', name: 'Leaver consultancy deals', blurb: 'What happens when a senior person leaves or sells up and still knows where everything is.', options: [
    opt('Clean break', 'They leave on the day, and their know-how walks out with them.', {}),
    opt('Six-month handover contract', 'Leaving leaders stay on as paid consultants for six months to pass on what they know.', { q: 0.01, m: 0.1 }, 0.5),
    opt('Long advisory retainer', 'Former leaders stay on call for years. Wise heads, but also a long shadow over their successors.', { rep: 0.02, c: 0.997, m: -0.1 }, 0.9)] },
  // 974 Staff-retention pools at sale
  { id: 'exit_retention_pool', group: 'people', name: 'Retention pool', blurb: 'A bonus pot paid out to people who stay through a sale or a big change, so your best people do not run for the door.', options: [
    opt('Nothing promised', 'People wonder what a sale would mean for them, and some start looking elsewhere.', {}),
    opt('Pool for key staff', 'A pot is shared among the people any buyer would most want to keep, if they stay.', { m: 0.3, ch: 0.98 }, 0.6),
    opt('Pool for everyone', 'Everyone shares in the pot, so nobody feels left out. It is expensive and very reassuring.', { m: 0.5, ch: 0.97 }, 1.2)] },
];

export const events: EvSpec[] = [
  // 952 Sell-side adviser selection
  { id: 'e9_exit_adviser', title: 'Advisers pitch to run your sale', icon: 'star', good: true, per: 1, cd: 30, min: 24, story: 'Three advisers have each asked for the chance to run a sale if you ever decide to sell. One is a big-name bank, one is a small specialist, and one is your own accountant.', choices: [
    S('bank', 'The big-name bank', 'Costs the most, and the name opens doors.', '', { k: 0.06, acct: 'dealCosts', gamble: { p: 0.7, good: { rep: 2, brand: 1.02 }, bad: { morale: -1 }, goodText: 'The famous name opened doors and set expectations high.', badText: 'You got a junior team, a long bill, and little attention.' } }),
    S('boutique', 'The small specialist', 'Cheaper, and they know your sector well.', '', { k: 0.03, acct: 'dealCosts', gamble: { p: 0.8, good: { rep: 1, quality: 1 }, bad: { rep: -1 }, goodText: 'They knew exactly who would pay well, and gave you smart advice.', badText: 'Their contacts were thinner than they promised.' } }),
    S('accountant', 'Your own accountant', 'Free, and out of their depth.', '', { gamble: { p: 0.45, good: { rep: 1 }, bad: { rep: -2 }, goodText: 'Your accountant did a decent job of tidying things up.', badText: 'They had never run a sale, and it showed to everyone.' } })] },
  // 960 Roadshow meetings with fund managers
  { id: 'e9_exit_roadshow', title: 'Fund managers want to meet you', icon: 'globe', good: true, per: 1, cd: 12, gate: 'listed', story: 'Big investors, known as fund managers, have asked to meet you after your latest results. A roadshow means a few days of pitching to one room after another.', choices: [
    S('road', 'A full week on the road', 'Costs money and uses up your energy.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.7, good: { brand: 1.03, d: E(1.02, 6), rep: 1 }, bad: { morale: -1, quality: -0.5 }, goodText: 'Investors liked your story, and the shares were in demand.', badText: 'A hard week with tough questions, and the business ran on autopilot.' } }),
    S('video', 'Video calls from the office', 'Cheap, and less memorable.', 'You kept the business running and still met the key investors.', { k: 0.005, eff: { rep: 1 } }),
    S('fd', 'Send the finance director alone', 'Free, and investors may wonder where you are.', '', { gamble: { p: 0.5, good: { rep: 1 }, bad: { rep: -2 }, goodText: 'The finance director was calm and clear, and investors were happy.', badText: 'Investors wanted to hear from the boss, and felt snubbed.' } })] },
  // 961 Lock-up periods after listing
  { id: 'e9_exit_lockup', title: 'The lock-up ends', icon: 'key', good: false, per: 1, cd: 24, gate: 'listed', story: 'When you listed, your early investors promised not to sell their shares for a set time. That promise, called a lock-up, is about to end, and some may want to cash in.', choices: [
    S('ask', 'Ask them to stay on', 'Free, and it depends on their goodwill.', '', { gamble: { p: 0.6, good: { rep: 1 }, bad: { rep: -2, brand: 0.98 }, goodText: 'Most agreed to hold on, and confidence stayed firm.', badText: 'A few sold anyway, and the headlines said the early backers were leaving.' } }),
    S('placing', 'Arrange an orderly sale to new investors', 'Costs fees and avoids a messy dump of shares.', 'A planned sale to fresh investors was absorbed without drama.', { k: 0.04, acct: 'dealCosts', eff: { rep: 1 } }),
    S('nothing', 'Do nothing and see', 'Free, and the market may panic.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -3, d: E(0.98, 3) }, goodText: 'Hardly anyone sold, and the day passed quietly.', badText: 'A rush of sellers shook the share price, and customers read the headlines.' } })] },
  // 963 Delisting and going private
  { id: 'e9_exit_goprivate', title: 'An offer to take you private', icon: 'key', good: false, per: 0.8, cd: 40, gate: 'listed', story: 'An investment firm has offered to buy every share and take you off the stock market. Going private means no more public quarterly reports, but a new owner with its own plans.', choices: [
    S('negotiate', 'Negotiate seriously', 'Costs adviser fees and risks a leak.', '', { k: 0.04, acct: 'dealCosts', gamble: { p: 0.6, good: { c: E(0.98, 10), morale: 1 }, bad: { morale: -3 }, goodText: 'You won fair terms and a promise to keep the team. Without the public reporting, you could focus.', badText: 'Word of the talks leaked, and staff panicked about job cuts.' } }),
    S('reject', 'Reject it in public', 'Free, and it shows you are in it for the long run.', 'You told the market you are in it for the long run, and shareholders cheered.', { eff: { brand: 1.01, rep: 1 } }),
    S('silent', 'Say nothing and wait', 'Free, and silence makes people nervous.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -2 }, goodText: 'The offer faded away, and nobody was bothered.', badText: 'The silence made investors nervous, and the rumours grew.' } })] },
  // 964 Liquidation versus sale choices
  { id: 'e9_exit_liquidate', title: 'Sell up or wind down?', icon: 'flame', good: false, per: 0.7, cd: 40, min: 36, story: 'After a tough run, an adviser lays out two paths: sell the business as a going concern, which means a working company that someone else carries on, or liquidate it, which means selling everything, paying the debts and closing. Neither is happy.', choices: [
    S('buyer', 'Look for a buyer', 'Costs adviser fees and could unsettle the team.', '', { k: 0.02, acct: 'dealCosts', gamble: { p: 0.5, good: { rep: 1, morale: 1 }, bad: { morale: -2 }, goodText: 'Interest was real, and it showed the business is worth far more alive than dead.', badText: 'No offers came, and word that you were for sale shook the team.' } }),
    S('equipment', 'Sell off spare equipment', 'Raises cash, and you make do with less.', 'You raised cash by selling kit you could spare, and spent months making do without it.', { income: 0.3, eff: { d: E(0.97, 6), morale: -2 } }),
    S('fight', 'Carry on and fix it', 'Free, and you tell everyone you believe in the business.', 'You decided the business is worth fighting for, and told everybody so.', { eff: { morale: 1, quality: 0.5 } })] },
  // 965 Earn-out structures for founders
  { id: 'e9_exit_earnout', title: 'A buyer proposes an earn-out', icon: 'diamond', good: true, per: 1, cd: 30, min: 36, story: 'A buyer wants a stake in your business. They offer part of the price now and the rest later as an earn-out, which means you only get the rest if the business hits agreed targets.', choices: [
    S('cash', 'Take it all now', 'A bigger cheque, and no reward if the business thrives.', 'A clean sale of the stake and a bigger cheque, but no more reward if the business does well.', { income: 0.5, eff: { morale: -1 } }),
    S('earnout', 'Take the earn-out', 'Less cash now, and the rest depends on how you perform.', '', { income: 0.25, gamble: { p: 0.6, good: { d: E(1.03, 8), morale: 1 }, bad: { morale: -2, rep: -1 }, goodText: 'You hit the targets, and the buyer was delighted. Their support lifted your sales.', badText: 'The buyer meddled, you missed the targets, and the relationship soured.' } }),
    S('no', 'Say no thanks', 'Free, and you keep all the risk and reward.', 'You kept full ownership, and the freedom that comes with it.')] },
  // 968 Asset sale versus share sale
  { id: 'e9_exit_assetsale', title: 'A buyer wants only the best bits', icon: 'parcel', good: false, per: 1, cd: 30, min: 24, story: 'A buyer has offered to take your best product line and its customers, but not the rest. This is an asset sale: they buy chosen parts, rather than the whole company, which would be a share sale.', choices: [
    S('sell', 'Sell the product line', 'Raises cash and costs you sales.', 'The cash was welcome, but a big chunk of your sales went with it and people were anxious.', { income: 0.5, eff: { d: E(0.96, 8), morale: -2 } }),
    S('whole', 'Insist on a whole-company deal or nothing', 'Costs adviser fees and might make them walk away.', '', { k: 0.02, acct: 'dealCosts', gamble: { p: 0.4, good: { rep: 2, brand: 1.02 }, bad: { rep: -1 }, goodText: 'The buyer admired your nerve and came back with a bigger, better offer.', badText: 'The buyer walked away and told the market you were hard to deal with.' } }),
    S('no', 'Say no thanks', 'Free, and the business stays whole.', 'You kept the whole business together.')] },
  // 971 Valuation-bridge between bid and ask
  { id: 'e9_exit_valuationgap', title: 'Far apart on price', icon: 'chart', good: false, per: 1, cd: 24, min: 24, story: 'A buyer\'s offer for a stake in your company is far lower than you think it is worth. There is a gap between what they will pay, the bid, and what you want, the ask.', choices: [
    S('firm', 'Hold firm on your price', 'Free, and they may walk away.', '', { gamble: { p: 0.5, good: { brand: 1.01, rep: 1 }, bad: { rep: -1, morale: -1 }, goodText: 'They came back higher, and it showed you know your worth.', badText: 'They walked away, and word got round that you were hard to deal with.' } }),
    S('bridge', 'Bridge the gap with a staged price', 'Costs a lawyer and builds a middle path.', 'Part was paid now and part tied to results, and both sides could live with it.', { k: 0.02, acct: 'dealCosts', eff: { rep: 1 } }),
    S('accept', 'Accept the low offer', 'Quick cash, and you will always wonder.', 'You took the cash at a cut price, and regretted it a bit.', { income: 0.3, eff: { morale: -1, brand: 0.99 } })] },
  // 972 Competing-bid auctions
  { id: 'e9_exit_auction', title: 'Two buyers want the same stake', icon: 'star', good: true, per: 0.8, cd: 30, min: 24, story: 'Two firms have asked to buy into your company at the same moment, and neither knows about the other. You could play them against each other in a mini auction.', choices: [
    S('auction', 'Run an auction', 'Costs fees, and could push the price up or scare both off.', '', { k: 0.04, acct: 'dealCosts', gamble: { p: 0.65, good: { brand: 1.03, rep: 2, d: E(1.02, 6) }, bad: { rep: -2 }, goodText: 'Bidding rose round after round, and the winner paid handsomely.', badText: 'Both buyers smelt a game and walked away.' } }),
    S('better', 'Pick the better offer now', 'Quick and fair, with no drama.', 'A quick, clean deal that left both of you feeling fairly treated.', { income: 0.3, eff: { rep: 1 } }),
    S('neither', 'Turn both away', 'Free, and nothing changes.', 'You said no to both and kept things as they were.')] },
  // 966 Retirement-fund planning of the owner
  { id: 'e9_exit_pensionpot', title: 'Your pension statement arrives', icon: 'heart', good: true, per: 1, cd: 30, min: 36, story: 'Your own pension statement lands on the doormat. Almost everything you own is tied up in this one company, which is a risky place to keep all your eggs.', choices: [
    S('pay', 'Pay yourself a pension contribution', 'Costs money, and you sleep better.', 'You slept better, and thought more calmly about the long-term future of the business.', { k: 0.03, acct: 'wages', eff: { morale: 1, quality: 0.5 } }),
    S('reinvest', 'Keep reinvesting everything', 'Free now, and you carry all the risk.', '', { gamble: { p: 0.5, good: { d: E(1.02, 8) }, bad: { morale: -1 }, goodText: 'The extra went into growth, and it paid off.', badText: 'Worry about your own future crept into your decisions.' } }),
    S('slice', 'Sell a small slice to a friendly investor', 'Raises cash, and a little looks like cashing out.', 'A little cash for your retirement pot, and a new name on the share register.', { income: 0.25, eff: { rep: -1 } })] },
  // 975 Reputation-after-exit rankings
  { id: 'e9_exit_afterglow', title: 'A magazine ranks departing bosses', icon: 'crown', good: true, per: 0.8, cd: 36, min: 36, story: 'A business magazine is ranking leaders by how they left their companies: did staff, customers and suppliers all do well after they left? They ask about your own plans for handing over.', choices: [
    S('open', 'Share your handover plan and invite staff to comment', 'Cheap, honest and a little exposed.', 'Staff spoke warmly, and the magazine called you a boss who builds things that last.', { k: 0.005, acct: 'marketing', eff: { rep: 2, brand: 1.01 } }),
    S('polish', 'Enter a polished submission', 'Costs more, and could look like showing off.', '', { k: 0.015, acct: 'marketing', gamble: { p: 0.6, good: { rep: 2, brand: 1.02 }, bad: { rep: -1 }, goodText: 'It was slick and it won praise.', badText: 'It looked like self-promotion, and some staff rolled their eyes.' } }),
    S('decline', 'Decline to take part', 'Free, and your work speaks for itself.', 'You let your work speak for itself and got on with the job.')] },
];

export const projects: InitiativeDef[] = [
  // 951 Exit-readiness scorecard
  { id: 'exit_readiness_scorecard', name: 'Score your exit-readiness', blurb: 'Grade your business on the things a buyer would check: clean books, loyal customers, and a team that can run without you.', k: 0.4, months: 3, success: 85,
    win: { eff: { c: 0.996, rep: 0.02 }, text: 'The scorecard showed where you were weak, and tidying those up made you stronger whether or not you ever sell.' },
    lose: { now: { morale: -1 }, text: 'The scorecard made grim reading, and some of the team started to wonder if you were selling up.' } },
  // 953 Vendor-due-diligence report
  { id: 'exit_vendor_due_diligence', name: 'Commission a vendor due diligence report', blurb: 'Due diligence is the deep check a buyer makes before paying. A vendor report means you do it first, so there are no nasty surprises.', k: 0.8, months: 4, success: 80,
    win: { eff: { rep: 0.03, c: 0.996 }, text: 'The report found only small problems. You fixed them, and the business looked sharper and better run.' },
    lose: { now: { c: E(1.02, 4) }, text: 'The report found real problems, and fixing them cost you extra for a few months.' } },
  // 955 Employee-ownership-trust sale
  { id: 'exit_employee_ownership_trust', name: 'Sell to an employee ownership trust', blurb: 'A trust owns the company on behalf of all the staff, and pays you for it over time out of future profits.', k: 2.5, months: 12, success: 55,
    win: { eff: { m: 0.5, ch: 0.98, cap: 1.01 }, monthly: 0.4, now: { morale: 4 }, text: 'The staff became owners. People worked like it was their own company, because it was, and payments to you are made each month.' },
    lose: { now: { morale: -3 }, text: 'The numbers did not add up and the talks collapsed. People who had hoped to become owners were let down.' } },
  // 957 Phased-handover to a successor
  { id: 'exit_phased_handover', name: 'Hand over to a successor in stages', blurb: 'Over a year, your successor takes on more of your job month by month, while you step back.', k: 0.8, months: 12, success: 75,
    win: { eff: { cap: 1.01, m: 0.2, rep: 0.02 }, text: 'The handover was smooth, and the business now runs well without any one person at the centre.' },
    lose: { now: { morale: -2, c: E(1.02, 3) }, text: 'The successor quit halfway through, and you had to step back in to steady things.' } },
  // 958 Pre-IPO clean-up of the cap table
  { id: 'exit_cap_table_cleanup', name: 'Tidy up your cap table', blurb: 'A cap table is the list of who owns what share of the company. Messy old promises put investors off, so sort them out before you list.', k: 0.7, months: 5, success: 85,
    win: { eff: { od: 1.1, rep: 0.02 }, text: 'One clean list of owners, and lenders and investors saw you as serious.' },
    lose: { now: { rep: -1, c: E(1.02, 3) }, text: 'An old shareholder dug in, and sorting things out cost extra in lawyers.' } },
  // 959 IPO-prospectus drafting
  { id: 'exit_prospectus', name: 'Draft your listing prospectus', blurb: 'A prospectus is the long document that tells investors everything about your company before you list on the stock market.', k: 1.5, months: 6, success: 75,
    win: { eff: { rep: 0.03 }, monthly: 0.2, now: { brand: 1.02, rep: 2 }, text: 'The regulator approved it, and the process taught you to run the company in the open. Reporting each month now costs a little.' },
    lose: { now: { morale: -2 }, text: 'The regulator sent it back with a long list of questions, and the team burned out answering them.' } },
  // 967 Management-buyout financing stack
  { id: 'exit_mbo_financing', name: 'Line up a management buyout', blurb: 'Your managers buy the company themselves. The hard part is finding the money, which is usually borrowed from several sources.', k: 1.5, months: 8, success: 55,
    win: { eff: { m: 0.3, cap: 1.02, od: 0.9 }, monthly: 0.8, text: 'The managers became owners and worked harder than ever. The debts they took on cost you each month.' },
    lose: { now: { morale: -3 }, text: 'The banks said no. The managers were frustrated, and one handed in their notice.' } },
  // 969 Legacy-brand licence after exit
  { id: 'exit_brand_licence', name: 'License your brand name', blurb: 'Let another firm use your brand on their products, and collect a royalty, which is a small slice of their sales.', k: 0.5, months: 5, success: 70,
    win: { eff: { br: 1.001 }, monthly: -0.5, text: 'The partner did a good job, your name reached new shelves, and royalties arrive every month.' },
    lose: { now: { brand: 0.97 }, text: 'The partner made shoddy products with your name on them, and your brand took a knock.' } },
  // 973 Tax planning on exit
  { id: 'exit_tax_planning', name: 'Plan your exit tax early', blurb: 'The tax bill on selling a business can be huge. Get a specialist adviser to plan ahead and use every legal relief.', k: 0.4, months: 6, success: 80,
    win: { monthly: -0.4, text: 'The adviser found several legal reliefs, and the savings add up every month.' },
    lose: { now: { rep: -1 }, text: 'The adviser\'s scheme looked too clever, and the tax office asked awkward questions.' } },
];
