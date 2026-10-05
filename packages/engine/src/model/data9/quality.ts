import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Quality and operations. Every id must start with "quality_" (policies and projects) or "e9_quality_" (events). */
export const policies: PolicyDef[] = [
  // 676 Defect-rate tracking by line
  { id: 'quality_defecttrack', group: 'ops', name: 'Defect tracking', blurb: 'A defect is anything that comes out wrong. Counting them line by line shows where the real problems live.', options: [
    opt('Spot checks', 'Check a few items now and then, and fix whatever you happen to find.', {}),
    opt('Count defects on every line', 'Record every fault and where it came from. Trouble spots show up, at the price of extra checking time.', { q: 0.015, cap: 0.995 }, 0.2, 0.3),
    opt('Live defect dashboards', 'Screens show faults as they happen, so problems get fixed within the hour. The sensors and screens are costly.', { q: 0.025, c: 0.997, cap: 0.99 }, 0.5, 0.8)] },
  // 680 Preventive-maintenance schedule
  { id: 'quality_maintenance', group: 'ops', name: 'Maintenance schedule', blurb: 'Preventive maintenance means servicing machines before they break. It costs money and downtime, but breakdowns usually cost more.', options: [
    opt('A basic yearly service', 'Service machines once a year and mend them as they break.', {}),
    opt('Skip servicing', 'Save the servicing money for now. Sooner or later a machine breaks at the worst possible moment.', { risk: [5, 4, 'An unserviced machine broke down in the middle of a big order.'] }, -0.3),
    opt('Quarterly servicing', 'Engineers check every machine each quarter. Less downtime, though service contracts cost money.', { cap: 1.01, c: 0.998 }, 0.35),
    opt('Predictive maintenance', 'Sensors warn you before a part fails, so surprises are rare. Sensors and software are dear to set up.', { cap: 1.02, c: 0.995 }, 0.8, 1.5)] },
  // 682 Batch-size trade-offs
  { id: 'quality_batchsize', group: 'ops', name: 'Batch size', blurb: 'A batch is how many items you make in one go. Big batches are cheaper per item, but a mistake spoils the whole lot.', stock: true, options: [
    opt('Medium batches', 'A sensible middle size.', {}),
    opt('Small batches', 'Faults are spotted quickly and little is wasted, but you stop and restart machines more often.', { q: 0.015, c: 1.01 }),
    opt('Large batches', 'Fewer set-ups make each item cheaper. If a fault sneaks in, a whole big batch may be scrapped.', { c: 0.99, risk: [4, 3, 'A fault went unnoticed and a whole large batch was scrapped.'] })] },
  // 684 Supplier-quality audits
  { id: 'quality_supplieraudit', group: 'ops', name: 'Supplier quality audits', blurb: 'An audit is a visit to check how a supplier works. If their quality slips, yours does too.', options: [
    opt('Trust your suppliers', 'Take their word, and check only when something goes wrong.', {}),
    opt('Audit every year', 'Visit each main supplier once a year. Quality improves, though careful suppliers charge a little more.', { q: 0.01, c: 1.003 }, 0.2),
    opt('Audit often and test deliveries', 'Frequent visits and tests on arrival. Faulty parts rarely get through, but suppliers feel distrusted and charge more.', { q: 0.02, c: 1.008 }, 0.5)] },
  // 685 Overall-equipment-effectiveness score
  { id: 'quality_oee', group: 'ops', name: 'Equipment effectiveness score', blurb: 'OEE (overall equipment effectiveness) shows what share of planned time your machines make good items at full speed. 100% would be perfect, and most firms are far below it.', options: [
    opt('Do not measure', 'Judge machines by how busy they look.', {}),
    opt('Track OEE weekly', 'Put a score on every machine and talk about it each week. Hidden waste comes to light.', { cap: 1.01 }, 0.2, 0.3),
    opt('Pay bonuses on OEE', 'A target and a bonus. Output jumps, but when you reward a number, people chase the number and some corners get cut.', { cap: 1.02, q: -0.01 }, 0.4)] },
  // 686 Cycle-time reduction targets
  { id: 'quality_cycletime', group: 'customers', name: 'Cycle-time targets', blurb: 'Cycle time is how long one order takes from being placed to being delivered. Shorter means happier customers.', options: [
    opt('No targets', 'Orders take as long as they take.', {}),
    opt('Steady targets', 'Aim to shave a little time off each quarter. Customers get their orders sooner and are more likely to stay.', { d: 1.008, ch: 0.995 }, 0.2),
    opt('Race the clock', 'Tough speed targets. Orders fly out and customers love it, but people feel rushed and quality slips.', { d: 1.015, ch: 0.99, q: -0.02, m: -0.2 }, 0.3)] },
  // 688 Production-scheduling rules
  { id: 'quality_scheduling', group: 'ops', name: 'Scheduling rule', blurb: 'When several jobs are waiting, which one goes first? The rule you pick decides who waits.', options: [
    opt('First come, first served', 'Simple and fair. Jobs go through in the order they arrived.', {}),
    opt('Shortest job first', 'Quick jobs jump the queue, so more gets finished each week. Big orders keep being pushed back, and big customers grumble.', { cap: 1.015, ch: 1.01 }),
    opt('Best customers first', 'Priority for your most valuable accounts. They stay loyal, while everyone else waits longer and capacity is a little wasted on reshuffling.', { ch: 0.985, cap: 0.99 })] },
  // 692 Customer-complaint root-cause reviews
  { id: 'quality_rootcause', group: 'customers', name: 'Complaint root-cause reviews', blurb: 'A root-cause review asks "why?" again and again until you reach the real reason a customer was let down, instead of just apologising.', options: [
    opt('Apologise and move on', 'Say sorry, fix this one case and get on with the day.', {}),
    opt('Review the big complaints', 'A short investigation for every serious complaint. Repeat problems fade.', { q: 0.015, ch: 0.99 }, 0.2),
    opt('Review every complaint', 'Nothing is ignored, and the same fault rarely strikes twice. It takes a lot of time, and a bit of finger-pointing creeps in.', { q: 0.025, ch: 0.98, m: -0.05 }, 0.6)] },
  // 699 Continuous-improvement suggestion bonus
  { id: 'quality_suggestions', group: 'people', name: 'Improvement suggestion bonus', blurb: 'Reward staff for ideas that make work better. The people doing a job often know best how to improve it.', options: [
    opt('No reward', 'Ideas are welcome, but there is nothing in it for whoever has them.', {}),
    opt('A thank-you voucher', 'A small reward for each idea you use. A steady drip of small fixes.', { c: 0.997, m: 0.1 }, 0.15),
    opt('Share the savings', 'Staff get a share of what each idea saves. The best ideas flow in, and the payouts grow too.', { c: 0.992, m: 0.15 }, 0.5)] },
];

export const events: EvSpec[] = [
  // 678 Customer-return analysis
  { id: 'e9_quality_returns', title: 'Returns pile up with a pattern', icon: 'parcel', good: false, per: 1.5, cd: 18, story: 'Customers keep sending back the same item for the same reason. Studying returns, called customer-return analysis, can show you the real fault, but sorting through a mountain of parcels takes effort.', choices: [
    S('analyse', 'Analyse every return', 'Costs time and money, and finds the root cause.', 'You found a faulty part, changed the supplier, and the returns dried up.', { k: 0.015, eff: { quality: 2, rep: 1 } }),
    S('worst', 'Fix the worst batch and move on', 'Quick and partly effective.', 'You fixed the main problem, though the odd return still trickles in.', { k: 0.008, eff: { quality: 1 } }),
    S('refund', 'Refund and carry on', 'Cheap now, and the cause stays.', '', { gamble: { p: 0.4, good: {}, bad: { rep: -2, d: E(0.98, 4) }, goodText: 'The returns tailed off by themselves.', badText: 'The faulty batch spread, and reviews turned sour.' } })] },
  // 687 Safety-incident near-miss reporting
  { id: 'e9_quality_nearmiss', title: 'A near miss on the shop floor', icon: 'shield', good: false, per: 1.5, cd: 18, gate: 'team', story: 'A pallet fell and missed a colleague by inches. Nobody was hurt, but it could have been serious. A near miss is an accident that nearly happened, and reporting them lets you fix hazards before anyone is hurt.', choices: [
    S('thank', 'Thank the reporter and fix the hazard', 'Cheap, and it encourages more reports.', 'The hazard was fixed, and people saw that speaking up is welcome.', { k: 0.01, eff: { morale: 1, quality: 1 } }),
    S('blame', 'Find out who was careless', 'Free, but people stop reporting.', 'Nobody reported anything for months, and you stopped hearing about hazards.', { eff: { morale: -2, quality: -1 } }),
    S('noted', 'Write it down and move on', 'Free, and the hazard stays.', '', { gamble: { p: 0.4, good: {}, bad: { morale: -3, rep: -1 }, goodText: 'Nothing else happened.', badText: 'The same hazard injured someone a few weeks later.' } })] },
  // 689 Make-or-buy analysis for components
  { id: 'e9_quality_makebuy', title: 'Make it or buy it?', icon: 'gear', good: true, per: 1.2, cd: 30, gate: 'stock', story: 'A part you buy in keeps getting dearer. You could start making it yourself, but then you need machines, space and skills. This is called a make-or-buy decision.', choices: [
    S('make', 'Make it in-house', 'A big outlay, and a cheaper part if it works.', '', { k: 0.07, gamble: { p: 0.7, good: { c: E(0.97, 12), quality: 1 }, bad: { c: E(1.01, 6) }, goodText: 'Your own line works, and the part is cheaper and better.', badText: 'Learning to make it took longer than hoped, and costs ran high for a while.' } }),
    S('buy', 'Keep buying, from a better supplier', 'Less risk and a modest gain.', 'The new supplier was a little pricier, but more reliable.', { k: 0.01, eff: { quality: 1, c: E(1.005, 12) } }),
    S('sums', 'Do the sums properly first', 'A week of costing before you decide.', 'Armed with your costings, you negotiated a better price and kept buying.', { k: 0.005, eff: { c: E(0.995, 12) } })] },
  // 690 Capacity-planning for peak seasons
  { id: 'e9_quality_peakplan', title: 'The busy season is coming', icon: 'mountain', good: true, per: 1.5, cd: 12, story: 'Your busiest weeks are about to arrive, and last year you struggled to keep up. Capacity planning means working out in advance how much you can deliver and where the squeeze will come.', choices: [
    S('temps', 'Hire seasonal temps', 'Extra hands cost less than lost orders, though they are new.', 'Temps handled the rush, though a few mistakes slipped through.', { k: 0.03, acct: 'wages', eff: { d: E(1.03, 3), quality: -1 } }),
    S('spare', 'Add spare machines and rotas', 'Dearer, and it works better.', 'You had plenty of capacity, and orders flowed out smoothly.', { k: 0.06, eff: { d: E(1.05, 3), rep: 1 } }),
    S('react', 'React when it hits', 'Free, until you are swamped.', '', { gamble: { p: 0.5, good: { d: E(1.02, 3) }, bad: { d: E(0.96, 3), rep: -2 }, goodText: 'It was a quiet peak, and you coped.', badText: 'Orders arrived faster than you could ship them, and customers waited.' } })] },
  // 694 Shift-handover quality
  { id: 'e9_quality_handover', title: 'A shift handover goes wrong', icon: 'gear', good: false, per: 1.5, cd: 16, gate: 'team', story: 'The night shift did not tell the day shift about a machine fault, and a morning of faulty goods went out. A handover is the moment one shift passes information to the next, and gaps in it cause many mistakes.', choices: [
    S('notes', 'Introduce written handover notes', 'Cheap, simple and effective.', 'A one-page note at every change of shift stopped the same slip from happening again.', { k: 0.005, eff: { quality: 1 } }),
    S('overlap', 'Overlap the shifts by half an hour', 'Costs wages, and people talk face to face.', 'The overlap let people talk, and quality and mood both improved.', { k: 0.03, acct: 'wages', eff: { quality: 2, morale: 1 } }),
    S('careful', 'Tell everyone to be more careful', 'Free, and it rarely works.', '', { gamble: { p: 0.35, good: { quality: 1 }, bad: { quality: -1, c: E(1.02, 3) }, goodText: 'People took it to heart, and things improved for a while.', badText: 'Nothing changed, and the same mistake cost you again.' } })] },
  // 695 Tool-and-die lifespan
  { id: 'e9_quality_toolwear', title: 'The tooling is wearing out', icon: 'gear', good: false, per: 1.2, cd: 24, gate: 'stock', story: 'The dies and moulds that shape your parts wear a little with every run. Parts are now coming out slightly off, and the tooling is nearing the end of its life.', choices: [
    S('replace', 'Replace the tooling now', 'Dear, and the parts are right again.', 'Fresh tooling brought crisp parts and less scrap.', { k: 0.05, eff: { quality: 2, c: E(0.99, 8) } }),
    S('regrind', 'Regrind and carry on', 'Cheaper, and only a short extension.', 'Regrinding bought you a few more months of acceptable parts.', { k: 0.015, eff: { quality: 1 } }),
    S('push', 'Run it until it fails', 'Free now, but scrap rises.', '', { gamble: { p: 0.45, good: {}, bad: { quality: -2, c: E(1.03, 4) }, goodText: 'The tooling lasted just long enough.', badText: 'The tooling cracked mid-run, and scrap piled up.' } })] },
  // 698 Operational-risk register
  { id: 'e9_quality_riskregister', title: 'Your risk register shows red', icon: 'flame', good: false, per: 1.3, cd: 24, story: 'You have started an operational-risk register: a list of things that could go wrong in daily work, scored by how likely and how damaging each one is. The top item scores red. All your output depends on one old machine and one key supplier.', choices: [
    S('fix', 'Fix it properly', 'A big spend that removes the weak spot.', 'The weak spot is gone, and the line runs more smoothly.', { k: 0.05, eff: { quality: 1, c: E(0.995, 10) } }),
    S('backup', 'Arrange a backup plan', 'Cheaper, but less complete.', 'A spare supplier and a repair contract now stand behind the weak spot.', { k: 0.02, eff: { quality: 1 } }),
    S('accept', 'Accept the risk', 'Free, and you may get away with it.', '', { gamble: { p: 0.65, good: {}, bad: { d: E(0.95, 3), rep: -2 }, goodText: 'Nothing went wrong this time.', badText: 'The old machine failed, deliveries stopped, and customers noticed.' } })] },
];

export const projects: InitiativeDef[] = [
  // 677 Six-sigma improvement projects
  { id: 'quality_sixsigma', name: 'Six Sigma improvement project', blurb: 'Six Sigma is a method for cutting defects by measuring, finding root causes and fixing them one at a time. Train a few "belts" (your in-house experts) and attack one problem properly.', k: 1, months: 9, success: 65,
    win: { eff: { c: 0.99, q: 0.02 }, monthly: 0.1, now: { quality: 1 }, text: 'Defects fell sharply, and the savings keep coming. Your belts now spot waste everywhere.' },
    lose: { now: { morale: -1 }, text: 'The project stalled halfway. People were busy and the data was messy, so the training money bought little.' } },
  // 679 Process-mapping of the order flow
  { id: 'quality_processmap', name: 'Map the order flow', blurb: 'Draw every step an order takes, from the click to the doorstep. Missing steps, loops and delays show up on one page.', k: 0.5, months: 3, success: 80,
    win: { eff: { cap: 1.015, c: 0.995 }, text: 'You found three pointless hand-offs and removed them. Orders now flow faster at lower cost.' },
    lose: { now: { morale: -1 }, text: 'The map was beautiful, but nobody agreed on which steps to cut, so nothing changed.' } },
  // 681 Bottleneck analysis in production
  { id: 'quality_bottleneck', name: 'Bottleneck analysis', blurb: 'In any process, one step is slowest, and it limits everything else. A bottleneck analysis finds that step so you can widen it.', k: 0.6, months: 4, success: 75,
    win: { eff: { cap: 1.02 }, monthly: 0.1, text: 'The slow step was one overloaded machine and one checking desk. Fixing them lifted the whole line.' },
    lose: { text: 'The analysis blamed a different step every week. The money is spent, and the real bottleneck is still hiding.' } },
  // 683 Standard-operating-procedure writing
  { id: 'quality_sops', name: 'Write the standard procedures', blurb: 'An SOP (standard operating procedure) is a plain step-by-step guide to doing a job the right way. Written down, they help new people learn faster and mistakes fall.', k: 0.4, months: 4, success: 85,
    win: { eff: { q: 0.015, cap: 1.005 }, text: 'New starters are productive in days, not weeks, and the same job is now done the same way every time.' },
    lose: { now: { morale: -1 }, text: 'The folders were written, filed and never opened. People felt it was paperwork for its own sake.' } },
  // 691 Quality certificates and renewals
  { id: 'quality_iso', name: 'Win a quality certificate', blurb: 'Quality certificates, such as the ISO 9001 standard, show that an outside auditor has checked how you work. Big customers often insist on one. You must pass the audit and then pay for check-ups every year.', k: 1.2, months: 10, success: 70,
    win: { eff: { d: 1.015 }, monthly: 0.15, now: { rep: 2 }, text: 'You passed the audit. The certificate opens doors with cautious buyers, and the yearly check-ups cost a little.' },
    lose: { now: { morale: -1 }, text: 'The auditor found gaps in your records and you did not pass. You can try again later.' } },
  // 693 Waste-reduction targets
  { id: 'quality_wastedrive', name: 'Waste-reduction drive', blurb: 'Set a target to cut waste, such as scrap, idle time and needless movement, and track it every week.', k: 0.7, months: 6, success: 70,
    win: { eff: { c: 0.99 }, now: { rep: 1 }, text: 'Scrap bins got lighter and bills fell. People enjoyed hunting for waste.' },
    lose: { now: { morale: -1 }, text: 'The targets were too vague, and waste crept back as soon as the posters came down.' } },
  // 696 Warehouse-slotting improvements
  { id: 'quality_slotting', name: 'Re-slot the warehouse', blurb: 'Slotting means deciding where each product lives on the shelves. Putting fast sellers near the packing area saves walking and picking mistakes.', k: 0.5, months: 3, success: 80, stock: true,
    win: { eff: { cap: 1.012, c: 0.997 }, text: 'Best sellers now sit by the packing benches. Pickers walk less, make fewer errors and ship faster.' },
    lose: { now: { morale: -1 }, text: 'For a week nobody could find anything, and the new layout was quietly changed back.' } },
  // 697 Cross-site best-practice sharing
  { id: 'quality_sharing', name: 'Cross-site best-practice sharing', blurb: 'Your best team has found good ways of working. This project spreads them to every site and team through visits, swaps and shared notes, so everyone matches the best.', k: 0.6, months: 6, success: 70,
    win: { eff: { q: 0.015, c: 0.995 }, monthly: 0.1, text: 'The best habits spread everywhere. Quality is more even, and a small travel budget keeps the exchange going.' },
    lose: { now: { morale: -1 }, text: 'Teams resented being told how to work by outsiders, and the ideas did not catch on.' } },
  // 700 Digital-checklist adoption
  { id: 'quality_checklists', name: 'Roll out digital checklists', blurb: 'Replace paper forms with checklists on tablets or phones, so every step is ticked off and logged. Fewer forgotten steps, but only if people actually use them.', k: 0.5, months: 4, success: 80,
    win: { eff: { q: 0.015, cap: 1.005 }, monthly: 0.05, text: 'Nothing gets forgotten now, and managers can see at a glance what has been checked.' },
    lose: { now: { morale: -1 }, text: 'People ignored the tablets and kept to paper, and the subscription ran on regardless.' } },
];
