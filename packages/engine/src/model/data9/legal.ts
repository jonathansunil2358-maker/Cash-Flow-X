import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Topic: Legal and compliance. Every id starts with "legal_" (policies and projects) or "e9_legal_" (events). */
export const policies: PolicyDef[] = [
  // 726 Contract-review backlog with a lawyer on retainer
  { id: 'legal_retainer', group: 'ops', name: 'Contract-review lawyer', blurb: 'Contracts pile up if nobody checks them. A lawyer on retainer (a fixed monthly fee for quick access) clears the backlog fast.', options: [
    opt('Lawyer by the hour', 'Call a lawyer only when you must. Cheap, until a contract goes wrong.', {}),
    opt('Skip legal review', 'Sign contracts on a handshake and a hope. Saves money, and now and then a clause bites.', { risk: [5, 4, 'A badly worded contract cost you money.'] }, -0.2),
    opt('Lawyer on retainer', 'Contracts are checked in days, so deals close faster and fewer clauses bite.', { d: 1.005, c: 0.997 }, 0.45),
    opt('In-house counsel', 'Your own lawyer on the payroll. Fast and thorough, and quite expensive.', { d: 1.01, c: 0.995 }, 1)] },
  // 727 Non-compete clauses for senior staff
  { id: 'legal_noncompete', group: 'people', name: 'Non-compete clauses', blurb: 'A non-compete is a promise by a senior person not to join a rival, or take your customers to one, for a while after they leave.', options: [
    opt('No restrictions', 'Senior staff are free to leave and join anyone.', {}),
    opt('Standard non-competes', 'Customers tend to stay with you when a senior person leaves, but recruits grumble and some staff feel distrusted.', { ch: 0.99, hire: 1.1, m: -0.1 }),
    opt('Strict non-competes with paid notice', 'Long restrictions, paid in full while people wait. Strong protection, and a tougher sell to recruits.', { ch: 0.98, hire: 1.2, m: -0.15 }, 0.3)] },
  // 728 Data-protection officer appointments
  { id: 'legal_dpo', group: 'ops', name: 'Data-protection officer', blurb: 'A data-protection officer (DPO) makes sure you handle customers\' personal details lawfully, and answers the regulator when it asks questions.', options: [
    opt('Nobody in charge', 'Everyone looks after data as best they can.', {}),
    opt('Name a part-time DPO', 'Give the title to someone already busy. Cheap, but requests sometimes slip through the cracks.', { rep: 0.015, risk: [3, 2, 'A data request was answered late and the regulator noticed.'] }, 0.1),
    opt('Hire a dedicated DPO', 'A specialist who knows the rules. Customers trust you with their details.', { rep: 0.04, ch: 0.99 }, 0.5)] },
  // 732 Late-payment-code signing
  { id: 'legal_paymentcode', group: 'finance', name: 'Prompt-payment pledge', blurb: 'Signing a prompt-payment code is a public promise to pay suppliers on time, so small firms are not left waiting for their money.', options: [
    opt('No pledge', 'Pay when you can, as before.', {}),
    opt('Sign the code', 'You pay on time and say so. Suppliers like you and trim their prices, but cash goes out sooner.', { rep: 0.03, c: 0.996 }, 0.2),
    opt('Sign and publish your payment times', 'Show everyone how fast you pay. Suppliers go the extra mile, and you give up a lot of breathing space.', { rep: 0.05, c: 0.994 }, 0.4)] },
  // 733 Competition-law training for sales teams
  { id: 'legal_competition_training', group: 'people', name: 'Competition-law training', blurb: 'Competition law bans rivals from agreeing prices or sharing out customers. Salespeople at trade shows are the people most likely to wander into trouble.', options: [
    opt('Online tick-box module', 'A quick click-through course that everyone forgets by Friday.', {}),
    opt('No training at all', 'Save the cost and trust people\'s common sense.', { risk: [2, 8, 'A careless chat between salespeople about prices drew a competition-law investigation.'] }, -0.1),
    opt('Face-to-face workshops', 'Salespeople learn exactly what they must never discuss with rivals. Regulators and big buyers trust you more.', { rep: 0.02 }, 0.15, 0.2)] },
  // 734 Anti-bribery policies for overseas deals
  { id: 'legal_antibribery', group: 'ops', name: 'Anti-bribery rules', blurb: 'Bribery is a serious crime, and it can follow you home from overseas deals. Choose how strict you are with agents and gifts.', options: [
    opt('Basic code of conduct', 'A short rule book. Staff know bribes are wrong, but local customs can be fuzzy.', {}),
    opt('Zero-tolerance policy', 'No gifts, no side payments, every agent checked. You lose a few deals, and your reputation soars.', { d: 0.99, rep: 0.04 }, 0.2),
    opt('Let local agents handle it', 'Pay overseas agents commission and ask no questions. Deals flow, until one agent pays a bribe in your name.', { d: 1.015, risk: [4, 8, 'A local agent paid a bribe in your name and you faced a large fine.'] })] },
  // 735 Sanctions-screening of customers
  { id: 'legal_sanctions', group: 'ops', name: 'Sanctions screening', blurb: 'Sanctions lists name people and firms you are legally barred from trading with. Screening means checking every buyer against those lists.', options: [
    opt('Screen large orders only', 'Check big buyers and trust the rest.', {}),
    opt('No screening', 'Skip the checks and ship. Faster and cheaper, but one banned customer means a heavy penalty.', { d: 1.005, risk: [3, 8, 'You sold to a blocked buyer and paid a heavy penalty.'] }, -0.15),
    opt('Screen every customer', 'Software checks every new buyer. A few orders are delayed, but banks and partners trust you.', { d: 0.995, rep: 0.02 }, 0.3, 0.2)] },
  // 746 Customer-contract termination clauses
  { id: 'legal_termination', group: 'customers', name: 'Contract exit terms', blurb: 'How easily can customers walk away? The notice period in your contract changes who signs up and who stays.', options: [
    opt('Standard notice', 'A fair notice period that most customers accept.', {}),
    opt('Cancel any time', 'No lock-in. More people sign up, but more also leave.', { d: 1.01, ch: 1.02 }),
    opt('Long lock-in contracts', 'Customers are tied in, so they stay. Fewer sign, and some dispute the small print.', { ch: 0.97, d: 0.99, risk: [3, 2, 'A customer disputed your long lock-in clause.'] })] },
  // 750 Legal-expense insurance
  { id: 'legal_expense_cover', group: 'finance', name: 'Legal-expense insurance', blurb: 'An insurance policy that pays your legal fees and gives you a helpline when you are in a dispute.', options: [
    opt('Pay your own legal bills', 'No cover. Every dispute comes straight out of your cash.', {}),
    opt('Take out legal-expense cover', 'The insurer pays for advice and court costs, so legal bills nibble a little less at your margins.', { c: 0.997 }, 0.2)] },
];

export const events: EvSpec[] = [
  // 729 Trading-standards complaints
  { id: 'e9_legal_trading_standards', title: 'Trading Standards calls', icon: 'shield', good: false, per: 1.5, cd: 24,
    story: 'A customer has complained to Trading Standards, the council team that checks businesses describe and sell their goods honestly. An officer asks you to explain a claim on your website.', choices: [
      S('fix', 'Co-operate and fix the wording', 'Cheap, and the case is closed.', 'You changed the wording and the officer closed the file.', { k: 0.015, eff: { rep: 1 } }),
      S('lawyer', 'Hire a solicitor to push back', 'Costs more, and could clear your name.', '', { k: 0.03, gamble: { p: 0.6, good: { rep: 1 }, bad: { rep: -2 }, goodText: 'The solicitor showed that your claim was fair.', badText: 'The officer disagreed, and the story reached the local paper.' } }),
      S('ignore', 'Ignore the letter', 'Free, and a bad idea if they follow up.', '', { gamble: { p: 0.3, good: {}, bad: { rep: -3, morale: -1 }, goodText: 'Nothing came of it.', badText: 'They escalated, issued a formal notice, and the press picked it up.' } })] },
  // 730 Advertising-standards rulings
  { id: 'e9_legal_advert_ruling', title: 'The ad watchdog rules against you', icon: 'flag', good: false, per: 1.5, cd: 24,
    story: 'A rival has complained that one of your adverts is misleading, and the advertising watchdog (a body that judges whether ads are honest) has upheld part of the complaint. You must change the advert.', choices: [
      S('pull', 'Pull the ad and apologise', 'Quick and humble.', 'You owned up, and the story died within a week.', { k: 0.015, acct: 'marketing', eff: { rep: 1 } }),
      S('rewrite', 'Rewrite it to be honest', 'Costs more, and could work better.', 'The honest version was clearer, and it sold better than the old one.', { k: 0.025, acct: 'marketing', eff: { d: E(1.01, 4) } }),
      S('challenge', 'Challenge the ruling', 'A gamble on a very public fight.', '', { k: 0.02, acct: 'otherCosts', gamble: { p: 0.4, good: { brand: 1.02 }, bad: { rep: -2, brand: 0.99 }, goodText: 'The ruling was overturned, and you looked like the underdog.', badText: 'The watchdog named you publicly, and the headline stung.' } })] },
  // 731 Product-labelling rule changes
  { id: 'e9_legal_labelling', title: 'New labelling rules', icon: 'parcel', good: false, per: 1.3, cd: 30, gate: 'stock',
    story: 'New rules say products must show allergens, origin and recycling advice in bigger print from next quarter. Everything on your shelves still carries the old labels.', choices: [
      S('relabel', 'Relabel everything now', 'Costs the most, and is the safest.', 'All your stock was relabelled in a week, and no inspector could fault you.', { k: 0.04, eff: { rep: 1 } }),
      S('phase', 'Phase it in with new batches', 'Cheaper, but there is a deadline.', '', { k: 0.01, gamble: { p: 0.7, good: {}, bad: { d: E(0.97, 3), rep: -1 }, goodText: 'The old stock sold through before the deadline.', badText: 'Old stock was spotted on shelves after the deadline and had to be pulled.' } }),
      S('sticker', 'Stick over the old labels', 'A quick patch that looks a bit scruffy.', 'The stickers did the job, though the packs looked less smart.', { k: 0.02, eff: { brand: 0.995 } })] },
  // 737 Small-claims court disputes
  { id: 'e9_legal_small_claims', title: 'A small-claims dispute', icon: 'key', good: false, per: 1.5, cd: 20,
    story: 'An unhappy customer says you owe them a refund and has filed a small-claims case. That is a cheap, quick court for smaller disputes, where you do not even need a lawyer.', choices: [
      S('settle', 'Settle before the hearing', 'Costs money, ends it quietly.', 'It cost you something, but the matter ended quietly.', { k: 0.02 }),
      S('defend', 'Defend yourself in court', 'Cheap to try, and a coin toss.', '', { k: 0.008, gamble: { p: 0.55, good: { rep: 1 }, bad: { rep: -1, morale: -1 }, goodText: 'The judge agreed with you, and the customer went away.', badText: 'The judge sided with the customer, and you paid costs too.' } }),
      S('mediate', 'Offer mediation', 'A free chat with a neutral person.', '', { k: 0.005, gamble: { p: 0.75, good: { rep: 1 }, bad: { morale: -1 }, goodText: 'Over a calm chat you found a fair middle point, and the customer withdrew.', badText: 'Mediation failed, and you lost a few days to it.' } })] },
  // 738 Trademark opposition from a rival
  { id: 'e9_legal_trademark', title: 'A rival opposes your trademark', icon: 'diamond', good: false, per: 1.3, cd: 30, gate: 'rivals',
    story: 'You applied to register your brand name as a trademark (a legal claim on a name or logo). A rival has formally objected, saying it looks too much like theirs.', choices: [
      S('fight', 'Fight the objection', 'Expensive, and the prize is a strong brand.', '', { k: 0.05, gamble: { p: 0.55, good: { brand: 1.03, rep: 1 }, bad: { brand: 0.97, rep: -1 }, goodText: 'The registry sided with you, and the name is now yours alone.', badText: 'The registry sided with the rival, and you had to back down.' } }),
      S('coexist', 'Agree to coexist', 'Both names stay, with clear differences.', 'You agreed rules on colours and wording so that neither name could be confused with the other.', { k: 0.02, eff: { rep: 1 } }),
      S('tweak', 'Tweak the name and withdraw', 'Cheap, and a small dent to the brand.', 'A small change to the name ended the argument, though some customers needed to learn it again.', { k: 0.03, eff: { brand: 0.985 } })] },
  // 739 Employment-tribunal claims
  { id: 'e9_legal_tribunal', title: 'An employment-tribunal claim', icon: 'flag', good: false, per: 1.3, cd: 24, gate: 'team',
    story: 'Someone you let go says it was unfair and has taken you to an employment tribunal, a panel that settles disputes between employers and staff. The team has heard rumours.', choices: [
      S('settle', 'Settle and move on', 'Costs money, ends it fast.', 'You paid a settlement, and the matter closed without a hearing.', { k: 0.05, eff: { morale: -1 } }),
      S('fight', 'Fight it at the tribunal', 'A public hearing, and a gamble.', '', { k: 0.03, gamble: { p: 0.55, good: { morale: 2, rep: 1 }, bad: { morale: -3, rep: -2 }, goodText: 'The panel found you acted fairly, and the team felt reassured.', badText: 'The panel found against you, and the team heard every detail.' } }),
      S('conciliate', 'Try conciliation first', 'A neutral person helps both sides find a middle path.', '', { k: 0.015, gamble: { p: 0.7, good: {}, bad: { morale: -1 }, goodText: 'A compromise was reached privately, and the claim was dropped.', badText: 'No deal, and it was still hanging over you.' } })] },
  // 742 Whistleblower-protection cases
  { id: 'e9_legal_whistleblower', title: 'A whistleblower speaks up', icon: 'bolt', good: false, per: 1.2, cd: 30, gate: 'team',
    story: 'A member of staff has told you about what they believe is a safety shortcut, and says they will go to the authorities if nothing changes. The law protects people who raise concerns like this.', choices: [
      S('thank', 'Thank them and investigate properly', 'Costs a little, and builds trust.', 'You found a real problem, fixed it, and earned lasting trust.', { k: 0.02, eff: { morale: 3, rep: 1 } }),
      S('sideline', 'Move them to another team', 'Quiet, and against the law.', '', { gamble: { p: 0.25, good: {}, bad: { morale: -5, rep: -3 }, goodText: 'It went quiet, for now.', badText: 'They went to a lawyer. Punishing a whistleblower is unlawful, and the whole team lost trust in you.' } }),
      S('quiet', 'Investigate quietly and tell nobody', 'Cheap, and not everyone is convinced.', '', { k: 0.01, gamble: { p: 0.6, good: { morale: 1 }, bad: { morale: -3 }, goodText: 'You fixed the fault quietly, and the person felt heard.', badText: 'Nothing visibly changed, so they went to the authorities anyway.' } })] },
  // 743 Health-and-safety executive visits
  { id: 'e9_legal_safety_visit', title: 'A safety inspector arrives', icon: 'gear', good: false, per: 1.5, cd: 24,
    story: 'The Health and Safety Executive, the regulator for workplace safety, has sent an inspector with no warning. They want to walk round your premises and look through your records.', choices: [
      S('open', 'Welcome them and show everything', 'Honest, and usually pays off.', '', { k: 0.005, gamble: { p: 0.8, good: { rep: 1, quality: 1 }, bad: { morale: -1, c: E(1.01, 3) }, goodText: 'Your records were spotless, and the inspector praised your team.', badText: 'They spotted a few faults and left you a list of fixes.' } }),
      S('stall', 'Stall while you tidy up', 'Buys a day, and looks evasive.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -2 }, goodText: 'A hurried tidy-up passed muster.', badText: 'The inspector noticed the stalling and wrote it down.' } }),
      S('consultant', 'Ask for a week and hire a consultant', 'Costs most, and thoroughly prepares you.', 'The consultant found and fixed problems before the second visit, and the team learned a lot.', { k: 0.03, eff: { morale: 1, quality: 1 } })] },
  // 745 Environmental-permit conditions
  { id: 'e9_legal_permit', title: 'Your environmental permit tightens', icon: 'leaf', good: false, per: 1.2, cd: 36,
    story: 'The council is adding conditions to your environmental permit: lower noise, cleaner waste water and regular reports. Break the conditions and you could be told to stop operating.', choices: [
      S('upgrade', 'Upgrade to meet them now', 'Costs the most, and pays back over time.', 'The cleaner kit used less energy, and neighbours noticed the difference.', { k: 0.06, eff: { rep: 2, c: E(0.995, 12) } }),
      S('appeal', 'Appeal the conditions', 'A gamble on getting softer rules.', '', { k: 0.02, gamble: { p: 0.45, good: { rep: 1 }, bad: { c: E(1.02, 6), rep: -1 }, goodText: 'The council softened the conditions after your appeal.', badText: 'The appeal failed, and you rushed to comply at a higher price.' } }),
      S('cut', 'Cut output to stay inside the limits', 'Free, and orders go elsewhere.', 'You slowed output and met the limits, at the cost of some orders.', { eff: { d: E(0.97, 6) } })] },
  // 747 Class-action risk
  { id: 'e9_legal_class_action', title: 'A class action looms', icon: 'crown', good: false, per: 0.8, cd: 48,
    story: 'A law firm is rounding up your customers to bring a class action, one big claim on behalf of lots of people who feel they were short-changed in the same way.', choices: [
      S('refund', 'Offer a goodwill refund to everyone', 'Costs a lot, and takes the wind out of the claim.', 'It cost real money, but customers dropped out of the claim one by one.', { k: 0.08, eff: { rep: 2 } }),
      S('fight', 'Fight it in court', 'A very public coin toss.', '', { k: 0.04, gamble: { p: 0.5, good: { rep: 1, brand: 1.01 }, bad: { rep: -4, brand: 0.97 }, goodText: 'The judge threw the claim out, and your name was cleared.', badText: 'The judge let it go ahead, and the headlines were brutal.' } }),
      S('apologise', 'Fix the problem and apologise publicly', 'Cheap, and depends on being believed.', '', { k: 0.03, gamble: { p: 0.6, good: { rep: 2, quality: 1 }, bad: { rep: -2 }, goodText: 'A sincere apology and a real fix calmed the crowd.', badText: 'The apology was called too little, too late.' } })] },
];

export const projects: InitiativeDef[] = [
  // 736 Terms-and-conditions rewrite after a dispute
  { id: 'legal_terms_rewrite', name: 'Rewrite your terms and conditions', blurb: 'A recent dispute has exposed gaps in your small print. Pay a lawyer to rewrite your terms and conditions in plain English.', k: 0.3, months: 3, success: 85,
    win: { eff: { rep: 0.02, c: 0.997 }, text: 'The new terms were clear and fair, and disputes dried up.' },
    lose: { now: { morale: -1 }, text: 'The rewrite was rushed and still left gaps, so you will need another go.' } },
  // 740 Licensing-renewal deadlines
  { id: 'legal_licence_renewal', name: 'Renew your licence early', blurb: 'Operating licences run out on fixed dates, and a late renewal can stop you trading. Start the paperwork early and avoid the rush.', k: 0.2, months: 2, success: 90,
    win: { now: { rep: 1, morale: 1 }, text: 'The licence was renewed with weeks to spare, and nobody had to panic.' },
    lose: { now: { d: E(0.95, 2), rep: -1 }, text: 'A missed form delayed the licence, and you had to pause trading while it was sorted.' } },
  // 741 Compliance-calendar tool
  { id: 'legal_compliance_calendar', name: 'Install a compliance calendar', blurb: 'A tool that reminds you about every filing, renewal and training date, so nothing lapses and no late fees creep in.', k: 0.2, months: 2, success: 85,
    win: { eff: { c: 0.996 }, monthly: 0.1, text: 'No more missed deadlines or late fees, and the calendar pays for itself.' },
    lose: { now: { morale: -1 }, text: 'The software was fiddly, and nobody kept it up to date, so deadlines slipped as before.' } },
  // 744 Modern-slavery statement requirements
  { id: 'legal_slavery_statement', name: 'Publish a modern-slavery statement', blurb: 'Larger firms must publish a yearly statement on how they keep forced labour out of their supply chain. Doing it well means checking your suppliers.', k: 0.4, months: 4, success: 75,
    win: { eff: { rep: 0.04 }, monthly: 0.1, text: 'Your statement was praised, and big customers took note of it.' },
    lose: { now: { rep: -2 }, text: 'The statement was vague, and campaigners called it a tick-box exercise.' } },
  // 748 Cookie-consent and privacy fines
  { id: 'legal_cookie_consent', name: 'Fix your cookie banners and privacy notices', blurb: 'Websites must ask before following visitors around with cookies (small tracking files). Regulators fine sites that get this wrong.', k: 0.25, months: 3, success: 80,
    win: { eff: { rep: 0.02 }, text: 'Your site now asks nicely, visitors trust it, and the regulator leaves you alone.' },
    lose: { now: { rep: -2, brand: 0.99 }, text: 'A tracking cookie slipped through, and the regulator issued a public warning.' } },
  // 749 Regulator-sandbox trials
  { id: 'legal_sandbox', name: 'Join a regulator\'s sandbox trial', blurb: 'A sandbox lets you test a new product under a regulator\'s watchful eye, with relaxed rules while you learn. The reward is a head start.', k: 0.7, months: 8, success: 55,
    win: { eff: { d: 1.02 }, now: { brand: 1.02 }, monthly: 0.1, text: 'You got the regulator\'s blessing and launched ahead of your rivals.' },
    lose: { now: { morale: -2 }, text: 'The regulator was not convinced, and the trial ended without approval.' } },
];
