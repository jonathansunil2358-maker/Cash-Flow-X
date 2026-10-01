import type { UpgradeDef } from '@cfx/engine';

/** Short names for upgrade tags on the island, where the full name ("Second kitchen line") won't fit. */
const SHORT: Record<string, string> = {
  cloud: 'Cloud', crm: 'Sales CRM', devtools: 'Dev tools', success: 'Success hub', marketplace: 'App store',
  cutting: 'Cutting room', webshop: 'Webshop', studio: 'Design studio', supplier: 'Bulk supplier', warehouse: 'Warehouse',
  kitchen: 'Kitchen line', delivery: 'Delivery', chefs: "Chef's table", fridge: 'Walk-in fridge', truck: 'Food truck',
  equipment: 'Equipment', classes: 'Class studio', app: 'Booking app', referral: 'Referrals', pool: 'Pool',
  robots: 'Robots', channels: 'Marketplaces', recs: 'Recs engine', freight: 'Freight', ads: 'Ads',
  bay: 'Workshop bay', battery: 'Batteries', lab: 'Eng. lab', dealers: 'Dealers', showroom: 'Showroom',
};

export const shortUpgradeName = (def: Pick<UpgradeDef, 'id' | 'name'>): string => SHORT[def.id] ?? def.name;
