import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Expansion and franchising. Every id starts with "expansion_" (policies and projects) or "e9_expansion_" (events). */
export const policies: PolicyDef[] = [
  // 827 Roll-out pacing versus quality control
  { id: 'expansion_pace', group: 'ops', name: 'Roll-out pace', blurb: 'Open sites quickly and risk sloppy standards, or slowly and risk a rival getting there first.', options: [
    opt('Steady pace', 'Open sites at a measured pace, one at a time.', {}),
    opt('Fast roll-out', 'Open as many sites as fast as you can. More customers sooner, but standards slip and some openings go badly.', { d: 1.025, q: -0.03, risk: [6, 3, 'A rushed new opening went badly wrong and cost you money.'] }, 0.5),
    opt('Slow and polished', 'Open only when everything is perfect. Better quality, slower growth.', { q: 0.02, d: 0.99 }, 0.2)] },
  // 829 Franchise-fee structure choices
  { id: 'expansion_fees', group: 'finance', name: 'Franchise-fee structure', blurb: 'Franchisees pay you a joining fee and then a royalty, which is a share of their takings. Choose the mix.', options: [
    opt('Standard royalty', 'A middling joining fee and a regular share of the takings.', {}),
    opt('High joining fee, low royalty', 'Franchisees pay a lot up front and little afterwards. Quick money for you, but fewer people can afford to join.', { d: 0.995 }, -0.3),
    opt('Low joining fee, high royalty', 'Cheap to join, and a bigger share of the takings comes to you. Franchisees feel squeezed and some complain loudly.', { m: -0.15, risk: [4, 2, 'A franchisee fell behind with royalties and complained loudly.'] }, -0.6)] },
  // 831 Brand-standards audits of franchisees
  { id: 'expansion_audits', group: 'ops', name: 'Brand-standards audits', blurb: 'Checking that every site, owned or franchised, looks and feels like your brand.', options: [
    opt('No audits', 'Trust everyone to keep up the standards on their own.', {}),
    opt('Annual inspection', 'A visit once a year to check that every site looks and feels like yours.', { rep: 0.02, q: 0.01 }, 0.2),
    opt('Surprise mystery-shopper visits', 'Inspectors turn up unannounced. Standards stay sharp, but franchisees feel watched.', { rep: 0.04, q: 0.02, m: -0.1 }, 0.5)] },
  // 833 Regional-manager layer
  { id: 'expansion_regional', group: 'people', name: 'Regional managers', blurb: 'Once you have lots of sites, someone has to look after groups of them.', options: [
    opt('Head office runs everything', 'Every decision goes through the centre. Simple, and slow as you grow.', {}),
    opt('One manager per region', 'A manager looks after each group of sites and keeps head office in touch with the shop floor.', { cap: 1.015, q: 0.01 }, 0.7),
    opt('Powerful regional bosses', 'Bosses with their own budgets make fast local decisions, though some go their own way.', { cap: 1.025, q: 0.015, risk: [4, 3, 'A regional boss went their own way and ignored head office.'] }, 1.1)] },
  // 839 Supply-contract bundling for franchisees
  { id: 'expansion_buying', group: 'ops', stock: true, name: 'Franchisee buying group', blurb: 'Pool every site\'s orders into one big purchase to win a better price from suppliers.', options: [
    opt('Everyone buys alone', 'Each site finds its own suppliers. Freedom, and no bulk discounts.', {}),
    opt('Optional buying group', 'Sites can join your bulk deals if they like. Cheaper stock for those who do.', { c: 0.99 }, 0.15),
    opt('Compulsory central supply', 'Every site must buy from your approved suppliers. Bigger savings and tighter control, though franchisees resent being told what to do.', { c: 0.98, m: -0.2, risk: [3, 2, 'A franchisee complained publicly about being forced to use your supplier.'] }, 0.2)] },
  // 840 Territory exclusivity rules
  { id: 'expansion_territory', group: 'ops', name: 'Territory rules', blurb: 'Does a franchisee own the area around their site, or can you open another one next door?', options: [
    opt('Decide case by case', 'Agree territories one deal at a time.', {}),
    opt('Exclusive territories', 'Each franchisee gets a protected area. Happy, loyal partners, but fewer places to open.', { m: 0.2, ch: 0.99, d: 0.99 }),
    opt('Crowded territories', 'Pack sites in close together. More sites and more shoppers served, but franchisees fight over the same customers.', { d: 1.02, m: -0.25, risk: [5, 2, 'Two franchisees fought over the same customers.'] })] },
  // 844 Franchisee-financing support
  { id: 'expansion_financing', group: 'finance', name: 'Franchisee financing', blurb: 'Starting a franchise costs a lot, and many good candidates cannot raise the money alone.', options: [
    opt('They find their own money', 'Franchisees raise the start-up money themselves.', {}),
    opt('Guarantee their bank loans', 'You promise to cover a franchisee\'s loan if they fail. More people can start up, and you carry some risk.', { d: 1.01, risk: [3, 4, 'A franchisee could not repay and you had to cover part of the loan.'] }, 0.3),
    opt('Lend to franchisees directly', 'You lend them the start-up money. More people join and stay loyal, and you carry the risk.', { d: 1.02, rep: 0.01, risk: [5, 4, 'A franchisee defaulted on the loan you gave them.'] }, 0.7, 1)] },
  // 845 Multi-brand portfolio strategy
  { id: 'expansion_brands', group: 'customers', name: 'Brand portfolio', blurb: 'One brand for everything, or several brands for different kinds of customer.', options: [
    opt('One brand', 'Everything carries the same name and the same message.', {}),
    opt('Add a budget sister brand', 'A cheaper second brand catches shoppers you would otherwise miss, but it sits a little awkwardly beside the main one.', { d: 1.015, br: 0.998 }, 0.4, 0.8),
    opt('Several niche brands', 'A different brand for each kind of customer. A wider reach, but each brand needs its own attention.', { d: 1.025, cap: 0.99 }, 0.8, 1.5)] },
  // 847 Seasonal-site scheduling
  { id: 'expansion_seasonal', group: 'ops', name: 'Seasonal sites', blurb: 'Some sites are packed in summer and empty in winter, and some are the other way round.', options: [
    opt('Open all year', 'Keep every site open every month, busy or not.', {}),
    opt('Close sites in the off-season', 'Shut quiet sites in the low season and save the running costs, at the price of lost trade.', { c: 0.99, d: 0.99 }),
    opt('Move with the seasons', 'Pop-up sites at the coast in summer and in town in winter. You follow the crowds, with a lot of logistics.', { d: 1.015, cap: 0.99, risk: [4, 3, 'A seasonal move was botched and cost you trading days.'] }, 0.5, 0.6)] },
  // 848 Site-performance league table
  { id: 'expansion_league', group: 'people', name: 'Site league table', blurb: 'A ranking of every site on sales, quality and customer scores.', options: [
    opt('No rankings', 'Sites are judged privately and not compared.', {}),
    opt('Public league table', 'Every site is ranked in the open. Competition lifts output, and the bottom sites feel it.', { cap: 1.02, m: -0.2 }, 0.05),
    opt('League table with improvement prizes', 'Prizes go to those who climb the table, not to those who sit at the top. Fairer, and everybody stays keen.', { cap: 1.015, m: 0.2, q: 0.01 }, 0.5)] },
  // 850 Franchisee-advisory council
  { id: 'expansion_council', group: 'people', name: 'Franchisee advisory council', blurb: 'A group of franchisees who tell head office what is really happening on the ground.', options: [
    opt('No council', 'Head office decides, and franchisees find out afterwards.', {}),
    opt('Meet twice a year', 'A couple of meetings a year, with biscuits. Franchisees feel listened to.', { m: 0.15, rep: 0.01 }, 0.1),
    opt('Standing council with real say', 'Franchisees vote on big changes. Loyal and well informed, but decisions take longer.', { m: 0.3, q: 0.01, cap: 0.99 }, 0.3)] },
];

export const events: EvSpec[] = [
  // 828 Franchisee-selection interviews
  { id: 'e9_expansion_applicant', title: 'A keen franchise applicant', icon: 'handshake', good: true, per: 1.5, cd: 14,
    story: 'A very keen applicant wants to buy a franchise. They have money and big plans, but no experience of running a shop. A franchisee pays to run a site under your name, so their standards become your reputation.', choices: [
      S('interview', 'Interview them and run a trial week', 'Takes time, and weeds out the wrong people.', '', { k: 0.01, acct: 'otherCosts', gamble: { p: 0.8, good: { rep: 1, quality: 1 }, bad: {}, goodText: 'The trial week showed they were a natural, and the new site started well.', badText: 'They struggled in the trial week, and you politely said no.' } }),
      S('quick', 'Sign them quickly', 'Fast money, and you take their word for it.', '', { gamble: { p: 0.55, good: { d: E(1.02, 8) }, bad: { rep: -3, quality: -1 }, goodText: 'They turned out to be a natural and the new site thrived.', badText: 'Their site was a mess and customers blamed your brand.' } }),
      S('decline', 'Politely decline', 'Safe, and a missed chance.', 'You wished them luck and kept your standards high.')] },
  // 832 Cannibalisation between your own sites
  { id: 'e9_expansion_cannibal', title: 'Your new site steals your old one\'s customers', icon: 'chart', good: false, per: 1.2, cd: 18,
    story: 'Your new site is busy, but a closer look shows that many of its customers used to shop at your older site two streets away. You have not really grown, you have just moved sales around. This is called cannibalisation.', choices: [
      S('differ', 'Give each site its own character', 'Costs a bit, and gives each its own crowd.', 'A different look and different offers gave each site its own crowd.', { k: 0.03, acct: 'marketing', eff: { d: E(1.02, 8) } }),
      S('move', 'Move the older site to a new area', 'Expensive and fiddly, but it finds fresh customers.', 'Moving was a hassle, but the old site found fresh customers and the overlap vanished.', { k: 0.06, acct: 'otherCosts', eff: { d: E(1.03, 10), morale: -1 } }),
      S('accept', 'Accept it', 'Free, and some sales stay lost.', 'You accepted the overlap. Customers split between the two sites and total sales barely grew.', { eff: { d: E(0.99, 6) } })] },
  // 835 Opening-day marketing budgets
  { id: 'e9_expansion_opening', title: 'Opening day is coming', icon: 'star', good: true, per: 1.5, cd: 12,
    story: 'A new site opens next week. Opening day sets the tone: a quiet start can take months to recover from, while a packed opening gets people talking. How much should you spend on it?', choices: [
      S('big', 'A big launch with a party and a local celebrity', 'Pricey and a real draw, if it goes well.', '', { k: 0.05, acct: 'marketing', gamble: { p: 0.7, good: { d: E(1.04, 6), brand: 1.01 }, bad: { d: E(1.01, 3) }, goodText: 'The launch was the talk of the town and the queue went round the block.', badText: 'Rain, a late celebrity and a lukewarm crowd took the shine off a pricey launch.' } }),
      S('leaflets', 'Leaflets and a local advert', 'A modest spend for a respectable first week.', 'A few thousand leaflets and a local advert brought a respectable first week.', { k: 0.015, acct: 'marketing', eff: { d: E(1.015, 4) } }),
      S('quiet', 'Open quietly', 'Free, and it lets you fix creases first.', 'A soft opening let you fix the creases before the crowds arrived.', { eff: { quality: 0.5 } })] },
  // 836 Failing-site closure decisions
  { id: 'e9_expansion_closure', title: 'A site keeps losing money', icon: 'alert', good: false, per: 1.2, cd: 18,
    story: 'One of your sites has lost money for a long time. The staff are loyal and the customers are polite, but the numbers do not lie. Closing it hurts, though keeping it open for sentimental reasons can hurt more.', choices: [
      S('close', 'Close it', 'Costs to close, and stops the drain.', 'You paid to close the site and the drain on cash stopped. People were sad, and the rest of the business was healthier.', { k: 0.04, acct: 'otherCosts', eff: { c: E(0.99, 10), morale: -2 } }),
      S('refresh', 'Give it a makeover and one more try', 'A fair chance, and a fair chance it fails.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.45, good: { d: E(1.03, 8) }, bad: { d: E(0.99, 4), morale: -1 }, goodText: 'The makeover worked and the site began to turn a profit.', badText: 'The makeover changed nothing and the losses went on.' } }),
      S('hold', 'Keep it open for now', 'Hope, at a price.', 'The site went on losing money, and the losses nibbled away at your other sites\' profits.', { eff: { c: E(1.01, 8) } })] },
  // 837 Franchisee-disputes mediation
  { id: 'e9_expansion_dispute', title: 'Two franchisees are at war', icon: 'flame', good: false, per: 1.2, cd: 18,
    story: 'Two franchisees are in a bitter dispute about boundaries, suppliers and who owes whom. Customers have started to notice, and both have threatened to go to the press. A mediator is a neutral person who helps people settle an argument without going to court.', choices: [
      S('mediate', 'Bring in a mediator', 'Costs a little, and keeps it out of the papers.', 'The mediator listened to both sides and found a deal that nobody loved but everyone could live with.', { k: 0.02, acct: 'otherCosts', eff: { rep: 1, morale: 1 } }),
      S('rules', 'Enforce the contract', 'Free, firm and rather cold.', '', { gamble: { p: 0.55, good: { rep: 1 }, bad: { rep: -2, morale: -2 }, goodText: 'The rules were clear and both sides backed down.', badText: 'The loser took it badly and told the press.' } }),
      S('side', 'Back the bigger franchisee', 'Quick, and not very fair.', 'The bigger franchisee was delighted and the smaller one felt betrayed. Other franchisees noticed.', { eff: { rep: -1, d: E(1.01, 4) } })] },
  // 842 Franchise resale approvals
  { id: 'e9_expansion_resale', title: 'A franchisee wants to sell up', icon: 'key', good: false, per: 1, cd: 20,
    story: 'One of your franchisees wants to sell their site to someone you have never met. Your rules say you must approve any new owner. A poor buyer could let standards slip, but blocking a sale makes every franchisee nervous.', choices: [
      S('vet', 'Vet the buyer thoroughly', 'Cheap and sensible.', 'A careful check found a capable buyer, and the handover went smoothly.', { k: 0.01, acct: 'otherCosts', eff: { rep: 1 } }),
      S('buyback', 'Buy the site back yourself', 'Expensive, and gives you full control.', 'You bought the site back and ran it yourself, with full control of the standards.', { k: 0.06, acct: 'dealCosts', eff: { quality: 1, d: E(1.01, 8) } }),
      S('refuse', 'Refuse the sale', 'You keep control and lose goodwill.', 'The owner was furious, and other franchisees wondered whether they could ever sell up.', { eff: { morale: -2, rep: -1 } })] },
];

export const projects: InitiativeDef[] = [
  // 826 Site-selection scoring with demographics
  { id: 'expansion_sitescore', name: 'Site-scoring model', blurb: 'Score every possible site on footfall, local incomes, ages and rival shops before you sign a lease. It takes research, and the model might not be as clever as it looks.', k: 0.5, months: 6, success: 75,
    win: { eff: { d: 1.025 }, monthly: 0.1, text: 'Your scoring steered you to better sites, and new openings started strongly.' },
    lose: { now: { d: E(0.99, 4) }, text: 'The model loved a site that turned out to be a dud, and nobody trusted it again.' } },
  // 830 Master-franchise agreements for countries
  { id: 'expansion_master', name: 'Master franchise for a whole country', blurb: 'Hand a whole country to one partner, who then sells franchises there for you. You earn a cut of everything, but you give up a lot of control.', k: 0.7, months: 12, success: 55,
    win: { eff: { d: 1.04 }, monthly: -0.5, now: { brand: 1.01 }, text: 'Your partner built a network of sites quickly, and the royalties started to roll in.' },
    lose: { now: { rep: -2, morale: -1 }, text: 'Your partner ran into trouble and some sites let your brand down badly.' } },
  // 834 Central kitchen or hub for new sites
  { id: 'expansion_hub', stock: true, name: 'Central kitchen or hub', blurb: 'Prepare food, parts or stock in one big central unit and send it out to every site. Cheaper and more consistent, but a big job to build.', k: 0.7, months: 8, success: 70,
    win: { eff: { c: 0.97, q: 0.02 }, monthly: 0.25, text: 'The hub came online, and every site now gets the same quality at a lower cost per item.' },
    lose: { now: { c: E(1.02, 4) }, text: 'The hub opened late and over budget, and sites ran short while it was sorted out.' } },
  // 838 Training-academy for new sites
  { id: 'expansion_academy', name: 'Training academy for new sites', blurb: 'A proper training centre where every new site\'s team learns your way of working before opening day.', k: 0.6, months: 6, success: 80,
    win: { eff: { q: 0.02, hire: 0.9 }, monthly: 0.2, now: { quality: 1 }, text: 'New sites open with a team that already knows your standards, and quality rose.' },
    lose: { now: { morale: -1 }, text: 'Trainers and trainees clashed, and the academy closed after a few awkward months.' } },
  // 841 Pilot-store experiments
  { id: 'expansion_pilot', name: 'Pilot store', blurb: 'Test a new site format in one place before you roll it out everywhere. A small bet that can save you from a big mistake.', k: 0.3, months: 4, success: 75,
    win: { eff: { d: 1.015 }, now: { quality: 1 }, text: 'The pilot worked, and you ironed out the creases before the big roll-out.' },
    lose: { now: { morale: -1 }, text: 'The pilot flopped, but at least it was one small flop and not a hundred of them.' } },
  // 843 Joint-venture openings with local firms
  { id: 'expansion_localjv', name: 'Open a site with a local partner', blurb: 'Share a new site with a local firm that owns the land, knows the area and has loyal customers of its own.', k: 0.6, months: 8, success: 60,
    win: { eff: { d: 1.025, rep: 0.01 }, monthly: 0.2, text: 'Your partner\'s local fame filled the new site from day one.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'You and your partner never agreed who was in charge, and the site closed in a muddle.' } },
  // 846 Pop-up-to-permanent conversions
  { id: 'expansion_popup', name: 'Make the pop-up permanent', blurb: 'A temporary pop-up shop has done well. Sign a lease and fit it out for good. If the crowds were a novelty, you are stuck with a lease.', k: 0.5, months: 5, success: 65,
    win: { eff: { d: 1.02 }, monthly: 0.2, text: 'The crowds kept coming, and the pop-up became a proper site.' },
    lose: { now: { morale: -1 }, text: 'The pop-up crowds were a novelty. The permanent shop never found its feet and closed.' } },
  // 849 Re-franchising company-owned sites
  { id: 'expansion_refranchise', name: 'Sell your sites to franchisees', blurb: 'Re-franchising means selling sites you run yourself to franchisees, who then pay you royalties instead. You free up cash and effort, but lose some control.', k: 0.4, months: 6, success: 70,
    win: { eff: { c: 0.99 }, monthly: -0.5, text: 'The sales went through. Franchisees now run the sites and send you royalties.' },
    lose: { now: { morale: -2 }, text: 'Franchisees did not want the weaker sites, and staff who had hoped to stay felt abandoned.' } },
];
