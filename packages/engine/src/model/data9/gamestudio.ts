import { opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Sector topic: Game studio. Every id must start with "gamestudio_" (policies and initiatives) or "e9_gamestudio_" (events). */
export const policies: PolicyDef[] = [
  // 251 Crunch
  { id: 'gamestudio_crunch', group: 'people', name: 'Crunch time', blurb: 'Crunch means the whole team works nights and weekends to hit a release date. The game gets more polished, and tired people quit, make mistakes and burn out.', options: [
    opt('Normal hours', 'Work a fair week and let the date slip if it must.', {}),
    opt('Occasional crunch', 'A few hard weeks before each release. The game improves and morale takes a dent.', { q: 0.02, m: -0.3, risk: [3, 2, 'A tired developer broke the build and it took a weekend to repair.'] }, 0.2),
    opt('Permanent crunch', 'Everyone works flat out all year. Quality climbs for a while, then people leave and bugs creep in.', { q: 0.04, m: -0.8, rep: -0.01, risk: [8, 4, 'Burned-out staff resigned and a rushed feature had to be redone.'] }, 0.5)] },
  // 252 Publisher advance
  { id: 'gamestudio_publisher', group: 'finance', name: 'Publisher advance', blurb: 'A publisher is a big company that pays you money up front (an advance) and handles marketing. In return it keeps a share of your sales until the advance is repaid.', options: [
    opt('Self-funded', 'You pay for everything and keep every sale.', {}),
    opt('Small advance', 'A publisher fronts some cash and pushes your game. It takes a slice of each sale.', { od: 1.2, c: 1.03, d: 1.015 }, 0.4),
    opt('Full publishing deal', 'Lots of cash and a big marketing push, and the publisher owns a large share of your income and has a say in the game.', { od: 1.35, c: 1.06, d: 1.03, q: -0.01 }, 0.8)] },
  // 253 Early access
  { id: 'gamestudio_earlyaccess', group: 'customers', name: 'Early access', blurb: 'Early access means selling an unfinished game cheaply so players help you find problems. You earn money sooner, and some players judge you on the rough version.', options: [
    opt('Finished games only', 'Players only see the game when it is ready.', {}),
    opt('Short early access', 'A few months of paid testing. Feedback improves the game and brings early sales.', { d: 1.02, q: 0.015, risk: [4, 2, 'Early players posted harsh reviews of unfinished parts.'] }, 0.2),
    opt('Long early access', 'The game stays in testing for a year or more. Fans shape it, and patience can wear thin.', { d: 1.03, q: 0.025, rep: -0.01, risk: [8, 3, 'Players got fed up with slow updates and demanded refunds.'] }, 0.4)] },
  // 254 Platform fee
  { id: 'gamestudio_platformdeal', group: 'finance', name: 'Store fee deal', blurb: 'Stores like Steam or the console shops keep about 30% of every sale. You can try to bargain that fee down, usually by giving something up.', options: [
    opt('Standard terms', 'Pay the usual cut and sell wherever you like.', {}),
    opt('Exclusive to one store', 'The store cuts its fee and promotes you, and players on other stores cannot buy.', { c: 0.96, d: 0.97 }, 0.2),
    opt('Sell on every store', 'More shop windows and more customers, with extra paperwork and fees to run.', { d: 1.03, c: 1.01 }, 0.3)] },
  // 255 DLC schedule
  { id: 'gamestudio_dlc', group: 'customers', name: 'Downloadable content', blurb: 'DLC is extra content sold after launch, such as new levels or outfits. It keeps old games earning, and rushed DLC makes players feel they paid for a half-game.', options: [
    opt('No extras', 'You finish the game and start the next one.', {}),
    opt('Cosmetic packs', 'Outfits and skins every few months. Easy to make and keeps income flowing.', { d: 1.02, rep: -0.005 }, 0.3),
    opt('Big paid expansions', 'Large add-ons bring back old players and pull developers off the next game.', { d: 1.035, q: -0.015, risk: [6, 2, 'Players accused you of cutting content from the main game to sell it as DLC.'] }, 0.7)] },
  // 256 Engine licence
  { id: 'gamestudio_engine', group: 'ops', name: 'Game engine', blurb: 'The engine is the software that runs your game. You can use a free one, pay a licence fee to a famous one, or build your own at great expense.', options: [
    opt('Free open engine', 'No fee, and your team fights its limits.', {}),
    opt('Licensed commercial engine', 'You pay a share of sales for tools that save time and look better.', { q: 0.02, cap: 1.02 }, 1),
    opt('Build your own engine', 'Years of work, then full control and no fees. The first months are slow and risky.', { q: 0.03, cap: 1.03, risk: [6, 3, 'A core engine bug stalled the whole team for weeks.'] }, 0.4, 2.5)] },
  // 258 Seasonal sales and bundles
  { id: 'gamestudio_sales', group: 'customers', name: 'Seasonal sales and bundles', blurb: 'Stores run big discount weeks, and you can join them or bundle games together. You sell far more copies, each for less, and players learn to wait for a bargain.', options: [
    opt('Full price always', 'You never cut the price and miss the bargain hunters.', {}),
    opt('Join the big sales', 'Discount in the winter and summer sales. More copies, less money per copy.', { d: 1.03, rep: -0.005 }, 1),
    opt('Constant bundles and deep discounts', 'Always on offer. Heaps of players, and nobody buys at full price any more.', { d: 1.05, rep: -0.02, br: 0.998 }, 1.8)] },
  // 259/260 Live service
  { id: 'gamestudio_liveservice', group: 'ops', name: 'Online play and live service', blurb: 'A live-service game stays online for years with updates and multiplayer. It keeps players paying, and servers cost money every month whether anyone is playing or not.', options: [
    opt('Single-player only', 'Nothing to keep running once it is released.', {}),
    opt('Light online features', 'Leaderboards and co-op. A modest bill for servers.', { d: 1.02, c: 1.015 }, 0.4),
    opt('Always-online live service', 'Constant updates and a big player community, with costly servers and a tired team.', { d: 1.04, c: 1.03, m: -0.2, risk: [6, 3, 'The servers crashed on a busy night and angry players demanded refunds.'] }, 0.8, 1)] },
  // 261 Esports
  { id: 'gamestudio_esports', group: 'customers', name: 'Esports sponsorship', blurb: 'Esports are organised tournaments where players compete at video games. Sponsoring one puts your name in front of fans, and only a competitive game is worth it.', options: [
    opt('No esports', 'You stay out of the tournament scene.', {}),
    opt('Local tournaments', 'Small prizes at community events. Fans notice and brand grows a little.', { d: 1.01, br: 1.002 }, 0.5),
    opt('Sponsor a pro league', 'Big prizes, big crowds and a big bill. If the game is not competitive the money is wasted.', { d: 1.025, br: 1.004, risk: [8, 3, 'A star team dropped your game and the audience drifted away.'] }, 1.6)] },
  // 263 Mod support
  { id: 'gamestudio_mods', group: 'customers', name: 'Mod community support', blurb: 'Mods are changes to your game made by fans, for free. Helping them keeps old games alive, though some mods break the rules or use things you do not own.', options: [
    opt('No mods allowed', 'You lock the game down.', {}),
    opt('Official mod tools', 'You publish tools and let fans experiment.', { d: 1.02, q: 0.01, risk: [3, 2, 'A fan mod used stolen artwork and you got a legal complaint.'] }, 0.3),
    opt('Workshop and contests', 'A shop for mods with prizes. Fans keep the game fresh for years, and you need staff to moderate it.', { d: 1.03, q: 0.015, rep: 0.01, risk: [4, 2, 'An offensive mod went viral before moderators could remove it.'] }, 0.8, 0.5)] },
  // 270 Licensed brand
  { id: 'gamestudio_licence', group: 'finance', name: 'Licensed brand', blurb: 'A licence lets you make a game about a famous film or comic. Fans buy it on sight, and you pay a royalty (a share of every sale) to the owner.', options: [
    opt('Original ideas only', 'You own everything and nobody knows your name yet.', {}),
    opt('Licensed franchise', 'Instant recognition. The owner takes a big royalty and can veto your ideas.', { d: 1.05, c: 1.05, risk: [4, 2, 'The brand owner demanded changes at the last minute and delayed the game.'] }, 0.4, 1)] },
  // 272 Monetisation ethics
  { id: 'gamestudio_monetise', group: 'customers', name: 'In-game purchases', blurb: 'In-game purchases are small payments inside a game for outfits or boosts. Loot boxes are paid random prizes, a lot like gambling, and the press and regulators dislike them.', options: [
    opt('Pay once, nothing more', 'Players buy the game and that is all.', {}),
    opt('Fair cosmetic shop', 'Only outfits and decorations, never an advantage. Honest income.', { d: 1.02 }, 0.3),
    opt('Loot boxes and pay-to-win', 'Players spend a lot more. Anger, bad press and the odd refund wave follow.', { d: 1.05, rep: -0.04, risk: [8, 4, 'A news story called your game predatory and a wave of players demanded refunds.'] }, 0.2)] },
  // 273 Player data privacy
  { id: 'gamestudio_privacy', group: 'finance', name: 'Player-data privacy', blurb: 'Games collect lots of facts about players, and the law says you must protect them and ask permission. Collecting less costs you useful information and earns trust.', options: [
    opt('Follow the basic rules', 'Meet the legal minimum and hope for the best.', {}),
    opt('Collect only what you need', 'Less data to lose and fewer targeted offers. Players trust you more.', { rep: 0.01, d: 0.99 }, 0.2),
    opt('Privacy audited by outsiders', 'An outside firm checks you every year. Costly and a strong reputation, with a lot less data to sell ads from.', { rep: 0.02, d: 0.985 }, 0.3, 1)] },
];

export const events: EvSpec[] = [
  // 262 Cancelled project write-off
  { id: 'e9_gamestudio_cancelled', title: 'A game is going nowhere', icon: 'gear', good: false, per: 1.2, cd: 14, story: 'Your biggest unreleased game is two years in and testers are bored by it. Cancelling means writing off (counting as lost) everything spent so far. Carrying on risks spending even more on a flop.', choices: [
    S('cancel', 'Cancel it and write it off', 'A painful loss now, and the team starts fresh.', 'You took the loss and the team moved on to something better.', { k: 0.08, eff: { morale: -1, quality: 1 } }),
    S('pivot', 'Rework it into something smaller', 'Salvage the best bits into a cheaper game.', 'The leftover bits became a small, decent game.', { k: 0.04, eff: { morale: -1 } }),
    S('push', 'Keep going and hope', 'No loss yet, and the bill keeps growing.', '', { gamble: { p: 0.3, good: { d: E(1.04, 6), rep: 1 }, bad: { c: E(1.04, 5), morale: -2, rep: -1 }, goodText: 'Late changes turned it into a surprise hit.', badText: 'It launched to a shrug and you spent a fortune for nothing.' } })] },
  // 264 Console certification delays
  { id: 'e9_gamestudio_certdelay', title: 'Console makers reject your build', icon: 'shield', good: false, per: 1.2, cd: 12, story: 'Console makers test every game and reject ones that fail their rules, called certification. Your game failed on a small point. Each delay means paying the team while no copies sell.', choices: [
    S('fix', 'Fix it and resubmit', 'Costs a few weeks of wages.', 'You fixed the problem and passed the second time.', { k: 0.03, eff: { d: E(0.99, 2) } }),
    S('rush', 'Pay for a rush review', 'Expensive, and quick.', 'The rush review cleared you in days.', { k: 0.06 }),
    S('skip', 'Skip that console for now', 'Cheap, and console players cannot buy it.', 'You dropped the console version and lost those sales.', { eff: { d: E(0.97, 4), rep: -1 } })] },
  // 265 Game show
  { id: 'e9_gamestudio_gameshow', title: 'Game show booth offer', icon: 'rocket', good: true, per: 1.2, cd: 12, story: 'A huge games show wants exhibitors. A stand puts your game in front of thousands of players and journalists, and the stands, travel and demo machines are not cheap.', choices: [
    S('big', 'Book a large stand', 'A big bill, and a big chance of attention.', '', { k: 0.08, gamble: { p: 0.6, good: { d: E(1.05, 5), brand: 1.02, rep: 2 }, bad: { morale: -1 }, goodText: 'Queues formed at your stand and magazines wrote about you.', badText: 'The hall was quiet and the stand cost a fortune.' } }),
    S('indie', 'Join the indie corner', 'Cheap, and easy to overlook.', 'A small stand brought a few fans and some kind words.', { k: 0.02, eff: { brand: 1.01 } }),
    S('skip', 'Stay home', 'Save the money, and nobody sees the game.', 'The team stayed home and shipped features.')] },
  // 257 Review scores
  { id: 'e9_gamestudio_reviews', title: 'Review scores arrive', icon: 'star', good: true, per: 1.3, cd: 12, story: 'Reviewers have finished your latest game and their scores are about to be published. Players rely heavily on scores, so a few points up or down moves sales a lot. You can try to influence the mood.', choices: [
    S('early', 'Send review copies early', 'Gives reviewers more time, and costs a little.', '', { k: 0.02, gamble: { p: 0.6, good: { d: E(1.04, 5), rep: 1 }, bad: { rep: -1 }, goodText: 'Reviewers had time to enjoy it and the scores were high.', badText: 'More time found more flaws and scores were average.' } }),
    S('patch', 'Patch the biggest flaws first', 'Delays the launch and improves the final scores.', 'You fixed the glaring issues and scores were decent.', { k: 0.03, eff: { quality: 1, d: E(0.99, 1) } }),
    S('wait', 'Wait and see', 'Free, and out of your hands.', '', { gamble: { p: 0.5, good: { d: E(1.03, 5) }, bad: { d: E(0.97, 5), rep: -1 }, goodText: 'The scores were kind and sales followed.', badText: 'Reviewers were harsh and sales dipped.' } })] },
  // 271 Day-one patch
  { id: 'e9_gamestudio_dayone', title: 'A nasty bug on launch day', icon: 'bolt', good: false, per: 1.3, cd: 10, story: 'Launch day: players are reporting a bug that wipes their saved progress. A day-one patch is a quick fix released the moment the game goes on sale. Every hour without one is a hour of bad reviews.', choices: [
    S('hotfix', 'Fix it overnight', 'Wages for a very long night, and the best result.', 'Your team patched it by morning. Players noticed the quick response.', { k: 0.03, eff: { morale: -1, rep: 1 } }),
    S('pull', 'Pull the game from sale for a week', 'Costs a week of sales, and avoids more angry players.', 'You paused sales and relaunched with a clean version.', { eff: { d: E(0.97, 2) } }),
    S('apology', 'Post an apology and fix later', 'Cheap, and trust drains.', '', { gamble: { p: 0.4, good: { rep: 1 }, bad: { rep: -3, d: E(0.96, 4) }, goodText: 'Players forgave you and the patch followed.', badText: 'Reviews turned sour and sales slid for months.' } })] },
  // 269 Voice actors
  { id: 'e9_gamestudio_voiceactors', title: 'Famous voice actor wants more', icon: 'music', good: false, per: 1.1, cd: 14, story: 'The famous actor who voices your hero wants a much bigger fee to record the sequel. A good voice sells a game, and lines have to be recorded again if you swap the actor.', choices: [
    S('pay', 'Pay the higher fee', 'Costs more, and the character stays the same.', 'The actor returned and fans were pleased.', { k: 0.04, eff: { rep: 1 } }),
    S('newvoice', 'Cast an unknown actor', 'Cheaper, and some fans notice.', '', { k: 0.015, gamble: { p: 0.55, good: { quality: 1 }, bad: { rep: -2, d: E(0.98, 4) }, goodText: 'The newcomer was brilliant and nobody complained.', badText: 'Fans disliked the new voice and said so loudly.' } }),
    S('silent', 'Make the hero silent', 'Saves a lot, and loses some charm.', 'The hero went silent and fans shrugged.', { eff: { quality: -1 } })] },
  // 275 Burnout
  { id: 'e9_gamestudio_burnout', title: 'Your lead developers are exhausted', icon: 'heart', good: false, per: 1.3, cd: 12, story: 'After months of long nights, two of your best developers say they might leave. Studio culture is the mood and habits of the team, and a team that is worn out makes worse games.', choices: [
    S('rest', 'Give everyone a week off', 'Costs a week of work, and brings people back.', 'The team came back rested and committed.', { k: 0.03, eff: { morale: 2, quality: 1 } }),
    S('bonus', 'Offer retention bonuses', 'Costs money, and keeps them for now.', 'The bonuses kept them, though the tiredness remained.', { k: 0.05, eff: { morale: 1 } }),
    S('ignore', 'Tell them to hold on to the release', 'Free, and risky.', '', { gamble: { p: 0.4, good: {}, bad: { morale: -3, quality: -2 }, goodText: 'They gritted it out and shipped.', badText: 'Both left and the game lost its lead designers.' } })] },
  // 273 Data leak
  { id: 'e9_gamestudio_dataleak', title: 'Player data leaks', icon: 'key', good: false, per: 0.9, cd: 18, story: 'Hackers stole a list of player emails and passwords from your sign-in system. Privacy rules require you to tell players and the regulator quickly, and you can be fined.', choices: [
    S('open', 'Tell players at once and fix it', 'Costs time and money, and keeps trust.', 'You warned everyone, locked the accounts and learned from it.', { k: 0.05, eff: { rep: -1, quality: 1 } }),
    S('quiet', 'Hope nobody notices', 'Cheap now, and a huge fine later.', '', { gamble: { p: 0.35, good: {}, bad: { rep: -4, d: E(0.94, 6), c: E(1.03, 4) }, goodText: 'Nobody noticed.', badText: 'A journalist found out and the regulator fined you heavily.' } })] },
  // 266 Streamers
  { id: 'e9_gamestudio_streamer', title: 'A streamer discovers your game', icon: 'chart', good: true, per: 1.2, cd: 12, story: 'A popular streamer, who broadcasts live to thousands of viewers, is playing your game. They offer to keep going if you sponsor the channel. Their audience can make a game overnight, and their mood can turn.', choices: [
    S('sponsor', 'Sponsor the channel', 'Costs a fee, and the audience grows.', '', { k: 0.05, gamble: { p: 0.65, good: { d: E(1.06, 4), brand: 1.02 }, bad: { rep: -2 }, goodText: 'Viewers rushed to buy the game.', badText: 'The streamer said something awful and your name was tied to it.' } }),
    S('keys', 'Send free copies to similar streamers', 'Cheap, and results vary.', 'A few small streamers played it and some fans came.', { k: 0.01, eff: { d: E(1.02, 3) } }),
    S('nothing', 'Do nothing', 'Free, and the moment passes.', 'The streamer moved on to the next game.')] },
];

export const projects: InitiativeDef[] = [
  // 267 Mobile port
  { id: 'gamestudio_mobileport', name: 'Mobile port', blurb: 'A port is a version of your game rebuilt for another device, here phones. Phone players are a huge audience that expects cheap, short games, and the controls must be redone.', k: 1.2, months: 7, success: 60,
    win: { eff: { d: 1.04, c: 1.01 }, text: 'Phone players found the game and bought it in numbers.' },
    lose: { now: { morale: -2, quality: -1 }, text: 'The touch controls felt clumsy and the reviews said so.' } },
  // 268 Localisation
  { id: 'gamestudio_localise', name: 'Translate into more languages', blurb: 'Localisation means translating the words, voices and jokes so players in other countries enjoy the game. It opens new markets and costs translators and testers.', k: 0.7, months: 5, success: 75,
    win: { eff: { d: 1.03 }, now: { rep: 1 }, text: 'Players in new countries bought the game and left good reviews.' },
    lose: { now: { rep: -1 }, text: 'Awkward translations became a joke online.' } },
  // 274 Sequel
  { id: 'gamestudio_sequel', name: 'Make a sequel', blurb: 'A sequel is a new game that follows a hit. Fans come back and it is cheaper to market, though it can feel like a copy and the fans can be hard to please.', k: 1.5, months: 12, success: 75,
    win: { eff: { d: 1.04, c: 1.005 }, now: { brand: 1.02 }, text: 'Fans loved the new game and bought it on day one.' },
    lose: { now: { rep: -2, morale: -2 }, text: 'Fans said it was a lazy copy and sales were soft.' } },
  // 274 New IP
  { id: 'gamestudio_newip', name: 'Create a brand-new game world', blurb: 'An IP (intellectual property) is the world and characters you own. A new one is a big gamble: far more upside than a sequel, and most new games fail.', k: 2, months: 14, success: 40,
    win: { eff: { d: 1.06, ch: 0.98 }, monthly: 0.3, now: { brand: 1.04, rep: 3 }, text: 'A bold new hit. Players, press and rivals all took notice.' },
    lose: { now: { morale: -3, rep: -2 }, text: 'Nobody cared about the new world and the money is gone.' } },
  // 264 Console port
  { id: 'gamestudio_consoleport', name: 'Console port', blurb: 'Console makers have strict technical rules and charge fees, called certification. Consoles have lots of players who buy games at full price.', k: 1.4, months: 9, success: 60,
    win: { eff: { d: 1.04, c: 1.01 }, now: { rep: 1 }, text: 'Console players bought it and the shop featured it.' },
    lose: { now: { morale: -2 }, text: 'The console maker rejected the build repeatedly and the team was worn out.' } },
];
