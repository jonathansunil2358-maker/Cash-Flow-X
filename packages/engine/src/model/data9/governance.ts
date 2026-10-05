import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Governance and board. Filled in by hand; every id must start with "governance_" (policies and projects) or "e9_governance_" (events). */
export const policies: PolicyDef[] = [
  // 926 Board-composition choices
  { id: 'governance_board_mix', group: 'finance', name: 'Board composition', blurb: 'Who sits on the board of directors, the group that checks your biggest decisions.', options: [
    opt('Founders only', 'You and your co-founders decide everything, quickly and without outside questions.', {}),
    opt('Founders plus advisers', 'Experienced outsiders join the board. They cost fees and sometimes say no, but they spot mistakes.', { rep: 0.03, c: 0.998 }, 0.3),
    opt('Investor-led board', 'Investors fill most of the seats. Lenders relax, though the team starts to feel watched.', { od: 1.1, rep: 0.02, m: -0.1 }, 0.4)] },
  // 928 Audit-committee oversight
  { id: 'governance_audit_committee', group: 'finance', name: 'Audit committee', blurb: 'A small group of directors who question the accounts and the outside auditors.', options: [
    opt('Whole board reads the accounts', 'Everyone glances at the numbers, and nobody owns the hard questions.', {}),
    opt('Meets twice a year', 'A small committee goes through the accounts and the auditors\' findings twice a year.', { rep: 0.02, od: 1.05 }, 0.25),
    opt('Meets every quarter', 'Tough questions four times a year. Lenders trust you more, and your finance team feels the pressure.', { rep: 0.03, od: 1.1, c: 0.998, m: -0.1 }, 0.6)] },
  // 929 Remuneration-committee decisions
  { id: 'governance_pay_committee', group: 'people', name: 'Pay committee', blurb: 'Who decides how much the top people are paid.', options: [
    opt('You set top pay yourself', 'Quick and private, and nobody can say whether it is fair.', {}),
    opt('Committee links pay to targets', 'A small committee ties top pay to results. People see that pay is earned, not handed out.', { m: 0.15, cap: 1.01 }, 0.3),
    opt('Committee caps and publishes pay', 'Top pay is limited and shown openly. Staff cheer, but senior hires are harder and dearer to land.', { m: 0.3, rep: 0.03, hire: 1.1 }, 0.1)] },
  // 932 Conflict-of-interest declarations
  { id: 'governance_conflicts', group: 'people', name: 'Conflict-of-interest rules', blurb: 'A conflict of interest is when someone could gain personally from a company decision, such as picking a relative\'s firm as a supplier.', options: [
    opt('Trust everyone', 'No paperwork. You assume people will do the right thing.', {}),
    opt('Yearly declarations', 'Directors and managers write down any outside interests once a year.', { rep: 0.02 }, 0.05, 0.2),
    opt('Declare and step out', 'Anyone with an interest in a decision must say so and leave the room. Cleaner, but meetings get a little slower.', { rep: 0.04, cap: 0.995 }, 0.1, 0.2)] },
  // 934 Delegated-authority limits
  { id: 'governance_authority', group: 'ops', name: 'Spending limits', blurb: 'Who is allowed to approve spending, and up to what amount.', options: [
    opt('Owner signs off everything', 'Nothing moves without you. Safe, and a bottleneck.', {}),
    opt('Managers sign small spends', 'Managers approve spending up to a set limit without asking. Work speeds up, and the odd spend slips through.', { cap: 1.02, m: 0.15, risk: [3, 2, 'A manager approved a spend that should have gone higher up.'] }),
    opt('Board signs the big ones', 'Anything large needs the board. You save money and lose some speed.', { c: 0.996, cap: 0.99 }, 0.1)] },
  // 936 Annual-report storytelling
  { id: 'governance_annual_report', group: 'customers', name: 'Annual report', blurb: 'The yearly report that tells owners, customers and the public how the year went.', options: [
    opt('Numbers only', 'The legal minimum: accounts and not much else.', {}),
    opt('Plain-English story', 'Explain in simple words what happened this year, what went wrong and what comes next.', { rep: 0.03 }, 0.2),
    opt('Glossy brochure', 'Beautiful photos and big claims. It looks impressive, and costs a lot to print and design.', { br: 1.002, rep: 0.02 }, 0.8)] },
  // 937 Shareholder-communication rules
  { id: 'governance_investor_comms', group: 'finance', name: 'Telling shareholders', blurb: 'Shareholders own a slice of your company. How often do you tell them what is going on?', options: [
    opt('Tell them when we can', 'No fixed rules, and no fixed promises.', {}),
    opt('Quarterly letter', 'A short, honest letter every three months. Owners and lenders feel in the loop.', { rep: 0.02, od: 1.05 }, 0.2),
    opt('Open-door calls', 'Shareholders can ring you and ask anything. Trust rises, and so does the time you spend on the phone.', { rep: 0.04, od: 1.1, cap: 0.99 }, 0.4)] },
  // 945 Dividend-policy statements
  { id: 'governance_dividend_policy', group: 'finance', name: 'Dividend promise', blurb: 'A dividend is a share of the profit paid out to the owners. What do you tell them to expect?', options: [
    opt('Decide each year', 'No promises. You choose after the year ends.', {}),
    opt('Steady dividend', 'You promise a regular payout. Owners trust you, and there is less cash left in the till.', { rep: 0.03, od: 0.92 }, 0.3),
    opt('Keep the profits in', 'Nothing paid out, so you hold a bigger cash cushion. Owners grumble.', { od: 1.1, rep: -0.02 })] },
  // 947 Subsidiary-governance rules
  { id: 'governance_subsidiary_rules', group: 'ops', name: 'Rules for businesses you own', blurb: 'A subsidiary is a company you own. As your group grows, how much control does the centre keep?', options: [
    opt('Each one does its own thing', 'Freedom for local managers, and no common standards.', {}),
    opt('Light group rules', 'A few shared rules on reporting and who signs what. Costs fall as waste is spotted.', { c: 0.997 }, 0.2),
    opt('Strict group control', 'The centre approves everything. Savings follow, but local managers move slowly.', { c: 0.993, cap: 0.98, rep: 0.01 }, 0.5)] },
  // 949 Lobbying-disclosure policy
  { id: 'governance_lobbying', group: 'customers', name: 'Lobbying disclosure', blurb: 'Lobbying means trying to persuade politicians and officials. Do you do it in public or in private?', options: [
    opt('Keep it private', 'Talk to officials without telling anyone, and hope nobody asks.', {}),
    opt('Publish who we meet', 'List every meeting with officials and what you asked for. People respect the openness.', { rep: 0.04 }, 0.1),
    opt('No lobbying at all', 'Stay out of politics completely. Clean, but rules can change without your say.', { rep: 0.03, c: 1.004 })] },
];

export const events: EvSpec[] = [
  // 931 Strategy away-days
  { id: 'e9_governance_awayday', title: 'Time for a strategy away-day', icon: 'mountain', good: true, per: 1, cd: 18, min: 12, story: 'Your directors suggest a day or two away from the office to think about the next three years, with no emails and no interruptions.', choices: [
    S('retreat', 'Two days at a country venue', 'Costs money, and could produce a big idea.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.7, good: { d: E(1.02, 8), morale: 1 }, bad: { morale: -1 }, goodText: 'You came back with a clear plan and a sharper focus.', badText: 'Lots of talk, lots of biscuits, and not much changed.' } }),
    S('afternoon', 'An afternoon in the office', 'Cheap and focused, with fewer big ideas.', 'You agreed three priorities and stuck them on the wall.', { k: 0.005, eff: { quality: 0.5 } }),
    S('skip', 'Skip it, we are too busy', 'Free, and nobody steps back to think.', 'Everyone stayed busy, and nobody looked up from the day-to-day.')] },
  // 935 Succession plan for the chair
  { id: 'e9_governance_chair', title: 'The chair wants to step down', icon: 'crown', good: false, per: 0.8, cd: 40, min: 36, story: 'The chair, the person who leads your directors\' meetings, says they will step down at the end of the year. Someone has to take over.', choices: [
    S('promote', 'Promote a director', 'Someone who knows the business, though others may be jealous.', '', { gamble: { p: 0.65, good: { rep: 1, quality: 1 }, bad: { morale: -2 }, goodText: 'The new chair knew the business well, and the handover was smooth.', badText: 'A passed-over director sulked and hinted at leaving.' } }),
    S('outsider', 'Recruit an outside chair', 'Costs a search fee and brings fresh eyes.', 'A respected outsider took the chair, and the board took your plans more seriously.', { k: 0.04, acct: 'otherCosts', eff: { rep: 2 } }),
    S('stay', 'Ask the chair to stay a while longer', 'Free, and only delays the problem.', '', { gamble: { p: 0.5, good: {}, bad: { morale: -2, quality: -1 }, goodText: 'They agreed to one more year, which bought you time to plan.', badText: 'They stayed, but their heart was elsewhere and meetings dragged.' } })] },
  // 938 Board-evaluation exercise
  { id: 'e9_governance_boardeval', title: 'A health check for the board', icon: 'chart', good: true, per: 1, cd: 24, min: 24, story: 'Good boards check themselves as well as the business. Your directors have agreed to be graded on how well they work together.', choices: [
    S('outsider', 'Hire an outside facilitator', 'Costs money and asks the awkward questions.', 'The outsider asked what nobody dared to, and the board agreed three changes.', { k: 0.02, acct: 'otherCosts', eff: { quality: 1, rep: 1 } }),
    S('form', 'Use a self-assessment form', 'Free, and people may go easy on themselves.', '', { gamble: { p: 0.6, good: { quality: 1 }, bad: { morale: -1 }, goodText: 'The answers were honest, and a useful list of fixes came out.', badText: 'Everyone marked themselves ten out of ten, and nothing changed.' } }),
    S('skip', 'Skip it this year', 'Free, and you learn nothing.', 'The board carried on exactly as before.')] },
  // 939 Whistleblowing escalation to the board
  { id: 'e9_governance_whistle', title: 'An email to the chair', icon: 'key', good: false, per: 1, cd: 20, gate: 'team', min: 12, story: 'A member of staff has emailed the chair directly, saying a manager is bending the rules to hit targets. They asked for their name to be kept secret. This is called whistleblowing: raising a worry about wrongdoing.', choices: [
    S('investigate', 'Investigate independently', 'Costs money and protects the person who spoke up.', 'An outside investigator found the problem. The manager left, and staff saw that speaking up works.', { k: 0.03, acct: 'otherCosts', eff: { morale: 2, rep: 1 } }),
    S('hr', 'Pass it to HR quietly', 'Cheap, and a leak would be damaging.', '', { gamble: { p: 0.55, good: { morale: 1 }, bad: { morale: -3, rep: -1 }, goodText: 'It was dealt with quietly, and the problem stopped.', badText: 'The name leaked, and people learned that speaking up is risky.' } }),
    S('dismiss', 'Dismiss it as sour grapes', 'Free, and very risky if it is true.', '', { gamble: { p: 0.3, good: {}, bad: { morale: -4, rep: -3 }, goodText: 'It turned out to be nothing.', badText: 'The worry was real. It reached the press, and trust collapsed.' } })] },
  // 940 Executive-pay disputes
  { id: 'e9_governance_paydispute', title: 'Top pay becomes office gossip', icon: 'crown', good: false, per: 1, cd: 24, gate: 'team', min: 18, story: 'Someone has spotted what the top people are paid, and it has spread round the office. Many think it is far too much compared with their own pay.', choices: [
    S('freeze', 'Freeze top pay for a year', 'Free, and your leaders may grumble.', 'Staff cheered, and two senior people quietly updated their CVs.', { eff: { morale: 3, quality: -0.5 } }),
    S('explain', 'Explain how pay is set', 'Free, and it only works if the story holds up.', '', { gamble: { p: 0.6, good: { morale: 1, rep: 1 }, bad: { morale: -2 }, goodText: 'People saw the reasoning, and the gossip faded.', badText: 'The explanation sounded like an excuse, and anger grew.' } }),
    S('share', 'Share a bonus with everyone', 'Costs money and spreads the good feeling.', 'The bonus eased the sting, and people felt included.', { k: 0.03, acct: 'wages', eff: { morale: 4 } })] },
  // 943 Crisis-committee drills
  { id: 'e9_governance_drill', title: 'A crisis drill is due', icon: 'shield', good: true, per: 1, cd: 24, min: 18, story: 'Your crisis committee, the small group who take charge when something goes badly wrong, wants to test itself with a pretend emergency such as a fire, a data leak or a product recall.', choices: [
    S('surprise', 'A surprise drill with no warning', 'Costs a little and teaches the most.', '', { k: 0.015, acct: 'otherCosts', gamble: { p: 0.75, good: { quality: 1.5, morale: 1 }, bad: { morale: -2 }, goodText: 'Several gaps showed up, and you fixed them before a real crisis.', badText: 'The surprise rattled people, and the fixes were slow to follow.' } }),
    S('tabletop', 'A planned talk-through on paper', 'Cheap and calm, with fewer lessons.', 'You walked through the plan together and found a few holes.', { k: 0.005, eff: { quality: 0.5 } }),
    S('skip', 'Skip it for now', 'Free, until a real crisis arrives.', 'Everyone had plenty of other things to do.')] },
  // 944 Related-party approval votes
  { id: 'e9_governance_relatedparty', title: 'A director\'s cousin wants to supply you', icon: 'key', good: false, per: 1, cd: 24, min: 18, story: 'A firm owned by a director\'s cousin has bid to supply you at a fair price. Deals like this are called related-party deals, and the board is supposed to vote on them openly.', choices: [
    S('vote', 'Vote, with the director out of the room', 'A proper process, a little slower.', 'The vote was clean and written up in the minutes. The price was good, and nobody could complain.', { k: 0.005, acct: 'otherCosts', eff: { rep: 1, c: E(0.99, 8) } }),
    S('nod', 'Say yes without a vote', 'Quick, and risky if anyone finds out.', '', { gamble: { p: 0.5, good: { c: E(0.985, 8) }, bad: { rep: -3, morale: -1 }, goodText: 'A cosy deal, and a good price, and nobody asked.', badText: 'Someone found out, and it looked like a stitch-up.' } }),
    S('stranger', 'Choose a stranger instead', 'Squeaky clean, and a little dearer.', 'You stayed above suspicion, and paid slightly more.', { eff: { c: E(1.01, 6) } })] },
  // 950 Cyber-risk board briefings
  { id: 'e9_governance_cyberbrief', title: 'The board asks about cyber risk', icon: 'laptop', good: false, per: 1, cd: 20, min: 12, story: 'A well-known firm has just been hit by a cyber attack, where criminals break into computers to steal data or lock files. Your directors want to know whether the same could happen to you.', choices: [
    S('expert', 'Bring in an outside expert', 'Costs money and tells you the plain truth.', 'The expert briefed the board in plain English, and you fixed three weak spots straight away.', { k: 0.02, acct: 'otherCosts', eff: { rep: 1, quality: 1 } }),
    S('lead', 'Ask your IT lead to brief them', 'Free, though the board only hears what the IT lead chooses to say.', 'The IT lead gave a clear update and a short to-do list.', { eff: { quality: 0.5 } }),
    S('fine', 'Say it is all under control', 'Free, and a bluff if you have not checked.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -3, d: E(0.97, 3) }, goodText: 'Nothing happened, this time.', badText: 'A fake email fooled a member of staff, and customers lost trust.' } })] },
];

export const projects: InitiativeDef[] = [
  // 927 Independent-director recruitment
  { id: 'governance_independent_director', name: 'Recruit an independent director', blurb: 'Find an outside director with no ties to you, to ask the awkward questions. It takes time to find the right person.', k: 0.4, months: 4, success: 70,
    win: { eff: { rep: 0.04, od: 1.05 }, monthly: 0.2, text: 'A sharp, independent director joined. Your board meetings became more honest, and lenders and customers noticed.' },
    lose: { now: { rep: -1 }, text: 'The search found nobody suitable, and word got round that you struggled to attract directors.' } },
  // 930 Board-pack quality and timing
  { id: 'governance_board_pack', name: 'Rebuild the board pack', blurb: 'The board pack is the pile of papers directors read before a meeting. Make it short, clear and sent a week early.', k: 0.3, months: 3, success: 85,
    win: { eff: { c: 0.996 }, monthly: 0.05, text: 'Directors came to meetings prepared and made faster, better decisions.' },
    lose: { now: { morale: -1 }, text: 'The new pack ended up longer than the old one, and the finance team groaned.' } },
  // 933 Risk-committee reviews
  { id: 'governance_risk_review', name: 'Commission a board risk review', blurb: 'A formal look at what could go wrong, how likely it is, and what it would cost if it did.', k: 0.6, months: 4, success: 80,
    win: { eff: { c: 0.995, q: 0.01 }, text: 'The review spotted two weak points, and you fixed them before they cost you anything.' },
    lose: { now: { morale: -1 }, text: 'The review found little that was new, and a row broke out over who owns which risk.' } },
  // 941 Internal-audit function
  { id: 'governance_internal_audit', name: 'Set up an internal audit team', blurb: 'Your own checkers test month by month that the rules are being followed, and report straight to the board.', k: 1, months: 6, success: 75,
    win: { eff: { c: 0.993, rep: 0.02 }, monthly: 0.5, text: 'The team found leaks in spending and fixed weak controls, and the board trusted the numbers more.' },
    lose: { now: { morale: -2 }, text: 'People felt spied on, and the first reports were ignored by the managers who needed them.' } },
  // 942 Corporate-code-of-conduct rollout
  { id: 'governance_code_of_conduct', name: 'Roll out a code of conduct', blurb: 'Write down how everyone should behave, then train people on it so it is more than a poster.', k: 0.5, months: 4, success: 80,
    win: { eff: { rep: 0.03, m: 0.1 }, monthly: 0.05, text: 'People knew where the line was, and customers noticed the difference.' },
    lose: { now: { morale: -1 }, text: 'The code was seen as box-ticking, and people rolled their eyes at the training.' } },
  // 946 Mission-and-values refresh
  { id: 'governance_values_refresh', name: 'Refresh your mission and values', blurb: 'Rewrite what the company is for and how people should act, working with the team rather than at them.', k: 0.5, months: 3, success: 70,
    win: { eff: { m: 0.2, rep: 0.02 }, monthly: 0.1, text: 'The team helped write the new words, and they started to use them in daily decisions.' },
    lose: { now: { morale: -2 }, text: 'The new words felt like slogans, and people grew cynical about the whole exercise.' } },
  // 948 Stakeholder-engagement mapping
  { id: 'governance_stakeholder_map', name: 'Map your stakeholders', blurb: 'A stakeholder is anyone your business affects or relies on, such as customers, staff, suppliers, neighbours and lenders. List them and plan how to talk to each.', k: 0.3, months: 3, success: 85,
    win: { eff: { rep: 0.03, d: 1.005 }, text: 'You spotted two groups you had been ignoring, and keeping in touch with them paid off.' },
    lose: { now: { rep: -1 }, text: 'The map missed someone important, and they heard about your plans from the press instead.' } },
];
