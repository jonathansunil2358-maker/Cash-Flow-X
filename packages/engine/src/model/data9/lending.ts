import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Lending and credit. Every id starts with "lending_" (policies and projects) or "e9_lending_" (events). */
export const policies: PolicyDef[] = [
  { id: 'lending_paymenthistory', group: 'finance', name: 'Payment history', blurb: 'Lenders keep a credit score on your firm, based on whether you pay your bills on time. A good score means bigger limits and better deals, and it moves slowly with your habits.', options: [
    opt('Pay when convenient', 'Most things are paid on time, and a few drift late.', {}),
    opt('Pay every bill on time', 'Cash leaves earlier, but your credit score climbs and suppliers trust you.', { od: 1.06, c: 0.998 }, 0.25),
    opt('Hold on to cash, pay late', 'You keep your money longer, but late payments dent your credit score and suppliers add fees.', { od: 0.95, risk: [8, 2, 'A supplier charged a late-payment fee and logged it on your credit record.'] }, -0.4)] },
  { id: 'lending_security', group: 'finance', name: 'Secured or unsecured borrowing', blurb: 'Secured borrowing means the bank can take an asset, such as a building or a machine, if you cannot repay. That makes the loan cheaper. Unsecured loans cost more.', options: [
    opt('Unsecured loans', 'Nothing at risk, but a higher interest rate and a lower limit.', {}),
    opt('Secure against equipment', 'The bank holds a claim on your machines, so the rate is lower and the limit is higher.', { od: 1.1, risk: [2, 6, 'You missed a payment and the bank used its claim on your equipment.'] }, -0.2, 0.3),
    opt('Personal guarantee', 'You promise to repay out of your own pocket. The best terms there are, and the biggest worry.', { od: 1.15, m: -0.2, risk: [1.5, 8, 'A missed payment triggered your personal guarantee and the bank came after your own money.'] }, -0.35)] },
  { id: 'lending_invoicefinance', group: 'finance', name: 'Invoice finance', blurb: 'Invoice finance means a finance firm pays you most of an invoice\'s value now, instead of you waiting 30 to 60 days for your customer to pay. You get cash sooner, for a fee.', options: [
    opt('Wait for customers to pay', 'No fees, but the cash arrives late.', {}),
    opt('Invoice discounting', 'Borrow against your invoices quietly. Your customers still pay you directly.', { od: 1.15 }, 0.5, 0.3),
    opt('Invoice factoring', 'The finance firm collects the money for you. More cash and less chasing, but customers know, and the fee is higher.', { od: 1.2, rep: -0.02 }, 0.8)] },
  { id: 'lending_swap', group: 'finance', name: 'Interest-rate protection', blurb: 'If your loan rate floats with the market, a jump in rates raises your bill. A swap trades your floating rate for a fixed one, and a cap sets a ceiling on the rate you can be charged.', options: [
    opt('Floating rate', 'Your payments move up and down with market rates.', {}),
    opt('Swap to a fixed rate', 'Predictable payments that lenders like, but if rates fall you are stuck paying more.', { od: 1.06, risk: [5, 3, 'Rates fell and your fixed-rate swap cost more than a floating loan would have.'] }, 0.1, 0.2),
    opt('Buy an interest-rate cap', 'Pay a premium so that rates cannot pass a ceiling, and still gain if they fall.', { od: 1.03 }, 0.35)] },
  { id: 'lending_ltv', group: 'finance', name: 'Property loan limit', blurb: 'Banks lend only a share of a building\'s value, called the loan-to-value limit. Borrow close to the limit and a fall in property prices can leave you in trouble.', options: [
    opt('Borrow up to 60% of value', 'A typical limit. You put in 40% yourself.', {}),
    opt('Borrow up to 75% of value', 'More cash for the building, but a thin cushion if prices fall.', { od: 1.1, risk: [3, 5, 'Property prices dipped and the bank asked for extra cash because your loan was too big for the value.'] }, 0.3),
    opt('Borrow only 40% of value', 'Cautious and calm, but you have less cash to use elsewhere.', { m: 0.2, od: 0.95 })] },
  { id: 'lending_overdraft', group: 'finance', name: 'Overdraft or term loan', blurb: 'An overdraft lets you dip below zero in the bank when you need to, at a high rate. A term loan is a fixed sum repaid in steady instalments at a lower rate.', options: [
    opt('Use the overdraft when needed', 'Flexible and quick, with a high interest rate on whatever you use.', {}),
    opt('Take a term loan', 'A lower rate and steady repayments, but you lose some flexibility and your overdraft gets smaller.', { c: 0.997, od: 0.92 }, 0.1, 0.3),
    opt('A bit of both', 'A smaller term loan plus a smaller overdraft for the odd spike.', { c: 0.998, od: 0.97 }, 0.15, 0.2)] },
  { id: 'lending_supplierterms', group: 'finance', name: 'Supplier payment terms', blurb: 'Supplier credit means you pay your suppliers after you get the goods, which is free borrowing. Stretch it too far and they get nervous or raise their prices.', options: [
    opt('Pay in 30 days', 'The usual terms, and everyone is happy.', {}),
    opt('Stretch to 60 days', 'You hold on to your cash for longer, but suppliers price it into what they charge.', { od: 1.05, c: 1.01 }),
    opt('Stretch to 90 days', 'Even more cash in hand, and even more chance of an angry supplier.', { od: 1.1, c: 1.02, risk: [5, 3, 'A supplier put you on stop until you paid the overdue bill.'] })] },
  { id: 'lending_deposits', group: 'customers', name: 'Customer deposits', blurb: 'A deposit is money a customer pays before you deliver. It is cheap funding because you do not pay interest on it, though you owe the goods or a refund.', options: [
    opt('Bill on delivery', 'Customers pay when they get the goods.', {}),
    opt('Take a 20% deposit', 'Cash arrives before you spend it, though a few customers hesitate.', { od: 1.1, d: 0.99 }, 0.1),
    opt('Take a 50% deposit', 'Even cheaper funding, but more refunds and fewer orders.', { od: 1.2, d: 0.98, risk: [3, 4, 'A cancelled order meant a deposit had to be refunded after the money was spent.'] })] },
  { id: 'lending_tradeinsurance', group: 'finance', name: 'Trade-credit insurance', blurb: 'Trade-credit insurance pays most of a bad debt if a customer goes bust owing you money. Banks like it and will lend more against insured invoices.', options: [
    opt('Uninsured', 'You carry the risk yourself if a customer fails.', {}),
    opt('Insure your biggest customers', 'Cover for the few customers who matter most, for a modest premium.', { od: 1.08, c: 0.998 }, 0.5),
    opt('Insure every customer', 'Full cover and the best lending terms, with a bigger premium.', { od: 1.12, c: 0.997 }, 0.9)] },
  { id: 'lending_fxloan', group: 'finance', name: 'Currency of your loans', blurb: 'A loan in dollars or euros often has a lower rate. But if the pound falls against that currency, the loan grows when you count it in pounds. That is exchange risk.', options: [
    opt('Borrow in pounds', 'No exchange risk and no surprises.', {}),
    opt('Borrow in dollars or euros', 'A lower rate and more headroom, but a falling pound makes the loan grow.', { od: 1.05, risk: [8, 4, 'The pound fell and your foreign-currency loan grew in pounds.'] }, -0.3),
    opt('Match the currency you earn abroad', 'Borrow in the same currency as your foreign sales so the swings partly cancel out.', { od: 1.03, risk: [3, 2, 'A currency swing left your loan and your foreign sales slightly out of step.'] }, -0.1)] },
  { id: 'lending_latepayinterest', group: 'customers', name: 'Late-payment interest on customers', blurb: 'The law lets you charge interest to customers who pay late. Whether you use that right says a lot about how you run your business.', options: [
    opt('No charge for late payers', 'Friendly, and slow payers take advantage.', {}),
    opt('Charge the legal interest rate', 'Late payers owe interest. A few moan, and you earn a bit.', { d: 0.995 }, -0.15),
    opt('Charge it and chase hard', 'Firm reminders and a charge every time. More money, fewer happy customers.', { d: 0.985, rep: -0.02 }, -0.3)] },
];

export const events: EvSpec[] = [
  { id: 'e9_lending_covenant', title: 'You break a loan covenant', icon: 'shield', good: false, per: 1, cd: 18, min: 12, story: 'Your loan has a covenant, a promise to keep certain numbers healthy, such as profit comfortably covering the interest. This quarter you slipped below the line. The bank could demand its money back, but it may agree to a waiver, which means it agrees to overlook the slip.', choices: [
    S('waiver', 'Ask for a waiver', 'Free to ask, and the bank may want something in return.', '', { gamble: { p: 0.7, good: {}, bad: { c: E(1.02, 6), rep: -1 }, goodText: 'The bank agreed to look the other way, this once.', badText: 'The bank agreed, but raised your interest rate for a while.' } }),
    S('fee', 'Pay a waiver fee', 'Costs money and is written down in black and white.', 'You paid the fee, and the bank confirmed in writing that the slip was waived.', { k: 0.03 }),
    S('cuts', 'Cut costs to get back above the line', 'Free, but the team feels it.', 'You trimmed costs hard and the numbers recovered, though the mood at work dipped.', { eff: { c: E(0.99, 6), morale: -2 } })] },
  { id: 'e9_lending_bankswitch', title: 'A rival bank offers you a better deal', icon: 'star', good: true, per: 1.2, cd: 24, story: 'Another bank is offering lower fees and a better rate if you move your accounts to them. Switching is a hassle, and your current bank might not like it.', choices: [
    S('switch', 'Switch banks', 'Costs a little in admin and then saves money.', 'The move was a faff, but the lower fees showed up straight away.', { k: 0.01, eff: { c: E(0.995, 12) } }),
    S('haggle', 'Use the offer to haggle with your bank', 'Free, and it may or may not work.', '', { gamble: { p: 0.6, good: { c: E(0.996, 12) }, bad: { c: E(1.003, 4) }, goodText: 'Your bank matched the deal to keep you.', badText: 'Your bank shrugged, and the manager has been frosty since.' } }),
    S('stay', 'Stay where you are', 'No cost and no gain.', 'You stayed put and avoided a month of paperwork.')] },
  { id: 'e9_lending_bridge', title: 'A gap between paying out and getting paid', icon: 'bolt', good: false, per: 1.2, cd: 12, min: 10, story: 'A big customer will not pay for six weeks, but wages and rent are due before then. A bridge loan is a short, quick loan that covers a timing gap until the money arrives, usually at a high interest rate.', choices: [
    S('bridge', 'Take a bridge loan', 'Costs fees and interest, and the gap is covered.', 'You paid the fee and the interest, and the gap closed without drama.', { k: 0.025 }),
    S('stretch', 'Ask suppliers to wait', 'Free, if they agree.', '', { gamble: { p: 0.6, good: {}, bad: { c: E(1.02, 3), rep: -1 }, goodText: 'Your suppliers were relaxed about waiting.', badText: 'A supplier put on a surcharge, and word got around that you were short of cash.' } }),
    S('overdraft', 'Use your overdraft', 'Cheaper to set up, and pricey day by day.', 'The overdraft covered it at a steep daily rate, but only for a few weeks.', { k: 0.012 })] },
  { id: 'e9_lending_earlyrepay', title: 'You could repay a loan early', icon: 'diamond', good: true, per: 1, cd: 24, min: 18, story: 'You have spare cash and could pay off a loan early to save interest. But many loans charge an early-repayment penalty, because the bank loses the interest it was counting on.', choices: [
    S('repay', 'Repay it all and pay the penalty', 'Costs money now and saves interest for years.', 'You paid the penalty and cleared the debt. Your interest bill shrank.', { k: 0.04, eff: { c: E(0.99, 12) } }),
    S('haggle', 'Negotiate the penalty down', 'Costs some adviser time, and may or may not work.', '', { k: 0.005, gamble: { p: 0.5, good: { c: E(0.992, 12) }, bad: {}, goodText: 'The bank halved the penalty and you cleared the loan.', badText: 'The bank would not budge, and you kept the loan for now.' } }),
    S('keep', 'Keep the loan and the cash', 'No saving, and a handy cushion.', 'You kept your cash as a safety cushion and went on paying the interest.')] },
  { id: 'e9_lending_bankmanager', title: 'A new bank manager takes over', icon: 'coffee', good: true, per: 1, cd: 24, story: 'Your relationship manager at the bank has moved on and a new one has taken over your account. Their opinion of you shapes your limits and your rates, so first impressions matter.', choices: [
    S('lunch', 'Invite them for a site tour and lunch', 'A small cost, and a chance to win them over.', '', { k: 0.008, gamble: { p: 0.75, good: { c: E(0.995, 12), rep: 1 }, bad: {}, goodText: 'They loved the visit and softened a few terms.', badText: 'They were polite and noncommittal.' } }),
    S('update', 'Send a tidy business update', 'A bookkeeper\'s afternoon, and it shows you are organised.', 'The neat update made you look well run, and the bank noticed.', { k: 0.004, eff: { c: E(0.998, 8) } }),
    S('wait', 'Wait for them to call', 'Free, and they may review you cold.', '', { gamble: { p: 0.35, good: {}, bad: { c: E(1.01, 8) }, goodText: 'They left your terms as they were.', badText: 'They reviewed your account cold and tightened the terms.' } })] },
  { id: 'e9_lending_restructure', title: 'Talks with your lenders when cash is tight', icon: 'mountain', good: false, per: 0.7, cd: 24, min: 12, story: 'Money is tight and a loan repayment is going to be missed. Do not hide: banks usually prefer to agree a plan than to take you to court. A restructuring changes the loan, for example by stretching it over a longer time so the monthly payments get smaller.', choices: [
    S('talk', 'Ask for a restructure early', 'Costs adviser fees, and it is the grown-up move.', '', { k: 0.02, gamble: { p: 0.8, good: { c: E(0.99, 12), morale: 1 }, bad: { c: E(1.01, 6), rep: -1 }, goodText: 'The bank stretched the loan and the smaller payments eased the pressure.', badText: 'The bank agreed, but charged a fee and a higher rate.' } }),
    S('holiday', 'Ask for a payment holiday', 'Free to ask, and the interest keeps building.', '', { gamble: { p: 0.5, good: { c: E(0.995, 6) }, bad: { rep: -2, c: E(1.02, 6) }, goodText: 'The bank paused your payments for a few months.', badText: 'The bank refused and logged the request on your credit record.' } }),
    S('hide', 'Skip the payment and say nothing', 'Free now and very risky.', '', { gamble: { p: 0.25, good: {}, bad: { rep: -4, c: E(1.05, 8), morale: -3 }, goodText: 'The bank did not notice, and you caught up the next month.', badText: 'The bank noticed, added default charges and told others.' } })] },
  { id: 'e9_lending_creditlimit', title: 'A supplier cuts your credit limit', icon: 'parcel', good: false, per: 1.2, cd: 14, gate: 'stock', story: 'A supplier has reviewed your account and cut your credit limit, the most you can owe before they stop delivering. It may be routine, or they may have heard something worrying about you.', choices: [
    S('prepay', 'Pay up front for a while', 'Free, and it strains your cash.', 'Paying early squeezed your cash, but the deliveries kept coming.', { eff: { c: E(1.01, 4) } }),
    S('deposit', 'Offer a deposit as comfort', 'Costs cash, and it calms them.', 'The deposit calmed them, and the limit crept back up.', { k: 0.03 }),
    S('switch', 'Find another supplier', 'Free to look, with a chance of a better deal.', '', { gamble: { p: 0.6, good: { c: E(0.995, 8) }, bad: { c: E(1.03, 4) }, goodText: 'A new supplier offered friendlier terms and better prices.', badText: 'The switch was rushed and costly, and the new supplier was no better.' } })] },
  { id: 'e9_lending_debtcollect', title: 'A customer will not pay', icon: 'flame', good: false, per: 1.3, cd: 10, story: 'A customer is months late and ignores your reminders. You can escalate in steps: a firm letter before legal action, then a debt-collection agency, which keeps a share of whatever it recovers.', choices: [
    S('letter', 'Send a formal letter before action', 'Some money comes back, and the customer is irritated.', 'The letter did the trick and part of the debt came in, though the customer was cross.', { income: 0.04, eff: { d: E(0.995, 3) } }),
    S('agency', 'Hand it to a collection agency', 'More comes back, and the customer will not be back.', 'The agency recovered most of the debt and kept its cut. The customer, and some of their friends, will not buy from you again.', { income: 0.08, eff: { d: E(0.985, 6), rep: -1 } }),
    S('writeoff', 'Write it off and move on', 'You lose the money and keep the peace.', 'You wrote the debt off, kept the relationship and learned to check credit before selling.')] },
];

export const projects: InitiativeDef[] = [
  { id: 'lending_assetlease', name: 'Lease machines instead of buying', blurb: 'Asset finance lets you get machines now and pay in monthly instalments, instead of paying the full price up front. The finance company owns the machine until the end.', k: 0.8, months: 3, success: 85,
    win: { eff: { cap: 1.03 }, monthly: 0.5, text: 'The new machines arrived, output rose, and you pay for them in small monthly bites.' },
    lose: { now: { c: E(1.01, 3) }, text: 'Delivery slipped and the finance deal fell through, leaving you with fees to pay.' } },
  { id: 'lending_p2p', name: 'Peer-to-peer loan campaign', blurb: 'Peer-to-peer lending lets ordinary people lend you small amounts through a website. It can be quicker than a bank, but you must win them over and pay a higher rate.', k: 0.4, months: 3, success: 65,
    win: { eff: { od: 1.12, rep: 0.02 }, monthly: 0.5, text: 'Hundreds of small lenders backed you, and your story helped your reputation.' },
    lose: { now: { rep: -1 }, text: 'The campaign missed its target, so no money was raised and the world noticed.' } },
  { id: 'lending_guarantee', name: 'Government loan-guarantee scheme', blurb: 'In a loan-guarantee scheme the government promises to repay most of a bank loan if you fail, so banks lend to firms they would normally turn down. Applying means plenty of forms.', k: 0.4, months: 4, success: 70,
    win: { eff: { od: 1.2 }, monthly: 0.25, text: 'Your application was approved and the banks are now much keener to lend to you.' },
    lose: { now: { morale: -1 }, text: 'The application was turned down because the forms were incomplete.' } },
  { id: 'lending_syndicated', name: 'Syndicated loan for a big purchase', blurb: 'A syndicated loan is one big loan shared by several banks, so no single bank takes the whole risk. It is how big purchases get funded, and it comes with big fees.', k: 1.2, months: 5, success: 60,
    win: { eff: { cap: 1.04 }, monthly: 0.7, text: 'A group of banks funded your big purchase, and the extra capacity is already paying its way.' },
    lose: { now: { rep: -1 }, text: 'The banks could not agree on terms, and you were left with the advisers\' bill.' } },
  { id: 'lending_mezzanine', name: 'Mezzanine finance with a profit share', blurb: 'Mezzanine finance sits between normal loans and shares. It is expensive, and the lender often takes a slice of your profits as well, but it can fund growth when banks say no.', k: 0.8, months: 4, success: 65,
    win: { eff: { d: 1.02, od: 1.15 }, monthly: 1, text: 'The mezzanine lender backed your growth, and in return takes interest and a share of profits.' },
    lose: { now: { morale: -1 }, text: 'The lender wanted too much of your profit, so you walked away and the fees were wasted.' } },
  { id: 'lending_bond', name: 'Issue a company bond', blurb: 'A bond is a loan from many investors who receive regular interest and get their money back at the end. Only larger, well-known firms can do it, and the set-up is costly.', k: 2.5, months: 9, success: 55,
    win: { eff: { od: 1.25 }, monthly: 0.8, text: 'Investors bought your bond, and your name now stands for something in the markets.' },
    lose: { now: { rep: -2 }, text: 'Investors did not like the price, and the bond was pulled in public.' } },
];
