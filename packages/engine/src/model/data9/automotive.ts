import { off, opt, S, E } from '../dataKit';
import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';

/** Sector topic: Automotive (EV conversions). Everything here is only available to that sector. Every id must start with "automotive_" (policies and initiatives) or "e9_automotive_" (events). */
export const policies: PolicyDef[] = [
  { id: 'automotive_batterycontract', group: 'ops', name: 'Battery supplier contract', blurb: 'The battery pack is the most expensive part of every car. How you buy it decides your price and how often you get stuck waiting.', options: [
    off,
    opt('Buy as needed', 'No commitment. You pay the going rate, and lead times (the wait between ordering and delivery) can be long.', { risk: [6, 3, 'Batteries arrived late and cars sat unfinished in the bays.'] }),
    opt('One long contract', 'A fixed price for a year with one maker. Cheaper, but if they run late you are stuck.', { c: 0.985, risk: [5, 5, 'Your only battery supplier missed a delivery and the bays stood idle.'] }, 0.2),
    opt('Two suppliers', 'Orders split between two makers. Dearer, but one late delivery does not stop you.', { c: 1.005, cap: 1.01 }, 0.5)] },

  { id: 'automotive_extrabays', group: 'ops', name: 'Conversion bays', blurb: 'A bay is a lift and floor space where one car is converted at a time. The number of bays limits how many cars you can finish.', options: [
    off,
    opt('Add two bays', 'More cars can be worked on at once. You pay rent and kit whether they are busy or not.', { cap: 1.03 }, 0.6, 0.8),
    opt('Add a whole new hall', 'A big jump in room to work. Expensive to set up, and empty bays eat your cash in quiet months.', { cap: 1.06, c: 1.005 }, 1.4, 2)] },

  { id: 'automotive_hvtraining', group: 'people', name: 'High-voltage technician training', blurb: 'Electric car batteries carry enough power to be deadly. Trained technicians work faster, make fewer mistakes and stay safe.', options: [
    off,
    opt('Basic safety course', 'Everyone learns the rules. Courses take people off the workshop floor.', { q: 0.02, cap: 0.99 }, 0.3),
    opt('Full certification', 'Technicians gain recognised high-voltage qualifications. Costly, and trained people can be poached by rivals.', { q: 0.04, m: 0.15, cap: 0.985, hire: 1.1 }, 0.8)] },

  { id: 'automotive_orderchannel', group: 'customers', name: 'Showroom versus online ordering', blurb: 'Where customers can see and order your cars. Showrooms impress people but cost rent. Websites are cheap but cannot let someone sit inside.', options: [
    off,
    opt('Online ordering only', 'Cheap to run and open all hours. Some buyers want to see the car first, so you lose them.', { d: 0.99 }, -0.3),
    opt('A small showroom', 'People can see, touch and sit in your cars. Rent and staff cost money.', { d: 1.02, rep: 0.02 }, 0.9, 0.8),
    opt('Showroom plus online', 'The best reach, and the biggest bill. You also have two systems to keep tidy.', { d: 1.03, rep: 0.03 }, 1.5, 1.2)] },

  { id: 'automotive_servicevans', group: 'ops', name: 'Mobile service vans', blurb: 'Vans that drive to the customer to fix and check their converted car, instead of making them bring it to you.', options: [
    off,
    opt('One service van', 'Customers love not having to visit. The van and its technician cost money.', { ch: 0.98, rep: 0.02, cap: 0.99 }, 0.5, 0.5),
    opt('A small van fleet', 'Covers a wide area and wins loyalty. Fewer technicians left in the workshop.', { ch: 0.96, rep: 0.04, cap: 0.97 }, 1.1, 1.2)] },

  { id: 'automotive_ota', group: 'customers', name: 'Over-the-air software updates', blurb: 'Over the air means sending new software to the car through the internet, like a phone update. You can charge a small monthly fee for it.', options: [
    off,
    opt('Free updates', 'Cars improve over time and owners are happy. It costs you engineers\' time and brings in nothing.', { rep: 0.03, ch: 0.99 }, 0.3),
    opt('Paid update plan', 'Owners pay a monthly fee for new features. Money comes in, though some grumble at paying for software.', { rep: -0.02 }, -0.6, 0.4),
    opt('Premium plan with support', 'More features and a helpline. Good income, and a software slip-up now makes headlines.', { rep: 0.02, risk: [3, 3, 'A bad software update stopped some cars and owners were furious.'] }, -0.9, 0.8)] },

  { id: 'automotive_insurancebundle', group: 'customers', name: 'Insurance bundled with each car', blurb: 'Offer a first-year insurance policy with every car. Converted cars are unusual, so ordinary insurers often refuse or overcharge.', options: [
    off,
    opt('Partner with an insurer', 'You pass buyers to an insurer and earn a small fee. Buyers feel looked after.', { d: 1.01, rep: 0.01 }, -0.2, 0.3),
    opt('Include a year in the price', 'Buyers get cover with every car. You pay the premiums, and some cars will claim.', { d: 1.025, risk: [5, 3, 'Several customers made insurance claims in one month.'] }, 0.7)] },

  { id: 'automotive_financing', group: 'finance', name: 'Financing deals for buyers', blurb: 'Most people cannot pay a lump sum for a car. Letting them pay monthly makes sales easier, but you wait longer for your money or share the risk.', options: [
    off,
    opt('Introduce a finance company', 'A lender pays you up front and the customer repays them. You pay a fee for the introduction.', { d: 1.02 }, 0.5),
    opt('Offer your own payment plan', 'You collect the repayments yourself. More buyers, but your cash is tied up and some will not pay.', { d: 1.04, od: 0.9, risk: [6, 4, 'Several buyers stopped paying their monthly instalments.'] }, 0.4)] },

  { id: 'automotive_rightrepair', group: 'ops', name: 'Right-to-repair and spare parts', blurb: 'Right to repair is the idea that owners and independent garages should be able to buy parts and manuals to fix their own cars.', options: [
    off,
    opt('Keep parts to ourselves', 'Only you can mend your cars, and you earn from every repair. Owners and campaigners dislike it.', { rep: -0.03 }, -0.3),
    opt('Sell parts and manuals openly', 'Any garage can repair your cars. Owners trust you more, and you lose some repair income.', { d: 1.01, rep: 0.04 }, 0.3, 0.4)] },
];

export const events: EvSpec[] = [
  { id: 'e9_automotive_grant', title: 'The EV grant changes', icon: 'chart', good: true, per: 1.5, cd: 24, story: 'The government has changed its grant for electric vehicles. A grant is money paid to buyers to lower the price they face. This one now covers converted classic cars as well.', choices: [
    S('advertise', 'Shout about it', 'Spend on adverts to tell every buyer.', 'Your phone rang for weeks as buyers worked out their savings.', { k: 0.04, acct: 'marketing', eff: { d: E(1.06, 6) } }),
    S('quiet', 'Mention it on the website', 'Free, and slower to work.', 'A few well-informed buyers found the page and ordered.', { eff: { d: E(1.025, 6) } }),
    S('raise', 'Raise your prices to match', 'Keep the grant as extra profit for a while.', '', { gamble: { p: 0.5, good: { d: E(1.02, 6), rep: 1 }, bad: { d: E(0.95, 6), rep: -2 }, goodText: 'Buyers hardly noticed and your margin grew.', badText: 'Newspapers said you were pocketing the grant, and sales dipped.' } })] },

  { id: 'e9_automotive_donorprices', title: 'Donor car prices swing', icon: 'car', good: false, per: 1.5, cd: 14, story: 'A donor car is the old petrol car you buy to convert. A TV show has made classic cars fashionable, and the price of good donors has jumped.', choices: [
    S('paymore', 'Pay the higher price', 'Keep the workshop supplied, at a cost.', 'You paid up and the bays stayed busy.', { eff: { c: E(1.04, 5) } }),
    S('wait', 'Hold off buying', 'Prices may settle, but bays may run quiet.', '', { gamble: { p: 0.5, good: { c: E(0.97, 4) }, bad: { c: E(1.06, 4), d: E(0.97, 3) }, goodText: 'Prices dropped back and you bought cheaply.', badText: 'Prices kept climbing and your bays stood empty.' } }),
    S('customer', 'Ask customers to bring their own car', 'Cheaper for you, and fewer people will want it.', 'Owners loved converting their own cars, though fewer came.', { eff: { c: E(0.98, 6), d: E(0.97, 6) } })] },

  { id: 'e9_automotive_warranty', title: 'Battery pack warranty claims', icon: 'bolt', good: false, per: 1.5, cd: 16, story: 'A number of owners say their battery packs lose range faster than promised. A warranty is your promise to fix or replace faulty parts for a set time, and now people are calling on it.', choices: [
    S('replace', 'Replace the packs', 'Costly, but you keep the customers.', 'You swapped the packs and owners wrote kind words online.', { k: 0.08, acct: 'otherCosts', eff: { rep: 1 } }),
    S('inspect', 'Inspect each one first', 'Only fix the truly faulty ones.', '', { k: 0.04, acct: 'otherCosts', gamble: { p: 0.6, good: { rep: 1 }, bad: { rep: -2 }, goodText: 'Most packs were fine and the owners were reassured.', badText: 'Some owners felt they were being fobbed off.' } }),
    S('refuse', 'Say it is normal wear', 'Free now, and bad for your name.', 'Owners complained loudly and demand fell.', { eff: { rep: -3, d: E(0.95, 6) } })] },

  { id: 'e9_automotive_recall', title: 'Faulty motor controller recall', icon: 'alert', good: false, per: 1, cd: 30, story: 'The controller is the box that tells the motor how much power to use. A fault has been found in one batch, and it could cut power without warning. You must decide how to handle it.', choices: [
    S('recallall', 'Recall every affected car', 'Expensive, safe and honest.', 'You called every owner. The bill was big and trust held.', { k: 0.1, acct: 'otherCosts', eff: { rep: 1, quality: 1 } }),
    S('quiet', 'Fix cars only if owners complain', 'Cheaper, and dangerous if it leaks out.', '', { k: 0.03, acct: 'otherCosts', gamble: { p: 0.4, good: {}, bad: { rep: -4, d: E(0.9, 6), brand: 0.97 }, goodText: 'No one noticed, but you were lucky.', badText: 'The press found out and wrote that you hid a safety fault.' } })] },

  { id: 'e9_automotive_crashtest', title: 'Crash-test publicity', icon: 'shield', good: true, per: 1, cd: 24, story: 'A consumer group wants to crash-test one of your converted cars and publish the result. A good score is great advertising. A bad one is a nightmare.', choices: [
    S('agree', 'Say yes and prepare', 'Pay for a pre-test and extra reinforcing.', '', { k: 0.05, acct: 'otherCosts', gamble: { p: 0.75, good: { rep: 3, d: E(1.06, 8), brand: 1.02 }, bad: { rep: -2, d: E(0.97, 4) }, goodText: 'Your car scored highly and the news spread.', badText: 'Your car passed, but with a weak score for one test.' } }),
    S('gamble', 'Say yes without preparing', 'Free, and a real risk.', '', { gamble: { p: 0.45, good: { rep: 3, d: E(1.05, 6) }, bad: { rep: -4, d: E(0.93, 6), brand: 0.98 }, goodText: 'You passed with flying colours.', badText: 'The car failed badly and the footage went viral.' } }),
    S('decline', 'Decline politely', 'Nothing gained, nothing lost.', 'You declined, and a few people wondered why.', { eff: { rep: -1 } })] },

  { id: 'e9_automotive_metals', title: 'Lithium and metal prices swing', icon: 'flame', good: false, per: 1.5, cd: 12, story: 'Batteries are made from lithium, nickel and copper, and their prices jump around with world demand. This month the cost of your parts has moved sharply.', choices: [
    S('lockin', 'Lock in a fixed price now', 'Pay a bit extra for certainty.', 'You fixed your parts price and slept better.', { k: 0.03, acct: 'otherCosts', eff: { c: E(0.98, 8) } }),
    S('float', 'Buy at the going rate', 'Free, and a gamble on where prices go.', '', { gamble: { p: 0.45, good: { c: E(0.97, 6) }, bad: { c: E(1.08, 6) }, goodText: 'Prices fell and your parts got cheaper.', badText: 'Prices soared and every car cost more to build.' } }),
    S('passon', 'Raise your prices a little', 'Share the cost with customers.', 'Some buyers grumbled and paid up, others walked away.', { eff: { d: E(0.96, 5), c: E(1.03, 5) } })] },

  { id: 'e9_automotive_tradeshow', title: 'Trade show unveiling', icon: 'star', good: true, per: 1.2, cd: 20, story: 'A big electric vehicle show is coming and you can unveil a new model on a stand there. Crowds, journalists and fleet buyers will all be walking past.', choices: [
    S('bigstand', 'A large stand with a new model', 'Costly, and eye-catching.', '', { k: 0.09, acct: 'marketing', gamble: { p: 0.65, good: { d: E(1.07, 8), brand: 1.03, rep: 2 }, bad: { rep: -1 }, goodText: 'Crowds queued to see it and orders rolled in.', badText: 'A rival launched the same week and stole the headlines.' } }),
    S('smallstand', 'A small stand with an existing car', 'Cheap, and few will notice.', 'You met some useful contacts and a handful of buyers.', { k: 0.03, acct: 'marketing', eff: { d: E(1.025, 5), brand: 1.01 } }),
    S('skip', 'Skip the show', 'Save your money.', 'You stayed in the workshop and got on with building cars.')] },

  { id: 'e9_automotive_lez', title: 'New low-emission zone rules', icon: 'leaf', good: true, per: 1.5, cd: 20, story: 'A local council is widening its low-emission zone, an area where older polluting vehicles must pay a daily charge to drive. Owners of classic petrol cars are now looking for a way to avoid the fee.', choices: [
    S('campaign', 'Run a local advertising push', 'Target drivers inside the new zone.', 'Drivers who had never thought of converting came knocking.', { k: 0.04, acct: 'marketing', eff: { d: E(1.07, 6) } }),
    S('council', 'Offer the council a partnership', 'A slower route that can win more.', '', { k: 0.02, gamble: { p: 0.55, good: { d: E(1.05, 10), rep: 2 }, bad: { rep: 0 }, goodText: 'The council now recommends you to drivers.', badText: 'The council was polite, and nothing came of it.' } }),
    S('nothing', 'Carry on as normal', 'Some extra customers will come anyway.', 'A few more drivers found you by themselves.', { eff: { d: E(1.02, 4) } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'automotive_certification', name: 'Certification testing for a new model', k: 0.9, months: 8, success: 70,
    blurb: 'Before a converted car model can be sold, it has to pass independent safety and emissions tests. Each model is tested separately. It takes a long time, and it can fail.',
    win: { eff: { d: 1.03, q: 0.02 }, now: { rep: 2 }, text: 'The new model is certified. Buyers and insurers trust it, and it opens a new group of customers.' },
    lose: { now: { rep: -1, morale: -2 }, text: 'The car failed a braking test. You will need to redesign it, and the testing fees are gone.' } },

  { id: 'automotive_chargingpartner', name: 'Charging-network partnership', k: 0.6, months: 5, success: 65,
    blurb: 'Team up with a company that runs public charging points, so your owners get cheap or free charging and easy maps.',
    win: { eff: { d: 1.025, ch: 0.98 }, monthly: 0.3, text: 'Your owners charge for less and find charging easy. New buyers worry less about running out of power.' },
    lose: { now: { d: E(0.98, 2) }, text: 'The charging company changed its plans, and the partnership never started.' } },

  { id: 'automotive_fleetcontract', name: 'Fleet contract with a delivery firm', k: 0.8, months: 7, success: 55,
    blurb: 'A delivery company with dozens of vans might convert them all to electric. A big order brings steady work, and big buyers drive a hard bargain.',
    win: { eff: { d: 1.05, c: 0.99 }, monthly: 0.4, text: 'You won the fleet contract. Steady orders keep your bays busy, though the buyer squeezes your prices.' },
    lose: { now: { morale: -3, rep: -1 }, text: 'A bigger rival won the contract after you had spent months on the pilot van.' } },

  { id: 'automotive_vintage', name: 'Vintage-car conversion range', k: 0.7, months: 6, success: 60,
    blurb: 'Convert famous classics, such as old saloons and sports cars, to electric. Collectors will pay well for them, but each one takes lots of careful work.',
    win: { eff: { d: 1.03, c: 1.01, q: 0.02 }, now: { brand: 1.02, rep: 1 }, text: 'Collectors love your vintage conversions and pay a premium. Each one takes longer, but the profit is bigger.' },
    lose: { now: { quality: -1, morale: -2 }, text: 'Rare parts were hard to find and the first car went badly over budget. Purists also complained.' } },

  { id: 'automotive_tradeins', name: 'Second-hand converted-car trade-ins', k: 0.5, months: 5, success: 70,
    blurb: 'Buy back your own converted cars when owners want a change, check them over and resell them. A trade-in makes the next purchase easier.',
    win: { eff: { d: 1.02, c: 0.99, ch: 0.98 }, text: 'Owners trade up with you and used cars sell quickly. Your cars keep their value and so does your name.' },
    lose: { now: { d: E(0.98, 3), c: E(1.02, 3) }, text: 'Traded-in cars needed far more repairs than expected, and some sat unsold for months.' } },

  { id: 'automotive_racing', name: 'Racing-series sponsorship', k: 1, months: 6, success: 50,
    blurb: 'Sponsor an electric racing series. Fans see your name on the cars and associate it with speed and quality. It is costly, and the results are uncertain.',
    win: { eff: { d: 1.03 }, now: { brand: 1.03, rep: 3, morale: 2 }, text: 'Your sponsored team won a race and the crowd cheered your name. Interest in your cars jumped.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Your sponsored team crashed out early and few noticed your name.' } },

  { id: 'automotive_recycling', name: 'Battery recycling income', k: 0.6, months: 6, success: 65,
    blurb: 'Old petrol-engine parts and worn-out batteries still contain valuable metal. Set up a way to sort, return and sell them on.',
    win: { eff: { c: 0.985 }, monthly: -0.5, now: { rep: 1 }, text: 'Recycling now brings in steady money and cuts your costs. Customers like that nothing goes to waste.' },
    lose: { now: { morale: -1 }, text: 'Safety rules for handling used batteries were stricter than you thought, and the scheme was shelved.' } },

  { id: 'automotive_testdrive', name: 'Customer test-drive days', k: 0.3, months: 3, success: 80,
    blurb: 'Open the workshop for a weekend and let people drive a finished car. Nothing sells an electric car like sitting in one.',
    win: { eff: { d: 1.015 }, now: { rep: 1, d: E(1.05, 4) }, text: 'Hundreds of people came, drove the cars and many placed orders.' },
    lose: { now: { morale: -1, rep: -1 }, text: 'It rained, few people came, and one demo car got a scratch.' } },
];
