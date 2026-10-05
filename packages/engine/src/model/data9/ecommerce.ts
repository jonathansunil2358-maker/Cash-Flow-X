import { off, opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Sector topic: E-commerce store. Everything here is only available to that sector. Every id must start with "ecommerce_" (policies and initiatives) or "e9_ecommerce_" (events). */
export const policies: PolicyDef[] = [
  { id: 'ecommerce_pickpack', group: 'ops', name: 'Warehouse pick-and-pack speed', blurb: 'Picking is finding the item on the shelf, and packing is boxing it up. How fast you do it decides what delivery promise you can make.', options: [
    off,
    opt('Order cut-off at noon', 'A relaxed pace. Orders after noon go out the next day, and some shoppers drift away.', { d: 0.99, c: 0.995 }),
    opt('Next-day promise', 'Staff rush to ship fast. Customers love it, and rushed packing means a few mistakes.', { d: 1.02, risk: [5, 2, 'Rushed packing sent a batch of wrong items out.'] }, 0.7),
    opt('Order by evening, ships today', 'The fastest promise in the market. It needs extra shifts and extra staff pressure.', { d: 1.035, m: -0.2, risk: [8, 3, 'A late-evening rush led to a pile of mis-packed parcels.'] }, 1.4)] },

  { id: 'ecommerce_sameday', group: 'ops', stock: true, name: 'Same-day delivery zones', blurb: 'Promise delivery within hours to shoppers who live near your warehouse. The more zones you cover, the more couriers you pay.', options: [
    off,
    opt('One city zone', 'Same-day delivery to one nearby area. Popular, and every parcel costs more to send.', { d: 1.012 }, 0.7, 0.4),
    opt('Several zones', 'A wider promise that wins impulse buyers. Courier bills climb, and late drivers hurt your name.', { d: 1.025, rep: -0.01 }, 1.5, 0.8)] },

  { id: 'ecommerce_cartemails', group: 'customers', name: 'Cart-abandonment emails', blurb: 'Lots of shoppers fill a basket and wander off. A friendly reminder email can win some of them back, but too many emails annoy people.', options: [
    off,
    opt('One gentle reminder', 'A single email a day later. It wins back a few sales.', { d: 1.01 }, 0.15, 0.1),
    opt('Reminder plus discount code', 'The code tempts more people back, and you give away some margin.', { d: 1.02, c: 1.004 }, 0.4, 0.1),
    opt('Three-email chase', 'Maximum win-backs, and some people feel nagged and leave your mailing list.', { d: 1.025, rep: -0.04, ch: 1.01 }, 0.3, 0.1)] },

  { id: 'ecommerce_marketplace', group: 'customers', name: 'Marketplace presence', blurb: 'A marketplace is a huge shop like Amazon or eBay where you rent a shelf. You get their crowds, and they take a cut of every sale.', options: [
    off,
    opt('Sell a few best-sellers there', 'New shoppers find you. The platform keeps a fee from each sale.', { d: 1.015 }, 0.9),
    opt('List the whole range', 'The biggest audience. The fees are steep, and the platform owns the customer relationship.', { d: 1.03, br: 0.999, ch: 1.01 }, 1.8, 0.3)] },

  { id: 'ecommerce_dropship', group: 'ops', name: 'Dropshipping lines', blurb: 'With dropshipping, a supplier posts goods straight to your customer so you never hold the stock. Your margin is thin and you rely on them.', options: [
    off,
    opt('A small dropship range', 'Extra products with no stock risk. The margin is slim and quality is out of your hands.', { d: 1.012, q: -0.01 }, 0.5),
    opt('Dropship most of the catalogue', 'A huge range for no stock cost, and slow deliveries now and then upset shoppers.', { d: 1.025, q: -0.02, rep: -0.03, risk: [6, 2, 'A dropship supplier shipped late and customers complained.'] }, 1)] },

  { id: 'ecommerce_freereturns', group: 'customers', stock: true, name: 'Free-returns policy', blurb: 'Free return labels make buyers braver, so they order more. But every return costs you postage and handling.', options: [
    off,
    opt('Customer pays for returns', 'Saves you money, and some shoppers hesitate to buy.', { c: 0.995, d: 0.99 }),
    opt('Free returns within 14 days', 'Shoppers buy with confidence. Return labels add up.', { d: 1.02, ch: 0.98 }, 0.9),
    opt('Free returns for 60 days', 'The friendliest promise around. Some people order three sizes and send two back.', { d: 1.03, ch: 0.97, rep: 0.03 }, 1.8)] },

  { id: 'ecommerce_carrier', group: 'ops', name: 'Parcel-carrier contract', blurb: 'A carrier is the company that delivers your parcels. A long contract gives a lower price per parcel, but you are stuck if they slip.', options: [
    off,
    opt('Pay as you go', 'Pick the cheapest courier each day. Flexible, and the price per parcel is higher.', { c: 1.008 }),
    opt('One-year contract', 'A solid discount for sending lots with one courier.', { c: 0.99 }, 0.2, 0.2),
    opt('Three-year exclusive deal', 'The lowest price, and if the courier has a bad peak you have nowhere else to go.', { c: 0.98, risk: [7, 4, 'Your only courier struggled and parcels arrived late.'] }, 0.3, 0.4)] },

  { id: 'ecommerce_photos', group: 'customers', name: 'Product photography', blurb: 'Online, shoppers cannot touch anything, so photos do the selling. Good pictures lift the share of visitors who buy, which is called conversion.', options: [
    off,
    opt('Phone photos', 'Cheap and cheerful. Some products look a bit sad.', { d: 0.99, c: 0.998 }),
    opt('Studio photos', 'Clean, bright pictures on every product page.', { d: 1.015, q: 0.01 }, 0.5, 0.3),
    opt('Studio plus lifestyle video', 'Products shown in real use. It sells well and takes time and money to keep fresh.', { d: 1.03, br: 1.001 }, 1.2, 0.6)] },

  { id: 'ecommerce_replenish', group: 'customers', stock: true, name: 'Subscription replenishment', blurb: 'For things people run out of, like coffee or pet food, offer to send a refill automatically. Customers stay longer, and you must stock for them.', options: [
    off,
    opt('Subscribe and save 5%', 'A small discount for an automatic refill. Customers stick around.', { ch: 0.97, d: 1.005 }, 0.5, 0.3),
    opt('Subscribe and save 15%', 'A big discount hooks many regulars. Your margin is thin, and sleepy subscribers cancel in a grumpy bunch.', { ch: 0.94, d: 1.015, risk: [5, 2, 'A wave of subscribers cancelled after a late delivery.'] }, 1.3, 0.3)] },

  { id: 'ecommerce_loyalty', group: 'customers', name: 'Loyalty points scheme', blurb: 'Shoppers earn points to spend later. Points you have handed out but not yet used are a promise you owe, which accountants call a liability.', options: [
    off,
    opt('Points on every order', 'Shoppers come back to spend them. Unspent points are a debt on your books.', { ch: 0.97, d: 1.008 }, 0.6, 0.2),
    opt('Double points and tiers', 'Strong loyalty, and a growing pile of points you owe. A sudden rush to cash them in hurts.', { ch: 0.95, d: 1.015, risk: [4, 3, 'A points-redemption rush cost more than expected.'] }, 1.2, 0.3)] },
];

export const events: EvSpec[] = [
  { id: 'e9_ecommerce_reviews', title: 'A review swing', icon: 'star', good: false, per: 1.5, cd: 12, story: 'Star ratings are the shop window of online selling. This month a few angry reviews landed on your best-selling product page, and your average slipped from 4.7 to 4.3.', choices: [
    S('reply', 'Reply and fix every complaint', 'Costs staff time, and shoppers notice.', 'Your helpful replies won people round and the rating crept back up.', { k: 0.02, eff: { rep: 1.5 } }),
    S('ask', 'Email happy customers for reviews', 'A gamble: do enough of them reply?', '', { k: 0.01, gamble: { p: 0.65, good: { rep: 2, d: E(1.02, 4) }, bad: { rep: -1 }, goodText: 'Plenty of fresh five-star reviews pushed the average back up.', badText: 'Hardly anyone replied and the low score stuck.' } }),
    S('ignore', 'Ignore it', 'Free, but shoppers trust ratings.', 'The low score put some shoppers off for a few months.', { eff: { d: E(0.97, 4), rep: -1 } })] },

  { id: 'e9_ecommerce_blackmarket', title: 'Resellers undercut your price', icon: 'flame', good: false, per: 1.2, cd: 14, gate: 'stock', story: 'Someone is selling your products on a marketplace for far less than you charge. They may be reselling stolen or counterfeit stock, and shoppers are comparing prices.', choices: [
    S('report', 'Report them to the platform', 'Takes effort and may not work.', '', { k: 0.01, gamble: { p: 0.6, good: { d: E(1.02, 3) }, bad: { d: E(0.97, 3) }, goodText: 'The platform removed their listings.', badText: 'They popped up again under a new name.' } }),
    S('match', 'Match their price for a while', 'Keeps shoppers, but eats your margin.', 'You kept your customers and made less on each order.', { eff: { c: E(1.03, 3), d: E(1.01, 3) } }),
    S('brand', 'Stress why buying from you is safer', 'Guarantees and real support.', 'Shoppers who cared about genuine goods stayed with you.', { k: 0.02, eff: { rep: 1, d: E(0.99, 3) } })] },

  { id: 'e9_ecommerce_peak', title: 'Seasonal peak: temps and courier limits', icon: 'parcel', good: true, per: 1.5, cd: 12, gate: 'stock', story: 'The busy season is here and orders are flooding in. You can hire temporary packers, but couriers have caps on how many parcels they will collect each day.', choices: [
    S('temps', 'Hire lots of temps', 'Costs wages and training time.', 'The temps cleared the rush and most parcels left on time.', { k: 0.05, eff: { d: E(1.04, 2), quality: -1 } }),
    S('overtime', 'Pay your team overtime', 'Tired but trusted staff.', 'Your team pulled it off, and were glad of the extra money.', { k: 0.03, eff: { d: E(1.02, 2), morale: -2 } }),
    S('cap', 'Cap daily orders', 'Safe, and you turn away sales.', 'Deliveries stayed reliable, and some shoppers went elsewhere.', { eff: { d: E(0.98, 2), rep: 1 } })] },

  { id: 'e9_ecommerce_crash', title: 'Website crash on a busy day', icon: 'bolt', good: false, per: 1.2, cd: 14, story: 'Right in the middle of a big sales day, your website slowed to a crawl and then fell over. Shoppers are tapping refresh and giving up.', choices: [
    S('fix', 'Pay for emergency engineers', 'Costs a lot, and gets you back online fast.', 'Engineers got the site back within the hour and you apologised with a small discount.', { k: 0.04, eff: { rep: -1 } }),
    S('wait', 'Wait for your host to fix it', 'Free, and slow.', '', { gamble: { p: 0.4, good: { rep: -1 }, bad: { d: E(0.95, 3), rep: -2 }, goodText: 'The host fixed it quickly and few shoppers noticed.', badText: 'You lost most of the day and shoppers lost trust.' } }),
    S('upgrade', 'Move to stronger hosting', 'Expensive now and safer for the next rush.', 'The upgrade took a day and the next sale day went smoothly.', { k: 0.06, eff: { d: E(1.02, 6) } })] },

  { id: 'e9_ecommerce_fraud', title: 'Fraudulent orders and chargebacks', icon: 'shield', good: false, per: 1.2, cd: 12, story: 'A string of orders paid with stolen cards has shipped out. When the real card owners complain, the bank takes the money back. That is called a chargeback, and you lose the goods too.', choices: [
    S('screen', 'Add stricter order checks', 'Catches fraud, and holds up some honest orders.', 'The new checks stopped most of the fakes, and a few real shoppers waited a little longer.', { k: 0.02, eff: { d: E(0.99, 4) } }),
    S('tool', 'Pay for a fraud-detection service', 'Costs more, catches more.', 'The service flagged the dodgy orders without annoying honest shoppers.', { k: 0.04 }),
    S('absorb', 'Absorb the losses', 'No change, and it could happen again.', '', { gamble: { p: 0.5, good: {}, bad: { c: E(1.03, 4) }, goodText: 'The fraudsters moved on.', badText: 'More fake orders followed and the losses grew.' } })] },

  { id: 'e9_ecommerce_customs', title: 'Cross-border parcels stuck in customs', icon: 'globe', good: false, per: 1, cd: 14, story: 'Parcels going abroad are sitting at the border waiting for paperwork and duty payments. Customers overseas are asking where their orders are.', choices: [
    S('broker', 'Hire a customs agent', 'Costs money, clears the backlog.', 'The agent sorted the forms and parcels moved again.', { k: 0.03, eff: { rep: 0.5 } }),
    S('pause', 'Pause overseas orders', 'Protects your name for now.', 'You stopped taking foreign orders until the paperwork was in order.', { eff: { d: E(0.97, 3) } }),
    S('refund', 'Refund and apologise', 'Customers forgive, and you eat the cost.', 'Refunds went out and most shoppers stayed with you.', { k: 0.02, eff: { rep: 1 } })] },

  { id: 'e9_ecommerce_privacy', title: 'Customer-data privacy slip', icon: 'key', good: false, per: 1, cd: 16, story: 'An old spreadsheet with customers\' names and addresses was left where the wrong people could see it. Privacy law says you must protect that data, and regulators can fine you if you do not.', choices: [
    S('report', 'Tell the regulator and your customers', 'Honest, and costs time and some money.', 'You told everyone quickly. The regulator was satisfied and customers respected the honesty.', { k: 0.03, eff: { rep: -0.5 } }),
    S('quiet', 'Fix it quietly and say nothing', 'Cheap now, risky later.', '', { gamble: { p: 0.45, good: {}, bad: { rep: -3, d: E(0.96, 4) }, goodText: 'Nobody noticed.', badText: 'It came out, with a fine and a damaged name.' } }),
    S('audit', 'Hire a privacy expert to audit everything', 'Costs most, makes you safer.', 'The expert tightened your data rules and plugged other holes.', { k: 0.05, eff: { rep: 1 } })] },

  { id: 'e9_ecommerce_damage', title: 'Packaging damage claims', icon: 'parcel', good: false, per: 1.5, cd: 12, gate: 'stock', story: 'A run of parcels arrived crushed or broken. Customers want replacements, and your courier says your packing was too thin to claim against.', choices: [
    S('stronger', 'Switch to sturdier packaging', 'Costs more per parcel, saves breakages.', 'Fewer parcels arrived broken and shoppers noticed.', { k: 0.02, eff: { c: E(1.01, 6), quality: 1 } }),
    S('replace', 'Replace everything and move on', 'Keeps customers happy, costs stock.', 'Replacements went out and most customers were pleased.', { k: 0.03, eff: { rep: 0.5 } }),
    S('claim', 'Fight the courier over claims', 'Slow, and you might recover costs.', '', { gamble: { p: 0.45, good: { rep: 0.5 }, bad: { rep: -1, c: E(1.02, 3) }, goodText: 'The courier paid up for most of it.', badText: 'The claims were rejected and customers waited too long.' } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'ecommerce_robots', name: 'Warehouse robots', blurb: 'Little robots carry shelves to your packers. Packing gets faster with fewer hands, and the set-up is tricky.', k: 2.4, months: 8, success: 62, stock: true, win: { eff: { cap: 1.05, c: 0.99 }, monthly: -0.4, text: 'The robots settled in and your warehouse packs more parcels with fewer people.' }, lose: { now: { morale: -3, quality: -1 }, text: 'The robots kept jamming and tripping over each other. The money is gone and staff are fed up.' } },

  { id: 'ecommerce_privatelabel', name: 'Private-label products', blurb: 'Private label means your own brand on goods that a factory makes for you. You keep more of each sale, but you must carry the stock risk.', k: 1.8, months: 9, success: 60, stock: true, win: { eff: { c: 0.97, d: 1.01 }, now: { brand: 1.02 }, text: 'Your own-brand range sold well and earns a fatter margin than other people\'s products.' }, lose: { now: { rep: -1.5 }, text: 'The first batch had quality problems and the rest is sitting in boxes.' } },

  { id: 'ecommerce_bundles', name: 'Bundle deals for slow stock', blurb: 'Pair slow-moving items with popular ones at a combined price so the dusty stock finally leaves the shelf.', k: 0.5, months: 3, success: 80, stock: true, win: { now: { d: E(1.04, 3), quality: 0 }, text: 'The bundles cleared the slow stock and baskets got bigger.' }, lose: { now: { d: E(0.98, 2) }, text: 'Shoppers saw through the bundles and the discounts ate into your margin.' } },

  { id: 'ecommerce_preorder', name: 'Pre-order campaign', blurb: 'Take orders and money before the goods exist. It funds production, and a delay can upset everybody.', k: 0.8, months: 5, success: 65, stock: true, win: { now: { d: E(1.05, 3), brand: 1.01 }, eff: { od: 1.1 }, text: 'Pre-orders poured in and paid for the first production run. Your bank saw how strong demand was.' }, lose: { now: { rep: -2.5, d: E(0.96, 3) }, text: 'Production ran late and the pre-order customers waited. Refunds and angry messages followed.' } },

  { id: 'ecommerce_socialshop', name: 'Social-media shop integration', blurb: 'Let people buy straight from a post or video without leaving the app.', k: 0.7, months: 4, success: 68, win: { eff: { d: 1.025 }, now: { brand: 1.01 }, text: 'Shoppers bought right from their feeds and your reach grew.' }, lose: { now: { rep: -0.5 }, text: 'The checkout glitched and the platform changed its rules, so little came of it.' } },

  { id: 'ecommerce_app', name: 'Mobile shopping app', blurb: 'An app puts your shop on your customers\' home screens. People who install it tend to order more often, but they must build it first.', k: 1.5, months: 8, success: 58, win: { eff: { ch: 0.97, d: 1.025 }, text: 'Customers installed the app and ordered more often.' }, lose: { now: { rep: -1, morale: -2 }, text: 'The app was buggy and slow, and the reviews stung. The money is spent.' } },

  { id: 'ecommerce_searchads', name: 'Search-ad overhaul', blurb: 'Search ads are auctions, and as rivals bid, each click costs more. Rework your keywords and bids to stop paying through the nose.', k: 0.6, months: 4, success: 70, win: { eff: { d: 1.02, c: 0.995 }, text: 'Smarter bidding brought the same shoppers for fewer pounds per click.' }, lose: { now: { d: E(0.98, 3) }, text: 'You cut the wrong keywords and traffic dropped for a while.' } },
];
