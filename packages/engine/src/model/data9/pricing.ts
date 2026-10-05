import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Topic: Pricing. Every id starts with "pricing_" (policies and projects) or "e9_pricing_" (events). */
export const policies: PolicyDef[] = [
  { id: 'pricing_volumeladder', group: 'customers', name: 'Volume-discount ladder', blurb: 'Big buyers pay less per item the more they order. It wins large orders, and it eats into your margin.', options: [
    opt('One price for all', 'Everyone pays the same, whatever they buy.', {}),
    opt('Gentle ladder', 'A small discount at each step up in order size.', { d: 1.012 }, 0.4),
    opt('Steep ladder', 'Big discounts for big orders. Big buyers flock to you, and your margin gets thin.', { d: 1.025, c: 1.004 }, 1)] },

  { id: 'pricing_lossleader', group: 'customers', name: 'Loss-leader products', blurb: 'A loss-leader is something you sell at or below cost to get people through the door, hoping they buy other things too.', options: [
    opt('No loss-leaders', 'Every product has to earn its keep.', {}),
    opt('One headline bargain', 'One cheap star product at the front of every leaflet.', { d: 1.012 }, 0.6),
    opt('Several bargains', 'More deals bring in more people, but you also attract bargain hunters who leave as fast as they came.', { d: 1.02, ch: 1.01 }, 1.3)] },

  { id: 'pricing_endings', group: 'customers', name: 'Psychological price endings', blurb: 'A price ending in .99 feels cheaper than a round one, even though the difference is tiny.', options: [
    opt('Plain prices', 'You pick prices as they come.', {}),
    opt('.99 endings', 'Every price ends in 99. It feels like a bargain, and it also feels a little cheap.', { d: 1.008, rep: -0.015 }),
    opt('Round premium prices', 'Clean round numbers signal quality and calm. Some bargain lovers drift off.', { br: 1.001, d: 0.994 })] },

  { id: 'pricing_pricematch', group: 'customers', name: 'Price-match promise', blurb: 'Promise to match any lower price a customer finds elsewhere. It builds trust, and it costs you when rivals play games.', options: [
    opt('No promise', 'You set your prices and stick to them.', {}),
    opt('Match any lower price', 'Customers feel safe buying from you, and now and then someone tests you.', { d: 1.01, ch: 0.98, risk: [4, 3, 'A rival ran a fake low price just to make you match it.'] }, 0.6),
    opt('Beat any price by ten per cent', 'A bold promise that wins customers and invites trouble.', { d: 1.025, ch: 0.97, risk: [8, 5, 'A rival advertised a loss-making price and you had to beat it.'] }, 1.5)] },

  { id: 'pricing_dynamic', group: 'customers', name: 'Dynamic pricing', blurb: 'Prices change with demand, for example cheaper in quiet hours and dearer when you are busy.', options: [
    opt('Same price all day', 'One simple price list.', {}),
    opt('Peak and off-peak', 'Cheaper in quiet times to fill the gaps, dearer when it is busy. Some customers grumble.', { d: 1.01, rep: -0.02 }, 0.2, 0.4),
    opt('Full surge pricing', 'Prices rise and fall minute by minute. Maximum income, and some customers feel ripped off.', { d: 1.02, rep: -0.06, risk: [5, 2, 'A screenshot of a sky-high surge price went viral for all the wrong reasons.'] }, 0.3, 0.8)] },

  { id: 'pricing_premium', group: 'customers', name: 'Premium-brand pricing', blurb: 'A high price can tell people you are the best, which is called signalling quality. But fewer people can afford you.', options: [
    opt('In line with the market', 'You charge what everyone else charges.', {}),
    opt('A little above rivals', 'Fewer customers and a stronger name. Each sale earns more.', { d: 0.985, br: 1.001, rep: 0.03 }, -0.6),
    opt('Luxury pricing', 'Only a few can buy, and those who do talk about you. Each sale earns much more.', { d: 0.96, br: 1.003, rep: 0.06 }, -1.1)] },

  { id: 'pricing_concessions', group: 'customers', name: 'Student and senior pricing', blurb: 'Cheaper prices for students and older people can fill quiet times, and win customers who stay with you.', options: [
    opt('No concessions', 'One price for everybody.', {}),
    opt('Student discount', 'Cheaper for students, who may become loyal customers for life.', { d: 1.012, ch: 0.99 }, 0.4),
    opt('Student and senior discounts', 'More customers on quiet days and a thinner margin. Now and then someone fakes a card.', { d: 1.02, ch: 0.985, risk: [3, 1.5, 'Someone found a way to fake your concession cards.'] }, 0.8)] },

  { id: 'pricing_grandfather', group: 'customers', name: 'Grandfathering old customers', blurb: 'Grandfathering means letting existing customers keep their old price when you raise prices for new ones.', options: [
    opt('Prices rise for everyone', 'Old and new customers pay the same new price.', {}),
    opt('Honour old prices for a year', 'Loyal customers get a year of the old price, then move across.', { ch: 0.98, risk: [3, 1, 'Long-standing customers complained when their old price ran out.'] }, 0.3),
    opt('Keep loyal customers on old prices', 'Your oldest customers never pay more. They stay and they tell friends, and you give up income.', { ch: 0.97, rep: 0.02 }, 0.5)] },

  { id: 'pricing_minprice', group: 'customers', stock: true, name: 'Minimum-price rules for resellers', blurb: 'Resellers sell your goods in their shops. A minimum advertised price stops them undercutting each other and wrecking your brand.', options: [
    opt('Resellers choose their own prices', 'They compete freely, and you cannot control it.', {}),
    opt('Minimum advertised price', 'Resellers may not advertise below a set price. Your brand stays smart, and some sales slip away.', { br: 1.001, d: 0.993 }, 0.15),
    opt('Strict price enforcement', 'Resellers who undercut lose their supply. In the UK, forcing a fixed resale price can break competition law, so the risk is real.', { br: 1.002, d: 0.985, risk: [8, 6, 'A reseller complained about your price rules, and you paid lawyers to defend them.'] }, 0.3)] },

  { id: 'pricing_warrantyprice', group: 'customers', stock: true, name: 'Extended-warranty pricing', blurb: 'Sell cover that lasts longer than the standard warranty. It is pure extra income if nothing breaks, and costs you when things do.', options: [
    opt('Standard warranty only', 'You offer no extra cover.', {}),
    opt('Sell extended cover as an add-on', 'Customers who want peace of mind pay extra. Claims come in, now and then in a wave.', { risk: [6, 3, 'A wave of extended-warranty claims came in.'] }, -0.5),
    opt('Include extended cover in the price', 'Everyone gets longer cover, which makes your product look safer. Claims cost you.', { d: 1.015, risk: [8, 4, 'A batch of extended-warranty claims came in all at once.'] }, 0.4)] },

  { id: 'pricing_freeship', group: 'customers', stock: true, name: 'Free-shipping threshold', blurb: 'Free delivery once the basket reaches a set total nudges people to add a little more.', options: [
    opt('Customers pay for delivery', 'Delivery is charged on every order.', {}),
    opt('Free above a high basket total', 'Shoppers add one more item to qualify. You pay for delivery on bigger baskets.', { d: 1.01 }, 0.4),
    opt('Free delivery on everything', 'Orders pour in, and every delivery comes out of your pocket.', { d: 1.025, ch: 0.99 }, 1.3)] },
];

export const events: EvSpec[] = [
  { id: 'e9_pricing_advance', title: 'You need to put prices up', icon: 'chart', good: false, per: 2, cd: 24,
    story: 'Your costs have crept up and your prices have not, so you must raise them. The question is how you tell people. Announcing a rise well in advance gives customers time to get used to it, and also time to shop around.', choices: [
      S('ahead', 'Announce it three months ahead', 'Honest and fair, but some customers will look around.', 'People grumbled, yet they respected the notice, and the rise went through smoothly.', { eff: { c: E(0.99, 8), rep: 1, d: E(0.99, 3) } }),
      S('quiet', 'Raise prices quietly', 'A bigger boost, with a risk of anger if people notice.', '', { gamble: { p: 0.5, good: { c: E(0.98, 8) }, bad: { c: E(0.99, 8), rep: -3, d: E(0.97, 3) }, goodText: 'Hardly anyone noticed, and your margins improved.', badText: 'A customer spotted it and posted about it, and trust took a knock.' } }),
      S('delay', 'Delay and absorb the costs', 'Free for now, and your margins keep shrinking.', 'You held prices for now, and your margin took the strain.', { eff: { c: E(1.015, 4) } })] },

  { id: 'e9_pricing_codeleak', title: 'A discount code leaks online', icon: 'key', good: false, per: 2, cd: 16,
    story: 'A code meant for a few friends and staff has been posted on a coupon website. Thousands of people are using it, and the discount is eating into your profit. This is called discount-code leakage.', choices: [
      S('cancel', 'Cancel the code at once', 'Stops the losses, and annoys people with a half-filled basket.', 'The code stopped working, and a few shoppers complained loudly.', { eff: { rep: -1, d: E(0.99, 2) } }),
      S('limit', 'Limit it to one use per customer', 'A fix that costs a little to build.', 'You capped each code at one use, and the abuse stopped.', { k: 0.01, eff: { d: E(1.01, 2) } }),
      S('ride', 'Let it run for the week', 'You gain new customers and lose margin.', '', { gamble: { p: 0.5, good: { d: E(1.03, 2), brand: 1.005 }, bad: { c: E(1.02, 3) }, goodText: 'The rush brought lots of new customers, and many stayed.', badText: 'Most users were bargain hunters who never came back.' } })] },

  { id: 'e9_pricing_pricewar', title: 'A rival slashes their prices', icon: 'flame', good: false, per: 2, cd: 20, gate: 'rivals',
    story: 'A rival has cut prices sharply and told everyone about it. You must decide how far to follow. Each step down the ladder costs you margin, and a price war can leave everybody poorer.', choices: [
      S('hold', 'Hold your prices', 'Keeps your margin, and some customers leave.', 'You held firm. Some customers left, and the loyal ones stayed.', { eff: { d: E(0.97, 4) } }),
      S('match', 'Match them for a while', 'Keeps your customers, and costs margin.', 'You matched the cut, and customers stayed, though profits shrank.', { eff: { c: E(1.02, 4) } }),
      S('undercut', 'Undercut them', 'Aggressive: a gamble that may escalate the war.', '', { k: 0.02, acct: 'marketing', gamble: { p: 0.4, good: { d: E(1.04, 3), rep: 1 }, bad: { c: E(1.04, 4), d: E(0.98, 3) }, goodText: 'The rival backed off, and you took some of their customers.', badText: 'They cut again, and both firms were left bleeding.' } })] },

  { id: 'e9_pricing_seasonrise', title: 'The busy season is coming', icon: 'chart', good: true, per: 2, cd: 12,
    story: 'Your busiest months are close. Demand will be strong, and a small price rise now would earn extra income. A big rise earns more, and some regulars will remember it when the season is over.', choices: [
      S('big', 'Raise prices sharply', 'More income now, and some regulars feel cheated.', '', { gamble: { p: 0.6, good: { c: E(0.98, 4) }, bad: { c: E(0.99, 4), rep: -2, d: E(0.97, 3) }, goodText: 'Demand was so strong that the rise barely dented sales.', badText: 'Regulars noticed, and some went elsewhere.' } }),
      S('small', 'A modest seasonal rise', 'A steady extra, with little fuss.', 'A small rise brought a pleasant extra and no complaints.', { eff: { c: E(0.99, 4) } }),
      S('hold', 'Hold your prices', 'Goodwill with regulars, and no extra income.', 'Regulars noticed you did not take advantage, and said so.', { eff: { rep: 1 } })] },

  { id: 'e9_pricing_transparency', title: 'Customers say your prices are confusing', icon: 'shield', good: false, per: 2, cd: 18,
    story: 'Customers say they were surprised by extra charges at the end of buying, and they are posting about it. Price transparency means being clear about the full cost from the start, so nobody gets a nasty surprise.', choices: [
      S('simple', 'Show the full price from the start', 'Costs a little to rebuild, and wins trust.', 'Customers noticed that the price they saw was the price they paid.', { k: 0.015, eff: { rep: 2, d: E(1.01, 4) } }),
      S('explain', 'Explain the charges better', 'Cheap, and only partly works.', 'A clearer explanation calmed some people down.', { eff: { rep: 1 } }),
      S('defend', 'Defend your pricing', 'Free, and risks a bigger row.', '', { gamble: { p: 0.4, good: { rep: 1 }, bad: { rep: -3 }, goodText: 'The row died down within days.', badText: 'It grew into a news story about hidden fees.' } })] },

  { id: 'e9_pricing_surcharge', title: 'Card fees and fuel bills climb', icon: 'bolt', good: false, per: 2, cd: 20,
    story: 'Your bank now charges more for every card payment, and fuel for deliveries has jumped. A surcharge is an extra line on the bill to cover costs like these, and customers rarely like seeing one.', choices: [
      S('surcharge', 'Add a visible surcharge', 'Recovers the cost, and some customers grumble.', 'The surcharge covered the cost, and a few customers made a fuss.', { eff: { c: E(0.99, 6), rep: -1, d: E(0.99, 3) } }),
      S('build', 'Fold it into your prices', 'Simpler, and a slightly higher price all round.', 'A small rise folded into your prices went unnoticed by most.', { eff: { d: E(0.995, 6) } }),
      S('absorb', 'Absorb the cost', 'Customers stay happy, and your margin does not.', 'You paid the extra yourself, and customers appreciated it.', { eff: { c: E(1.02, 6), rep: 1 } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'pricing_elasticity', name: 'Price test by customer group', k: 0.3, months: 4, success: 70,
    blurb: 'Elasticity means how much demand changes when your price changes. Test prices on different groups of customers to find the sweet spot for each.',
    win: { eff: { d: 1.01 }, text: 'You found groups who will happily pay more and groups who need a lower price, and your prices now fit each.' },
    lose: { now: { d: E(0.98, 2), rep: -1 }, text: 'The test confused people, who saw different prices for the same thing and said so loudly.' } },

  { id: 'pricing_bundles', name: 'Service bundles', k: 0.5, months: 5, success: 70,
    blurb: 'Package several of your services at one price, so that customers buy more of them together.',
    win: { eff: { d: 1.01, ch: 0.98 }, monthly: 0.3, text: 'Bundles are selling well, and customers who take them stay longer.' },
    lose: { now: { d: E(0.98, 3) }, text: 'Customers could not see the point of the bundles, and some were annoyed that their favourite single service had gone.' } },

  { id: 'pricing_escalation', name: 'Price-escalation clauses', k: 0.5, months: 6, success: 70,
    blurb: 'A price-escalation clause in a long contract lets you raise the price if your costs rise. Customers do not always like signing them.',
    win: { eff: { c: 0.994, d: 0.995 }, text: 'Your contracts now move with your costs, though a few buyers asked for another supplier.' },
    lose: { now: { rep: -1 }, text: 'Your biggest customers refused to sign, and the lawyers charged by the hour.' } },

  { id: 'pricing_currencylist', name: 'Currency-linked price list', k: 0.4, months: 5, success: 65,
    blurb: 'Set your prices to move with exchange rates, so that a falling pound does not wreck your profit when you buy from abroad. Prices will wobble more.',
    win: { eff: { c: 0.994, rep: -0.01 }, monthly: 0.1, text: 'Your price list now follows the exchange rate, and your margin no longer swings with it.' },
    lose: { now: { d: E(0.98, 3) }, text: 'The new price list had bugs, and customers saw some very odd prices.' } },

  { id: 'pricing_regional', name: 'Regional price zones', k: 0.4, months: 5, success: 65,
    blurb: 'Charge different prices in different parts of the country, because what people can afford and what rivals charge varies from place to place.',
    win: { eff: { d: 1.012 }, monthly: 0.2, text: 'Cheaper prices in tough areas brought in more customers, and dearer ones elsewhere paid for it.' },
    lose: { now: { rep: -1, d: E(0.98, 3) }, text: 'Customers compared prices between towns and some felt cheated.' } },

  { id: 'pricing_tradein', name: 'Trade-in credit scheme', stock: true, k: 0.5, months: 5, success: 70,
    blurb: 'Give customers credit when they hand in an old product. It works like a discount, but it keeps your list price looking high and brings old stock back to you.',
    win: { eff: { d: 1.012, ch: 0.985, c: 1.002 }, monthly: 0.4, text: 'Trade-ins brought customers back to you, and the old stock resold well enough.' },
    lose: { now: { c: E(1.015, 3) }, text: 'Few people brought anything in, and the old stock you did take back was hard to resell.' } },

  { id: 'pricing_addons', name: 'Add-on and upsell menu', k: 0.3, months: 4, success: 70,
    blurb: 'Offer extras alongside your main product, such as better support, faster delivery or accessories, so that each customer spends a little more.',
    win: { eff: { d: 0.997 }, monthly: -0.5, text: 'A tidy menu of extras lifted what each customer spends, though a few found it pushy.' },
    lose: { now: { rep: -1 }, text: 'Customers found the extras pushy, and it hurt your name.' } },

  { id: 'pricing_annualreview', name: 'Annual price review', k: 0.2, months: 2, success: 80,
    blurb: 'Once a year, sit down with the numbers and decide which prices should rise, fall or stay put. Most firms keep putting it off.',
    win: { eff: { c: 0.995 }, text: 'You found prices that had been left alone for years, and put them right.' },
    lose: { now: { morale: -1 }, text: 'The meeting turned into an argument about who set which price, and nothing changed.' } },
];
