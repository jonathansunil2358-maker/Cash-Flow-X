import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Bakery chain. Everything here is only available to that sector. Every id must start with "bakery_" (policies and initiatives) or "e9_bakery_" (events). */
export const policies: PolicyDef[] = [
  { id: 'bakery_early_shift', group: 'people', name: 'Early-morning shifts', blurb: 'Bakers start in the small hours so bread is warm when commuters walk past at 6am. Unsocial hours cost extra wages, and tired bakers make mistakes.', options: [
    off,
    opt('Start at 4am', 'Fresh bread for the early commuter trade. Wages rise a little and the team is tired.', { cap: 1.03, d: 1.015, m: -0.2 }, 0.5),
    opt('Start at 2am, shop open at 5:30', 'Win the earliest trade and bake more before the day starts. A big wage premium and a worn-out team.', { cap: 1.05, d: 1.03, m: -0.5, risk: [5, 2, 'An exhausted baker burned a whole batch of loaves.'] }, 1.1)] },

  { id: 'bakery_sourdough', group: 'ops', name: 'Signature sourdough', blurb: 'Sourdough is bread raised by a living yeast culture instead of packet yeast. It needs days to prove (rise slowly), so it ties up space and planning, but shoppers pay more for it.', options: [
    off,
    opt('Weekend sourdough', 'A small batch of slow-proved loaves at weekends. A nice treat, not much disruption.', { d: 1.01, q: 0.02, cap: 0.99 }, 0.15),
    opt('Daily signature loaf', 'Slow-proved sourdough every day becomes your name. It builds quality and fame, but fills your racks for days and a weak starter ruins a batch.', { d: 1.025, q: 0.04, cap: 0.97, risk: [4, 2, 'The sourdough starter went wrong and a whole bake was binned.'] }, 0.4, 0.3)] },

  { id: 'bakery_donate_unsold', group: 'customers', name: 'Donate unsold bread', blurb: 'Instead of binning leftovers at closing time, give them to a food bank or shelter. It costs you the chance of a late sale, but neighbours notice.', options: [
    off,
    opt('Give to a food bank', 'A van collects leftovers each evening. Goodwill and happier staff, and you give up a few discounted late sales.', { rep: 0.04, m: 0.2, d: 0.998 }, 0.1),
    opt('Community give-away shelf', 'A free shelf outside the shop at closing. Great local love, but some shoppers wait for it instead of buying.', { rep: 0.07, m: 0.3, d: 0.99 }, 0.2)] },

  { id: 'bakery_coffee_corner', group: 'customers', name: 'Coffee corner', blurb: 'Coffee has a huge mark-up, so a few seats and an espresso machine lift how much each visit is worth. A coffee corner also needs staff and space.', options: [
    off,
    opt('Takeaway coffee', 'A machine at the counter. Easy extra spend per visit, a little more queueing.', { d: 1.015, cap: 0.985 }, 0.3, 0.3),
    opt('Café seating', 'A proper corner with a barista. People stay and spend more, but tables take floor space and staff time.', { d: 1.035, rep: 0.02, cap: 0.97 }, 0.8, 0.6)] },

  { id: 'bakery_seasonal_bakes', group: 'ops', name: 'Seasonal bakes', blurb: 'Hot cross buns at Easter, mince pies at Christmas, simnel cakes in spring. Festival treats pull in crowds, but you bake them only for a few weeks and leftovers are worth nothing.', options: [
    off,
    opt('Main festivals', 'Easter and Christmas ranges only. Sensible stock, steady demand.', { d: 1.012, c: 1.004 }, 0.15),
    opt('Every festival', 'A new limited bake every month. Lots of buzz, but short runs, extra ingredients and more waste.', { d: 1.03, c: 1.012, risk: [6, 1.5, 'A seasonal line flopped and the stock went in the bin.'] }, 0.4)] },

  { id: 'bakery_bike_couriers', group: 'ops', name: 'Bike-courier delivery', blurb: 'Couriers on bikes bring warm bread to offices and homes. It widens your reach beyond walking distance, but each delivery is extra labour and the bread cools on the way.', stock: true, options: [
    off,
    opt('Lunchtime office runs', 'A couple of riders at midday. Office workers order more, and the delivery bill is modest.', { d: 1.015, cap: 0.99 }, 0.4),
    opt('All-day courier service', 'Anyone within five miles can order. Many more orders, but riders cost money and the occasional crushed box earns a bad review.', { d: 1.04, rep: -0.02, risk: [5, 1.5, 'A courier dropped a box of cakes and a customer complained.'] }, 1.0, 0.3)] },

  { id: 'bakery_day_old_discount', group: 'ops', name: 'Day-old discount rules', blurb: 'Bread goes stale fast. A discount on yesterday\'s bakes turns waste into small sales, but too much discount teaches shoppers to wait for it.', stock: true, options: [
    off,
    opt('Half price after 5pm', 'Sell leftovers cheaply at closing. Less waste, a few regulars time their visits.', { c: 0.99, d: 0.995 }),
    opt('Day-old rack all day', 'A permanent bargain rack. Almost nothing is binned, but many shoppers swap fresh for cheap.', { c: 0.98, d: 0.975, rep: -0.02 })] },

  { id: 'bakery_loaf_box', group: 'customers', name: 'Subscription loaf boxes', blurb: 'A subscription means customers pay a regular fee for a regular delivery. A weekly loaf box gives steady, predictable orders you can bake against, though you must deliver whether it suits you or not.', stock: true, options: [
    off,
    opt('Weekly loaf box', 'Fresh bread each Saturday. Regulars stay loyal and you bake to a known number.', { ch: 0.97, d: 1.01, cap: 0.99 }, 0.3, 0.4),
    opt('Bread and pastry plan', 'A bigger box with a choice of bakes. Loyal subscribers and little waste, but packing and delivery eat time.', { ch: 0.95, d: 1.02, cap: 0.97, c: 1.005 }, 0.7, 0.6)] },

  { id: 'bakery_oven_service', group: 'ops', name: 'Oven maintenance contract', blurb: 'Your ovens are the heart of the bakery. A service contract means an engineer inspects them on a schedule and fixes faults fast. With it off, you only call someone when an oven breaks, at emergency rates.', options: [
    off,
    opt('Annual service visit', 'An engineer checks the ovens once a year. Fewer breakdowns than fixing only when they fail, for a modest fee.', { cap: 1.01 }, 0.2),
    opt('Full cover contract', 'Regular visits and a guaranteed rapid callout. Expensive, but the ovens almost never let you down and run at their best.', { cap: 1.02, q: 0.01 }, 0.5)] },

  { id: 'bakery_packaging', group: 'customers', name: 'Branded packaging', blurb: 'Paper bags, boxes and ribbon with your logo. Branding is how people recognise and remember you, and a good box is walking advertising, but packaging adds to the cost of every sale.', options: [
    off,
    opt('Printed paper bags', 'Your logo on every bag. Cheap, and people see it around town.', { d: 1.01, c: 1.01 }, 0.1),
    opt('Premium gift boxes', 'Sturdy boxes with ribbon. Good for gifts and cake orders and it lifts your name, but the price per sale rises noticeably.', { d: 1.02, c: 1.025, rep: 0.03 }, 0.3)] },

  { id: 'bakery_apprentices', group: 'people', name: 'Baker apprenticeships', blurb: 'An apprentice learns the trade on the job while studying part-time. They cost less than a qualified baker and often stay loyal, but you spend time teaching them.', options: [
    off,
    opt('Take two apprentices', 'Cheaper recruitment and a pipeline of home-grown bakers. Seniors lose a little time teaching.', { hire: 0.85, cap: 0.99, m: 0.2 }, 0.2),
    opt('Run a full academy', 'A proper training scheme with a college partner. Skilled, loyal bakers and better bread, but real money up front and slower output while they learn.', { hire: 0.75, q: 0.03, m: 0.4, cap: 0.97 }, 0.5, 0.5)] },
];

export const events: EvSpec[] = [
  { id: 'e9_bakery_flour_spike', title: 'Flour and butter prices spike', icon: 'chart', good: false, per: 1.5, cd: 14, story: 'A poor wheat harvest and a butter shortage have pushed up the price of your two biggest ingredients. Your supplier is warning of higher bills for months.', choices: [
    S('hedge', 'Lock in a six-month supply deal', 'Pay a premium now to fix prices later.', 'You fixed your price, a touch above what flour cost before the spike, and slept better.', { k: 0.03, eff: { c: E(1.015, 6) } }),
    S('pass', 'Raise prices a little', 'Customers pay, but some grumble.', 'Most shoppers shrugged at the extra few pence, and a few drifted away.', { eff: { c: E(1.04, 4), d: E(0.985, 4) } }),
    S('absorb', 'Absorb the cost and hope it passes', 'Free now, but margins shrink.', '', { gamble: { p: 0.45, good: { c: E(1.01, 3) }, bad: { c: E(1.07, 6) }, goodText: 'Prices eased within weeks and the hit was small.', badText: 'Prices stayed high for months and bit deep into your margins.' } })] },

  { id: 'e9_bakery_wedding_cake', title: 'A wedding-cake order with a deposit', icon: 'star', good: true, per: 1.2, cd: 14, story: 'A couple wants a four-tier wedding cake and a dessert table for 120 guests. A deposit means they pay part of the price in advance to lock in the date. It is lovely money, but a ruined cake would be remembered.', choices: [
    S('full', 'Take the full order', 'Big income, big pressure on the pastry team.', '', { income: 0.15, gamble: { p: 0.7, good: { rep: 2, brand: E(1.02, 1)[0] }, bad: { rep: -2, morale: -2 }, goodText: 'The cake was a showstopper and guests asked for your card.', badText: 'The tiers wobbled during delivery and the couple were furious.' } }),
    S('simple', 'Offer a simpler cake', 'Lower income, much lower risk.', 'A neat two-tier cake went down perfectly and everyone was happy.', { income: 0.06, eff: { rep: 1 } }),
    S('decline', 'Decline: the date clashes with Christmas orders', 'Protect your normal trade.', 'You said no politely and kept the shop running smoothly.')] },

  { id: 'e9_bakery_school_lunch', title: 'School-lunch contract tender', icon: 'parcel', good: true, per: 1, cd: 18, story: 'The local council is looking for a baker to supply rolls and fruit buns to six primary schools. A tender is a competition where firms submit their best price. It is steady work, but councils squeeze prices and pay slowly.', choices: [
    S('bid', 'Bid sharp for the whole contract', 'Big steady orders, thin margins.', '', { k: 0.02, gamble: { p: 0.55, good: { d: E(1.04, 8) }, bad: { c: E(1.02, 4) }, goodText: 'You won, and the school rolls kept the ovens busy every morning.', badText: 'You won on a razor-thin price, and rising costs ate the profit.' } }),
    S('half', 'Bid for two schools only', 'Smaller, safer and still useful.', 'You won two schools and a steady stream of small, reliable orders.', { k: 0.01, eff: { d: E(1.015, 8) } }),
    S('pass', 'Skip the tender', 'Focus on the shops.', 'You stayed focused on your own customers.')] },

  { id: 'e9_bakery_rent_review', title: 'Landlord proposes a rent review', icon: 'key', good: false, per: 1.3, cd: 20, story: 'Your high-street landlord says the street has become fashionable and wants a rent rise. Footfall (people walking past) has grown, but so has the bill. A good spot matters for a shop that lives on passing trade.', choices: [
    S('pay', 'Accept the new rent', 'Keep the prime spot at a higher cost.', 'You paid up. The shop stayed on the corner everyone walks past.', { eff: { c: E(1.015, 12) } }),
    S('negotiate', 'Negotiate a longer lease', 'Costs legal fees, softens the rise.', 'You swapped a longer lease for a smaller rise.', { k: 0.02, eff: { c: E(1.005, 12) } }),
    S('move', 'Move to a cheaper side street', 'Rent falls, footfall falls with it.', '', { k: 0.04, gamble: { p: 0.5, good: { c: E(0.985, 12) }, bad: { d: E(0.95, 6) }, goodText: 'Regulars followed you and the lower rent helped.', badText: 'Passing trade vanished and your regulars struggled to find you.' } })] },

  { id: 'e9_bakery_bake_off', title: 'Regional bake-off invitation', icon: 'camera', good: true, per: 1.2, cd: 16, story: 'Organisers of a televised regional bake-off have invited your head baker to compete. A win would make you the talk of the county, but the baker will be away from the ovens for days.', choices: [
    S('enter', 'Enter with your best baker', 'Fame if it goes well, a gap in the kitchen if not.', '', { k: 0.02, gamble: { p: 0.5, good: { rep: 3, brand: 1.04 }, bad: { rep: -1, quality: -1 }, goodText: 'Your sourdough took the gold and queues formed down the street.', badText: 'You were knocked out in round one and the kitchen missed its baker.' } }),
    S('junior', 'Send a promising junior', 'Cheaper, less likely to win.', 'The junior learned lots and brought home a certificate.', { eff: { quality: 1, morale: 1 } }),
    S('skip', 'Politely decline', 'No cost, no glory.', 'You kept your head baker where the bread was.')] },

  { id: 'e9_bakery_supermarket', title: 'Supermarket wants your bread', icon: 'parcel', good: true, per: 1, cd: 20, story: 'A supermarket chain wants to stock your bread in 40 stores. The volume is huge, but buyers drive hard bargains, pay late and can drop you at short notice.', choices: [
    S('accept', 'Accept their price', 'Big volume, thin margin.', '', { gamble: { p: 0.5, good: { d: E(1.05, 6), brand: 1.02 }, bad: { c: E(1.04, 6), morale: -1 }, goodText: 'The supermarket orders filled your ovens and spread your name.', badText: 'They cut their prices again, and your overtime bill grew.' } }),
    S('negotiate', 'Counter with a premium range', 'A better price for a smaller order.', 'They agreed to a smaller, better-paid deal for your premium loaves.', { k: 0.015, eff: { d: E(1.02, 6), c: E(1.005, 6) } }),
    S('walk', 'Walk away', 'Stay independent.', 'You kept your independence and your margins.')] },

  { id: 'e9_bakery_farmers_market', title: 'A pitch at the farmers\' market', icon: 'leaf', good: true, per: 1.5, cd: 12, story: 'A popular Saturday farmers\' market has a free pitch. A pop-up stall is a temporary stand that lets you test a crowd without a shop. It means early starts and a van full of fresh bread.', choices: [
    S('stall', 'Run a full stall', 'More sales and new faces, extra labour.', '', { k: 0.01, gamble: { p: 0.65, good: { d: E(1.03, 4), brand: 1.02 }, bad: { morale: -2 }, goodText: 'Shoppers loved the warm loaves and many followed you to the shop.', badText: 'Rain kept shoppers away and the leftovers went to waste.' } }),
    S('small', 'Take a small table of best sellers', 'Cheap and low risk.', 'A modest table of pastries covered its cost and won a few regulars.', { eff: { d: E(1.01, 3) } }),
    S('pass', 'Pass this time', 'Keep weekends for the shops.', 'You gave the pitch to someone else.')] },

  { id: 'e9_bakery_recipe_theft', title: 'Former baker takes your recipes', icon: 'shield', good: false, per: 1, cd: 30, story: 'A baker who left last month has opened a shop across town selling suspiciously familiar sourdough and your signature pastries. Your recipes were in their head, and a notebook has gone missing.', choices: [
    S('sue', 'Take legal action', 'Costs money, may stop the copying.', '', { k: 0.05, gamble: { p: 0.55, good: { rep: 1, quality: 1 }, bad: { d: E(0.98, 4) }, goodText: 'The court ordered them to stop and others got the message.', badText: 'It dragged on and customers saw the bad blood in the papers.' } }),
    S('innovate', 'Out-bake them with new recipes', 'Cheap and positive.', 'You launched fresh recipes, leaving the copycat a step behind.', { k: 0.02, eff: { quality: 1, d: E(1.01, 4) } }),
    S('ignore', 'Ignore it', 'Free, but rivals take notice.', 'You shrugged. A few regulars wandered to the copycat.', { eff: { d: E(0.98, 5) } })] },

  { id: 'e9_bakery_oven_failure', title: 'The big oven dies at 4am', icon: 'flame', good: false, per: 1, cd: 24, story: 'Your biggest deck oven has stopped heating, and the morning bake is due in an hour. Ovens are the limit on how much you can make, so every hour lost is bread nobody can buy.', choices: [
    S('emergency', 'Pay the emergency engineer', 'Costly, but fixed by lunchtime.', 'The engineer worked fast and the shop reopened with a late bake.', { k: 0.05, eff: { d: E(0.99, 1) } }),
    S('borrow', 'Borrow a neighbour\'s oven overnight', 'Cheap but chaotic.', '', { k: 0.01, gamble: { p: 0.55, good: {}, bad: { morale: -2, rep: -1 }, goodText: 'The loaves came out well and nobody noticed.', badText: 'The bake was patchy and the team was shattered.' } }),
    S('replace', 'Replace it with a modern oven', 'Big bill, better output after.', 'The new oven heats faster and uses less gas.', { k: 0.1, eff: { c: E(0.99, 12), morale: 1 } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'bakery_cafe_wholesale', name: 'Wholesale supply to cafes', k: 0.9, months: 5, success: 65,
    blurb: 'Wholesale means selling in bulk to other businesses, not to the public. Cafes buy bread and pastries at a discount but order the same thing every morning, so the ovens run predictably.',
    win: { eff: { d: 1.03, c: 0.99 }, monthly: 0.2, text: 'A dozen cafes now rely on your 5am delivery, and the steady orders fill the quiet hours.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Cafes haggled on price, paid late and two switched to a cheaper baker.' } },

  { id: 'bakery_allergen_free', name: 'Allergen-free range', k: 0.8, months: 6, success: 60,
    blurb: 'An allergen is an ingredient some people react badly to, like gluten or nuts. A separate gluten-free and vegan line wins a loyal crowd with few rivals, but it needs a separate prep area and strict cleaning.',
    win: { eff: { d: 1.02, ch: 0.98 }, now: { rep: 1, brand: 1.02 }, text: 'Families who could never buy from a bakery now come every week.' },
    lose: { now: { rep: -2, morale: -1 }, text: 'A cross-contamination scare forced you to scrap the range and apologise publicly.' } },

  { id: 'bakery_franchise', name: 'Franchise the bakery format', k: 2.2, months: 14, success: 45,
    blurb: 'A franchise lets other people open a shop under your name. They pay you fees and buy your dough, and you take little risk. In return you must write a manual, and a careless owner can hurt your brand.',
    win: { eff: { d: 1.04, cap: 1.03 }, monthly: 0.5, now: { brand: 1.04 }, text: 'Three franchisees opened with your recipes and your name appears in new towns.' },
    lose: { now: { rep: -3, morale: -2, brand: 0.97 }, text: 'A franchisee cut corners, got a bad hygiene rating and tarnished your brand.' } },

  { id: 'bakery_workshops', name: 'Cake-decorating workshops', k: 0.35, months: 3, success: 75,
    blurb: 'Teach evening classes in cake decorating. Classes fill the shop when it is closed and bring in people who may become cake customers.',
    win: { eff: { d: 1.01 }, monthly: 0.15, now: { brand: 1.01 }, text: 'Classes sold out for months, and students came back to order birthday cakes.' },
    lose: { now: { morale: -1 }, text: 'Few signed up and the pastry team resented the late nights.' } },

  { id: 'bakery_local_cert', name: 'Local-ingredient certification', k: 0.6, months: 8, success: 70,
    blurb: 'A certification is an official badge showing your flour, eggs and butter come from nearby farms. It proves your claims to shoppers, though local grain costs more and the audit takes time.',
    win: { eff: { d: 1.025, c: 1.01 }, now: { rep: 2, brand: 1.02 }, text: 'The badge on your window made a premium price feel fair.' },
    lose: { now: { rep: -1 }, text: 'You failed the audit on paperwork and the extra fees were wasted.' } },
];
