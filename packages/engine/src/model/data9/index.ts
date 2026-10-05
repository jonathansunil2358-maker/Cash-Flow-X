import * as t_bakery from './bakery';
import * as t_farm from './farm';
import * as t_hotel from './hotel';
import * as t_brewery from './brewery';
import * as t_gamestudio from './gamestudio';
import * as t_haulage from './haulage';
import * as t_pharmacy from './pharmacy';
import * as t_construction from './construction';
import * as t_toymaker from './toymaker';
import * as t_space from './space';
import * as t_automotive from './automotive';
import * as t_ecommerce from './ecommerce';
import * as t_fitness from './fitness';
import * as t_restaurant from './restaurant';
import * as t_clothing from './clothing';
import * as t_software from './software';
import * as t_tools from './tools';
import * as t_exit from './exit';
import * as t_governance from './governance';
import * as t_service from './service';
import * as t_it from './it';
import * as t_sustainability from './sustainability';
import * as t_expansion from './expansion';
import * as t_export from './export';
import * as t_macro from './macro';
import * as t_rivals from './rivals';
import * as t_legal from './legal';
import * as t_insurance from './insurance';
import * as t_quality from './quality';
import * as t_hr from './hr';
import * as t_rnd from './rnd';
import * as t_marketing from './marketing';
import * as t_pricing from './pricing';
import * as t_supply from './supply';
import * as t_property from './property';
import * as t_mna from './mna';
import * as t_equity from './equity';
import * as t_lending from './lending';
import * as t_tax from './tax';
import * as t_accounting from './accounting';
/** Every business topic, in the order they appear in the Management section. */
export interface Topic { id: string; name: string; blurb: string; /** A sector topic: its items only exist for that industry. */ sector?: boolean }
export const TOPICS: Topic[] = [
  { id: 'accounting', name: 'Accounting and statements', blurb: 'Closing the books, reports and audits.' },
  { id: 'tax', name: 'Tax', blurb: 'Returns, reliefs and planning.' },
  { id: 'lending', name: 'Lending and credit', blurb: 'Loans, facilities and how banks see you.' },
  { id: 'equity', name: 'Equity and investors', blurb: 'Shareholders, terms and share plans.' },
  { id: 'mna', name: 'Deals and acquisitions', blurb: 'Extra mergers and acquisitions tactics.' },
  { id: 'property', name: 'Property', blurb: 'Premises, leases and buildings.' },
  { id: 'supply', name: 'Supply chain', blurb: 'Suppliers, stock and transport.' },
  { id: 'pricing', name: 'Pricing', blurb: 'How you set and change prices.' },
  { id: 'marketing', name: 'Marketing', blurb: 'Campaigns, channels and measurement.' },
  { id: 'rnd', name: 'Research and development', blurb: 'Product development and intellectual property.' },
  { id: 'hr', name: 'People and HR', blurb: 'Pay, hiring, structure and policies.' },
  { id: 'quality', name: 'Quality and operations', blurb: 'Processes, improvement and reliability.' },
  { id: 'insurance', name: 'Insurance and risk', blurb: 'Cover, controls and continuity.' },
  { id: 'legal', name: 'Legal and compliance', blurb: 'Contracts, rules and disputes.' },
  { id: 'rivals', name: 'Rivals and competition', blurb: 'Watching, fighting and working with competitors.' },
  { id: 'macro', name: 'The wider economy', blurb: 'Rates, inflation, currencies and the cycle.' },
  { id: 'export', name: 'International and export', blurb: 'Selling and operating abroad.' },
  { id: 'expansion', name: 'Expansion and franchising', blurb: 'New sites, franchises and roll-outs.' },
  { id: 'sustainability', name: 'Sustainability', blurb: 'Carbon, waste, sourcing and reporting.' },
  { id: 'it', name: 'Automation and IT', blurb: 'Systems, security and tools.' },
  { id: 'service', name: 'Customer service', blurb: 'Support, satisfaction and retention.' },
  { id: 'governance', name: 'Governance and board', blurb: 'Boards, committees and codes.' },
  { id: 'exit', name: 'Exit, IPO and succession', blurb: 'Selling up, listing and handing over.' },
  { id: 'tools', name: 'Management tools and reports', blurb: 'Dashboards, forecasts and tracking.' },
  { id: 'software', name: 'Software (SaaS)', blurb: 'Mechanics for software companies.', sector: true },
  { id: 'clothing', name: 'Clothing brand', blurb: 'Mechanics for clothing brands.', sector: true },
  { id: 'restaurant', name: 'Restaurant', blurb: 'Mechanics for restaurants.', sector: true },
  { id: 'fitness', name: 'Fitness club', blurb: 'Mechanics for fitness clubs.', sector: true },
  { id: 'ecommerce', name: 'E-commerce store', blurb: 'Mechanics for online shops.', sector: true },
  { id: 'automotive', name: 'Automotive (EV conversions)', blurb: 'Mechanics for EV conversion firms.', sector: true },
  { id: 'bakery', name: 'Bakery chain', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'farm', name: 'Farm and farm shop', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'hotel', name: 'Hotel', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'brewery', name: 'Craft brewery', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'gamestudio', name: 'Game studio', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'haulage', name: 'Haulage and logistics', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'pharmacy', name: 'Pharmacy', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'construction', name: 'Construction firm', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'toymaker', name: 'Toy maker', blurb: 'Mechanics for this sector.', sector: true },
  { id: 'space', name: 'Space launch startup', blurb: 'Mechanics for this sector.', sector: true },
];

const MODS = [t_accounting, t_tax, t_lending, t_equity, t_mna, t_property, t_supply, t_pricing, t_marketing, t_rnd, t_hr, t_quality, t_insurance, t_legal, t_rivals, t_macro, t_export, t_expansion, t_sustainability, t_it, t_service, t_governance, t_exit, t_tools, t_software, t_clothing, t_restaurant, t_fitness, t_ecommerce, t_automotive, t_bakery, t_farm, t_hotel, t_brewery, t_gamestudio, t_haulage, t_pharmacy, t_construction, t_toymaker, t_space];
export const POLICIES9 = MODS.flatMap((m, i) => m.policies.map((p) => ({ ...p, topic: p.topic ?? TOPICS[i].id, sector: TOPICS[i].sector ? TOPICS[i].id : p.sector })));
export const EVENTS9 = MODS.flatMap((m, i) => m.events.map((e) => ({ ...e, topic: e.topic ?? TOPICS[i].id, sector: TOPICS[i].sector ? TOPICS[i].id : e.sector })));
export const PROJECTS9 = MODS.flatMap((m, i) => m.projects.map((p) => ({ ...p, topic: p.topic ?? TOPICS[i].id, sector: TOPICS[i].sector ? TOPICS[i].id : p.sector })));
