import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Topic: Supply chain. Every id starts with "supply_" (policies and projects) or "e9_supply_" (events). */
export const policies: PolicyDef[] = [
  { id: 'supply_scorecards', group: 'ops', stock: true, name: 'Supplier scorecards', blurb: 'Grade each supplier on how often their deliveries arrive on time, so you know who to lean on.', options: [
    opt('No scorecards', 'You go on gut feel about who is reliable.', {}),
    opt('Simple scorecard', 'Track the share of deliveries that arrive on time, and give slow suppliers a gentle nudge.', { c: 0.996 }, 0.12),
    opt('Scorecard with penalties', 'Late deliveries cost the supplier money. Deliveries improve, but suppliers get prickly.', { c: 0.99, q: 0.02, risk: [3, 2, 'A supplier you fined quietly put your orders at the back of the queue.'] }, 0.25)] },

  { id: 'supply_safetystock', group: 'ops', stock: true, name: 'Safety-stock formula', blurb: 'Safety stock is the spare stock you keep in case a delivery is late or sales jump. The question is how you decide how much.', options: [
    opt('Rule of thumb', 'You top up when the shelves start to look thin.', {}),
    opt('Same buffer for every item', 'Two weeks of spare stock on everything. Simple, but slow sellers tie up your cash.', { d: 1.005 }, 0.3),
    opt('Formula for each item', 'Work out each buffer from how fast the item sells and how long it takes to arrive. Takes effort to set up, then costs less to run.', { d: 1.008, c: 0.997, risk: [2, 2, 'Your formula missed a sudden fad and a popular item sold out.'] }, 0.15, 0.6)] },

  { id: 'supply_vmi', group: 'ops', stock: true, name: 'Vendor-managed inventory', blurb: 'Your supplier watches your stock levels and tops you up themselves, so you do less ordering.', options: [
    opt('You order your own stock', 'You decide what to buy and when.', {}),
    opt('Trial on top sellers', 'Let one supplier manage your best-selling lines. Less admin and slightly better prices.', { c: 0.996 }, 0, 0.3),
    opt('Supplier runs it all', 'Your supplier plans everything and shares the savings, but you are in their hands and they may load you with their slowest lines.', { c: 0.99, d: 1.003, risk: [4, 3, 'Your supplier loaded you up with stock you did not need and sent the bill.'] }, 0, 0.6)] },

  { id: 'supply_inspect', group: 'ops', stock: true, name: 'Inspection at source', blurb: 'Check goods at the factory before they are shipped, instead of finding the faults when they land.', options: [
    opt('Check on arrival', 'You look over goods once they reach you.', {}),
    opt('Sample checks', 'A local agent checks a sample from each batch before it ships.', { q: 0.02 }, 0.2),
    opt('Inspector on site', 'Someone you trust watches the production line. Fewer faulty batches, and a real bill.', { q: 0.04, c: 0.997, rep: 0.01 }, 0.5, 0.8)] },

  { id: 'supply_hedge', group: 'finance', stock: true, name: 'Raw-material contracts', blurb: 'Hedging means locking in a price for materials today, so a jump later cannot hurt you. The catch is that you miss out if prices fall.', options: [
    opt('Buy at the going price', 'You pay whatever the market charges that month.', {}),
    opt('Six-month contracts', 'Fix your prices half a year ahead. Steadier costs and a small discount for committing.', { c: 0.995, risk: [5, 2, 'Prices fell, and you were stuck paying the higher locked-in price.'] }),
    opt('Twelve-month contracts', 'Fix your prices for a whole year for a bigger discount. If the market drops you really feel it.', { c: 0.988, risk: [8, 4, 'The market price dropped and your year-long contract suddenly looked expensive.'] }, 0, 0.3)] },

  { id: 'supply_forecastscore', group: 'ops', stock: true, name: 'Forecast accuracy score', blurb: 'Compare what you predicted you would sell with what you really sold, every month. Big misses mean wasted stock or empty shelves.', options: [
    opt('No scoring', 'Forecasts are made and quickly forgotten.', {}),
    opt('Track it quietly', 'Someone checks the numbers each month and adjusts the plan.', { c: 0.996 }, 0.12),
    opt('Publish the score to the team', 'Everyone sees how close the forecast was. Forecasts get sharper, but nobody likes being the one who got it wrong.', { c: 0.992, m: -0.15 }, 0.15)] },

  { id: 'supply_bufferspace', group: 'ops', stock: true, name: 'Rented buffer space', blurb: 'Spare storage lets you hold more stock, so a late delivery does not leave your shelves empty.', options: [
    opt('Use what you have', 'Stock goes wherever there is room.', {}),
    opt('Rent a small unit', 'A nearby storage unit for overflow stock.', { d: 1.006 }, 0.35),
    opt('Rent a warehouse bay', 'Room to buy in bulk and ride out disruptions, but you pay for every empty corner.', { d: 1.01, c: 0.995 }, 0.9, 0.5)] },

  { id: 'supply_transport', group: 'ops', stock: true, name: 'Transport mode', blurb: 'How your goods travel. Road is steady, sea is cheap and slow, and air is fast and dear.', options: [
    opt('Mostly road', 'Reliable lorries and vans, nothing fancy.', {}),
    opt('Sea freight', 'Much cheaper per item, but it takes weeks, so you plan ahead and sometimes miss a trend.', { c: 0.99, d: 0.992 }),
    opt('Air freight', 'Goods arrive in days, so new lines and rush orders sell faster. The bill is steep.', { d: 1.012, c: 1.008 }, 0.5)] },

  { id: 'supply_payterms', group: 'finance', name: 'Supplier payment terms', blurb: 'Payment terms are how long you have to pay a supplier\'s invoice. Long terms help your cash, but suppliers charge for the wait.', options: [
    opt('Standard 30 days', 'You pay on the usual terms.', {}),
    opt('Stretch to 90 days', 'Ask for three months to pay. You keep your cash for longer, but prices creep up and suppliers get twitchy.', { od: 1.12, c: 1.008, risk: [3, 2, 'A supplier held back your order until an old invoice was settled.'] }),
    opt('Pay on delivery', 'Pay at once for a better price. Suppliers love you, but your cash runs thinner and you can borrow less in an emergency.', { c: 0.99, od: 0.9 })] },

  { id: 'supply_shipcarbon', group: 'ops', stock: true, name: 'Shipping carbon choices', blurb: 'Carbon is the greenhouse gas released when goods are moved. Different shipping choices give off very different amounts of it.', options: [
    opt('Cheapest route', 'Whatever gets goods there for the least money.', {}),
    opt('Prefer low-carbon routes', 'Choose rail and sea over lorries and planes where you can. Slower and a bit dearer, but customers notice.', { rep: 0.03, c: 1.004, d: 0.997 }),
    opt('Carbon-neutral shipping', 'Pay to cancel out the carbon from every delivery. Customers love the badge, and it is a running cost.', { rep: 0.05, br: 1.0005 }, 0.4)] },
];

export const events: EvSpec[] = [
  { id: 'e9_supply_leadtime', title: 'Deliveries become unpredictable', icon: 'parcel', good: false, per: 2, cd: 20, gate: 'stock',
    story: 'Lead time is how long an order takes to arrive. Yours used to be a steady two weeks, but lately it swings between one week and five, and your shelves keep running bare at the worst moments.', choices: [
      S('buffer', 'Order extra as a buffer', 'Ties up cash in stock, but steadies your sales.', 'The extra stock covered the gaps, and sales stayed steady.', { k: 0.03, eff: { d: E(1.01, 4) } }),
      S('rush', 'Pay for rush air freight', 'Very expensive, and it saves the key lines.', 'The urgent shipment saved the busy week, and the bill was painful.', { k: 0.05, eff: { d: E(1.015, 2) } }),
      S('tell', 'Warn customers about delays', 'Free and honest, but some will shop elsewhere.', 'Most people appreciated the honesty. A few went to a rival.', { eff: { rep: 1, d: E(0.98, 3) } })] },

  { id: 'e9_supply_bomchange', title: 'An engineer wants to swap a part mid-run', icon: 'gear', good: true, per: 1.5, cd: 24, gate: 'stock',
    story: 'Halfway through a production run, your lead engineer finds a cheaper part that does the same job on paper. This is called a bill-of-materials change, which just means changing the list of parts that go into your product. Swapping now saves money, but the first batches are already built.', choices: [
      S('swap', 'Swap it straight away', 'Cheaper, but the new part may not be quite as good.', '', { gamble: { p: 0.6, good: { c: E(0.99, 8) }, bad: { quality: -2, rep: -1 }, goodText: 'The new part worked perfectly and your costs fell.', badText: 'The new part failed in the field and a batch came back.' } }),
      S('test', 'Test it first, swap next run', 'A small cost, and you get it right.', 'Testing showed the part was fine, and the change went in cleanly.', { k: 0.01, eff: { c: E(0.995, 8) } }),
      S('keep', 'Keep the proven part', 'Safe, and you carry on paying more.', 'You stayed with the part you trust.', { eff: { quality: 0.5 } })] },

  { id: 'e9_supply_bankrupt', title: 'A supplier is going under', icon: 'shield', good: false, per: 1.5, cd: 30, gate: 'stock',
    story: 'Word reaches you that a supplier you rely on owes money to everyone and may close within weeks. They are holding your deposit, and you have orders in the pipeline. Bankruptcy means a company cannot pay its debts, and its customers are last in the queue.', choices: [
      S('rescue', 'Prepay to keep them going', 'Risky: your money may vanish with them.', '', { k: 0.04, gamble: { p: 0.5, good: { c: E(0.99, 8), rep: 1 }, bad: { d: E(0.97, 3) }, goodText: 'They survived and gave you a loyal discount.', badText: 'They closed anyway, and your prepayment went with them.' } }),
      S('backup', 'Line up a backup supplier now', 'Costs time and money, and protects you.', 'The backup was ready when your old supplier shut, so there was only a short wobble.', { k: 0.025, eff: { c: E(1.01, 3) } }),
      S('hope', 'Hope for the best', 'Free, until it is not.', '', { gamble: { p: 0.45, good: {}, bad: { d: E(0.96, 3), c: E(1.04, 3) }, goodText: 'They pulled through, and nothing changed.', badText: 'They shut with your orders half made, and you scrambled for stock.' } })] },

  { id: 'e9_supply_freight', title: 'Shipping container prices jump', icon: 'parcel', good: false, per: 2, cd: 24, gate: 'stock',
    story: 'The price of a shipping container has tripled in a month, because there are not enough of them in the right ports. Everything you import suddenly costs far more to bring in.', choices: [
      S('absorb', 'Absorb the cost', 'Customers notice nothing, and your margins feel it.', 'You swallowed the extra cost, and profits were thinner for a while.', { eff: { c: E(1.04, 5) } }),
      S('pass', 'Pass some on in your prices', 'Protects your margin, but some customers walk.', 'Prices went up a little. Most customers understood, and a few did not.', { eff: { d: E(0.98, 4), c: E(1.01, 4) } }),
      S('wait', 'Hold orders until prices ease', 'Risky: you may run short while you wait.', '', { gamble: { p: 0.55, good: { c: E(0.99, 4) }, bad: { d: E(0.96, 3) }, goodText: 'Prices eased and you bought more cheaply.', badText: 'Shelves ran bare while you waited.' } })] },

  { id: 'e9_supply_recall', title: 'A faulty batch must be traced', icon: 'shield', good: false, per: 1.5, cd: 36, gate: 'stock',
    story: 'A supplier tells you that one batch of parts was made wrongly and may be unsafe. Some of those items are already with customers. A recall means calling back the affected goods, and how fast you can find them depends on whether you recorded batch numbers.', choices: [
      S('full', 'Recall everything from that supplier', 'Very safe, and very expensive.', 'Customers praised your honesty, and the bill was big.', { k: 0.08, eff: { rep: 2 } }),
      S('trace', 'Trace and recall only the faulty batch', 'Cheaper, as long as your records are good.', '', { k: 0.03, gamble: { p: 0.7, good: { rep: 2 }, bad: { rep: -3, quality: -1 }, goodText: 'Your batch records found every item, and you looked organised.', badText: 'Some faulty items slipped through, and customers were not happy.' } }),
      S('quiet', 'Say nothing and hope', 'Free, and a terrible idea if it comes out.', '', { gamble: { p: 0.35, good: {}, bad: { rep: -4, brand: 0.97 }, goodText: 'Nothing happened, this time.', badText: 'The fault made the news, and people remembered you tried to stay quiet.' } })] },

  { id: 'e9_supply_packaging', title: 'Your packaging supplier raises the price', icon: 'parcel', good: false, per: 2, cd: 24, gate: 'stock',
    story: 'Your boxes have a custom design, and only one firm makes the moulds. They have just put their prices up by a fifth, knowing it would cost you a lot to switch. This is called supplier lock-in.', choices: [
      S('pay', 'Pay up', 'No fuss, but costs stay higher for a while.', 'You paid, and the boxes arrived on time.', { eff: { c: E(1.015, 8) } }),
      S('switch', 'Switch to standard boxes', 'A cost now, and plainer packaging.', 'The new boxes were cheaper to run, though they looked more ordinary.', { k: 0.03, eff: { d: E(0.99, 4), c: E(0.995, 8) } }),
      S('haggle', 'Threaten to leave and haggle', 'Might win a better price, might not.', '', { gamble: { p: 0.55, good: { c: E(0.995, 8) }, bad: { c: E(1.025, 8) }, goodText: 'They blinked, and cut their price.', badText: 'They called your bluff, and the price went up further.' } })] },

  { id: 'e9_supply_counterfeit', title: 'Suspiciously cheap parts arrive', icon: 'key', good: true, per: 1.5, cd: 30, gate: 'stock',
    story: 'A new broker offers well-known branded parts at half the usual price. They look right in the photos, but you have heard about fakes being sold as the real thing. Counterfeit parts can fail early and damage your name.', choices: [
      S('test', 'Test a sample before buying', 'A small fee, and you will know where you stand.', '', { k: 0.01, gamble: { p: 0.6, good: { c: E(0.985, 6) }, bad: {}, goodText: 'The sample was genuine, and you got a bargain.', badText: 'The sample was fake, so you said no and lost only the test fee.' } }),
      S('buy', 'Buy the whole lot', 'A great price if real, a disaster if fake.', '', { gamble: { p: 0.4, good: { c: E(0.97, 6) }, bad: { quality: -3, rep: -3 }, goodText: 'Every part was genuine, and your costs dropped.', badText: 'The parts were fakes, and they failed in customers\' hands.' } }),
      S('pass', 'Walk away', 'Boring and safe.', 'You stuck with your trusted supplier.')] },

  { id: 'e9_supply_strikemap', title: 'Your risk map lights up over a port', icon: 'flame', good: false, per: 1.5, cd: 24, gate: 'stock',
    story: 'Your supply-risk map, which tracks trouble spots along your shipping routes, has flashed amber over a major port. Dock workers have voted on a strike that could start within weeks, and your goods pass through there.', choices: [
      S('stock', 'Order extra before it starts', 'Ties up cash in stock, and protects your sales.', '', { k: 0.03, gamble: { p: 0.7, good: { d: E(1.01, 3) }, bad: { c: E(1.01, 3) }, goodText: 'The strike went ahead, and you were the only one with stock.', badText: 'The strike was called off, and you were left holding extra stock.' } }),
      S('reroute', 'Reroute through another port', 'Slower and dearer, but certain.', 'The detour cost extra, and every delivery arrived.', { eff: { c: E(1.02, 3) } }),
      S('watch', 'Watch and wait', 'Free, and a gamble.', '', { gamble: { p: 0.5, good: {}, bad: { d: E(0.96, 3), c: E(1.03, 3) }, goodText: 'The strike fizzled out, and nothing changed.', badText: 'Your goods sat on the dock for weeks.' } })] },

  { id: 'e9_supply_slowstock', title: 'The stock count finds dusty shelves', icon: 'parcel', good: false, per: 2, cd: 20, gate: 'stock',
    story: 'At the stock count, your team finds shelves of products that have barely sold in months. Slow-moving stock ties up cash and takes up space, and every month it sits there it is worth a little less.', choices: [
      S('clear', 'Hold a clearance sale', 'Frees cash and shelf space, at a thin margin.', 'The old lines flew out, though a few shoppers now wait for sales.', { k: 0.01, eff: { d: E(1.02, 2), brand: 0.995 } }),
      S('bundle', 'Bundle it with bestsellers', 'Slower, but it protects your prices.', 'The bundles shifted the old stock without a discount banner.', { k: 0.005, eff: { d: E(1.01, 4) } }),
      S('donate', 'Write it off and donate it', 'You lose the stock value and win goodwill.', 'A local charity was delighted, and the story got shared.', { k: 0.02, eff: { rep: 2 } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'supply_consolidate', name: 'Supplier consolidation tender', stock: true, k: 0.5, months: 4, success: 70,
    blurb: 'Invite your suppliers to compete for a bigger share of your orders, in return for a better price.',
    win: { eff: { c: 0.99 }, text: 'Fewer suppliers fought over your orders, and the winning bids were sharp.' },
    lose: { now: { c: E(1.015, 3) }, text: 'The suppliers who lost out grumbled, and prices crept up for a while.' } },

  { id: 'supply_nearshore', name: 'Near-shoring programme', stock: true, k: 1.5, months: 10, success: 60,
    blurb: 'Move some of your buying from far-off factories to ones nearer home, so that deliveries are quicker and less risky. Goods cost a little more.',
    win: { eff: { d: 1.012, c: 1.006, q: 0.01 }, monthly: 0.2, text: 'Deliveries now arrive in days, not weeks, and shelves stay full.' },
    lose: { now: { c: E(1.03, 4), morale: -1 }, text: 'The new factories were not ready, and you paid twice to cover the gap.' } },

  { id: 'supply_forecastshare', name: 'Forecast-sharing pilot', stock: true, k: 0.3, months: 4, success: 70,
    blurb: 'Show key suppliers your sales forecast so they can plan ahead. They need to trust you, and you need to trust them.',
    win: { eff: { c: 0.994, d: 1.003 }, text: 'Your suppliers planned around your forecast, and deliveries became smoother and cheaper.' },
    lose: { now: { c: E(1.02, 3) }, text: 'Your forecast was too hopeful, a supplier built too much, and you had to pay for it.' } },

  { id: 'supply_bonded', name: 'Customs-bonded warehouse', stock: true, k: 0.8, months: 6, success: 70,
    blurb: 'A bonded warehouse lets imported goods sit without paying import duty until they are sold, which eases pressure on your cash. The storage has a fee.',
    win: { eff: { od: 1.1, c: 1.003 }, monthly: 0.3, text: 'Customs approved the warehouse, and duty is now paid only when goods leave it.' },
    lose: { now: { c: E(1.01, 3) }, text: 'The paperwork took too long, and customs turned down your application.' } },

  { id: 'supply_development', name: 'Supplier development programme', stock: true, k: 0.8, months: 9, success: 65,
    blurb: 'Send your own experts to help your best suppliers improve their quality and cut their waste. Costly now, and it pays back if they stay with you.',
    win: { eff: { c: 0.99, q: 0.02 }, monthly: 0.1, text: 'Your suppliers made better goods with less waste, and shared the savings.' },
    lose: { now: { rep: -1, c: E(1.015, 4) }, text: 'A supplier took your training and then signed up with your rival.' } },

  { id: 'supply_turnsdrive', name: 'Inventory-turn drive', stock: true, k: 0.4, months: 6, success: 70,
    blurb: 'Inventory turns count how many times a year you sell through your stock. A push to turn it faster frees up cash tied up in slow lines.',
    win: { eff: { c: 0.992 }, monthly: -0.15, text: 'Slow lines were cleared out, and storage bills shrank.' },
    lose: { now: { d: E(0.98, 2) }, text: 'You cut stock too hard and ran out of a bestseller.' } },
];
