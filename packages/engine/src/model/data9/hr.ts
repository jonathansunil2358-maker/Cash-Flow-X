import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: People and HR. Every id must start with "hr_" (policies and projects) or "e9_hr_" (events). */
export const policies: PolicyDef[] = [
  // 651 Org-chart design with spans of control
  { id: 'hr_span', group: 'people', name: 'Spans of control', blurb: 'A span of control is how many people report to one manager. Wide spans mean fewer managers, and narrow spans mean more.', options: [
    opt('About seven each', 'A sensible middle: managers know their people and still have time to do real work.', {}),
    opt('Wide spans (twelve or more)', 'Fewer managers saves wages, but each one is stretched and people get less guidance.', { m: -0.15, q: -0.01 }, -0.5),
    opt('Narrow spans (four or five)', 'Managers have time to coach, so people feel looked after. You pay for more managers.', { m: 0.15, q: 0.01 }, 0.6)] },
  // 654 Recruitment-agency fees versus in-house recruiter
  { id: 'hr_recruiter', group: 'people', name: 'Recruitment route', blurb: 'Recruitment agencies charge a fee, often a slice of the new hire\'s first-year pay. An in-house recruiter is a wage you pay all year round.', options: [
    opt('Agencies as needed', 'Ring an agency when you need someone.', {}),
    opt('In-house recruiter', 'A salaried recruiter finds people directly and cuts your agency fees, but you pay their wage even in quiet months.', { hire: 0.75 }, 0.8),
    opt('Headhunters for every role', 'Premium agencies search for the very best, at premium fees.', { hire: 1.25, cap: 1.015 })] },
  // 656 Bonus-scheme design: team versus individual
  { id: 'hr_bonus', group: 'people', name: 'Bonus scheme', blurb: 'When things go well, who gets rewarded: individual stars, or the whole team?', options: [
    opt('Flat pay, no bonus', 'Everyone gets their salary and nothing extra.', {}),
    opt('Individual bonuses', 'Pay for personal results. People push harder, but they stop sharing tips and helping each other.', { cap: 1.02, m: -0.1 }, 0.6),
    opt('Team bonuses', 'Everyone shares in the team\'s result. Cooperation improves, though some feel they carry others.', { cap: 1.01, m: 0.15 }, 0.5)] },
  // 662 Overtime caps and fatigue
  { id: 'hr_overtime', group: 'people', name: 'Overtime limits', blurb: 'Overtime is extra hours worked beyond the contract. A little helps in a rush, but a lot wears people out, and mistakes follow.', options: [
    opt('Overtime as needed', 'Managers ask for extra hours when the work piles up.', {}),
    opt('Cap overtime', 'A firm limit on extra hours. People rest properly, but busy weeks are harder to cover.', { m: 0.2, q: 0.01, cap: 0.99 }),
    opt('Lean on overtime', 'Extra hours at a pay premium. Output rises while people get tired and make costly mistakes.', { cap: 1.03, m: -0.3, risk: [3, 3, 'A tired worker made an expensive mistake.'] }, 0.5)] },
  // 663 Shift-pattern fairness
  { id: 'hr_shifts', group: 'people', name: 'Shift fairness', blurb: 'Nights, weekends and early starts are unpopular. How you share them out decides who feels fairly treated.', options: [
    opt('Managers set the rota', 'Managers draw up the rota, and people accept what they are given.', {}),
    opt('Rotate shifts for everyone', 'Everybody takes a turn at the awkward shifts. It feels fair, though handovers get a bit rougher.', { m: 0.15, cap: 0.995 }),
    opt('Let people pick shifts', 'People swap and choose. Morale jumps, but nobody volunteers for the worst slots and cover costs extra.', { m: 0.3, risk: [3, 2, 'Nobody wanted the awkward shifts, and emergency cover cost extra.'] }, 0.2)] },
  // 664 Hybrid-working agreements
  { id: 'hr_hybrid', group: 'people', name: 'Hybrid working', blurb: 'Hybrid working means some days at home and some in the workplace. Many people value it, and it can shrink your space costs.', options: [
    opt('In the workplace every day', 'The traditional way, with everyone together.', {}),
    opt('Two days at home', 'A popular compromise. People are happier and hiring gets easier, but the team sees less of each other.', { m: 0.25, hire: 0.92, cap: 0.995 }, -0.2),
    opt('Fully remote', 'Hire from anywhere and cut office costs. Teamwork and learning from each other suffer.', { m: 0.35, hire: 0.85, cap: 0.985, q: -0.01 }, -0.5)] },
  // 669 Contractor versus employee decisions
  { id: 'hr_contractors', group: 'people', name: 'Contractors or employees', blurb: 'Contractors are self-employed people you hire for a job. They are flexible, but cost more by the day and are less loyal than employees.', options: [
    opt('Mostly employees', 'People on your payroll with permanent contracts.', {}),
    opt('Contractors for busy spells', 'Bring in experts when you are stretched, and let them go afterwards.', { cap: 1.02, m: -0.1 }, 0.5),
    opt('Contractors for most work', 'Maximum flexibility, but they cost a lot and may leave with your know-how. Tax inspectors also check whether they are really employees.', { cap: 1.04, hire: 0.9, m: -0.3, risk: [3, 4, 'The tax authority questioned whether your contractors were really employees.'] }, 1)] },
  // 670 Work-visa sponsorship
  { id: 'hr_visa', group: 'people', name: 'Work-visa sponsorship', blurb: 'To employ someone from abroad you may have to sponsor their visa: you vouch for them to the government and pay the fees.', options: [
    opt('Hire locally only', 'Only people who already have the right to work here.', {}),
    opt('Sponsor for key roles', 'Reach scarce skills you cannot find nearby. Each hire costs more in fees and paperwork.', { cap: 1.01, q: 0.01, hire: 1.1 }, 0.2, 0.5),
    opt('Sponsor widely', 'A bigger talent pool and sharper skills, but plenty of fees, and sometimes a visa is refused.', { cap: 1.02, q: 0.015, hire: 1.2, risk: [2, 3, 'A visa was refused and a new hire could not start.'] }, 0.5, 0.5)] },
  // 675 Cultural-fit hiring screens
  { id: 'hr_culturefit', group: 'people', name: 'Cultural-fit hiring', blurb: 'Do you hire people who match your team, or people who add something new? Each choice has a price.', options: [
    opt('Hire on skills', 'The best skills for the job win, whoever they are.', {}),
    opt('Culture-fit screen', 'Hire people who fit in. The team gets on well, but starts to think alike and misses new ideas.', { m: 0.2, q: -0.01 }, 0.1),
    opt('Culture-add screen', 'Hire people who bring something the team lacks. Ideas improve, but interviews take longer and some clashes follow.', { q: 0.015, m: -0.05, hire: 1.05 }, 0.2)] },
];

export const events: EvSpec[] = [
  // 653 Gender-pay-gap report
  { id: 'e9_hr_paygap', title: 'Gender pay gap report is due', icon: 'chart', good: false, per: 1.2, cd: 30, gate: 'team', min: 18, story: 'Larger employers must publish the average pay of men and women. Your numbers show a gap, which usually reflects who holds the better-paid jobs. Staff and the press will read the report.', choices: [
    S('open', 'Publish it and set a plan', 'Honest and calm. Costs a little to act on.', 'You published the figures with a clear plan, and most people respected it.', { k: 0.02, acct: 'wages', eff: { morale: 2, rep: 1 } }),
    S('fix', 'Review pay and fix the gaps', 'A bigger cost, and a bigger payoff.', 'You corrected unfair differences and told everyone. Trust went up.', { k: 0.05, acct: 'wages', eff: { morale: 3, rep: 2 } }),
    S('hide', 'Bury it in the small print', 'Free, if nobody notices.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -3, morale: -2 }, goodText: 'Nobody noticed, and the report passed quietly.', badText: 'A reporter did notice, and the story was not kind.' } })] },
  // 655 Notice-period and replacement gaps
  { id: 'e9_hr_notice', title: 'A key person hands in notice', icon: 'key', good: false, per: 2, cd: 14, gate: 'team', story: 'One of your most capable people has resigned. Their notice period is three months, but finding a replacement could take longer. The gap between them leaving and someone else getting up to speed is the real problem.', choices: [
    S('overlap', 'Hire early and overlap', 'Costs a second wage for a while, but nothing is lost.', 'Their replacement shadowed them for weeks, and little knowledge walked out of the door.', { k: 0.02, acct: 'wages', eff: { quality: 1 } }),
    S('early', 'Let them leave early', 'Free, but the handover is hurried.', 'A quick exit meant a rushed handover and a few dropped balls.', { eff: { quality: -1, d: E(0.99, 3) } }),
    S('counter', 'Make a counter-offer', 'A pay rise may keep them, and may annoy colleagues.', '', { k: 0.04, acct: 'wages', gamble: { p: 0.55, good: { morale: 1, quality: 1 }, bad: { morale: -2 }, goodText: 'They stayed, and the team was relieved.', badText: 'They stayed, but colleagues heard about the rise and felt overlooked.' } })] },
  // 657 Employee-handbook policies
  { id: 'e9_hr_handbook', title: 'An argument about a rule nobody wrote down', icon: 'shield', good: false, per: 1.5, cd: 24, gate: 'team', story: 'Two colleagues are arguing about what counts as acceptable time off and sick days. There is no written guide, so each is sure they are right. An employee handbook is a short document that sets out the rules of work.', choices: [
    S('plain', 'Write a short plain-English handbook', 'Cheap, clear and quick.', 'A two-page guide settled the argument and the next one too.', { k: 0.01, eff: { morale: 2, quality: 0.5 } }),
    S('lawyer', 'Pay a lawyer for a full handbook', 'Thorough and legally sound, but dear.', 'The handbook was watertight, though few people read it.', { k: 0.04, eff: { morale: 1, rep: 1 } }),
    S('ruling', 'Make a ruling on the spot', 'Free, and it sets a precedent.', '', { gamble: { p: 0.6, good: { morale: 1 }, bad: { morale: -2 }, goodText: 'Your ruling was fair, and people accepted it.', badText: 'One side felt it was unfair, and the ruling became an awkward precedent.' } })] },
  // 658 Disciplinary and grievance cases
  { id: 'e9_hr_grievance', title: 'A formal complaint about a manager', icon: 'shield', good: false, per: 1.5, cd: 24, gate: 'team', story: 'An employee has raised a formal grievance, which is an official complaint, about how a manager treats the team. How you handle it matters as much as who is right.', choices: [
    S('investigate', 'Hire an independent investigator', 'Costs money, and nobody can say it was a stitch-up.', 'A fair outside review settled the matter, and people saw that complaints are taken seriously.', { k: 0.03, eff: { morale: 1, rep: 1 } }),
    S('mediate', 'Try a quiet mediated chat', 'Cheap, and it either works or it does not.', '', { k: 0.008, gamble: { p: 0.6, good: { morale: 1 }, bad: { morale: -3, rep: -1 }, goodText: 'Both sides talked it through and agreed a way forward.', badText: 'It did not settle, and the person who complained felt unheard.' } }),
    S('backmanager', 'Back the manager', 'Free, and it can poison the mood.', 'The complaint was set aside, and the team drew its own conclusions.', { eff: { morale: -3, rep: -1 } })] },
  // 659 Redundancy-round decisions in a downturn
  { id: 'e9_hr_redundancy', title: 'A slump forces a hard choice', icon: 'mountain', good: false, per: 1, cd: 30, gate: 'team', min: 24, story: 'Orders have dipped and the numbers no longer add up. Redundancy means ending a job because the work has gone, not because of anything the person did. Done badly, it hurts the people who stay as much as those who go.', choices: [
    S('voluntary', 'Offer voluntary redundancy', 'Costs a fair package, and people choose for themselves.', 'Volunteers came forward, and the wage bill dropped without a fight.', { k: 0.05, acct: 'wages', eff: { morale: -1, c: E(0.98, 12) } }),
    S('compulsory', 'Make compulsory cuts', 'Fast savings, and a frightened team.', 'The savings came fast, and so did the fear. Everyone wondered who was next.', { eff: { morale: -5, rep: -1, c: E(0.97, 12) } }),
    S('hours', 'Cut hours and freeze pay', 'Everyone shares the pain, and the savings are smaller.', 'Nobody lost a job, and most people understood why hours were cut.', { eff: { morale: -2, c: E(0.99, 6) } })] },
  // 666 Employee-engagement survey scores
  { id: 'e9_hr_survey', title: 'The engagement survey results land', icon: 'chart', good: true, per: 1.5, cd: 12, gate: 'team', min: 12, story: 'The yearly engagement survey asks staff how much they enjoy work, trust their managers and see a future here. The scores are in, and one team scored far lower than the rest.', choices: [
    S('share', 'Share everything and set targets', 'Open and brave, and the harsh answers will sting.', '', { k: 0.01, gamble: { p: 0.7, good: { morale: 3, quality: 0.5 }, bad: { morale: -2 }, goodText: 'People saw that you acted on the answers, and trust grew.', badText: 'Some of the answers were harsh, and sharing them stung before it helped.' } }),
    S('weakest', 'Focus on the weakest team', 'Targeted, with some cost for fixes.', 'You listened to the unhappy team and fixed their biggest annoyance.', { k: 0.015, acct: 'wages', eff: { morale: 2 } }),
    S('shelve', 'File it away', 'Free, and people notice.', 'People saw that the survey changed nothing, and next year fewer will bother to answer.', { eff: { morale: -2 } })] },
  // 667 Talent-poaching by rivals
  { id: 'e9_hr_poaching', title: 'A rival is poaching your people', icon: 'bolt', good: false, per: 1.5, cd: 24, gate: 'rivals', story: 'A competitor has been phoning your best people with generous offers. Poaching means tempting staff away from a rival. It is legal, but it hurts.', choices: [
    S('bonus', 'Offer retention bonuses', 'Costs money, and key people stay.', 'The bonuses worked, and your key people stayed.', { k: 0.04, acct: 'wages', eff: { morale: 1 } }),
    S('contracts', 'Remind them of their contracts', 'Cheap, but it can feel like a threat.', '', { gamble: { p: 0.5, good: {}, bad: { morale: -2, rep: -1 }, goodText: 'Notice periods and non-compete clauses (rules that stop people joining a rival for a while) held, and the calls stopped.', badText: 'It felt like a threat, and several people updated their CVs.' } }),
    S('promote', 'Let them go and promote from within', 'Free, and it gives others a chance.', 'Two people left and younger colleagues stepped up. It was bumpy, but it gave them hope.', { eff: { quality: -1, morale: 1 } })] },
  // 672 Pension auto-enrolment costs
  { id: 'e9_hr_autoenrol', title: 'Pension contributions are rising', icon: 'diamond', good: false, per: 1.2, cd: 36, gate: 'team', story: 'By law you must put staff into a workplace pension automatically and pay in a share of their wages. This is called auto-enrolment, and the legal minimum has just gone up.', choices: [
    S('absorb', 'Absorb the cost', 'Costs rise for a year, but staff are pleased.', 'Staff noticed that you did not pass the cost on, and your own costs crept up.', { eff: { c: E(1.01, 12), morale: 2 } }),
    S('holdback', 'Hold back this year\'s pay rises', 'Costs stay level, but morale drops.', 'Costs held steady, and so did the grumbling.', { eff: { morale: -3 } }),
    S('adviser', 'Hire an adviser to find savings', 'A small fee, and a decent chance of a cheaper scheme.', '', { k: 0.01, gamble: { p: 0.65, good: { c: E(0.995, 12), morale: 1 }, bad: { c: E(1.005, 12) }, goodText: 'The adviser set up a salary-sacrifice scheme, where staff swap some pay for pension, and the bill shrank.', badText: 'The adviser found little to save, and the full bill had to be paid.' } })] },
  // 673 Zero-hours-contract controversies
  { id: 'e9_hr_zerohours', title: 'Zero-hours contracts in the news', icon: 'camera', good: false, per: 1.2, cd: 30, gate: 'team', story: 'A local newspaper has noticed that some of your people are on zero-hours contracts. These promise no fixed hours, which is flexible for you and stressful for them. Readers are asking what you think.', choices: [
    S('guarantee', 'Offer guaranteed hours', 'Costs wages, and wins respect.', 'People got steady hours, and the paper ran a friendly follow-up.', { k: 0.03, acct: 'wages', eff: { morale: 2, rep: 2 } }),
    S('defend', 'Defend the flexibility', 'Free, and it depends who speaks up.', '', { gamble: { p: 0.5, good: { rep: 1 }, bad: { rep: -3, morale: -2 }, goodText: 'Staff who like flexible hours spoke up for you.', badText: 'The quotes from your own staff were not flattering.' } }),
    S('review', 'Review each contract case by case', 'Cheap and fair, with some admin.', 'People who wanted stable hours moved to fixed contracts, and the rest were left alone.', { k: 0.01, eff: { morale: 1 } })] },
  // 674 Union-negotiated pay deals
  { id: 'e9_hr_uniondeal', title: 'The union tables a pay claim', icon: 'flag', good: false, per: 1.2, cd: 30, gate: 'team', min: 18, story: 'The union that represents some of your staff has asked for a pay rise above inflation. Both sides will talk, and the outcome depends on how hard you push and how much they trust you.', choices: [
    S('agree', 'Agree their claim', 'Dear, and relations are warm.', 'The deal was signed with handshakes, and it raised your wage costs for a year.', { k: 0.05, acct: 'wages', eff: { morale: 3, c: E(1.01, 12) } }),
    S('middle', 'Counter-offer and meet in the middle', 'A fair deal at a fair price.', 'After a few rounds of talks you settled on a rise both sides could live with.', { k: 0.03, acct: 'wages', eff: { morale: 1 } }),
    S('hold', 'Hold firm', 'Free if they back down, costly if they do not.', '', { gamble: { p: 0.4, good: {}, bad: { morale: -4, d: E(0.97, 3) }, goodText: 'They accepted your offer after a tense week.', badText: 'Staff worked strictly to rule, doing only what the contract says, and orders slipped for weeks.' } })] },
];

export const projects: InitiativeDef[] = [
  // 652 Pay-band reviews to avoid inequity
  { id: 'hr_payreview', name: 'Pay-band review', blurb: 'Check that people doing similar work are paid fairly, whoever they are, and sort jobs into pay bands (a set range of pay for each level). It takes time and money, and it can show you uncomfortable things.', k: 0.6, months: 5, success: 75,
    win: { eff: { hire: 0.95 }, monthly: 0.15, now: { morale: 3, rep: 1 }, text: 'The review found and fixed a few unfair gaps, and people trust how pay is decided. Clear bands also make offers to new people easier.' },
    lose: { now: { morale: -2 }, text: 'The review exposed gaps you could not afford to fix straight away, and word got around.' } },
  // 661 Skills-gap analysis
  { id: 'hr_skillsgap', name: 'Skills-gap analysis and training', blurb: 'Work out which skills your business needs and which your people lack, then train to close the gap. Better than panic hiring, but only if people actually learn.', k: 0.5, months: 6, success: 75,
    win: { eff: { cap: 1.01, q: 0.01 }, monthly: 0.1, text: 'The analysis pointed at two gaps, and training closed them. The team can now do work you used to turn away or outsource.' },
    lose: { now: { morale: -1 }, text: 'The report said what you already knew, and the training that followed did not stick.' } },
  // 665 Leadership-training programmes
  { id: 'hr_leadership', name: 'Leadership training programme', blurb: 'Send your managers on a course in how to lead, coach and give feedback. Good managers keep good people, but courses vary in quality.', k: 0.9, months: 6, success: 65,
    win: { eff: { cap: 1.01, q: 0.01 }, monthly: 0.2, now: { morale: 2 }, text: 'Your managers came back sharper. They give clearer feedback, and their teams do better work.' },
    lose: { now: { morale: -1 }, text: 'The managers came back full of jargon, and nothing changed.' } },
  // 668 Succession pools for managers
  { id: 'hr_succession', name: 'Build a succession pool', blurb: 'Pick promising people, train them for manager jobs and keep them ready, so a sudden departure does not leave a hole. People left out may feel overlooked.', k: 0.8, months: 10, success: 65,
    win: { eff: { cap: 1.01, hire: 0.92 }, monthly: 0.2, now: { morale: 1 }, text: 'You now have ready replacements for key managers, and you rarely need to recruit from outside.' },
    lose: { now: { morale: -2 }, text: 'Two of your chosen successors left for better offers, and those who were not chosen felt overlooked.' } },
];
