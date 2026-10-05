import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Topic: Marketing. Every id starts with "marketing_" (policies and projects) or "e9_marketing_" (events). */
export const policies: PolicyDef[] = [
  { id: 'marketing_brandsurvey', group: 'customers', name: 'Brand-awareness survey', blurb: 'Ask a sample of people whether they have heard of you and what they think. It shows you whether your marketing is working.', options: [
    opt('No tracking', 'You guess how well known you are.', {}),
    opt('Quarterly survey', 'A short survey every three months guides where you spend.', { d: 1.004 }, 0.15),
    opt('Monthly tracker', 'A proper panel of people every month. Sharper steering, and a real cost.', { d: 1.007 }, 0.4)] },

  { id: 'marketing_seasonbudgets', group: 'customers', name: 'Fixed seasonal budgets', blurb: 'Split your marketing money into fixed pots for each season. It keeps spending under control, but it cannot react when something unexpected happens.', options: [
    opt('Spend as you go', 'You decide month by month.', {}),
    opt('Four equal pots', 'The same amount for every season. Tidy, and it keeps the team honest.', { d: 1.01 }, 0.4),
    opt('Big peak-season pot', 'Save up for your busiest season and go big. If a rival strikes first, your pot may already be spent.', { d: 1.018, risk: [4, 3, 'A rival launched a surprise campaign and your marketing pot was already spent.'] }, 0.8)] },

  { id: 'marketing_content', group: 'customers', name: 'Content marketing', blurb: 'Useful articles, videos and guides that people find on their own. It takes months to build, and then it keeps working for you.', options: [
    opt('No content', 'You rely on adverts and word of mouth.', {}),
    opt('Publish steadily', 'A regular stream of helpful posts. Slow to build, and each one keeps paying.', { br: 1.001, d: 1.003 }, 0.4),
    opt('Run a content studio', 'A small team making videos and guides all year. A bigger bill and a bigger voice.', { br: 1.002, d: 1.006 }, 0.9, 0.5)] },

  { id: 'marketing_email', group: 'customers', name: 'Email list', blurb: 'Emails to people who signed up. Cheap and effective, until they get tired of hearing from you and unsubscribe.', options: [
    opt('No emails', 'You do not email customers.', {}),
    opt('Monthly newsletter', 'One useful email a month, which most people are happy to read.', { d: 1.008 }, 0.15),
    opt('Email every week', 'More sales now, and more people unsubscribe or mark you as spam. This is called email fatigue.', { d: 1.015, ch: 1.01, rep: -0.02 }, 0.25)] },

  { id: 'marketing_audio', group: 'customers', name: 'Radio and podcast ads', blurb: 'Adverts people hear rather than see. Radio reaches many people at once, and podcast listeners tend to trust the host.', options: [
    opt('No audio ads', 'Your money goes elsewhere.', {}),
    opt('Local radio slots', 'Wide reach across your area, and the slots are not cheap.', { d: 1.012 }, 0.7),
    opt('Podcast sponsorships', 'Smaller audiences who really listen and trust the host. Cheaper and slower.', { d: 1.007, ch: 0.99 }, 0.4)] },

  { id: 'marketing_affiliate', group: 'customers', name: 'Affiliate commission tiers', blurb: 'Affiliates are people and websites who promote you in return for a commission on each sale they bring.', options: [
    opt('No affiliates', 'You do not pay anyone to promote you.', {}),
    opt('Flat commission', 'The same share of each sale for every affiliate.', { d: 1.012 }, 0.6),
    opt('Tiered commission', 'Higher rates for top affiliates, so they work harder. Watch out for cheats.', { d: 1.022, risk: [5, 2, 'An affiliate gamed the tiers with fake orders, and you still paid out.'] }, 1.1)] },

  { id: 'marketing_targeting', group: 'customers', name: 'Customer targeting', blurb: 'Choose which kind of customer your marketing talks to. You cannot be everything to everybody.', options: [
    opt('Everyone', 'Your marketing speaks to anyone who will listen.', {}),
    opt('Young adults', 'Loud, fast and fickle. They find you quickly and leave just as fast.', { d: 1.015, ch: 1.015 }, 0.4),
    opt('Families', 'Loyal and careful with money. They take longer to decide, and they stay.', { ch: 0.98, d: 0.995 }, 0.2),
    opt('Busy professionals', 'Time-poor people with money who notice quality and want it done properly. A smaller crowd.', { rep: 0.02, d: 0.995 }, 0.5)] },

  { id: 'marketing_comarketing', group: 'customers', name: 'Co-marketing partner', blurb: 'Team up with a friendly brand and promote each other to your customers.', options: [
    opt('Go it alone', 'You promote only yourself.', {}),
    opt('Swap mentions', 'You each mention the other to your followers. Cheap, and you share their reputation, good or bad.', { d: 1.008, risk: [3, 1.5, 'Your partner had a bad week in the press, and some of it splashed on you.'] }, 0.1),
    opt('Joint campaigns', 'Shared adverts and events with a partner. Bigger reach, and more at stake.', { d: 1.018, br: 1.0005, risk: [5, 2, 'A joint campaign went wrong, and both brands looked silly.'] }, 0.5)] },

  { id: 'marketing_repmonitor', group: 'customers', name: 'Reputation monitoring', blurb: 'A tool that tells you when people mention you online, so you can thank the fans and fix complaints early.', options: [
    opt('Check now and then', 'You search for your name when you remember to.', {}),
    opt('Alerts for your name', 'An alert whenever you are mentioned, so you can reply the same day.', { rep: 0.015 }, 0.12),
    opt('Monitoring service with a response team', 'Someone watches all day and answers for you. Problems get fixed before they spread.', { rep: 0.035 }, 0.4, 0.3)] },
];

export const events: EvSpec[] = [
  { id: 'e9_marketing_attribution', title: 'Sales and marketing argue over credit', icon: 'chart', good: false, per: 2, cd: 24, gate: 'team',
    story: 'A customer bought after seeing an ad, getting an email and walking past a billboard. Marketing says the ad won the sale. Sales says it was their phone call. Attribution is the set of rules for deciding which activity gets the credit, and the argument is getting heated.', choices: [
      S('lastclick', 'Credit the last step before the sale', 'Simple, and it favours sales over marketing.', 'The rule was simple, and the marketing team felt undervalued.', { eff: { morale: -1 } }),
      S('split', 'Split the credit across every step', 'Fairer, and it takes more analysis.', 'Both teams felt fairly treated, and the budget moved towards what worked.', { k: 0.01, eff: { morale: 2, d: E(1.01, 4) } }),
      S('quiet', 'Tell them to stop arguing', 'Free, and the argument may carry on.', '', { gamble: { p: 0.5, good: { morale: 1 }, bad: { morale: -3 }, goodText: 'They shook hands and got on with work.', badText: 'The grudge festered, and the two teams stopped talking.' } })] },

  { id: 'e9_marketing_disclosure', title: 'An influencer forgot to say it was an ad', icon: 'camera', good: false, per: 2, cd: 20,
    story: 'An influencer you paid has posted about you without saying it is an advert. In the UK, paid posts must be clearly marked, and the advertising watchdog can name and shame firms that forget.', choices: [
      S('fix', 'Ask them to add the label now', 'Quick and cheap, and it costs you some of the glow.', 'The post was fixed within the hour, and the watchdog never looked.', { eff: { rep: 1, d: E(0.99, 2) } }),
      S('rules', 'Send every creator a rule sheet', 'A small cost, and it stops it happening again.', 'Your creators learned the rules, and your posts stayed clean.', { k: 0.01, acct: 'marketing', eff: { rep: 2 } }),
      S('ignore', 'Let it go', 'Free, and a gamble with the watchdog.', '', { gamble: { p: 0.6, good: {}, bad: { rep: -3, brand: 0.98 }, goodText: 'Nobody noticed.', badText: 'The watchdog named your firm in a public ruling.' } })] },

  { id: 'e9_marketing_placement', title: 'A TV show wants your product on screen', icon: 'camera', good: true, per: 1.5, cd: 30,
    story: 'A popular series is filming near you, and the producers offer to feature your product on screen. This is called product placement. A starring role costs a lot, and a background cameo is cheap but easy to miss.', choices: [
      S('star', 'Pay for a starring role', 'Expensive, and it might make you famous.', '', { k: 0.06, acct: 'marketing', gamble: { p: 0.6, good: { d: E(1.05, 4), brand: 1.03 }, bad: { rep: -1 }, goodText: 'Viewers noticed, and searches for you went through the roof.', badText: 'The scene was cut from the final edit.' } }),
      S('cameo', 'Settle for a background cameo', 'Cheap, and easy to miss.', 'You can spot it if you look closely.', { k: 0.01, acct: 'marketing', eff: { brand: 1.01 } }),
      S('pass', 'Say no', 'You keep your budget.', 'You kept your budget for something else.')] },

  { id: 'e9_marketing_tradepress', title: 'A trade magazine wants your opinion', icon: 'star', good: true, per: 2, cd: 24,
    story: 'A magazine read by people in your trade is writing a feature about your sector and would like your views, including what you think of your rivals. Customers, suppliers and competitors will all read your answers.', choices: [
      S('bold', 'Give a bold, opinionated interview', 'Memorable, and you might ruffle feathers.', '', { gamble: { p: 0.65, good: { brand: 1.02, rep: 1 }, bad: { rep: -2 }, goodText: 'Your quotes were widely shared across the trade.', badText: 'One line about a rival was quoted out of context.' } }),
      S('prepared', 'Prepare answers with a PR adviser', 'Safe and a bit dull, with a small bill.', 'You came across as polished and sensible.', { k: 0.01, acct: 'marketing', eff: { rep: 1 } }),
      S('decline', 'Politely decline', 'No risk and no reward.', 'You stayed out of the story.')] },

  { id: 'e9_marketing_couponbook', title: 'A coupon book offers you a page', icon: 'parcel', good: true, per: 2, cd: 18,
    story: 'A local coupon book, posted to thousands of homes, has space left for a page of offers. Coupons bring in people who want a bargain, and many of them never come back at full price.', choices: [
      S('big', 'Run a big offer on a full page', 'Lots of eyes, and lots of bargain hunters.', '', { k: 0.04, acct: 'marketing', gamble: { p: 0.6, good: { d: E(1.04, 3), brand: 1.01 }, bad: { c: E(1.01, 3) }, goodText: 'Redemptions poured in, and several newcomers became regulars.', badText: 'Most coupons came from people who only ever buy with a voucher.' } }),
      S('small', 'Take a small quarter-page ad', 'Cheaper and gentler.', 'A modest ad brought a modest, welcome bump.', { k: 0.01, acct: 'marketing', eff: { d: E(1.01, 3) } }),
      S('no', 'Decline', 'You keep your full prices intact.', 'You kept your prices, and your pride.', { eff: { brand: 1.002 } })] },

  { id: 'e9_marketing_comparison', title: 'Your agency wants to name a rival in an ad', icon: 'flame', good: true, per: 2, cd: 24, gate: 'rivals',
    story: 'Your agency has a clever idea for an advert that compares you directly with a named rival. Comparison ads can be powerful, but the rules say they must be fair and provable, and rivals love to send lawyers.', choices: [
      S('bold', 'Run the bold version', 'Big reaction, and a real chance of a legal letter.', '', { k: 0.03, acct: 'marketing', gamble: { p: 0.5, good: { d: E(1.05, 4), brand: 1.02 }, bad: { rep: -2, d: E(0.98, 3) }, goodText: 'The ad was a hit, and the rival had no answer.', badText: 'The rival\'s lawyers wrote to you, and you had to pull it.' } }),
      S('facts', 'Stick to checked facts', 'A modest ad that stands up in court.', 'Every claim was proven, and the ad ran without trouble.', { k: 0.02, acct: 'marketing', eff: { d: E(1.02, 3) } }),
      S('drop', 'Drop the idea', 'You keep your money and your peace.', 'You decided a fight was not worth it.')] },

  { id: 'e9_marketing_carryover', title: 'Budget left over at year end', icon: 'chart', good: false, per: 2, cd: 12,
    story: 'The marketing year is ending and some of the budget is unspent. Your rule says unspent money disappears, so the team is tempted to spend it quickly on anything. The alternative is to let unspent money carry over into next year.', choices: [
      S('spend', 'Spend it all before the deadline', 'Rushed spending rarely buys much.', '', { k: 0.03, acct: 'marketing', gamble: { p: 0.4, good: { d: E(1.02, 3) }, bad: { rep: -1 }, goodText: 'A rushed campaign got lucky and brought in sales.', badText: 'The rushed adverts were forgettable, and the money was wasted.' } }),
      S('carry', 'Carry it over into next year', 'Free now, and saved for a bigger campaign.', 'The saved money funded a stronger campaign next year.', { eff: { d: E(1.01, 6) } }),
      S('bank', 'Take it back into profit', 'Free, and the marketing team grumble.', 'The money went back to the bottom line, and the marketing team grumbled.', { eff: { morale: -1 } })] },

  { id: 'e9_marketing_adblock', title: 'More people block your online ads', icon: 'laptop', good: false, per: 2, cd: 20,
    story: 'Your numbers show a growing share of visitors using ad blockers, which hide your adverts. You pay for online ads by the view, and fewer people are seeing them. Some audiences block far more than others.', choices: [
      S('native', 'Shift money to sponsored articles', 'Harder to block, and dearer per reader.', 'Sponsored articles reached people the blockers had hidden you from.', { k: 0.02, acct: 'marketing', eff: { d: E(1.015, 4) } }),
      S('lighter', 'Make your ads lighter and less annoying', 'Fewer people block them in the first place.', '', { k: 0.01, acct: 'marketing', gamble: { p: 0.65, good: { d: E(1.02, 4) }, bad: {}, goodText: 'Quieter ads got through, and people did not mind them.', badText: 'The ads were nicer, though it made no real difference.' } }),
      S('accept', 'Accept the lost reach', 'Free, and a slow decline.', 'Your reach shrank quietly.', { eff: { d: E(0.99, 6) } })] },

  { id: 'e9_marketing_brandsafety', title: 'Your ad appears next to something awful', icon: 'shield', good: false, per: 2, cd: 24,
    story: 'A customer sends you a screenshot of your advert sitting beside a hateful video. Ad networks place adverts automatically, and sometimes they land in places no brand wants to be. This is called a brand-safety incident.', choices: [
      S('pull', 'Pull all ads from the network', 'Costs you reach now, and protects your name.', 'You pulled your ads, and people noticed that you acted at once.', { eff: { d: E(0.98, 3), rep: 1 } }),
      S('complain', 'Publicly demand a refund and an apology', 'Shows you care, and makes it a bigger story.', '', { gamble: { p: 0.6, good: { rep: 2, brand: 1.01 }, bad: { rep: -1 }, goodText: 'People applauded you for standing up.', badText: 'The row made the original screenshot spread further.' } }),
      S('tighten', 'Say nothing and tighten the settings', 'Quiet, cheap and uncertain.', '', { k: 0.005, acct: 'marketing', gamble: { p: 0.6, good: {}, bad: { rep: -2 }, goodText: 'The screenshot vanished within a day.', badText: 'The screenshot spread, and people asked why you were silent.' } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'marketing_mixmodel', name: 'Marketing-mix model', k: 0.6, months: 6, success: 65,
    blurb: 'A model that shows what each marketing channel earns you, so that you spend more where it works and less where it does not.',
    win: { eff: { d: 1.01 }, monthly: -0.2, text: 'The model showed two channels were wasting money. You moved the budget, and sales rose.' },
    lose: { now: { morale: -1 }, text: 'The model told you what you already knew, and it cost a fortune.' } },

  { id: 'marketing_seo', name: 'Search-engine optimisation', k: 0.5, months: 10, success: 70,
    blurb: 'Make your website easier to find on search sites. It is slow to start, and it keeps paying for years.',
    win: { eff: { d: 1.02 }, monthly: 0.1, text: 'You now appear near the top of the results, and new customers keep arriving for free.' },
    lose: { now: { d: E(0.98, 3) }, text: 'A search-engine update wiped out your rankings, and you had to start again.' } },

  { id: 'marketing_billboards', name: 'Billboard blitz in key cities', k: 1, months: 3, success: 70,
    blurb: 'Book billboards in a few key cities for a month. Very visible, and it only works while the posters are up.',
    win: { now: { d: E(1.06, 5), brand: 1.02 }, text: 'Your name was everywhere for a month, and people kept talking about it.' },
    lose: { now: { rep: -1 }, text: 'The billboards were in the wrong places, and the campaign got lost in the noise.' } },

  { id: 'marketing_casestudies', name: 'Customer case-study videos', k: 0.4, months: 4, success: 75,
    blurb: 'Film happy customers telling their own stories. People trust other customers more than they trust adverts.',
    win: { eff: { d: 1.01 }, now: { rep: 1 }, text: 'Real customers made a far better advert than you could have written.' },
    lose: { now: { rep: -1 }, text: 'A customer pulled out at the last minute, and the shoot was wasted.' } },

  { id: 'marketing_refresh', name: 'Brand refresh with an agency', k: 1.5, months: 6, success: 65,
    blurb: 'Hire an agency to rework your logo, colours and message. Costly, and it can make you look brand new or confuse your regulars.',
    win: { eff: { d: 1.01, rep: 0.01 }, now: { brand: 1.04, d: E(1.03, 6) }, text: 'The new look landed well, and people saw you with fresh eyes.' },
    lose: { now: { brand: 0.97, rep: -2 }, text: 'The new look split opinion, and regulars asked for the old one back.' } },

  { id: 'marketing_testcity', name: 'Test-market city launch', k: 0.5, months: 4, success: 70,
    blurb: 'Try a new campaign in one city before going nationwide. A test is cheap compared with a big mistake.',
    win: { eff: { d: 1.01 }, now: { d: E(1.03, 6) }, text: 'The test city loved it, and you rolled out the winning formula elsewhere.' },
    lose: { now: { rep: -1 }, text: 'The test city did not take to it, which at least saved you from a bigger mistake.' } },

  { id: 'marketing_roadshow', name: 'Roadshow tour', k: 1.2, months: 4, success: 70,
    blurb: 'Take a stand and a van on tour, so that people can see and try what you sell face to face.',
    win: { now: { d: E(1.05, 5), brand: 1.02, morale: 2 }, text: 'Crowds queued at every stop, and the team came home buzzing.' },
    lose: { now: { morale: -2 }, text: 'Rain, a broken-down van and tiny crowds made it a long summer.' } },
];
