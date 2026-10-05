import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Haulage and logistics. Everything here is only available to that sector. Every id must start with "haulage_" (policies and initiatives) or "e9_haulage_" (events). */
export const policies: PolicyDef[] = [
  // 276 Lorry fleet financing and depreciation
  { id: 'haulage_fleet_finance', group: 'finance', name: 'How you pay for lorries', blurb: 'A new lorry costs a fortune and loses value every year (depreciation). You can buy outright, borrow to buy, or rent them. Each way trades cash today against costs later.', options: [
    off,
    opt('Buy with a loan', 'Borrow against each lorry. You own it in the end, but the interest and repayments are a steady drag.', { cap: 1.01, c: 1.005 }, 0.3, 0.4),
    opt('Lease the whole fleet', 'Pay a fixed monthly rent for newer, more reliable lorries. Little cash up front, but you never own them and the rent never stops.', { cap: 1.02, q: 0.01, c: 1.01 }, 0.7)] },

  // 277 Fuel-price swings and surcharges
  { id: 'haulage_fuel_surcharge', group: 'customers', name: 'Fuel surcharge', blurb: 'A fuel surcharge is an extra line on the invoice that rises and falls with the diesel price, so customers share the risk. Some customers hate the extra line.', options: [
    off,
    opt('Surcharge on contracts', 'Contract customers pay a formula-based fuel add-on. Fuel spikes hurt less, and a few customers shop around.', { c: 0.99, d: 0.99 }, 0.1),
    opt('Surcharge on everything', 'Every job carries the add-on. Strong protection when diesel jumps, but price-sensitive customers drift to rivals who quote all-in.', { c: 0.98, d: 0.975, rep: -0.02 })] },

  // 279 Route planning that cuts empty miles
  { id: 'haulage_route_planning', group: 'ops', name: 'Route planning', blurb: 'An empty mile is a mile driven with no load on board, which burns fuel and wages for nothing. Good planning finds a return load so the lorry earns both ways.', options: [
    off,
    opt('Planner with a spreadsheet', 'One planner matches return loads by hand. Some empty miles disappear.', { c: 0.99, cap: 1.01 }, 0.25),
    opt('Planning software and back-loading', 'Software suggests the best routes and a load for the journey home. Fewer empty miles, but late changes upset drivers.', { c: 0.975, cap: 1.025, m: -0.2 }, 0.7, 0.4)] },

  // 287 Spot-market versus contract loads
  { id: 'haulage_load_mix', group: 'customers', name: 'Contract or spot loads', blurb: 'Contract loads are agreed for months at a set price. Spot loads are one-off jobs bid for on the open market, paying more when it is busy and almost nothing when it is quiet.', options: [
    off,
    opt('Mostly contracts', 'Steady work at a fixed rate. Reliable, but you miss out when prices spike.', { ch: 1, d: 1.01, c: 1.005 }, 0.1),
    opt('Chase spot loads', 'Grab the best-paid jobs each week. Great in a boom, but quiet weeks leave lorries idle.', { d: 1.03, risk: [10, 3, 'A quiet week of spot loads left lorries parked up.'] }, 0.2)] },

  // 294 Maintenance schedule versus breakdowns
  { id: 'haulage_maintenance', group: 'ops', name: 'Maintenance schedule', blurb: 'Servicing lorries on a timetable costs money now. Skipping it saves cash until one breaks down on the motorway, and then you pay for a tow, a repair and a furious customer.', options: [
    off,
    opt('Run until it breaks', 'No servicing budget. A cost saving until the breakdowns start.', { c: 0.99, risk: [12, 4, 'A lorry broke down on the motorway and the load was late.'] }),
    opt('Planned servicing', 'Every lorry is inspected on a set timetable. Fewer breakdowns, and a day off the road for each service.', { q: 0.02, cap: 0.99, risk: [3, 3, 'A lorry broke down despite servicing.'] }, 0.5)] },

  // 284 Telematics that track driver behaviour
  { id: 'haulage_telematics', group: 'people', name: 'Driver tracking', blurb: 'Telematics is a small box in each cab that records speed, braking and location. It cuts fuel and accidents, and drivers can feel they are being watched.', options: [
    off,
    opt('Tracking for routes only', 'You see where the lorries are, but not how they are driven. Customers love the live updates.', { d: 1.01, rep: 0.02 }, 0.3),
    opt('Full driver scoring', 'Harsh braking and idling are scored and reviewed. Fuel and insurance bills fall, and morale takes a knock.', { c: 0.98, m: -0.4, rep: 0.02 }, 0.5, 0.3)] },

  // 289 Depot location choice
  { id: 'haulage_depot_site', group: 'ops', name: 'Depot location', blurb: 'A depot is the yard where lorries park, load and get serviced. A depot near the motorway saves driving time but the rent is much higher than a cheap yard in a field.', options: [
    off,
    opt('Cheap yard out of town', 'Low rent and long drives to the main roads. Drivers spend more time on slow lanes.', { c: 1.01, cap: 0.985 }, -0.4),
    opt('Next to the motorway junction', 'Lorries are on the fast road in minutes. A real saving in driving time, for a hefty rent.', { cap: 1.03, c: 0.99 }, 1.0)] },

  // 290 Driver-training academy
  { id: 'haulage_academy', group: 'people', name: 'Driver-training academy', blurb: 'A shortage of qualified lorry drivers is a long-running problem. An academy trains new drivers for the lorry licence in your own yard, so you do not have to poach them.', options: [
    off,
    opt('Pay for the licence of new hires', 'You fund the licence for people who join you. They stay longer, and some leave once qualified.', { hire: 0.9, m: 0.2 }, 0.3),
    opt('Run your own academy', 'A full in-house training scheme. Cheaper hiring and loyal drivers, but the instructors and the training lorry are expensive.', { hire: 0.75, m: 0.3, q: 0.01 }, 0.8, 0.6)] },

  // 295 Customer delivery-time windows
  { id: 'haulage_delivery_windows', group: 'customers', name: 'Delivery time windows', blurb: 'A time window is a short slot, such as 10 to 11am, when the load must arrive. Tight windows please customers but make routes harder to plan, and a miss means waiting time.', options: [
    off,
    opt('Half-day windows', 'Morning or afternoon slots. Easy to keep, and customers like knowing when.', { d: 1.01, rep: 0.02 }, 0.1),
    opt('One-hour windows', 'Premium service with exact slots. Big firms will pay more, and every late arrival gets noticed.', { d: 1.03, cap: 0.98, risk: [8, 2, 'Lorries missed tight delivery slots and customers complained.'] }, 0.3)] },

  // 280 Contract customers with penalty clauses
  { id: 'haulage_penalty_clauses', group: 'customers', name: 'Penalty clauses', blurb: 'A penalty clause is a promise in a contract: arrive late and you pay money back. Big customers insist on them, and you can win their work if you accept.', options: [
    off,
    opt('Light penalties', 'A small refund for late loads. Wins some larger accounts with little risk.', { d: 1.015, risk: [5, 2, 'Late deliveries triggered penalty payments to a customer.'] }),
    opt('Heavy penalties', 'A big refund for every late load in return for big contracts. A bad month hurts.', { d: 1.03, risk: [11, 5, 'A bad run of late loads triggered heavy penalty payments.'] })] },

  // 285 / 300 Accident and insurance claims history
  { id: 'haulage_insurance_excess', group: 'finance', name: 'Insurance excess', blurb: 'The excess is the amount you pay yourself on each claim before the insurer pays the rest. A higher excess lowers your premium, but each crash costs you more. A long record of claims pushes premiums up.', options: [
    off,
    opt('High excess', 'A lower premium and more cost per accident. Good only if your drivers are safe.', { c: 0.99, risk: [5, 4, 'An accident left you paying a large insurance excess.'] }),
    opt('Low excess', 'Pay a higher premium so crashes cost little. Steady, and it adds up.', { rep: 0.01 }, 0.4)] },

  // 299 Peak-season subcontractors
  { id: 'haulage_subcontractors', group: 'ops', name: 'Peak-season subcontractors', blurb: 'A subcontractor is another haulier you pay to carry your overflow. It saves buying more lorries for the pre-Christmas rush, but they keep a slice and may not take care of your customers.', options: [
    off,
    opt('Trusted partners only', 'A few vetted firms handle the overflow. Costs more per load, and quality stays high.', { cap: 1.03, c: 1.01 }, 0.2),
    opt('Whoever is cheapest', 'Take any subcontractor at the best price. You can stretch further, but some do shoddy work under your name.', { cap: 1.05, c: 1.015, rep: -0.02, risk: [8, 3, 'A cheap subcontractor damaged a load and your name took the blame.'] }, 0.1)] },
];

export const events: EvSpec[] = [
  // 277 Fuel-price swings
  { id: 'e9_haulage_fuel_spike', title: 'Diesel prices jump', icon: 'flame', good: false, per: 1.5, cd: 14, story: 'A crisis overseas has pushed the price of diesel up sharply. Fuel is your biggest running cost, and your contracts have fixed prices.', choices: [
    S('surcharge', 'Add a temporary fuel surcharge', 'Passes the cost on, and some customers grumble.', 'Most customers accepted the surcharge, though one or two started getting other quotes.', { eff: { c: E(1.015, 4), d: E(0.98, 4) } }),
    S('absorb', 'Absorb the cost', 'Free of fuss, and costly for months.', 'You swallowed the extra cost and kept your customers happy.', { eff: { c: E(1.04, 5) } }),
    S('hedge', 'Buy fuel in bulk at a fixed price', 'A bet that prices keep rising.', '', { k: 0.03, gamble: { p: 0.55, good: { c: E(0.98, 6) }, bad: { c: E(1.02, 5) }, goodText: 'Prices kept climbing and your bulk-bought fuel saved a fortune.', badText: 'Prices fell back and you were stuck with expensive fuel.' } })] },

  // 283 Toll and congestion charges
  { id: 'e9_haulage_congestion_charge', title: 'New congestion charge zone', icon: 'car', good: false, per: 1.5, cd: 24, story: 'The city council is bringing in a daily charge for heavy lorries entering the centre, and your biggest customers are inside the zone.', choices: [
    S('pass', 'Pass the charge on to customers', 'Protects margins, risks some customers.', 'Customers grumbled and paid, and a few began to look for firms with smaller vehicles.', { eff: { d: E(0.98, 6) } }),
    S('absorb', 'Pay the charge yourself', 'Customers stay, and the cost bites.', 'Your customers barely noticed, and your margin did.', { eff: { c: E(1.03, 8) } }),
    S('reroute', 'Shuttle loads in smaller vans', 'Needs organising, saves money later.', 'A small van shuttle avoided the charge and impressed the council.', { k: 0.03, eff: { rep: 1, c: E(1.01, 6) } })] },

  // 286 Border delays and paperwork
  { id: 'e9_haulage_border_delays', title: 'Border queues and paperwork', icon: 'flag', good: false, per: 1.5, cd: 22, story: 'New customs forms are causing long queues at the port. Lorries wait for hours while drivers earn nothing, and customers are chasing for their goods.', choices: [
    S('broker', 'Pay a customs broker', 'A broker handles the forms and speeds things up.', 'The broker fixed the paperwork, and the queues shrank.', { k: 0.03, eff: { rep: 1 } }),
    S('learn', 'Train your own team on the forms', 'Cheaper, slower to learn.', '', { k: 0.01, gamble: { p: 0.55, good: { c: E(0.985, 6), quality: 1 }, bad: { c: E(1.02, 4), rep: -1 }, goodText: 'Your team mastered the forms and saved money on every border trip.', badText: 'A form was wrong and a lorry was held up for days.' } }),
    S('avoid', 'Stop taking border jobs for now', 'Lose that work and avoid the mess.', 'You dropped the international runs and kept the lorries moving at home.', { eff: { d: E(0.97, 5) } })] },

  // 292 Port-strike disruption
  { id: 'e9_haulage_port_strike', title: 'Port workers walk out', icon: 'anchor', good: false, per: 1, cd: 30, story: 'Dock workers have gone on strike at the main port. Containers are stuck on the quay, and lorries that were booked to collect them are sitting idle.', choices: [
    S('redeploy', 'Redeploy lorries to local work', 'Takes effort to find loads.', 'Your planners found domestic loads, and the lorries stayed busy at lower rates.', { k: 0.02, eff: { d: E(0.98, 3) } }),
    S('wait', 'Wait it out', 'Lorries sit idle, wages still running.', '', { gamble: { p: 0.5, good: { d: E(1.03, 3) }, bad: { d: E(0.95, 4), morale: -1 }, goodText: 'The strike ended fast, and a rush of backlog made up for it.', badText: 'The strike dragged on and your lorries earned nothing.' } }),
    S('premium', 'Offer rail-and-road alternatives', 'Costs money, wins loyalty.', 'You found alternative routes for customers, and they remembered who helped.', { k: 0.04, eff: { rep: 2 } })] },

  // 285 Accident and insurance claims
  { id: 'e9_haulage_accident', title: 'A lorry is in a crash', icon: 'shield', good: false, per: 1, cd: 26, story: 'One of your lorries has jackknifed on a wet road. Nobody is badly hurt, but the vehicle is wrecked, the load is damaged and the police want a report.', choices: [
    S('claim', 'Make an insurance claim', 'Insurer pays, premiums rise.', 'The insurer covered the damage and quietly raised your premiums.', { k: 0.02, eff: { c: E(1.015, 10) } }),
    S('own', 'Pay for it yourself', 'Keeps your claims record clean.', 'You paid the bill and protected your premium.', { k: 0.07 }),
    S('review', 'Pay and review driver training', 'A bigger bill and a safer team.', 'You paid for the repair, and every driver took a refresher course.', { k: 0.09, eff: { quality: 1, morale: 1 } })] },

  // 278 Driver-hours rules and shortages
  { id: 'e9_haulage_driver_shortage', title: 'Not enough drivers', icon: 'people', good: false, per: 1.5, cd: 20, story: 'Rules limit how many hours a driver may work, and there are too few licensed drivers in the country. Two of yours have left for a rival offering a bonus, and loads are going unmoved.', choices: [
    S('bonus', 'Pay a retention bonus', 'Keeps drivers, costs a lot.', 'The bonus kept your team together, and your drivers noticed.', { k: 0.05, eff: { morale: 2 } }),
    S('agency', 'Hire agency drivers', 'A quick fix at a high rate.', 'Agency drivers filled the gap at a high daily rate.', { k: 0.03, eff: { c: E(1.015, 4) } }),
    S('stretch', 'Ask drivers to work to the limit', 'Free but risky: hours rules are strict.', '', { gamble: { p: 0.55, good: { morale: -1 }, bad: { rep: -2, morale: -3 }, goodText: 'Everyone pulled together and loads got through.', badText: 'A driver went over the legal hours and you were fined.' } })] },

  // 298 Tyre and parts price swings
  { id: 'e9_haulage_parts_price', title: 'Tyre and parts prices swing', icon: 'gear', good: false, per: 1.5, cd: 16, story: 'A shortage of rubber and steel is pushing up the price of tyres and spare parts. Heavy lorries wear through tyres fast, so you notice it quickly.', choices: [
    S('stock', 'Buy a big stock now', 'A bet that prices keep rising.', '', { k: 0.03, gamble: { p: 0.55, good: { c: E(0.98, 5) }, bad: { c: E(1.01, 3) }, goodText: 'Prices rose again and your stockpile paid off.', badText: 'Prices fell and you were stuck with an expensive stockpile.' } }),
    S('retread', 'Switch to retreaded tyres', 'A cheaper second life for tyres.', 'Retreads cost much less and lasted well enough, though some drivers disliked them.', { eff: { c: E(1.01, 6), morale: -1 } }),
    S('wait', 'Pay the going rate', 'Simple and costly.', 'You paid up and kept your lorries safe.', { eff: { c: E(1.03, 4) } })] },

  // 291 Load-sharing with competitors
  { id: 'e9_haulage_load_share', title: 'A rival offers to share loads', icon: 'handshake', good: true, per: 1.5, cd: 20, story: 'A rival haulier has spare room in lorries heading back from the north, and you have space going south. They propose swapping spare capacity so both of you run fewer empty miles.', choices: [
    S('share', 'Swap loads openly', 'Better use of lorries, but they see your customers.', '', { eff: { c: E(0.97, 6) }, gamble: { p: 0.65, good: { c: E(0.97, 6), rep: 1 }, bad: { d: E(0.97, 4) }, goodText: 'Both firms saved on fuel and everyone kept to the rules.', badText: 'The rival quietly poached one of your best customers.' } }),
    S('limited', 'Share only on empty return legs', 'Smaller gain, safer.', 'You swapped only empty return legs and kept your customers to yourself.', { eff: { c: E(0.99, 6) } }),
    S('decline', 'Politely decline', 'No change.', 'You kept your customers and your lorries to yourself.')] },

  // 296 Bidding for council contracts
  { id: 'e9_haulage_council_tender', title: 'Council contract tender', icon: 'star', good: true, per: 1.5, cd: 24, story: 'The council has put its bin lorry, school and road-salt transport out to tender. It is steady work for years, but the council pays slowly and wins go to the lowest bidder.', choices: [
    S('lowbid', 'Bid low to win', 'You may win, and the margin is thin.', '', { k: 0.02, gamble: { p: 0.5, good: { d: E(1.05, 12), rep: 1 }, bad: { rep: -1 }, goodText: 'You won the contract, a steady stream of work at thin margins.', badText: 'A rival undercut you, and your bid was wasted.' } }),
    S('fair', 'Bid a fair price', 'Less likely to win, better money if you do.', '', { k: 0.015, gamble: { p: 0.35, good: { d: E(1.05, 12), c: E(0.99, 12) }, bad: {}, goodText: 'The council saw the value in your bid and awarded you the contract.', badText: 'You lost the bid and moved on.' } }),
    S('skip', 'Do not bid', 'No cost, no work.', 'You skipped the paperwork and kept to your regular customers.')] },
];

export const projects: InitiativeDef[] = [
  // 281 Warehousing and cross-docking
  { id: 'haulage_cross_dock', name: 'Warehouse and cross-docking hub', k: 2, months: 9, success: 60,
    blurb: 'Cross-docking means unloading a lorry and reloading the goods straight onto another one with almost no storage. A hub lets small loads be combined into full lorries.',
    win: { eff: { cap: 1.04, c: 0.99, d: 1.015 }, text: 'The hub turned many small loads into full lorries and your fleet stopped running half empty.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'The hub sat half empty and the rent was a heavy burden.' } },

  // 282 Cold-chain trucks
  { id: 'haulage_cold_chain', name: 'Cold-chain refrigerated trucks', k: 2, months: 8, success: 60, stock: true,
    blurb: 'Cold-chain means carrying food and medicines at a controlled low temperature. Fridge trucks cost much more to buy and run, but customers pay a premium and need you all year.',
    win: { eff: { d: 1.03, c: 1.01, q: 0.02 }, monthly: 0.3, now: { brand: 1.01 }, text: 'Supermarkets booked your fridge trucks and the premium rates paid for the extra running costs.' },
    lose: { now: { rep: -2, d: E(0.98, 3) }, text: 'A fridge broke down mid-journey and a whole load of food had to be thrown away.' } },

  // 288 Electric-truck trial
  { id: 'haulage_electric_trial', name: 'Electric lorry trial', k: 1.5, months: 10, success: 55,
    blurb: 'Electric lorries cost almost nothing to fuel and are quiet, but they cost far more to buy and the batteries limit how far they go. A trial lets you test on short routes before committing.',
    win: { eff: { c: 0.985, rep: 0.03 }, now: { brand: 1.02 }, text: 'The electric lorry saved on fuel and large customers praised your green delivery.' },
    lose: { now: { morale: -1, rep: -1 }, text: 'The battery ran flat on a long route, and the trial was quietly shelved.' } },

  // 293 Last-mile van network
  { id: 'haulage_last_mile', name: 'Last-mile van network', k: 1.2, months: 6, success: 65,
    blurb: 'The last mile is the final trip from a depot to the customer\'s front door. Vans do it better than big lorries, and parcels pay well, but the work is fiddly and needs many more drivers.',
    win: { eff: { d: 1.03, cap: 1.02 }, monthly: 0.2, text: 'Your vans picked up parcel work between lorry runs and filled quiet hours.' },
    lose: { now: { morale: -2, d: E(0.98, 2) }, text: 'Missed doorstep deliveries and angry customers made the vans a money pit.' } },

  // 297 Hazard-goods certification
  { id: 'haulage_hazmat', name: 'Hazardous-goods certification', k: 0.8, months: 5, success: 75,
    blurb: 'Carrying chemicals, fuel or paint needs special driver licences and approved vehicles. Few hauliers bother, so the work pays more, and a spill can be a disaster.',
    win: { eff: { d: 1.025, rep: 0.02 }, monthly: 0.15, text: 'Certified drivers won chemical jobs that rivals could not touch.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Several drivers failed the course and the fees were wasted.' } },
];
