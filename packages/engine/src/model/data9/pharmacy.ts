import type { EvSpec, PolicyDef, InitiativeDef } from '../data8';
import { off, opt, S, E } from '../dataKit';

/** Sector topic: Pharmacy. Everything here is only available to that sector. Every id must start with "pharmacy_" (policies and initiatives) or "e9_pharmacy_" (events). */
export const policies: PolicyDef[] = [
  { id: 'pharmacy_otc_range', group: 'customers', name: 'Over-the-counter and wellness range', blurb: 'Over-the-counter (OTC) medicines are the ones anyone can buy without a prescription. Their mark-up is much fatter than dispensing, but they sit on shelves and need floor space.', options: [
    off,
    opt('Stock the essentials', 'Painkillers, cold remedies and plasters. Steady extra sales with little risk.', { d: 1.01, c: 1.002 }, 0.2),
    opt('Add cosmetics and wellness', 'Skincare, vitamins and gift sets. Bigger margins and a nicer shop, but slow sellers tie up cash and go out of date.', { d: 1.02, c: 1.006, rep: 0.01 }, 0.7, 0.3)] },

  { id: 'pharmacy_generics', group: 'ops', name: 'Generic versus branded stock', blurb: 'A generic is a copy of a branded medicine with the same active ingredient, usually far cheaper. Swapping brands for generics saves money, but some patients distrust the plain box.', options: [
    off,
    opt('Generic where allowed', 'Dispense the cheaper generic whenever the prescription permits. Real savings on every item.', { c: 0.985, rep: -0.01 }, 0.1),
    opt('Generic first, always explain', 'Push generics hard and spend time explaining them at the counter. Biggest savings, but queues grow and some patients ask for the brand elsewhere.', { c: 0.97, d: 0.99, cap: 0.99 }, 0.2)] },

  { id: 'pharmacy_hours', group: 'ops', name: 'Opening-hours policy', blurb: 'Longer opening hours catch commuters and late-night emergencies, but a pharmacist must be on duty for every hour you are open, and that is expensive.', options: [
    off,
    opt('Late close and Saturdays', 'Open until 8pm and all day Saturday. More walk-in trade, and more wages for the extra hours.', { d: 1.02, m: -0.1 }, 0.9),
    opt('Open late, every day', 'Open seven days until 10pm. Captures the emergency trade nobody else serves, but staff tire and the extra pharmacist cover is a heavy cost.', { d: 1.035, m: -0.35, ch: 1.0, q: -0.02 }, 2)] },

  { id: 'pharmacy_loyalty', group: 'customers', name: 'Loyalty card with health tips', blurb: 'A loyalty card gives points on purchases. Pairing it with free health tips (blood pressure, quitting smoking, seasonal advice) keeps people coming back to you instead of the supermarket.', options: [
    off,
    opt('Points on shop items', 'Points on OTC and beauty only; dispensing is excluded. Cheap and small.', { d: 1.01 }, 0.4),
    opt('Points plus health tips', 'Points on everything, with a monthly health tip card and text reminders. Loyal customers, but you give away margin and pay for the system.', { d: 1.025, rep: 0.02, c: 1.004 }, 1.1, 0.2)] },

  { id: 'pharmacy_training', group: 'people', name: 'Staff training courses', blurb: 'Dispensing staff need regular courses in safeguarding, medicines advice and customer care. Courses cost money and take people away from the counter, but make the whole team more accurate and confident.', options: [
    off,
    opt('Annual refresher day', 'One mandatory training day a year. Keeps you compliant and a little sharper.', { q: 0.02, m: 0.1 }, 0.4),
    opt('Accredited courses for all', 'Staff work towards formal qualifications. Better advice, happier team and easier hiring, but a real bill and days of short staffing.', { q: 0.04, m: 0.3, hire: 0.9, cap: 0.98 }, 1, 0.2)] },

  { id: 'pharmacy_cold_chain', group: 'ops', name: 'Cold-storage compliance', blurb: 'Vaccines, insulin and some eye drops must be kept between 2 and 8 degrees Celsius. If the fridge strays outside that range, the stock is ruined and you may have to report it.', stock: true, options: [
    off,
    opt('Daily temperature log', 'Staff write down fridge readings twice a day. Cheap and compliant, but it will not warn you at 3am.', { c: 0.995 }, 0.1),
    opt('Alarmed remote sensors', 'Sensors text the manager if the fridge drifts. Very little stock lost and inspectors love it, but the monitoring service is a monthly cost.', { c: 0.985, rep: 0.02 }, 0.35, 0.2)] },

  { id: 'pharmacy_double_check', group: 'ops', name: 'Prescription checking routine', blurb: 'Every prescription must be checked before it goes out. A dispensing error, such as the wrong drug or dose, can seriously hurt a patient and lead to legal claims.', options: [
    off,
    opt('Independent second check', 'A second person checks every bag. Slows the counter a little but catches most slips.', { q: 0.03, cap: 0.98, risk: [1, 4, 'A dispensing error slipped through and you paid compensation.'] }, 0.4),
    opt('Barcode scanning plus check', 'Scan every box against the prescription, then a human check. Almost error free, but the scanners and software cost money and add seconds to each item.', { q: 0.05, cap: 0.97, rep: 0.02 }, 0.9, 0.3)] },

  { id: 'pharmacy_locums', group: 'people', name: 'Pharmacist cover and locums', blurb: 'A locum is a temporary pharmacist hired by the day. The shop cannot dispense unless a pharmacist is present, so you either keep a full-time one or pay locum day rates when someone is away.', options: [
    off,
    opt('Rely on one regular locum', 'A trusted locum covers holidays and sickness. Costs more per day than an employee, but you pay only when needed.', { cap: 1.01, m: -0.1 }, 0.6),
    opt('Hire a second pharmacist', 'Two permanent pharmacists mean no closed days and better advice, but a salary you pay all year even in quiet months.', { cap: 1.03, q: 0.03, hire: 1.1 }, 1.5, 0.2)] },

  { id: 'pharmacy_wholesaler', group: 'finance', name: 'Wholesaler credit terms', blurb: 'Wholesalers sell you medicines and give you weeks to pay. Using one main supplier earns better prices and longer credit, but if they run short or tighten terms, you are stuck.', stock: true, options: [
    off,
    opt('One main wholesaler', 'Order everything from one firm. Better discounts and more credit, but a supply problem hits every shelf.', { c: 0.98, risk: [5, 3, 'Your wholesaler ran short of key medicines and you had to buy at a premium elsewhere.'] }, 0.1),
    opt('Two wholesalers', 'Split orders between two. Smaller discounts, but one is always there to cover a gap.', { c: 0.992 }, 0.25)] },

  { id: 'pharmacy_delivery', group: 'customers', name: 'Home-delivery service', blurb: 'Deliver medicines to patients who cannot easily get to the shop: the elderly, the housebound, busy parents. It wins loyal patients but needs vans, drivers and careful handling of private information.', options: [
    off,
    opt('Volunteer-driver rounds', 'Staff and volunteers deliver locally in their own cars. Cheap and friendly, but patchy.', { d: 1.01, rep: 0.01 }, 0.3),
    opt('Branded delivery van', 'A van, a paid driver and a signed-for system. Dependable and popular, but the van, fuel and insurance are a steady cost, and a missed delivery means a worried patient.', { d: 1.03, rep: 0.02, risk: [3, 2, 'A parcel went to the wrong address, raising a privacy complaint.'] }, 1.3, 0.4)] },

  { id: 'pharmacy_med_review', group: 'customers', name: 'Medication-review service', blurb: 'A medication review is a private chat where a pharmacist checks all the medicines a patient takes, so none clash and none are wasted. It earns a fee and builds trust, but takes the pharmacist away from the dispensing bench.', options: [
    off,
    opt('Reviews by appointment', 'Offer a few appointment slots a week. Small fee income and grateful patients.', { q: 0.02, d: 1.008, cap: 0.99 }, 0.4),
    opt('Review for every long-term patient', 'Systematically review everyone on regular medicines. Strong loyalty, but it eats pharmacist time and queues at the counter grow.', { q: 0.04, d: 1.02, rep: 0.02, cap: 0.96 }, 0.9, 0.2)] },

  { id: 'pharmacy_cd_audit', group: 'ops', name: 'Controlled-drugs safe and audits', blurb: 'Controlled drugs are strong medicines such as morphine that criminals want and the law tightly tracks. You must lock them in a safe and keep exact records that can be checked at any time.', options: [
    off,
    opt('Monthly stock count', 'Count the safe each month and log every movement. Meets the minimum, with some risk of missed errors.', { risk: [2, 3, 'A controlled-drugs discrepancy was found and reported, costing time and money.'] }, 0.1),
    opt('Weekly counts, two-key safe', 'Weekly checks and a safe needing two people. Auditors are happy and theft is nearly impossible, but it is slow and fiddly.', { rep: 0.02, cap: 0.99 }, 0.35, 0.15)] },
];

export const events: EvSpec[] = [
  { id: 'e9_pharmacy_flu_season', title: 'Flu season surge', icon: 'heart', good: true, per: 1.5, cd: 12, story: 'Flu is sweeping the town and your queue is out of the door. Flu jabs, tissues and cough syrup are flying off the shelves. Demand is high, but so is the risk of running out or of staff burning out.', choices: [
    S('stock', 'Stock up and extend hours', 'Costs money now, wins the rush.', '', { k: 0.04, gamble: { p: 0.7, good: { d: E(1.06, 3), rep: 2 }, bad: { morale: -3, d: E(1.02, 2) }, goodText: 'You had stock when others ran dry, and the queue became new regulars.', badText: 'The rush wore your team out and half the stock ended up unsold.' } }),
    S('jab', 'Run flu-jab clinics', 'A fee per jab, but needs trained staff.', 'Walk-in flu jabs filled your afternoons and brought paid appointments in.', { income: 0.1, eff: { morale: -1, rep: 1 } }),
    S('normal', 'Carry on as usual', 'No cost, but you miss the surge.', 'You served who you could and the busy trade went elsewhere.', { eff: { d: E(0.99, 2) } })] },

  { id: 'e9_pharmacy_inspection', title: 'Regulator inspection', icon: 'shield', good: false, per: 1, cd: 24, story: 'An inspector from the pharmacy regulator has turned up unannounced. They want to see your records, your safe, your fridge log and your cleaning rota. Anything missing becomes a formal notice.', choices: [
    S('open', 'Open every book', 'Honest and thorough, if a little costly.', 'The inspector found small gaps, you fixed them on the spot, and they left a good note.', { k: 0.02, eff: { rep: 1 } }),
    S('rush', 'Rush to tidy paperwork', 'Cheap, and a gamble on what they spot.', '', { gamble: { p: 0.5, good: {}, bad: { rep: -3, d: E(0.97, 3) }, goodText: 'The inspector missed nothing important, and you got away with it.', badText: 'The inspector found missing records and issued a public improvement notice.' } }),
    S('consultant', 'Hire a compliance consultant', 'A big bill for a proper clean-up.', 'The consultant rebuilt your record-keeping, and next inspections should be painless.', { k: 0.05, eff: { quality: 1, morale: -1 } })] },

  { id: 'e9_pharmacy_shortage', title: 'Medicine shortage', icon: 'parcel', good: false, per: 1.5, cd: 14, story: 'A factory problem abroad has left a popular medicine in short supply. Patients are anxious, your wholesaler is rationing, and grey-market sellers are offering stock at double the price.', choices: [
    S('grey', 'Buy from the grey market', 'Keeps patients happy, but at a steep price.', '', { k: 0.04, gamble: { p: 0.65, good: { rep: 2 }, bad: { rep: -3, c: E(1.03, 3) }, goodText: 'Patients were relieved to find their medicine on your shelf.', badText: 'The stock turned out to be unreliable and you had to pull it from sale.' } }),
    S('alt', 'Work out alternatives with the GP', 'Slow, but safe and cheap.', 'You phoned surgeries and agreed safe substitutes, which patients appreciated.', { eff: { c: E(1.01, 2), morale: -1, rep: 1 } }),
    S('wait', 'Tell patients to wait', 'Free, but patients go elsewhere.', 'Some patients walked to the supermarket pharmacy and did not come back.', { eff: { d: E(0.97, 3), rep: -1 } })] },

  { id: 'e9_pharmacy_price_cap', title: 'Health system cuts reimbursements', icon: 'chart', good: false, per: 1, cd: 30, story: 'The health system has cut the price it will refund you for common medicines. Your fee per prescription stays, but the refund on the drug itself falls, squeezing your margin on every item you dispense.', choices: [
    S('absorb', 'Absorb the cut', 'No customer impact, lower margin for months.', 'You took the hit and kept patients happy, but every item earned less.', { eff: { c: E(1.04, 8) } }),
    S('range', 'Push shop and services sales', 'Costs effort, rebuilds margin.', '', { k: 0.02, gamble: { p: 0.6, good: { c: E(1.01, 6) }, bad: { c: E(1.03, 6), morale: -2 }, goodText: 'Extra shop sales and paid services softened the blow.', badText: 'Customers ignored the new push and the cut bit hard.' } }),
    S('lobby', 'Join the pharmacy lobbying group', 'A small fee to be heard.', 'Your trade body won a partial reversal, and you shared in the saving.', { k: 0.01, eff: { c: E(1.015, 6) } })] },

  { id: 'e9_pharmacy_supermarket', title: 'Supermarket pharmacy opens nearby', icon: 'car', good: false, per: 1, cd: 30, gate: 'rivals', story: 'A big supermarket has opened a pharmacy counter with free parking and long opening hours. They sell cheaply and treat prescriptions as a way to get people through the door.', choices: [
    S('service', 'Compete on service', 'Know your patients by name. Costs wages.', '', { k: 0.03, gamble: { p: 0.6, good: { rep: 2, d: E(1.01, 4) }, bad: { d: E(0.96, 4) }, goodText: 'Regulars loved the personal touch and stayed loyal.', badText: 'Price-hunters drifted to the supermarket anyway.' } }),
    S('price', 'Match prices on OTC', 'Margin hurts, but trade stays.', 'You matched the supermarket on shelf prices and kept the crowd but at thinner margins.', { eff: { d: E(0.99, 6), c: E(1.01, 6) } }),
    S('ignore', 'Ignore them', 'Cost nothing, risk losing trade.', 'Some patients drifted away over the following months.', { eff: { d: E(0.96, 6) } })] },

  { id: 'e9_pharmacy_dispensing_error', title: 'Dispensing error reported', icon: 'bolt', good: false, per: 1, cd: 24, story: 'A patient was given the wrong strength of a medicine. They are unwell but recovering. A report has been filed, and the family has a solicitor on the phone. How you react matters as much as the mistake.', choices: [
    S('apologise', 'Apologise and pay compensation', 'Costly but honest.', 'You apologised in person, paid compensation and rewrote your checking routine.', { k: 0.05, eff: { rep: -1, quality: 1 } }),
    S('defend', 'Defend your record', 'Cheap now, painful if you lose.', '', { gamble: { p: 0.4, good: {}, bad: { rep: -4, d: E(0.94, 4), morale: -2 }, goodText: 'Your records proved you followed procedure.', badText: 'The case went public and trust collapsed across the town.' } }),
    S('insure', 'Pass it to your insurer', 'Cheap, but your premium rises.', 'The insurer settled and quietly raised your premiums.', { k: 0.015, eff: { c: E(1.01, 8), rep: -1 } })] },

  { id: 'e9_pharmacy_fridge_failure', title: 'Fridge failure overnight', icon: 'flame', good: false, per: 1, cd: 18, gate: 'stock', story: 'The medicines fridge broke down over the weekend. When you opened on Monday, the vaccines and insulin were warm. Nobody can say for sure whether they are still safe, so they must be thrown away.', choices: [
    S('bin', 'Bin the lot and replace it', 'Expensive, but safe.', 'You wrote off the stock, replaced the fridge and told your insurer.', { k: 0.06, eff: { quality: 1 } }),
    S('check', 'Ask the manufacturers for advice', 'Saves some stock, delays the shop.', '', { k: 0.03, gamble: { p: 0.55, good: { c: E(0.99, 2) }, bad: { rep: -2, d: E(0.97, 2) }, goodText: 'Manufacturers confirmed most vials were fine to use.', badText: 'A patient received compromised stock and complained.' } }),
    S('keep', 'Sell it anyway', 'Free, and a serious gamble.', '', { gamble: { p: 0.25, good: {}, bad: { rep: -4, d: E(0.92, 5), morale: -3 }, goodText: 'Nobody noticed, though it was a close call.', badText: 'A patient fell ill and you made the local news.' } })] },

  { id: 'e9_pharmacy_hay_fever', title: 'Hay fever peak', icon: 'leaf', good: true, per: 1.5, cd: 12, story: 'The pollen count has shot up and everyone in town is sneezing. Antihistamines, eye drops and nasal sprays are selling fast, but suppliers are being overwhelmed and many products are the same everywhere.', choices: [
    S('display', 'Build a big allergy display', 'Costs shelf space and stock.', '', { k: 0.025, gamble: { p: 0.7, good: { d: E(1.04, 2), rep: 1 }, bad: { c: E(1.01, 2) }, goodText: 'The display drew crowds and basket sizes grew.', badText: 'A cool week killed the pollen and you were left with boxes.' } }),
    S('advice', 'Offer free allergy advice', 'Builds trust, needs pharmacist time.', 'Short chats at the counter earned loyalty, though the queue grew.', { eff: { rep: 1, d: E(1.015, 2), morale: -1 } }),
    S('skip', 'Do nothing special', 'No change.', 'You sold some tablets and carried on as usual.')] },

  { id: 'e9_pharmacy_pharmacist_sick', title: 'Your pharmacist is ill', icon: 'gear', good: false, per: 1, cd: 14, story: 'Your only pharmacist has gone down with a bad bug. By law you cannot dispense without a pharmacist on site, and locum agencies are quoting double day rates because they are all booked.', choices: [
    S('locum', 'Book an expensive locum', 'Costs a lot, keeps the doors open.', 'The locum was good and nobody missed a prescription.', { k: 0.04, eff: { morale: 1 } }),
    S('close', 'Close for a few days', 'No cost, but lost trade.', 'You put a sign on the door and sent patients elsewhere.', { eff: { d: E(0.96, 2), rep: -1 } }),
    S('founder', 'Work double shifts yourself', 'Free, but exhausting.', '', { gamble: { p: 0.55, good: {}, bad: { morale: -4, quality: -1 }, goodText: 'You kept the shop open and the staff admired the effort.', badText: 'Exhaustion caused errors and morale fell.' } })] },

  { id: 'e9_pharmacy_care_home', title: 'Care-home contract offer', icon: 'key', good: true, per: 1, cd: 20, story: 'A local care home group wants one pharmacy to supply all residents with weekly, pre-packed medicines. It is steady volume but they pay slowly and expect perfect accuracy.', choices: [
    S('take', 'Sign the full contract', 'Big, steady volume, heavy duty.', '', { income: 0.2, gamble: { p: 0.6, good: { d: E(1.04, 6), rep: 1 }, bad: { morale: -3, rep: -2 }, goodText: 'Pre-packed rounds ran smoothly and the volume held.', badText: 'A packing error and slow payments made it a burden.' } }),
    S('half', 'Take one home only', 'Smaller income, lower risk.', 'One care home gave steady volume without overwhelming the team.', { income: 0.08, eff: { rep: 1 } }),
    S('decline', 'Decline', 'Keep to the counter.', 'You said thanks but no and focused on walk-in patients.')] },
];

export const projects: InitiativeDef[] = [
  { id: 'pharmacy_health_clinic', name: 'Health-check clinic room', k: 1.4, months: 6, success: 65, stock: false,
    blurb: 'Turn a back room into a private clinic offering blood-pressure, cholesterol and diabetes checks. These earn fees outside the thin dispensing margin, but need equipment and trained staff.',
    win: { eff: { d: 1.02, q: 0.02 }, monthly: 0.3, now: { rep: 1 }, text: 'The clinic is booked solid and patients now see you as a health centre, not just a shop.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Few people booked and the equipment sat idle.' } },

  { id: 'pharmacy_online', name: 'Online repeat-prescription service', k: 1.0, months: 5, success: 60,
    blurb: 'Patients order repeat prescriptions on a website or app and get them delivered. Convenient and scalable, but you compete with big online players and handle private data.',
    win: { eff: { d: 1.03, ch: 0.98 }, monthly: 0.2, now: { brand: 1.02 }, text: 'Patients love ordering from their phones and orders come in around the clock.' },
    lose: { now: { rep: -1, brand: 0.99 }, text: 'The site was clunky, orders went astray and you shut it down.' } },

  { id: 'pharmacy_surgery_partnership', name: 'Partnership with the local surgery', k: 0.7, months: 4, success: 70,
    blurb: 'The GP surgery next door sends its patients to you and you deliver minor-illness advice, so doctors have more time for serious cases. Friendly neighbours bring steady patients.',
    win: { eff: { d: 1.03, ch: 0.98 }, now: { rep: 1 }, text: 'The surgery now points patients your way and shared referrals are routine.' },
    lose: { now: { morale: -1 }, text: 'The surgery chose another pharmacy and the partnership never started.' } },

  { id: 'pharmacy_vaccination_programme', name: 'Travel and seasonal vaccination programme', k: 1.1, months: 5, success: 65, stock: true,
    blurb: 'Offer private travel jabs and seasonal vaccines. Each jab earns a good fee, but vaccines are costly, need a cold chain, and unused doses must be thrown away.',
    win: { eff: { d: 1.015 }, monthly: 0.35, now: { brand: 1.01 }, text: 'Holidaymakers and families booked jabs from your door, and the fridge turned over quickly.' },
    lose: { now: { rep: -1, morale: -1 }, text: 'Bookings were thin and a box of vaccines expired unused.' } },

  { id: 'pharmacy_staff_academy', name: 'In-house dispensing academy', k: 0.5, months: 4, success: 75,
    blurb: 'Train your own dispensing technicians instead of paying agency fees. It takes time, but home-grown staff are loyal and know your routines.',
    win: { eff: { cap: 1.03, hire: 0.9, q: 0.02 }, now: { morale: 2 }, text: 'Your first trainees qualified and stayed, and hiring got easier.' },
    lose: { now: { morale: -2 }, text: 'Trainees left for bigger chains once qualified.' } },
];
