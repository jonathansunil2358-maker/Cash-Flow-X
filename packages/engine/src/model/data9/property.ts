import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Property. Filled in by hand; every id must start with "property_" (policies and projects) or "e9_property_" (events). */
export const policies: PolicyDef[] = [
  // 530 Sub-letting spare space
  { id: 'property_sublet', group: 'ops', name: 'Sub-letting spare space', blurb: 'Rent out the rooms or desks you are not using, and let someone else help pay your rent. Strangers in your building come with strings.', options: [
    opt('Keep all your space', 'Every desk is yours, used or not.', {}),
    opt('Sub-let a few desks', 'A small, steady rent from a tenant or two. Now and then one pays late.', { m: -0.05, risk: [3, 2, 'A sub-tenant paid late, and you chased them for weeks.'] }, -0.3),
    opt('Sub-let a whole floor', 'A bigger rent cheque, more noise, and a gap in your income if the tenant leaves.', { m: -0.15, risk: [6, 3, 'A sub-tenant moved out suddenly, leaving a hole in your rent income.'] }, -0.8)] },
  // 536 Property-management company fees
  { id: 'property_agent', group: 'ops', name: 'Property-management company', blurb: 'A managing agent looks after repairs, safety checks and the landlord for a fee, so your own people do not have to.', options: [
    opt('Look after it yourselves', 'Free, and your own people lose hours to leaking taps and fire-alarm tests.', {}),
    opt('Hire a managing agent', 'Repairs and safety checks are handled for a monthly fee. A little more time for the real work.', { cap: 1.005, q: 0.01 }, 0.35),
    opt('Full facilities management', 'Everything from cleaning to the lifts is taken care of. Smooth and not cheap.', { cap: 1.012, q: 0.015, m: 0.1 }, 0.8)] },
  // 537 Co-working space as a flexible option
  { id: 'property_coworking', group: 'ops', name: 'Co-working desks', blurb: 'Rent desks in a shared building by the month. No long lease, and you pay extra for the freedom to grow or shrink fast.', options: [
    opt('Your own premises only', 'A lease you control. Stuck with it if plans change.', {}),
    opt('Co-working for part of the team', 'New joiners can have a desk next week. Shared kitchens, shared noise.', { cap: 1.01, m: -0.1 }, 0.5),
    opt('Everyone in co-working', 'Maximum flexibility and the highest price per desk, with no place of your own to show off.', { cap: 1.02, hire: 0.95, m: -0.2, br: 0.999 }, 0.9)] },
  // 541 Car-park income
  { id: 'property_carpark', group: 'ops', name: 'Car-park income', blurb: 'Spare parking spaces can earn money. Using them well makes friends, and using them badly makes enemies.', options: [
    opt('Free parking for all', 'Staff and visitors park for nothing.', {}),
    opt('Rent spare spaces to neighbours', 'A little steady income from people who live nearby. The odd parking row.', { risk: [2, 2, 'A parking dispute with a neighbour took up time and a repair bill.'] }, -0.25),
    opt('Charge everyone for parking', 'More income, and staff and customers grumble about paying.', { m: -0.2, d: 0.995 }, -0.6)] },
  // 545 Warehouse-versus-high-street rent trade-off
  { id: 'property_location', group: 'ops', name: 'Warehouse or high street', blurb: 'Rent is low out of town and high where the shoppers walk past. Where your space sits changes what you pay and who finds you.', options: [
    opt('Stay where you are', 'No fuss and no move.', {}),
    opt('Cheap warehouse unit', 'Rent drops and there is lots of room, but you lose the passing trade. Moving costs money.', { cap: 1.02, d: 0.97 }, -0.6, 1.5),
    opt('High-street shop front', 'Plenty of passing customers, and rent to match. Moving costs money.', { d: 1.03, br: 1.001 }, 0.9, 1.5)] },
  // 548 Smart-building sensors that cut bills
  { id: 'property_sensors', group: 'ops', name: 'Smart-building sensors', blurb: 'Sensors switch off lights and heating in empty rooms and track the temperature. They cost money up front and then trim your bills.', options: [
    opt('Normal building controls', 'Heating runs on a timer, and lights get left on.', {}),
    opt('Sensors on heating and lights', 'Bills fall, and people are comfier. Costs money to fit.', { m: 0.05 }, -0.3, 0.8),
    opt('Full building management system', 'Bills fall further. Software glitches now and then cause an unwelcome surprise.', { m: 0.1, risk: [2, 3, 'A software glitch switched the heating off overnight.'] }, -0.6, 2)] },
];

export const events: EvSpec[] = [
  // 527 Rent-review clauses every five years
  { id: 'e9_property_rentreview', title: 'Five-year rent review', icon: 'mountain', good: false, per: 1.2, cd: 48, min: 24,
    story: 'Your lease says the rent is reviewed every five years, and the date has come. The landlord\'s surveyor wants to lift the rent to market rent (what similar buildings nearby cost), and has a list of examples to prove it.', choices: [
      S('accept', 'Accept the new figure', 'Free and quick, and the rent rises for good.', 'You signed, and the higher rent became part of everyday life.', { eff: { c: E(1.02, 12) } }),
      S('surveyor', 'Hire your own surveyor', 'Fees now, and a fairer figure later.', '', { k: 0.02, acct: 'otherCosts', gamble: { p: 0.65, good: { c: E(1.005, 12), rep: 1 }, bad: { c: E(1.02, 12) }, goodText: 'Your surveyor found cheaper comparisons, and the rise was small.', badText: 'Their examples held up, and you paid the full rise.' } }),
      S('bluff', 'Threaten to move out', 'A bluff that may or may not work.', '', { gamble: { p: 0.4, good: { c: E(0.99, 12) }, bad: { c: E(1.03, 12), morale: -1 }, goodText: 'The landlord blinked and kept the rent as it was.', badText: 'The landlord called your bluff, and the rise stuck.' } })] },
  // 528 Dilapidations bills at lease end
  { id: 'e9_property_dilaps', title: 'A dilapidations bill', icon: 'alert', good: false, per: 1.2, cd: 30, min: 24,
    story: 'Your lease is coming to an end and being renewed, and the landlord has sent a list of repairs they say you owe, called dilapidations: scuffed walls, a worn carpet and a leaking tap. The bill looks fat.', choices: [
      S('pay', 'Pay the bill', 'Costly, and it closes the matter.', 'You paid, and the lease was renewed on good terms.', { k: 0.06, acct: 'otherCosts' }),
      S('surveyor', 'Challenge it with a surveyor', 'Costs fees, and may shrink the bill a lot.', '', { k: 0.025, acct: 'otherCosts', gamble: { p: 0.6, good: { morale: 1 }, bad: { c: E(1.015, 4) }, goodText: 'The surveyor spotted that half the list was normal wear and tear, and the bill fell.', badText: 'The landlord\'s list held up, and you paid most of it anyway.' } }),
      S('repair', 'Do the repairs yourselves first', 'Cheaper, and it takes a couple of weekends.', 'Staff spent two weekends painting and patching, and the landlord found little to complain about.', { k: 0.035, acct: 'otherCosts', eff: { morale: -1 } })] },
  // 529 Landlord who sells the building
  { id: 'e9_property_landlordsold', title: 'Your landlord sells up', icon: 'key', good: false, per: 1.2, cd: 36, min: 18,
    story: 'Your landlord has sold the building to a property company. The new owner has written to say rents will be brought into line with the market, and hints at redevelopment in a few years.', choices: [
      S('lease', 'Sign a longer lease straight away', 'Security now, at a slightly higher rent.', 'You locked in a few years of calm, at a higher price.', { eff: { c: E(1.015, 12), morale: 1 } }),
      S('haggle', 'Negotiate hard', 'Time and fees, with a decent chance of a fair deal.', '', { k: 0.015, acct: 'otherCosts', gamble: { p: 0.6, good: { c: E(1.005, 12), rep: 1 }, bad: { c: E(1.025, 12) }, goodText: 'The new owner wanted a good tenant and agreed a fair deal.', badText: 'The new owner held firm, and you paid the market rate.' } }),
      S('move', 'Start looking for a new home', 'Costs time and unsettles people, and ends your dependence on this landlord.', 'You found cheaper premises and moved, with a few weeks of upheaval.', { k: 0.02, acct: 'otherCosts', eff: { d: E(0.99, 3), morale: -1, c: E(0.99, 12) } })] },
  // 535 Energy-efficiency rating rules
  { id: 'e9_property_energyrules', title: 'New energy-efficiency rules', icon: 'bolt', good: false, per: 1.2, cd: 40, min: 18,
    story: 'A new law says business premises need a minimum energy-efficiency rating (a grade from A to G) to be used or let. Your building has a poor grade, with draughty windows and an old boiler.', choices: [
      S('upgrade', 'Upgrade the insulation and heating', 'Expensive now, with cheaper bills for a year.', 'The windows are sealed, the boiler is new and the heating bill has shrunk.', { k: 0.07, acct: 'otherCosts', eff: { c: E(0.99, 12), rep: 1 } }),
      S('minimum', 'Do just enough to pass', 'Cheaper, with little benefit beyond staying legal.', 'You met the minimum grade and moved on.', { k: 0.025, acct: 'otherCosts' }),
      S('exempt', 'Apply for an exemption', 'Cheap if it works, and a scramble if it does not.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.45, good: {}, bad: { rep: -1, c: E(1.02, 4) }, goodText: 'The exemption was granted, and you saved the cost of the work.', badText: 'The exemption was refused, and a rushed upgrade cost more than a planned one.' } })] },
  // 543 Neighbouring-development disruption
  { id: 'e9_property_neighbour', title: 'A building site next door', icon: 'mountain', good: false, per: 1.2, cd: 30,
    story: 'A developer has started building flats next door. There is dust, drilling from seven in the morning, and a crane that blocks your delivery entrance. Customers are putting up with it, though not happily.', choices: [
      S('screens', 'Pay for dust screens and quieter hours', 'Costs money and keeps customers on side.', 'Screens and a polite sign kept customers on side.', { k: 0.03, acct: 'otherCosts', eff: { rep: 1 } }),
      S('compensation', 'Ask the developer for compensation', 'A decent chance, and no cost to try.', '', { gamble: { p: 0.5, good: { c: E(0.99, 6), rep: 1 }, bad: { d: E(0.97, 4) }, goodText: 'The developer paid for your trouble and moved the crane.', badText: 'The developer shrugged, and customers drifted off.' } }),
      S('endure', 'Put up with it', 'Free, and a long few months.', 'The building site dragged on, and so did the dust.', { eff: { d: E(0.97, 4), morale: -1 } })] },
  // 542 Building-defect surprises
  { id: 'e9_property_defect', title: 'The roof leaks', icon: 'gear', good: false, per: 1.5, cd: 24,
    story: 'A surveyor has found a defect that nobody knew about: the roof is leaking into the ceiling, and damp is creeping up one wall. Left alone it will only get worse.', choices: [
      S('fix', 'Fix it properly', 'Costly, and it lasts.', 'The roofers did a proper job, and the damp dried out.', { k: 0.06, acct: 'otherCosts', eff: { rep: 1 } }),
      S('patch', 'Patch it cheaply', 'Cheap now, and it may fail again.', '', { k: 0.015, acct: 'otherCosts', gamble: { p: 0.55, good: {}, bad: { d: E(0.97, 3), c: E(1.02, 4) }, goodText: 'The patch held, and you hoped it would stay that way.', badText: 'The leak came back in a storm and flooded the shop floor.' } }),
      S('landlord', 'Make the landlord pay', 'Free, if the lease says it is their job.', '', { gamble: { p: 0.5, good: { rep: 1 }, bad: { rep: -1, morale: -1 }, goodText: 'The lease put it on the landlord, and they sent roofers.', badText: 'The landlord argued it was your job, and weeks of letters followed.' } })] },
  // 544 Flood-risk and insurance
  { id: 'e9_property_flood', title: 'A flood warning', icon: 'alert', good: false, per: 1.2, cd: 30,
    story: 'Heavy rain is forecast and the river near your premises is rising. A flood warning has been issued. If the water gets in, you could lose stock, equipment and a few weeks of trading.', choices: [
      S('barriers', 'Put up barriers and move things upstairs', 'Costs time and money, and protects your stock.', 'The water rose to the door and stopped. Nothing was lost, and the team felt like heroes.', { k: 0.025, acct: 'otherCosts', eff: { morale: 1 } }),
      S('cover', 'Check that your insurance covers floods', 'A quick check, and cover is not always what you think.', '', { k: 0.005, acct: 'otherCosts', gamble: { p: 0.6, good: {}, bad: { c: E(1.03, 6), d: E(0.97, 3) }, goodText: 'The cover was solid, and the claim was paid.', badText: 'The policy had a flood exclusion, and you paid for the damage yourselves.' } }),
      S('hope', 'Hope for the best', 'Free, and a gamble with your stock.', '', { gamble: { p: 0.6, good: {}, bad: { d: E(0.92, 3), c: E(1.04, 4), morale: -3 }, goodText: 'The river peaked just below the door.', badText: 'The water got in, and stock and equipment were ruined.' } })] },
  // 546 Break clauses and timing
  { id: 'e9_property_breakclause', title: 'Your break clause is coming up', icon: 'key', good: true, per: 1, cd: 48, min: 24,
    story: 'Your lease has a break clause: a date when you can end the lease early, if you give notice in time. The notice date is six weeks away. Miss it, and you are stuck for several more years.', choices: [
      S('stay', 'Stay and renew', 'Safe and steady, though the rent may rise.', 'You stayed, and the rent crept up a little.', { eff: { c: E(1.01, 12) } }),
      S('leverage', 'Use the break as leverage', 'Landlords hate empty buildings.', '', { gamble: { p: 0.6, good: { c: E(0.98, 12), rep: 1 }, bad: { c: E(1.02, 12) }, goodText: 'The landlord cut the rent to keep you.', badText: 'The landlord shrugged, and you paid more to stay.' } }),
      S('leave', 'Serve notice and move', 'A fresh start, with a disruptive move.', 'You moved to better value premises, after a week of cardboard boxes.', { k: 0.04, acct: 'otherCosts', eff: { d: E(0.97, 2), c: E(0.99, 12), morale: -1 } })] },
  // 547 Fit-out contributions from landlords
  { id: 'e9_property_fitout', title: 'A landlord offers to pay for your fit-out', icon: 'coin', good: true, per: 1.2, cd: 30, min: 12,
    story: 'A landlord wants you to sign a longer lease, and offers a fit-out contribution: cash towards decorating and kitting out the space. The catch is that you are tied in for longer.', choices: [
      S('cash', 'Take the cash and the longer lease', 'Money now, and a longer commitment.', 'The cash arrived, and so did a rent bump.', { income: 0.3, eff: { c: E(1.01, 12) } }),
      S('rentfree', 'Ask for rent-free months instead', 'Saves rent, not cash in hand.', 'The landlord gave you a few rent-free months, and you kept the old fit-out.', { eff: { c: E(0.99, 12) } }),
      S('decline', 'Keep the shorter lease', 'Stay flexible, and pay your own way.', 'You kept your freedom and paid for your own paint.')] },
  // 549 Heritage-listing restrictions
  { id: 'e9_property_heritage', title: 'Your building is heritage-listed', icon: 'crown', good: false, per: 1, cd: 40, min: 12,
    story: 'The council has put your building on the heritage list because of its history. That means strict rules on changes: no new signs, windows or extensions without special permission.', choices: [
      S('embrace', 'Celebrate it in your marketing', 'Costs a little, and gives you a story to tell.', 'Customers loved the history, and your plaque became a talking point.', { k: 0.015, acct: 'marketing', eff: { brand: 1.02, rep: 1 } }),
      S('appeal', 'Appeal against the listing', 'Fees, with an even chance.', '', { k: 0.025, acct: 'otherCosts', gamble: { p: 0.4, good: { rep: 1, d: E(1.01, 6) }, bad: { rep: -1 }, goodText: 'The appeal succeeded, and you are free to alter things again.', badText: 'The appeal failed, and the town thought you did not care about its history.' } }),
      S('adapt', 'Work within the rules', 'Free, though every change is slower.', 'Every sign and window now needs a permit, and everything takes longer.', { eff: { c: E(1.01, 8) } })] },
];

export const projects: InitiativeDef[] = [
  // 533 Planning-permission change of use
  { id: 'property_planning', name: 'Change of use permission', blurb: 'Ask the council for permission to use part of your building for something new, such as turning part of a shop into a cafe. It might be refused, and the fees are gone either way.',
    k: 0.5, months: 6, success: 55,
    win: { eff: { d: 1.02, cap: 1.01 }, monthly: 0.1, now: { rep: 1 }, text: 'Permission was granted. The new use brings in customers, and the new space needs looking after.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'The council said no, and the fees were gone.' } },
  // 534 Business-rates appeal wins
  { id: 'property_rates', name: 'Business-rates appeal', blurb: 'Business rates are a local tax on premises. If you think your bill is too high, you can pay an expert to appeal. Wins save money every month.',
    k: 0.3, months: 8, success: 55,
    win: { monthly: -0.3, now: { rep: 1 }, text: 'The valuer agreed your building was over-valued, and your rates bill is lower every month.' },
    lose: { now: { morale: -1 }, text: 'The valuer sided with the council, and the fees were wasted.' } },
  // 540 Property-developer partnerships
  { id: 'property_developer', name: 'Developer partnership', blurb: 'A property developer builds or refurbishes premises for you, in exchange for a long lease or a share of the gains. Great if it works, and slow and messy if not.',
    k: 1.2, months: 12, success: 55,
    win: { eff: { cap: 1.02, c: 0.99 }, monthly: 0.2, now: { brand: 1.02, rep: 1 }, text: 'The new premises opened on time. They are better for your work, and you pay a steady charge for them.' },
    lose: { now: { d: E(0.97, 4), rep: -1 }, text: 'Delays and arguments over the plans soured things, and the building site cost you customers.' } },
  // 539 Office move disruption weekend
  { id: 'property_officemove', name: 'The big move', blurb: 'Move to better premises over a weekend. Careful planning keeps the disruption small, and a rushed move means chaos on Monday.',
    k: 0.6, months: 3, success: 75,
    win: { eff: { cap: 1.01, c: 0.995 }, now: { morale: 2 }, text: 'The move went like clockwork. The new layout works better, and the team arrived to fresh desks on Monday.' },
    lose: { now: { d: E(0.96, 3), morale: -3 }, text: 'Boxes went missing, the phones were down and Monday was chaos.' } },
];
