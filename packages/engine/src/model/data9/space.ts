import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Sector topic: Space launch startup. Ids start with "space_" (policies, initiatives) or "e9_space_" (events). */
export const policies: PolicyDef[] = [
  // 376 Launch windows
  { id: 'space_windows', group: 'ops', name: 'Launch-window planning', blurb: 'A launch window is the short slot when a planet lines up so a rocket can reach the right orbit. Miss it and you wait weeks. Tight schedules fit more flights in, and leave no room for delays.', options: [
    opt('Plan with slack', 'Leave spare days around every window. Safe and a bit slow.', {}),
    opt('Tight schedule', 'Back-to-back launches use your pad better. One delay can ruin the next window.', { cap: 1.03, risk: [8, 2.5, 'A delay made you miss a launch window and the customer waited weeks.'] }, 0.2),
    opt('Hold a spare rocket ready', 'A second rocket on standby catches missed windows. Parked hardware costs money.', { cap: 1.04, c: 1.015 }, 0.5, 0.5)] },
  // 377 Test failures
  { id: 'space_testing', group: 'ops', name: 'Test-flight programme', blurb: 'Every new rocket is tested before it carries a customer. Tests blow things up on purpose to find faults early. Cheaper to break a test rocket than a customer\'s satellite.', options: [
    opt('Minimum testing', 'Test only what the regulator demands.', {}),
    opt('Full engine tests', 'Fire every engine on the ground first. Scrapped test parts are costly, and launches fail less often.', { q: 0.03, c: 1.02, risk: [6, 2, 'A test engine exploded and the rebuild cost real money.'] }, 0.3),
    opt('Fly-and-fix', 'Launch early and learn from failures. Quick progress, loud explosions.', { q: 0.04, rep: -0.02, risk: [12, 5, 'A prototype rocket was lost in flight and had to be rebuilt.'] }, 0.2)] },
  // 379/400 Insurance
  { id: 'space_insurance', group: 'finance', name: 'Launch insurance', blurb: 'Launch insurance pays out if your rocket is lost. Premiums, the price of the policy, jump after a failure, so insurers watch you closely.', options: [
    opt('Self-insure', 'Keep the cash and take the risk yourself.', {}),
    opt('Cover customer payloads', 'Customers feel safer. Premiums cost a steady slice of sales.', { d: 1.02, ch: 1.0, od: 1.1 }, 0.9),
    opt('Full vehicle and payload cover', 'Failures are mostly paid for. Premiums are high and rise after any accident.', { d: 1.03, od: 1.2, c: 1.01 }, 1.6, 0.3)] },
  // 378 Government bidding
  { id: 'space_govbids', group: 'customers', name: 'Government contract bidding', blurb: 'Space agencies buy launches through formal bids: long paperwork, then a big contract. Winning gives steady, slow-paying work. Bidding costs staff time even when you lose.', options: [
    opt('Skip public tenders', 'Chase private satellite firms only.', {}),
    opt('Bid on small tenders', 'A bid team writes proposals. Some win, and paperwork eats time.', { d: 1.03, m: -0.1 }, 0.5),
    opt('Chase the big contracts', 'Large agency deals bring volume. Heavy paperwork wears the team down and cash arrives slowly.', { d: 1.05, m: -0.3, od: 0.9 }, 1.1, 0.4)] },
  // 380 Payload schedules
  { id: 'space_payloadsched', group: 'customers', name: 'Payload-delay terms', blurb: 'A payload is the satellite you carry. Customers often finish theirs late. Your contract decides who pays when the satellite is not ready on launch day.', options: [
    opt('Customer bears delays', 'Strict terms: late customers pay a fee. Some walk away.', {}),
    opt('Flexible rebooking', 'Customers can move their slot for free. They like it, and your pad sits empty at times.', { d: 1.03, cap: 0.97 }, 0.3),
    opt('Guaranteed slots', 'You promise a slot on the date. Great trust, and you fly half-empty rockets when customers slip.', { d: 1.04, ch: 1.0, c: 1.03 }, 0.6)] },
  // 381 Reusable research
  { id: 'space_reuse', group: 'ops', name: 'Reusable-rocket research', blurb: 'A reusable rocket lands and flies again instead of being thrown away, which can slash cost per launch. The research is expensive, and many landings fail first.', options: [
    opt('Throw-away rockets', 'Build a new rocket each time. Simple and costly.', {}),
    opt('Recover the first stage', 'Try to land the bottom stage. Crashes happen, and savings add up when it works.', { c: 0.96, risk: [8, 4, 'A landing attempt failed and you lost the booster.'] }, 0.8, 0.6),
    opt('Full reuse programme', 'Land and refly everything. Big long-run savings, big bills and bigger crashes.', { c: 0.93, q: -0.01, risk: [11, 6, 'A reused booster failed an inspection and the flight was cancelled.'] }, 1.4, 1.2)] },
  // 382/386/391 Licences
  { id: 'space_licences', group: 'ops', name: 'Launch licences and range safety', blurb: 'Before every flight a regulator checks that the rocket will not drop on anyone. Range safety means the officer who can order the rocket destroyed if it strays. Approvals take time.', options: [
    opt('Apply per launch', 'File fresh paperwork each time. Slow, cheap.', {}),
    opt('Hire a licensing lead', 'An expert handles filings in advance. Fewer delays, extra wage.', { cap: 1.03, m: 0.1 }, 0.6),
    opt('Long-term range agreement', 'A multi-year deal with the launch range. Reliable slots, and a big commitment to pay.', { cap: 1.05, c: 1.01 }, 0.9, 0.5)] },
  // 383 Recruitment
  { id: 'space_hiring', group: 'people', name: 'Engineer recruitment', blurb: 'Everyone wants rocket engineers, including giant rivals. A bidding war pushes salaries up. Paying well keeps people, and the bill grows.', options: [
    opt('Market pay', 'Pay the going rate and hope.', {}),
    opt('Equity for engineers', 'Give staff a slice of company shares. Cheap to start and loyalty is high.', { hire: 0.85, m: 0.15, rep: -0.01 }, 0.4),
    opt('Top-of-market salaries', 'Win the hiring race. Wages jump.', { hire: 0.8, q: 0.02, m: 0.2 }, 1.4)] },
  // 395 Single points of failure
  { id: 'space_suppliers', group: 'ops', name: 'Supplier backup', blurb: 'A single point of failure is one supplier whose problem stops everything, like the only maker of your valves. Second suppliers cost more and protect you.', options: [
    opt('One supplier per part', 'Cheapest, and one bad month stops the line.', {}),
    opt('Second source for key parts', 'Two valve makers. A little pricier and much safer.', { c: 1.015, risk: [4, 2, 'A supplier delay held up a build.'] }, 0.3),
    opt('Make parts in-house', 'Control your own supply with more staff and tools. Costs more up front.', { c: 1.02, cap: 0.98, q: 0.02 }, 0.8, 0.8)] },
  // 396 Mission control
  { id: 'space_missionctl', group: 'people', name: 'Mission-control staffing', blurb: 'Mission control is the room of people watching every launch. Night shifts and tired staff cause mistakes. More people cost more wages.', options: [
    opt('Small skeleton crew', 'A few people cover everything.', {}),
    opt('Proper shift rota', 'Rested teams on fair shifts. Higher wages, fewer errors.', { m: 0.2, q: 0.02 }, 0.7),
    opt('Round-the-clock control room', 'Continuous coverage of every satellite you fly. Costly and customers love it.', { d: 1.02, m: 0.1, q: 0.03 }, 1.4)] },
  // 394/397 PR and sponsorship
  { id: 'space_publicity', group: 'customers', name: 'Launch publicity and sponsors', blurb: 'Live-streamed launches build fame. A sponsor pays to put its logo on your rocket. Fame fades fast if the rocket explodes on camera.', options: [
    opt('Quiet launches', 'No cameras, no fuss.', {}),
    opt('Livestream every launch', 'Big audiences, big brand. A failure is watched by everyone too.', { br: 1.003, rep: 0.02, risk: [6, 1.5, 'A failure on live video got shared everywhere.'] }, 0.4),
    opt('Sell sponsor logos', 'Companies pay to be on the rocket. Brand deals tie your image to theirs.', { br: 1.002, rep: -0.01 }, -0.5)] },
  // 393 Patents
  { id: 'space_patents', group: 'finance', name: 'Engine-design licensing', blurb: 'A patent is a legal claim on your invention. Licensing it lets others pay to use your engine design, and your know-how leaks out.', options: [
    opt('Keep designs secret', 'No income and no leaks.', {}),
    opt('License older designs', 'Earn royalties on last-generation engines. Rivals get a bit better.', { d: 0.99, od: 1.1 }, -0.8),
    opt('License everything', 'Big royalty income, and rivals catch up to you.', { d: 0.97, ch: 1.0, od: 1.2 }, -1.4)] },
];

export const events: EvSpec[] = [
  // 389 Competitor failure
  { id: 'e9_space_rivalboom', title: 'A rival rocket explodes', icon: 'flame', good: true, per: 1.2, cd: 14, story: 'A competitor lost a rocket on live TV. Satellite owners are nervous and asking who else can fly them. This is your moment, and your own record is now under the microscope.', choices: [
    S('pitch', 'Pitch their nervous customers', 'Costs sales time and might win business.', '', { k: 0.03, gamble: { p: 0.6, good: { d: E(1.06, 5), rep: 1 }, bad: { rep: -1 }, goodText: 'Several stranded customers moved to you.', badText: 'They stuck with their old firm, and your pitch looked like gloating.' } }),
    S('quiet', 'Stay quiet and respectful', 'Free, and slow reward.', 'You let it pass. Demand drifted your way a little.', { eff: { d: E(1.02, 4) } })] },
  // 384 Investor milestones
  { id: 'e9_space_milestone', title: 'Investors demand a test flight', icon: 'rocket', good: false, per: 1.2, cd: 14, story: 'Your investors say the next money comes only if a test flight succeeds by a deadline. Rushing raises the chance of failure, and delay may cost you the cash.', choices: [
    S('rush', 'Hit the deadline', 'Fly early. Risky.', '', { k: 0.03, gamble: { p: 0.5, good: { rep: 2, brand: 1.02 }, bad: { quality: -2, rep: -2, morale: -2 }, goodText: 'The flight worked and investors cheered.', badText: 'The rocket failed and the investors lost patience.' } }),
    S('negotiate', 'Ask for more time', 'Safer, and shows weakness.', 'Investors agreed to wait a bit, with some grumbling.', { eff: { rep: -1, quality: 1 } })] },
  // 385 Fuel
  { id: 'e9_space_fuelprice', title: 'Rocket fuel prices jump', icon: 'bolt', good: false, per: 1.3, cd: 12, story: 'Propellant, the fuel and oxidiser your rocket burns, got pricier after a factory shut. Every launch now costs more to fuel.', choices: [
    S('hedge', 'Lock in a fixed price', 'Costs a fee, and steadies bills.', 'You paid a fee for a steady price.', { k: 0.03, eff: { c: E(1.01, 6) } }),
    S('spot', 'Buy at today\'s price', 'Free now. Prices may drop or rise.', '', { gamble: { p: 0.5, good: { c: E(1.01, 3) }, bad: { c: E(1.06, 6) }, goodText: 'Prices eased quickly.', badText: 'Prices stayed high for half a year.' } })] },
  // 387 Rideshare
  { id: 'e9_space_rideshare', title: 'Rideshare mission offered', icon: 'parcel', good: true, per: 1.2, cd: 12, story: 'A rideshare mission packs many small satellites on one rocket so they split the bill. You fill the rocket with several customers, which means more paperwork and every customer waits for the slowest.', choices: [
    S('fill', 'Fill the rocket with small customers', 'More revenue per flight, more admin.', 'The rocket flew full and profitable.', { k: 0.03, eff: { d: E(1.04, 5), morale: -1 } }),
    S('anchor', 'Keep one big anchor customer', 'Simple and steady.', 'One customer, one launch, no fuss.', { eff: { rep: 1 } })] },
  // 388 Tourism
  { id: 'e9_space_tourism', title: 'A space-tourism side line', icon: 'star', good: true, per: 1, cd: 16, story: 'A rich travel firm wants to book short joyrides to the edge of space. Tourists pay a lot and expect safety and comfort. One incident would hurt your main business.', choices: [
    S('start', 'Launch a tourist programme', 'Big bookings, big risk.', '', { k: 0.08, gamble: { p: 0.55, good: { d: E(1.04, 8), brand: 1.03, rep: 2 }, bad: { rep: -3, morale: -2 }, goodText: 'Tourists paid top prices and the press loved you.', badText: 'A scare during a test flight made headlines for the wrong reasons.' } }),
    S('pass', 'Stay with satellites', 'No distractions.', 'You stuck to the business you know.')] },
  // 390 Ground station
  { id: 'e9_space_groundstation', title: 'Ground-station offer', icon: 'globe', good: true, per: 1, cd: 14, story: 'A ground station is a dish that talks to satellites. A company offers a network and wants a share of your launches in return. You could start tracking and data services for customers too.', choices: [
    S('join', 'Use their network', 'A small fee and more reach.', 'Your customers now get tracking and data from one supplier.', { k: 0.03, eff: { d: E(1.03, 6) } }),
    S('build', 'Build your own network', 'Expensive and slow, and then yours.', 'You built dishes in two countries, and the bills piled up.', { k: 0.08, eff: { d: E(1.04, 10), c: E(1.01, 6) } }),
    S('skip', 'Leave it to others', 'No cost.', 'You stayed a launch-only company.')] },
  // 398 Debris
  { id: 'e9_space_debris', title: 'Debris-removal contract', icon: 'shield', good: true, per: 1, cd: 16, story: 'Space junk is old satellites and rocket parts drifting around the planet. An agency will pay a company to attach a tug and pull a dead satellite out of orbit. It is new and tricky.', choices: [
    S('take', 'Take the contract', 'Paid well, very hard to do.', '', { k: 0.05, gamble: { p: 0.5, good: { d: E(1.03, 6), rep: 2 }, bad: { morale: -2, rep: -1 }, goodText: 'The tug caught the dead satellite and the agency paid in full.', badText: 'The grab failed and the agency refused the final payment.' } }),
    S('decline', 'Decline politely', 'Keep the focus.', 'You kept your team on launches.')] },
  // 399 Research grant
  { id: 'e9_space_grant', title: 'Research grant on offer', icon: 'diamond', good: true, per: 1.1, cd: 14, story: 'A government science fund offers a grant, which is free money for research, if you share results openly and file regular reports. Reporting eats staff time.', choices: [
    S('apply', 'Apply for the grant', 'Costs paperwork now. Pays well.', 'The grant arrived and the engineers shared a report.', { income: 0.35, eff: { morale: -1 } }),
    S('keep', 'Keep your research private', 'No cash and no strings.', 'Your designs stayed secret.')] },
  // 392 Prototype vs production
  { id: 'e9_space_prototype', title: 'Prototype or production?', icon: 'gear', good: false, per: 1.2, cd: 14, story: 'Your team has a working prototype rocket. Do you keep improving it, or lock the design and build many copies? Locking it gets you flying sooner, and you cannot easily change it later.', choices: [
    S('lock', 'Lock the design and mass-produce', 'Costly now, cheaper per rocket later.', '', { k: 0.06, gamble: { p: 0.6, good: { c: E(0.95, 10), d: E(1.02, 6) }, bad: { quality: -2, c: E(1.03, 6) }, goodText: 'The factory line cut costs.', badText: 'A design flaw appeared across many rockets.' } }),
    S('tinker', 'Keep refining', 'Better rocket, slower launches.', 'You kept improving it, and customers waited.', { eff: { quality: 2, d: E(0.98, 4) } })] },
  // 395 supplier failure
  { id: 'e9_space_supplier', title: 'Key supplier goes bust', icon: 'key', good: false, per: 1.2, cd: 14, story: 'The only company that made your special valves has gone out of business. Rockets in the factory cannot be finished until you find another source.', choices: [
    S('rush', 'Pay a rival maker to rush', 'Costly and fast.', 'You paid extra and the line moved again.', { k: 0.05, eff: { c: E(1.02, 4) } }),
    S('build', 'Make the valves yourself', 'Slow, and you own the problem.', 'It took months, and your engineers learned a lot.', { k: 0.03, eff: { d: E(0.97, 4), quality: 1 } })] },
  // 391 regulatory
  { id: 'e9_space_regulator', title: 'Regulator delays your licence', icon: 'flag', good: false, per: 1.2, cd: 12, story: 'The aviation regulator wants another safety review before it lets you launch. Every week of waiting costs you money while the customer is tapping a foot.', choices: [
    S('lawyers', 'Hire specialist lawyers', 'Costs money and may speed things up.', '', { k: 0.04, gamble: { p: 0.6, good: { rep: 1 }, bad: { d: E(0.97, 3) }, goodText: 'The lawyers got your licence quickly.', badText: 'The review dragged on anyway.' } }),
    S('wait', 'Wait for the review', 'Free, and your customers wait too.', 'You waited, and some customers lost patience.', { eff: { d: E(0.97, 3), morale: -1 } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'space_reusablebooster', name: 'Land a reusable booster', blurb: 'Teach your first stage to land on its own and fly again. Each saved booster is one fewer to build. Landings fail often at first, and each failure is a real crash.', k: 2, months: 14, success: 50,
    win: { eff: { c: 0.95 }, monthly: 0.3, now: { brand: 1.03, rep: 2 }, text: 'The booster landed upright and was reflown. Your cost per launch fell.' },
    lose: { now: { morale: -2, rep: -1 }, text: 'Three boosters crashed. The programme was paused.' } },
  { id: 'space_agencydeal', name: 'Win an agency framework contract', blurb: 'A framework contract is a long deal in which a space agency promises to book several launches. It means steady work, slow payment and endless paperwork.', k: 1.4, months: 10, success: 55,
    win: { eff: { d: 1.05, ch: 0.98 }, monthly: 0.2, now: { rep: 2 }, text: 'The agency signed a multi-launch deal. Cash comes slowly, and reliably.' },
    lose: { now: { morale: -2 }, text: 'A rival won the contract and your bid team was exhausted.' } },
  { id: 'space_groundnet', name: 'Build a ground-station network', blurb: 'Dishes in several countries let you talk to satellites after launch. Customers get one supplier from rocket to data, and you carry more equipment and staff.', k: 1.5, months: 12, success: 60,
    win: { eff: { d: 1.04, ch: 0.98 }, monthly: 0.3, text: 'Customers now buy launch and tracking together.' },
    lose: { now: { morale: -1, quality: -1 }, text: 'Dishes sat idle because few customers wanted the service.' } },
  { id: 'space_orbitalflight', name: 'First orbital flight', blurb: 'A rocket that reaches orbit, the height where a satellite can circle the planet, proves you are real. It is the make-or-break flight for a young launch company.', k: 1.8, months: 9, success: 55,
    win: { eff: { d: 1.05, q: 0.02 }, now: { brand: 1.04, rep: 3 }, text: 'You reached orbit. Customers started calling you.' },
    lose: { now: { rep: -3, morale: -3 }, text: 'The rocket fell short of orbit and your name took a hit.' } },
  { id: 'space_rideshareprogram', name: 'Regular rideshare programme', blurb: 'Fly a scheduled rideshare every quarter so small satellite makers can book months ahead, like a bus timetable. Needs lots of small customers to fill each flight.', k: 0.9, months: 7, success: 65,
    win: { eff: { d: 1.04, cap: 1.02 }, text: 'Small satellite firms now plan around your timetable.' },
    lose: { now: { d: E(0.98, 3), morale: -1 }, text: 'Half-empty flights lost money.' } },
];
