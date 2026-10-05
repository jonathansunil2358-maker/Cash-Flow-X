import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { opt, S, E } from '../dataKit';

/** Topic: Research and development. Every id must start with "rnd_" (policies and projects) or "e9_rnd_" (events). */
export const policies: PolicyDef[] = [
  // 626 R&D pipeline with stage gates
  { id: 'rnd_stagegates', group: 'ops', name: 'R&D stage gates', blurb: 'Stage gates are checkpoints where an idea has to prove itself before it gets any more money.', options: [
    opt('Back every idea', 'No formal checks. An idea keeps its funding until somebody gives up on it.', {}),
    opt('Light gates', 'One review early on. It stops the obvious duds cheaply.', { q: 0.01 }, 0.2),
    opt('Strict gates', 'Ideas must clear several reviews. Fewer flops and lower waste, but good ideas can reach customers late.', { q: 0.02, c: 0.995, d: 0.99 }, 0.4)] },
  // 627 Prototype lab capacity
  { id: 'rnd_protolab', group: 'ops', name: 'Prototype lab', blurb: 'A prototype is a first working model. A lab lets your team build, test and break them quickly.', options: [
    opt('Borrow a bench', 'Build prototypes in a corner of the workshop and wait your turn for equipment.', {}),
    opt('Small lab', 'A few benches and tools, so ideas get tested sooner.', { q: 0.015 }, 0.4, 0.8),
    opt('Full lab', 'Test rigs, 3D printers and a dedicated team. Very capable, very costly, and expensive kit breaks now and then.', { q: 0.03, d: 1.005, risk: [3, 3, 'An expensive piece of lab kit broke and had to be repaired.'] }, 1, 2)] },
  // 628 Patent-portfolio maintenance fees
  { id: 'rnd_patentfees', group: 'finance', name: 'Patent renewals', blurb: 'A patent stops others copying your invention, but you pay a fee every year to keep each one alive.', options: [
    opt('Renew as they fall due', 'Keep paying for the patents you already hold and file nothing more.', {}),
    opt('Prune the portfolio', 'Let your weaker patents lapse and save the fees. Anything that lapses can be copied freely.', { risk: [2.5, 3, 'A copycat appeared after you let a patent lapse.'] }, -0.25),
    opt('Build a patent wall', 'File and keep many patents around your best ideas. Rivals think twice, but the fees add up.', { d: 1.005, rep: 0.02 }, 0.7, 0.4)] },
  // 632 Product-roadmap tradeoffs between features
  { id: 'rnd_roadmap', group: 'ops', name: 'Product roadmap', blurb: 'A roadmap is your plan for which features to build next. You cannot build everything, so what comes first?', options: [
    opt('Whatever shouts loudest', 'No fixed order. The loudest customer or colleague wins.', {}),
    opt('Customer requests first', 'Build what customers ask for. They are pleased, but every special request adds cost.', { d: 1.01, c: 1.005 }),
    opt('Reliability before features', 'Fix and polish before adding anything new. Quality rises while the shiny launches wait.', { q: 0.02, d: 0.995 }),
    opt('Headline features', 'Chase eye-catching launches. Demand jumps, but rushed features sometimes ship with bugs.', { d: 1.015, risk: [5, 2, 'A rushed headline feature shipped with bugs, and fixing it cost money.'] })] },
  // 638 Research-staff retention bonuses
  { id: 'rnd_retention', group: 'people', name: 'Researcher retention bonuses', blurb: 'Rivals love to hire your best inventors away. A bonus for staying keeps their know-how in the building.', options: [
    opt('No special bonus', 'Researchers are paid like everyone else.', {}),
    opt('Yearly stay bonus', 'A lump sum for each year a researcher stays.', { m: 0.15 }, 0.4),
    opt('Retention package', 'Bigger bonuses plus a share of what their inventions earn. Strong loyalty, and a hefty bill.', { m: 0.2, q: 0.015 }, 1.1)] },
  // 641 Incremental versus breakthrough balance
  { id: 'rnd_balance', group: 'ops', name: 'Small upgrades or big bets', blurb: 'Small upgrades are safe and steady. Breakthroughs are rare, risky and can change a whole market.', options: [
    opt('An even split', 'A bit of safe improvement and a bit of blue-sky thinking.', {}),
    opt('Mostly small upgrades', 'Steady improvements to what you already sell. Reliable, but nothing that stops the show.', { q: 0.01, c: 0.995 }, 0.1),
    opt('Chase breakthroughs', 'Back big ideas that could win a new market. Most will fail, and failures have to be written off.', { d: 1.02, risk: [5, 4, 'A breakthrough bet failed and the money was written off.'] }, 0.4)] },
  // 642 Standards-body membership
  { id: 'rnd_standards', group: 'ops', name: 'Standards-body membership', blurb: 'Standards bodies are industry groups that agree common rules, such as how parts fit or how safety is measured. A seat at the table lets you shape them.', options: [
    opt('Stay outside', 'Follow whatever standards other people write.', {}),
    opt('Join as a member', 'Pay a yearly fee, see new rules early and wear a badge that customers trust.', { d: 1.005, rep: 0.02 }, 0.2, 0.3),
    opt('Sit on a committee', 'Help write the rules, so your products fit them first. Your engineers lose working time to meetings.', { d: 1.01, rep: 0.03, cap: 0.995 }, 0.5, 0.3)] },
  // 647 Skunkworks team with a secret budget
  { id: 'rnd_skunkworks', group: 'ops', name: 'Skunkworks team', blurb: 'A skunkworks is a small team with a secret budget, free from the normal rules, who build wild ideas out of sight.', options: [
    opt('No secret projects', 'Every project goes through the normal process.', {}),
    opt('A small skunkworks', 'A few people and a hidden budget. Surprising ideas appear, and others grumble about the secrecy.', { q: 0.02, m: -0.1 }, 0.5),
    opt('A fully secret unit', 'A separate team with its own money and no reporting lines. Bolder ideas, more resentment, and some costly dead ends.', { q: 0.03, d: 1.005, m: -0.25, risk: [3, 3, 'The secret team chased a dead end and burned through its budget.'] }, 1)] },
  // 646 Product-liability exposure of new designs
  { id: 'rnd_liability', group: 'ops', name: 'Testing new designs', blurb: 'If a new design hurts someone or breaks down, you can be held responsible. That is called product liability, and the claims can be costly.', options: [
    opt('Standard testing', 'The usual safety and durability checks before launch.', {}),
    opt('Rush to market', 'Skip some tests to launch sooner and save money. If a flaw slips through, the claims are expensive.', { d: 1.01, risk: [4, 5, 'A fault in a new design led to claims from unhappy customers.'] }, -0.2),
    opt('Independent lab testing', 'An outside lab certifies every new design. Slower and dearer, but customers trust it.', { q: 0.01, rep: 0.02, d: 0.995 }, 0.4)] },
  // 649 Licensing-in a technology
  { id: 'rnd_licensein', group: 'ops', name: 'Licensing in technology', blurb: 'Instead of inventing something yourself, you pay another firm for the right to use their technology. This is called licensing in.', options: [
    opt('Build it all ourselves', 'Everything you use is your own invention.', {}),
    opt('Licence one technology', 'Pay royalties (a fee on every sale) to borrow one clever component. Faster than inventing it.', { q: 0.015, c: 0.99 }, 0.6, 0.8),
    opt('Licence several', 'Quick wins across the range, but you depend on partners, and they can change their terms.', { q: 0.02, c: 0.985, risk: [3, 3, 'A licensing partner changed its terms and raised the fee.'] }, 1.3, 1.2)] },
];

export const events: EvSpec[] = [
  // 630 Failed-project write-offs
  { id: 'e9_rnd_writeoff', title: 'A project has failed', icon: 'flame', good: false, per: 1.5, cd: 24, story: 'After months of work, a research project has clearly failed. Writing it off means admitting the money is gone for good. Keeping it alive means hoping for a miracle.', choices: [
    S('writeoff', 'Write it off and hold a review', 'Take the cost now and learn what went wrong.', 'You took the hit, learned the lessons, and the team respected your honesty.', { k: 0.03, eff: { quality: 1, morale: 1 } }),
    S('zombie', 'Keep funding it quietly', 'Costs nothing today, but it may keep draining money.', '', { gamble: { p: 0.3, good: { quality: 2 }, bad: { c: E(1.03, 6), morale: -2 }, goodText: 'A late fix gave you something worth keeping.', badText: 'More money disappeared, and the team lost faith in the plan.' } }),
    S('shelve', 'Shelve it and spend nothing more', 'Free, but people feel their work was wasted.', 'The project went into a drawer, and some of the team felt discarded.', { eff: { morale: -1 } })] },
  // 631 Open-innovation challenge prizes
  { id: 'e9_rnd_challenge', title: 'A prize challenge for outside ideas', icon: 'diamond', good: true, per: 1.2, cd: 30, story: 'Staff suggest posting a public challenge: solve our problem and win a prize. Open innovation means asking the wider world for ideas, not just your own team.', choices: [
    S('big', 'Offer a big prize', 'Costs real money and attracts serious entries.', '', { k: 0.04, gamble: { p: 0.65, good: { quality: 2, c: E(0.98, 8), rep: 1 }, bad: { rep: -1 }, goodText: 'A student team cracked the problem, and the story was shared widely.', badText: 'The entries were weak, and a few people called the prize a stunt.' } }),
    S('small', 'Offer a small prize', 'Cheaper, with fewer entries.', 'A handful of clever entries arrived, and one was useful.', { k: 0.01, eff: { quality: 1 } }),
    S('inhouse', 'Keep ideas in-house', 'No cost, and no fresh eyes.', 'You kept the problem in the family.')] },
  // 633 Intellectual-property disputes
  { id: 'e9_rnd_ipdispute', title: 'A rival says you copied them', icon: 'shield', good: false, per: 1.2, cd: 36, gate: 'rivals', story: 'A rival\'s lawyers have written to say your newest design infringes their patent. That means they think you are using their protected invention without permission.', choices: [
    S('fight', 'Fight the claim', 'Pay for lawyers and hope the judge agrees with you.', '', { k: 0.04, gamble: { p: 0.55, good: { rep: 2 }, bad: { rep: -2, d: E(0.98, 4) }, goodText: 'The claim was thrown out, and you gained a name for standing firm.', badText: 'You lost, paid their costs, and had to change the design in a hurry.' } }),
    S('settle', 'Settle with a licence fee', 'Pay them to use the idea, and end it.', 'You paid a fee, kept the product on sale, and the letters stopped.', { k: 0.05, eff: { c: E(1.01, 12) } }),
    S('redesign', 'Redesign around their patent', 'Cheaper than a fight, with a few months of disruption.', 'Your engineers found a different way to do it, and the product was no worse.', { k: 0.02, eff: { d: E(0.99, 3), quality: 1 } })] },
  // 637 Field trials with customers
  { id: 'e9_rnd_fieldtrial', title: 'A customer offers a field trial', icon: 'laptop', good: true, per: 1.5, cd: 20, story: 'A loyal customer offers to try your latest prototype in real life. A field trial shows you problems you would never find in the lab, but a rough product can embarrass you.', choices: [
    S('full', 'Run a full trial', 'Costs time and support, but you learn a lot.', '', { k: 0.02, gamble: { p: 0.7, good: { quality: 2, rep: 1 }, bad: { rep: -1, morale: -1 }, goodText: 'The customer found three real problems and became a fan.', badText: 'The prototype failed in front of them. They were kind, but it stung.' } }),
    S('light', 'A short supervised trial', 'Safer, with a smaller lesson.', 'Your engineer stayed on site and fixed things as they appeared.', { k: 0.008, eff: { quality: 1 } }),
    S('later', 'Wait until it is finished', 'No risk and no feedback.', 'You waited, and the customer understood.')] },
  // 643 Lab accident and safety
  { id: 'e9_rnd_labaccident', title: 'An accident in the lab', icon: 'flame', good: false, per: 1, cd: 30, gate: 'team', story: 'A test went wrong in the lab. Nobody was badly hurt, but equipment was damaged and people are shaken. How you respond will shape how safe everyone feels.', choices: [
    S('stop', 'Stop work and review safety', 'Costs a few days, and shows people you care.', 'You paused everything, fixed the procedures, and people felt safer.', { k: 0.03, eff: { morale: 2, rep: 1 } }),
    S('retrain', 'Retrain the team on the spot', 'A quick fix, with some risk of a repeat.', '', { k: 0.01, gamble: { p: 0.6, good: { morale: 1 }, bad: { morale: -3, rep: -1 }, goodText: 'The refresher worked, and testing carried on safely.', badText: 'It happened again, and the team lost trust in how you run things.' } }),
    S('carryon', 'Carry on as normal', 'Free now, but people notice.', 'Work went on, and people noticed that nothing had changed.', { eff: { morale: -3, rep: -1 } })] },
  // 644 Research-grant applications
  { id: 'e9_rnd_grant', title: 'A research grant is on offer', icon: 'globe', good: true, per: 1.5, cd: 24, story: 'A public body is giving research grants to businesses that develop new technology. The forms are long, and many applications are turned down.', choices: [
    S('full', 'Write a full application', 'Weeks of effort, with a decent chance of success.', '', { k: 0.015, gamble: { p: 0.5, good: { quality: 2, c: E(0.985, 10) }, bad: { morale: -1 }, goodText: 'You won the grant, which paid for a project that lowered your costs.', badText: 'The application was rejected, and the team felt the effort was wasted.' } }),
    S('partner', 'Apply with a university partner', 'Costs more, and judges like partnerships.', '', { k: 0.03, gamble: { p: 0.75, good: { quality: 2, c: E(0.985, 10), rep: 1 }, bad: {}, goodText: 'The joint bid won, and the university\'s name helped.', badText: 'The bid narrowly missed out, but you made a useful contact.' } }),
    S('voucher', 'Take a small innovation voucher', 'A sure but smaller payment, with little paperwork.', 'A small voucher covered some research costs with hardly any forms.', { income: 0.15 })] },
  // 648 Competitor patents that block you
  { id: 'e9_rnd_blocked', title: 'A rival\'s patent blocks your launch', icon: 'key', good: false, per: 1.2, cd: 30, gate: 'rivals', story: 'You have found out that a competitor holds a patent covering the feature you planned to launch. Launching anyway would invite a lawsuit.', choices: [
    S('around', 'Design around it', 'Find a different way to get the same result.', 'Your engineers found another route, and the launch slipped only a little.', { k: 0.04, eff: { d: E(0.99, 3), quality: 1 } }),
    S('licence', 'Ask them for a licence', 'They may say yes, at a price.', '', { k: 0.03, gamble: { p: 0.6, good: { d: E(1.02, 8) }, bad: { c: E(1.02, 6) }, goodText: 'They agreed, and the launch went ahead on time.', badText: 'They agreed, but the fee was steep and the launch slipped.' } }),
    S('challenge', 'Challenge the patent', 'Argue that it should never have been granted.', '', { k: 0.03, gamble: { p: 0.4, good: { d: E(1.03, 8), rep: 1 }, bad: { d: E(0.98, 4), rep: -1 }, goodText: 'The patent was struck down, and your feature went out unchallenged.', badText: 'The challenge failed, and the launch was delayed by months.' } })] },
  // 650 Tooling costs before mass production
  { id: 'e9_rnd_tooling', title: 'The tooling quote arrives', icon: 'gear', good: false, per: 1.2, cd: 30, gate: 'stock', story: 'Before you can make your new product in bulk, you need tooling: the moulds, dies and jigs that shape every part. The quote is higher than you hoped.', choices: [
    S('steel', 'Pay for hardened steel tooling', 'Dear, but it lasts and each part costs less.', 'The steel tooling was expensive and will last for years.', { k: 0.07, eff: { c: E(0.98, 12), quality: 1 } }),
    S('soft', 'Use cheaper soft tooling', 'Cheap now, and it wears out sooner.', '', { k: 0.03, gamble: { p: 0.55, good: { c: E(0.99, 8) }, bad: { quality: -1, c: E(1.02, 6) }, goodText: 'The cheaper tooling held up through the first big run.', badText: 'It wore quickly, and parts began to drift out of shape.' } }),
    S('contract', 'Hire a contract maker', 'No tooling to buy, but you pay more per part.', 'The contract maker handled it, and you paid a higher price for each part.', { k: 0.01, eff: { c: E(1.02, 12) } })] },
];

export const projects: InitiativeDef[] = [
  // 629 University research partnerships
  { id: 'rnd_university', name: 'University research partnership', blurb: 'Team up with a university lab. They bring fresh science and clever graduates, and you bring real-world problems. Results are never guaranteed.', k: 0.8, months: 9, success: 60,
    win: { eff: { q: 0.02, c: 0.995 }, monthly: 0.15, now: { rep: 1 }, text: 'The partnership produced a working method that improves your product and trims costs. A small fee keeps the link alive.' },
    lose: { now: { morale: -1 }, text: 'The research was interesting, but nothing practical came of it. The money is spent.' } },
  // 634 Industrial-design studio engagement
  { id: 'rnd_designstudio', name: 'Hire an industrial-design studio', blurb: 'Pay a specialist studio to make your product look better, feel better and be easier to use and to build.', k: 0.7, months: 5, success: 75,
    win: { eff: { d: 1.015 }, now: { brand: 1.01 }, text: 'The new design turned heads. Customers noticed the difference and your product now stands out.' },
    lose: { now: { morale: -1 }, text: 'The designs were handsome but impractical to make, so you shelved them. The fee is gone.' } },
  // 635 Reverse-engineering a rival's product
  { id: 'rnd_teardown', name: 'Reverse-engineer a rival\'s product', blurb: 'Buy a rival\'s product and take it apart to see how it is made. Fair if you bought it honestly, but copying protected ideas is not.', k: 0.5, months: 4, success: 65,
    win: { eff: { c: 0.992, q: 0.01 }, text: 'You spotted a cheaper way to build a key part, and a few weak points to avoid.' },
    lose: { now: { rep: -1 }, text: 'The teardown showed nothing new, and word got out that you were poking about in a rival\'s product.' } },
  // 636 Technology-scouting trips
  { id: 'rnd_scouting', name: 'Technology-scouting trip', blurb: 'Send people to trade fairs and labs around the world to spot new technology before your rivals do.', k: 0.5, months: 4, success: 55,
    win: { eff: { d: 1.008, c: 0.995 }, now: { quality: 1 }, text: 'Your scouts found a clever supplier and a trick your rivals had not noticed. It will pay for itself.' },
    lose: { text: 'Plenty of air miles and business cards, but nothing that would work for you.' } },
  // 639 Regulatory approval cost for new products
  { id: 'rnd_approval', name: 'Win regulatory approval', blurb: 'Some new products need an official safety or standards approval before you can sell them. It means tests, forms and a long wait, and the answer can be no.', k: 1.2, months: 8, success: 70,
    win: { eff: { d: 1.02 }, monthly: 0.1, now: { rep: 2 }, text: 'Approved. The official stamp opens up customers who would not buy without it. Yearly checks cost a little.' },
    lose: { now: { morale: -1 }, text: 'The regulator asked for changes you could not make in time. The money is spent, and you can try again later.' } },
  // 640 Spin-off of a promising prototype
  { id: 'rnd_spinoff', name: 'Spin off a promising prototype', blurb: 'Turn a side project into its own company. You keep a share of the new firm and your team can focus on the main business. Setting up costs money, and many spin-offs never take off.', k: 1.5, months: 12, success: 50,
    win: { monthly: -0.4, now: { rep: 2, brand: 1.02 }, text: 'The spin-off took off. You own a share, and it now pays you a small income every month.' },
    lose: { now: { morale: -2 }, text: 'The new company ran out of money and closed. The prototype team came back a little bruised.' } },
  // 645 Minimum-viable-product launches
  { id: 'rnd_mvp', name: 'Launch a minimum viable product', blurb: 'An MVP is the simplest version of a product that real customers can use. You launch fast, learn from what they say and improve. Quick and cheap, but a rough first impression can hurt.', k: 0.4, months: 3, success: 65,
    win: { eff: { d: 1.01, q: 0.01 }, now: { quality: 1 }, text: 'Early customers loved the basics, and their feedback shaped a much better next version.' },
    lose: { now: { rep: -1 }, text: 'The first version was too rough. A few early users complained loudly, and you went back to the drawing board.' } },
];
