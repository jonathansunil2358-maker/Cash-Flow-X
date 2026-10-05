import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Clothing brand. Everything here is only available to that sector. Every id must start with "clothing_" (policies and initiatives) or "e9_clothing_" (events). */
export const policies: PolicyDef[] = [
  // 26 Collection calendar
  { id: 'clothing_calendar', group: 'ops', stock: true, name: 'Collection calendar', blurb: 'Fashion works in seasons: spring, summer, autumn and winter ranges. Factories need months of warning, so you plan each range well before shoppers see it.', options: [
    off,
    opt('Two big ranges a year', 'Fewer, bigger launches. Simple to plan, but a flop leaves you with a lot of unsold stock.', { c: 0.99, risk: [5, 3, 'A big range missed the mood and sat on the rails.'] }),
    opt('Four seasonal ranges', 'Fresh clothes every season keep shoppers coming back. It needs more design work and more careful planning.', { d: 1.015, ch: 0.99 }, 0.5, 0.3)] },
  // 28 Fast fashion versus timeless basics
  { id: 'clothing_fastbasics', group: 'ops', stock: true, name: 'Fast fashion or basics', blurb: 'Fast-fashion lines copy trends quickly and sell fast, but go out of date in weeks. Timeless basics (plain tees, jeans, knitwear) sell for years.', options: [
    off,
    opt('Fast-fashion lines', 'Trendy pieces bring a rush of sales, but anything unsold has to be marked down, so markdown risk is high.', { d: 1.03, risk: [10, 4, 'Trendy pieces went out of fashion and had to be marked down.'] }, 0.2),
    opt('Timeless basics', 'Steady sellers that hold their value. Safer, but less exciting and slower to grow.', { d: 0.99, c: 0.99, ch: 0.99 })] },
  // 30 Outlet store
  { id: 'clothing_outlet', group: 'ops', stock: true, name: 'Outlet store', blurb: 'An outlet is a separate shop, often out of town, that sells your leftovers. Done well it clears stock without dragging your main brand down.', options: [
    off,
    opt('Online clearance page', 'Cheap and hidden away from your main shop. Clears some stock, but shoppers learn to wait for the sale.', { c: 0.995, d: 0.995 }, 0.1),
    opt('Proper outlet store', 'A separate shop for leftovers that keeps discounts away from your main range. It costs rent and staff.', { c: 0.99, rep: 0.01 }, 0.5, 0.8)] },
  // 33 Influencer drops with limited quantities
  { id: 'clothing_drops', group: 'customers', stock: true, name: 'Limited drops', blurb: 'A drop is a small batch released on a set day, often with an influencer. When it sells out, people queue for the next one.', options: [
    off,
    opt('One drop a quarter', 'A small run with an influencer creates a buzz. It costs fees and a bit of sales slows while fans wait.', { d: 1.015, br: 1.001 }, 0.4),
    opt('A drop every month', 'Constant hype, but fans get tired and the team is always rushing. Some drops flop.', { d: 1.025, m: -0.2, risk: [8, 2, 'A drop did not sell out and the buzz fizzled.'] }, 0.8)] },
  // 42 Wholesale versus direct
  { id: 'clothing_channel', group: 'customers', stock: true, name: 'Wholesale or direct', blurb: 'Wholesale means selling in bulk to boutiques, who pay later and keep a cut. Selling direct means your own shops and website, with better margins but more work.', options: [
    off,
    opt('Lean on wholesale', 'Boutiques buy big batches and spread your name. Prices are lower and they pay slowly.', { d: 1.03, c: 1.01, br: 0.999 }, 0.2),
    opt('Direct to shoppers', 'You keep the full price and own the customer. You pay for the website, shops and delivery.', { c: 0.99, ch: 0.99, d: 0.99 }, 0.6)] },
  // 43 Garment recycling scheme
  { id: 'clothing_takeback', group: 'customers', name: 'Garment take-back scheme', blurb: 'Shoppers hand in old clothes in store and get a discount on their next purchase. The old clothes are reused or recycled.', options: [
    off,
    opt('Bring-back discount', 'Customers return more often and like the green story. The discounts cost margin and recycling is not free.', { ch: 0.98, rep: 0.04 }, 0.4, 0.3)] },
  // 44 Window displays
  { id: 'clothing_windows', group: 'ops', name: 'Window displays', blurb: 'People judge a shop in seconds from the window. A good display draws passers-by in.', options: [
    off,
    opt('Change the windows each season', 'A fresh look every season lifts footfall (the number of people walking in). It needs a display designer and props.', { d: 1.015 }, 0.3),
    opt('Showpiece windows every month', 'Eye-catching and talked about, but props, staff time and mannequins add up fast.', { d: 1.025, br: 1.001 }, 0.8)] },
  // 45 Return-to-vendor deals
  { id: 'clothing_rtv', group: 'finance', stock: true, name: 'Return-to-vendor deals', blurb: 'With a return-to-vendor deal, the supplier agrees to take back some unsold stock. You share the risk of a flop, but you pay a higher price for it.', options: [
    off,
    opt('Take-back on a quarter of stock', 'Less risk of being stuck with unsold clothes. Suppliers charge a little extra on every order.', { c: 1.01, d: 1.005 }, 0.1),
    opt('Take-back on half of stock', 'Strong protection against a bad season, but suppliers charge more and want a say in your ranges.', { c: 1.02, cap: 1.01 }, 0.3)] },
  // 46 Brand licensing
  { id: 'clothing_licensing', group: 'finance', name: 'Brand licensing', blurb: 'Licensing means other firms pay to put your logo on their products, such as bags and perfume. You earn money for doing little, but a poor product can harm your name.', options: [
    off,
    opt('Licence bags and scarves', 'Easy extra income. Quality is in someone else\'s hands, and the odd poor product reflects on you.', { rep: -0.01, risk: [4, 2, 'A licensed product was poorly made and shoppers complained.'] }, -0.7, 0.2),
    opt('Licence bags, perfume and more', 'More income, but your logo is everywhere and the brand starts to feel less special.', { br: 0.999, rep: -0.02, risk: [6, 3, 'A licensed product was poorly made and shoppers complained.'] }, -1.2, 0.3)] },
  // 49 Staff discount
  { id: 'clothing_staffdisc', group: 'people', name: 'Staff discount', blurb: 'Staff buy your clothes at a discount. They look great in them, and happy staff stay, but every discounted sale earns less.', options: [
    off,
    opt('20% off for staff', 'A cheap perk. Staff wear and talk about the brand, and morale improves.', { m: 0.2 }, 0.2),
    opt('50% off for staff and friends', 'Very popular with the team, but the discount leaks to resellers and trims your margin.', { m: 0.4, c: 1.005 }, 0.5)] },
];

export const events: EvSpec[] = [
  // 27 Fabric price swings
  { id: 'e9_clothing_fabricprice', title: 'Fabric prices swing', icon: 'chart', good: false, per: 1.5, cd: 12, gate: 'stock', story: 'The price of the fabric for your next whole range has jumped in a few weeks. It changes what every garment in the range costs you to make.', choices: [
    S('buyahead', 'Buy fabric early at today\'s price', 'Costs cash now, protects the range.', 'You locked in the price and the range stayed affordable.', { k: 0.08, eff: { c: E(0.98, 4) } }),
    S('absorb', 'Pay the new price', 'No cash outlay, but costs go up for a while.', 'The range cost more to make than planned.', { eff: { c: E(1.05, 5) } }),
    S('switch', 'Switch to a cheaper fabric', 'A gamble on whether shoppers notice.', '', { gamble: { p: 0.6, good: { c: E(0.97, 4) }, bad: { quality: -1, rep: -1 }, goodText: 'Nobody noticed and you saved money.', badText: 'Shoppers felt the difference and said so online.' } })] },
  // 29 End-of-season sale
  { id: 'e9_clothing_seasonsale', title: 'End-of-season sale', icon: 'tshirt', good: false, per: 1.5, cd: 12, gate: 'stock', story: 'The season is ending and the racks are still full. Stock that does not sell loses value every month, so you have to decide how hard to clear it.', choices: [
    S('deep', 'Deep sale, clear everything', 'Brings in cash, sold at a loss.', 'The racks emptied fast, though at a loss and with a dent in your premium feel.', { income: 0.25, eff: { rep: -1, brand: 0.99 } }),
    S('mild', 'Modest sale, keep some', 'Less cash, less damage.', 'You cleared the worst of it and kept some stock for next season.', { income: 0.1, eff: { d: E(0.99, 2) } }),
    S('hold', 'Hold the stock', 'Protects the brand, ties up cash.', '', { gamble: { p: 0.45, good: { brand: 1.01 }, bad: { c: E(1.02, 4), rep: -1 }, goodText: 'The clothes came back into fashion and sold at full price.', badText: 'The stock lost value and cluttered the warehouse.' } })] },
  // 37 Seasonal colour trends
  { id: 'e9_clothing_colourtrend', title: 'Guess next year\'s colour', icon: 'diamond', good: true, per: 1.5, cd: 12, story: 'Factories need orders a year ahead, so you must guess which colours will be fashionable. Pick well and the range flies. Pick badly and it sits there.', choices: [
    S('bold', 'Bet boldly on one trend colour', 'High risk, high reward.', '', { gamble: { p: 0.45, good: { d: E(1.06, 6), brand: 1.01 }, bad: { d: E(0.96, 5), rep: -1 }, goodText: 'You called it and shoppers wanted nothing else.', badText: 'The colour never took off and the range sat on the rails.' } }),
    S('mix', 'Spread across a few colours', 'Safer, less spectacular.', '', { k: 0.02, gamble: { p: 0.75, good: { d: E(1.02, 5) }, bad: { d: E(0.99, 3) }, goodText: 'At least one of your colours caught on.', badText: 'None of them stood out this year.' } }),
    S('neutral', 'Stay with classic neutrals', 'Boring but dependable.', 'Black, navy and cream sold steadily as always.')] },
  // 38 Counterfeits
  { id: 'e9_clothing_fakes', title: 'Fake copies appear', icon: 'shield', good: false, per: 1.5, cd: 14, story: 'Cheap counterfeits (illegal copies) of your best-selling pieces are being sold online, and they are taking your customers.', choices: [
    S('lawyers', 'Fight them in court', 'Costs a lot, protects the brand.', 'Lawyers shut the sellers down and the message was clear.', { k: 0.06, eff: { rep: 1, d: E(1.02, 4) } }),
    S('report', 'Report them to the websites', 'Cheap, takes time, never fully works.', 'Some listings vanished, though others popped up elsewhere.', { k: 0.01, eff: { d: E(0.98, 4) } }),
    S('ignore', 'Ignore them', 'Free, but sales and trust leak away.', 'The fakes spread, and some shoppers blamed you for poor quality.', { eff: { d: E(0.96, 6), rep: -1 } })] },
  // 39 Cotton harvest shocks
  { id: 'e9_clothing_cotton', title: 'Cotton harvest fails', icon: 'leaf', good: false, per: 1.5, cd: 16, story: 'Bad weather has ruined a big part of the cotton harvest. Every clothing firm faces dearer cotton, not just you.', choices: [
    S('pass', 'Raise prices a little', 'Protects margin, some shoppers leave.', 'Most shoppers understood, as every brand was doing the same.', { eff: { d: E(0.98, 5) } }),
    S('stock', 'Stock up on cotton now', 'Costs cash now, steadier prices later.', 'You bought before the worst of the rises.', { k: 0.07, eff: { c: E(0.98, 5) } }),
    S('blend', 'Use more blended fabrics', 'Cheaper, but a bit less nice to wear.', 'The blends cost less, and a few regulars noticed.', { eff: { c: E(0.98, 6), quality: -1 } })] },
  // 47 Celebrity wears your piece
  { id: 'e9_clothing_celeb', title: 'A celebrity wears your jacket', icon: 'star', good: true, per: 1.5, cd: 16, gate: 'stock', story: 'A famous singer was photographed in one of your jackets, and nobody sent it to them. Your site has crashed twice today.', choices: [
    S('restock', 'Rush more stock', 'Costs extra, catches the wave.', 'The extra jackets arrived while people were still talking about it.', { k: 0.05, eff: { d: E(1.08, 4), brand: 1.01 } }),
    S('scarce', 'Let it sell out', 'Cheap, and scarcity adds excitement.', 'The jacket sold out and became the one everybody wanted.', { eff: { d: E(1.04, 3), brand: 1.01 } }),
    S('reach', 'Contact the celebrity', 'A gamble on a lasting link.', '', { k: 0.02, gamble: { p: 0.4, good: { d: E(1.07, 6), brand: 1.02 }, bad: { rep: -1 }, goodText: 'They liked the jacket and shared more of your clothes.', badText: 'It came across as pushy and the moment passed.' } })] },
  // 48 Dye-house problems
  { id: 'e9_clothing_dyehouse', title: 'Dye-house trouble', icon: 'gear', good: false, per: 1.5, cd: 14, gate: 'stock', story: 'The factory that dyes your fabric has had a fire, and a whole range will arrive weeks late. Shops are waiting for it.', choices: [
    S('wait', 'Wait for the dye-house', 'Free, but the range is late.', 'The range arrived after the best selling weeks.', { eff: { d: E(0.96, 4) } }),
    S('rush', 'Pay another dye-house to rush it', 'Costs more, saves the launch.', 'The rush job cost extra and the colours were close enough.', { k: 0.05, eff: { quality: -1 } }),
    S('change', 'Swap to colours already in stock', 'Free, but a different range from planned.', '', { gamble: { p: 0.6, good: { d: E(1.01, 3) }, bad: { d: E(0.97, 3), rep: -1 }, goodText: 'The new colours turned out popular.', badText: 'Shoppers did not like the substitute colours.' } })] },
];

export const projects: InitiativeDef[] = [
  // 31 Sizing returns
  { id: 'clothing_fitfix', name: 'Fix the sizing', blurb: 'Shoppers send back clothes that do not fit, and every return costs postage and handling. Better size charts and fit models can cut returns, but it takes months of testing.', k: 0.6, months: 5, stock: true, success: 70,
    win: { eff: { c: 0.99, ch: 0.99 }, monthly: -0.15, text: 'New size charts and fit models cut returns sharply, so less money is lost on posting clothes back.' },
    lose: { now: { rep: -1 }, text: 'The new sizes were still off, and shoppers kept sending things back.' } },
  // 32 Fashion-week showcase
  { id: 'clothing_fashionweek', name: 'Fashion-week showcase', blurb: 'A catwalk show in fashion week, when press and buyers gather. Very expensive, and it can make a name if the clothes get noticed.', k: 2.2, months: 4, success: 40,
    win: { now: { brand: 1.04, rep: 3 }, eff: { d: 1.03 }, text: 'The press loved the show and buyers asked for appointments. Your name is now known beyond your usual customers.' },
    lose: { now: { rep: -1 }, text: 'The show was costly and the critics barely noticed it. The clothes looked good, but few people heard.' } },
  // 34 Supplier factory audits
  { id: 'clothing_audits', name: 'Factory audits for ethical sourcing', blurb: 'Send inspectors to check that factories pay fairly, keep workers safe and do not use child labour. It costs money and may uncover problems you must then pay to fix.', k: 0.8, months: 6, success: 75,
    win: { eff: { ch: 0.99 }, now: { rep: 3 }, monthly: 0.15, text: 'The audits found small problems that were fixed. You can now prove your clothes are made fairly.' },
    lose: { now: { rep: -2, morale: -1 }, text: 'An audit found serious problems at one factory. You had to switch supplier and the story got out.' } },
  // 35 Tailor-made line
  { id: 'clothing_tailored', name: 'Tailor-made line', blurb: 'Clothes made to each customer\'s measurements. Customers wait weeks and pay a lot more, so margins are high but you can only make so many.', k: 1, months: 6, success: 65,
    win: { eff: { d: 1.02, cap: 0.99 }, monthly: -0.5, now: { brand: 1.01 }, text: 'Customers happily waited for a perfect fit, and the high prices made a healthy profit.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Orders ran late and some customers were unhappy with the fit.' } },
  // 36 Designer collaboration
  { id: 'clothing_collab', name: 'Designer collaboration', blurb: 'A well-known designer makes a special range with you. They bring a following and charge a fee, so it only pays if their fans become yours.', k: 1.2, months: 4, success: 60,
    win: { now: { brand: 1.03, rep: 2 }, eff: { d: 1.03 }, text: 'The designer\'s fans queued for the range and many stayed to buy more.' },
    lose: { now: { rep: -1 }, text: 'The range clashed with your brand. Fans of both sides shrugged and much of it ended up in the sale.' } },
  // 40 Sustainable fabric range
  { id: 'clothing_sustainable', name: 'Sustainable fabric range', blurb: 'A range made from organic or recycled fabric. It costs more to make, and some shoppers will pay extra and stay loyal.', k: 1, months: 7, success: 70, stock: true,
    win: { eff: { ch: 0.98, c: 1.01 }, now: { rep: 3, brand: 1.02 }, text: 'Shoppers loved the story and the quality, and they came back for more.' },
    lose: { now: { rep: -1 }, text: 'The fabrics were costly and the range was a niche. Not enough people paid the higher price.' } },
  // 41 Department-store pop-up
  { id: 'clothing_popup', name: 'Department-store pop-up', blurb: 'A temporary shop inside a famous department store, in front of thousands of new shoppers. You pay rent and staff for a short run.', k: 0.9, months: 3, success: 65,
    win: { now: { brand: 1.02, rep: 2 }, eff: { d: 1.015 }, text: 'Crowds found your brand there, and many followed you online afterwards.' },
    lose: { now: { rep: -1 }, text: 'The pop-up sat in a quiet corner of the store and sales did not cover the rent.' } },
  // 50 Shop fit-out refresh
  { id: 'clothing_fitout', name: 'Shop fit-out refresh', blurb: 'Every few years shops look tired. New lighting, fittings and floors cost money and mean closing for a while, but shoppers notice.', k: 1.3, months: 3, success: 85,
    win: { eff: { d: 1.02, ch: 0.99 }, monthly: 0.1, now: { morale: 2 }, text: 'The refreshed shops felt new again, and staff were proud to work in them.' },
    lose: { now: { morale: -1, rep: -1 }, text: 'The work overran and the shops stayed closed longer than planned.' } },
];
