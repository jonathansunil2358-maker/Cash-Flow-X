import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Restaurant. Everything here is only available to that sector. Every id must start with "restaurant_" (policies and initiatives) or "e9_restaurant_" (events). */
export const policies: PolicyDef[] = [
  { id: 'restaurant_menu_engineering', group: 'ops', name: 'Menu engineering', blurb: 'Menu engineering means working out which dishes make you the most profit per plate, then pushing those and dropping the losers.', options: [
    off,
    opt('Highlight the winners', 'Star the high-profit dishes and give them the best spot on the menu. Costs a little to reprint and retrain.', { c: 0.99 }, 0.2),
    opt('Cut the menu hard', 'Drop the weak dishes completely. Cheaper food and less waste, but regulars miss their old favourites.', { c: 0.975, d: 0.99 }, 0.1)] },

  { id: 'restaurant_food_waste', group: 'ops', name: 'Food-waste tracking', blurb: 'Weigh what gets thrown away so you can see where money is going in the bin. Composting the rest cuts your bin collection costs.', options: [
    off,
    opt('Weigh the bins', 'Staff log what is binned each day. A bit of admin, and much less spoiled food.', { c: 0.985 }, 0.15),
    opt('Track and compost', 'Weighing plus a composting service. Bigger savings and a green image, but the service is not cheap and the kitchen needs training.', { c: 0.98, rep: 0.02 }, 0.35, 0.2)] },

  { id: 'restaurant_booking_deposit', group: 'customers', name: 'Reservation deposits', blurb: 'No-shows are guests who book a table and never turn up, leaving an empty seat you cannot resell. A deposit is money paid up front to hold the table.', options: [
    off,
    opt('Deposit for big groups', 'Only parties of six or more pay a deposit. Fewer empty tables, and a few big groups choose somewhere else.', { d: 1.01 }, 0.1),
    opt('Deposit for everyone', 'Every booking needs a deposit. Almost no no-shows, but some diners find it off-putting.', { d: 1.015, rep: -0.02 }, 0.25)] },

  { id: 'restaurant_seasonal_menu', group: 'ops', name: 'Seasonal menu', blurb: 'Cook with whatever is in season locally. Produce is cheapest and tastiest at its peak, but the menu keeps changing.', options: [
    off,
    opt('Seasonal specials', 'A small board of seasonal specials beside the usual menu. Modest savings.', { c: 0.992, q: 0.02 }, 0.15),
    opt('Fully seasonal menu', 'The whole menu follows local produce prices. Fresher food and lower costs, but the kitchen must keep re-learning dishes and prices can swing.', { c: 0.98, q: 0.04, risk: [6, 1.5, 'A bad harvest pushed up the price of your key ingredients.'] }, 0.4)] },

  { id: 'restaurant_happy_hour', group: 'customers', name: 'Happy-hour pricing', blurb: 'Lower prices at quiet times to fill empty seats. Seats earn nothing when empty, but discounts cut the money you make on each cover.', options: [
    off,
    opt('Early-bird deals', 'Cheaper menus before 6pm. Fills the early slots with little harm to busy times.', { d: 1.015 }, 0.6),
    opt('Daily happy hour', 'Discounts on drinks and starters every day. Lots more footfall, but some regulars wait for the deals and the pub-like crowd can put others off.', { d: 1.03, rep: -0.03 }, 1.2)] },

  { id: 'restaurant_wine_list', group: 'customers', name: 'Wine list and sommelier', blurb: 'A sommelier is a wine expert who advises guests. Wine carries a big mark-up, so a good list raises the average bill, but stock and expertise cost money.', options: [
    off,
    opt('Smart house wines', 'A short, well-chosen list. Easy margin with little extra cost.', { d: 1.008 }, 0.3),
    opt('Hire a sommelier', 'A real expert who guides guests to better bottles. The average bill rises and your name improves, but the salary and the cellar are expensive.', { d: 1.02, rep: 0.03 }, 1.4, 0.3)] },

  { id: 'restaurant_tip_pooling', group: 'people', name: 'Tip pooling rules', blurb: 'Tip pooling means sharing tips between everyone, not just the people who serve the tables. Rules about who gets what shape how fair the team feels.', options: [
    off,
    opt('Pool with the kitchen', 'Tips are shared with chefs and porters. The back of house feels valued, though waiting staff grumble a little.', { m: 0.3, q: 0.01 }, 0.1),
    opt('Keep tips with servers', 'Servers keep what they earn. Great for front-of-house service, but the kitchen feels left out.', { rep: 0.03, m: -0.3 }, 0)] },

  { id: 'restaurant_staff_meal', group: 'people', name: 'Staff meals', blurb: 'Feeding your team before a shift costs food, but hungry, happy staff work better and stay longer.', options: [
    off,
    opt('Simple family meal', 'A hot meal made from off-cuts and leftovers. Cheap, and it makes the kitchen feel like a family.', { m: 0.3 }, 0.3),
    opt('Full menu for staff', 'Staff eat whatever they like from the menu. Everyone loves it, and the food bill climbs.', { m: 0.6, c: 1.01 }, 0.7)] },
];

export const events: EvSpec[] = [
  { id: 'e9_restaurant_head_chef_leaves', title: 'Head chef walks out with the recipes', icon: 'flame', good: false, per: 1, cd: 30, story: 'Your head chef has been poached by a rival across town. They know every recipe, supplier and secret trick in your kitchen, and none of it is written down.', choices: [
    S('contract', 'Enforce the contract', 'Costs legal fees, but protects your recipes.', 'Your lawyer reminded the chef of their notice period and their promise to keep your recipes private.', { k: 0.03, eff: { quality: -1 } }),
    S('promote', 'Promote the sous chef', 'Free, a gamble on a rising star.', '', { gamble: { p: 0.6, good: { quality: 2, morale: 2 }, bad: { quality: -2, d: E(0.97, 3) }, goodText: 'The sous chef blossomed and the team cheered the promotion.', badText: 'The new head chef was not ready and dishes came out uneven.' } }),
    S('pay', 'Match the rival offer', 'Keeps the chef, at a price.', 'The chef stayed, a little richer and a lot more loyal.', { k: 0.05, eff: { morale: 1 } })] },

  { id: 'e9_restaurant_hygiene_inspection', title: 'Health inspector at the door', icon: 'shield', good: false, per: 1.5, cd: 20, story: 'An environmental health officer has arrived unannounced. They will give you a hygiene rating from 0 to 5, and it goes in your window for every passer-by to see.', choices: [
    S('deepclean', 'Deep clean every week from now on', 'A steady cost for a safe rating.', 'The kitchen sparkled. You earned a top rating and displayed it proudly.', { k: 0.03, eff: { rep: 2 } }),
    S('wing', 'Rely on the usual routine', 'Free, but you are rolling the dice.', '', { gamble: { p: 0.65, good: { rep: 1 }, bad: { rep: -3, d: E(0.97, 4) }, goodText: 'You passed with a good rating.', badText: 'You were marked down for a greasy extractor fan, and the low rating went in your window.' } }),
    S('retrain', 'Retrain the whole team', 'Costs a day of covers and lifts standards.', 'Everyone learned the rules, and the inspector noticed.', { k: 0.015, eff: { rep: 1, quality: 1 } })] },

  { id: 'e9_restaurant_delivery_apps', title: 'Delivery apps come knocking', icon: 'parcel', good: true, per: 1.5, cd: 24, story: 'A big delivery app offers to list your menu and bring you lots of extra orders. In return, it keeps a large slice of every order as commission, which is a fee based on sales.', choices: [
    S('join', 'Join on their terms', 'More orders, but a heavy fee on each.', 'Orders poured in, though the fees nibbled your margin on each box.', { eff: { d: E(1.04, 6), c: E(1.02, 6) } }),
    S('limited', 'List a cut-down menu only', 'Fewer orders, less fee drag.', 'You offered the dishes that travel well and kept the commission under control.', { k: 0.01, eff: { d: E(1.02, 6), c: E(1.005, 6) } }),
    S('own', 'Stay on your own', 'No fees, no extra orders.', 'You kept your own customers and your own margins.')] },

  { id: 'e9_restaurant_catering', title: 'Catering contracts on offer', icon: 'star', good: true, per: 1, cd: 18, story: 'An events planner and a local office both want regular catering from you, for weddings and staff lunches. It is steady money, but it pulls your chefs away from the restaurant.', choices: [
    S('both', 'Take both contracts', 'Big income, big strain on the kitchen.', '', { income: 0.2, gamble: { p: 0.6, good: { rep: 2 }, bad: { morale: -3, quality: -1 }, goodText: 'The weddings were a triumph and the offices rebooked.', badText: 'The kitchen was stretched thin and the dining room suffered.' } }),
    S('wedding', 'Weddings only', 'Smaller, steadier income.', 'Weddings paid well and showed off your cooking to a whole crowd of guests.', { income: 0.1, eff: { rep: 1 } }),
    S('pass', 'Politely decline', 'Keep your focus on the dining room.', 'You said thanks but no, and kept the restaurant running smoothly.')] },

  { id: 'e9_restaurant_kitchen_fire', title: 'Kitchen fire drill', icon: 'flame', good: false, per: 1, cd: 36, story: 'A pan of oil has caught light near the fryers. Nobody is hurt, but the fire service wants to know how prepared you really are, and the insurer is watching.', choices: [
    S('claim', 'Make an insurance claim', 'Insurance covers repairs, but premiums go up.', 'The insurer paid for the repairs and quietly raised your premiums.', { k: 0.02, eff: { c: E(1.01, 8), d: E(0.97, 2) } }),
    S('pay', 'Pay for the repairs yourself', 'Costs a lot, keeps your insurance record clean.', 'You paid out, reopened quickly and kept your clean record.', { k: 0.07, eff: { d: E(0.98, 1) } }),
    S('fixsafety', 'Fix repairs and fit a suppression system', 'A bigger bill now for a safer kitchen.', 'A fire suppression system now sits over the fryers, and the team feels safer.', { k: 0.09, eff: { morale: 2, rep: 1 } })] },

  { id: 'e9_restaurant_critic', title: 'The local food critic visits', icon: 'camera', good: true, per: 1.5, cd: 16, story: 'A well-known local food critic has been spotted at table four, pretending to be an ordinary diner. A single review can swing your bookings for a month.', choices: [
    S('best', 'Pull out all the stops', 'Free dessert and top service, costing food and time.', '', { k: 0.02, gamble: { p: 0.7, good: { rep: 3, d: E(1.04, 3) }, bad: { rep: -1 }, goodText: 'A glowing review brought queues to the door.', badText: 'The critic said it felt like a performance and was not fooled.' } }),
    S('normal', 'Treat them like any other guest', 'Honest and free, with an uncertain result.', '', { gamble: { p: 0.5, good: { rep: 2, d: E(1.02, 2) }, bad: { rep: -2, d: E(0.97, 2) }, goodText: 'The critic liked your honesty and said so.', badText: 'A busy night showed in the review, and not kindly.' } }),
    S('ignore', 'Do not bother', 'You hardly notice them. Whatever they write, they write.', 'The review turned out lukewarm, and nothing much changed.')] },

  { id: 'e9_restaurant_supplier_week', title: 'Supplier of the week deal', icon: 'leaf', good: true, per: 1.5, cd: 12, story: 'A local farm has a glut of produce and offers you a week-long special price, but you need to commit to volume. The food is lovely, and it will spoil if you do not use it.', choices: [
    S('bulk', 'Buy lots and plan around it', 'Big savings if you use it all.', '', { k: 0.02, gamble: { p: 0.65, good: { c: E(0.97, 3), quality: 1 }, bad: { c: E(1.02, 2) }, goodText: 'The menu sang with fresh farm produce and your costs fell.', badText: 'You overbought and a lot of it went off in the fridge.' } }),
    S('some', 'Buy a modest amount', 'A small saving, little risk.', 'You used the produce in this week\'s specials and saved a little.', { eff: { c: E(0.99, 2) } }),
    S('skip', 'Stick with your usual supplier', 'No change.', 'You stayed loyal to your regular deliveries.')] },

  { id: 'e9_restaurant_allergen_scare', title: 'Allergen scare', icon: 'shield', good: false, per: 1, cd: 30, story: 'A guest with a nut allergy had a reaction after eating one of your dishes. The label did not mention a sauce containing nuts. They are fine, but this is serious.', choices: [
    S('recall', 'Pull the dish and tell everyone', 'Honest and costly, protects trust.', 'You withdrew the dish, apologised publicly and rewrote the allergen labels. Guests trusted you for it.', { k: 0.04, eff: { rep: 1, quality: 1 } }),
    S('quiet', 'Quietly fix the label', 'Cheap now, risky if it comes out.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -4, d: E(0.95, 4) }, goodText: 'Nobody noticed the fix.', badText: 'The guest posted online and your cover-up made it worse.' } }),
    S('train', 'Retrain the team on allergens', 'A middle road with a proper fix.', 'Everyone learned the fourteen major allergens and the menu was checked line by line.', { k: 0.02, eff: { morale: 1, rep: -1 } })] },

  { id: 'e9_restaurant_cuisine_pivot', title: 'Cuisine trend shifts', icon: 'chart', good: false, per: 1, cd: 36, story: 'Your style of food is going out of fashion. Diners are queueing for a new trend two streets away, and your menu feels dated.', choices: [
    S('pivot', 'Pivot the menu', 'A full rethink, expensive and risky.', '', { k: 0.05, gamble: { p: 0.6, good: { d: E(1.05, 6), rep: 1 }, bad: { d: E(0.96, 4), morale: -2 }, goodText: 'The new menu hit just right and the tables filled.', badText: 'Regulars missed the old dishes and the new ones fell flat.' } }),
    S('fusion', 'Add a few trendy dishes', 'A cautious blend of old and new.', 'A handful of new dishes kept regulars happy and drew in a few curious faces.', { k: 0.015, eff: { d: E(1.015, 5) } }),
    S('hold', 'Stick to your guns', 'Free, and you hope trends come back.', 'You kept your classics and lost a few trend-chasers.', { eff: { d: E(0.98, 6) } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'restaurant_ghost_kitchen', name: 'Ghost kitchen for delivery', k: 1.2, months: 6, success: 60,
    blurb: 'A ghost kitchen is a cooking space with no dining room, serving delivery only. It has low rent and no front-of-house staff, but you need your own way to win orders.',
    win: { eff: { cap: 1.03, d: 1.02 }, text: 'The delivery-only kitchen found its customers and uses spare capacity well.' },
    lose: { now: { rep: -1, d: E(0.98, 3) }, text: 'Orders trickled in and the app fees ate the profit. You wound it down.' } },

  { id: 'restaurant_tablet_ordering', name: 'Tablet ordering for faster table turns', k: 0.8, months: 4, success: 75,
    blurb: 'Table turnover is how often a table is reused in an evening. Tablets let guests order and pay quickly so more covers fit through the door.',
    win: { eff: { cap: 1.04, d: 1.01 }, text: 'Tables turned faster and servers spent more time on guests, not on paperwork.' },
    lose: { now: { morale: -2, d: E(0.98, 2) }, text: 'The system crashed in a rush and some guests gave up and left.' } },

  { id: 'restaurant_second_branch', name: 'Open a second branch', k: 3, months: 12, success: 50,
    blurb: 'A second site means more covers, but you can no longer be there all the time. You must trust a manager to keep your standards.',
    win: { eff: { cap: 1.06, d: 1.04 }, now: { brand: 1.03 }, text: 'The second branch settled in under a manager you trust, and the name spread across town.' },
    lose: { now: { rep: -2, morale: -3 }, text: 'The new site never matched the original, and a manager you did not trust cost you money.' } },

  { id: 'restaurant_food_truck', name: 'Food truck to test a neighbourhood', k: 0.4, months: 3, success: 70,
    blurb: 'A food truck is a cheap way to test whether a neighbourhood likes your food before you sign a lease.',
    win: { eff: { d: 1.015 }, now: { brand: 1.02 }, text: 'The truck was a hit and showed a new area is hungry for your food.' },
    lose: { now: { morale: -1 }, text: 'The truck broke down twice and few people turned up.' } },

  { id: 'restaurant_dinner_club', name: 'Loyalty dinner club', k: 0.6, months: 5, success: 65,
    blurb: 'Members pay a small monthly fee for perks such as a free starter and priority bookings. It brings steady cash and repeat visits.',
    win: { eff: { d: 1.03, ch: 0.97 }, monthly: 0.2, text: 'The club filled up, and members came back time after time.' },
    lose: { now: { rep: -1 }, text: 'Few people joined and the perks cost more than the fees brought in.' } },

  { id: 'restaurant_private_dining', name: 'Private dining room', k: 1.5, months: 6, success: 65,
    blurb: 'Turn a spare room into a private space for birthdays and business dinners. Events pay a premium because guests pay for exclusivity and fixed menus.',
    win: { eff: { d: 1.02, c: 0.99 }, monthly: 0.3, now: { rep: 1 }, text: 'The room is booked most weekends at premium prices.' },
    lose: { now: { morale: -1, rep: -1 }, text: 'The room sat empty and the refurbishment never paid back.' } },

  { id: 'restaurant_cooking_class', name: 'Cooking classes on quiet evenings', k: 0.3, months: 3, success: 75,
    blurb: 'Fill quiet weekday evenings by teaching guests to cook your dishes. Classes earn money when the dining room is half empty.',
    win: { eff: { d: 1.01 }, monthly: 0.15, now: { brand: 1.01 }, text: 'Classes sold out, and some students came back for dinner.' },
    lose: { now: { morale: -1 }, text: 'Hardly anyone signed up and the chefs would rather have cooked.' } },

  { id: 'restaurant_signature_sauce', name: 'Signature sauce sold in shops', k: 0.9, months: 8, success: 55,
    blurb: 'Bottle your best sauce and sell it in local shops. It earns extra money and spreads your name, but needs packaging, labels and food-safety checks.',
    win: { eff: { d: 1.015 }, monthly: 0.3, now: { brand: 1.03 }, text: 'Shops stocked your sauce and diners now see your name on shelves.' },
    lose: { now: { rep: -1 }, text: 'Shops would not stock it and a batch had to be thrown away.' } },
];
