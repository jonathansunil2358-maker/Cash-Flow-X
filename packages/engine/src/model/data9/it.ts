import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef, PolOption } from '../data8';

/** Topic: Automation and IT. Every id starts with "it_" (policies and projects) or "e9_it_" (events). */
const base = (name: string, blurb: string): PolOption => opt(name, blurb, {});

export const policies: PolicyDef[] = [
  { id: 'it_cloud', group: 'ops', name: 'Where your systems live', blurb: 'The cloud means renting computing power over the internet instead of owning and fixing your own servers.', options: [
    base('Servers in the back room', 'Your own computers, your own repairs.'),
    opt('Hybrid: some cloud, some own kit', 'Move the easy things online and keep the sensitive ones at home.', { cap: 1.01 }, 0.3, 0.6),
    opt('Everything in the cloud', 'Fewer repairs and easy growth, but you depend on your provider staying up.', { cap: 1.02, c: 0.995, risk: [2, 2, 'A cloud provider outage stopped your systems for a day.'] }, 0.7, 1)] },
  { id: 'it_cybertraining', group: 'people', name: 'Cyber-security training', blurb: 'Teach your team to spot scam emails and keep passwords safe. Careful staff mean customers trust you with their details.', options: [
    base('No training', 'People work it out for themselves.'),
    opt('Yearly online course', 'A short course once a year. Cheap and quickly forgotten.', { rep: 0.015 }, 0.15),
    opt('Monthly drills and fake scams', 'People stay alert, though they lose time and some feel tested.', { rep: 0.03, cap: 0.99, m: -0.1 }, 0.3)] },
  { id: 'it_support', group: 'ops', name: 'IT support arrangement', blurb: 'Who fixes it when the computers go wrong.', options: [
    base('One in-house IT person', 'A friendly face, though they cannot be everywhere.'),
    opt('Budget outsourced helpdesk', 'Cheaper than a salary, but you wait in a queue and your problem is never their priority.', { risk: [5, 2, 'Slow IT support left people idle for a day.'] }, -0.3),
    opt('Premium managed service', 'An expert team keeps everything updated and answers within the hour.', { cap: 1.01, m: 0.1 }, 0.6)] },
  { id: 'it_chatbot', group: 'customers', name: 'Customer chatbot', blurb: 'A chatbot is a program that answers customer questions by typing, at any hour. It frees up your people, but it can frustrate customers who want a person.', options: [
    base('People answer every question', 'Personal and slow.'),
    opt('Simple FAQ chatbot', 'Answers the top questions and passes the rest to a human.', { cap: 1.01, rep: -0.01 }, 0.2, 0.4),
    opt('AI assistant handles most chats', 'Saves a lot of time, and sometimes says something silly.', { cap: 1.025, rep: -0.02, ch: 1.005, risk: [3, 1.5, 'The chatbot gave a customer a wrong answer that went viral.'] }, 0.6, 1)] },
  { id: 'it_pos', group: 'ops', name: 'Tills and point-of-sale system', blurb: 'The point of sale, or POS, is where customers pay. A better one is faster and tells you what is selling.', options: [
    base('The old till', 'It works, mostly.'),
    opt('Modern card terminals', 'Quicker payments, with contactless and phone wallets.', { d: 1.005, cap: 1.005 }, 0.15, 0.3),
    opt('Full tablet system linked to stock', 'Every sale updates your stock and your reports automatically.', { d: 1.01, cap: 1.01, c: 0.995 }, 0.4, 0.8)] },
  { id: 'it_mobile', group: 'people', name: 'Tools for staff on the move', blurb: 'Give people who work away from a desk the means to do the paperwork on the spot.', options: [
    base('Paper and phone calls', 'Notes get typed up when someone is back at a desk.'),
    opt('Phone apps for field staff', 'Orders and job sheets on the phone they already carry.', { cap: 1.01 }, 0.2, 0.3),
    opt('Rugged tablets with offline mode', 'Sturdy devices that work even without a signal. Lost devices are a risk.', { cap: 1.02, m: 0.1, risk: [3, 1.5, 'A lost tablet exposed some customer details.'] }, 0.5, 0.8)] },
  { id: 'it_esign', group: 'ops', name: 'Digital signatures', blurb: 'An e-signature lets people sign contracts online in minutes, instead of printing, signing and posting.', options: [
    base('Print, sign, scan', 'Slow, but everyone understands it.'),
    opt('Use e-signatures for contracts', 'Deals close days sooner.', { d: 1.005, cap: 1.005 }, 0.1),
    opt('Go fully paperless', 'No more printing at all, but some old-fashioned clients struggle with it.', { d: 1.005, cap: 1.012, c: 0.997, risk: [3, 1, 'A client could not cope with e-signing and a deal slipped.'] }, 0.2, 0.3)] },
  { id: 'it_opensource', group: 'ops', name: 'Open-source or bought tools', blurb: 'Open-source software is free for anyone to use and is built by communities. Bought software costs money and comes with a company to call.', options: [
    base('A mix of both', 'You pick the best tool for each job.'),
    opt('Open-source first', 'No licence fees, but when something breaks you fix it yourself.', { c: 0.995, cap: 0.99, risk: [3, 2, 'A free tool nobody supports broke and took a day to fix.'] }),
    opt('Bought and supported', 'Polished tools and a helpline, at a steady price.', { cap: 1.01, q: 0.01 }, 0.6)] },
  { id: 'it_budget', group: 'finance', name: 'IT budget', blurb: 'How much of your sales you spend on technology. Too little and things break. Too much and the money is wasted.', options: [
    base('Spend as things come up', 'No plan, no budget, no surprises until something breaks.'),
    opt('Lean IT budget', 'Saves money until the ageing systems start to fail.', { risk: [6, 3, 'Ageing systems failed and needed emergency fixes.'] }, -0.3),
    opt('Steady IT budget', 'Regular upgrades keep things tidy.', { cap: 1.01 }, 0.5),
    opt('Heavy IT investment', 'The best equipment and the newest tools, at a heavy price.', { cap: 1.025, c: 0.995 }, 1.2)] },
];

export const events: EvSpec[] = [
  { id: 'e9_it_legacy', title: 'The old system is on its last legs', icon: 'gear', good: false, per: 1.5, cd: 18, min: 12, story: 'The software your business has run on for years keeps failing. Nobody dares touch it because nobody remembers how it works. A legacy system is old technology that a business still depends on.', choices: [
    S('retire', 'Retire it and move to something new', 'Painful now, cheaper and faster later.', 'The switch was rough for a month, and then things ran faster.', { k: 0.06, acct: 'otherCosts', eff: { c: E(0.99, 12), morale: -1 } }),
    S('patch', 'Patch it up again', 'Cheap, and it might not hold.', '', { k: 0.015, acct: 'otherCosts', gamble: { p: 0.55, good: {}, bad: { d: E(0.96, 3), morale: -1 }, goodText: 'The patch held, for now.', badText: 'It crashed in your busiest week and orders were lost.' } }),
    S('ignore', 'Leave it alone and hope', 'Free, until it fails properly.', '', { gamble: { p: 0.4, good: {}, bad: { d: E(0.94, 3), rep: -2 }, goodText: 'It limped on.', badText: 'It failed completely and customers noticed.' } })] },
  { id: 'e9_it_backup', title: 'Time to test your backups', icon: 'shield', good: false, per: 1.2, cd: 18, story: 'Your backups run every night, but nobody has ever tried restoring from one. A backup you have never tested is only a hope.', choices: [
    S('drill', 'Run a full recovery drill', 'Costs a weekend and shows what is broken.', '', { k: 0.02, acct: 'otherCosts', gamble: { p: 0.75, good: { quality: 1, rep: 1 }, bad: { morale: -1 }, goodText: 'The restore worked, and you fixed two weak spots.', badText: 'It failed, which was annoying, though better in a drill than a disaster.' } }),
    S('spot', 'Restore one file as a quick check', 'Cheap, and it only tells you a little.', 'One file came back fine, and that was reassuring.', { k: 0.005, acct: 'otherCosts', eff: { quality: 0.5 } }),
    S('skip', 'Skip it, the green light is on', 'Free now, costly if a disk fails.', '', { gamble: { p: 0.85, good: {}, bad: { d: E(0.92, 4), rep: -3 }, goodText: 'Nothing went wrong, this time.', badText: 'A disk failed and the backups turned out to be empty.' } })] },
  { id: 'e9_it_licence', title: 'A software audit letter', icon: 'key', good: false, per: 1.2, cd: 24, story: 'A big software company has written to say it will audit how many copies of its programs you really use. If you have more installed than you paid for, you will owe the difference and some more.', choices: [
    S('selfcheck', 'Count your own copies first', 'A tidy-up now, with no nasty surprises.', 'You found unused licences, cancelled them and passed easily.', { k: 0.012, acct: 'otherCosts', eff: { c: E(0.995, 6) } }),
    S('argue', 'Argue about the terms', 'Free, and a gamble.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -1, c: E(1.02, 4) }, goodText: 'The vendor backed down.', badText: 'They found extra copies and billed you with extra fees.' } }),
    S('pay', 'Settle quickly and pay', 'Expensive, and over in a week.', 'You paid the bill and the letter went away.', { k: 0.04, acct: 'otherCosts' })] },
  { id: 'e9_it_shadow', title: 'Unapproved apps on the team\'s phones', icon: 'laptop', good: false, per: 1.5, cd: 18, gate: 'team', story: 'You find that several teams use free apps and file-sharing sites nobody approved. This is called shadow IT. It is handy for them, but your customers\' details may be sitting somewhere you cannot see.', choices: [
    S('ban', 'Ban the apps', 'Tight control and grumpy people.', 'Data stayed in one place, and so did the complaints from staff.', { eff: { morale: -2 } }),
    S('approve', 'Approve a safe list', 'Costs a little and keeps people productive.', 'You checked the best apps and officially approved them.', { k: 0.01, acct: 'otherCosts', eff: { morale: 1 } }),
    S('ignore', 'Look the other way', 'Free, and risky.', '', { gamble: { p: 0.7, good: {}, bad: { rep: -3 }, goodText: 'Nothing went wrong.', badText: 'Customer details leaked from a free app and the story reached the press.' } })] },
  { id: 'e9_it_outage', title: 'The internet goes down', icon: 'globe', good: false, per: 1.5, cd: 12, story: 'Your internet connection has dropped in the middle of the morning. Tills, email and phones are all affected, and the provider says "a few hours".', choices: [
    S('backup', 'Pay for a mobile data backup', 'A fee now, and everyone keeps working.', 'Mobile hotspots kept the essentials running, and you took out a standing backup line for next time.', { k: 0.012, acct: 'otherCosts', eff: { morale: 1 } }),
    S('home', 'Send people home', 'Free, but the day is lost.', 'It was a quiet day, and a few orders went elsewhere.', { eff: { d: E(0.98, 1) } }),
    S('wait', 'Wait it out', 'It might come back soon, or it might not.', '', { gamble: { p: 0.55, good: {}, bad: { d: E(0.96, 2), morale: -1 }, goodText: 'The line came back within the hour.', badText: 'It was down for most of the day and orders were lost.' } })] },
  { id: 'e9_it_lockin', title: 'Your software supplier raises prices', icon: 'key', good: false, per: 1.2, cd: 24, story: 'The company behind your main software has announced a big price rise. Moving to another product would be a pain, because your data and habits are built around theirs. This is called vendor lock-in.', choices: [
    S('negotiate', 'Negotiate hard', 'Mention rivals and ask for a discount.', '', { k: 0.005, acct: 'otherCosts', gamble: { p: 0.6, good: { c: E(0.995, 12) }, bad: { c: E(1.01, 12) }, goodText: 'They offered a discount to keep you.', badText: 'They held firm, and you paid the new price.' } }),
    S('pay', 'Pay the new price', 'Easy, and it just keeps costing more.', 'You paid, grumbling, and nothing else changed.', { eff: { c: E(1.01, 12) } }),
    S('switch', 'Start moving to another product', 'Costly now, and you are free later.', 'The move was a headache, and now you are no longer tied to one supplier.', { k: 0.05, acct: 'otherCosts', eff: { c: E(0.99, 12), morale: -1 } })] },
  { id: 'e9_it_phishing', title: 'The phishing test results are in', icon: 'shield', good: false, per: 1.5, cd: 12, gate: 'team', story: 'You sent your team a fake phishing email, the kind criminals use to steal passwords, to see who would click. The results are in, and more people clicked than you hoped.', choices: [
    S('train', 'Run friendly training for everyone', 'Costs a little, and people learn.', 'The next test had far fewer clicks.', { k: 0.01, acct: 'wages', eff: { rep: 1, morale: 1 } }),
    S('shame', 'Name and shame the clickers', 'Quick, harsh and risky.', '', { gamble: { p: 0.4, good: { rep: 1 }, bad: { morale: -4 }, goodText: 'Everyone became very careful.', badText: 'People felt humiliated, and some started looking elsewhere.' } }),
    S('note', 'Make a note and move on', 'Free, and the risk stays.', '', { gamble: { p: 0.8, good: {}, bad: { rep: -3, c: E(1.01, 4) }, goodText: 'No real attack came.', badText: 'A real phishing email worked, and you spent weeks cleaning up.' } })] },
  { id: 'e9_it_automation_jobs', title: 'Automation worries the team', icon: 'gear', good: false, per: 1.5, cd: 24, gate: 'team', story: 'Word has got out that you are looking at automation, meaning software and machines that do routine work. People fear it means job cuts, and they want to hear from you.', choices: [
    S('retrain', 'Promise retraining and no forced job losses', 'Costs money and builds trust.', 'People saw automation as a tool rather than a threat.', { k: 0.025, acct: 'wages', eff: { morale: 3, rep: 1 } }),
    S('honest', 'Be honest that some roles will change', 'Truthful, with a bumpy few weeks.', 'You were straight with them. A few people left, but most respected it.', { eff: { morale: -1, c: E(0.995, 10) } }),
    S('silent', 'Say nothing yet', 'Free, and rumours fill the gap.', '', { gamble: { p: 0.4, good: {}, bad: { morale: -5 }, goodText: 'The rumours faded.', badText: 'People assumed the worst, and your best staff began job-hunting.' } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'it_erp', name: 'ERP system rollout', blurb: 'An ERP (enterprise resource planning) system joins stock, orders, payroll and accounts in one program. It is a huge job, and the first year is chaos.', k: 2.5, months: 12, success: 65,
    win: { eff: { c: 0.99, cap: 1.015, q: 0.01 }, monthly: 0.2, now: { morale: -1 }, text: 'After a bumpy year, everything finally talks to everything else. The licence fee runs every month.' },
    lose: { now: { c: E(1.04, 6), morale: -3 }, text: 'It overran, the staff hated it, and you ended up scrapping half of it.' } },
  { id: 'it_rpa', name: 'Robotic process automation', blurb: 'Software robots do the dull back-office jobs, like copying figures between systems, that people used to type in by hand.', k: 1, months: 5, success: 70,
    win: { eff: { cap: 1.015 }, monthly: -0.25, now: { morale: -1 }, text: 'The robots handle the paperwork all night, and staff move on to better jobs, though some were nervous.' },
    lose: { now: { c: E(1.01, 3), morale: -1 }, text: 'The robots broke whenever a form changed, and people had to fix their mistakes by hand.' } },
  { id: 'it_datawarehouse', name: 'Data warehouse and reporting', blurb: 'A data warehouse gathers the numbers from every system into one place, so every report tells the same story.', k: 1.5, months: 8, success: 70,
    win: { eff: { c: 0.995, d: 1.005, q: 0.01 }, monthly: 0.1, text: 'Reports finally agree with each other, and you spot both waste and chances.' },
    lose: { now: { c: E(1.02, 3) }, text: 'Nobody trusted the dashboards, and the project quietly died.' } },
  { id: 'it_forecasting', stock: true, name: 'AI demand-forecasting tool', blurb: 'A tool that learns from past sales to predict what customers will buy next, so you stock the right things at the right time.', k: 1.2, months: 6, success: 60,
    win: { eff: { c: 0.99, d: 1.005 }, monthly: 0.15, text: 'The forecasts beat your gut feel, and you waste far less stock.' },
    lose: { now: { c: E(1.02, 3) }, text: 'The forecasts were badly wrong, and you ordered the wrong stock.' } },
  { id: 'it_api', name: 'API links with partners', blurb: 'An API is a doorway that lets two companies\' systems talk to each other automatically, so orders and stock levels flow without retyping.', k: 0.8, months: 5, success: 75,
    win: { eff: { d: 1.015, cap: 1.005 }, monthly: 0.1, text: 'Partners can now order and track in real time, and more of them do.' },
    lose: { now: { c: E(1.01, 2), morale: -1 }, text: 'The two systems never quite agreed, and the engineers moved on in despair.' } },
  { id: 'it_wms', stock: true, name: 'Warehouse-management system', blurb: 'A warehouse-management system tracks every item from the delivery bay to the shelf and out to the customer.', k: 1.5, months: 7, success: 70,
    win: { eff: { c: 0.99, cap: 1.01 }, monthly: 0.1, text: 'Pickers find things faster, stock counts are right, and fewer orders go wrong.' },
    lose: { now: { c: E(1.03, 3) }, text: 'Stock counts went wrong during the switch and orders were late.' } },
  { id: 'it_crmclean', name: 'CRM data clean-up drive', blurb: 'A CRM (customer relationship management) system records who your customers are and what they bought. Duplicates and wrong details make it useless, so clear them out.', k: 0.4, months: 3, success: 85,
    win: { eff: { d: 1.01, ch: 0.99 }, text: 'Your lists are accurate, so emails reach the right people and nobody is contacted twice.' },
    lose: { now: { morale: -1 }, text: 'The clean-up was tedious, and the data got messy again within weeks.' } },
  { id: 'it_roadmap', name: 'Tech-stack modernisation roadmap', blurb: 'Replace your ageing systems one at a time on a plan, rather than in one risky leap. Your tech stack is the set of tools your business runs on.', k: 1.2, months: 10, success: 75,
    win: { eff: { c: 0.995, cap: 1.01, q: 0.01 }, text: 'Each year the systems got a little newer, a little faster and a little cheaper to run.' },
    lose: { now: { c: E(1.02, 3), morale: -1 }, text: 'The plan kept changing, and half-finished upgrades left you with a muddle.' } },
];
