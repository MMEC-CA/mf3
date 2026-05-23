// ── Store & Gear Catalogs ──────────────────────────────────────────

export const HOURLY_PAY = 20;

export const GEAR_CATALOG = [
  { id: 'glock',     label: 'Glock 17',            short: 'GLK', cat: 'sidearm',     cost: 0, level: 0, desc: 'Standard-issue 9mm service pistol' },
  { id: 'radio',     label: 'Duty Radio',           short: 'RAD', cat: 'comms',       cost: 0, level: 0, desc: 'Encrypted police band radio' },
  { id: 'taser',     label: 'Taser X26',            short: 'TSR', cat: 'less_lethal', cost: 0, level: 0, desc: 'Conductive energy device, 25ft range' },
  { id: 'cuffs',     label: 'Handcuffs',            short: 'CUF', cat: 'restraint',   cost: 0, level: 0, desc: 'Standard steel restraints' },
  { id: 'notebook',  label: 'Patrol Notebook',      short: 'NBK', cat: 'misc',        cost: 0, level: 0, desc: 'Case notes and observations' },
  { id: 'baton',     label: 'Expandable Baton',     short: 'BTN', cat: 'less_lethal', cost: 0, level: 0, desc: 'ASP 21" collapsible baton' },
  { id: 'ar15',      label: 'AR-15 Patrol Rifle',   short: 'AR',  cat: 'rifle',       cost: 0, level: 5, desc: 'Requires Level 5 clearance' },
  { id: 'sniper',    label: 'Remington 700',        short: 'SNP', cat: 'rifle',       cost: 0, level: 8, desc: 'Requires Level 8 clearance' },
  { id: 'shotgun',   label: 'Mossberg 590',         short: 'SHT', cat: 'shotgun',     cost: 0, level: 3, desc: 'Requires Level 3 clearance' },
  { id: 'riot_shield', label: 'Riot Shield',        short: 'SHD', cat: 'defense',     cost: 0, level: 4, desc: 'Requires Level 4 clearance' },
  { id: 'smg',       label: 'MP5 Submachine Gun',   short: 'SMG', cat: 'rifle',       cost: 0, level: 6, desc: 'Requires Level 6 clearance' },
];

export const UNIFORM_CATALOG = [
  { id: 'class_a',   label: 'Class A Longsleeves',  short: 'CLA', cost: 0, level: 0, desc: 'Standard patrol uniform, long sleeve' },
  { id: 'tactical',  label: 'Tactical Vest Rig',    short: 'TAC', cost: 0, level: 4, desc: 'Requires Level 4 clearance' },
  { id: 'riot',      label: 'Full Riot Gear',        short: 'RIO', cost: 0, level: 5, desc: 'Requires Level 5 clearance' },
  { id: 'detective', label: 'Detective Plainclothes',short: 'DET', cost: 0, level: 3, desc: 'Requires Level 3 clearance' },
];

export const STORE_CATALOGS = {
  convenience: [
    { id: 'coffee',    label: 'Black Coffee',        price: 2,  desc: 'Restores focus. +5 stamina' },
    { id: 'energy',    label: 'Energy Drink',        price: 4,  desc: 'Short speed boost' },
    { id: 'snack',     label: 'Granola Bar',         price: 3,  desc: 'Small health restore' },
    { id: 'flashlight',label: 'Flashlight',          price: 12, desc: 'Better visibility at night' },
    { id: 'lighter',   label: 'Disposable Lighter',  price: 1,  desc: 'Just a lighter' },
  ],
  bookstore: [
    { id: 'law_book',  label: 'Penal Code Vol.I',    price: 18, desc: 'Study material. Flavor item' },
    { id: 'map',       label: 'City Street Map',     price: 8,  desc: 'Reveals full district layout' },
    { id: 'journal',   label: 'Leather Journal',     price: 14, desc: 'Upgraded notebook capacity' },
    { id: 'pen',       label: 'Quality Pen',         price: 3,  desc: 'For the notebook' },
  ],
  club: [
    { id: 'drink',     label: 'Club Soda',           price: 5,  desc: 'Non-alcoholic. On duty.' },
    { id: 'info',      label: 'Tip-Off (Rumor)',     price: 20, desc: 'Hear something useful' },
    { id: 'cover',     label: 'Cover Charge',        price: 10, desc: 'Entry. No questions asked.' },
  ],
  bank: [
    { id: 'deposit',   label: 'Deposit $20',         price: 20, desc: 'Save money (cosmetic)' },
    { id: 'statement', label: 'Bank Statement',      price: 0,  desc: 'Review account (free)' },
  ],
  jewelry: [
    { id: 'watch',     label: 'Field Watch',         price: 45, desc: 'Sharp. Tells time.' },
    { id: 'badge_pin', label: 'Badge Lapel Pin',     price: 8,  desc: 'Decorative. Class A.' },
    { id: 'ring',      label: 'Plain Band Ring',     price: 22, desc: 'Personal item' },
  ],
  gas_mart: [
    { id: 'coffee',    label: 'Gas Station Coffee',  price: 1,  desc: "It's fine" },
    { id: 'energy',    label: 'Energy Drink',        price: 3,  desc: 'Short speed boost' },
    { id: 'gum',       label: 'Pack of Gum',         price: 1,  desc: 'Freshens breath' },
    { id: 'motor_oil', label: 'Motor Oil (Qt)',      price: 8,  desc: 'For your patrol car' },
  ],
  pharmacy: [
    { id: 'medkit',    label: 'First Aid Kit',       price: 18, desc: 'Restores health' },
    { id: 'bandage',   label: 'Bandage Roll',        price: 5,  desc: 'Minor wound treatment' },
    { id: 'aspirin',   label: 'Aspirin',             price: 4,  desc: 'Reduces headache debuffs' },
    { id: 'sunscreen', label: 'SPF50 Sunscreen',     price: 7,  desc: 'Long shifts outside' },
  ],
  cafe: [
    { id: 'espresso',  label: 'Double Espresso',     price: 4,  desc: '+Focus for 10 min' },
    { id: 'latte',     label: 'Oat Milk Latte',      price: 5,  desc: 'Comfort item' },
    { id: 'pastry',    label: 'Croissant',           price: 3,  desc: 'Small energy restore' },
    { id: 'filter',    label: 'Filter Coffee',       price: 2,  desc: 'Basic. Gets the job done.' },
  ],
  pawn: [
    { id: 'old_radio',  label: 'Old Walkie-Talkie',  price: 15, desc: 'Backup comms. Low range.' },
    { id: 'knife',      label: 'Pocket Knife',       price: 12, desc: 'Utility tool' },
    { id: 'binoculars', label: 'Binoculars',         price: 28, desc: 'Extended vision range' },
    { id: 'lockpick',   label: 'Lock Pick Set',      price: 35, desc: 'Opens locked doors (later)' },
  ],
  electronics: [
    { id: 'bodycam',  label: 'Body Camera',          price: 55, desc: 'Records encounters' },
    { id: 'dash_cam', label: 'Dash Cam',             price: 40, desc: 'For the patrol car' },
    { id: 'earpiece', label: 'Covert Earpiece',      price: 25, desc: 'Discreet radio comms' },
    { id: 'torch',    label: 'Tactical Torch',        price: 30, desc: 'High-lumen flashlight' },
  ],
  laundry: [
    { id: 'wash',     label: 'Dry Clean Uniform',    price: 8,  desc: 'Restore uniform condition' },
    { id: 'press',    label: 'Press & Starch',       price: 12, desc: 'Parade-ready condition' },
  ],
  house: [],
  generic: [],
};

export const STORE_ROLES = [
  { role: 'convenience', label: 'Block 7 Mart',       interiorId: 'int_convenience', facadeTag: '24HR', lot: false },
  { role: 'bookstore',   label: 'Dog-Eared Books',    interiorId: 'int_bookstore',   facadeTag: 'BOOK', lot: false },
  { role: 'club',        label: 'The Velvet Room',    interiorId: 'int_club',        facadeTag: 'CLUB', lot: false },
  { role: 'bank',        label: 'Citizens Trust',     interiorId: 'int_bank',        facadeTag: 'BANK', lot: false },
  { role: 'jewelry',     label: 'Luminous Gold Co.',  interiorId: 'int_jewelry',     facadeTag: 'GOLD', lot: false },
  { role: 'gas',         label: 'Torque Fuels',       interiorId: 'int_gas_mart',    facadeTag: 'FUEL', lot: true },
  { role: 'pharmacy',    label: 'MedCap Pharmacy',    interiorId: 'int_pharmacy',    facadeTag: 'RX',   lot: false },
  { role: 'cafe',        label: 'Rust Bean Café',     interiorId: 'int_cafe',        facadeTag: 'CAFE', lot: false },
  { role: 'pawn',        label: "Uncle Joe's Pawn",   interiorId: 'int_pawn',        facadeTag: '$$$',  lot: false },
  { role: 'electronics', label: 'Circuit Breaker',    interiorId: 'int_electronics', facadeTag: 'TECH', lot: false },
  { role: 'laundry',     label: 'Spin Cycle Laundry', interiorId: 'int_laundry',     facadeTag: 'WASH', lot: false },
];
