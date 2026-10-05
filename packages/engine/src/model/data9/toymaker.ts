import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Toy maker. Everything here is only available to that sector. Every id must start with "toymaker_" (policies and initiatives) or "e9_toymaker_" (events). */
export const policies: PolicyDef[] = [
  // 351 Christmas production planning
  { id: 'toymaker_xmas_plan', group: 'ops', stock: true, name: 'Christmas production plan', blurb: 'Most toys are bought for Christmas, but shops want them on shelves by autumn, so you must decide how many to make months ahead. Make too few and you miss sales; make too many and they sit unsold.', options: [
    off,
    opt('Build early and steady', 'Spread production through the summer so the factory is never rushed. Smoother work, but more cash is tied up in boxes for longer.', { c: 0.99, cap: 1.02 }, 0.3),
    opt('Build to order late', 'Wait for firm retailer orders before making much. Little leftover stock, but you may run out in the busy weeks and overtime is costly.', { c: 1.01, d: 0.985, risk: [8, 2, 'Orders landed late and the factory could not keep up in the rush.'] })] },

  // 353 Safety testing
  { id: 'toymaker_safety_testing', group: 'ops', name: 'Safety testing', blurb: 'By law toys must pass safety tests, for example for choking hazards, sharp edges and harmful paint. A recall is when you must pull a faulty toy from every shop and refund it, which is hugely expensive.', options: [
    off,
    opt('Test every new toy', 'An approved lab checks each new design before launch. Costs a fee per product and delays launches slightly.', { d: 0.995, rep: 0.02, q: 0.01 }, 0.5),
    opt('Test every batch too', 'Samples from every factory batch are tested as well. Almost no recall risk, but it is a large running cost and slows deliveries.', { rep: 0.04, q: 0.02, cap: 0.98 }, 1.2)] },

  // 354 Plastic vs wood
  { id: 'toymaker_materials', group: 'ops', name: 'Plastic or wood', blurb: 'Plastic toys are cheap to mould in huge numbers. Wooden toys cost more and are made slowly, but parents see them as classic, safe and longer lasting.', options: [
    off,
    opt('Cheaper recycled plastic', 'Moulded from recycled plastic. Lower costs and a green label, but some parents still think of plastic as throwaway.', { c: 0.98, q: -0.01 }, 0.1),
    opt('Premium wooden range', 'Painted wood from certified forests. Parents pay more and trust it, but unit costs and production time rise.', { d: 1.03, rep: 0.03, c: 1.04, cap: 0.97 }, 0.2)] },

  // 355 Retailer buying meetings
  { id: 'toymaker_shelf_space', group: 'customers', name: 'Retailer shelf deals', blurb: 'Shops decide each year which toys to stock. Shelf space is the room your toys get in a shop, and big retailers can demand discounts or marketing money in return.', options: [
    off,
    opt('Pay for prime shelves', 'Fund eye-level displays in the big chains. More walk-in shoppers, but the retailers take a hefty fee.', { d: 1.04, br: 1.002 }, 1.0),
    opt('Exclusive deal with one chain', 'One chain gets your range first. Great volume and a friendly buyer, but if they drop you, you lose a lot of sales and other shops feel snubbed.', { d: 1.05, risk: [6, 5, 'The chain you rely on cut its order sharply.'] }, 0.6)] },

  // 358 Packaging
  { id: 'toymaker_packaging', group: 'ops', name: 'Packaging', blurb: 'Parents choose gifts in seconds, so the box matters: bright colours, a clear window and a good picture. Fancy boxes cost more and take more space to ship.', options: [
    off,
    opt('Window box', 'A clear plastic window shows the toy. Catches the eye and costs a bit more per toy.', { d: 1.02, c: 1.012 }),
    opt('Premium gift packaging', 'Rigid, illustrated boxes that look great on the shelf. Higher prices stick, but boxes are costly and bulky to warehouse.', { d: 1.035, c: 1.03, cap: 0.99 }, 0.2)] },

  // 359 Pocket-money price points
  { id: 'toymaker_price_points', group: 'customers', name: 'Pocket-money price points', blurb: 'A price point is a standard price tier, like under 5 pounds, that fits what a child can afford alone. Cheap toys sell by the bucket, but profit per toy is thin.', options: [
    off,
    opt('Add a pocket-money line', 'Small cheap toys at the till. Lots of extra sales, but they eat factory time and have thin margins.', { d: 1.03, c: 1.02, cap: 0.98 }),
    opt('Gift-price range only', 'Fewer, pricier toys for birthdays and Christmas. Better margins, but fewer sales to children themselves.', { d: 0.985, c: 0.98, rep: 0.01 })] },

  // 360 Educational range
  { id: 'toymaker_educational', group: 'customers', name: 'Educational toy range', blurb: 'Educational toys teach skills like counting or building. Schools and nurseries buy them in bulk and parents feel good about them, but approval takes time and ranges need real designers.', options: [
    off,
    opt('A few learning toys', 'Add counting and letter games to the catalogue. Steady, modest orders from nurseries.', { d: 1.015, q: 0.01 }, 0.4),
    opt('Full school range', 'A dedicated range with teacher guides. Big bulk orders and good reputation, but designers are busy and schools pay slowly.', { d: 1.03, rep: 0.03, q: 0.02, od: 0.95 }, 1.0, 0.3)] },

  // 365 Parental reviews online
  { id: 'toymaker_reviews', group: 'customers', name: 'Parent reviews online', blurb: 'Parents read reviews before buying a toy. One viral bad review can undo months of work, so some makers send free samples to review sites, which is risky and cheap.', options: [
    off,
    opt('Reply to every review', 'A staff member answers every review politely and fixes problems. Builds trust, takes staff time.', { rep: 0.04, m: -0.1 }, 0.3),
    opt('Free samples to reviewers', 'Send toys to popular parent bloggers. Brings buzz, but a harsh verdict can sting, and giveaways cost stock.', { d: 1.025, br: 1.002, risk: [8, 2, 'A well-known blogger posted a harsh review of one of your toys.'] }, 0.5)] },

  // 367 Seasonal discounting after January
  { id: 'toymaker_clearance', group: 'ops', stock: true, name: 'January clearance', blurb: 'After Christmas leftover toys are worth less, because next year there will be new hits. Clearance means selling them cheaply to free cash and warehouse space.', options: [
    off,
    opt('Sell off in January', 'Mark everything down hard in the new year. Clears space and brings cash, but you give away margin and shoppers learn to wait.', { c: 0.985, d: 0.99 }, 0.2),
    opt('Hold stock for next year', 'Keep unsold toys for next season. No fire sale, but storage costs money and fashions move on.', { c: 1.015, cap: 0.99 }, 0.3)] },

  // 370 Kids' panels
  { id: 'toymaker_kids_panel', group: 'customers', name: 'Kids\' feedback panel', blurb: 'A panel is a group of children who try new toys and say what they think. Kids are brutally honest, and it is the cheapest way to spot a dud before you make thousands.', options: [
    off,
    opt('Local school panel', 'A class tries your prototypes each month. Cheap, useful and a bit slow.', { q: 0.02, c: 1.003 }, 0.3),
    opt('Paid focus-group firm', 'A research agency runs formal tests. Reliable results, but expensive, and designers sometimes feel second-guessed.', { q: 0.035, rep: 0.01, m: -0.2 }, 0.9)] },

  // 372 Designers' creative freedom
  { id: 'toymaker_designer_freedom', group: 'people', name: 'Designers\' creative freedom', blurb: 'Toy designers do their best work when trusted to experiment, but unlimited freedom means missed deadlines and ideas that never reach a shelf.', options: [
    off,
    opt('Friday build days', 'One day a week for pet projects. Happy designers and occasional big ideas, at the cost of lost working time.', { m: 0.5, q: 0.02, cap: 0.99 }, 0.2),
    opt('Tight briefs and deadlines', 'Designers follow a strict schedule and brief. Products ship on time, but the team feels boxed in.', { m: -0.4, c: 0.99, q: -0.01 })] },

  // 373 Gift-box bundles
  { id: 'toymaker_bundles', group: 'customers', name: 'Gift-box bundles', blurb: 'A bundle packs several toys in one box at a slightly lower price per toy. Shoppers like the deal, and it moves slow sellers alongside bestsellers.', options: [
    off,
    opt('Bundle slow sellers', 'Pair a weak seller with a favourite. Clears stock and lifts the basket size, but a few shoppers would have paid full price.', { d: 1.02, c: 0.995 }, 0.4),
    opt('Big Christmas gift sets', 'Special sets only for the festive season. Strong sales in the peak, but you must pack by hand and prices are cut.', { d: 1.035, cap: 0.98, c: 1.01 }, 0.6)] },
];

export const events: EvSpec[] = [
  { id: 'e9_toymaker_film_licence', title: 'A film studio offers a licence', icon: 'camera', good: true, per: 1, cd: 24, story: 'A studio will let you make toys of the characters from its coming blockbuster. A licence is permission to use someone else\'s characters, for which you pay a royalty, a cut of every sale. If the film flops, so do the toys.', choices: [
    S('big', 'Sign the full licence', 'Big upside, a heavy fee and real risk.', '', { k: 0.08, gamble: { p: 0.55, good: { d: E(1.08, 6), brand: 1.03, rep: 1 }, bad: { d: E(0.97, 4), rep: -1 }, goodText: 'The film was a smash and children demanded the toys.', badText: 'The film disappointed and boxes of toys sat on shelves.' } }),
    S('small', 'License one character only', 'A smaller bet.', 'One popular sidekick sold steadily without too much risk.', { k: 0.03, eff: { d: E(1.03, 5) } }),
    S('own', 'Stick to your own characters', 'No fee, no boost.', 'You kept your own range and your own margins.')] },

  { id: 'e9_toymaker_recall', title: 'Safety recall', icon: 'shield', good: false, per: 1, cd: 30, story: 'A parent reports that a small part on one of your toys snapped off. A recall means telling every shop and buyer to stop selling it, collecting the stock and giving refunds. It is expensive, but hiding it is worse.', choices: [
    S('full', 'Recall everything now', 'Costly, protects trust.', 'You acted fast, apologised and offered refunds. Parents noticed how you handled it.', { k: 0.1, eff: { rep: 1, quality: 1 } }),
    S('batch', 'Recall only the affected batch', 'Cheaper, but depends on being right.', '', { k: 0.05, gamble: { p: 0.65, good: { rep: 1 }, bad: { rep: -3, d: E(0.95, 5) }, goodText: 'The batch was the only one at fault.', badText: 'More faulty toys turned up and the press asked why you did not recall everything.' } }),
    S('wait', 'Wait for the regulator', 'Free now, very risky.', '', { gamble: { p: 0.25, good: {}, bad: { rep: -4, d: E(0.92, 6), morale: -2 }, goodText: 'The report was a one-off and nothing more came of it.', badText: 'A child was hurt, the regulator stepped in and shops pulled your range.' } })] },

  { id: 'e9_toymaker_craze', title: 'A toy craze takes off', icon: 'rocket', good: true, per: 1.5, cd: 18, story: 'One of your toys has gone viral. Shops are phoning daily and children are queueing, but your factory cannot make it fast enough. A stock-out is when shops run out and sales are lost.', choices: [
    S('rush', 'Pay for rush production', 'Costly overtime to meet demand.', '', { k: 0.06, gamble: { p: 0.7, good: { d: E(1.08, 4), brand: 1.04 }, bad: { quality: -2, c: E(1.03, 3) }, goodText: 'You kept shelves full through the craze.', badText: 'Rushed toys had faults and costs spiralled.' } }),
    S('steady', 'Keep to normal output', 'Safe, but you miss part of the boom.', 'You kept quality up and let some customers wait.', { eff: { d: E(1.03, 3) } }),
    S('limited', 'Declare it a limited edition', 'Turn scarcity into a feature.', 'Scarcity made the toy even more wanted, and the waiting list grew.', { eff: { d: E(1.04, 3), brand: 1.02, rep: -1 } })] },

  { id: 'e9_toymaker_factory_delay', title: 'Overseas factory delays', icon: 'parcel', good: false, per: 1.5, cd: 18, story: 'Your overseas factory is weeks behind after a port jam and a power cut. Boxes may not reach the shops before the Christmas rush.', choices: [
    S('air', 'Fly the toys in', 'Fast and very expensive.', 'The air freight bill hurt, but the toys reached the shelves in time.', { k: 0.06, eff: { rep: 1 } }),
    S('wait', 'Wait and apologise to retailers', 'Cheap, but orders may be cut.', '', { gamble: { p: 0.5, good: { rep: 0 }, bad: { d: E(0.96, 4), rep: -2 }, goodText: 'The goods arrived just in time.', badText: 'The delay missed the shops\' cut-off and orders were cancelled.' } }),
    S('local', 'Make a rush batch locally', 'Costs more per toy, but reliable.', 'A nearby factory covered the gap at a higher price.', { eff: { c: E(1.03, 3) } })] },

  { id: 'e9_toymaker_counterfeits', title: 'Counterfeit copies appear', icon: 'key', good: false, per: 1.5, cd: 24, story: 'Cheap fakes of your best-seller are being sold online. Counterfeits are illegal copies, and they are often unsafe, so parents blame your brand when something goes wrong.', choices: [
    S('lawyers', 'Take legal action', 'Costs money, deters copying.', 'Lawyers shut down the main sellers and the rest backed off.', { k: 0.04, eff: { rep: 1 } }),
    S('mark', 'Add authenticity stickers', 'Cheap and partly effective.', '', { k: 0.015, gamble: { p: 0.6, good: { d: E(1.01, 4) }, bad: { d: E(0.97, 4) }, goodText: 'Parents learned to look for the sticker.', badText: 'The fakers copied the stickers too.' } }),
    S('ignore', 'Ignore them', 'Free, but sales drift away.', 'The fakes took some of your sales and a little of your name.', { eff: { d: E(0.97, 5), rep: -1 } })] },

  { id: 'e9_toymaker_rule_change', title: 'New child-safety rules', icon: 'flag', good: false, per: 1, cd: 36, story: 'The government is tightening toy safety rules: stricter limits on chemicals and tougher labelling. Every toy range must be checked again.', choices: [
    S('comply', 'Redesign and retest everything', 'A big bill, but you are ahead of the rules.', 'Your range met the new rules early and shops praised it.', { k: 0.07, eff: { rep: 2, quality: 1 } }),
    S('minimum', 'Do the minimum to comply', 'Cheaper, but costs rise a bit.', 'You met the rules with a few patches.', { k: 0.03, eff: { c: E(1.02, 6) } }),
    S('lobby', 'Join an industry group to push back', 'A gamble on a softer outcome.', '', { k: 0.02, gamble: { p: 0.35, good: { rep: 1 }, bad: { c: E(1.04, 6), rep: -1 }, goodText: 'The rules were softened.', badText: 'The rules stayed tough and you were late to prepare.' } })] },

  { id: 'e9_toymaker_toy_fair', title: 'Toy fair invitation', icon: 'star', good: true, per: 1.5, cd: 16, story: 'The big annual toy fair is coming up. Buyers from every chain walk the halls looking for next year\'s bestsellers, and a stand costs real money.', choices: [
    S('big', 'Take a big stand', 'Expensive, with big potential.', '', { k: 0.06, gamble: { p: 0.65, good: { d: E(1.06, 6), brand: 1.03 }, bad: { morale: -1 }, goodText: 'Buyers queued at your stand and orders poured in.', badText: 'Your stand was tucked in a corner and few buyers wandered by.' } }),
    S('small', 'Share a small table', 'Cheaper, with a modest return.', 'A shared table brought a few useful contacts.', { k: 0.02, eff: { d: E(1.02, 5) } }),
    S('skip', 'Skip it this year', 'Save money, miss buyers.', 'You stayed at home and kept the cash.')] },

  { id: 'e9_toymaker_retailer_collapse', title: 'A retailer goes bust', icon: 'chart', good: false, per: 1, cd: 30, gate: 'cash', story: 'A toy shop chain that owes you money has gone into administration, which means a court-appointed firm is sorting out who gets paid. Small suppliers usually get only pennies in the pound.', choices: [
    S('claim', 'Claim as an unsecured creditor', 'Slow and small payout.', 'You joined the queue of creditors and wrote off most of the debt.', { k: 0.04, eff: { rep: 0 } }),
    S('retention', 'Chase a retention-of-title claim', 'A legal bet that you can reclaim unpaid stock.', '', { k: 0.02, gamble: { p: 0.45, good: { rep: 1 }, bad: { morale: -1 } , goodText: 'Your contract let you take back unsold toys.', badText: 'The paperwork was not good enough and you got nothing back.' } }),
    S('tighten', 'Write it off and tighten credit', 'Absorb the hit and change your terms.', 'You took the loss and now check every shop before shipping on credit.', { k: 0.05, eff: { d: E(0.98, 4) } })] },

  { id: 'e9_toymaker_crowdfund', title: 'Crowdfunded limited edition', icon: 'heart', good: true, per: 1.5, cd: 20, story: 'Fans ask you to launch a limited-edition collector set through a crowdfunding site. Backers pay in advance, which funds production, but they expect delivery on time and will complain loudly if you slip.', choices: [
    S('go', 'Launch the campaign', 'Cash up front, a promise to keep.', '', { income: 0.2, gamble: { p: 0.7, good: { brand: 1.03, rep: 1 }, bad: { rep: -2, morale: -2 }, goodText: 'Backers received their sets and raved about them.', badText: 'Deliveries slipped and backers filled your comments with anger.' } }),
    S('mini', 'Small run only', 'Little cash and less risk.', 'A small run sold out quickly and kept the fans happy.', { income: 0.08, eff: { brand: 1.01 } }),
    S('decline', 'Decline politely', 'Keep your focus.', 'You stayed with your normal range.')] },
];

export const projects: InitiativeDef[] = [
  { id: 'toymaker_collectible_series', name: 'Collectible blind-box series', k: 1.2, months: 6, success: 60, stock: true,
    blurb: 'Collectibles come in sealed boxes so buyers do not know which figure they get. A few are rare, so children (and adults) keep buying to complete the set. It sells well but needs careful stock planning.',
    win: { eff: { d: 1.03, br: 1.002 }, monthly: 0.2, now: { brand: 1.03 }, text: 'Collectors hunted for the rare figures and shops reordered every week.' },
    lose: { now: { rep: -1, d: E(0.98, 3) }, text: 'The rare figures annoyed buyers, and boxes of common ones piled up.' } },

  { id: 'toymaker_companion_app', name: 'Mobile companion app', k: 1.0, months: 8, success: 50,
    blurb: 'A free app lets children scan their toys to unlock games. It keeps the toy interesting after the box is opened, but children\'s apps face strict privacy rules and need developers.',
    win: { eff: { d: 1.025, ch: 0.99 }, now: { brand: 1.02 }, text: 'Children kept playing with the toys longer, and parents liked the safe design.' },
    lose: { now: { morale: -2, rep: -1 }, text: 'The app had bugs and a privacy complaint, and you pulled it.' } },

  { id: 'toymaker_toy_library', name: 'Toy-library partnerships', k: 0.4, months: 4, success: 75,
    blurb: 'A toy library lends toys to families for a small fee. Libraries buy sturdy toys in bulk, and children who try your toys there often ask for them as gifts.',
    win: { eff: { d: 1.015 }, monthly: 0.1, now: { rep: 1, brand: 1.01 }, text: 'Libraries stocked your range and families asked for your toys at birthdays.' },
    lose: { now: { morale: -1 }, text: 'The libraries wanted deep discounts and returned heavily worn stock.' } },

  { id: 'toymaker_subscription_box', name: 'Subscription toy box', k: 1.5, months: 9, success: 55, stock: true,
    blurb: 'A subscription box sends a new toy every month to paying families. It gives steady, predictable money outside the Christmas rush, but you must keep fresh toys coming and pay for postage.',
    win: { eff: { d: 1.02, ch: 0.98 }, monthly: 0.4, text: 'Subscribers stayed month after month and smoothed your summer sales.' },
    lose: { now: { rep: -1, d: E(0.98, 3) }, text: 'Too many subscribers cancelled after a few boxes and postage ate the margin.' } },

  { id: 'toymaker_peak_warehouse', name: 'Peak-season temporary warehouse', k: 0.8, months: 3, success: 80, stock: true,
    blurb: 'Rent extra warehouse space for the autumn stock build so the factory is not drowning in boxes. It eases the rush but costs rent in the months you need it.',
    win: { eff: { cap: 1.03, c: 0.99 }, text: 'Extra space kept pallets organised and shipments flowed in the Christmas rush.' },
    lose: { now: { morale: -1, c: E(1.02, 2) }, text: 'The space was badly located and trucks wasted days moving stock.' } },
];
