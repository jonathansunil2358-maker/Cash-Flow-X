import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Tax. Every id starts with "tax_" (policies and projects) or "e9_tax_" (events). */
export const policies: PolicyDef[] = [
  { id: 'tax_ctinstalments', group: 'finance', name: 'Corporation-tax payments', blurb: 'Corporation tax is the tax on your company\'s profit. Bigger firms pay it in instalments through the year, and paying late brings a penalty.', options: [
    opt('Pay when the bill arrives', 'One big payment on the deadline. Simple, but it is a lump you have to find in one go.', {}),
    opt('Quarterly instalments by hand', 'The bill is spread out and there are no last-minute loans, but somebody has to remember every date.', { c: 0.998, risk: [4, 1.5, 'A tax instalment was paid late, so you owed a penalty and interest.'] }, 0.1),
    opt('Tax pot and direct debit', 'Put money aside every month and let the bank pay on time. Never late, but the cash is tied up.', { c: 0.997 }, 0.3)] },
  { id: 'tax_payroll', group: 'people', name: 'Payroll-tax filing', blurb: 'Each month you tell the tax office what your staff earned and hand over the tax and national insurance you took out of their pay.', options: [
    opt('File monthly with the payroll', 'Every pay run, on time, by your own team.', {}),
    opt('Use a payroll bureau', 'Experts file for you and staff are always paid correctly, which people notice.', { m: 0.1 }, 0.45),
    opt('File quarterly (small employers only)', 'Less paperwork, but a missed date means a fine.', { risk: [3, 1.5, 'A late payroll-tax filing brought a fine.'] }, -0.1)] },
  { id: 'tax_vat', group: 'finance', name: 'VAT returns', blurb: 'VAT is a sales tax you collect for the government. You file returns, then pay what you owe or claim a refund when you have paid more VAT on your costs than you collected.', options: [
    opt('Quarterly standard returns', 'File every three months and claim back VAT on your purchases.', {}),
    opt('Monthly returns', 'File more often. Refunds come back sooner, but there is more paperwork.', { od: 1.04 }, 0.2),
    opt('Flat-rate scheme', 'Pay a fixed share of your sales and skip the detail. Easy, but you cannot reclaim VAT on most purchases.', { c: 1.004 }, -0.15)] },
  { id: 'tax_allowances', group: 'finance', name: 'Capital allowances', blurb: 'When you buy machines or vehicles you cannot deduct the whole price from your profit at once. Capital allowances are the tax relief you claim over time, and you can sometimes choose when.', options: [
    opt('Standard yearly rates', 'Claim the normal slice each year and think no more about it.', {}),
    opt('Claim as much as possible now', 'A bigger tax saving today, but less relief left for later years.', { c: 1.003 }, -0.3),
    opt('Plan claims to match profit', 'Your accountant times the claims so relief lands in your most profitable years.', { c: 0.997 }, -0.1, 0.25)] },
  { id: 'tax_ownerpay', group: 'finance', name: 'Owner pay: salary or dividends', blurb: 'Owners can pay themselves a salary (taxed through payroll) or a dividend (a share of the profit, taxed differently). The mix changes what you keep and what the company keeps.', options: [
    opt('All salary', 'Simple and safe, but it costs more tax overall.', {}),
    opt('Small salary plus dividends', 'Usually a lower tax bill, but money leaves the company and the bank sees thinner reserves.', { od: 0.97 }, -0.25),
    opt('Dividends only', 'The biggest saving, but dividends can only come out of real profits. Pay one without enough profit and it must be repaid with a penalty.', { od: 0.95, risk: [4, 2, 'A dividend was paid without enough profit behind it, and had to be repaid with a penalty.'] }, -0.4)] },
  { id: 'tax_transferpricing', group: 'finance', name: 'Transfer pricing', blurb: 'If your firm has a branch abroad, the prices your companies charge each other decide where profit shows up, and so where tax is paid. Tax offices expect fair, market prices.', options: [
    opt('Keep group trading simple', 'Charge a rough price and do not fuss about the paperwork.', {}),
    opt('Fair prices with a paper trail', 'Write down why each price is fair. Dull, but it saves on disputes and the tax office trusts you.', { c: 0.997 }, 0.3, 0.3),
    opt('Low prices to the low-tax arm', 'Move profit to where the tax is lower. The savings are big, but tax offices look for exactly this trick.', { risk: [6, 6, 'The tax office challenged your transfer prices and charged back-tax with a penalty.'] }, -0.5)] },
  { id: 'tax_benefits', group: 'people', name: 'Perks and benefits in kind', blurb: 'A benefit in kind is a perk such as a company car or private health cover. The tax office treats it as extra pay, so you have to report it and tax is due.', options: [
    opt('No taxable perks', 'Pay in wages only and keep it simple.', {}),
    opt('Perks, reported properly', 'Staff love the perks and the paperwork is right, but the perks and the admin cost money.', { m: 0.3 }, 0.5),
    opt('Perks, reported when you remember', 'Cheaper to run, but unreported perks bring a tax bill and a fine.', { m: 0.3, risk: [5, 3, 'Unreported staff perks brought a tax bill and a fine.'] }, 0.3)] },
  { id: 'tax_adviser', group: 'finance', name: 'Tax adviser', blurb: 'Tax is full of choices and deadlines. A good adviser saves you more than they cost, and a poor one can cost you dearly.', options: [
    opt('Do it yourself', 'No fees, but you do the reading and the worrying.', {}),
    opt('Local accountant', 'A friendly small firm that files on time and spots the basic savings.', { c: 0.997 }, 0.25),
    opt('Big-firm tax specialist', 'Dearer, but they find savings others miss and handle enquiries well, and your lenders respect the name.', { c: 0.992, rep: 0.02 }, 0.9)] },
  { id: 'tax_fuel', group: 'ops', name: 'Fuel and mileage claims', blurb: 'If staff drive for work you can repay their fuel receipts or pay a set rate per mile. Fuel duty, the tax in every litre, keeps the bill high.', options: [
    opt('Reimburse fuel receipts', 'Staff keep receipts and you pay back what they spent.', {}),
    opt('Approved mileage rate', 'A set rate per mile. It is cheaper to run, but staff who drive a lot lose out a little.', { m: -0.1 }, -0.1),
    opt('Fuel cards with a monthly cap', 'Cards cut fuel waste, though there is a card fee to pay.', { c: 0.997 }, 0.15),
    opt('Electric pool cars', 'Dodge fuel duty and look greener, though the cars cost money up front.', { c: 0.995, rep: 0.02 }, -0.1, 1.2)] },
  { id: 'tax_giftaid', group: 'customers', name: 'Giving with Gift Aid', blurb: 'Gift Aid lets a charity claim extra money from the government on a donation from a UK taxpayer, so your giving goes further.', options: [
    opt('No regular giving', 'You give nothing on a schedule.', {}),
    opt('Give through the payroll', 'Staff and the company donate every month and the charity claims Gift Aid on it.', { rep: 0.04, m: 0.1 }, 0.2),
    opt('Round up at the till', 'Customers round up their bill. The charity claims Gift Aid and shoppers feel good, but the tills need setting up.', { rep: 0.03, d: 1.004 }, 0.15, 0.3)] },
];

export const events: EvSpec[] = [
  { id: 'e9_tax_enquiry', title: 'The tax office writes to you', icon: 'key', good: false, per: 1.2, cd: 18, min: 12, story: 'A letter from the tax office says they have questions about your latest return. It is probably a routine check, but it could also be the start of a deeper look at your books.', choices: [
    S('adviser', 'Reply with your accountant', 'Costs a fee, and the answers are done properly.', '', { k: 0.02, gamble: { p: 0.9, good: { rep: 1 }, bad: { c: E(1.01, 3) }, goodText: 'Your records were in order and the enquiry closed with no changes.', badText: 'They found a small error, and you paid the difference with interest.' } }),
    S('self', 'Reply yourself', 'Free, but you may say the wrong thing.', '', { gamble: { p: 0.6, good: {}, bad: { c: E(1.02, 4), rep: -1 }, goodText: 'Your honest answers satisfied them.', badText: 'Your answers were muddled and they dug deeper.' } }),
    S('ignore', 'Put the letter in a drawer', 'Free, and an ignored letter turns into a penalty.', '', { gamble: { p: 0.2, good: {}, bad: { c: E(1.04, 6), rep: -3 }, goodText: 'They never followed up. Do not count on that again.', badText: 'They sent reminders, added a penalty and then took a very close look at everything.' } })] },
  { id: 'e9_tax_yearend', title: 'Tax-year-end planning meeting', icon: 'chart', good: true, per: 1.2, cd: 12, min: 10, story: 'The tax year ends soon. Your accountant offers a planning meeting to look at what you can do before the deadline, such as buying equipment, paying into pensions and claiming every allowance you are due.', choices: [
    S('full', 'A full planning session', 'Costs a fee and usually finds real savings.', 'Your accountant found sensible ways to use your reliefs, and your tax bill fell.', { k: 0.015, eff: { c: E(0.99, 8) } }),
    S('quick', 'A quick phone call', 'Cheap and finds the obvious things.', 'A short chat turned up a couple of easy savings.', { k: 0.004, eff: { c: E(0.996, 6) } }),
    S('skip', 'Skip it', 'Free, and you may miss out on some reliefs.', 'You filed the usual way, and later found a relief that you could have claimed.', { eff: { c: E(1.005, 6) } })] },
  { id: 'e9_tax_importduty', title: 'Import duty goes up', icon: 'parcel', good: false, per: 1.2, cd: 18, gate: 'stock', story: 'The government has raised import duty, a tax on goods that arrive from abroad, on materials you buy. Your supplier\'s invoices are about to get dearer.', choices: [
    S('absorb', 'Absorb the cost', 'Prices stay put and your margin shrinks.', 'Customers noticed nothing, and your margin took the hit.', { eff: { c: E(1.03, 8) } }),
    S('pass', 'Pass it on in your prices', 'Protects your margin, and some customers walk.', 'Most customers shrugged at the small price rise, and a few went elsewhere.', { eff: { d: E(0.985, 8) } }),
    S('switch', 'Switch to a home-grown supplier', 'Costs money to move, and may pay off.', '', { k: 0.03, gamble: { p: 0.7, good: { c: E(0.995, 10) }, bad: { c: E(1.02, 3) }, goodText: 'The new supplier was reliable and the duty bill disappeared.', badText: 'The new supplier started slowly and the switch was messy.' } })] },
  { id: 'e9_tax_levy', title: 'A new levy on your products', icon: 'leaf', good: false, per: 1, cd: 24, gate: 'stock', story: 'A new tax has landed, like the sugar tax on drinks or the plastic packaging tax. If your products or your packaging fall under it, you pay extra on every unit you make or sell.', choices: [
    S('redesign', 'Redesign to dodge the levy', 'Costs money now, and could save you a lot.', '', { k: 0.04, gamble: { p: 0.7, good: { c: E(0.99, 12), rep: 1 }, bad: { c: E(1.01, 6) }, goodText: 'The new recipe or packaging avoided the levy, and customers did not mind.', badText: 'Customers noticed the change and not everyone was pleased.' } }),
    S('pay', 'Pay the levy', 'Free to do, and dearer every month.', 'You paid the levy on every unit, and it stung all year.', { eff: { c: E(1.025, 12) } }),
    S('passon', 'Pass the levy to customers', 'Protects your margin, and sales slip a little.', 'Prices rose and some customers shopped around.', { eff: { d: E(0.98, 8) } })] },
  { id: 'e9_tax_stampduty', title: 'A small rival is for sale', icon: 'crown', good: true, per: 0.8, cd: 24, min: 18, gate: 'rivals', story: 'A smaller rival wants to sell. Buying a company\'s shares attracts stamp duty, a tax on the purchase price, while buying only its assets can be taxed differently. How you structure the deal changes the tax bill.', choices: [
    S('shares', 'Buy the shares and pay stamp duty', 'Simple to do, and the tax is a fixed slice.', 'The deal went through cleanly, and their customers came with the shares.', { k: 0.05, acct: 'dealCosts', eff: { d: E(1.03, 8) } }),
    S('assets', 'Buy just the assets', 'Different taxes, and more paperwork to move things over.', 'You picked the parts you wanted. Moving contracts and equipment was a chore.', { k: 0.04, acct: 'dealCosts', eff: { d: E(1.02, 8), c: E(1.01, 6) } }),
    S('walk', 'Walk away', 'No cost and no gain.', 'You left it to someone else and stayed focused on your own business.')] },
  { id: 'e9_tax_disclosure', title: 'You find an old tax mistake', icon: 'key', good: false, per: 1, cd: 24, min: 18, story: 'Your accountant has found that you underpaid tax two years ago by accident. The tax office is far gentler with firms that come forward before they are caught.', choices: [
    S('tell', 'Disclose it voluntarily', 'Costs money now, and earns goodwill.', 'You paid the difference with a small penalty, and the tax office thanked you for being honest.', { k: 0.03, eff: { rep: 1 } }),
    S('quietly', 'Correct it in this year\'s return', 'Cheaper, and it may be seen as hiding it.', '', { gamble: { p: 0.55, good: {}, bad: { rep: -2, c: E(1.03, 4) }, goodText: 'They accepted the correction without a fuss.', badText: 'They treated the quiet fix as concealment and added a penalty.' } }),
    S('hope', 'Hope nobody notices', 'Free, and very risky.', '', { gamble: { p: 0.4, good: {}, bad: { rep: -4, c: E(1.04, 6) }, goodText: 'Nobody ever looked. You were lucky.', badText: 'They found it in a routine check, and the penalty was heavy.' } })] },
  { id: 'e9_tax_apprentices', title: 'A tax credit for apprentices', icon: 'star', good: true, per: 1.2, cd: 18, gate: 'team', story: 'The government is offering a tax credit to firms that take on apprentices, trainees who learn on the job. You get some money back for each one, but you must train and pay them properly.', choices: [
    S('two', 'Take on two apprentices and claim', 'Costs wages, and the credit softens the blow.', 'The credit softened the wage bill, and the new faces gave the team energy.', { k: 0.02, acct: 'wages', eff: { morale: 1, quality: 1 } }),
    S('one', 'Take on one', 'Easier to manage and a smaller gain.', 'One apprentice settled in well and learned fast.', { k: 0.008, acct: 'wages', eff: { quality: 0.5 } }),
    S('skip', 'Not this year', 'No cost, and no new faces.', 'You passed on it, and the credit went to someone else.')] },
  { id: 'e9_tax_deferred', title: 'Deferred tax appears in the accounts', icon: 'gear', good: false, per: 0.8, cd: 30, min: 18, story: 'Your accountant points to a new line on the balance sheet called deferred tax. It exists because the tax office and your accounts count some costs at different speeds, so you owe tax later that your books already reflect today. It is a bill that has been postponed, not cancelled.', choices: [
    S('setaside', 'Set cash aside for it', 'Costs cash now and lets you sleep at night.', 'You parked money for when the postponed bill falls due, and the board was pleased.', { k: 0.02, eff: { rep: 1 } }),
    S('plan', 'Ask your accountant to plan how it unwinds', 'A fee, and the bill shrinks slowly.', 'Your accountant timed your purchases so the postponed tax melted away gradually.', { k: 0.01, eff: { c: E(0.997, 8) } }),
    S('ignore', 'Treat it as a note and move on', 'Free, and it may bite later.', '', { gamble: { p: 0.55, good: {}, bad: { c: E(1.025, 4) }, goodText: 'It stayed postponed, as it often does while you keep growing.', badText: 'A slow year made the postponed tax fall due all at once.' } })] },
  { id: 'e9_tax_ratechange', title: 'Budget day: tax rates change', icon: 'flame', good: false, per: 1, cd: 24, min: 12, story: 'The government has announced a rise in corporation tax from next year. Your profit after tax will be squeezed unless you act, and your customers have heard the news too.', choices: [
    S('bring', 'Bring spending forward to claim relief', 'Costs money now and builds the business.', 'You spent on growth while the old, lower rate still applied. It cut the bill and gave sales a lift.', { k: 0.03, eff: { d: E(1.02, 6) } }),
    S('price', 'Nudge your prices up', 'More money coming in, and a few customers drift off.', 'Prices rose a few per cent. Most customers shrugged and some went elsewhere.', { income: 0.05, eff: { d: E(0.99, 8) } }),
    S('absorb', 'Absorb it', 'Free, and it hits your margin all year.', 'You swallowed the extra tax and your margin took the hit.', { eff: { c: E(1.01, 12) } })] },
];

export const projects: InitiativeDef[] = [
  { id: 'tax_losscarry', name: 'Loss carry-forward planning', blurb: 'If you made a loss, you can usually use it to cut tax on future profits. Plan your accounts so none of that relief goes to waste.', k: 0.3, months: 3, success: 85,
    win: { monthly: -0.3, text: 'Your carried-forward losses now shave your tax bill every month.' },
    lose: { now: { c: E(1.01, 3) }, text: 'The claim was filled in wrongly. You had to redo it and paid a small penalty.' } },
  { id: 'tax_researchclaim', name: 'Research relief claim', blurb: 'Claim tax relief for money you spent on research and development. You need a careful write-up of what was new and uncertain about the work.', k: 0.5, months: 5, success: 70,
    win: { monthly: -0.35, text: 'The tax office accepted your claim, and part of your research spend now comes back to you.' },
    lose: { now: { rep: -1 }, text: 'The tax office said the work was routine and rejected the claim. You lost the fee.' } },
  { id: 'tax_ratesappeal', name: 'Business-rates appeal', blurb: 'Business rates are a property tax based on the rental value of your premises. If the council\'s valuation is too high, you can appeal. It takes months and can go either way.', k: 0.3, months: 8, success: 55,
    win: { monthly: -0.4, text: 'The valuation was cut and your rates bill dropped, with a refund for past years.' },
    lose: { now: { morale: -1 }, text: 'The appeal failed, the valuation stood and you paid the specialist\'s fee for nothing.' } },
  { id: 'tax_taxholiday', name: 'Open in a tax-holiday zone', blurb: 'Some regions give new businesses a few years of reduced tax to attract investment. You would need to open a real site there, and the rules can change.', k: 1.5, months: 8, success: 60,
    win: { eff: { c: 0.99 }, monthly: 0.15, text: 'The new site is up and running, and the tax holiday trims your costs for years.' },
    lose: { now: { c: E(1.02, 4), morale: -1 }, text: 'The site opened late, the holiday rules changed and the move cost more than it saved.' } },
  { id: 'tax_greenrebate', name: 'Green-tax rebate application', blurb: 'Governments hand back tax to firms that cut pollution, for example by using cleaner energy or vehicles. You must prove the savings with careful records.', k: 0.5, months: 5, success: 75,
    win: { eff: { rep: 0.02 }, monthly: -0.3, text: 'Your rebate was approved and your green record is now official.' },
    lose: { now: { rep: -1 }, text: 'Your records were too thin to prove the savings, and the rebate was refused.' } },
  { id: 'tax_treaty', name: 'Treaty relief on foreign income', blurb: 'A foreign customer\'s country takes tax off your payment before it reaches you, which is called withholding tax. A tax treaty between the countries can reduce it, but you must apply and wait.', k: 0.4, months: 6, success: 70,
    win: { monthly: -0.25, text: 'The treaty claim was approved and less tax is now taken off your foreign payments.' },
    lose: { now: { morale: -1 }, text: 'The claim was rejected for missing forms and the tax stayed withheld.' } },
];
