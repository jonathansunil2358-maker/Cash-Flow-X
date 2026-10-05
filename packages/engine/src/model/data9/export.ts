import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: International and export. Every id starts with "export_" (policies and projects) or "e9_export_" (events). */
export const policies: PolicyDef[] = [
  // 801 Choosing a first export market
  { id: 'export_firstmarket', group: 'customers', name: 'First export market', blurb: 'Where you plant your first flag abroad. Close markets are easy. Far-away ones are a bigger prize and a bigger gamble.', options: [
    opt('Home market only', 'Sell only in your own country and avoid the hassle.', {}),
    opt('A close neighbour', 'Same time zone, short shipping and familiar rules. A modest, steady extra trade.', { d: 1.012 }, 0.35, 0.5),
    opt('A big, distant market', 'A far larger prize, but longer shipping, a new language and plenty of surprises.', { d: 1.03, risk: [7, 3, 'Shipping delays and a cultural slip-up cost you sales in the far-away market.'] }, 0.9, 1.2)] },
  // 802 Local-agent versus own-subsidiary entry
  { id: 'export_entry', group: 'ops', name: 'Market-entry route', blurb: 'How you sell once you are abroad: through someone local, or with a company of your own.', options: [
    opt('Ship from home', 'Sell to overseas buyers by post and online, with no local presence.', {}),
    opt('Hire a local agent', 'Someone local sells for you on commission. Cheap to start, but you give up some control of your brand.', { d: 1.01, risk: [4, 2, 'Your overseas agent promised a customer something you cannot deliver.'] }, 0.4, 0.3),
    opt('Set up your own subsidiary', 'A small company of your own, with an office and staff abroad. Dearer, but you keep control and the profit.', { d: 1.025, rep: 0.02 }, 1, 1.5)] },
  // 803 Letters of credit and payment terms
  { id: 'export_terms', group: 'finance', name: 'Overseas payment terms', blurb: 'How you get paid by buyers abroad, where chasing a late bill is far harder than at home.', options: [
    opt('Standard 30-day invoices', 'Send an invoice and wait for the money, just as you do at home.', {}),
    opt('Letter of credit', 'The buyer\'s bank promises to pay you once the goods ship. Safe, and lenders like the paperwork, but buyers find it fiddly.', { d: 0.99, od: 1.1 }, 0.3, 0.2),
    opt('Generous credit terms', 'Give overseas buyers 90 days to pay. It wins orders, but some will pay late or not at all.', { d: 1.015, risk: [6, 4, 'An overseas customer paid very late, and part of the bill was never paid.'] }, 0.1)] },
  // 804 Export-credit insurance
  { id: 'export_creditcover', group: 'finance', name: 'Export-credit insurance', blurb: 'A policy that pays out if an overseas customer cannot pay their bill.', options: [
    opt('No cover', 'Take the risk of unpaid overseas bills yourself.', {}),
    opt('Cover your biggest buyers', 'A policy covers your major overseas customers, so you trade a little more boldly with them.', { d: 1.008, od: 1.04 }, 0.3),
    opt('Cover every overseas sale', 'Full protection. Pricey, but lenders trust you more and you can say yes to new buyers.', { d: 1.015, od: 1.1 }, 0.75)] },
  // 805 Shipping incoterms choices
  { id: 'export_incoterms', group: 'ops', name: 'Shipping terms', blurb: 'Standard shipping terms, called Incoterms, say who pays for transport and insurance and who carries the risk if goods get lost or damaged.', options: [
    opt('Buyer collects', 'You hand goods over at your own door and the buyer arranges the rest. No risk for you, but many buyers want an easier deal.', {}),
    opt('You pay to the port', 'You cover the journey to the port and the buyer takes over from there. Buyers like the saving on the first leg.', { d: 1.01 }, 0.3),
    opt('Delivered to their door', 'You pay and arrange everything, including import tax. Buyers love it, but a hold-up at customs becomes your bill.', { d: 1.025, rep: 0.01, risk: [5, 3, 'A shipment was held up at customs and you had to pay the extra bill.'] }, 0.8)] },
  // 806 Local-language packaging
  { id: 'export_language', group: 'customers', name: 'Local-language packaging', blurb: 'Packs, manuals and websites in the buyer\'s own language.', options: [
    opt('English only', 'One set of packs for everyone. Cheap, and a lot of people will not read it.', {}),
    opt('Quick machine translation', 'Cheap and cheerful. It works most of the time, and now and then it goes very wrong.', { d: 1.01, risk: [4, 1.5, 'A clumsy translation on your packs went viral for the wrong reasons.'] }, 0.1, 0.2),
    opt('Professional localisation', 'Native speakers rewrite every pack, manual and web page. Customers feel at home and trust you more.', { d: 1.02, rep: 0.02 }, 0.4, 0.8)] },
  // 808 Currency-hedging policy
  { id: 'export_hedge', group: 'finance', name: 'Currency-hedging policy', blurb: 'Hedging means agreeing an exchange rate in advance, so a swing in the currency cannot wreck a deal. It costs a fee, like insurance.', options: [
    opt('Take what the market gives', 'Do nothing and accept whichever exchange rate turns up on the day.', {}),
    opt('Hedge half your exposure', 'Fix the rate for about half of your overseas sales. Steadier prices mean fewer customers walk away.', { ch: 0.99 }, 0.2),
    opt('Hedge everything', 'Fix every rate. Dull, expensive, and your bank loves the predictability.', { ch: 0.985, od: 1.05 }, 0.45),
    opt('Speculate on the currency', 'Bet on which way the exchange rate will move. A tidy gain when you are right and a painful loss when you are wrong.', { risk: [10, 4, 'You bet the wrong way and lost money on exchange rates.'] }, -0.6)] },
  // 812 Time-zone support teams
  { id: 'export_supportdesk', group: 'customers', name: 'Time-zone support desk', blurb: 'Overseas customers wake up when your office is asleep. Decide how much cover they get.', options: [
    opt('Office hours only', 'Answer overseas customers when you are at your desk.', {}),
    opt('Extended email cover', 'Overseas emails are answered within a few hours, even overnight, by staff on a rota.', { ch: 0.99, d: 1.005 }, 0.3),
    opt('Support teams in other time zones', 'Real people answering when your overseas customers are awake. Customers stay and the bill grows.', { ch: 0.98, d: 1.01, m: -0.1 }, 0.85)] },
  // 814 Overseas-warehouse stocking
  { id: 'export_warehouse', group: 'ops', stock: true, name: 'Overseas warehouse', blurb: 'Keep stock close to your overseas customers so orders arrive in days, not weeks.', options: [
    opt('Ship each order from home', 'Every parcel crosses the border one by one. Slow, but you carry no stock abroad.', {}),
    opt('Rent shelf space abroad', 'A local logistics firm stores and posts your goods. Faster delivery and a fee on every box.', { d: 1.01 }, 0.4, 0.5),
    opt('Run your own overseas warehouse', 'Your own stock near your customers. Quick and cheaper per parcel, but stock can go missing or get stuck.', { d: 1.02, c: 0.995, risk: [4, 3, 'Stock went missing or got stuck in your overseas warehouse.'] }, 1, 1.5)] },
  // 818 Repatriating profits
  { id: 'export_profits', group: 'finance', name: 'Repatriating profits', blurb: 'Repatriating means bringing your overseas profits back home. You can also leave them abroad to grow.', options: [
    opt('Leave it where it lands', 'Overseas profit sits in a foreign bank account until you decide what to do with it.', {}),
    opt('Bring profits home each quarter', 'Cash arrives where you can use it. Bank charges, tax and exchange rates take a nibble, but your bank can see the money.', { od: 1.05 }, 0.2),
    opt('Reinvest abroad', 'Keep profits overseas to grow the foreign business. It pays off, unless local rules trap the money.', { d: 1.012, cap: 1.005, risk: [3, 3, 'New local rules left some of your overseas money stuck.'] }, 0.2)] },
  // 821 International-brand consistency
  { id: 'export_brandrules', group: 'customers', name: 'International brand rules', blurb: 'Should your brand look and sound identical everywhere, or bend to suit each country?', options: [
    opt('Let each market do its own thing', 'Local teams decide their own look and tone.', {}),
    opt('One strict global brand book', 'The same look, tone and logo everywhere. Easy to recognise, but it can feel foreign to local shoppers.', { br: 1.002, rep: 0.02, d: 0.99 }, 0.2),
    opt('Local flavour on a shared core', 'Each market adapts the brand to local taste. Locals like it, though the brand gets a little muddled.', { d: 1.012, rep: -0.02 }, 0.15)] },
];

export const events: EvSpec[] = [
  // 809 Trade-fair presence abroad
  { id: 'e9_export_tradefair', title: 'A big trade fair abroad', icon: 'globe', good: true, per: 1.5, cd: 14,
    story: 'A huge trade fair is being held abroad this autumn, where buyers from a whole region meet suppliers. A stand is dear, but a handshake with the right buyer can be worth a year of sales.', choices: [
      S('stand', 'Book your own stand', 'Expensive, with a good chance of paying off.', '', { k: 0.04, acct: 'marketing', gamble: { p: 0.65, good: { d: E(1.04, 8), brand: 1.01 }, bad: { morale: -1 }, goodText: 'Buyers queued at your stand and orders followed.', badText: 'The fair was quiet and your costly stand got a few polite nods.' } }),
      S('share', 'Share a stand with other firms', 'Cheaper, with a steadier result.', 'A shared stand cost less and still brought some solid leads.', { k: 0.015, acct: 'marketing', eff: { d: E(1.015, 6) } }),
      S('visit', 'Walk the halls as a visitor', 'Cheap, and a good way to learn the market.', 'You learned what buyers wanted and who your rivals were, without paying for a stand.', { k: 0.005, acct: 'marketing', eff: { quality: 0.5 } })] },
  // 810 Customs-broker costs
  { id: 'e9_export_customsbill', title: 'Stuck at customs', icon: 'parcel', good: false, per: 1.5, cd: 16, gate: 'stock',
    story: 'Your shipment has been stopped at the border because the forms were filled in wrongly. A customs broker is a specialist who files the paperwork and pays the import taxes for you. They cost money, but they know the rules.', choices: [
      S('broker', 'Hire a customs broker for good', 'A steady fee, and no more stuck shipments.', 'The broker cleared your goods in a day and now handles every shipment, so nothing gets stuck again.', { k: 0.02, acct: 'otherCosts', eff: { d: E(1.01, 8) } }),
      S('diy', 'Sort it out yourself', 'Free if you get it right, dear if you do not.', '', { gamble: { p: 0.5, good: {}, bad: { d: E(0.97, 3), c: E(1.02, 3) }, goodText: 'After a long day on the phone, you got the goods released with no penalty.', badText: 'You got a form wrong again, and storage fees and delays piled up.' } }),
      S('pay', 'Pay the fine and learn the rules', 'A painful lesson, but a lesson.', 'You paid the penalty and learned the rules the hard way. Next time will go smoother.', { k: 0.035, acct: 'otherCosts' })] },
  // 813 Cultural-misstep brand crises
  { id: 'e9_export_misstep', title: 'A cultural blunder abroad', icon: 'camera', good: false, per: 1, cd: 24,
    story: 'Your latest overseas advert has gone viral for all the wrong reasons. A slogan that sounded clever at home means something rude in the local language, and the colour on your packs is linked to funerals there.', choices: [
      S('sorry', 'Apologise publicly and fast', 'Cheap and sincere.', 'A swift, humble apology went down well, and the story faded in days.', { k: 0.015, acct: 'marketing', eff: { rep: 1 } }),
      S('rework', 'Pull the campaign and hire a local expert', 'Costs more, and lands far better the second time.', 'Locals helped rebuild the campaign, and the new version landed far better than the first.', { k: 0.04, acct: 'marketing', eff: { brand: 1.015, d: E(1.01, 6) } }),
      S('defend', 'Defend it as a joke that got lost', 'A bold gamble, and not a nice one.', '', { gamble: { p: 0.3, good: { brand: 1.02 }, bad: { rep: -3, d: E(0.95, 4) }, goodText: 'The row turned into free publicity.', badText: 'The row got worse and a boycott followed.' } })] },
  // 816 Sanctions and embargo exposure
  { id: 'e9_export_sanctions', title: 'New sanctions land', icon: 'shield', good: false, per: 0.8, cd: 30,
    story: 'The government has banned trade with a country where one of your customers lives. These bans are called sanctions, and breaking them can bring huge fines. Some of your shipments are already on their way.', choices: [
      S('stop', 'Stop all trade at once', 'Safe, but you lose the sales.', 'You stopped at once. The lost sales hurt, but no lawyers ever called.', { eff: { d: E(0.97, 6) } }),
      S('lawyer', 'Pay a lawyer to check every order', 'Costs money, and saves most of the business.', 'The lawyer sorted allowed orders from banned ones, and you kept most of your business.', { k: 0.03, acct: 'otherCosts', eff: { d: E(0.99, 4), rep: 1 } }),
      S('carry', 'Carry on and hope nobody notices', 'A very dangerous gamble.', '', { gamble: { p: 0.25, good: { d: E(1.01, 4) }, bad: { rep: -4, d: E(0.93, 6) }, goodText: 'Nobody noticed, this time.', badText: 'The authorities noticed. Fines, headlines and lost customers followed.' } })] },
  // 817 Distributor exclusivity disputes
  { id: 'e9_export_exclusive', title: 'Your distributor wants exclusive rights', icon: 'key', good: false, per: 1, cd: 24,
    story: 'Your distributor in a big overseas market says you promised them the sole right to sell your goods there. Meanwhile a second firm has offered to sell lots more. A distributor is a middleman who buys from you and resells locally.', choices: [
      S('honour', 'Honour the exclusive deal', 'Loyalty has a price.', 'You kept your word. The second firm walked away, but your distributor trusts you more.', { eff: { rep: 1, d: E(0.99, 6) } }),
      S('buyout', 'Buy out the exclusivity', 'Costs a lot and opens the market up.', 'You paid to end the exclusivity and now sell through both firms.', { k: 0.05, acct: 'dealCosts', eff: { d: E(1.03, 8) } }),
      S('argue', 'Argue it was never promised', 'You might win, or you might look bad.', '', { k: 0.015, acct: 'otherCosts', gamble: { p: 0.45, good: { d: E(1.02, 6) }, bad: { rep: -2, d: E(0.97, 4) }, goodText: 'The contract wording backed you and the distributor backed down.', badText: 'The contract was vague, a court was mentioned and word got around.' } })] },
  // 819 Currency-controls trap
  { id: 'e9_export_blockedmoney', title: 'Your money is trapped abroad', icon: 'gear', good: false, per: 0.7, cd: 36,
    story: 'The government of one of your markets has brought in currency controls, rules that limit how much money can leave the country. Your customers there have paid, but you cannot bring the money home.', choices: [
      S('spend', 'Spend it locally', 'Not what you planned, but it does some good.', 'You spent the trapped money on local advertising and goods. Not what you wanted, but it did some good.', { eff: { brand: 1.01, d: E(1.01, 6) } }),
      S('wait', 'Wait for the rules to ease', 'Free, with a chance of a long wait.', '', { gamble: { p: 0.5, good: {}, bad: { morale: -2, c: E(1.02, 6) }, goodText: 'The controls eased after some months and the money came home.', badText: 'The wait dragged on, and your own bills mounted up.' } }),
      S('fixer', 'Pay a specialist to move it out', 'A steep fee through legal channels.', 'A specialist moved the money through legal channels at a steep exchange rate. You got most of it back.', { k: 0.04, acct: 'otherCosts' })] },
  // 822 Overseas-tax residence
  { id: 'e9_export_twotaxmen', title: 'Two tax offices want a cut', icon: 'chart', good: false, per: 0.8, cd: 30,
    story: 'Your overseas sales have grown so much that a foreign tax office says your firm has a taxable presence in their country. Now two countries want to tax the same profit. A treaty between them may let you off, but you must claim it.', choices: [
      S('adviser', 'Hire an international tax adviser', 'Costs money, and usually pays off.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.8, good: { rep: 1 }, bad: { morale: -1 }, goodText: 'The adviser claimed relief under the tax treaty and you avoided paying twice.', badText: 'The adviser trimmed the bill, but not by much, and the paperwork wore everyone out.' } }),
      S('pay', 'Pay both and move on', 'Simple, painful, and no more letters.', 'You paid both bills. Simple, painful, and no more letters arrived.', { eff: { c: E(1.015, 8) } }),
      S('restructure', 'Set up a local company', 'Costs a lot now, and tidies things up.', 'A tidy local company gave each tax office a clear claim, and the letters stopped.', { k: 0.05, acct: 'dealCosts', eff: { rep: 1 } })] },
  // 823 Parallel-import problems
  { id: 'e9_export_greymarket', title: 'Your goods turn up in the wrong country', icon: 'parcel', good: false, per: 1, cd: 24, gate: 'stock',
    story: 'Someone is buying your products in a country where you sell them cheaply and shipping them to a richer country to undercut your own distributors. These are called parallel imports, and your official partners are not happy.', choices: [
      S('contracts', 'Tighten distributor contracts', 'Costs lawyer time and keeps the peace.', 'New contract terms banned resale outside each region, which kept the peace with your official partners.', { k: 0.02, acct: 'otherCosts', eff: { rep: 1 } }),
      S('prices', 'Even out prices between countries', 'Takes away the profit in the trick, and annoys a few markets.', 'Closer prices took away the profit in the trick, though a few markets grumbled at the rise.', { eff: { d: E(0.985, 6), rep: 1 } }),
      S('ignore', 'Let it be', 'More sales for you, but your partners may walk.', '', { gamble: { p: 0.5, good: { d: E(1.02, 6) }, bad: { rep: -2, morale: -1 }, goodText: 'The extra volume was welcome and nobody complained.', badText: 'Your official distributors were furious and threatened to walk.' } })] },
  // 824 Government trade-mission trips
  { id: 'e9_export_trademission', title: 'A trade mission invites you', icon: 'crown', good: true, per: 1.2, cd: 24,
    story: 'A government minister is leading a trade mission to a promising overseas market, and your business is invited to join the delegation. You would meet buyers and officials, though it means a week away from the day job.', choices: [
      S('go', 'Go yourself', 'Costs time and money, and could open big doors.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.7, good: { d: E(1.04, 8), rep: 1 }, bad: { morale: -1 }, goodText: 'The introductions paid off and a buyer placed a big order.', badText: 'A week away produced lots of handshakes and not many orders.' } }),
      S('deputy', 'Send a deputy', 'A cheaper way to make a few friends.', 'Your deputy came back with a handful of useful contacts.', { k: 0.01, acct: 'otherCosts', eff: { d: E(1.015, 6) } }),
      S('stay', 'Stay at home', 'No cost, no networking.', 'You stayed focused on your home market and missed the networking.')] },
  // 825 Withdrawing from a failing market
  { id: 'e9_export_pullout', title: 'An overseas market keeps failing', icon: 'globe', good: false, per: 1, cd: 24,
    story: 'Your overseas venture has lost money for a long time. Sales are slow, costs are high and customers are lukewarm. Some of the team want to give it one more year and others want out. Throwing good money after bad is a classic business mistake.', choices: [
      S('exit', 'Withdraw now', 'Pay to close, take the loss, move on.', 'You paid to close, took the loss and refocused on markets that work.', { k: 0.03, acct: 'otherCosts', eff: { morale: -1, c: E(0.99, 8) } }),
      S('persist', 'Give it six more months', 'A long shot that could turn the corner.', '', { k: 0.02, acct: 'otherCosts', gamble: { p: 0.4, good: { d: E(1.04, 8) }, bad: { morale: -2, d: E(0.98, 4) }, goodText: 'The market turned a corner and orders began to flow.', badText: 'Nothing changed and you spent more money for nothing.' } }),
      S('agent', 'Switch to a cheap local agent', 'Keep a thin presence at a far lower cost.', 'A local agent kept a thin presence going at a far lower cost.', { k: 0.015, acct: 'otherCosts', eff: { d: E(1.01, 6) } })] },
];

export const projects: InitiativeDef[] = [
  // 807 Foreign-regulation approvals
  { id: 'export_approval', name: 'Win overseas product approval', blurb: 'Many countries make you prove a product is safe before you may sell it there. Pay for tests, translations and forms, then wait for the regulator\'s answer.', k: 0.6, months: 8, success: 70,
    win: { eff: { d: 1.025, rep: 0.02 }, monthly: 0.1, now: { rep: 1 }, text: 'The regulator signed off, and a stamp of approval opened doors across the region.' },
    lose: { now: { morale: -1 }, text: 'The regulator wanted changes you could not afford and rejected the application. The fees are gone, though you may try again.' } },
  // 811 Tariff-engineering of product design
  { id: 'export_tariffdesign', stock: true, name: 'Design around the tariff', blurb: 'Tariffs are border taxes, and they differ by type of goods. A small redesign, such as a different material or finish, might move your product into a cheaper band.', k: 0.5, months: 9, success: 60,
    win: { eff: { c: 0.975 }, text: 'Customs agreed with the new classification, and your tariff bill shrank for good.' },
    lose: { now: { c: E(1.01, 4) }, text: 'Customs disagreed and kept the old, higher tax. You paid for a redesign that saved nothing.' } },
  // 815 Free-trade-agreement benefits
  { id: 'export_ftadeal', name: 'Claim free-trade-deal benefits', blurb: 'A free-trade agreement between countries cuts or removes tariffs on goods that qualify. To claim it, you must prove where your goods were made, which means a mountain of paperwork.', k: 0.4, months: 6, success: 75,
    win: { eff: { c: 0.985, d: 1.01 }, monthly: 0.1, text: 'Customs accepted your proof of origin, tariffs vanished and your prices abroad became more competitive.' },
    lose: { now: { morale: -1 }, text: 'Your proof of origin did not hold up, so you paid the full tariff and wasted the paperwork.' } },
  // 820 Local-partner joint ventures
  { id: 'export_jv', name: 'Overseas joint venture', blurb: 'Team up with a local firm that knows the market. You share the costs, the profits and some of the control.', k: 1, months: 10, success: 60,
    win: { eff: { d: 1.04, rep: 0.01 }, monthly: 0.4, text: 'Your partner opened doors you could never have opened yourself, and sales abroad took off.' },
    lose: { now: { rep: -2, morale: -1 }, text: 'You and your partner disagreed about almost everything, and the venture fell apart.' } },
];
