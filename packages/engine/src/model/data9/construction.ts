import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Construction firm. Everything here is only available to that sector. Ids start with "construction_" (policies and initiatives) or "e9_construction_" (events). */
export const policies: PolicyDef[] = [
  { id: 'construction_bidding', group: 'customers', name: 'Bidding strategy', blurb: 'Most jobs are won by tender: you quote a price and so do your rivals, and you cannot see their numbers. Bid too high and you lose the job, bid too low and you win it and lose money.', options: [
    off,
    opt('Sharp pricing', 'Shave your quotes to beat the pack. You win far more tenders, but each job leaves less for you and any surprise on site eats the profit.', { d: 1.03, c: 1.015 }, 0.3),
    opt('Premium pricing', 'Quote high and sell on quality. You win fewer jobs, but the ones you win pay better.', { d: 0.985, c: 0.985, rep: 0.02 }, 0.1)] },

  { id: 'construction_contract_type', group: 'finance', name: 'Contract type', blurb: 'A fixed-price contract means the client pays a set sum whatever the job really costs you. A cost-plus contract means they repay your costs plus an agreed profit. Fixed price gives you the upside and all the risk.', options: [
    off,
    opt('Fixed-price jobs', 'Clients love knowing the final bill, so more of them sign. But if timber doubles or the ground is worse than the survey said, you pay.', { d: 1.02, risk: [10, 3, 'A fixed-price job overran badly and you swallowed the extra cost.'] }, 0.1),
    opt('Cost-plus jobs', 'You are repaid for what you spend plus a fee. Safe from nasty surprises, but nervous clients with open-ended bills sign less often.', { d: 0.98, c: 0.985 }, 0.1)] },

  { id: 'construction_subcontractors', group: 'ops', name: 'Subcontractor vetting', blurb: 'Subcontractors are self-employed tradespeople and small firms you hire per job, such as electricians and plasterers. A flaky one who does not turn up holds up everyone else on site.', options: [
    off,
    opt('Check references', 'Phone a couple of past clients before hiring. Fewer no-shows, and a small premium for the better crews.', { c: 1.01, q: 0.03 }, 0.2),
    opt('Approved list with contracts', 'Only work with vetted firms under written agreements with penalties for lateness. Reliable and a little dearer, but the best ones are often busy elsewhere.', { c: 1.02, q: 0.05, cap: 0.98 }, 0.4, 0.2)] },

  { id: 'construction_safety', group: 'people', name: 'Site safety regime', blurb: 'Building is one of the most dangerous jobs there is. Health-and-safety rules mean helmets, harnesses, inspections and training. They cost time and money, but accidents cost far more.', options: [
    off,
    opt('Toolbox talks', 'A short safety briefing at the start of each shift. Cheap, and it catches the obvious hazards.', { m: 0.2, risk: [5, 4, 'An accident on site led to a stoppage and an injury claim.'] }, 0.15),
    opt('Full safety system', 'A dedicated safety officer, regular audits and proper kit. Slower on site and dearer, but workers trust you and accidents are rare.', { m: 0.5, cap: 0.98, rep: 0.02, risk: [1, 4, 'A freak accident on site led to a stoppage and an injury claim.'] }, 0.8, 0.2)] },

  { id: 'construction_plant_hire', group: 'ops', name: 'Plant: hire or buy', blurb: 'Plant means the heavy machinery on site: diggers, cranes and scaffolding. Hiring costs a lot per week but you pay only while you need it. Buying is cheaper per day but the machine earns nothing when it sits in the yard.', options: [
    off,
    opt('Hire what you need', 'Rent machines job by job. No money tied up, but a bill on every contract and delays when everyone wants the same crane.', { c: 1.01, cap: 1.01 }, 0.3),
    opt('Buy your own fleet', 'Own the machines you use most. Cheaper when busy, but loan repayments, servicing and storage continue through the quiet winter.', { c: 0.98 }, 0.9, 0.5)] },

  { id: 'construction_retention', group: 'finance', name: 'Retention terms', blurb: 'Retention is a slice of the contract price, usually 5%, that the client holds back until months after you finish, to make sure you fix any defects. It is your money sitting in their bank account.', options: [
    off,
    opt('Negotiate lower retention', 'Push for 2.5% retention instead. You keep cash flowing, but clients see you as a tougher negotiator and some pick a softer rival.', { d: 0.99, od: 1.1 }, 0.1),
    opt('Insure the retention', 'Buy a retention bond that releases the money early. Costs a premium on every job, but the cash comes in and your overdraft banks like it.', { od: 1.2 }, 0.5)] },

  { id: 'construction_snagging', group: 'ops', name: 'Snagging and defect checks', blurb: 'Snagging is the final walk-round where small defects such as a crooked door or a missing seal are listed and fixed before handover. Missed snags come back later as expensive callbacks.', options: [
    off,
    opt('Walk-round before handover', 'The site manager inspects every job before the client does. Fewer complaints and callbacks, but a few days added per job.', { q: 0.04, cap: 0.99 }, 0.3),
    opt('Independent inspector', 'A paid third party checks every job. Almost nothing slips through and clients tell their friends, at a steady fee.', { q: 0.05, rep: 0.04, cap: 0.98 }, 0.7)] },

  { id: 'construction_stage_payments', group: 'finance', name: 'Stage payment schedule', blurb: 'Stage payments mean the client pays in instalments as each phase finishes, such as foundations, roof and fit-out. You buy materials before each stage, so how the instalments are set decides whether you run short of cash.', options: [
    off,
    opt('Front-loaded stages', 'Ask for a bigger deposit and early instalments. Your cash stays healthy, but cautious clients dislike paying so much before work is seen.', { d: 0.985, od: 1.15 }, 0.1),
    opt('Monthly valuations', 'Invoice each month for the work done so far. Smooth cash flow, but more paperwork, and every figure can be argued over by the client\'s surveyor.', { od: 1.1, cap: 0.99 }, 0.3)] },

  { id: 'construction_insurance_bonds', group: 'finance', name: 'Insurance and performance bonds', blurb: 'A performance bond is a guarantee from an insurer that a client will be repaid if you fail to finish. Big clients demand them. Together with public liability cover they protect everyone, for a price.', options: [
    off,
    opt('Basic public liability', 'The minimum cover most clients ask for. Cheap, but a serious collapse or failed job could finish you off.', { risk: [4, 7, 'An uninsured loss on a job landed on your balance sheet.'] }, 0.2),
    opt('Full cover with bonds', 'Comprehensive insurance and performance bonds. Sizeable premiums, but large clients take you seriously and disasters are survivable.', { d: 1.015, rep: 0.03 }, 0.9)] },

  { id: 'construction_ontime', group: 'customers', name: 'Finish-on-time guarantee', blurb: 'Promise clients a completion date and pay them a penalty for each week you run late. A reputation for finishing on time is gold in an industry where delays are normal.', options: [
    off,
    opt('Target dates only', 'Name a date, but with no penalty clause. Clients like it a bit and nothing bites if you slip.', { d: 1.01 }, 0.1),
    opt('Penalty guarantee', 'Pay clients for late completion. Customers flock to you and recommend you, but a wet month or a late delivery costs real money.', { d: 1.03, rep: 0.04, risk: [8, 3, 'Delays on site triggered late-completion penalties.'] }, 0.3)] },

  { id: 'construction_late_penalty', group: 'finance', name: 'Late-payment penalties', blurb: 'Construction clients are notorious for paying late. You can charge interest on overdue invoices, which is your right by law, but it can sour the relationship.', options: [
    off,
    opt('Send polite reminders', 'Chase every overdue invoice with a call. Money arrives a little faster at the cost of a person\'s time.', { od: 1.05 }, 0.15),
    opt('Charge statutory interest', 'Add legal late-payment interest to overdue bills. Clients pay faster, but some take their next job elsewhere.', { od: 1.1, d: 0.985, rep: -0.02 }, 0)] },

  { id: 'construction_apprentices', group: 'people', name: 'Apprentices and training', blurb: 'An apprentice learns a trade on site while studying part-time. The government pays a grant towards training. Skilled bricklayers and electricians are scarce, so growing your own pays back slowly.', options: [
    off,
    opt('Take on a few apprentices', 'A handful of trainees working beside experienced crews. Cheaper labour and happier teams, but they are slower while learning.', { hire: 0.85, m: 0.2, cap: 0.99 }, 0.3),
    opt('Training academy', 'A proper in-house programme with a trainer and kit. Hiring costs fall and quality rises over time, but it is a hefty bill upfront.', { hire: 0.75, q: 0.04, m: 0.3, cap: 0.98 }, 0.7, 0.5)] },

  { id: 'construction_showhome', group: 'customers', name: 'Show-home marketing', blurb: 'A show home is a finished property you open to visitors to show off your standard of work. It sells the next ten jobs, but money is tied up in a building that earns no rent.', options: [
    off,
    opt('Open days on finished jobs', 'Ask happy clients to let visitors in for a Saturday. Cheap, and a nice trickle of enquiries.', { d: 1.01 }, 0.15),
    opt('Permanent show home', 'Fit out a showpiece property with your best finishes. Enquiries surge, but the fit-out, upkeep and a salesperson to staff it are costly.', { d: 1.025, br: 1.003 }, 0.9, 0.5)] },
];

export const events: EvSpec[] = [
  { id: 'e9_construction_weather', title: 'A month of rain', icon: 'globe', good: false, per: 1.5, cd: 10, story: 'Storms have flooded the footings on three of your sites. Concrete cannot be poured in the wet, bricklayers cannot work on slick scaffolding, and your crews are standing about in the rain.', choices: [
    S('wait', 'Wait for it to dry out', 'Free now, but jobs stack up behind.', 'You waited it out, and everyone fought over the same dry weeks afterwards.', { eff: { d: E(0.97, 3) } }),
    S('pumps', 'Hire pumps and covers', 'Pay to keep working through it.', 'The pumps and tarps kept the key sites going, at a price.', { k: 0.04, eff: { rep: 1 } }),
    S('overtime', 'Pay overtime to catch up later', 'Dry spells get crammed with long days.', '', { k: 0.02, gamble: { p: 0.6, good: { rep: 1 }, bad: { morale: -3, quality: -1 }, goodText: 'The crews caught up and clients noticed.', badText: 'Tired crews made mistakes and grumbled.' } })] },

  { id: 'e9_construction_material_spike', title: 'Steel and timber prices spike', icon: 'chart', good: false, per: 1.5, cd: 12, gate: 'stock', story: 'Global shortages have pushed up the price of steel and timber by a fifth almost overnight. Your fixed-price quotes were written last month, before the jump.', choices: [
    S('absorb', 'Absorb it', 'Keep clients happy, eat the cost.', 'You swallowed the extra cost and kept your promises.', { eff: { c: E(1.05, 4), rep: 1 } }),
    S('clause', 'Invoke the price-rise clause', 'Pass some on, risk the relationship.', '', { gamble: { p: 0.5, good: { c: E(1.02, 4) }, bad: { c: E(1.04, 4), rep: -2 }, goodText: 'Most clients accepted the clause once you showed the invoices.', badText: 'Several clients refused and one went to the press.' } }),
    S('stockup', 'Bulk-buy before the next rise', 'Pay now to lock in prices.', 'You filled the yard at the current price and sat on a big stock.', { k: 0.03, eff: { c: E(1.02, 5) } })] },

  { id: 'e9_construction_hs_audit', title: 'Health and safety inspector arrives', icon: 'shield', good: false, per: 1.5, cd: 14, story: 'An inspector from the safety regulator has turned up unannounced on your biggest site. They can issue a prohibition notice, which stops all work until the problems are fixed.', choices: [
    S('open', 'Open the books and fix everything', 'Cooperative, costs a little.', 'You fixed the issues on the spot and the inspector left satisfied.', { k: 0.03, eff: { rep: 1, morale: 1 } }),
    S('argue', 'Argue the findings', 'Gamble: save money or get fined.', '', { gamble: { p: 0.45, good: {}, bad: { rep: -3, d: E(0.96, 3) }, goodText: 'The inspector accepted your explanation.', badText: 'You were issued a stop notice and the story reached local papers.' } }),
    S('stop', 'Voluntarily pause the site', 'Lose a few days, avoid a notice.', 'You stopped work for a week, corrected hazards and restarted cleanly.', { eff: { d: E(0.98, 2), morale: 1 } })] },

  { id: 'e9_construction_planning', title: 'Planning permission stalls', icon: 'flag', good: false, per: 1.5, cd: 12, story: 'Three of your lined-up jobs are waiting on the council planning office, which is short-staffed and weeks behind. No permission means nothing to build.', choices: [
    S('chase', 'Pay a planning consultant to chase', 'A fee, but faster decisions.', 'The consultant knew exactly who to call.', { k: 0.03, eff: { d: E(1.01, 3) } }),
    S('wait', 'Wait in the queue', 'Free, but the crews wait too.', 'Permissions trickled through and your schedule slipped.', { eff: { d: E(0.97, 3), morale: -1 } }),
    S('redirect', 'Move crews to other jobs', 'A scramble that might pay off.', '', { gamble: { p: 0.55, good: { morale: 1 }, bad: { c: E(1.03, 2), rep: -1 }, goodText: 'Rescheduling went smoothly and nobody sat idle.', badText: 'The reshuffle left several clients waiting and costs went up.' } })] },

  { id: 'e9_construction_labour_shortage', title: 'Skilled-labour shortage', icon: 'key', good: false, per: 1.5, cd: 14, gate: 'team', story: 'Every builder in the region is hunting for bricklayers, electricians and plasterers. A rival has started offering signing-on bonuses, and two of your best people have had calls.', choices: [
    S('raise', 'Raise wages to keep your crews', 'Costs money, keeps morale.', 'You matched the offers, and the crews stayed.', { k: 0.04, acct: 'wages', eff: { morale: 2 } }),
    S('agency', 'Fill gaps with agency labour', 'Quick, dearer, less skilled.', 'Agency staff plugged the holes, though quality dipped.', { eff: { c: E(1.03, 4), quality: -1 } }),
    S('train', 'Promise training and a career path', 'Cheap, a gamble on loyalty.', '', { gamble: { p: 0.55, good: { morale: 2 }, bad: { morale: -3 }, goodText: 'The crews bought into your plan and stayed.', badText: 'Two key workers left anyway, and the rest noticed.' } })] },

  { id: 'e9_construction_developer', title: 'A property developer wants a partner', icon: 'handshake', good: true, per: 1.5, cd: 18, min: 6, story: 'A developer building a row of flats offers you the whole structure contract. It is big, and it is a single client: if they hit trouble, you could be left unpaid.', choices: [
    S('take', 'Take the contract on their terms', 'A big job, with concentration risk.', '', { gamble: { p: 0.7, good: { d: E(1.05, 6), brand: 1.01 }, bad: { d: E(0.97, 3), rep: -1 }, goodText: 'The developer paid on time and recommended you to others.', badText: 'The developer slowed payments and your cash tightened.' } }),
    S('stages', 'Insist on stage payments up front', 'Smaller but safer.', 'The developer agreed to monthly payment, and you built with confidence.', { eff: { d: E(1.025, 6) } }),
    S('decline', 'Decline', 'Stay with your usual clients.', 'You kept your diary full of the work you knew.')] },

  { id: 'e9_construction_council', title: 'Local council relations', icon: 'flag', good: true, per: 1.5, cd: 16, story: 'The council has a long list of small works it wants done, from school repairs to pavements. Contractors who are known to the council officers get invited to bid first.', choices: [
    S('attend', 'Attend supplier events and introduce yourself', 'A small cost for a seat at the table.', 'The officers remembered your face when the next list went out.', { k: 0.02, eff: { d: E(1.03, 6), rep: 1 } }),
    S('lobby', 'Hire a lobbyist', 'Expensive, a gamble.', '', { k: 0.04, gamble: { p: 0.5, good: { d: E(1.05, 8), rep: 1 }, bad: { rep: -2 }, goodText: 'The lobbyist opened doors to several tenders.', badText: 'The council did not like being lobbied and noted it.' } }),
    S('ignore', 'Stick to private work', 'No effort, no change.', 'You carried on with homeowners and developers.')] },

  { id: 'e9_construction_dispute', title: 'A client refuses to pay', icon: 'chat', good: false, per: 1.5, cd: 14, story: 'A client has withheld £20,000, saying the work is defective. You say it is finished. You can settle, go to arbitration (a private judge decides) or sue, and lawyers cost money whoever wins.', choices: [
    S('settle', 'Settle for most of it', 'Lose a chunk, move on.', 'You took 80 pence in the pound and walked away.', { k: 0.03 }),
    S('arbitrate', 'Go to arbitration', 'Cheaper than court, uncertain outcome.', '', { k: 0.03, gamble: { p: 0.6, good: { rep: 1 }, bad: { rep: -1, quality: -1 }, goodText: 'The arbitrator found for you and awarded costs.', badText: 'The arbitrator found some defects and cut your fee.' } }),
    S('mediate', 'Offer a site visit with a neutral surveyor', 'Slow, but friendly.', 'The surveyor split the difference and the client paid up.', { k: 0.015, eff: { rep: 1 } })] },

  { id: 'e9_construction_tender', title: 'A public tender with a big prize', icon: 'crown', good: true, per: 1.2, cd: 20, min: 12, story: 'The council has put out a tender for a new library. Public tenders follow strict rules: you must submit paperwork, prove your safety record and accounts, and the lowest compliant price usually wins.', choices: [
    S('bid', 'Bid seriously with a full team', 'Costly paperwork, real shot.', '', { k: 0.04, gamble: { p: 0.4, good: { d: E(1.06, 10), rep: 2 }, bad: { morale: -1 }, goodText: 'You won, and a steady project filled your diary.', badText: 'You lost to a cheaper firm and the bid time was wasted.' } }),
    S('lowball', 'Bid very low', 'Better odds, thin margin.', '', { k: 0.02, gamble: { p: 0.6, good: { d: E(1.05, 8), c: E(1.02, 8) }, bad: { morale: -1 }, goodText: 'You won, though the margin is slim.', badText: 'Even your cut-price bid lost.' } }),
    S('skip', 'Skip it', 'Save the effort.', 'You passed on the paperwork.')] },
];

export const projects: InitiativeDef[] = [
  { id: 'construction_jv', name: 'Joint venture on a big project', blurb: 'A joint venture means teaming up with another firm to share a big contract: you share the profit and the risk. It lets you chase work too big for your balance sheet, but you depend on your partner behaving.', k: 1.3, months: 8, success: 60, stock: true,
    win: { eff: { d: 1.03, c: 0.99 }, monthly: 0.2, now: { rep: 2, brand: 1.01 }, text: 'The partnership delivered a landmark job and both firms were paid.' },
    lose: { now: { rep: -2, morale: -2 }, text: 'Your partner slipped and you were left with a half-built problem.' } },
  { id: 'construction_green_cert', name: 'Green-building certification', blurb: 'An independent mark such as BREEAM proves that you build energy-efficient, low-waste buildings. More clients, especially councils and big firms, now insist on it. It is long, costly and you can fail the inspection.', k: 1.4, months: 9, success: 65,
    win: { eff: { d: 1.03, q: 0.03 }, monthly: 0.2, now: { rep: 2, brand: 1.01 }, text: 'You earned the green mark, and eco-minded clients now ask for you by name.' },
    lose: { now: { morale: -2, rep: -1 }, text: 'The assessors found gaps in your waste records and you must start again.' } },
  { id: 'construction_public_tender', name: 'Build a public-tender team', blurb: 'Public bodies must advertise big jobs openly. Winning them needs a specialist bid team to handle forms, evidence and references. It is slow, and many bids fail, but contracts are large and the clients reliably pay.', k: 1.2, months: 8, success: 55,
    win: { eff: { d: 1.04, od: 1.1 }, monthly: 0.4, now: { rep: 1 }, text: 'Your bid team won its first council framework, and the pipeline is full.' },
    lose: { now: { morale: -2 }, text: 'The first bids were rejected on technicalities and the team lost heart.' } },
  { id: 'construction_demolition', name: 'Demolition and site-clearing side line', blurb: 'Before anything is built, the old building must come down and the site must be cleared. Doing it yourself keeps that work in-house, and the machines can be rented out in quiet months, though it brings its own dangers and waste rules.', k: 1.0, months: 6, success: 65,
    win: { eff: { d: 1.02, cap: 1.02 }, monthly: 0.2, text: 'Demolition jobs filled the winter gaps and your diggers earn year-round.' },
    lose: { now: { rep: -1, morale: -2, c: E(1.03, 3) }, text: 'A rushed demolition damaged a neighbour\'s wall and you paid for the repair.' } },
  { id: 'construction_prefab', name: 'Prefab factory', blurb: 'A prefab factory builds walls, roofs and bathroom pods indoors, then lorries them to site for assembly. It is quicker and less weather-dependent, but the factory is costly and idle if orders dry up.', k: 2.0, months: 10, success: 55, stock: true,
    win: { eff: { cap: 1.04, c: 0.985 }, monthly: 0.5, text: 'The factory runs in all weathers and sites finish in half the time.' },
    lose: { now: { morale: -3, rep: -1 }, text: 'The first batch did not fit, and the factory stood half-idle for months.' } },
];
