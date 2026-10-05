import { off, opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Sector topic: Fitness club. Everything here is only available to that sector. Every id must start with "fitness_" (policies and initiatives) or "e9_fitness_" (events). */
export const policies: PolicyDef[] = [
  { id: 'fitness_tiers', group: 'customers', name: 'Family and student memberships', blurb: 'Cheaper tiers for students and families bring in more people, but each member pays less.', options: [
    off,
    opt('Student tier', 'A lower price for students. They fill quiet daytime slots and may stay for years.', { d: 1.015, ch: 0.99 }, 0.5),
    opt('Student and family tiers', 'Families join together and rarely leave alone. Revenue per member drops and the changing rooms get busier.', { d: 1.03, ch: 0.98, cap: 0.99 }, 1.1)] },

  { id: 'fitness_daypass', group: 'customers', name: 'Day passes for visitors', blurb: 'A day pass lets tourists and curious locals pay once to train. It is extra income, but every visitor uses kit that members have paid for.', options: [
    off,
    opt('Weekday passes', 'Passes sold only at quiet times, so members barely notice.', { d: 1.01 }, 0.3, 0.2),
    opt('Passes every day', 'Visitors are everywhere. Great income, and regulars grumble about queues for the machines.', { d: 1.025, rep: -0.03, cap: 0.99 }, 0.5, 0.2)] },

  { id: 'fitness_cancel', group: 'customers', name: 'Cancel-anytime or minimum term', blurb: 'A minimum term locks members in for months. Cancel-anytime is friendlier and attracts more sign-ups, but people leave more easily.', options: [
    off,
    opt('Cancel anytime', 'One month notice and no fuss. Easy to say yes to, easy to say goodbye to.', { d: 1.025, ch: 1.03, rep: 0.03 }),
    opt('Twelve-month minimum', 'Members are tied in, so fewer leave. Some people refuse to join, and unhappy members complain loudly.', { d: 0.97, ch: 0.95, rep: -0.05 })] },

  { id: 'fitness_timetable', group: 'customers', name: 'Group-class timetable', blurb: 'Classes such as spin and yoga fill rooms at set times. Too few and rooms sit empty, too many and you pay instructors for classes nobody joins.', options: [
    off,
    opt('A few popular classes', 'Only the classes that always fill up.', { q: 0.02, d: 1.01 }, 0.6),
    opt('A packed timetable', 'Something on every hour. Members love the choice, but quiet sessions cost you instructor pay for nothing.', { q: 0.04, d: 1.02, ch: 0.98 }, 1.5)] },

  { id: 'fitness_smoothie', group: 'customers', name: 'Smoothie bar', blurb: 'Smoothies and snacks have a high margin, which means a big gap between what they cost and what you charge. Fresh fruit spoils fast, so waste eats the profit.', options: [
    off,
    opt('Grab-and-go fridge', 'Bottled drinks and bars. Low effort, low margin, almost no waste.', { rep: 0.02 }, 0.2, 0.3),
    opt('Full smoothie bar', 'Made to order with fresh fruit. Members enjoy it, but staff time is needed and unsold fruit is thrown away.', { q: 0.02, rep: 0.04, d: 1.01, risk: [8, 1.5, 'A crate of fruit went off before it was sold.'] }, 0.6, 0.8)] },

  { id: 'fitness_pool', group: 'ops', name: 'Swimming pool', blurb: 'A pool is a big draw, but heating thousands of litres of water is expensive, and it needs lifeguards and cleaning.', options: [
    off,
    opt('Small plunge pool', 'A modest pool that is cheap to heat and not much of a draw.', { d: 1.012, q: 0.02 }, 0.8, 1.2),
    opt('Full-size pool', 'A big attraction that members love. The heating bill is huge, and a broken pump can shut it down.', { d: 1.03, q: 0.04, risk: [6, 3, 'The pool pump broke and the pool closed for a week.'] }, 2, 2.5)] },

  { id: 'fitness_lockers', group: 'ops', name: 'Locker-room cleanliness', blurb: 'Nobody says it, but a grubby changing room makes people quit. Cleaners cost money, and members notice the difference.', options: [
    off,
    opt('Cleaned twice daily', 'Fresh towels, no smells. A steady cost, and members notice.', { rep: 0.04, ch: 0.985 }, 0.8),
    opt('Hourly checks and spa-fresh finish', 'Spotless all day. It costs a lot of cleaner hours.', { rep: 0.08, ch: 0.97, q: 0.02 }, 1.6)] },

  { id: 'fitness_24h', group: 'ops', name: '24-hour access', blurb: 'Let members in by key fob at any hour. Shift workers love it, but you need cameras, a security firm and more insurance.', options: [
    off,
    opt('Early and late access', 'Open from 5am to midnight. Pleases early birds and night owls.', { d: 1.015 }, 0.7, 0.4),
    opt('Open all night', 'Always open with fob entry and cameras. Big appeal, and a late-night break-in or a fight is possible.', { d: 1.03, risk: [6, 3, 'There was a late-night incident and you had to pay for repairs and security.'] }, 1.5, 0.8)] },

  { id: 'fitness_childcare', group: 'people', name: 'Child-care room', blurb: 'A crèche lets parents train while their children are looked after. It attracts families and you must follow strict safety rules and staff ratios.', options: [
    off,
    opt('Crèche for two hours', 'A small supervised room in the mornings. Parents love it, and it needs trained staff.', { d: 1.015, ch: 0.985, m: -0.1 }, 1.1, 0.8),
    opt('Full-day crèche', 'Open all day with extra staff and tight rules. Families stay for years, but one accident would be serious.', { d: 1.03, ch: 0.97, m: -0.2, risk: [4, 4, 'A child had a fall in the crèche and you had to pay for an investigation.'] }, 2, 1.5)] },
];

export const events: EvSpec[] = [
  { id: 'e9_fitness_crowd', title: 'Queues for the squat rack', icon: 'dumbbell', good: false, per: 1.5, cd: 12, story: 'Between 5pm and 7pm, the gym is heaving. Members wait in queues for machines, and a few have started posting grumpy comments online.', choices: [
    S('extend', 'Extend opening hours and add classes', 'Spreads the crowd out, and costs staff time.', 'Evening queues eased off as people found quieter slots.', { k: 0.03, eff: { rep: 1 } }),
    S('cap', 'Limit entry at peak times', 'Fewer people squeeze in, some are turned away.', 'The floor felt roomy, and some members were annoyed to be turned away.', { eff: { d: E(0.97, 4), rep: 1 } }),
    S('wait', 'Wait and see', 'Free, and some members may leave.', '', { gamble: { p: 0.4, good: {}, bad: { rep: -2, d: E(0.96, 5) }, goodText: 'The grumbling faded away.', badText: 'People started saying that your gym is always full, and cancelled.' } })] },
  { id: 'e9_fitness_trainerexit', title: 'Your star trainer wants to leave', icon: 'star', good: false, per: 1.2, cd: 14, gate: 'team', story: 'A popular personal trainer has told you she wants to set up on her own. Her clients like her more than they like the gym, and they would follow her out of the door.', choices: [
    S('raise', 'Offer a pay rise and a share of her fees', 'Costs more, and she probably stays.', 'She stayed and her clients stayed too.', { k: 0.04, eff: { morale: 1 } }),
    S('contract', 'Remind her of her contract', 'Cheap, and the trainer might not be happy.', '', { gamble: { p: 0.5, good: {}, bad: { morale: -3, d: E(0.97, 5) }, goodText: 'The contract kept her client list in place.', badText: 'She left angry and took many clients with her.' } }),
    S('letgo', 'Let her go and hire someone new', 'Clean break, but some clients follow her.', 'A new trainer arrived. Some regulars left, others stayed.', { k: 0.02, eff: { d: E(0.98, 4), morale: -1 } })] },
  { id: 'e9_fitness_january', title: 'The January rush', icon: 'flame', good: true, per: 2, cd: 12, story: 'New Year resolutions have filled your doors with eager newcomers. Experience says that many of them will stop coming by February.', choices: [
    S('sellhard', 'Sign up as many as possible', 'Lots of members now, and many leave soon.', 'The doors never stopped. By February the new faces thinned out.', { eff: { d: E(1.05, 2), rep: -1 } }),
    S('onboard', 'Run an induction for every newcomer', 'Costs trainers time and helps them settle in.', 'Newcomers who got a plan and a friendly face tended to stay.', { k: 0.03, eff: { d: E(1.04, 5), rep: 1 } }),
    S('buddy', 'Pair newcomers up with a buddy', 'Cheap, and works best for the social ones.', '', { k: 0.01, gamble: { p: 0.6, good: { d: E(1.04, 5) }, bad: { d: E(1.01, 3) }, goodText: 'Friends dragged each other along for months.', badText: 'Most buddies drifted apart by mid-February.' } })] },
  { id: 'e9_fitness_breakdown', title: 'The treadmills keep breaking', icon: 'gear', good: false, per: 1.5, cd: 10, story: 'Gym machines wear out, especially the cardio ones that run all day. Three treadmills now show an out-of-order sign, and members have noticed.', choices: [
    S('service', 'Pay for a full service of everything', 'Pricey, and stops many future breakdowns.', 'Every machine was serviced and there were far fewer breakdowns.', { k: 0.05, eff: { quality: 1 } }),
    S('repair', 'Repair only what is broken', 'A cheap patch for now.', 'The treadmills were fixed. More will probably follow.', { k: 0.015 }),
    S('hope', 'Leave the signs up', 'Free, and members get annoyed.', '', { gamble: { p: 0.35, good: {}, bad: { rep: -2, quality: -2, d: E(0.97, 4) }, goodText: 'People used the other machines and shrugged.', badText: 'Members complained about broken kit and some cancelled.' } })] },
  { id: 'e9_fitness_injury', title: 'A member hurts their back', icon: 'shield', good: false, per: 1.2, cd: 12, story: 'A member has pulled something while lifting weights, and says nobody showed him how. Public liability insurance covers injuries to the public on your premises, but you will want to handle this carefully.', choices: [
    S('care', 'Apologise, help and review your safety signs', 'Costs money and builds trust.', 'The member appreciated your care, and the gym is a little safer now.', { k: 0.03, eff: { rep: 1, quality: 1 } }),
    S('claim', 'Hand it to your insurer', 'Cheap now, and it may get nasty.', '', { gamble: { p: 0.6, good: {}, bad: { rep: -2 }, goodText: 'The insurer settled it quietly.', badText: 'The member told the local paper you did not care.' } }),
    S('deny', 'Deny responsibility', 'Free now, and risky.', '', { gamble: { p: 0.3, good: {}, bad: { rep: -3, morale: -2 }, goodText: 'The matter was dropped.', badText: 'A formal complaint followed, and staff felt uneasy about it.' } })] },
  { id: 'e9_fitness_union', title: 'Instructors ask for more pay', icon: 'music', good: false, per: 1, cd: 18, gate: 'team', story: 'Your class instructors have organised and are asking for better pay, paid prep time and guaranteed hours. They say that the classes are the reason people join.', choices: [
    S('agree', 'Agree to most of it', 'Costs more and keeps the team happy.', 'The instructors were delighted, and the classes got better.', { k: 0.05, eff: { morale: 3, quality: 1 } }),
    S('half', 'Meet them half-way', 'A compromise that most can live with.', 'A fair deal was reached, though nobody got everything.', { k: 0.025, eff: { morale: 1 } }),
    S('refuse', 'Refuse', 'Costs nothing now, and some may walk out.', '', { gamble: { p: 0.4, good: { morale: -1 }, bad: { morale: -5, quality: -2, d: E(0.96, 4) }, goodText: 'They grumbled and carried on.', badText: 'Several instructors quit and classes were cancelled.' } })] },
  { id: 'e9_fitness_partner', title: 'Local team wants a partnership', icon: 'globe', good: true, per: 1, cd: 16, story: 'The local football club has asked you to be their training partner. Players would use your gym and you would be on their shirts, in return for some discounts.', choices: [
    S('full', 'Sponsor the team properly', 'Costs more and gives your brand a boost.', 'Your name was on every shirt, and fans signed up.', { k: 0.05, eff: { brand: 1.01, d: E(1.03, 6) } }),
    S('light', 'Offer discounted memberships only', 'A cheap deal for a smaller gain.', 'A few fans took the offer and the club was pleased.', { k: 0.01, eff: { d: E(1.015, 4) } }),
    S('pass', 'Politely decline', 'Free, and keeps you focused.', 'You kept your plans simple.')] },
  { id: 'e9_fitness_corporate', title: 'An employer wants a wellness deal', icon: 'chart', good: true, per: 1.2, cd: 14, story: 'A local company wants to buy memberships for all its staff at a discount. That gives you a lot of members at once, though they bring less income each.', choices: [
    S('deal', 'Take the deal at a discount', 'Many new members, lower income per head.', 'Dozens of workers joined at once, and quiet times filled up.', { eff: { d: E(1.04, 8), rep: 1 } }),
    S('bundle', 'Offer it with extra classes', 'Costs staff time and the employer is happier.', 'The package pleased the employer, and staff came to the classes.', { k: 0.03, eff: { d: E(1.05, 8), rep: 1 } }),
    S('decline', 'Say no', 'Keep your normal prices.', 'You kept your pricing as it was.')] },
];

export const projects: InitiativeDef[] = [
  { id: 'fitness_spa', name: 'Build a sauna and spa', blurb: 'Add a sauna, steam room and spa area, and sell day access and treatments as an upsell, which means an extra product offered to existing customers.', k: 2.5, months: 6, success: 70,
    win: { eff: { d: 1.03, q: 0.02 }, monthly: 0.4, now: { rep: 2, brand: 1.01 }, text: 'The spa is the talk of the town, and members pay extra for it.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Building work ran late and the spa opened half-finished. People are underwhelmed.' } },
  { id: 'fitness_online', name: 'Online workout library', blurb: 'Film your classes and offer video workouts for members at home. It can earn from people far from your gym, and filming takes time.', k: 0.8, months: 5, success: 65,
    win: { eff: { d: 1.025, ch: 0.98 }, now: { brand: 1.01, rep: 1 }, text: 'Members love working out at home, and the videos reach new people.' },
    lose: { now: { morale: -1 }, text: 'The videos looked rough and few people watched them.' } },
  { id: 'fitness_franchise', name: 'Franchise your best class format', blurb: 'A franchise lets other people run your brand and classes in return for fees. It spreads your name and asks a lot of you to train and check them.', k: 2, months: 12, success: 50,
    win: { eff: { d: 1.04 }, monthly: -0.8, now: { brand: 1.02, rep: 2 }, text: 'Your first franchise partners are paying fees, and the brand is spreading.' },
    lose: { now: { rep: -2, morale: -2 }, text: 'A franchisee ran the classes badly and your brand took the blame.' } },
  { id: 'fitness_challenge', name: 'Run a challenge event', blurb: 'A six-week transformation challenge or charity run gets people talking and signing up.', k: 0.6, months: 3, success: 75,
    win: { eff: { d: 1.02, ch: 0.985 }, now: { brand: 1.01, rep: 2, morale: 1 }, text: 'Hundreds took part and many joined for good.' },
    lose: { now: { rep: -1 }, text: 'Few entered and the event fizzled.' } },
  { id: 'fitness_app', name: 'Member app with check-in data', blurb: 'An app that tracks visits can show you who has stopped coming, so that you can message them before they quit.', k: 1.4, months: 8, success: 60,
    win: { eff: { ch: 0.94, d: 1.01 }, monthly: 0.3, now: { rep: 1 }, text: 'You spot members who are drifting away and message them in time. Fewer cancel.' },
    lose: { now: { morale: -1, rep: -1 }, text: 'The app was buggy and members deleted it.' } },
  { id: 'fitness_bootcamp', name: 'Seasonal outdoor boot camps', blurb: 'Run summer classes in a nearby park, when indoor demand is lowest.', k: 0.5, months: 3, success: 75,
    win: { eff: { d: 1.02, c: 1.0 }, now: { rep: 1, morale: 1 }, text: 'Summer mornings in the park were a hit, and the quiet months got busier.' },
    lose: { now: { morale: -1 }, text: 'It rained, and hardly anyone came.' } },
  { id: 'fitness_referral', name: 'Referral-a-friend month', blurb: 'For one month, members who bring a friend get a reward. Friends who join through a friend tend to stay.', k: 0.5, months: 2, success: 80,
    win: { eff: { d: 1.025, ch: 0.985 }, now: { rep: 1 }, text: 'Members brought plenty of friends and most of them stayed.' },
    lose: { now: { rep: -1 }, text: 'Few members bothered, and the rewards were wasted.' } },
  { id: 'fitness_kit', name: 'Sell branded kit', blurb: 'Gym t-shirts, bottles and towels make people walk billboards for you, and unsold stock ties up cash.', k: 0.4, months: 4, success: 70,
    win: { eff: { d: 1.012 }, monthly: -0.3, now: { brand: 1.01 }, text: 'Members wear your logo everywhere, and the shop pays for itself.' },
    lose: { now: { morale: -1 }, text: 'Boxes of unsold hoodies are gathering dust.' } },
];
