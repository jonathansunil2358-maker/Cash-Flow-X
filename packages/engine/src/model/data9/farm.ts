import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Sector topic: Farm and farm shop. Everything here is only available to that sector. Every id must start with "farm_" (policies and initiatives) or "e9_farm_" (events). */
export const policies: PolicyDef[] = [
  { id: 'farm_crop_mix', group: 'ops', name: 'Crop choices before planting', blurb: 'You decide in winter what goes in the ground, and then you wait months to find out if you chose well. A single crop is easy to grow but risky; a mix spreads the risk.', stock: true, options: [
    opt('Same crops as last year', 'Plant what you know. Predictable work and no surprises, good or bad.', {}),
    opt('Trendy high-value crops', 'Berries, herbs and speciality veg sell for far more per box. Fussier to grow, and a bad season can wipe out a whole field.', { d: 1.02, c: 1.01, q: 0.02, risk: [6, 3, 'A fussy high-value crop failed in one of your fields.'] }, 0.4),
    opt('Wide mix of hardy crops', 'Lots of different easy crops. Something always does well, but nothing earns a premium and the shop shelves look ordinary.', { c: 0.99, d: 0.99, risk: [3, 1, 'A glut of one hardy crop sold for pennies.'] }, 0.1)] },

  { id: 'farm_crop_insurance', group: 'finance', name: 'Crop insurance', blurb: 'Insurance means paying a small fee every month so that a company pays you if something awful happens, such as hail or flood. Farms are among the most weather-exposed businesses there are.', options: [
    opt('Go without', 'Save the premium and hope the weather behaves. One bad storm could take a big bite out of a year.', {}),
    opt('Basic hail and flood cover', 'Pays out for the worst storms, so your bank worries less. Premiums are a steady monthly cost, and small claims are not covered.', { od: 1.05, m: 0.1 }, 0.6),
    opt('Full yield guarantee', 'Pays if your harvest falls below a set level for any reason. Expensive, but it lets you sleep at night and your bank likes it.', { od: 1.1, m: 0.2 }, 1.3, 0.2)] },

  { id: 'farm_tractor_plan', group: 'finance', name: 'Tractor: buy, lease or hire in', blurb: 'A tractor is the biggest single machine on a farm. Buying one ties up lots of cash, renting it costs more over time, and a contractor does the job with their own kit.', options: [
    opt('Keep the old tractor', 'It works, mostly. The repair bills are small until the day they are not.', {}),
    opt('Lease a new one', 'A fixed monthly fee and a warranty. No big cash outlay, but you never own it.', { cap: 1.02, c: 1.003 }, 0.6),
    opt('Hire a contractor at harvest', 'A contractor arrives with huge machines and clears your fields in days. No capital tied up, but you pay a premium and wait your turn.', { cap: 1.03, c: 1.01, risk: [4, 1.5, 'The contractor was late and part of the crop was left in the field.'] }, 0.3)] },

  { id: 'farm_pickers', group: 'people', name: 'Seasonal pickers', blurb: 'Soft fruit and veg must be picked by hand at exactly the right moment. Seasonal workers arrive for a few months, so you can staff up for the harvest without carrying wages all year.', options: [
    opt('Core team only', 'Your regular team does everything. Steady wages but slow picking when the crop all ripens at once.', {}),
    opt('Hire local students', 'Easy to find and cheap to recruit, though inexperienced and many leave early.', { cap: 1.03, q: -0.01, hire: 0.9 }, 0.5),
    opt('Overseas picking gang', 'Fast, skilled pickers who can clear a field in a day. Needs housing, paperwork and travel costs, and any visa trouble leaves you short.', { cap: 1.05, m: 0.2, hire: 1.1, risk: [4, 2, 'Visa delays left you short of pickers and fruit rotted on the plants.'] }, 1.0, 0.3)] },

  { id: 'farm_organic', group: 'customers', name: 'Organic certification', blurb: 'Organic means growing without most chemical sprays and fertilisers, checked by an inspector. Customers pay more, but the land must go through a slow transition period where you pay organic costs and still sell at normal prices.', stock: true, options: [
    opt('Conventional farming', 'Use whatever works. Lower costs and higher yields.', {}),
    opt('Transition fields to organic', 'Years of lower yields and extra cost with no price premium yet. The reward comes later through a stronger name.', { c: 1.03, d: 0.99, rep: 0.04 }, 0.4, 0.3),
    opt('Fully certified organic', 'Inspector-approved. Shoppers pay a premium and restaurants love it, but yields are lower and pests are harder to fight.', { d: 1.04, c: 1.03, rep: 0.04, risk: [5, 2, 'A pest outbreak could not be sprayed away and cost you part of the crop.'] }, 0.9)] },

  { id: 'farm_shop_vs_wholesale', group: 'customers', name: 'Farm shop or wholesale', blurb: 'Selling in your own shop earns the full retail price, but needs staff, opening hours and customers who drive out to you. Wholesale means selling in bulk to someone else at a lower price, but it sells out the whole harvest.', stock: true, options: [
    opt('Mixed selling', 'A bit of shop, a bit of wholesale. Balanced and unremarkable.', {}),
    opt('Push the farm shop', 'Better displays and a shop team. Higher prices per box, but weekend footfall depends on the weather and the shop costs money to run.', { d: 1.025, ch: 0.99, rep: 0.02 }, 0.9),
    opt('Sell everything wholesale', 'Load the lorries and go. Sales are fast and certain, and the price per box is lower and the spoilage risk small.', { cap: 1.03, c: 0.99, d: 0.97, rep: -0.02 }, 0)] },

  { id: 'farm_irrigation', group: 'ops', name: 'Water and irrigation', blurb: 'Irrigation is bringing water to crops through pipes and sprinklers. Rainfall is free but unreliable; abstracting water from a river or borehole needs a licence and a pump bill.', options: [
    opt('Rely on rain', 'No water costs, and drought months hit the harvest hard.', {}),
    opt('Drip irrigation', 'Water goes straight to roots with little waste. The pipes and pump cost money to run.', { q: 0.02 }, 0.4, 0.4),
    opt('Reservoir and sprinklers', 'Store winter rainfall in a pond to use all summer. A large licensed investment, and neighbours sometimes complain.', { q: 0.03, cap: 1.02, rep: -0.01 }, 0.7, 0.9)] },

  { id: 'farm_rotation', group: 'ops', name: 'Crop rotation', blurb: 'Rotation means growing a different crop on each field each year. Soil gets tired when the same plant is grown on it year after year, and rotating beats pests and diseases without chemicals.', stock: true, options: [
    opt('Grow what pays best', 'Plant the money crop wherever you can. Great this year, and the soil and pests catch up with you later.', {}),
    opt('Three-year rotation', 'Every field has a rest and a legume crop that feeds the soil. Less of the best crop now, healthier fields for years.', { q: 0.02, c: 0.995, d: 0.99, risk: [3, 1, 'A wet autumn delayed the rotation and a field lay idle.'] }, 0.2),
    opt('Add grazing sheep', 'Sheep graze fields between crops and add fertiliser for free. A second livelihood that needs fences, vets and care.', { q: 0.03, c: 0.99, rep: 0.02 }, 0.7, 0.4)] },

  { id: 'farm_supermarket_terms', group: 'finance', name: 'Supermarket supply terms', blurb: 'A supermarket buys huge volumes but dictates the price, rejects any box that is not perfect, and pays slowly. Their rules are written to suit them, not you.', options: [
    opt('Sell only to the shop and locals', 'No big buyer to answer to, and no big sales.', {}),
    opt('Standard supermarket contract', 'Big guaranteed volumes. Prices are squeezed, rejected loads cost you, and payment takes weeks.', { cap: 1.03, d: 1.03, c: 1.01, od: 1.1, risk: [6, 2.5, 'The supermarket rejected a whole load as the wrong size.'] }, 0.5),
    opt('Premium local-range deal', 'The supermarket stocks your name on a shelf. Better price and a loyal following, but you must meet strict standards and audits.', { d: 1.03, rep: 0.03, c: 1.015, risk: [4, 2, 'A failed supermarket audit paused your orders.'] }, 0.8, 0.3)] },

  { id: 'farm_seed_contract', group: 'finance', name: 'Seed and feed supplier contracts', blurb: 'Seed, fertiliser and animal feed are your biggest bought-in costs. A contract fixes the price for the year, protecting you from price spikes and also from cheap months.', options: [
    opt('Buy at spot prices', 'Pay whatever the price is on the day. Cheap on average and sometimes painful.', {}),
    opt('One-year fixed price', 'Lock in the price now. You are safe from spikes, and you pay more if prices fall.', { c: 1.005, od: 1.05 }, 0.3),
    opt('Co-operative buying group', 'Join other farmers to buy in bulk, so you share bargaining power. Cheaper, though membership dues apply and you take the group\'s choice of seed.', { c: 0.985, q: -0.01 }, 0.3, 0.2)] },

  { id: 'farm_heritage', group: 'customers', name: 'Heritage breeds and varieties', blurb: 'Heritage means old traditional breeds of animal and varieties of vegetable. They taste better and win shoppers who care, but they grow slower and yield less than modern types.', stock: true, options: [
    opt('Modern high-yield types', 'Fast growing and plentiful. Customers do not notice or care.', {}),
    opt('A heritage range for the shop', 'A few special varieties and a rare-breed pig or two. A good story for the shop and better prices on those lines.', { d: 1.02, rep: 0.03, cap: 0.99 }, 0.5, 0.2),
    opt('Go fully heritage', 'Everything is rare and old, and customers pay a real premium. Smaller yields, slower breeding and a higher risk of disease in small flocks.', { d: 1.04, rep: 0.05, cap: 0.96, c: 1.03, risk: [4, 2, 'A rare-breed animal got ill and costly vet help was needed.'] }, 0.7, 0.3)] },
];

export const events: EvSpec[] = [
  { id: 'e9_farm_weather_yield', title: 'Wet spring, patchy harvest', icon: 'alert', good: false, per: 2, cd: 14, story: 'A cold wet spring means seeds went in late and some fields are waterlogged. Yield is how much you harvest from each field, and yours will be well down on last year.', choices: [
    S('replant', 'Re-drill the worst fields', 'Costs seed and labour, with a chance of rescue.', '', { k: 0.05, gamble: { p: 0.6, good: { quality: 1 }, bad: { c: E(1.04, 4), quality: -1 }, goodText: 'A late sowing in warm weather caught up nicely.', badText: 'The late crop was thin and cost more to bring in.' } }),
    S('buyin', 'Buy produce from another farm to fill orders', 'Keeps customers happy at a thinner margin.', 'You topped up your boxes with a neighbour\'s vegetables at a lower margin, and customers got what they ordered.', { eff: { c: E(1.03, 3) } }),
    S('shortfall', 'Tell customers there is a shortfall', 'Honest, free and some will go elsewhere.', 'Regular customers understood. Some wandered off to bigger shops.', { eff: { d: E(0.97, 3), rep: 1 } })] },

  { id: 'e9_farm_pest_outbreak', title: 'Pest outbreak in the polytunnels', icon: 'shield', good: false, per: 1.5, cd: 20, story: 'Aphids and blight have been spotted across the strawberry beds. A pest outbreak spreads in days, and how you fight it changes both costs and what your customers think of you.', choices: [
    S('spray', 'Spray the whole crop', 'Fast, reliable and costly.', 'The chemicals worked quickly and saved most of the harvest.', { k: 0.04, eff: { rep: -1, quality: 1 } }),
    S('bio', 'Release natural predators', 'Slower and greener, with a chance to fail.', '', { k: 0.025, gamble: { p: 0.6, good: { rep: 2, quality: 1 }, bad: { d: E(0.97, 3), quality: -1 }, goodText: 'Ladybirds and wasps cleaned the beds without chemicals, and you told the shop.', badText: 'The predators were too slow and the pest ruined a third of the crop.' } }),
    S('wait', 'Wait and see', 'Free, and you are gambling the whole crop.', '', { gamble: { p: 0.3, good: {}, bad: { d: E(0.94, 4), quality: -2, c: E(1.03, 3) }, goodText: 'The outbreak fizzled out on its own.', badText: 'The pests spread through the entire tunnel and wrecked the season.' } })] },

  { id: 'e9_farm_milk_price', title: 'The milk price falls through the floor', icon: 'chart', good: false, per: 1, cd: 24, story: 'The big dairies have cut the price they pay per litre, which is how most farms sell milk. Your dairy cows cost the same to feed whatever the price, so your margin has evaporated overnight.', choices: [
    S('direct', 'Sell milk direct from a vending machine', 'A small capital cost and a better price.', 'Locals loved fresh milk from a glass-door vending machine, and you kept the full price for it.', { k: 0.04, eff: { d: E(1.02, 6), rep: 1 } }),
    S('swallow', 'Absorb the loss and keep the contract', 'Free, and the squeeze lasts for months.', 'You stuck with the dairy and swallowed the lower price.', { eff: { c: E(1.03, 6) } }),
    S('cull', 'Sell part of the herd', 'Cuts feed bills and future income.', 'You sold off some cows, trimmed costs and cut next year\'s milk.', { income: 0.15, eff: { d: E(0.98, 6) } })] },

  { id: 'e9_farm_drought', title: 'Drought declared', icon: 'flame', good: false, per: 1, cd: 30, story: 'No rain for weeks, and the river is low. The water company has banned irrigation from rivers, and you have crops in the ground with nothing to drink.', choices: [
    S('borehole', 'Pay to drill an emergency borehole', 'A large one-off cost, and permanent water.', 'The borehole hit water. Pricey, but your crops survived and the farm has a safety net.', { k: 0.1, eff: { quality: 1, rep: 1 } }),
    S('triage', 'Water only the best fields', 'Save the valuable crops and lose the rest.', 'You picked winners and let the poorer fields go brown. The harvest shrank to the fields you saved.', { k: 0.02, eff: { d: E(0.97, 3), quality: -1 } }),
    S('pray', 'Hope for rain', 'Free, risky and a heavy loss if it never comes.', '', { gamble: { p: 0.35, good: { quality: 1 }, bad: { d: E(0.92, 5), quality: -2 }, goodText: 'The rain finally came and the crops were saved.', badText: 'The dry spell dragged on and the harvest was far below normal.' } })] },

  { id: 'e9_farm_tractor_breakdown', title: 'Tractor breaks down at harvest', icon: 'gear', good: false, per: 1.5, cd: 18, story: 'It is the busiest week of the year and the gearbox on your main tractor has gone. Every dry day lost is a day of crop at risk of rotting or being rained on.', choices: [
    S('rush', 'Pay for emergency parts and a mobile mechanic', 'Costly and quick.', 'A mechanic arrived the same day with the right part, and you lost only a morning.', { k: 0.06 }),
    S('rent', 'Hire a replacement tractor', 'Costs hire fees and keeps harvesting.', 'You hired a replacement and carried on with only a small delay.', { k: 0.035, eff: { c: E(1.01, 1) } }),
    S('borrow', 'Borrow a neighbour\'s tractor and promise a favour', 'Cheap now, and favours cost later.', '', { gamble: { p: 0.6, good: { morale: 1 }, bad: { d: E(0.96, 2), rep: -1 }, goodText: 'The neighbour came through and you returned the favour in the spring.', badText: 'The borrowed tractor was too small and half the field was left standing.' } })] },

  { id: 'e9_farm_restaurant_deal', title: 'Local restaurants want a supply deal', icon: 'coffee', good: true, per: 1.5, cd: 16, story: 'A group of three local restaurants want to put your farm name on their menus and buy produce every week. Restaurants pay well, expect perfection and often pay late.', choices: [
    S('exclusive', 'Sign an exclusive deal with all three', 'Big weekly orders with big expectations.', '', { income: 0.15, gamble: { p: 0.65, good: { rep: 2, d: E(1.03, 6) }, bad: { morale: -2, rep: -1 }, goodText: 'The restaurants put your farm name on the menu and diners came to see the farm.', badText: 'Deliveries were stretched and one restaurant complained loudly.' } }),
    S('one', 'Supply one restaurant on trial', 'Small and safe.', 'The chef loved your veg, and you built a steady relationship.', { income: 0.06, eff: { rep: 1 } }),
    S('pass', 'Decline and keep selling in the shop', 'No change.', 'You stayed focused on the shop and your regulars.')] },

  { id: 'e9_farm_school_tours', title: 'Schools ask for farm visits', icon: 'star', good: true, per: 1.5, cd: 14, story: 'Three local primary schools want to bring classes to see how food is grown. Children love it, parents tell friends, and the visits need insurance, a safe route round the farm and staff time.', choices: [
    S('formal', 'Run proper tours with a safety plan', 'Costs some time and insurance, gives lasting goodwill.', 'The tours ran smoothly. Parents came back with their families at weekends.', { k: 0.015, eff: { rep: 2, d: E(1.02, 4) } }),
    S('open', 'Open the gate with a quick walk-round', 'Cheap and a little risky.', '', { gamble: { p: 0.75, good: { rep: 1 }, bad: { rep: -2, morale: -1 }, goodText: 'The children loved the lambs and the teachers sent thank-you cards.', badText: 'A child got stung and parents complained about weak supervision.' } }),
    S('decline', 'Say sorry, too busy', 'Free, with no gain.', 'You said no politely, and harvest carried on.')] },

  { id: 'e9_farm_cold_store', title: 'Cold store compressor fails', icon: 'diamond', good: false, per: 1.5, cd: 24, story: 'The cold store keeps leafy greens, berries and meat fresh. Its compressor (the part that makes it cold) has failed, and stock worth thousands starts warming up in the dark.', choices: [
    S('replace', 'Buy a new compressor', 'A big bill that saves what is inside.', 'A new unit went in within a day and most of the stock was saved.', { k: 0.05, eff: { c: E(0.995, 2) } }),
    S('sellfast', 'Sell the stock off cheap this weekend', 'Recover some money, lose some margin.', 'You ran a weekend sale and turned most of the warm stock into cash.', { income: 0.06, eff: { d: E(0.98, 1) } }),
    S('patch', 'Patch the old unit and hope', 'Cheap and likely to fail again.', '', { k: 0.01, gamble: { p: 0.45, good: {}, bad: { c: E(1.04, 3), rep: -1 }, goodText: 'The patch held until the next service.', badText: 'It failed again overnight and a lot of produce spoiled.' } })] },

  { id: 'e9_farm_breeding_cycle', title: 'A bumper lambing season', icon: 'heart', good: true, per: 1.5, cd: 24, story: 'Livestock breeding runs on slow cycles: a ewe is pregnant for five months, and a lamb needs months more before it can be sold. This year has produced twins in many pens, and lambs are going to be ready all at once.', choices: [
    S('market', 'Sell at the spring lamb market', 'Quick income and a flooded market.', 'Prices were fair at the sale, though the market was crowded.', { income: 0.1, eff: { d: E(0.99, 2) } }),
    S('shop', 'Sell through the farm shop over the summer', 'Better price, slower income, extra work.', 'Shop customers happily paid for local lamb and you hung onto the full price.', { income: 0.08, eff: { rep: 1, d: E(1.01, 4) } }),
    S('breed', 'Keep the best ewe lambs to grow the flock', 'No income now, bigger flock later.', 'You kept the best ewe lambs and promised yourself a bigger flock next year.', { eff: { c: E(1.01, 4), quality: 1 } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'farm_pick_your_own', name: 'Pick-your-own weekends', k: 0.4, months: 4, success: 75,
    blurb: 'Families pay to pick strawberries, pumpkins or apples themselves. You save on harvest labour, and visitors spend in the shop and cafe, but it needs a car park, toilets and good weather.',
    win: { eff: { d: 1.02, cap: 1.02 }, monthly: 0.2, now: { brand: 1.02 }, text: 'Car parks were full all summer and pickers bought ice cream on the way out.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Rain washed out the first three weekends and the fruit rotted unpicked.' } },

  { id: 'farm_greenhouse', name: 'Build a greenhouse', k: 2, months: 8, success: 65,
    blurb: 'A greenhouse lets you grow tomatoes, salad and herbs almost all year round, even in winter when the fields are bare. Heating and construction are costly.',
    win: { eff: { d: 1.03, q: 0.03, c: 1.01 }, now: { quality: 1 }, text: 'Winter tomatoes sold at a premium and the shop stayed full when the fields were bare.' },
    lose: { now: { morale: -1, c: E(1.03, 4) }, text: 'The heating bills ate the profit and a storm cracked panels.' } },

  { id: 'farm_cheesemaking', name: 'Start a cheese dairy', k: 1.5, months: 9, success: 55,
    blurb: 'Turning milk into cheese is called adding value: a litre of milk sold to the dairies earns pennies, and the same litre as cheese earns pounds. It needs equipment, hygiene rules and many months of patient ageing.',
    win: { eff: { d: 1.02, c: 0.99 }, monthly: 0.35, now: { brand: 1.03 }, text: 'Your farmhouse cheese won a regional award and shops started to ask for it.' },
    lose: { now: { rep: -2, quality: -1 }, text: 'A batch failed a hygiene test and months of ageing went in the bin.' } },

  { id: 'farm_stay_cottages', name: 'Holiday cottages on the farm', k: 2.5, months: 12, success: 60,
    blurb: 'A farm-stay turns old barns into cottages that holiday guests rent. It brings in steady rent, and guests buy at the farm shop, but you become a hotelier as well as a farmer.',
    win: { eff: { d: 1.02, rep: 0.02 }, monthly: 0.4, now: { brand: 1.02 }, text: 'The cottages filled all summer and guests bought boxes to take home.' },
    lose: { now: { rep: -2, morale: -2 }, text: 'Planning delays and bad reviews meant the cottages sat half empty.' } },

  { id: 'farm_solar_lease', name: 'Lease a field to a solar developer', k: 0.3, months: 6, success: 70,
    blurb: 'A solar developer rents a poor field for 25 years and pays you every year, so it is steady and almost risk-free income. You lose that land, and neighbours may object to panels.',
    win: { eff: { cap: 0.99, c: 0.995 }, monthly: 0.35, text: 'The panels went up and the rent arrives whatever the weather does to your crops.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Neighbours objected and the planning committee turned the scheme down after months of fees.' } },
];
