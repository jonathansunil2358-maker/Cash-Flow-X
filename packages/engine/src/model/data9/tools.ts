import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Management tools and reports. Filled in by hand; every id must start with "tools_" (policies and projects) or "e9_tools_" (events). */
export const policies: PolicyDef[] = [
  // 976 Weekly-business-review pack
  { id: 'tools_weekly_review', group: 'ops', name: 'Weekly business review', blurb: 'A short, regular look at the numbers and what to do about them.', options: [
    opt('No regular review', 'You look at the numbers when something feels wrong.', {}),
    opt('Fortnightly check-in', 'Half an hour every two weeks to go over sales, costs and cash.', { c: 0.998 }, 0.1),
    opt('Weekly review pack', 'A one-page pack and a meeting every Monday. You catch problems fast, and people feel the weight of the meetings.', { c: 0.995, q: 0.01, m: -0.1 }, 0.4)] },
  // 981 Cash-flow forecasting tool with confidence ranges
  { id: 'tools_cash_forecast', group: 'finance', name: 'Cash-flow forecast', blurb: 'A forecast says how much cash you expect to have in future. Banks like to see one.', options: [
    opt('Check the bank balance', 'You look at what is in the account today and hope for the best.', {}),
    opt('Thirteen-week forecast', 'A simple forecast of the next three months, updated every week. Lenders are reassured.', { od: 1.05 }, 0.2),
    opt('Forecast with ranges', 'Shows best, likely and worst cases, so you know how big a cushion you need. Lenders trust it, and finance staff are busier.', { od: 1.1, c: 0.998, m: -0.05 }, 0.5)] },
  // 983 Product-profitability matrix
  { id: 'tools_product_matrix', group: 'ops', name: 'Product profit matrix', blurb: 'A table showing which products make money and which only look busy.', options: [
    opt('Sell everything', 'Keep every product, because you never know.', {}),
    opt('Prune the tail each year', 'Once a year, drop the worst sellers. Costs fall a bit, and a few customers lose their favourite.', { c: 0.995, d: 0.995 }),
    opt('Full quarterly matrix', 'Every quarter, rank products by profit, push the winners, and fix or drop the losers. It takes real work.', { c: 0.99, d: 1.005, m: -0.05 }, 0.3)] },
  // 985 Benchmark panel versus industry norms
  { id: 'tools_benchmarks', group: 'finance', name: 'Industry benchmarks', blurb: 'A benchmark compares you with similar firms, so you can see where you are slipping behind.', options: [
    opt('Go by gut feel', 'You think you are doing fine, and cannot prove it.', {}),
    opt('Yearly benchmark report', 'A report once a year that compares your margins, pay and prices to others.', { c: 0.998 }, 0.1),
    opt('Live benchmark panel', 'A subscription that updates every month. Better insight, and a bigger bill.', { c: 0.994, q: 0.005 }, 0.4)] },
  // 989 Action-item tracker from board meetings
  { id: 'tools_action_tracker', group: 'people', name: 'Follow-up on decisions', blurb: 'Making sure that what the board agrees to do actually gets done.', options: [
    opt('We remember what we agreed', 'Meetings end with nods, and things sometimes slip.', {}),
    opt('Written action list', 'Every meeting ends with a list of who does what.', { cap: 1.01 }, 0.1),
    opt('Owners, dates and weekly checks', 'Every action has a name and a deadline, and is chased each week. Things get done, though some people feel nagged.', { cap: 1.02, m: -0.15 }, 0.3)] },
  // 991 Risk-heat-map
  { id: 'tools_risk_heatmap', group: 'finance', name: 'Risk heat map', blurb: 'A colour-coded chart of what could go wrong, ranked by how likely and how costly each risk is.', options: [
    opt('Keep risks in your head', 'You worry about things as they come up.', {}),
    opt('Yearly risk list', 'List the top risks once a year and give each one an owner.', { rep: 0.01 }, 0.1),
    opt('Live heat map', 'Updated every month and reviewed by the board. You spot trouble early, and it needs steady upkeep.', { rep: 0.02, c: 0.997, m: -0.05 }, 0.35)] },
  // 994 Budget-versus-actual drill-downs
  { id: 'tools_budget_actual', group: 'finance', name: 'Budget versus actual', blurb: 'Comparing what you planned to spend with what you really spent.', options: [
    opt('Budget filed away', 'You set a budget in January and never look at it again.', {}),
    opt('Monthly comparison', 'Each month you look at where you are over or under budget.', { c: 0.997 }, 0.2),
    opt('Drill into every line', 'Ask why for every big gap, right down to single invoices. Savings follow, and managers feel watched.', { c: 0.994, m: -0.1 }, 0.5)] },
  // 997 Decision-log with later review of outcomes
  { id: 'tools_decision_log', group: 'people', name: 'Decision log', blurb: 'A written record of big decisions, so you can learn what worked and what did not.', options: [
    opt('Rely on memory', 'You remember the wins and quietly forget the mistakes.', {}),
    opt('Write decisions down', 'Record what you decided and why, in a shared notebook.', { q: 0.005 }, 0.05),
    opt('Log and review after six months', 'Go back to each big decision and mark it right or wrong, honestly. You learn faster, and it stings a bit.', { q: 0.01, c: 0.996, m: -0.05 }, 0.2)] },
  // 998 Month-end-close checklist
  { id: 'tools_month_end', group: 'finance', name: 'Month-end close', blurb: 'The routine for finishing and checking the books at the end of each month.', options: [
    opt('Close when we get round to it', 'The books are finished when someone has time, and errors surface later.', {}),
    opt('Checklist close', 'A checklist of every step, ticked off each month. Fewer errors and surprises.', { c: 0.997, m: -0.05 }, 0.15),
    opt('Five-day fast close', 'Books finished within five working days. Great numbers, though the finance team works flat out.', { c: 0.995, od: 1.05, m: -0.2 }, 0.6)] },
];

export const events: EvSpec[] = [
  // 984 Seasonality-adjusted charts
  { id: 'e9_tools_seasonal', title: 'A scary quiet month', icon: 'chart', good: false, per: 1.2, cd: 14, min: 12, story: 'Sales dropped sharply compared with last month, and the team is spooked. But is it a real problem, or just the time of year?', choices: [
    S('adjust', 'Check the seasonally adjusted chart', 'Free, and it compares with the same month last year.', 'The chart showed the same dip happens every year. You stayed calm, and so did the team.', { eff: { morale: 1, quality: 0.5 } }),
    S('cut', 'Cut costs hard', 'Saves a little, and spooks the team.', 'You saved a little, but you scared the team over what turned out to be a normal dip.', { eff: { morale: -3, c: E(0.99, 4) } }),
    S('discount', 'Launch an emergency discount', 'Costs margin and may give away money for nothing.', 'Sales popped, but you gave away margin on a dip that would have passed on its own.', { k: 0.02, acct: 'marketing', eff: { d: E(1.03, 2) } })] },
  // 987 Sensitivity tables for price changes
  { id: 'e9_tools_pricesens', title: 'Time to raise prices?', icon: 'diamond', good: true, per: 1.2, cd: 14, min: 12, story: 'Costs have crept up and you are thinking about a price rise. How big should it be? Too small and you lose margin, and too big and customers go elsewhere.', choices: [
    S('table', 'Build a sensitivity table first', 'A table showing how sales react to different rises.', 'The table showed customers would shrug off a small rise. You picked the sweet spot.', { k: 0.01, acct: 'marketing', eff: { d: E(1.01, 8) } }),
    S('gut', 'Raise prices by 10% on gut feel', 'Free, and a real gamble.', '', { gamble: { p: 0.4, good: { d: E(1.03, 6) }, bad: { d: E(0.94, 6), rep: -1 }, goodText: 'Customers barely blinked, and the margin was welcome.', badText: 'Many customers left, and you had to row back.' } }),
    S('hold', 'Hold prices and absorb the costs', 'Free, and your margin shrinks.', 'You protected your customers and absorbed the extra cost.', { eff: { c: E(1.01, 6) } })] },
  // 990 Calendar of key deadlines
  { id: 'e9_tools_deadline', title: 'A deadline creeps up', icon: 'gear', good: false, per: 1.2, cd: 12, story: 'Your accountant mentions that a filing deadline is only a few days away. Nobody put it in the diary. Missing it could mean a fine.', choices: [
    S('rush', 'Rush it, and start a deadline calendar', 'Costs overtime and fixes the problem for good.', 'Overtime saved the day. The shared calendar of key deadlines means it should not happen again.', { k: 0.02, acct: 'otherCosts', eff: { quality: 0.5, c: E(0.995, 12) } }),
    S('extension', 'Ask for an extension', 'Free, and they may say no.', '', { gamble: { p: 0.55, good: {}, bad: { rep: -1, c: E(1.01, 3) }, goodText: 'They agreed this time, and you filed in peace.', badText: 'They said no. A late-filing fine followed.' } }),
    S('hope', 'Hope it will be fine', 'Free, and you may get caught.', '', { gamble: { p: 0.3, good: {}, bad: { rep: -2, c: E(1.02, 4) }, goodText: 'Nobody noticed.', badText: 'A fine and a stiff letter arrived, and customers found out.' } })] },
  // 993 Staff-cost-per-head tracker
  { id: 'e9_tools_headcost', title: 'People costs creep up', icon: 'gear', good: false, per: 1, cd: 14, gate: 'team', min: 12, story: 'Your staff-cost tracker shows that what you spend per person is up almost a tenth in a year, while sales per person are flat.', choices: [
    S('freeze', 'Freeze hiring and review roles', 'Free, and people feel the squeeze.', 'Costs eased, and some people felt the pressure.', { eff: { c: E(0.99, 6), morale: -1 } }),
    S('train', 'Train people to lift output per head', 'Costs money and makes people feel invested in.', 'Same people, more done, and they felt invested in.', { k: 0.02, acct: 'wages', eff: { quality: 1, morale: 1 } }),
    S('leave', 'Leave it, growth will fix it', 'Free, and it only works if sales grow.', '', { gamble: { p: 0.45, good: { d: E(1.02, 6) }, bad: { c: E(1.02, 6) }, goodText: 'Sales caught up with payroll.', badText: 'Costs kept creeping, and the growth never came.' } })] },
  // 986 What-if hiring simulator
  { id: 'e9_tools_hiringsim', title: 'A hiring plan lands on your desk', icon: 'rocket', good: true, per: 1, cd: 12, gate: 'team', story: 'Managers want three new hires. A what-if simulator could show how each choice would affect costs and cash over the next year.', choices: [
    S('sim', 'Run the what-if simulator first', 'Cheap, and it shows the cost of each option.', 'It showed you could hire one now and two in six months, saving cash while keeping up with demand.', { k: 0.005, acct: 'otherCosts', eff: { c: E(0.99, 8), quality: 0.5 } }),
    S('all', 'Hire all three now', 'Free to decide, and a bet on demand.', '', { gamble: { p: 0.5, good: { d: E(1.03, 6), quality: 1 }, bad: { c: E(1.02, 6), morale: -1 }, goodText: 'Demand rose, and you were ready for it.', badText: 'Demand lagged, and you were paying for idle hands.' } }),
    S('none', 'Hire nobody', 'Free, and the team stays stretched.', 'Existing people felt the strain of doing more with less.', { eff: { morale: -2 } })] },
  // 999 Forecast-accuracy scoreboard
  { id: 'e9_tools_forecastmiss', title: 'The forecast missed again', icon: 'chart', good: false, per: 1, cd: 14, min: 12, story: 'You keep a scoreboard of how close your forecasts were to reality. This quarter you were out by a fifth, because the team had been too hopeful.', choices: [
    S('show', 'Show the scoreboard to everyone', 'Free, and it stings.', 'It stung, but the team learned to be honest in their forecasts.', { eff: { quality: 1, morale: -1 } }),
    S('fix', 'Rebuild the forecasting method with finance', 'Costs time and fixes the cause.', 'You rebuilt the forecast with the finance team, and the next one landed much closer.', { k: 0.015, acct: 'otherCosts', eff: { quality: 0.5 } }),
    S('blame', 'Blame the market', 'Free, and nothing is learned.', '', { gamble: { p: 0.4, good: {}, bad: { quality: -1, rep: -1 }, goodText: 'Everyone nodded, and nobody checked.', badText: 'The same mistake happened again, and people lost faith in the numbers.' } })] },
  // 1000 Management-letter from the auditors
  { id: 'e9_tools_mgmtletter', title: 'The auditors\' letter arrives', icon: 'key', good: false, per: 1.2, cd: 14, min: 12, story: 'Your auditors, the outside accountants who check your books, have sent a management letter. It lists weaknesses they spotted, such as one person both approving and paying invoices.', choices: [
    S('all', 'Fix everything on the list', 'Costs time and money, and tidies the lot.', 'It took time and money, but next year\'s letter was nearly empty.', { k: 0.03, acct: 'otherCosts', eff: { rep: 1, quality: 1 } }),
    S('top', 'Fix the top three', 'Cheaper, and only part of the job.', 'You fixed the biggest weaknesses and left the rest for later.', { k: 0.01, acct: 'otherCosts', eff: { quality: 0.5 } }),
    S('drawer', 'Put it in a drawer', 'Free, until a weakness bites.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -2, c: E(1.02, 4) }, goodText: 'Nothing went wrong this year.', badText: 'One of the weaknesses led to an expensive error.' } })] },
];

export const projects: InitiativeDef[] = [
  // 977 KPI-dashboard builder
  { id: 'tools_kpi_dashboard', name: 'Build a KPI dashboard', blurb: 'KPI means key performance indicator: the handful of numbers that tell you whether the business is healthy. Put them on one screen.', k: 0.8, months: 4, success: 80,
    win: { eff: { c: 0.995, q: 0.01 }, monthly: 0.1, text: 'Everyone could see the same few numbers, and problems were spotted early. Costs fell a little.' },
    lose: { now: { morale: -1 }, text: 'The dashboard was built, but the numbers were wrong, and nobody trusted it.' } },
  // 978 Alerts for covenant breaches
  { id: 'tools_covenant_alerts', name: 'Set up covenant alerts', blurb: 'A covenant is a promise you make to a lender, such as keeping cash above a minimum. Alerts warn you before you break one.', k: 0.4, months: 3, success: 85,
    win: { eff: { od: 1.1, rep: 0.01 }, monthly: 0.1, text: 'You were warned in good time, and you told your lender before there was a problem. They trust you more now.' },
    lose: { now: { morale: -1 }, text: 'The alerts went off so often that people switched them off.' } },
  // 979 Scenario-planner with sliders
  { id: 'tools_scenario_planner', name: 'Build a scenario planner', blurb: 'A spreadsheet with sliders that answers questions like what happens if sales fall by a tenth, or costs rise by a twentieth.', k: 0.6, months: 4, success: 75,
    win: { eff: { c: 0.996, od: 1.05 }, now: { quality: 1 }, text: 'You tested your plans against bad news before it arrived, and you built a cash cushion in time.' },
    lose: { now: { c: E(1.015, 4) }, text: 'The model gave false comfort, and a rosy scenario led you into overspending.' } },
  // 980 Break-even calculators per product
  { id: 'tools_breakeven_calc', name: 'Break-even calculators for each product', blurb: 'Break-even is the point where a product has earned back all its costs. Work it out for every product you sell.', k: 0.5, months: 3, success: 80,
    win: { eff: { c: 0.994 }, monthly: 0.1, text: 'You found two products that never broke even, repriced them, and costs fell.' },
    lose: { now: { d: E(0.98, 3) }, text: 'A wrong number led you to cut a price too far, and margins suffered for a while.' } },
  // 982 Customer-profitability league table
  { id: 'tools_customer_league', name: 'Customer profitability league table', blurb: 'Rank customers by how much profit they bring you, not just by how much they buy.', k: 0.5, months: 3, success: 75,
    win: { eff: { c: 0.99, d: 0.995 }, text: 'You stopped giving your biggest discounts to customers who barely pay their way. A couple left, and profits improved.' },
    lose: { now: { d: E(0.97, 3), rep: -1 }, text: 'The table was wrong, and a good customer felt ignored and drifted away.' } },
  // 988 Executive-summary generator
  { id: 'tools_exec_summary', name: 'Executive-summary generator', blurb: 'Build a template that turns piles of numbers into a one-page summary of the three things that matter most.', k: 0.3, months: 2, success: 85,
    win: { eff: { c: 0.996, cap: 1.005 }, monthly: 0.05, text: 'Managers read the summary and acted on it, instead of drowning in spreadsheets.' },
    lose: { now: { quality: -1 }, text: 'The summaries looked too slick and hid some real problems.' } },
  // 992 Working-capital cycle tracker
  { id: 'tools_wc_tracker', name: 'Working-capital cycle tracker', blurb: 'Working capital is the cash tied up between paying suppliers and getting paid by customers. Track how many days it takes.', k: 0.5, months: 3, success: 80,
    win: { eff: { od: 1.08 }, monthly: -0.15, text: 'You chased late payers sooner and paid suppliers on time, so less cash was stuck.' },
    lose: { now: { rep: -1 }, text: 'The tracker pushed staff to chase customers too hard, and some got annoyed.' } },
  // 995 Customer-cohort retention charts
  { id: 'tools_cohort_charts', name: 'Customer-cohort retention charts', blurb: 'A cohort is a group of customers who joined in the same month. Charts show how many are still with you later on.', k: 0.6, months: 4, success: 75,
    win: { eff: { ch: 0.98 }, monthly: 0.1, text: 'The charts showed customers drift away after month three. A friendly call at month two fixed it.' },
    lose: { now: { d: E(0.98, 3) }, text: 'You misread the charts and changed something customers actually liked.' } },
  // 996 Supplier-spend analysis
  { id: 'tools_supplier_spend', name: 'Supplier-spend analysis', blurb: 'Add up what you spend with each supplier, and find where bulk deals or cheaper alternatives are hiding.', k: 0.5, months: 3, success: 75,
    win: { eff: { c: 0.99 }, monthly: 0.05, text: 'You pooled small orders into a few bigger ones and won better prices.' },
    lose: { now: { c: E(1.02, 3) }, text: 'A favourite supplier took offence at being questioned, and prices went up for a while.' } },
];
