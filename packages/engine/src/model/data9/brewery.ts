import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Craft brewery. Everything here is only available to that sector. Every id must start with "brewery_" (policies and initiatives) or "e9_brewery_" (events). */
export const policies: PolicyDef[] = [
  { id: 'brewery_hop_contracts', group: 'ops', name: 'Hop buying', blurb: 'Hops are the flowers that give beer its bitterness and aroma, and their price swings with each harvest. A forward contract fixes a price months ahead.', options: [
    off,
    opt('Forward contract', 'Lock in next year\'s hops at today\'s price. Steady costs, with a small premium for the certainty.', { c: 0.99 }, 0.2, 0.2),
    opt('Buy on the spot market', 'Buy hops when you need them. Cheaper in a good year, painful after a bad harvest.', { c: 0.98, risk: [10, 2, 'A poor harvest sent the price of hops through the roof.'] }, 0)] },

  { id: 'brewery_brew_schedule', group: 'ops', name: 'Brew schedule', blurb: 'A tank is tied up for weeks while beer ferments. The schedule decides how many tanks you fill and how often.', options: [
    off,
    opt('Steady weekly brews', 'Brew a regular amount every week. Predictable stock and fewer rushed batches.', { cap: 1.02, q: 0.01 }, 0.2),
    opt('Run tanks flat out', 'Fill every tank the moment it empties. More beer, but rushed beer, and a mistake costs more.', { cap: 1.05, q: -0.02, risk: [6, 2, 'A rushed batch went wrong and had to be tipped away.'] }, 0.1)] },

  { id: 'brewery_seasonal_beers', group: 'customers', name: 'Seasonal and limited beers', blurb: 'A limited beer is brewed once and then gone. It gets drinkers talking, but small batches are fiddly and unsold ones are hard to shift.', options: [
    off,
    opt('Four seasonal beers', 'A new beer each season. Pubs like having something fresh to put on.', { d: 1.015, q: 0.01 }, 0.3),
    opt('Monthly limited releases', 'A fresh one-off every month. Big buzz and a loyal fan club, but constant recipe changes and leftover kegs.', { d: 1.03, c: 1.015, m: -0.2 }, 0.6)] },

  { id: 'brewery_tie_deals', group: 'customers', name: 'Pub tie-ins', blurb: 'A tie is a deal where a pub agrees to sell your beer, often because you lend it money or fittings. You get steady orders, but give up some price.', options: [
    off,
    opt('Guest-ale slots', 'Pubs reserve a handpull for your beer now and then. A modest boost with little commitment.', { d: 1.015 }, 0.15),
    opt('Tied pubs', 'A few pubs sell only your beer in return for loans and discounts. Steady volume, thin margins and cash tied up.', { d: 1.035, c: 1.015 }, 0.4, 0.4)] },

  { id: 'brewery_taproom_hours', group: 'customers', name: 'Taproom opening hours', blurb: 'A taproom is a bar at the brewery that sells pints directly to drinkers. You keep the full retail price instead of selling cheaper kegs to pubs.', options: [
    off,
    opt('Weekend opening', 'Open Friday to Sunday. Good margins with only a few staff.', { d: 1.015, rep: 0.01 }, 0.3),
    opt('Open six days', 'Open almost every day. More pints sold and more chatter, but longer rotas and a stretched brew crew.', { d: 1.03, m: -0.3, rep: 0.02 }, 0.8)] },

  { id: 'brewery_duty_cash', group: 'ops', name: 'Excise-duty payments', blurb: 'Excise duty is a tax on alcohol, paid to the taxman by a set date each month. Miss it and you pay penalties.', options: [
    off,
    opt('Set aside duty monthly', 'Park the duty in a separate account as you sell. Safe and tidy, but the cash cannot be used elsewhere.', { od: 0.95 }, 0.1),
    opt('Pay at the deadline', 'Keep the cash working until the last day. Helps cash flow, but one slip means a fine.', { od: 1.1, risk: [6, 2.5, 'You missed a duty deadline and paid a penalty.'] }, 0)] },

  { id: 'brewery_contract_brewing', group: 'ops', name: 'Contract brewing', blurb: 'Contract brewing means brewing beer for another brand using your spare tank space. It fills idle kit, but their recipes take over your brew days.', options: [
    off,
    opt('Fill spare tanks', 'Brew for others only when tanks would otherwise sit empty. Small extra income.', { c: 0.99, q: -0.01 }, -0.1, 0.2),
    opt('Big contract client', 'A larger brand books half your tank time. Steady money, but your own beers get squeezed and your brewers get bored.', { c: 0.975, d: 0.98, m: -0.3 }, -0.2, 0.3)] },

  { id: 'brewery_water_treatment', group: 'ops', name: 'Water treatment', blurb: 'Beer is mostly water, so its minerals change the flavour. Treatment adjusts local water so it suits each style.', options: [
    off,
    opt('Carbon filter', 'Strips chlorine and strange tastes. Cheap and sensible.', { q: 0.015 }, 0.1, 0.1),
    opt('Full water profiling', 'Tune the minerals for each beer, as famous brewing towns do. Great taste, but the equipment and lab tests cost money.', { q: 0.03 }, 0.4, 0.5)] },

  { id: 'brewery_keg_deposit', group: 'ops', name: 'Keg returns', blurb: 'Kegs are steel barrels that you lend to pubs. Each costs real money to replace and many never come back.', options: [
    off,
    opt('Charge a deposit', 'Pubs pay a refundable deposit on every keg. Fewer lost kegs, though a few pubs grumble.', { c: 0.985, d: 0.995 }, 0.1),
    opt('Tag and track kegs', 'Barcode every keg and chase pubs for them. Almost no losses, but the tags and admin cost money.', { c: 0.975 }, 0.3, 0.3)] },

  { id: 'brewery_non_alcoholic', group: 'customers', name: 'Non-alcoholic range', blurb: 'Alcohol-free beer is a fast-growing corner of the market. Making it needs special kit, but drivers and health-minded drinkers love it.', options: [
    off,
    opt('One alcohol-free beer', 'A single alcohol-free beer sold alongside the range. A little extra interest.', { d: 1.012, rep: 0.01 }, 0.25, 0.3),
    opt('Full 0.5% range', 'Several alcohol-free beers on dedicated kit. Opens new customers but splits the brewers\' attention.', { d: 1.025, q: -0.01 }, 0.55, 0.6)] },

  { id: 'brewery_growler_refills', group: 'customers', name: 'Growler refill scheme', blurb: 'A growler is a reusable bottle that drinkers fill straight from the tap. It builds loyalty and cuts packaging, but the beer goes flat within days.', options: [
    off,
    opt('Taproom refills', 'Fill growlers at the taproom only. Regulars love it and bottles cost nothing.', { d: 1.01, rep: 0.01 }, 0.1, 0.1),
    opt('Refill stations in shops', 'Partner shops host tap towers. More reach, but stale beer risks your name.', { d: 1.025, risk: [7, 1.5, 'A shop served stale beer from your tap and customers complained.'] }, 0.3, 0.3)] },

  { id: 'brewery_tasting_panel', group: 'people', name: 'Staff tasting panel', blurb: 'A panel of staff tastes every batch before it ships, and has the power to say no. It catches faults early, but vetoed batches are lost money.', options: [
    off,
    opt('Advisory panel', 'Staff taste and give opinions. Brewers still have the last word.', { q: 0.015, m: 0.2 }, 0.1),
    opt('Panel can veto batches', 'Anything the panel dislikes is dumped. Excellent quality, and some batches go down the drain.', { q: 0.03, c: 1.015, m: 0.3 }, 0.2)] },
];

export const events: EvSpec[] = [
  { id: 'e9_brewery_hop_harvest', title: 'Hop harvest shock', icon: 'leaf', good: false, per: 1.5, cd: 24, story: 'Bad weather has ruined the hop harvest in the countryside. Hop growers are doubling prices, and your best-selling pale ale needs a lot of them.', choices: [
    S('stock', 'Buy a year\'s hops now', 'Costs a lot upfront, shields you from the spike.', 'You paid a fortune up front, but the rest of the year ran at yesterday\'s prices.', { k: 0.06, eff: { c: E(0.98, 6) } }),
    S('swap', 'Switch to cheaper hop varieties', 'Free, but the taste changes.', '', { gamble: { p: 0.55, good: { c: E(0.99, 4) }, bad: { quality: -1, d: E(0.97, 3) }, goodText: 'Drinkers barely noticed, and the swap saved money.', badText: 'Regulars said the beer tasted different, and some switched to rivals.' } }),
    S('absorb', 'Absorb the price rise', 'No change for drinkers, a worse margin.', 'You kept recipes and prices the same and swallowed higher costs.', { eff: { c: E(1.04, 5) } })] },

  { id: 'e9_brewery_supermarket', title: 'A supermarket wants your beer', icon: 'parcel', good: true, per: 1.5, cd: 24, story: 'A national supermarket chain wants to stock your beer in cans. The volumes are huge, but they will squeeze your price and pay slowly.', choices: [
    S('accept', 'Accept their terms', 'Big volume, thin margin, slow payment.', 'Orders flooded in, but every can earned less than a pub keg.', { eff: { d: E(1.05, 8), c: E(1.03, 8) }, k: 0.03 }),
    S('negotiate', 'Negotiate a limited listing', 'A few stores, better price.', '', { k: 0.015, gamble: { p: 0.55, good: { d: E(1.03, 6), brand: 1.02 }, bad: { d: E(1.01, 4) }, goodText: 'They agreed to a regional listing at a fair price.', badText: 'They walked away from the talks, and left you a tiny order.' } }),
    S('decline', 'Stay with pubs and taprooms', 'Keep the margins, skip the volume.', 'You kept your beer exclusive to pubs and your own bar.')] },

  { id: 'e9_brewery_contamination', title: 'Yeast contamination scare', icon: 'shield', good: false, per: 1, cd: 30, story: 'A batch has gone sour. Wild yeast, a rogue microbe that spoils beer, has got into a fermenter, and some of the infected beer may already be in pubs.', choices: [
    S('recall', 'Recall the batch and deep clean', 'Costly and honest, protects your name.', 'You pulled the kegs, scrubbed every tank and told pubs why. They trusted you more for it.', { k: 0.06, eff: { rep: 1, quality: 1 } }),
    S('sampling', 'Test and ship what passes', 'Cheaper, but you may miss bad kegs.', '', { k: 0.02, gamble: { p: 0.55, good: { quality: 1 }, bad: { rep: -3, d: E(0.95, 4) }, goodText: 'Lab tests cleared most kegs, and the clean-up held.', badText: 'A sour keg reached a pub and the landlord posted about it.' } }),
    S('quiet', 'Say nothing and carry on', 'Free, with a real risk.', '', { gamble: { p: 0.4, good: {}, bad: { rep: -4, d: E(0.93, 5), morale: -2 }, goodText: 'Nobody noticed.', badText: 'More bad kegs surfaced and the cover-up became the story.' } })] },

  { id: 'e9_brewery_festival', title: 'Beer festival medal', icon: 'star', good: true, per: 1.5, cd: 16, story: 'A big beer festival has invited you to enter your amber ale into its judging. A medal can sell a lot of beer, and the entry fee and travel are not free.', choices: [
    S('enter', 'Enter and run a stand', 'Costs fees and time, with a shot at glory.', '', { k: 0.03, gamble: { p: 0.55, good: { rep: 3, brand: 1.03, d: E(1.03, 6) }, bad: { morale: -1 }, goodText: 'A gold medal! Pubs rang up asking for kegs.', badText: 'No medal this time, but a few new drinkers found you.' } }),
    S('judge', 'Enter the beer only', 'A cheaper entry with less exposure.', '', { k: 0.01, gamble: { p: 0.45, good: { rep: 2, d: E(1.015, 4) }, bad: {}, goodText: 'Your beer took bronze.', badText: 'It did not place.' } }),
    S('skip', 'Skip the festival', 'Save your cash.', 'You stayed home and brewed.')] },

  { id: 'e9_brewery_licence', title: 'Licensing visit', icon: 'key', good: false, per: 1, cd: 30, story: 'The council has called to check your alcohol licence conditions: opening hours, who you serve and how you handle noise. Neighbours have been grumbling about late taproom nights.', choices: [
    S('comply', 'Close earlier and soundproof', 'Costs money and hours, keeps the licence safe.', 'You trimmed late hours and fitted door seals. The council signed off.', { k: 0.03, eff: { rep: 1, d: E(0.99, 3) } }),
    S('appeal', 'Argue for your current hours', 'Free, risky.', '', { gamble: { p: 0.55, good: { rep: 1 }, bad: { rep: -2, d: E(0.96, 4) }, goodText: 'The council accepted your reasoning.', badText: 'They imposed tougher conditions and your taproom lost its busiest hours.' } }),
    S('community', 'Host a neighbours\' open evening', 'Cheap goodwill.', 'Neighbours tried the beer, and complaints went quiet.', { k: 0.01, eff: { rep: 1 } })] },

  { id: 'e9_brewery_collab', title: 'Collab brew offer', icon: 'heart', good: true, per: 1.5, cd: 14, story: 'A well-loved brewery from another city wants to brew a collab beer with you. Two fan bases will see it, but brewing together means compromise on recipe and cost.', choices: [
    S('yes', 'Brew it together', 'Costs a brew day and ingredients.', '', { k: 0.02, gamble: { p: 0.7, good: { brand: 1.03, d: E(1.03, 4), rep: 1 }, bad: { morale: -1 }, goodText: 'The collab sold out in a fortnight.', badText: 'The beer was merely okay, and the buzz fizzled.' } }),
    S('swap', 'Swap a keg and promote each other', 'A cheap, small boost.', 'You each pushed the other\'s beer and shared some fans.', { eff: { d: E(1.01, 3) } }),
    S('no', 'Politely decline', 'No change.', 'You stayed with your own recipes.')] },

  { id: 'e9_brewery_export', title: 'An importer abroad asks', icon: 'globe', good: true, per: 1, cd: 24, story: 'An importer in another country wants a pallet of your beer. Shipping, paperwork and customs take weeks, and they may pay slowly.', choices: [
    S('ship', 'Ship a full pallet', 'Big orders, big risk.', '', { k: 0.03, gamble: { p: 0.6, good: { d: E(1.04, 8), brand: 1.02 }, bad: { c: E(1.02, 4), rep: -1 }, goodText: 'The importer reordered, and your beer found a new market.', badText: 'A paperwork mix-up left kegs stuck at the port.' } }),
    S('small', 'Send a trial shipment', 'Low risk, small upside.', 'A small trial opened the door, without risking much.', { k: 0.01, eff: { d: E(1.015, 6) } }),
    S('decline', 'Stay local', 'No change.', 'You focused on home pubs.')] },

  { id: 'e9_brewery_stuck_batch', title: 'Stuck fermentation', icon: 'flame', good: false, per: 1.5, cd: 20, story: 'A big batch has stopped fermenting halfway. The yeast has gone to sleep, leaving sweet, flat beer in a tank you need for the next brew.', choices: [
    S('restart', 'Add fresh yeast and warm the tank', 'Cheap, but might not work.', '', { k: 0.01, gamble: { p: 0.6, good: { quality: 1 }, bad: { c: E(1.02, 3) }, goodText: 'Fresh yeast woke up and finished the job.', badText: 'It never recovered, and you tipped it away.' } }),
    S('dump', 'Tip the batch and start again', 'Costly but clean.', 'You wasted a batch of ingredients, but the tank was free again.', { k: 0.04 }),
    S('blend', 'Blend it into a cheaper beer', 'Saves money, hurts quality.', 'The odd batch was blended away, and nobody got sick.', { eff: { quality: -1, c: E(0.995, 2) } })] },

  { id: 'e9_brewery_craft_vs_mass', title: 'Big lager brand spots a gap', icon: 'chart', good: false, per: 1, cd: 30, story: 'A giant lager brand is selling a cheap fake-craft beer to your pubs. Drinkers cannot always tell the difference, and the pubs love the discount.', choices: [
    S('match', 'Cut your prices', 'Fights for volume, costs margin.', 'You matched the discounts and kept the pubs, but at lower margins.', { eff: { d: E(1.02, 5), c: E(1.025, 5) } }),
    S('story', 'Tell your story on the labels', 'A modest cost, a lasting benefit.', 'You printed the brewer\'s name and the water source on every keg, and loyal fans stuck with you.', { k: 0.02, eff: { brand: 1.02 } }),
    S('ignore', 'Ignore them', 'Free, but you lose some pubs.', 'You kept brewing, and a few pubs drifted away.', { eff: { d: E(0.97, 5) } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'brewery_bottling_line', name: 'Bottling line', k: 2.2, months: 9, success: 60, stock: true,
    blurb: 'A bottling line fills and caps bottles automatically. It opens shops and supermarkets, not just pubs, but costs a lot and must run full to pay back.',
    win: { eff: { d: 1.03, cap: 1.02 }, now: { brand: 1.02 }, text: 'The line ran smoothly and shops began stocking your bottles.' },
    lose: { now: { morale: -2, rep: -1 }, text: 'The line jammed and kept breaking glass, so you sold it back at a loss.' } },

  { id: 'brewery_barrel_ageing', name: 'Barrel-ageing programme', k: 1.4, months: 12, success: 60, stock: true,
    blurb: 'Ageing beer in old whisky or wine barrels for a year makes rich, expensive beer. But your cash and the barrels are tied up for a long time.',
    win: { eff: { q: 0.02, d: 1.02 }, monthly: 0.3, now: { rep: 2 }, text: 'The aged beers earned rave reviews and top prices.' },
    lose: { now: { rep: -1, d: E(0.98, 3) }, text: 'A bad barrel soured the whole batch and the cash was stuck for a year.' } },

  { id: 'brewery_tour_tasting', name: 'Brewery tours and tasting nights', k: 0.5, months: 4, success: 75,
    blurb: 'Sell tickets to tours where guests see the brewery, taste beers and buy a glass to keep. It earns money even when the tanks are full.',
    win: { eff: { d: 1.012 }, monthly: 0.25, now: { brand: 1.02 }, text: 'Tours sold out most weekends and visitors became regulars.' },
    lose: { now: { morale: -1 }, text: 'Few guests came, and the brewers were fed up with explaining mash tuns.' } },

  { id: 'brewery_cider_line', name: 'Cider side line', k: 0.8, months: 6, success: 65,
    blurb: 'Cider is fermented apple juice and takes little extra kit. It sells well in summer, when beer drinkers want something lighter.',
    win: { eff: { d: 1.02 }, monthly: 0.2, text: 'The cider was a summer success and filled idle tanks.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'The cider tasted thin, and pubs refused to reorder.' } },

  { id: 'brewery_brewpub', name: 'Open a brewpub', k: 2.5, months: 12, success: 50,
    blurb: 'A brewpub is a pub that brews its own beer on site. You keep the full pint price, but you take on a pub\'s rent, rota and licence headaches.',
    win: { eff: { d: 1.04, c: 0.99 }, monthly: 0.4, now: { brand: 1.03 }, text: 'The brewpub filled every night and promoted your beers.' },
    lose: { now: { rep: -2, morale: -3 }, text: 'The pub missed its sales targets and rent drained the brewery.' } },
];
