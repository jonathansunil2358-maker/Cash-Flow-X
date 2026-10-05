import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef, PolOption } from '../data8';

/** Topic: Customer service. Every id starts with "service_" (policies and projects) or "e9_service_" (events). */
const base = (name: string, blurb: string): PolOption => opt(name, blurb, {});

export const policies: PolicyDef[] = [
  { id: 'service_response', group: 'customers', name: 'Response-time targets', blurb: 'How fast you promise to reply when a customer gets in touch. Quicker replies please people and wear out the team.', options: [
    base('No promises on timing', 'You reply when you get to it.'),
    opt('One working day on every channel', 'A sensible promise you can keep without much strain.', { rep: 0.02 }, 0.3),
    opt('An hour on chat and phone, a day on email', 'Fast where people are impatient and relaxed where they are not.', { rep: 0.035, ch: 0.99, m: -0.05 }, 0.6),
    opt('One hour on every channel', 'Customers are delighted, and the support team is always rushing.', { rep: 0.05, ch: 0.985, m: -0.15 }, 1)] },
  { id: 'service_sla', group: 'customers', name: 'Service-level agreements', blurb: 'An SLA is a written promise to a big client about how fast you will respond and how much money they get back if you miss it.', options: [
    base('Promises by handshake', 'Flexible, and the big clients are not reassured.'),
    opt('A standard SLA', 'Big clients like seeing it in writing. Miss a target and you owe them.', { d: 1.01, risk: [4, 2, 'You missed a promise in a service agreement and owed a client a refund.'] }),
    opt('A gold-standard SLA', 'Premium promises win premium clients, and the penalties for missing them are big.', { d: 1.02, ch: 0.99, risk: [8, 4, 'You missed a gold-standard target and paid a large penalty.'] }, 0.3)] },
  { id: 'service_refunds', group: 'customers', name: 'Refund authority for agents', blurb: 'How much money your support staff may hand back without asking a manager first.', options: [
    base('Managers approve every refund', 'Safe and slow, and customers wait.'),
    opt('Agents can refund up to a small limit', 'Most problems are fixed on the first call. A little money leaks.', { ch: 0.99 }, 0.2),
    opt('Agents can refund anything', 'Trusted, empowered staff and delighted customers, with a few bad apples.', { ch: 0.975, m: 0.15, rep: 0.02, risk: [5, 2, 'Some agents refunded too freely and money leaked away.'] }, 0.8)] },
  { id: 'service_survey', group: 'customers', name: 'Satisfaction survey cadence', blurb: 'How often you ask customers how you are doing. More surveys teach you more and annoy people more.', options: [
    base('No surveys', 'You guess how people feel.'),
    opt('One survey a year', 'A snapshot that is a bit out of date by the time you read it.', { q: 0.005 }, 0.05),
    opt('A short survey every quarter', 'Fresh feedback, regularly, without too much fuss.', { q: 0.01 }, 0.15),
    opt('A rating request after every order', 'Constant feedback, though some people get fed up with the pop-ups.', { q: 0.015, d: 0.995 }, 0.35)] },
  { id: 'service_channels', group: 'customers', name: 'Live chat versus phone', blurb: 'Which ways customers can reach you. Chat lets one agent help several people at once. Phone is personal, one caller at a time.', options: [
    base('Email only', 'Cheap, and slow for urgent problems.'),
    opt('Live chat', 'Quick, cheap per conversation, and a bit impersonal.', { d: 1.005 }, 0.4),
    opt('A phone line', 'Warmer and more trusted, and it costs far more per customer.', { rep: 0.03, ch: 0.99 }, 0.9),
    opt('Chat and phone together', 'The full service, and the costs of both.', { d: 1.01, ch: 0.985, rep: 0.03, m: -0.1 }, 1.5)] },
  { id: 'service_callcentre', group: 'ops', name: 'Call-centre outsourcing', blurb: 'Outsourcing means paying another company to run your support. It is cheaper, but they know less about your business.', options: [
    base('Your own support team', 'They know your products and your customers.'),
    opt('A call centre in the UK', 'Saves some money, with decent English and a little less care.', { rep: -0.01 }, -0.3, 0.5),
    opt('An overseas call centre', 'Saves a lot of money, but customers feel the distance.', { rep: -0.03, ch: 1.01 }, -0.7, 0.8)] },
  { id: 'service_scripts', group: 'people', name: 'Agent scripts or freedom', blurb: 'Do your support agents read from a script, or use their own judgement within a few principles?', options: [
    base('Light guidance', 'A few tips and a lot of habit.'),
    opt('Strict scripts', 'Every customer hears the same thing, and agents feel like robots.', { q: 0.01, m: -0.2, rep: -0.01 }),
    opt('Freedom within principles', 'Agents sound human and fix things creatively. Sometimes they promise too much.', { rep: 0.03, m: 0.2, risk: [3, 1.5, 'An agent went off script and promised more than you can deliver.'] }, 0.3)] },
  { id: 'service_vip', group: 'customers', name: 'VIP-customer concierge', blurb: 'A concierge is a personal helper who looks after your best customers and sorts out their problems.', options: [
    base('Everyone gets the same service', 'Fair, and nobody feels special.'),
    opt('A named contact for top customers', 'One person to call, who knows them by name.', { ch: 0.99, d: 1.005 }, 0.5),
    opt('A 24-hour concierge line', 'Top customers get an answer at any hour, and your team takes turns on the night shift.', { ch: 0.98, d: 1.01, rep: 0.02, m: -0.1 }, 1.3)] },
  { id: 'service_afterhours', group: 'customers', name: 'After-hours support', blurb: 'Whether anyone is on hand when customers have a problem in the evening or at the weekend.', options: [
    base('Nine to five only', 'Customers can leave a message.'),
    opt('Evening cover', 'Someone answers until late. Staff are tired and the rota is tricky.', { d: 1.005, m: -0.1 }, 0.4),
    opt('An overnight on-call rota', 'Always on. People get paid extra, and sleep badly.', { d: 1.01, ch: 0.99, m: -0.25 }, 0.9)] },
  { id: 'service_languages', group: 'customers', name: 'Language-support coverage', blurb: 'Which languages your customers can use to get help.', options: [
    base('English only', 'Simple, and a lot of people are left out.'),
    opt('Add two big languages', 'Support in the two languages your customers ask for most.', { d: 1.01 }, 0.4, 0.4),
    opt('Every major language', 'Customers all over feel welcome, and translation costs are high. A mistranslation is possible.', { d: 1.02, rep: 0.02, risk: [3, 1, 'A mistranslated reply upset a customer.'] }, 1, 1)] },
];

export const events: EvSpec[] = [
  { id: 'e9_service_ladder', title: 'A complaint climbs the ladder', icon: 'flame', good: false, per: 1.5, cd: 12, story: 'A customer has been passed from agent to supervisor to manager and now wants to speak to the owner. A complaint-escalation ladder is the series of steps a complaint takes upwards if nobody solves it.', choices: [
    S('owner', 'Call them yourself', 'Takes your time, and customers remember it.', '', { gamble: { p: 0.75, good: { rep: 2 }, bad: { rep: -1, morale: -1 }, goodText: 'They were stunned to hear from the boss and became a fan.', badText: 'They had a long list, and the call went badly.' } }),
    S('ladder', 'Let the team follow the process', 'Fair, slow and a bit cold.', 'Your team felt trusted to run the process, and it worked slowly.', { eff: { morale: 1 } }),
    S('shortcut', 'Give them a big refund to end it', 'Fast, and others might copy them.', 'They went away happy and told a few friends.', { k: 0.02, acct: 'otherCosts', eff: { rep: 1 } })] },
  { id: 'e9_service_nps', title: 'Your Net Promoter Score arrives', icon: 'chart', good: true, per: 1.5, cd: 12, min: 6, story: 'Your first Net Promoter Score is in. It comes from one question, "How likely are you to recommend us to a friend?" Scores run from minus 100 to plus 100, and yours is decent but not great.', choices: [
    S('learn', 'Read every comment and act on it', 'Slow work that pays off.', 'The comments pointed at three fixable problems.', { k: 0.01, acct: 'otherCosts', eff: { quality: 1, rep: 1 } }),
    S('bonus', 'Tie staff bonuses to the score', 'Powerful, and easy to game.', '', { gamble: { p: 0.55, good: { quality: 1.5, morale: 1 }, bad: { rep: -2 }, goodText: 'Everyone focused on delighting customers.', badText: 'Agents began begging customers for top marks, and people noticed.' } }),
    S('frame', 'Frame it for the office wall', 'Free and flattering, and nothing changes.', 'Everyone felt good for a day, and nothing improved.', { eff: { morale: 1 } })] },
  { id: 'e9_service_social', title: 'Angry posts spread before you spot them', icon: 'globe', good: false, per: 1.5, cd: 12, story: 'Two angry customer posts spread online before you even noticed. You are wondering whether to monitor social media for complaints, by software or by a person, so you can reply early.', choices: [
    S('tool', 'Buy a monitoring tool for a year', 'It alerts you the moment someone complains.', 'Alerts let you fix problems in public before they spread.', { k: 0.02, acct: 'marketing', eff: { rep: 2 } }),
    S('person', 'Give someone an hour a day to watch', 'Cheap, and it eats into their real work.', 'It helped, and the person grumbled about the extra work.', { eff: { rep: 1, morale: -1 } }),
    S('skip', 'Carry on as you are', 'Free, and the next one may go viral.', '', { gamble: { p: 0.6, good: {}, bad: { rep: -3, d: E(0.98, 2) }, goodText: 'No more posts took off.', badText: 'Another angry post went viral before you saw it.' } })] },
  { id: 'e9_service_recovery', title: 'You let a loyal customer down', icon: 'heart', good: false, per: 2, cd: 10, story: 'An order for one of your loyal customers went badly wrong: it arrived late, damaged and without an apology. They are upset and have told you so. Putting it right is called service recovery.', choices: [
    S('gift', 'Send a thoughtful gift and an apology', 'Costs little and feels personal.', 'They wrote back to thank you for the care.', { k: 0.008, acct: 'marketing', eff: { rep: 1 } }),
    S('generous', 'Refund and offer a free next order', 'Costs more, and can win a fan for life.', 'They became a loud fan, and told everyone how well you handled it.', { k: 0.03, acct: 'marketing', eff: { rep: 2, brand: 1.005 } }),
    S('refund', 'Just refund the money', 'Cheap, cold and sometimes not enough.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -2 }, goodText: 'They accepted the refund and carried on shopping.', badText: 'They felt brushed off and posted a bad review.' } })] },
  { id: 'e9_service_account', title: 'A top client wants more attention', icon: 'crown', good: false, per: 1.5, cd: 18, story: 'One of your biggest clients says it feels like "just another number" and has been talking to a rival. A key-account manager is one person whose whole job is looking after your most valuable customers.', choices: [
    S('hire', 'Assign a dedicated account manager', 'Costs a salary and keeps the client close.', '', { k: 0.03, acct: 'wages', gamble: { p: 0.75, good: { d: E(1.03, 10), rep: 1 }, bad: { morale: -1 }, goodText: 'The client felt valued, ordered more and recommended you.', badText: 'The manager and the client never clicked.' } }),
    S('share', 'Share the job between your leaders', 'Free, and spreads you thin.', '', { gamble: { p: 0.5, good: { d: E(1.01, 6) }, bad: { d: E(0.97, 4) }, goodText: 'They liked the personal attention from senior people.', badText: 'Nobody owned the relationship, and the client drifted away.' } }),
    S('no', 'Say you treat everyone alike', 'Fair, and you might lose them.', '', { gamble: { p: 0.55, good: {}, bad: { d: E(0.96, 6) }, goodText: 'They stayed, grumbling.', badText: 'They moved a chunk of their work to your rival.' } })] },
  { id: 'e9_service_credits', title: 'A failure: should you hand out credits?', icon: 'shield', good: false, per: 1.5, cd: 18, story: 'Your service went wrong for most of a day, and customers who pay by the month are asking for money back. A service credit is a discount on the next bill, for a failure that was your fault.', choices: [
    S('auto', 'Credit everyone automatically', 'Costly, and it builds trust.', 'Customers did not even need to ask, and many said so online.', { k: 0.04, acct: 'otherCosts', eff: { rep: 2, quality: 0.5 } }),
    S('request', 'Credit only those who ask', 'Cheaper, and some feel it is grudging.', '', { k: 0.015, acct: 'otherCosts', gamble: { p: 0.6, good: { rep: 1 }, bad: { rep: -1 }, goodText: 'Most people accepted it as fair.', badText: 'Customers who had to ask felt you were being stingy.' } }),
    S('none', 'Offer apologies only', 'Free, and the angriest customers leave.', 'Words are cheap, and some customers left.', { eff: { rep: -2, d: E(0.99, 3) } })] },
  { id: 'e9_service_award', title: 'Shortlisted for a service award', icon: 'star', good: true, per: 1.5, cd: 24, min: 12, story: 'A trade body runs an award for the best complaint handling. A customer has nominated you, and the judges will study a few of your real cases.', choices: [
    S('enter', 'Enter with your best cases', 'Takes time and a fee, with a prize if you win.', '', { k: 0.01, acct: 'marketing', gamble: { p: 0.4, good: { brand: 1.03, rep: 2, morale: 2 }, bad: { morale: -1 }, goodText: 'You won, and the trophy sits proudly at reception.', badText: 'You missed out, and the team was a bit flat.' } }),
    S('improve', 'Improve first, enter next year', 'Use the push to fix your process.', 'Preparing showed you what to fix, and morale got a lift.', { k: 0.015, acct: 'otherCosts', eff: { quality: 1, morale: 1 } }),
    S('pass', 'Politely decline', 'Free, and you stay focused.', 'You stayed focused on the day job.')] },
];

export const projects: InitiativeDef[] = [
  { id: 'service_helpcentre', name: 'Help-centre articles', blurb: 'Write clear how-to pages and answers so customers can solve small problems themselves, at any hour.', k: 0.5, months: 4, success: 85,
    win: { eff: { cap: 1.01, ch: 0.995 }, monthly: -0.15, text: 'Customers found their own answers, and the phones got quieter.' },
    lose: { now: { morale: -1 }, text: 'The articles were out of date within weeks and barely read.' } },
  { id: 'service_warrantyspeed', name: 'Faster warranty claims', blurb: 'Build a fast lane for warranty claims, so customers are not left waiting weeks for what you promised.', k: 0.5, months: 4, success: 80,
    win: { eff: { rep: 0.03, ch: 0.99 }, monthly: 0.15, text: 'Customers praised how quickly their claims were settled, though quick payouts cost a bit more.' },
    lose: { now: { rep: -1 }, text: 'The new process was just as slow as the old one, with extra forms.' } },
  { id: 'service_repeatcontact', name: 'Cut repeat contacts', blurb: 'Find out why customers have to contact you twice about one problem, and fix the causes.', k: 0.5, months: 4, success: 75,
    win: { eff: { cap: 1.015, rep: 0.01 }, text: 'Problems got solved first time, which freed the team up for other work.' },
    lose: { now: { morale: -1 }, text: 'The causes were many and messy, and nothing much changed.' } },
  { id: 'service_community', name: 'Customer community with moderators', blurb: 'Open an online space where customers help each other, kept friendly by a few moderators.', k: 0.8, months: 6, success: 65,
    win: { eff: { ch: 0.98, d: 1.01, rep: 0.02 }, monthly: 0.2, text: 'Customers answer each other\'s questions, and a friendly crowd keeps people close.' },
    lose: { now: { rep: -1 }, text: 'The forum turned out either empty or full of arguments.' } },
  { id: 'service_onboarding', name: 'Onboarding calls for new customers', blurb: 'Ring every new customer in their first week to help them get going. Onboarding means helping people start well.', k: 0.6, months: 3, success: 85,
    win: { eff: { ch: 0.985, d: 1.005 }, monthly: 0.3, text: 'New customers got started faster and stayed longer, at the cost of lots of phone time.' },
    lose: { now: { morale: -1 }, text: 'Most people did not pick up, and the callers felt like cold-callers.' } },
  { id: 'service_churninterviews', name: 'Churn-interview programme', blurb: 'Phone the customers who left and ask honestly why. Churn is the rate at which customers stop buying.', k: 0.4, months: 4, success: 80,
    win: { eff: { ch: 0.985, q: 0.01 }, text: 'Leavers told you three things you could fix, and you fixed them.' },
    lose: { now: { morale: -1 }, text: 'Few picked up the phone, and the answers were polite and useless.' } },
  { id: 'service_feedbackloop', name: 'Feedback loop to product teams', blurb: 'Get support staff and product makers in the same room, so complaints turn into improvements.', k: 0.6, months: 6, success: 75,
    win: { eff: { q: 0.02, ch: 0.99 }, monthly: 0.1, text: 'Support stories now shape what you build, and the products improved.' },
    lose: { now: { morale: -1 }, text: 'The meetings turned into a complaints session, and people stopped coming.' } },
  { id: 'service_accessibility', name: 'Accessibility improvements', blurb: 'Make your premises, website and support easy for disabled customers to use, from step-free access to screen-reader friendly pages.', k: 1, months: 6, success: 80,
    win: { eff: { d: 1.015, rep: 0.03 }, monthly: 0.1, text: 'More people can use you with ease, and you got a lot of warm feedback.' },
    lose: { now: { c: E(1.01, 3), rep: -1 }, text: 'The audit found more to fix than expected, and the first fixes missed the mark.' } },
];
