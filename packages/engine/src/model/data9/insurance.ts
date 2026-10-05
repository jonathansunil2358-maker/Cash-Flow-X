import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Topic: Insurance and risk. Every id starts with "insurance_" (policies and projects) or "e9_insurance_" (events). */
export const policies: PolicyDef[] = [
  // 701 Insurance-broker negotiation of premiums
  { id: 'insurance_broker', group: 'finance', name: 'Insurance broker', blurb: 'A broker shops around the insurers for you, for a fee. Cheaper premiums can come with more small print.', options: [
    opt('Renew as offered', 'Accept whatever your insurer quotes each year.', {}),
    opt('Use a broker', 'The broker compares insurers and trims your premiums, for a fee.', {}, -0.25, 0.4),
    opt('Squeeze every penny', 'Re-tender every year and take the cheapest quote. Premiums fall, but cheap policies hide more exclusions (things the insurer will refuse to pay for).', { risk: [4, 3, 'A claim fell under an exclusion in the small print of your cheaper policy.'] }, -0.5, 0.4)] },
  // 702 Excess levels that trade premium for risk
  { id: 'insurance_excess', group: 'finance', name: 'Policy excess', blurb: 'The excess is the first slice of every claim that you pay yourself. A bigger excess means a cheaper premium.', options: [
    opt('Standard excess', 'A middle-of-the-road excess and premium.', {}),
    opt('High excess', 'You pay more of each claim yourself, so the premium drops. A bad month can sting.', { risk: [6, 3, 'You paid a big excess on an insurance claim.'] }, -0.35),
    opt('Low excess', 'The insurer picks up nearly everything, so people report small problems early. The premium is higher.', { q: 0.01 }, 0.4)] },
  // 703 Business-interruption cover with waiting periods
  { id: 'insurance_interruption', group: 'finance', name: 'Business-interruption cover', blurb: 'If a fire, flood or breakdown shuts you down, this pays your fixed costs and lost profit. The waiting period is how long you fund the gap yourself first.', options: [
    opt('Two-week wait', 'A balanced premium, with a short gap to cover yourself.', {}),
    opt('Three-month wait', 'Cheaper, but you fund a long gap before any money arrives.', { risk: [4, 4, 'A shutdown ran into your long waiting period and you covered the gap yourself.'] }, -0.3),
    opt('Three-day wait', 'Money starts flowing almost at once, so your bank and your staff relax.', { od: 1.08, m: 0.1 }, 0.5)] },
  // 705 Product-liability cover tiers
  { id: 'insurance_product_liability', group: 'ops', stock: true, name: 'Product-liability cover', blurb: 'Pays out if something you sold harms a customer. A higher limit costs more but opens doors with cautious buyers.', options: [
    opt('Standard cover', 'A sensible limit for a business of your size.', {}),
    opt('Minimum cover', 'Cheapest, but one big claim could blow straight past the limit.', { risk: [3, 6, 'A product claim was bigger than your small cover and you paid the rest.'] }, -0.3),
    opt('High-limit cover', 'Big retailers insist on strong cover before they will stock you.', { d: 1.01, rep: 0.01 }, 0.45)] },
  // 706 Key-person insurance on founders
  { id: 'insurance_keyperson', group: 'finance', name: 'Key-person insurance', blurb: 'Pays a lump sum if a founder or star performer is out of action for a long time. Lenders and investors like to see it.', options: [
    opt('No key-person cover', 'If a founder falls ill, the business carries the loss alone.', {}),
    opt('Insure the founders', 'The policy pays out if a founder is off for months. Your bank is more relaxed about lending.', { od: 1.1 }, 0.3),
    opt('Insure the whole top team', 'Covers founders and senior people. Lenders relax even more, and so do the managers.', { od: 1.15, m: 0.1 }, 0.65)] },
  // 709 Self-insurance fund for small claims
  { id: 'insurance_selffund', group: 'finance', name: 'Self-insurance fund', blurb: 'Instead of insuring every small claim, keep your own pot of cash for them. You save on premiums, but a run of bad luck comes out of the pot.', options: [
    opt('Insure everything', 'Pay premiums for every claim, big and small.', {}),
    opt('Small-claims pot', 'Pay small claims from your own pot and keep insurance for the big ones.', { risk: [8, 3, 'A run of small claims drained your own pot.'] }, -0.3, 0.5),
    opt('Large reserve fund', 'A bigger pot soaks up more bad luck and saves more, but it takes a lot of cash to set up.', { risk: [4, 3, 'Several claims in a row dipped into your reserve fund.'] }, -0.45, 1.5)] },
  // 713 Credit-insurance on exports
  { id: 'insurance_credit', group: 'finance', name: 'Export credit insurance', blurb: 'Pays you if a customer abroad never settles an invoice. Banks happily lend against invoices that are insured.', options: [
    opt('Sell on trust', 'No cover. If a foreign buyer vanishes, you lose the sale.', {}),
    opt('Insure the big invoices', 'Covers your largest overseas customers, so your bank lends more freely.', { od: 1.1 }, 0.3),
    opt('Insure every invoice', 'Cover on all sales abroad. You can offer new buyers generous payment terms, which wins orders.', { od: 1.2, d: 1.01 }, 0.7)] },
  // 714 Directors-and-officers cover
  { id: 'insurance_dno', group: 'people', name: 'Directors-and-officers cover', blurb: 'Protects directors from paying out of their own pockets if someone sues them over a business decision. Often shortened to D&O.', options: [
    opt('No D&O cover', 'Directors carry the legal risk personally.', {}),
    opt('Take out D&O cover', 'The company pays a premium so that good people are happy to join your board and senior team.', { hire: 0.93, rep: 0.01 }, 0.2)] },
  // 722 Claims-handling speed ratings
  { id: 'insurance_claims_speed', group: 'ops', name: 'Insurer claims-speed rating', blurb: 'Insurers are rated on how fast they pay claims. The cheap ones are often the slow ones, and slow money hurts when something has gone wrong.', options: [
    opt('Mid-table insurer', 'An average premium and average payment times.', {}),
    opt('Cheapest insurer', 'The lowest premium, but claims can drag on while you wait for money.', { risk: [5, 3, 'A slow insurer left you out of pocket for weeks while a claim dragged on.'] }, -0.2),
    opt('Top-rated insurer', 'Pays quickly with little fuss, so you are back on your feet sooner.', { cap: 1.008 }, 0.35)] },
  // 725 Risk-appetite statement set by the board
  { id: 'insurance_appetite', group: 'finance', name: 'Risk appetite', blurb: 'The board writes down how much risk the business is willing to take for the sake of growth. Everyone then knows where the line is.', options: [
    opt('Balanced', 'Take sensible risks and think hard about the big ones.', {}),
    opt('Cautious', 'Say no to anything that could hurt badly. Calmer, but you miss some chances.', { d: 0.99, m: 0.15 }),
    opt('Bold', 'Chase growth first. More sales, and now and then a bet goes wrong.', { d: 1.015, risk: [6, 4, 'A bold bet went wrong and cost you money.'] })] },
];

export const events: EvSpec[] = [
  // 707 Employer-liability claims history
  { id: 'e9_insurance_employer_claim', title: 'A staff injury claim', icon: 'shield', good: false, per: 1.2, cd: 24, gate: 'team',
    story: 'A former employee says they hurt their back at work and has made a claim against you. Your insurer will look at your claims history (how often people have claimed) when it prices next year\'s cover.', choices: [
      S('settle', 'Settle quickly and fairly', 'Costs money now, but keeps your record short.', 'You settled, and the team saw that you look after people.', { k: 0.04, eff: { morale: 1 } }),
      S('fight', 'Contest the claim', 'Cheaper if you win, painful if you lose.', '', { k: 0.015, gamble: { p: 0.5, good: { rep: 1 }, bad: { rep: -1, morale: -2, c: E(1.01, 6) }, goodText: 'The claim failed and your record stayed clean.', badText: 'You lost, costs mounted and the insurer raised its price.' } }),
      S('fix', 'Settle and fix the cause', 'Costs the most, and shows you mean it.', 'You paid up and rebuilt the way people lift and carry. The insurer noticed and trimmed next year\'s price.', { k: 0.06, eff: { morale: 3, c: E(0.995, 8) } })] },
  // 717 Pandemic-planning reserve
  { id: 'e9_insurance_pandemic', title: 'A pandemic scare', icon: 'flag', good: false, per: 0.8, cd: 48,
    story: 'Health officials warn that a nasty new virus is spreading abroad. If it arrives, shops, offices and borders could close for weeks. You can put money aside now, in what is called a pandemic reserve, or hope it passes.', choices: [
      S('reserve', 'Build a pandemic reserve', 'Costs real money and may never be needed.', 'You set cash aside, stocked up on essentials and sorted out home-working kit. The scare faded, but the team felt looked after.', { k: 0.06, eff: { morale: 2 } }),
      S('plan', 'Write a light-touch plan', 'Cheap and better than nothing.', 'You wrote a one-page plan and bought some hand gel. It was a start.', { k: 0.015, eff: { morale: 1 } }),
      S('hope', 'Hope it passes', 'Free, and a gamble.', '', { gamble: { p: 0.7, good: {}, bad: { d: E(0.95, 4), morale: -3 }, goodText: 'The virus fizzled out and you saved your money.', badText: 'It spread, you were unprepared, and trade dipped for months.' } })] },
  // 718 Fire-safety inspections
  { id: 'e9_insurance_fire_check', title: 'The fire officer calls', icon: 'flame', good: false, per: 1.5, cd: 24,
    story: 'A fire officer has turned up for a surprise check. Your insurer cares too: a clean fire-safety record keeps your premiums down, and a poor one can void a claim.', choices: [
      S('full', 'Fix everything on the list', 'Costs the most, and you can relax.', 'Alarms, signs and extinguishers were all brought up to scratch, and the officer left impressed.', { k: 0.04, eff: { rep: 1, morale: 1 } }),
      S('urgent', 'Fix only the urgent items', 'Cheap, but the officer may come back.', '', { k: 0.015, gamble: { p: 0.6, good: {}, bad: { rep: -2, morale: -1 }, goodText: 'The officer was satisfied for now.', badText: 'A second visit found the rest undone and you got a formal warning.' } }),
      S('drill', 'Run a drill and train fire wardens', 'Staff learn what to do in an emergency.', 'The drill was a bit chaotic, but everyone now knows the way out.', { k: 0.025, eff: { morale: 1, quality: 1 } })] },
  // 719 Political-risk cover abroad
  { id: 'e9_insurance_unrest', title: 'Unrest in an export market', icon: 'globe', good: false, per: 1, cd: 30,
    story: 'Protests and a sudden change of government have closed the banks in one of the countries you sell to. Political-risk cover is insurance that pays out when a government blocks payments or seizes goods, but only if you took it out beforehand.', choices: [
      S('pause', 'Pause sales there', 'Safe, but sales dip for a while.', 'You paused shipments until the banks reopened. Sales dipped, but nothing was lost.', { eff: { d: E(0.97, 4) } }),
      S('carry', 'Keep selling and take the risk', 'A gamble on payments getting through.', '', { gamble: { p: 0.55, good: { d: E(1.02, 4) }, bad: { d: E(0.96, 4), rep: -1 }, goodText: 'Rivals fled and the money kept arriving, so you won new customers.', badText: 'Payments got stuck in frozen accounts and you were left chasing them.' } }),
      S('cover', 'Demand upfront payment and buy cover', 'Costs money, protects you next time.', 'You asked for payment up front and insured future sales, so you are safer from now on.', { k: 0.03, eff: { rep: 1, d: E(0.985, 3) } })] },
  // 720 Supplier-failure cover
  { id: 'e9_insurance_supplier_failure', title: 'Your supplier goes bust', icon: 'parcel', good: false, per: 1.2, cd: 24, gate: 'stock',
    story: 'A key supplier has collapsed with your order half made. Your broker reminds you that supplier-failure cover (insurance that pays when a supplier goes bust) may help, but only for the part you can prove.', choices: [
      S('claim', 'Claim on the policy', 'Pays part of the loss, slowly.', 'The insurer paid some of the loss, though it took a while and goods arrived late.', { income: 0.15, eff: { c: E(1.02, 3) } }),
      S('rush', 'Rush-buy from a new supplier', 'Costs extra now, keeps customers happy.', 'You paid over the odds, but customers got their orders on time.', { k: 0.04, eff: { rep: 1 } }),
      S('wait', 'Wait for the administrators', 'Free, and a gamble.', '', { gamble: { p: 0.4, good: { c: E(1.01, 3) }, bad: { d: E(0.96, 3), rep: -1 }, goodText: 'The administrators released your part-finished goods and you carried on.', badText: 'Nothing arrived for weeks and customers waited.' } })] },
  // 721 Loss-adjuster visits after claims
  { id: 'e9_insurance_adjuster', title: 'The loss adjuster visits', icon: 'key', good: false, per: 1.2, cd: 20,
    story: 'Something went wrong last month and you made an insurance claim. The insurer has sent a loss adjuster, an expert who checks what really happened and what it should cost, and they will be on site tomorrow.', choices: [
      S('fix', 'Welcome them and fix the weak spots', 'Costs a little, and the insurer remembers.', 'The adjuster flagged a few weaknesses. You fixed them, and the insurer eased your premium next year.', { k: 0.02, eff: { quality: 1, c: E(0.995, 8) } }),
      S('coop', 'Co-operate and say nothing more', 'You get paid, the weak spots stay.', 'The adjuster agreed a fair figure and the money arrived within the month.', { income: 0.08 }),
      S('hide', 'Steer them away from the problem areas', 'Free, and risky if they find out.', '', { gamble: { p: 0.4, good: {}, bad: { rep: -2, c: E(1.02, 6) }, goodText: 'They never looked behind the door, and the claim went through.', badText: 'They found out, the claim was cut, and the insurer raised your price.' } })] },
  // 723 Premium surcharges after repeat claims
  { id: 'e9_insurance_surcharge', title: 'A surcharge after repeat claims', icon: 'chart', good: false, per: 1.2, cd: 24,
    story: 'Your insurer has noticed how often you claim. It wants to add a surcharge, an extra slice on the premium, because of your repeat claims. You can accept, shop around or work on cutting claims.', choices: [
      S('accept', 'Accept the surcharge', 'No fuss, higher bills for a year.', 'You paid up, and the surcharge ran for a year.', { eff: { c: E(1.01, 12) } }),
      S('shop', 'Shop around for new cover', 'A small fee, and a gamble on the quotes.', '', { k: 0.01, gamble: { p: 0.6, good: { c: E(0.995, 8) }, bad: { c: E(1.015, 6), rep: -1 }, goodText: 'A rival insurer quoted a fair price and you switched.', badText: 'Other insurers saw your claims record too and quoted even more.' } }),
      S('prevent', 'Invest in preventing claims', 'Costs the most, and makes for a safer business.', 'You fixed the causes of your claims, and the insurer eased the surcharge after six months.', { k: 0.04, eff: { quality: 1, morale: 1, c: E(1.005, 6) } })] },
  // 724 Underinsurance penalties
  { id: 'e9_insurance_underinsured', title: 'You were underinsured', icon: 'shield', good: false, per: 1.2, cd: 30,
    story: 'A claim has revealed that you insured your stock and equipment for less than they are really worth. The insurer says it will only pay a share of the loss in proportion, which is called an underinsurance penalty.', choices: [
      S('revalue', 'Revalue everything and raise your cover', 'Costs now, and you are properly covered from here.', 'A proper valuation, a slightly higher premium, and no more nasty surprises.', { k: 0.03, eff: { c: E(1.005, 12) } }),
      S('argue', 'Argue with the insurer', 'A small fee, and a coin toss.', '', { k: 0.01, gamble: { p: 0.4, good: { rep: 1 }, bad: { rep: -1, morale: -1 }, goodText: 'The insurer paid in full after a polite fight.', badText: 'The insurer stuck to the policy wording and you lost time and sleep.' } }),
      S('accept', 'Accept the shortfall', 'Free, and it hurts.', 'You absorbed the loss and moved on, a little wiser.', { eff: { morale: -1, d: E(0.99, 3) } })] },
];

export const projects: InitiativeDef[] = [
  // 704 Cyber-insurance requirements and audits
  { id: 'insurance_cyber_audit', name: 'Pass a cyber-insurance audit', blurb: 'Cyber insurers want proof that your passwords, backups and staff training are up to scratch before they cut your premium. Pass the audit and customers trust you more.', k: 0.5, months: 4, success: 65,
    win: { eff: { rep: 0.03, ch: 0.99 }, monthly: -0.15, text: 'You passed the audit. Your premium dropped, and customers like the security badge.' },
    lose: { now: { morale: -1 }, text: 'The auditors found gaps in your backups. You paid for the audit and will have to try again.' } },
  // 708 Risk-register with likelihood and impact
  { id: 'insurance_risk_register', name: 'Build a risk register', blurb: 'A risk register lists everything that could go wrong, scored for how likely it is and how much it would hurt. It turns vague worries into a plan.', k: 0.3, months: 3, success: 85,
    win: { eff: { c: 0.996 }, now: { quality: 1 }, text: 'The register spotted three nasty surprises before they happened, and you dodged them.' },
    lose: { now: { morale: -1 }, text: 'The register was never finished, and nobody read it. A lot of effort for a dusty spreadsheet.' } },
  // 710 Captive insurance for big firms
  { id: 'insurance_captive', name: 'Set up a captive insurer', blurb: 'A captive is your own small insurance company that insures your own business. Big firms use one to cut premiums, but it needs a lot of paperwork and approvals.', k: 1.5, months: 12, success: 55,
    win: { eff: { c: 0.99, od: 1.05 }, monthly: 0.2, text: 'Your captive insurer was approved. You keep premiums in the family, and your bank is impressed.' },
    lose: { now: { morale: -2 }, text: 'The regulator turned the application down after a year of work, and the money spent is gone.' } },
  // 711 Disaster-recovery site
  { id: 'insurance_dr_site', name: 'Build a disaster-recovery site', blurb: 'A second location with copies of your data and kit, ready to take over if your main site is lost to fire, flood or a cyber attack.', k: 1.2, months: 6, success: 75,
    win: { eff: { ch: 0.99, rep: 0.03 }, monthly: 0.3, text: 'The recovery site passed its first test. Customers trust you to stay open, whatever happens.' },
    lose: { now: { morale: -1 }, text: 'The site was built on the cheap and failed its test. You will need to start again.' } },
  // 712 Business-continuity plan tests
  { id: 'insurance_continuity_test', name: 'Run a full continuity test', blurb: 'Pretend the worst has happened (a power cut, a flood, no office) and see whether your business-continuity plan really works.', k: 0.4, months: 3, success: 70,
    win: { eff: { c: 0.997 }, now: { quality: 1, morale: 2 }, text: 'The test went well, and staff now know exactly what to do in a crisis.' },
    lose: { now: { morale: -2, rep: -1 }, text: 'The test turned into a muddle. It was embarrassing, but you found the holes before a real emergency did.' } },
  // 715 Fraud-detection controls
  { id: 'insurance_fraud_controls', name: 'Install fraud-detection controls', blurb: 'Two signatures on big payments, checks on new suppliers and software that flags odd invoices.', k: 0.5, months: 4, success: 75,
    win: { eff: { c: 0.994 }, monthly: 0.1, text: 'The controls caught a fake invoice in the first month, and the leaks stopped.' },
    lose: { now: { morale: -2 }, text: 'The new checks slowed everything down and staff felt distrusted, but caught nothing useful.' } },
  // 716 Whistleblower hotline
  { id: 'insurance_hotline', name: 'Launch a whistleblower hotline', blurb: 'A confidential line where staff can report fraud or danger without fear. It only works if people trust it.', k: 0.2, months: 3, success: 70,
    win: { eff: { m: 0.15, rep: 0.02 }, monthly: 0.1, text: 'Staff use the hotline, and problems come out early, before they turn into scandals.' },
    lose: { now: { morale: -2 }, text: 'Nobody trusted it. The line sits silent, and people wonder what you are afraid of.' } },
];
