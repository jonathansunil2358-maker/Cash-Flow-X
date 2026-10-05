import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Hotel. Every id must start with "hotel_" (policies and initiatives) or "e9_hotel_" (events). */
export const policies: PolicyDef[] = [
  { id: 'hotel_dynamic_rates', group: 'customers', name: 'Dynamic room rates', blurb: 'Dynamic pricing means changing the room rate with the season and with demand: dear on festival weekends, cheap on dead Tuesdays in January.', options: [
    off,
    opt('Seasonal rate card', 'Four fixed price bands through the year. Simple, and it catches the obvious peaks.', { d: 1.01 }, 0.15),
    opt('Daily yield pricing', 'Prices move every day with bookings and local events. It squeezes more from busy nights, but guests who see the price jump feel cheated.', { d: 1.025, rep: -0.03 }, 0.5, 0.2)] },

  { id: 'hotel_ota_commission', group: 'customers', name: 'Booking-site commissions', blurb: 'An online travel agent (OTA) is a big booking website that fills your rooms but keeps a commission, often 15 to 20% of the price.', options: [
    off,
    opt('Lean on the big sites', 'List every room on every booking site. Rooms fill fast, but commission eats the margin.', { d: 1.03, c: 1.015 }, 0.4),
    opt('Direct-booking discount', 'Offer a cheaper rate and free breakfast on your own website. Fewer commissions, but fewer total bookings in the quiet months.', { c: 0.985, d: 0.99 }, 0.3, 0.15)] },

  { id: 'hotel_housekeeping', group: 'ops', name: 'Housekeeping turnaround', blurb: 'Room turnaround is how fast a room is cleaned and ready for the next guest. Faster means more rooms sold on a busy day.', options: [
    off,
    opt('Tight cleaning schedule', 'Set cleaning times per room and reward staff who hit them. More rooms ready by check-in, but cleaners feel rushed.', { cap: 1.03, m: -0.3 }, 0.1),
    opt('Cleaning crew bonus', 'Pay cleaners a per-room bonus. Rooms turn quicker and morale holds, but wages climb.', { cap: 1.04, m: 0.2 }, 0.7)] },

  { id: 'hotel_overbooking', group: 'customers', name: 'Overbooking policy', blurb: 'Overbooking means selling more rooms than you have, betting that some guests will not show up. If everyone arrives, you must find the extra guests a room elsewhere and pay compensation.', options: [
    off,
    opt('Overbook a little', 'Sell a few extra rooms on busy nights. Fewer empty rooms, but sometimes you get it wrong.', { d: 1.015, risk: [8, 1.5, 'Too many guests turned up and you paid for rooms at a rival hotel.'] }, 0.05),
    opt('Overbook boldly', 'Sell plenty of extra rooms. Occupancy is higher, but walked guests are angry and write reviews.', { d: 1.03, rep: -0.04, risk: [14, 3, 'A fully booked night left several guests without rooms, and you paid compensation.'] }, 0.1)] },

  { id: 'hotel_breakfast', group: 'ops', name: 'Breakfast quality and cost', blurb: 'Breakfast is the meal guests remember most. Fresh local food delights them but costs a lot, and what is not eaten is thrown away.', options: [
    off,
    opt('Cold buffet', 'Cereal, pastries and fruit. Cheap and easy, nobody raves about it.', { c: 0.99, q: -0.02 }, 0),
    opt('Cooked local breakfast', 'Eggs, bacon and bread from nearby producers. Reviewers love it, and the food bill climbs.', { q: 0.05, rep: 0.04, c: 1.015 }, 0.5)] },

  { id: 'hotel_energy', group: 'ops', name: 'Heating and pool energy', blurb: 'Heating rooms and warming a pool are some of the biggest bills a hotel has. Cutting waste saves money, but guests notice a chilly lobby.', options: [
    off,
    opt('Smart room sensors', 'Rooms heat down automatically when empty. Cuts the energy bill with little effect on guests.', { c: 0.985 }, 0.3, 0.3),
    opt('Turn the thermostat down', 'Lower the heating everywhere. Big saving, but guests complain of cold rooms.', { c: 0.97, rep: -0.05, d: 0.99 }, 0)] },

  { id: 'hotel_loyalty', group: 'customers', name: 'Returning-guest scheme', blurb: 'A loyalty scheme gives guests perks for coming back, such as late checkout and a free drink. Returning guests are cheaper to win than new ones.', options: [
    off,
    opt('Free late checkout', 'Members leave at 2pm instead of 11am. Costs a little in cleaning time and brings repeat stays.', { d: 1.012, cap: 0.99 }, 0.1),
    opt('Points and free nights', 'Guests earn points towards free nights. Strong repeat business, but free nights are rooms you could have sold.', { d: 1.025 }, 0.9, 0.15)] },

  { id: 'hotel_staff_training', group: 'people', name: 'Staff turnover and training', blurb: 'Staff turnover means how often employees leave. Hotels lose many people every year, and each new hire needs weeks of training.', options: [
    off,
    opt('Induction weeks', 'Every new hire shadows an experienced colleague. Better service, and a little less stress for new staff.', { q: 0.03, hire: 0.95 }, 0.3),
    opt('Career ladder and pay rises', 'Clear promotion steps and yearly rises. Staff stay and guests notice, but the payroll grows.', { q: 0.05, m: 0.5, hire: 0.85 }, 1.0)] },

  { id: 'hotel_guest_insurance', group: 'finance', name: 'Guest injury insurance', blurb: 'Liability insurance pays if a guest is hurt on your premises, such as a slip on a wet pool deck. Without it you pay claims yourself.', options: [
    off,
    opt('Basic public liability', 'Covers ordinary claims at a modest premium.', { risk: [2, 2, 'A guest slipped on a wet floor and the claim came out of your pocket.'], c: 1.002 }, 0.25),
    opt('Full cover', 'Covers nearly everything, with a hefty premium every month.', { rep: 0.01 }, 0.8)] },

  { id: 'hotel_complaints', group: 'customers', name: 'Complaints and lost property', blurb: 'How you handle complaints decides whether a bad night becomes a bad review. Lost property is anything guests leave behind.', options: [
    off,
    opt('Duty manager on call', 'A manager deals with problems at once. Fewer bad reviews, and one more wage.', { rep: 0.04 }, 0.35),
    opt('Compensate fast', 'Staff may give a free night or voucher on the spot. Guests forgive, and the vouchers cost real rooms.', { rep: 0.07, d: 0.995 }, 0.7)] },

  { id: 'hotel_staff_housing', group: 'people', name: 'Seasonal staff housing', blurb: 'In summer you need extra staff, but they cannot afford local rent. Providing beds helps you hire, but it is another building to run.', options: [
    off,
    opt('Rent a shared house', 'A rented house for seasonal workers. Easier summer hiring, and some house disputes.', { hire: 0.85, m: 0.2 }, 0.4),
    opt('Staff accommodation block', 'Your own rooms for staff. Hiring is easy and staff stay, though the space could have been guest rooms.', { hire: 0.75, m: 0.4, cap: 0.97 }, 0.5, 0.3)] },
];

export const events: EvSpec[] = [
  { id: 'e9_hotel_festival', title: 'Local festival fills the town', icon: 'music', good: true, per: 1.5, cd: 12, story: 'A big music festival is coming to town and every bed within miles will be booked. You can raise your prices sharply, but guests remember who treated them fairly.', choices: [
    S('surge', 'Charge surge prices', 'Big takings, but angry guests.', '', { gamble: { p: 0.65, good: { d: E(1.06, 2), brand: 1.01 }, bad: { rep: -2, d: E(0.97, 2) }, goodText: 'Rooms sold out at double the usual rate.', badText: 'Guests posted screenshots of your prices online.' } }),
    S('fair', 'Modest festival uplift', 'Fair prices, steady bookings.', 'Rooms filled at a sensible premium and the regulars noticed.', { eff: { d: E(1.04, 2), rep: 1 } }),
    S('local', 'Keep prices for loyal guests', 'Goodwill, no windfall.', 'Your regulars were delighted not to be gouged.', { eff: { rep: 1, morale: 1 } })] },

  { id: 'e9_hotel_star_inspection', title: 'Star-rating inspection', icon: 'star', good: false, per: 1, cd: 36, story: 'An inspector from the tourist board arrives to award your hotel a star rating. More stars bring more guests, but they check the beds, the fire doors and even the towels.', choices: [
    S('prep', 'Spend a week preparing', 'A cost now, a better chance of a star.', '', { k: 0.03, gamble: { p: 0.8, good: { rep: 3, d: E(1.03, 6) }, bad: { rep: 0 }, goodText: 'You earned the star and bookings crept up.', badText: 'The inspector found a few small faults but no harm done.' } }),
    S('usual', 'Carry on as normal', 'Free and risky.', '', { gamble: { p: 0.5, good: { rep: 2, d: E(1.02, 4) }, bad: { rep: -3, d: E(0.97, 4) }, goodText: 'Everything held up and you kept your rating.', badText: 'A broken fire door cost you a star.' } }),
    S('refit', 'Refit rooms ahead of time', 'Expensive, but a steady result.', 'New carpets and fresh paint gave the inspector little to complain about.', { k: 0.07, eff: { rep: 2, quality: 1 } })] },

  { id: 'e9_hotel_wedding', title: 'Wedding party wants the whole hotel', icon: 'heart', good: true, per: 1, cd: 14, story: 'A couple wants to book every room for their wedding weekend. The money is great, but regular guests are turned away and your staff will work flat out.', choices: [
    S('full', 'Take the whole hotel', 'Big income, big strain.', '', { income: 0.2, gamble: { p: 0.65, good: { rep: 2 }, bad: { morale: -3, rep: -1 }, goodText: 'The photos looked wonderful and the guests posted glowing reviews.', badText: 'A drunken groomsman wrecked the bar and the staff were exhausted.' } }),
    S('half', 'Offer half the rooms', 'Smaller but safer.', 'Half the hotel stayed open to ordinary guests and the wedding party was thrilled.', { income: 0.1, eff: { rep: 1 } }),
    S('no', 'Decline the booking', 'Keep your regulars happy.', 'You politely declined and the regulars kept their rooms.')] },

  { id: 'e9_hotel_review_attack', title: 'Bad review goes viral', icon: 'camera', good: false, per: 1.5, cd: 14, story: 'A guest has posted a scathing review about a dirty room, and thousands of people are reading it. Review sites carry great weight with travellers choosing where to stay.', choices: [
    S('reply', 'Reply politely and fix it', 'Free, and shows you care.', '', { gamble: { p: 0.6, good: { rep: 1 }, bad: { rep: -2, d: E(0.97, 3) }, goodText: 'Readers admired your calm reply and the guest edited the review.', badText: 'The reply made things worse and the story spread.' } }),
    S('refund', 'Refund the guest and invite them back', 'Costs money, soothes things.', 'The guest took the refund and updated the review.', { k: 0.02, eff: { rep: 1 } }),
    S('ignore', 'Say nothing', 'Do nothing and hope.', 'The review sat at the top of your page for weeks.', { eff: { rep: -2, d: E(0.98, 3) } })] },

  { id: 'e9_hotel_tour_block', title: 'Tour operator wants a block booking', icon: 'parcel', good: true, per: 1.5, cd: 14, story: 'A coach tour company wants 20 rooms a night for the whole season, at a big discount. It is steady business, but you give up the chance to sell those rooms at full price.', choices: [
    S('all', 'Sign the whole block', 'Reliable bookings, low prices.', 'The coaches arrived like clockwork and kept your occupancy high.', { eff: { d: E(1.05, 6), c: E(1.01, 6) } }),
    S('part', 'Offer a smaller block', 'Less discount, less risk.', 'A smaller block filled the quiet midweek nights.', { eff: { d: E(1.025, 6) } }),
    S('pass', 'Say no', 'Keep rooms for full-price guests.', 'You kept your rooms free for guests paying more.')] },

  { id: 'e9_hotel_boiler', title: 'Boiler breaks in winter', icon: 'flame', good: false, per: 1, cd: 24, story: 'On a freezing night the boiler dies and half the rooms have no hot water. Guests are complaining and the repair will not be cheap.', choices: [
    S('repair', 'Emergency repair', 'Quick and expensive.', 'An engineer came out at night and the heating was back by morning.', { k: 0.06, eff: { morale: -1 } }),
    S('discount', 'Offer discounts and wait for a cheaper fix', 'Cheaper, but guests suffer.', '', { k: 0.02, gamble: { p: 0.55, good: { rep: 0 }, bad: { rep: -3, d: E(0.96, 2) }, goodText: 'Guests accepted the discount and stayed.', badText: 'Guests left in the night and gave you one-star reviews.' } }),
    S('replace', 'Replace the whole system', 'A big bill for lower running costs.', 'A new boiler cost a lot but your gas bills fell.', { k: 0.1, eff: { c: E(0.985, 12), morale: 1 } })] },

  { id: 'e9_hotel_guest_injury', title: 'Guest slips by the pool', icon: 'shield', good: false, per: 1, cd: 24, story: 'A guest has slipped on a wet tile near the pool and hurt their wrist. They are talking about a claim, and your insurer wants to know what you did to prevent it.', choices: [
    S('insurer', 'Hand it to the insurer', 'The insurer pays, but premiums rise.', 'The insurer settled the claim and then raised your premium.', { k: 0.02, eff: { c: E(1.01, 8) } }),
    S('settle', 'Settle privately and fix the tiles', 'Costs now, keeps your record clean.', 'You paid for the guest and replaced the slippery tiles.', { k: 0.05, eff: { rep: 1 } }),
    S('fight', 'Fight the claim', 'Free but risky.', '', { gamble: { p: 0.45, good: { rep: 0 }, bad: { rep: -3, morale: -1 }, goodText: 'The claim was dropped.', badText: 'A court sided with the guest and the news reached the local paper.' } })] },

  { id: 'e9_hotel_corporate', title: 'Corporate account negotiation', icon: 'chart', good: true, per: 1.5, cd: 16, story: 'A big company wants a negotiated rate for all its travelling staff. They will fill rooms every Tuesday to Thursday, but they want a deep discount and will pay 60 days after the invoice.', choices: [
    S('sign', 'Accept their terms', 'Steady rooms, slow payment.', 'Business travellers filled your midweek nights, though the invoices were slow to arrive.', { eff: { d: E(1.04, 8), c: E(1.01, 8) } }),
    S('haggle', 'Haggle for a better rate', 'A gamble on how much they need you.', '', { gamble: { p: 0.55, good: { d: E(1.05, 8) }, bad: { d: E(1.0, 1), rep: -1 }, goodText: 'They agreed to a better rate and you gained steady business.', badText: 'They walked away and told colleagues you were hard to work with.' } }),
    S('refuse', 'Keep to your public rates', 'No new business.', 'You kept your rates and your cashflow clean.')] },
];

export const projects: InitiativeDef[] = [
  { id: 'hotel_restaurant_bar', name: 'Restaurant and bar in the hotel', k: 2, months: 8, success: 60,
    blurb: 'A restaurant and bar keep guests spending in the building and bring in locals too. The kitchen is costly and food spoils fast, so it only works if it is busy.',
    win: { eff: { d: 1.03 }, monthly: 0.3, now: { rep: 1 }, text: 'Locals and guests fill the dining room, and the bar earns on every evening.' },
    lose: { now: { morale: -2, rep: -1 }, text: 'The restaurant lost money every month and was closed after a year.' } },

  { id: 'hotel_conference_hire', name: 'Conference room hire', k: 1, months: 5, success: 65,
    blurb: 'Rent your function room by the day to firms for meetings. It fills quiet midweek days and sells lunch and coffee on top.',
    win: { eff: { d: 1.02 }, monthly: 0.2, text: 'Local firms book your meeting room every week.' },
    lose: { now: { morale: -1 }, text: 'Few firms booked and the projector kept failing.' } },

  { id: 'hotel_floor_renovation', name: 'Renovate a floor at a time', k: 2.5, months: 6, success: 75,
    blurb: 'Renovating a floor means closing its rooms while builders work. You lose some sales now, but the rooms earn higher rates and better reviews afterwards.',
    win: { eff: { d: 1.03, c: 0.99 }, now: { quality: 2, rep: 1 }, text: 'The refitted rooms look stunning and guests pay more to stay in them.' },
    lose: { now: { d: E(0.96, 4), morale: -2, rep: -1 }, text: 'Building work overran, and guests complained about the noise.' } },

  { id: 'hotel_franchise', name: 'Franchise your hotel brand', k: 1.5, months: 14, success: 45,
    blurb: 'Franchising means letting other owners run hotels under your name for a fee. You earn without owning the buildings, but a poor franchisee can damage your reputation.',
    win: { eff: { d: 1.03 }, monthly: 0.5, now: { brand: 1.04 }, text: 'Franchisees opened under your name and send you royalties every month.' },
    lose: { now: { rep: -3, morale: -2 }, text: 'A franchisee ran a shabby hotel under your name and customers blamed you.' } },

  { id: 'hotel_spa_addon', name: 'Spa add-on packages', k: 1.2, months: 6, success: 65,
    blurb: 'Sell treatments and a pool pass with rooms. Guests pay extra and often stay longer, but a spa needs trained staff and costly equipment.',
    win: { eff: { d: 1.02 }, monthly: 0.25, now: { rep: 1 }, text: 'Spa packages sell well to couples and weekend guests.' },
    lose: { now: { morale: -1, rep: -1 }, text: 'The spa was quiet and treatment rooms sat empty.' } },
];
