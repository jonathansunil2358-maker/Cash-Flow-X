import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Equity and investors. Filled in by hand; every id must start with "equity_" (policies and projects) or "e9_equity_" (events). */
export const policies: PolicyDef[] = [
  // 478 Investor-update letters that shape sentiment
  { id: 'equity_updates', group: 'finance', name: 'Investor update letters', blurb: 'What you tell your backers, and how often. People who hear from you stay calm when the news is bad.', options: [
    opt('Only when asked', 'You share news when investors ask for it. Cheap, but silence makes people nervous.', {}),
    opt('Short monthly note', 'A few honest lines on sales, cash and what comes next. Backers feel included.', { rep: 0.02 }, 0.05),
    opt('Full letter, bad news too', 'Frank numbers and plain talk build deep trust, but they take real time to write and can be quoted back at you.', { rep: 0.04, risk: [3, 2, 'A frank line in your investor letter was quoted out of context.'] }, 0.2)] },
  // 480 Board seat negotiation with new investors
  { id: 'equity_boardseat', group: 'finance', name: 'Board seats for investors', blurb: 'Who sits at the top table when investors put money in. A board is the small group that signs off the big decisions.', options: [
    opt('Founders keep the board', 'You and your team make the big calls alone.', {}),
    opt('Observer seat', 'An observer listens and advises but cannot vote. A cheap way to keep backers happy.', { rep: 0.02 }, 0.05),
    opt('Full board seat', 'The lead investor votes on big decisions. They bring contacts and credibility, and the team feels watched.', { od: 1.1, rep: 0.03, m: -0.1 }, 0.1)] },
  // 481 Share-class design with preference terms
  { id: 'equity_shareclasses', group: 'finance', name: 'Share classes', blurb: 'Different kinds of shares carry different rights. Preference terms mean some investors get paid back first if the firm is sold.', options: [
    opt('One class of ordinary shares', 'Everyone is treated the same. Simple and fair.', {}),
    opt('Preferred shares for investors', 'Investors are repaid first in a sale, so they back you more readily. Staff and founders can feel they are at the back of the queue.', { od: 1.12, m: -0.1 }, 0.05, 0.5),
    opt('Growth shares for the team', 'A special class that only gains value once the firm grows past a target. Motivating for staff, fiddly for investors.', { m: 0.3, od: 0.95 }, 0.05, 0.4)] },
  // 482 Employee-share option vesting schedules
  { id: 'equity_vesting', group: 'people', name: 'Share option vesting', blurb: 'Vesting means staff earn their share options a little at a time, so they have a reason to stay.', options: [
    opt('No set schedule', 'Options are handed over straight away, so people can leave with them.', {}),
    opt('Two years, month by month', 'Options are earned steadily over two years. A gentle reason to stay.', { ch: 0.985, m: 0.15 }, 0.1),
    opt('Four years with a one-year cliff', 'Nothing is earned in the first year (the cliff), then it builds for three more. Strong loyalty, but some recruits want a quicker deal.', { ch: 0.96, m: 0.1, hire: 1.05 }, 0.15)] },
  // 487 Founder vesting clauses
  { id: 'equity_founders', group: 'finance', name: 'Founder vesting clause', blurb: 'Investors often ask founders to earn their own shares over time, so nobody can walk away with everything after a few months.', options: [
    opt('Founders own shares outright', 'No strings. Some investors will not like it.', {}),
    opt('Four-year founder vesting', 'Investors feel safer. The founders feel the leash.', { od: 1.08, rep: 0.02, m: -0.1 }, 0, 0.4),
    opt('Vesting with good-leaver cover', 'The same promise, but you keep your shares if you are pushed out unfairly. Costs more to draft.', { od: 1.05, rep: 0.015 }, 0.05, 0.7)] },
  // 491 Dividend expectations from minority holders
  { id: 'equity_dividends', group: 'finance', name: 'Dividend policy', blurb: 'A dividend is a share of the profit paid out to the people who own the company. Small holders often expect one.', options: [
    opt('Keep profits in the business', 'All the money stays to fund growth. Minority holders may grumble.', {}),
    opt('Small steady dividend', 'A regular payout keeps minority holders content and stops the awkward emails.', { rep: 0.02 }, 0.6),
    opt('Generous dividend', 'Holders are delighted, and the company has less cash cushion for a bad month.', { rep: 0.04, od: 0.95 }, 1.4)] },
  // 494 Warrants attached to loans
  { id: 'equity_warrants', group: 'finance', name: 'Warrants on loans', blurb: 'A warrant is a right to buy shares later at today\'s price. Lenders will take them as a sweetener, so your borrowing costs less.', options: [
    opt('Plain loans only', 'Lenders get interest and nothing else.', {}),
    opt('Small warrants', 'The lender gets a right to a small slice of shares. Loans cost less and credit lines stretch further.', { od: 1.08, risk: [3, 3, 'The lender holding warrants asked for extra meetings and reports.'] }, -0.2, 0.3),
    opt('Big warrants', 'A real slice of the company goes to the lender. Much cheaper credit, and a lender who watches you closely.', { od: 1.18, risk: [8, 5, 'The lender with big warrants pushed for a say, and sorting it out cost time and fees.'] }, -0.35, 0.5)] },
  // 496 Takeover defences and poison pills
  { id: 'equity_takeover', group: 'finance', name: 'Takeover defences', blurb: 'Rules that make it harder for a stranger to buy control of your company against your wishes.', options: [
    opt('No defences', 'A bidder only has to persuade your shareholders.', {}),
    opt('Staggered board terms', 'Only some directors face re-election each year, so a bidder cannot replace the board overnight.', { m: 0.1, rep: -0.01 }, 0.05),
    opt('Poison pill', 'If a bidder grabs too large a stake, everyone else may buy shares cheaply, which makes a hostile bid very costly. Staff feel safe, and outside investors dislike it.', { m: 0.2, rep: -0.02 }, 0.1, 0.6)] },
  // 498 Insider-trading rules and blackout periods
  { id: 'equity_blackouts', group: 'finance', name: 'Dealing code and blackouts', blurb: 'A blackout period is a time when people who know unpublished news must not buy or sell shares. Doing so is insider trading, which is a crime.', options: [
    opt('Common sense only', 'You trust people to behave. Hope is not a policy.', {}),
    opt('Written dealing code', 'Directors must ask permission before trading, and never trade just before results.', { rep: 0.03, m: -0.05 }, 0.05, 0.2),
    opt('Strict rules for everyone', 'Anyone who sees results early must clear every trade first. Very safe, and a little irritating.', { rep: 0.05, m: -0.2 }, 0.12, 0.3)] },
];

export const events: EvSpec[] = [
  // 476 Angel investor with strong opinions
  { id: 'e9_equity_angel', title: 'An angel with strong opinions', icon: 'diamond', good: false, per: 1.2, cd: 24, min: 12,
    story: 'One of your angel investors (a private person who put their own money into your firm) has views on your logo, your prices and who you should hire. Their emails arrive at midnight.', choices: [
      S('listen', 'Listen and take what is useful', 'Costs time, and their contacts can help.', '', { gamble: { p: 0.6, good: { d: E(1.02, 6), quality: 1 }, bad: { morale: -2 }, goodText: 'Two of their ideas were gold, and one introduction led to a sale.', badText: 'You followed advice that did not suit you, and the team grumbled.' } }),
      S('calls', 'Agree one call a month and nothing more', 'Sets limits and keeps the peace.', 'A fixed slot tamed the midnight emails, and everyone knew where they stood.', { eff: { morale: 1 } }),
      S('pushback', 'Politely push back', 'You stay in charge, but they may sulk.', '', { gamble: { p: 0.55, good: { quality: 1, morale: 1 }, bad: { rep: -2 }, goodText: 'They respected the line you drew and became more useful.', badText: 'They told other investors you were hard to work with.' } })] },
  // 479 Pre-emption rights when you issue shares
  { id: 'e9_equity_preemption', title: 'Early backers want first dibs', icon: 'flag', good: false, per: 1, cd: 30, min: 18,
    story: 'You want to issue new shares, but your early backers have pre-emption rights: the right to buy new shares first, so their slice is not watered down. Some want to use it, and some cannot afford to.', choices: [
      S('honour', 'Honour it and offer them first', 'Fair, slow and a little expensive in legal fees.', 'Your backers were glad to be asked first, and the share issue went through cleanly.', { k: 0.02, acct: 'dealCosts', eff: { rep: 1 } }),
      S('waive', 'Ask them to waive the right', 'Quick if they agree, tense if they do not.', '', { gamble: { p: 0.55, good: { rep: 1, morale: 1 }, bad: { rep: -2 }, goodText: 'They waived it after a thank-you, and the deal moved fast.', badText: 'Two of them felt bulldozed, and said so to other investors.' } }),
      S('wait', 'Drop the share issue for now', 'No fuss, but your plans wait.', 'You shelved the plan, and slower growth showed up in sales for a while.', { eff: { d: E(0.99, 4) } })] },
  // 485 Down-round pain and anti-dilution clauses
  { id: 'e9_equity_downround', title: 'A down round is on offer', icon: 'alert', good: false, per: 1, cd: 36, min: 18,
    story: 'A new investor will only back you at a lower company value than last time. That is called a down round. An early investor has an anti-dilution clause, which hands them extra shares to make up for the lower price, and that squeezes everyone else, including your staff\'s options.', choices: [
      S('accept', 'Accept the lower price', 'The money arrives, and staff options lose value.', 'The cash funded a push for growth, but people checked what their options were now worth, and went quiet.', { eff: { morale: -3, d: E(1.03, 8) } }),
      S('negotiate', 'Negotiate the clause away', 'Legal fees, and a fair chance of a kinder deal.', '', { k: 0.03, acct: 'dealCosts', gamble: { p: 0.55, good: { d: E(1.03, 8), morale: -1 }, bad: { morale: -3, rep: -1 }, goodText: 'The early investor gave ground, and the round closed with a lighter sting.', badText: 'Talks dragged on, the news leaked, and staff feared the worst.' } }),
      S('refuse', 'Refuse and cut costs instead', 'Keep your price and your pride, and grow slower.', 'You trimmed spending and slowed down. The team felt the squeeze, though your valuation stayed whole.', { eff: { c: E(0.99, 6), d: E(0.98, 6), morale: -1 } })] },
  // 486 Investor exit pressure at year five
  { id: 'e9_equity_exitpressure', title: 'Investors want their money back', icon: 'flame', good: false, per: 1, cd: 36, min: 60,
    story: 'It is about year five. Your early investors expected an exit (a sale of the company or a stock-market listing) by now so they can cash out. They have started asking, with growing impatience, when it will happen.', choices: [
      S('promise', 'Promise a sale or listing within two years', 'Calms them, but the clock is ticking for everyone.', 'The investors relaxed. The team was less relaxed once they heard about a deadline.', { eff: { rep: 1, morale: -2 } }),
      S('buyout', 'Buy out the keenest ones', 'Costs real money, and clears the pressure.', 'You bought the impatient holders out, and the room felt lighter.', { k: 0.08, acct: 'dealCosts', eff: { rep: 1, morale: 1 } }),
      S('patience', 'Ask for more patience', 'Free, if they believe your plan.', '', { gamble: { p: 0.5, good: { rep: 1 }, bad: { rep: -2, morale: -1 }, goodText: 'Your plan convinced them, and they agreed to wait.', badText: 'They lost faith, and the gossip hurt your name.' } })] },
  // 488 Valuation methods debate: multiples versus cash flow
  { id: 'e9_equity_valuation', title: 'Multiples or cash flow?', icon: 'chart', good: true, per: 1, cd: 30, min: 18,
    story: 'Two advisers disagree about what your company is worth. One says to multiply your earnings by what similar firms sell for (a multiple). The other says to forecast your cash for years ahead and shrink it back to today\'s money (a discounted cash flow). Whichever number you pick will frame every investor chat.', choices: [
      S('multiple', 'Go with the market multiple', 'Quick and easy to explain, but it follows the mood of the market.', '', { gamble: { p: 0.55, good: { rep: 1, brand: 1.01 }, bad: { rep: -1 }, goodText: 'Investors nodded: it sounded like the deals they already knew.', badText: 'The market mood had soured, and your number looked cheeky.' } }),
      S('dcf', 'Build a cash-flow forecast', 'Slow, and it costs adviser fees, but it teaches you a lot.', 'The forecast exposed two leaky habits in your business and you fixed them.', { k: 0.02, acct: 'otherCosts', eff: { quality: 2 } }),
      S('both', 'Show both and explain why', 'Credible with careful investors, and the most work.', 'Showing your workings made you look serious, and the talks were smooth.', { k: 0.04, acct: 'otherCosts', eff: { rep: 2 } })] },
  // 490 Term-sheet comparisons with hidden catches
  { id: 'e9_equity_termsheets', title: 'Three term sheets arrive', icon: 'key', good: true, per: 1.2, cd: 24, min: 12,
    story: 'Three investors have sent term sheets (a short list of the main terms before the long contracts). One offers the highest price, one offers the plainest terms, and the third has a long list of conditions. Somewhere in the small print are catches.', choices: [
      S('highest', 'Take the highest price', 'The headline looks great. The catches may not.', '', { gamble: { p: 0.45, good: { d: E(1.04, 8), brand: 1.02 }, bad: { morale: -3, c: E(1.03, 8) }, goodText: 'The catches were harmless, and the extra money powered growth.', badText: 'A hidden clause let the investor veto spending, and everything slowed down.' } }),
      S('lawyer', 'Pay a lawyer to read every line', 'Costs fees, and finds the catches.', 'The lawyer found two nasty clauses and got them removed, so you signed a fair deal.', { k: 0.04, acct: 'dealCosts', eff: { rep: 1, d: E(1.02, 6) } }),
      S('plain', 'Take the plain offer at a lower price', 'Less money, no surprises.', 'A smaller cheque, a short contract and a good night\'s sleep.', { eff: { morale: 1, d: E(1.01, 6) } })] },
  // 493 Shareholder agreements and deadlocks
  { id: 'e9_equity_deadlock', title: 'The owners are deadlocked', icon: 'flag', good: false, per: 1, cd: 40, min: 24,
    story: 'Two big shareholders each have a veto on an important decision, and they disagree, so nothing can move. The shareholders\' agreement (the rule book between owners) should say what to do when this happens, but yours is vague.', choices: [
      S('mediator', 'Bring in a mediator', 'Costs fees, and usually finds a middle path.', 'The mediator found a compromise that neither side loved and both could live with.', { k: 0.02, acct: 'dealCosts', eff: { morale: 1, rep: 1 } }),
      S('casting', 'Use the chairman\'s casting vote', 'Quick, and one side will be annoyed.', '', { gamble: { p: 0.6, good: { rep: 1 }, bad: { morale: -3, rep: -1 }, goodText: 'The vote settled it, and the losing side accepted the result.', badText: 'The losing side felt robbed, and the row spilled into the office.' } }),
      S('buyout', 'Buy one holder out', 'Ends the argument for good, at a high price.', 'The shares changed hands, and the firm could finally make decisions again.', { k: 0.08, acct: 'dealCosts', eff: { morale: 2, d: E(1.02, 6) } })] },
  // 495 Investor-relations meetings if listed
  { id: 'e9_equity_irmeeting', title: 'Analysts ask for a meeting', icon: 'chat', good: true, per: 1.2, cd: 18, gate: 'listed',
    story: 'Because your shares are listed, analysts (people paid to study companies and rate them) and big investors want a meeting. An investor-relations meeting is where you explain your results and plans, and what you say can move the share price.', choices: [
      S('roadshow', 'Run a full roadshow', 'Costs money and travel, and builds real confidence.', 'Meeting investors in person paid off, and the coverage afterwards was glowing.', { k: 0.03, acct: 'marketing', eff: { rep: 2, brand: 1.01 } }),
      S('calls', 'Hold short video calls', 'Cheap, with a lighter touch.', 'The calls were short and clear, and investors were broadly happy.', { k: 0.005, acct: 'otherCosts', eff: { rep: 1 } }),
      S('note', 'Send a results note only', 'Free, but silence worries investors.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -2 }, goodText: 'Nobody minded, and the shares barely moved.', badText: 'Analysts read the silence as bad news and marked you down.' } })] },
  // 497 Share-price volatility for listed firms
  { id: 'e9_equity_volatility', title: 'Your share price lurches', icon: 'bolt', good: false, per: 1.2, cd: 14, gate: 'listed',
    story: 'Your share price fell sharply in a single day, on a rumour with no truth in it. Share prices can swing wildly, and staff who own shares are watching their screens instead of working.', choices: [
      S('update', 'Publish a clear trading update', 'Cheap and honest: facts calm markets.', 'The facts were clear, and the price crept back.', { k: 0.01, acct: 'marketing', eff: { rep: 1 } }),
      S('buyback', 'Buy back some shares to steady it', 'Costs real money and may only buy a short rest.', '', { k: 0.05, acct: 'dealCosts', gamble: { p: 0.6, good: { rep: 2 }, bad: { morale: -1 }, goodText: 'The buyback showed confidence, and the price steadied.', badText: 'The price slipped again, and the buyback looked like a waste.' } }),
      S('wait', 'Say nothing and wait', 'Free. Markets often calm themselves.', '', { gamble: { p: 0.5, good: {}, bad: { morale: -2, rep: -1 }, goodText: 'The rumour died, and so did the panic.', badText: 'The rumour grew, and nobody was answering questions.' } })] },
  // 499 Annual general meeting votes
  { id: 'e9_equity_agm', title: 'The annual general meeting', icon: 'flag', good: false, per: 1.2, cd: 12, min: 12,
    story: 'It is time for your AGM (annual general meeting), the yearly gathering where shareholders vote on the board and on pay. A couple of loud holders have said they will vote against the pay plan.', choices: [
      S('brief', 'Brief the big holders beforehand', 'A little time buys you a lot of goodwill.', 'The calls took a week, and the votes passed easily.', { k: 0.005, acct: 'otherCosts', eff: { rep: 1 } }),
      S('linked', 'Tie bosses\' pay to results', 'Fair to everyone, and it can bite when the year is bad.', '', { gamble: { p: 0.65, good: { rep: 2, morale: 1 }, bad: { rep: -1 }, goodText: 'Holders loved the link between pay and results, and the vote was warm.', badText: 'A weak quarter made the rule look like a trap.' } }),
      S('unprepared', 'Go in unprepared', 'Free and risky.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -3, morale: -1 }, goodText: 'It passed on the nod, and nobody asked awkward questions.', badText: 'A loud vote against you made the news, and staff noticed.' } })] },
  // 500 Stock-split decision
  { id: 'e9_equity_split', title: 'Time to split the shares?', icon: 'chart', good: true, per: 0.8, cd: 40, gate: 'listed',
    story: 'Your share price is high, and small investors say it feels out of reach. A stock split cuts each share into several smaller ones, so each costs less. Nothing else changes: everyone owns the same slice of the same company.', choices: [
      S('two', 'Split two for one', 'Looks friendly, and costs a little admin.', '', { k: 0.01, acct: 'dealCosts', gamble: { p: 0.7, good: { brand: 1.02, rep: 1 }, bad: { rep: -1 }, goodText: 'More small investors bought in, and the buzz helped your name.', badText: 'Commentators called it a gimmick.' } }),
      S('ten', 'Split ten for one', 'Big headlines, bigger admin, and it can look like showing off.', '', { k: 0.02, acct: 'dealCosts', gamble: { p: 0.5, good: { brand: 1.03, d: E(1.01, 4) }, bad: { rep: -2 }, goodText: 'The split made headlines, and shoppers noticed your name.', badText: 'It looked desperate, and the press was snippy.' } }),
      S('leave', 'Leave the price alone', 'Free. A high price signals confidence to some.', 'You kept things simple, and nothing changed.')] },
];

export const projects: InitiativeDef[] = [
  // 483 Secondary share sale for early holders
  { id: 'equity_secondary', name: 'Secondary share sale', blurb: 'Early shareholders sell some of their shares to a new buyer. The company gets no new money, but your oldest backers and first staff get a chance to cash in some of their hard work.',
    k: 0.5, months: 4, success: 65,
    win: { eff: { ch: 0.98 }, now: { morale: 2, rep: 1 }, text: 'A buyer was found at a fair price. Early holders took some money off the table, and your first staff felt properly rewarded.' },
    lose: { now: { morale: -2, rep: -1 }, text: 'No buyer would pay what the early holders wanted, and they felt stuck.' } },
  // 484 Crowd-equity campaign with many small holders
  { id: 'equity_crowd', name: 'Crowd-equity campaign', blurb: 'Invite thousands of ordinary people to buy a small slice of your company online. The campaign costs a lot to run, and the real prize is a crowd of fans who are also part-owners.',
    k: 0.9, months: 4, success: 55,
    win: { eff: { d: 1.02 }, monthly: 0.15, now: { brand: 1.03, rep: 2 }, text: 'The campaign took off. Thousands of small holders now cheer you on and buy from you, though keeping them informed costs time and postage.' },
    lose: { now: { rep: -2, brand: 0.99 }, text: 'The campaign missed its target in public, and the press said so.' } },
  // 489 Due-diligence data room preparation
  { id: 'equity_dataroom', name: 'Build a tidy data room', blurb: 'A data room is an online folder with every contract, account and record a buyer or investor will want to check (that checking is called due diligence). Getting it in order takes work and makes deals smoother.',
    k: 0.4, months: 3, success: 85,
    win: { eff: { od: 1.08 }, monthly: 0.05, now: { quality: 1, rep: 1 }, text: 'Everything is filed, signed and findable. Lenders and investors trust a firm that can answer questions fast.' },
    lose: { now: { morale: -1, rep: -1 }, text: 'The tidy-up turned up missing contracts and unsigned forms. It is fixable, but it was embarrassing.' } },
  // 492 Strategic investor from a larger firm
  { id: 'equity_strategic', name: 'Court a strategic investor', blurb: 'A strategic investor is a bigger company that buys a stake because your business fits theirs. They open doors to new customers, and they expect favours in return.',
    k: 0.8, months: 6, success: 45,
    win: { eff: { d: 1.03, c: 1.01 }, now: { rep: 2 }, text: 'A larger firm took a stake. Their customers started buying from you, and you agreed to buy some supplies from them on slightly worse terms.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'The larger firm lost interest after months of meetings, and the team felt let down.' } },
];
