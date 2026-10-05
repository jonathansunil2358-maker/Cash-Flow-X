import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Sector topic: Software (SaaS). Everything here is only available to that sector. Every id must start with "software_" (policies and initiatives) or "e9_software_" (events). */
export const policies: PolicyDef[] = [
  // 1 Free tier
  { id: 'software_freetier', group: 'customers', name: 'Free tier', blurb: 'A free version of your app lets people try it before paying. Some turn into paying customers, but the freeloaders still use support and servers.', options: [
    opt('No free version', 'Everyone pays from day one.', {}),
    opt('Small free plan', 'A slim free plan with strict limits. A few users upgrade, and a few lean on support.', { d: 1.015 }, 0.5),
    opt('Generous free plan', 'Lots of free features. Many people try you and plenty upgrade, but the support queue and hosting bill balloon.', { d: 1.03, c: 1.01 }, 1.2)] },
  // 2 Annual-plan discount
  { id: 'software_annualdiscount', group: 'finance', name: 'Annual-plan discount', blurb: 'Offer a discount if customers pay for a whole year up front. You get the cash early, but each month of revenue is smaller.', options: [
    opt('Monthly billing only', 'Customers pay month by month.', {}),
    opt('Two months free on annual', 'Customers who pay yearly stay longer and bring cash forward. You earn less per month from them.', { ch: 0.97 }, 0.8),
    opt('Deep annual discount', 'A big discount pulls in lots of yearly payers and locks them in, but it cuts your monthly revenue noticeably.', { ch: 0.95, d: 1.01 }, 1.6)] },
  // 4 Usage-based pricing
  { id: 'software_usagepricing', group: 'customers', name: 'Usage-based pricing', blurb: 'Instead of one flat fee, customers pay for what they use, like a phone bill. Small customers feel it is fair, but your income swings with their activity.', options: [
    opt('Flat monthly fee', 'One simple price per customer.', {}),
    opt('Flat fee plus usage', 'A base fee with extra charges for heavy use. Busy customers pay more, and some get bill shock.', { d: 1.012, ch: 1.01, risk: [5, 1.5, 'A customer got a shock bill and posted about it online.'] }, 0.3, 0.4),
    opt('Pure pay-as-you-go', 'Easy to start and fair to small users. Your income rises and falls with customer activity.', { d: 1.025, risk: [10, 3, 'Customers used the product less this month, so your bills dipped.'] }, 0.5, 0.8)] },
  // 5 Cloud hosting
  { id: 'software_cloudbill', group: 'ops', name: 'Cloud hosting bill', blurb: 'You rent computers in a huge data centre run by someone else. Without care, the bill grows faster than your sales.', options: [
    opt('Pay as it comes', 'Use whatever you need and pay the bill. Simple, and it creeps up.', {}),
    opt('Monthly cost review', 'Someone switches off forgotten servers and picks cheaper options every month.', { c: 0.985, cap: 0.995 }, 0.3),
    opt('Reserved capacity', 'Promise to use a set amount for a year and get a big discount. If you shrink, you still pay.', { c: 0.97, risk: [4, 2, 'You paid for reserved servers you did not need.'] }, 0.2, 0.6)] },
  // 8 Outage insurance clause
  { id: 'software_uptimepromise', group: 'customers', name: 'Uptime promise and refunds', blurb: 'Uptime is the share of time your app is working. A promise to refund customers if it falls below the mark wins trust, and costs you when things break.', options: [
    opt('No promise', 'You do your best and make no guarantees.', {}),
    opt('Promise 99.5% uptime', 'Customers feel safer. If you miss it, you refund a slice of their bill.', { d: 1.012, ch: 0.985, risk: [4, 3, 'An outage broke your uptime promise and you paid out refunds.'] }, 0.2),
    opt('Promise 99.99% uptime', 'A bold claim that wins big customers. Missing it costs real money.', { d: 1.022, ch: 0.975, risk: [8, 5, 'An outage broke your strict uptime promise and refunds were large.'] }, 0.5)] },
  // 13 Data-centre region
  { id: 'software_region', group: 'ops', name: 'Data-centre region', blurb: 'Where your servers sit. Close to customers means a faster app, and the nearby regions cost more.', options: [
    opt('Cheapest region', 'Servers far away are cheap, and your app feels a bit slow.', {}),
    opt('Region near most customers', 'A quicker app and happier users, for a higher hosting bill.', { d: 1.01, ch: 0.99, c: 1.01 }, 0.3),
    opt('Several regions worldwide', 'Fast everywhere, and complicated and expensive to run.', { d: 1.02, ch: 0.985, c: 1.025, cap: 0.99 }, 0.8, 0.8)] },
  // 22 Patch Tuesday
  { id: 'software_patchcycle', group: 'ops', name: 'Update schedule', blurb: 'How often you push new versions. A fixed monthly release day keeps customers prepared, and a rushed update can break things.', options: [
    opt('Release when ready', 'Updates go out whenever they are finished.', {}),
    opt('Patch Tuesday', 'One fixed release day each month. Predictable and well tested, with the odd bad update.', { q: 0.01, risk: [4, 2, 'A bad monthly update broke something and customers noticed.'] }, 0.2),
    opt('Ship every day', 'Fixes and features arrive constantly. Customers love the pace, and mistakes slip out more often.', { q: 0.02, d: 1.01, risk: [9, 3, 'A rushed update broke a feature and you scrambled to fix it.'] }, 0.4)] },
  // 23 Capitalised dev costs
  { id: 'software_capitalise', group: 'finance', name: 'Capitalising development costs', blurb: 'Capitalising means treating some developer wages as something you own (an asset) and spreading the cost over years, instead of counting it all now. Profits look better today, and the bill still arrives later.', options: [
    opt('Expense everything', 'All developer costs hit profit straight away. Honest and simple.', {}),
    opt('Capitalise some work', 'Profits look healthier on paper. Accountants need extra time, and lenders check it carefully.', { od: 1.1, rep: -0.01 }, 0.3, 0.3),
    opt('Capitalise aggressively', 'Profit looks great and your overdraft limit grows, but auditors and investors may not trust the numbers.', { od: 1.25, rep: -0.04, risk: [5, 3, 'Auditors questioned your capitalised costs and charged extra to review them.'] }, 0.5, 0.5)] },
  // 12 Customer success
  { id: 'software_successteam', group: 'customers', name: 'Customer-success team for named accounts', blurb: 'A customer-success manager looks after your biggest customers by name, checking they use the product well. It keeps them from leaving and costs wages.', options: [
    opt('Everyone gets the same help', 'Standard support for all customers.', {}),
    opt('Look after the top accounts', 'A small team checks in with your biggest customers regularly.', { ch: 0.975 }, 0.8),
    opt('Named manager for every large account', 'Big customers have their own person. Churn drops further, and the cost is real.', { ch: 0.955, rep: 0.02 }, 1.6)] },
];

export const events: EvSpec[] = [
  // 15 Freemium abuse
  { id: 'e9_software_botsignups', title: 'Bots swamp your free plan', icon: 'bolt', good: false, per: 1.2, cd: 14, story: 'Thousands of fake accounts are signing up for your free plan. Robots are using your servers to mine coins and send spam, and your hosting bill is climbing.', choices: [
    S('captcha', 'Add sign-up checks', 'Costs money, blocks most bots, and some real people give up.', 'The checks stopped most bots. A few real users found sign-up annoying.', { k: 0.03, eff: { d: E(0.99, 3) } }),
    S('limits', 'Tighten free limits', 'Free to do, and it upsets genuine free users.', 'Free plans got stricter, and the bots lost interest. So did some honest users.', { eff: { rep: -1, c: E(1.01, 2) } }),
    S('ignore', 'Let it ride', 'Hope it passes, or the bill gets worse.', '', { gamble: { p: 0.35, good: {}, bad: { c: E(1.05, 4), rep: -1 }, goodText: 'The bots wandered off.', badText: 'The bots kept going and your hosting bill shot up for months.' } })] },
  // 20 Roadmap votes
  { id: 'e9_software_roadmapvote', title: 'Customers vote on the roadmap', icon: 'chart', good: true, per: 1.2, cd: 12, story: 'You asked customers to vote on the next features. Your biggest customers want enterprise tools, while the smaller ones want a simpler app. You cannot please both.', choices: [
    S('big', 'Build what the big customers want', 'They pay the most, and smaller users feel ignored.', 'Big customers were delighted and renewed with a smile. Smaller ones grumbled.', { k: 0.03, eff: { d: E(1.03, 5), rep: -1 } }),
    S('many', 'Build what most people voted for', 'The popular choice, and the big customers may sulk.', 'Most users cheered, though a few big accounts threatened to leave.', { k: 0.03, eff: { quality: 1, d: E(1.02, 5) } }),
    S('both', 'Split the effort', 'Half of each. Nobody is fully happy.', 'Both groups got something, and neither got everything.', { k: 0.02, eff: { quality: 1 } })] },
  // 9 App-store listing
  { id: 'e9_software_appstore', title: 'App-store listing offer', icon: 'laptop', good: true, per: 1.1, cd: 16, story: 'A big app store offers to list your software to millions of shoppers. In return it keeps a slice of every sale, called a revenue share. You can bargain over the size of the slice.', choices: [
    S('accept', 'Accept the standard terms', 'Quick and easy, with a big cut going to the store.', 'Customers flowed in. The store kept a large share of each sale.', { eff: { d: E(1.04, 6), c: E(1.02, 6) } }),
    S('haggle', 'Bargain for a smaller cut', 'The store may say no, or may even remove your listing.', '', { gamble: { p: 0.5, good: { d: E(1.04, 6), c: E(1.005, 6) }, bad: { d: E(0.99, 3), rep: -1 }, goodText: 'The store agreed a smaller cut and you got the sales.', badText: 'The store lost patience, delayed your listing and cost you momentum.' } }),
    S('own', 'Stay on your own website', 'No cut, and no extra customers.', 'You kept every penny and missed the crowd.')] },
  // 10 Open-source release
  { id: 'e9_software_opensource', title: 'Release your code for free', icon: 'globe', good: true, per: 1, cd: 20, story: 'Your developers want to publish part of your code as open source, which means anyone can use and copy it. It would build fame and attract helpers, and your rivals could use it too.', choices: [
    S('release', 'Open the whole thing', 'Big fame, and rivals get your code.', '', { gamble: { p: 0.55, good: { brand: 1.04, quality: 1, rep: 2 }, bad: { d: E(0.97, 6), rep: 1 }, goodText: 'Developers praised you and sent fixes for free.', badText: 'A rival copied it and used it to undercut you.' } }),
    S('partial', 'Release a small, safe piece', 'Some fame, and your key secrets stay safe.', 'A modest release won friends and gave nothing precious away.', { eff: { brand: 1.01, rep: 1 } }),
    S('keep', 'Keep it private', 'Safe, and your developers feel let down.', 'The code stayed locked up. Some developers were unhappy.', { eff: { morale: -1 } })] },
  // 3 Enterprise sales cycle
  { id: 'e9_software_bigdeal', title: 'A giant company wants a demo', icon: 'crown', good: true, per: 1.2, cd: 14, story: 'A huge company is interested in your software. Big deals take months of meetings, security checks and a dedicated sales engineer (a technical person who joins sales calls and answers hard questions).', choices: [
    S('engineer', 'Assign a sales engineer', 'Costs wages for months, and gives the best chance.', '', { k: 0.05, gamble: { p: 0.65, good: { d: E(1.06, 10), rep: 2 }, bad: { morale: -1 }, goodText: 'After months of talks, the giant company signed up.', badText: 'They chose someone else after all that effort.' } }),
    S('light', 'Send the usual sales rep', 'Cheap, and big companies like a proper team.', '', { gamble: { p: 0.3, good: { d: E(1.04, 8) }, bad: {}, goodText: 'Your rep somehow won them over.', badText: 'They wanted more attention than you gave, and moved on.' } }),
    S('pass', 'Pass on this one', 'Keep the team on smaller, quicker deals.', 'You stuck to quick, small sales.')] },
  // 6 Technical debt
  { id: 'e9_software_techdebt', title: 'Technical debt piles up', icon: 'gear', good: false, per: 1.3, cd: 12, story: 'Technical debt is the mess left behind when developers take quick shortcuts. Your team says every new feature now takes twice as long, because they keep tripping over old patches.', choices: [
    S('pay', 'Pause features and clean up', 'Costs time and money now, and speeds everything later.', 'The tidy-up was boring and worked. New features flow faster.', { k: 0.05, eff: { quality: 2, morale: 1 } }),
    S('mix', 'Spend one day a week on clean-up', 'A slow, steady fix.', 'Little by little the code got easier to work in.', { k: 0.02, eff: { quality: 1 } }),
    S('keep', 'Keep shipping features', 'Customers get news, and the mess grows.', '', { gamble: { p: 0.4, good: { d: E(1.02, 4) }, bad: { quality: -2, morale: -2 }, goodText: 'New features landed well and the mess held.', badText: 'A fragile part broke, quality slipped and the team was fed up.' } })] },
  // 24 Bug bounty
  { id: 'e9_software_bugbounty', title: 'A researcher finds a security hole', icon: 'shield', good: true, per: 1, cd: 14, story: 'A friendly security researcher emails you about a serious hole in your app. A bug bounty is a reward you pay people who find holes and tell you privately, before attackers find them.', choices: [
    S('pay', 'Pay the reward and fix it fast', 'Costs a reward, and the problem is gone.', 'You fixed the hole quickly and the researcher praised you publicly.', { k: 0.03, eff: { rep: 2, quality: 1 } }),
    S('program', 'Start a proper bounty programme', 'Costs more now, and finds more holes in future.', 'Researchers now send their findings to you instead of the press.', { k: 0.06, eff: { rep: 2, quality: 2, brand: 1.01 } }),
    S('ignore', 'Say thanks and do nothing', 'Free, and risky if someone less friendly finds it.', '', { gamble: { p: 0.45, good: {}, bad: { rep: -4, d: E(0.95, 5) }, goodText: 'Nobody else noticed.', badText: 'Attackers found the same hole and customers lost trust.' } })] },
  // 14 Beta programme
  { id: 'e9_software_beta', title: 'Run a beta before launch?', icon: 'rocket', good: true, per: 1.1, cd: 12, story: 'Your big new version is nearly ready. A beta programme lets a few customers try it early so they find the bugs, though it delays the official launch.', choices: [
    S('beta', 'Run a two-month beta', 'The launch is later and much smoother.', 'Beta users found loads of bugs. The launch was delayed and clean.', { k: 0.02, eff: { quality: 2, d: E(0.99, 2) } }),
    S('quick', 'A short one-week beta', 'A compromise that catches only the worst bugs.', 'A quick look caught the big problems.', { eff: { quality: 1 } }),
    S('launch', 'Launch now', 'First to market, and bugs reach every customer.', '', { gamble: { p: 0.5, good: { d: E(1.04, 4), brand: 1.01 }, bad: { quality: -2, rep: -2, d: E(0.97, 3) }, goodText: 'The launch went smoothly and made a splash.', badText: 'Bugs hit everyone at once and the support inbox exploded.' } })] },
  // 25 Acqui-hire
  { id: 'e9_software_acquihire', title: 'A tiny startup is up for grabs', icon: 'key', good: true, per: 1, cd: 18, story: 'A small startup has built a clever feature you lack and is running out of money. An acqui-hire means buying the company mainly to get its team and technology.', choices: [
    S('buy', 'Buy the startup and its team', 'Costs a lot, and you gain a feature and developers.', '', { k: 0.1, gamble: { p: 0.65, good: { quality: 3, morale: 2, d: E(1.04, 6) }, bad: { morale: -2, quality: 1 }, goodText: 'The new team joined happily and shipped the feature fast.', badText: 'Half the team left within weeks and the feature was harder to use than hoped.' } }),
    S('license', 'License their feature instead', 'Cheaper, and you do not get the people.', 'You rented their feature without taking on the team.', { k: 0.04, eff: { quality: 1 } }),
    S('wait', 'Wait and see', 'Someone else may snap them up.', 'A rival hired the team a month later.')] },
];

export const projects: InitiativeDef[] = [
  // 7 Security certification
  { id: 'software_securitycert', name: 'Security certification', blurb: 'An independent audit that proves your software handles data safely. Banks, hospitals and councils will not buy without one. It is long, costly and you can fail.', k: 1.2, months: 8, success: 70,
    win: { eff: { d: 1.03 }, now: { rep: 2, brand: 1.01 }, text: 'You passed the audit. Regulated customers can now buy from you.' },
    lose: { now: { morale: -2 }, text: 'The auditors found gaps and you must start again.' } },
  // 11 Plugin marketplace
  { id: 'software_marketplace', name: 'Plugin marketplace', blurb: 'A shop inside your app where partners sell add-ons and you keep a share of each sale. It grows your product without your developers, and partners must want to build for you.', k: 1.5, months: 9, success: 55,
    win: { eff: { d: 1.03, ch: 0.98 }, monthly: -0.3, text: 'Partners built useful add-ons, customers stay longer and every sale gives you a cut.' },
    lose: { now: { morale: -2, rep: -1 }, text: 'Few partners signed up and the shop feels empty.' } },
  // 16 Annual conference
  { id: 'software_conference', name: 'Host an annual conference', blurb: 'A big event with talks, demos and drinks. It brings enterprise buyers face to face with you. It is expensive, and if nobody comes it is embarrassing.', k: 1, months: 6, success: 65,
    win: { eff: { d: 1.02 }, now: { brand: 1.02, rep: 2 }, text: 'The hall was full and several large companies asked for demos.' },
    lose: { now: { rep: -2, morale: -2 }, text: 'Few people came and the empty chairs were noticeable.' } },
  // 17 Developer relations
  { id: 'software_devrel', name: 'Developer-relations team', blurb: 'Developer relations means hiring friendly experts who talk to outside developers, write guides and go to meet-ups. It grows an ecosystem of people who build with your product, slowly.', k: 1.2, months: 14, success: 60,
    win: { eff: { d: 1.03, q: 0.02 }, monthly: 0.4, now: { brand: 1.02 }, text: 'Outside developers now build on your platform, and recommend it to colleagues.' },
    lose: { now: { morale: -1 }, text: 'The team wrote lots of guides that few people read.' } },
  // 18 Pricing-page experiments
  { id: 'software_pricingtests', name: 'Pricing-page experiments', blurb: 'An A/B test shows different versions of your pricing page to different visitors and counts who signs up. It gives clear numbers, though some tests make things worse.', k: 0.3, months: 3, success: 80,
    win: { eff: { d: 1.015 }, text: 'The winning page converts more visitors to customers, and you know why.' },
    lose: { now: { d: E(0.98, 2) }, text: 'A bad test version confused visitors and sign-ups dipped for a while.' } },
  // 19 Reseller partners
  { id: 'software_resellers', name: 'Reseller partners', blurb: 'Resellers are other companies that sell your software for a margin, which is a slice of each sale. They bring customers you could not reach, and they own the relationship with them.', k: 0.8, months: 6, success: 65,
    win: { eff: { d: 1.04, c: 1.01, ch: 1.01 }, text: 'Resellers brought in many customers, and kept a slice of every sale.' },
    lose: { now: { rep: -1, d: E(0.98, 3) }, text: 'The resellers sold little and gave customers a muddled picture of your product.' } },
  // 21 On-premise version
  { id: 'software_onprem', name: 'On-premise version', blurb: 'An on-premise version runs on the customer\'s own computers instead of the cloud. Customers who refuse the cloud can finally buy, and you must support a second product.', k: 1.8, months: 12, success: 55,
    win: { eff: { d: 1.03, cap: 0.99 }, now: { rep: 1 }, text: 'Cautious customers signed up, and your team learned to support two versions.' },
    lose: { now: { morale: -3, quality: -1 }, text: 'The second version was buggy and ate your developers\' time.' } },
];
