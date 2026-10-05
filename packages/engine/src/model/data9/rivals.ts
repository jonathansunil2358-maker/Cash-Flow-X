import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Topic: Rivals and competition. Every id starts with "rivals_" (policies and projects) or "e9_rivals_" (events). */
export const policies: PolicyDef[] = [
  // 753 Price-leadership battles
  { id: 'rivals_price_stance', group: 'customers', name: 'Price leadership', blurb: 'Who moves first when prices change? A price leader sets the pace for the whole market, and a follower waits and copies.', options: [
    opt('Follow the market', 'Match your rivals, no more and no less.', {}),
    opt('Always undercut', 'Be the cheapest and win the comparison shoppers. Margins shrink, and rivals hit back.', { d: 1.02, risk: [4, 3, 'A rival hit back with an even lower price and you had to match it.'] }, 0.7),
    opt('Premium price leader', 'Hold prices high and let others copy you. Fewer bargain hunters and fatter margins.', { d: 0.985 }, -0.6)] },
  // 758 Market-share charts with segment views
  { id: 'rivals_share_tracking', group: 'ops', name: 'Market-share tracking', blurb: 'Your market share is the slice of the market you win. Tracking it by segment (young customers, big firms, one region) shows where rivals are eating into you.', options: [
    opt('Go on gut feel', 'Watch your own sales and trust your instincts.', {}),
    opt('Overall share report', 'A simple quarterly figure for your total share.', { d: 1.004 }, 0.15),
    opt('Segment-by-segment charts', 'Buy detailed data on every segment, so you spot a rival\'s attack early.', { d: 1.01, q: 0.005 }, 0.4)] },
  // 763 Supplier exclusivity deals that lock rivals out
  { id: 'rivals_exclusive_supply', group: 'ops', stock: true, name: 'Supplier exclusivity', blurb: 'An exclusive deal means your best supplier sells only to you, which locks rivals out of the best goods.', options: [
    opt('Open supply', 'Your suppliers sell to anyone, rivals included.', {}),
    opt('Exclusive on one line', 'Lock up your best-selling line. Rivals cannot copy it, and the supplier charges a premium.', { d: 1.01, c: 1.004 }, 0.3),
    opt('Exclusive on everything', 'Lock rivals out of your main supplier entirely. A strong edge, but if that supplier slips you have no plan B.', { d: 1.02, c: 1.01, risk: [3, 4, 'Your exclusive supplier had a bad month and you had no backup.'] }, 0.6)] },
  // 765 Industry-association lobbying
  { id: 'rivals_association', group: 'ops', name: 'Trade association', blurb: 'A trade association speaks for a whole industry and lobbies (persuades politicians) about rules and taxes. Your rivals are members too.', options: [
    opt('Stay out of it', 'Spend your time on customers instead.', {}),
    opt('Join the association', 'Pay the fees, hear about new rules early, and look like a good citizen.', { rep: 0.02 }, 0.2),
    opt('Fund its lobbying campaign', 'Push hard for rules that suit you. It can backfire in the papers, and your rivals share the benefit.', { rep: 0.03, c: 0.995, risk: [3, 2, 'A lobbying row made headlines for the wrong reasons.'] }, 0.5)] },
  // 775 Defensive-pricing budgets
  { id: 'rivals_defence_fund', group: 'finance', name: 'Defensive-pricing fund', blurb: 'A set-aside budget for discounts that you only spend when a rival goes after your best customers.', options: [
    opt('No fighting fund', 'React to rival price cuts if and when you must.', {}),
    opt('Small price-match fund', 'Enough to match a rival\'s offer on your key accounts, so customers stay put.', { ch: 0.99 }, 0.3),
    opt('Big war chest', 'Deep pockets to outlast any price war. It is expensive, and it holds your prices lower than you would like.', { ch: 0.98, d: 1.005 }, 0.8)] },
];

export const events: EvSpec[] = [
  // 752 Rival launches a copycat of your best seller
  { id: 'e9_rivals_copycat', title: 'A rival copies your best seller', icon: 'flag', good: false, per: 1.5, cd: 24, gate: 'rivals',
    story: 'A rival has launched a near-identical version of your best seller, with a very similar look, at a lower price. Your customers are starting to compare the two.', choices: [
      S('match', 'Match their price', 'Keeps customers, but costs margin.', 'You matched the price, held your customers, and gave up some profit per sale.', { eff: { d: E(1.02, 4), c: E(1.015, 4) } }),
      S('innovate', 'Out-innovate them', 'Costs a lot, and could leave them looking cheap.', '', { k: 0.05, acct: 'marketing', gamble: { p: 0.6, good: { quality: 2, brand: 1.02 }, bad: { morale: -1, d: E(0.97, 4) }, goodText: 'Your improved version made the copycat look like a cheap knock-off.', badText: 'The new version took longer than hoped, and customers drifted away.' } }),
      S('letter', 'Send a lawyer\'s letter', 'Cheap, and copycats are hard to stop.', '', { k: 0.015, gamble: { p: 0.5, good: { d: E(1.02, 3) }, bad: { rep: -1 }, goodText: 'The rival backed off and changed its design.', badText: 'The rival ignored you and told the press you were bullying them.' } })] },
  // 754 Rival acquisitions that reshape the market
  { id: 'e9_rivals_merger', title: 'Two rivals merge', icon: 'crown', good: false, per: 1.2, cd: 36, gate: 'rivals',
    story: 'Two of your rivals have announced a merger. Together they will be bigger, with deeper pockets and more customers, and everybody in the market is wondering what comes next.', choices: [
      S('loyalty', 'Lock in your best customers', 'Costs money, protects your base.', 'You offered your best customers a loyalty deal, and most signed up.', { k: 0.03, acct: 'marketing', eff: { d: E(1.02, 6) } }),
      S('independent', 'Pitch yourself as the friendly independent', 'A cheap campaign with a clear message.', 'Customers like backing the little guy, and your name got noticed.', { k: 0.015, acct: 'marketing', eff: { brand: 1.02, rep: 1 } }),
      S('watch', 'Wait and see', 'Free, and mergers are often messy.', '', { gamble: { p: 0.5, good: { d: E(1.02, 6) }, bad: { d: E(0.96, 6) }, goodText: 'The merger was messy, and unhappy customers wandered over to you.', badText: 'The merged firm bundled everything cheaply, and customers wandered over to them.' } })] },
  // 755 Talent raids on your teams
  { id: 'e9_rivals_raid', title: 'A rival raids your team', icon: 'key', good: false, per: 1.5, cd: 24, gate: 'rivals',
    story: 'A rival has been phoning your best people with big offers. Two of them have already taken interviews, and the others are starting to wonder what they are worth.', choices: [
      S('match', 'Match the offers', 'Costs money, and keeps your stars.', 'Pay rises kept the stars, though others noticed who got what.', { k: 0.05, acct: 'wages', eff: { morale: 2 } }),
      S('culture', 'Appeal to your mission and culture', 'Free, and depends on how people feel.', '', { gamble: { p: 0.5, good: { morale: 3 }, bad: { quality: -2, morale: -2 }, goodText: 'People remembered why they love working here, and stayed.', badText: 'The stars left anyway, and took their know-how with them.' } }),
      S('letgo', 'Let them go and hire fresh', 'Free now, and a gap in your skills.', 'They left, and the replacements took months to catch up.', { eff: { quality: -1, morale: -1 } })] },
  // 757 New entrant with deep-pocketed backers
  { id: 'e9_rivals_entrant', title: 'A deep-pocketed newcomer arrives', icon: 'rocket', good: false, per: 1.2, cd: 36, gate: 'rivals',
    story: 'A new competitor, bankrolled by wealthy investors, has opened with huge discounts and a flashy launch. Insiders say it can afford to lose money for years.', choices: [
      S('fight', 'Fight for every customer', 'Costs a lot, and could outlast them.', '', { k: 0.06, acct: 'marketing', gamble: { p: 0.5, good: { d: E(1.02, 6), brand: 1.01 }, bad: { d: E(0.96, 6) }, goodText: 'Your loyal customers stuck with you while the newcomer burned through its cash.', badText: 'The newcomer\'s offers were too good, and you lost customers.' } }),
      S('niche', 'Specialise in what they cannot copy', 'A cheaper, calmer reply.', 'You doubled down on quality and service, and your regulars loved it.', { k: 0.03, acct: 'marketing', eff: { brand: 1.02, quality: 1 } }),
      S('ignore', 'Ignore the noise', 'Free, and a gamble that they fade.', '', { gamble: { p: 0.5, good: {}, bad: { d: E(0.95, 6) }, goodText: 'The newcomer hit trouble and faded away.', badText: 'The newcomer kept growing, and you lost a slice of your sales.' } })] },
  // 760 Gentleman's agreements that become cartels
  { id: 'e9_rivals_cartel', title: 'A cosy lunch turns awkward', icon: 'handshake', good: false, per: 1, cd: 36, gate: 'rivals',
    story: 'Over lunch, a rival suggests that you both keep prices high, "so nobody loses". That is a cartel, an agreement between rivals not to compete, and it is against the law.', choices: [
      S('refuse', 'Say no and walk away', 'Honest and safe.', 'You kept your hands clean and your price list your own.', { eff: { rep: 1 } }),
      S('agree', 'Shake on it', 'Higher margins, and a huge risk.', '', { gamble: { p: 0.3, good: { c: E(0.99, 8) }, bad: { rep: -4, brand: 0.95 }, goodText: 'Nobody noticed, and margins improved.', badText: 'A competition regulator found out. The fines and the headlines were brutal.' } }),
      S('report', 'Tip off the regulator', 'Brave, and the rival will be furious.', '', { gamble: { p: 0.6, good: { rep: 2 }, bad: { rep: 1, d: E(0.98, 4) }, goodText: 'The regulator thanked you, and your honesty became a story.', badText: 'The rival denied everything and spread rumours about you.' } })] },
  // 762 Rival advertising wars
  { id: 'e9_rivals_ad_war', title: 'A rival starts an ad war', icon: 'camera', good: false, per: 1.5, cd: 20, gate: 'rivals',
    story: 'A rival has plastered the town with adverts, and some of them poke fun at you. Customers are noticing, and so are your staff.', choices: [
      S('match', 'Match them pound for pound', 'Expensive, and keeps you visible.', 'Your name was everywhere, and the rival gained little ground.', { k: 0.08, acct: 'marketing', eff: { brand: 1.02, d: E(1.02, 3) } }),
      S('clever', 'Hit back with a clever campaign', 'A smarter use of a smaller budget.', '', { k: 0.03, acct: 'marketing', gamble: { p: 0.55, good: { brand: 1.04, d: E(1.02, 4) }, bad: { brand: 0.98 }, goodText: 'Your witty reply went viral and the rival looked petty.', badText: 'The joke fell flat and people rolled their eyes at both of you.' } }),
      S('classy', 'Stay classy and say nothing', 'Free, and calm.', 'You stayed above the fray. Customers noticed, though a few were drawn to the louder rival.', { eff: { rep: 1, d: E(0.985, 3) } })] },
  // 764 Rival product recalls you can exploit or avoid
  { id: 'e9_rivals_recall', title: 'A rival recalls a product', icon: 'shield', good: true, per: 1.2, cd: 30, gate: 'rivals',
    story: 'A rival has had to pull a product after safety complaints. Customers are suddenly asking who else they can trust.', choices: [
      S('exploit', 'Run adverts that say "we are safe"', 'A big chance, and a risk of looking smug.', '', { k: 0.03, acct: 'marketing', gamble: { p: 0.6, good: { d: E(1.04, 4), brand: 1.01 }, bad: { rep: -2 }, goodText: 'Customers flocked to the brand they trusted.', badText: 'People thought you were gloating, and some turned against you.' } }),
      S('welcome', 'Stay respectful and welcome new customers', 'Free, and a decent lift.', 'You helped the rival\'s stranded customers without crowing, and word of it spread.', { eff: { d: E(1.015, 4), rep: 1 } }),
      S('check', 'Quietly check your own products', 'A little cost, and a safer range.', 'Your own checks found a small fault, which you fixed before anyone noticed.', { k: 0.02, eff: { quality: 2 } })] },
  // 767 Rival layoffs that free up talent
  { id: 'e9_rivals_layoffs', title: 'A rival lays people off', icon: 'heart', good: true, per: 1.3, cd: 30, gate: 'rivals',
    story: 'A rival has announced that it is letting go of a chunk of its team. Some of the people leaving are very good, and plenty of other firms are circling.', choices: [
      S('spree', 'Go on a hiring spree', 'Costs a lot, and could lift the whole business.', '', { k: 0.05, acct: 'wages', gamble: { p: 0.65, good: { quality: 2, d: E(1.02, 6) }, bad: { morale: -2 }, goodText: 'Several great hires settled in at once, and the business hummed.', badText: 'Too many arrived at once, and the new people clashed with the old.' } }),
      S('stars', 'Hire only the stars', 'A smaller bill, and a sharper team.', 'You made a few careful offers, and the best people said yes.', { k: 0.02, acct: 'wages', eff: { quality: 1 } }),
      S('help', 'Help them find jobs elsewhere', 'Free, and good for your name.', 'You passed on contacts and advice, and word spread that you are decent to deal with.', { eff: { rep: 2 } })] },
  // 771 Rival-brand reputational crises
  { id: 'e9_rivals_scandal', title: 'A rival\'s scandal tars everyone', icon: 'flame', good: false, per: 1.2, cd: 30, gate: 'rivals',
    story: 'A rival has been caught mis-selling, and the newspapers are lumping the whole industry together. Customers are suspicious of everyone, including you.', choices: [
      S('open', 'Publish your standards and prices openly', 'Costs a little, and is a strong signal.', 'Customers saw how you work, and trusted you more for it.', { k: 0.02, acct: 'marketing', eff: { rep: 2, brand: 1.01 } }),
      S('statement', 'Join an industry statement', 'Cheap, and a modest help.', 'The industry put out a joint statement, and the story cooled down.', { k: 0.01, eff: { rep: 1 } }),
      S('quiet', 'Keep your head down', 'Free, and a gamble.', '', { gamble: { p: 0.5, good: {}, bad: { d: E(0.97, 4), rep: -1 }, goodText: 'The story faded before it reached your customers.', badText: 'Customers stayed wary of the whole industry, and you were caught up in it.' } })] },
  // 772 Partnership offers from a rival
  { id: 'e9_rivals_partnership', title: 'A rival offers to share the load', icon: 'handshake', good: true, per: 1.3, cd: 36, gate: 'rivals',
    story: 'A rival suggests sharing deliveries and a warehouse to cut costs for both of you. The savings look sensible, but you would be tied to a competitor.', choices: [
      S('sign', 'Sign a long partnership', 'Big savings, and a lot of trust.', '', { k: 0.02, gamble: { p: 0.6, good: { c: E(0.98, 12) }, bad: { c: E(1.01, 8), rep: -1 }, goodText: 'Costs fell nicely for both of you, and the arrangement ran smoothly.', badText: 'The rival was unreliable and used what it learned about your customers.' } }),
      S('trial', 'Run a three-month trial', 'Small savings, and a safe test.', 'A short trial showed modest savings with little risk.', { eff: { c: E(0.99, 3) } }),
      S('decline', 'Decline politely', 'You keep your independence.', 'You thanked them and kept your own vans on the road.')] },
  // 773 Patent-troll threats
  { id: 'e9_rivals_patent_troll', title: 'A patent troll writes to you', icon: 'key', good: false, per: 1.3, cd: 30,
    story: 'A shell company that owns old patents (legal rights to an invention) but makes nothing has written to you. It says your product breaks one of its patents and demands a licence fee.', choices: [
      S('pay', 'Pay a licence to make it go away', 'Costs money, and ends it.', 'You paid, got a signed release and moved on.', { k: 0.05 }),
      S('fight', 'Fight it', 'Trolls often give up, and sometimes they do not.', '', { k: 0.03, gamble: { p: 0.5, good: { rep: 1, quality: 1 }, bad: { rep: -1, morale: -2 }, goodText: 'The troll backed down once it saw you would not pay.', badText: 'It dragged on for months and wore everyone down.' } }),
      S('redesign', 'Redesign around the patent', 'Costs the most, and may improve the product.', 'A tweak to your design did the trick, and customers liked the new version.', { k: 0.04, eff: { quality: 1, c: E(1.005, 6) } })] },
  // 774 Disruptor from a different sector
  { id: 'e9_rivals_disruptor', title: 'A disruptor arrives from another sector', icon: 'laptop', good: false, per: 1, cd: 48, gate: 'rivals',
    story: 'A famous technology firm from a completely different industry has announced that it is moving into your market. It already has millions of customers and knows nothing about your trade, yet.', choices: [
      S('partner', 'Partner with them', 'They bring customers, and you bring know-how.', '', { gamble: { p: 0.55, good: { d: E(1.04, 8), brand: 1.02 }, bad: { d: E(0.97, 8) }, goodText: 'They brought customers, you brought know-how, and both of you grew.', badText: 'They learned your trade quickly and then went it alone.' } }),
      S('special', 'Double down on what makes you special', 'Costs money, and builds a moat.', 'You sharpened your best features, and customers saw what the newcomer could not copy.', { k: 0.04, acct: 'marketing', eff: { brand: 1.02, quality: 1 } }),
      S('wait', 'Wait and watch', 'Free, and a gamble.', '', { gamble: { p: 0.5, good: {}, bad: { d: E(0.95, 8) }, goodText: 'The newcomer found the trade harder than it thought, and it retreated.', badText: 'The newcomer arrived with a bang and took a slice of your sales.' } })] },
];

export const projects: InitiativeDef[] = [
  // 751 Competitor-intelligence dossiers
  { id: 'rivals_dossier', name: 'Commission a competitor dossier', blurb: 'A detailed file on a rival: its prices, products, staff and plans, gathered from public sources.', k: 0.3, months: 3, success: 80,
    win: { eff: { d: 1.008 }, monthly: 0.1, text: 'The dossier showed exactly where the rival is weak, and your sales rose.' },
    lose: { now: { morale: -1 }, text: 'The dossier was thin and mostly guesswork, and it distracted your managers.' } },
  // 759 Rival-CEO personality profiles
  { id: 'rivals_ceo_profiles', name: 'Profile the rival bosses', blurb: 'Study how each rival boss behaves: bold or careful, quick to cut prices or slow to react. It helps you predict their next move.', k: 0.25, months: 3, success: 70,
    win: { eff: { c: 0.996 }, now: { d: E(1.02, 4) }, text: 'You launched an offer just as a rival boss was distracted, and you avoided a costly price war.' },
    lose: { now: { d: E(0.97, 3) }, text: 'You misread a rival boss and walked into a trap. They undercut you for weeks.' } },
  // 761 Competitive-bid alliances
  { id: 'rivals_bid_alliance', name: 'Form a bid alliance with a rival', blurb: 'Big contracts often go to teams. You and a rival bid together as a consortium, each doing what it does best. Keep it honest: the price must be set openly, not fixed between you.', k: 0.8, months: 6, success: 55,
    win: { now: { d: E(1.04, 12), rep: 1 }, text: 'You won the contract together, and the work flowed all year.' },
    lose: { now: { rep: -1, morale: -2 }, text: 'The buyer chose someone else, and your new partner now knows more about you than you would like.' } },
  // 756 Rival-bankruptcy auctions of assets
  { id: 'rivals_auction', name: 'Bid at a rival\'s bankruptcy auction', blurb: 'A failed rival is selling off its machines, brand and customer list. Winning could be a bargain, as long as nobody outbids you.', k: 1.2, months: 3, success: 55,
    win: { eff: { cap: 1.02, d: 1.01 }, now: { brand: 1.02 }, text: 'You won the lots at a fraction of their value and absorbed their customers.' },
    lose: { now: { morale: -1 }, text: 'You were outbid, and the money spent on valuations and fees is gone.' } },
  // 766 Benchmarking against best-in-class rivals
  { id: 'rivals_benchmark', name: 'Benchmark against the best', blurb: 'Compare your costs, speed and quality line by line with the best in your industry, then copy what they do better.', k: 0.4, months: 4, success: 75,
    win: { eff: { c: 0.994, q: 0.01 }, monthly: 0.05, text: 'You found three things the leader does better and copied them.' },
    lose: { now: { morale: -1 }, text: 'The comparison was uncomfortable, and nobody acted on it.' } },
  // 768 Market-exit decisions for weak rivals
  { id: 'rivals_squeeze', name: 'Push a weak rival out of the market', blurb: 'A struggling rival may quit if you press hard on its best customers. It is a tough move that could draw unwelcome attention.', k: 0.8, months: 6, success: 55,
    win: { eff: { d: 1.015 }, text: 'The weak rival gave up, and many of its customers came to you.' },
    lose: { now: { d: E(0.97, 4), rep: -2 }, text: 'The rival held on, and the price cuts left you hurting and with a sour reputation.' } },
  // 769 Win-loss analysis on lost customers
  { id: 'rivals_winloss', name: 'Win-loss analysis', blurb: 'Phone customers who chose a rival over you and ask honestly why. Then fix what they say.', k: 0.2, months: 3, success: 85,
    win: { eff: { ch: 0.985 }, text: 'The reasons were clear and fixable, and fewer customers leave.' },
    lose: { now: { rep: -1 }, text: 'Ex-customers did not want to talk, and some felt pestered.' } },
  // 770 Mystery-shopping rivals
  { id: 'rivals_mystery_shop', name: 'Mystery-shop your rivals', blurb: 'Send people in disguise to buy from your rivals and report back on prices, service and tricks.', k: 0.2, months: 2, success: 80,
    win: { eff: { q: 0.01 }, now: { quality: 1 }, text: 'The reports showed where rival service was slower than yours, and you copied their best tricks.' },
    lose: { now: { rep: -1 }, text: 'One of your shoppers was spotted in the rival\'s shop, and the rival was not amused.' } },
];
