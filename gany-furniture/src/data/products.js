const A = 'https://audocph.com/cdn/shop';
const US = 'https://us.audocph.com/cdn/shop';

// [id, name, type, price, image, badge?, compareAt?]
const seating = [
  [
    'elegant-sofa',
    'Radiohus Elegant Sofa',
    'Sofas',
    64999,
    `${US}/products/MENU_Radiohus_Sofa_Plinth_Grand_Oda_Lounge_Chair.jpg?v=1665693917`,
    'Bestseller',
  ],
  ['cozy-armchair', 'Cozy Armchair', 'Lounge Chairs', 24999, `${US}/files/Untitleddesign_3.png?v=1723673508`],
  [
    'modern-recliner',
    'Modern Recliner',
    'Sofas',
    89999,
    `${US}/files/Audo_Eave_Seamline_Modular_Sofa_Androgyne_Side_Table_3.jpg?v=1725470448`,
    'New',
  ],
  [
    'luxe-loveseat',
    'Luxe Bouclé Loveseat',
    'Sofas',
    54999,
    `${A}/files/Audo_Eave_Modular_Sofa_86_Boucle_07_configuration_7.jpg?v=1702299113`,
    'Bestseller',
  ],
  [
    'camelback-sofa',
    'Camelback Sofa',
    'Sofas',
    72999,
    `${A}/products/MenuMay2021-Day20998_2ab5595c-1e6a-4d5a-8032-b55b93e6d902.jpg?v=1660653105`,
  ],
  [
    'futon-sofa',
    'Vilhelm Futon Sofa',
    'Sofas',
    49999,
    `${A}/products/MENU_Vilhelm_Sofa_Jager_Lounge_Table_Gravel_Rug_Wing_Floor_Lamp_Releve_Platter.jpg?v=1676561435`,
    'Sale',
    61999,
  ],
  [
    'stylish-lounger',
    'Tired Man Lounger',
    'Lounge Chairs',
    38999,
    `${A}/products/MENU_The_Tired_Man_Rond_Bowl_Converge_Book_Ends.jpg?v=1725265366`,
    'Bestseller',
  ],
  [
    'tranquil-throne',
    'Tranquil Throne',
    'Lounge Chairs',
    42999,
    `${A}/products/MENU_The_Seal_Lounge_Chair_Low_Back_Pagode_Sofa_2.jpg?v=1664976840`,
  ],
  ['royal-rest', 'Royal Rest Sofa', 'Sofas', 79999, `${A}/products/byLassen_IngeborgSofa_KlampenborgLamp_300.jpg?v=1676038301`],
  [
    'cloud-cushion',
    'Cloud Cushion Banquette',
    'Dining Chairs',
    58999,
    `${A}/files/Audo_Eave_Dining_Banquette_Harbour_Column_Dining_Table_Tubulaire_Pendant_Large_Afteroom_Dining_Chair_34_e0dc73d8-90c4-4e6c-b7d0-dc0355bfd388.jpg?v=1708955975`,
    'New',
  ],
  [
    'tearoom-high-back',
    'Tearoom High-Back Chair',
    'Lounge Chairs',
    32999,
    `${A}/products/MENU_Tearoom_Lounge_Chair_High_Back_00.jpg?v=1692882925`,
  ],
  [
    'penguin-chair',
    'Penguin Dining Chair',
    'Dining Chairs',
    12999,
    `${A}/files/Audo_Sentiment_Paper_Weight_Penguin_Dining_Chair_Androgyne_Dining_Table_11.jpg?v=1691146826`,
  ],
  [
    'elizabeth-chair',
    'Elizabeth Chair & Ottoman',
    'Lounge Chairs',
    46999,
    `${A}/products/MENU_Elizabeth_Lounge_Chair_Elizabeth_Ottoman.jpg?v=1664275343`,
  ],
  [
    'brasilia-lounge',
    'Brasília Sheepskin Lounge',
    'Lounge Chairs',
    52999,
    `${A}/files/MENU_Brasilia_Lounge_Chair_Sheepskin_Brasilia_Ottoman_Plint_Cubic_383eab06-7c8d-4850-a2af-94a49ac81e42.jpg?v=1687526637`,
    'New',
  ],
  [
    'afteroom-plus',
    'Afteroom Dining Chair Plus',
    'Dining Chairs',
    14999,
    `${A}/files/Audo_AfteroomDiningChairPlus_AndrogyneDiningTable_RondBowl_21.jpg?v=1708697812`,
  ],
  [
    'afteroom-bar',
    'Afteroom Bar Chair',
    'Bar & Counter',
    13999,
    `${A}/files/Audo_Afteroom_Bar_Chair_45_175a5b9d-4376-40ec-ba82-b71e3cd995ba.jpg?v=1709023292`,
    'Sale',
    16999,
  ],
  [
    'passage-stool',
    'Passage Counter Stool',
    'Bar & Counter',
    11999,
    `${A}/products/MENU_Curiosity_Cabinat_Hashira_Pendant_Cluster_Snaregade_Counter_Table_Passage_Counter_Stool_Etruscan_Pitcher.jpg?v=1646911405`,
  ],
  [
    'afteroom-counter',
    'Afteroom Counter Chair',
    'Bar & Counter',
    13499,
    `${A}/files/Audo_Harbour_Column_Counter_Table_Afteroom_Counter_Chair_Plus_51.jpg?v=1708952585`,
  ],
  ['merkur-chair', 'Merkur Dining Chair', 'Dining Chairs', 15999, `${A}/products/MENU_Merkur_Dining_Chair_3.jpg?v=1696499959`],
  [
    'seal-ottoman',
    'Seal Lounge Chair & Ottoman',
    'Lounge Chairs',
    61999,
    `${A}/products/MENU_The_Seal_Lounge_Chair_Seal_Ottoman_2.jpg?v=1664270938`,
  ],
  [
    'afteroom-family',
    'Afteroom Family Set',
    'Bar & Counter',
    36999,
    `${A}/files/Audo_AfteroomCounterChair_AfteroomBarChair_AfteroomDiningChair_39_9c503b9a-869f-4bd2-82b1-aee9b9fb1396.jpg?v=1708957429`,
    'Sale',
    41999,
  ],
];

const tables = [
  [
    'timber-tales',
    'Timber Tales Dining Table',
    'Dining Tables',
    48999,
    `${A}/files/Audo_Androgyne_Dining_Table_Ready_Dining_Chair_Hashira_Linear_Oendant_Stance_Vase_1_c8c742e7-79d0-4ed5-8bb0-98755976b4e0.jpg?v=1725266773`,
    'Bestseller',
  ],
  [
    'table-couture',
    'Snaregade Couture Table',
    'Dining Tables',
    56999,
    `${A}/products/MENU_Snaregade_Dining_Table_Rectangular_Houkime_Rug.jpg?v=1664526761`,
  ],
  ['harbour-bar-table', 'Harbour Bar Table', 'Dining Tables', 29999, `${A}/products/harbour_bar.jpg?v=1617093450`],
  [
    'androgyne-side',
    'Androgyne Side Table',
    'Side Tables',
    14999,
    `${A}/files/Audo_AndrogyneSideTable_RadiohusSofa_73.jpg?v=1708508805`,
    'Bestseller',
  ],
  ['heritage-table', 'Heritage Table', 'Dining Tables', 39999, `${A}/products/j.jpg?v=1641566586`],
  [
    'modern-tabletop',
    'Modern Tabletop',
    'Dining Tables',
    62999,
    `${A}/files/Audo_Androgyne_Dining_Table_Ready_Dining_Chair_Hashira_Linear_Pendant_Lamp_Plinth_Tall_22.jpg?v=1723016824`,
    'New',
  ],
  [
    'jaguar-set',
    'Jäger Lounge Table',
    'Coffee Tables',
    34999,
    `${A}/files/Audo_Eave_Modular_Sofa_Jager_Lounge_Table_Dancing_Pendant_Medium_1_aad677d8-8050-48f1-b089-bb083d9a872c.jpg?v=1725261306`,
  ],
  ['izia-side', 'Îzia Volume Side Table', 'Side Tables', 12999, `${A}/files/Audo_Knitting_Chair_Volume_Side_Table_43.jpg?v=1708512073`],
  [
    'marble-table',
    'Plinth Marble Table',
    'Coffee Tables',
    44999,
    `${A}/products/MENU_The_Seal_Lounge_Chair_Plinth_Bridge_Plinth_Low.jpg?v=1664267099`,
    'Sale',
    52999,
  ],
  ['russian-marble', 'Russian Marble Lounge Table', 'Coffee Tables', 38999, `${A}/products/MENU_Androgyne_Lounge_Table_5.jpg?v=1655112096`],
  [
    'black-manga',
    'Black Manga Table',
    'Dining Tables',
    41999,
    `${A}/products/MENU_Androgyne-Table-6_e990345c-029a-453c-ba62-93f1e90882ca.jpg?v=1699277743`,
  ],
  [
    'family-oval',
    'Family Oval Dining Table',
    'Dining Tables',
    74999,
    `${A}/products/MENU_Snaregade_Dining_Table_Oval_Houkime_Rug_Harbour_Dining_Chair.jpg?v=1664524881`,
  ],
  [
    'eclipse-desk',
    'Eclipse Study Desk',
    'Desks',
    26999,
    `${A}/files/Audo_Dancing_Pendant_Medium_Co_Task_Chair_Eclipse_Desk_2.jpg?v=1725266426`,
    'New',
  ],
  ['bed-table', 'Passage Bedside Table', 'Side Tables', 9999, `${A}/products/MENU_Reverse_Table_Lamp_Passage_Stool_2.jpg?v=1709025712`],
  [
    'branch-table',
    'Branch Side Table',
    'Side Tables',
    16999,
    `${A}/files/Audo_Eave_Seamline_Branch_Side_Table_01_b11d40e0-e9cc-4922-a9d0-38992dffe06e.jpg?v=1725265768`,
  ],
  ['corbel-shelf', 'Corbel Shelf Table', 'Desks', 11999, `${A}/files/Audo_Corbel_Shelf_Long_53.jpg?v=1708509570`],
  [
    'co-table',
    'Co Work Table',
    'Desks',
    54999,
    `${A}/files/Audo_Co_Table_Harbour_Side_Dining_Chair_Star_Base_Casters_Torso_Table_Lamp_1.jpg?v=1708509352`,
  ],
  [
    'ishinomaki-folding',
    'Ishinomaki Folding Table',
    'Side Tables',
    19999,
    `${A}/products/MENU_Ishinomaki_8.jpg?v=1630948568`,
    'Sale',
    23999,
  ],
  [
    'pedestal-dining',
    'Plinth Pedestal Dining Table',
    'Dining Tables',
    69999,
    `${A}/products/MENU_Plinth_Pedestal_Androgyne_Dining_Table_Merkur_Dining_Chair.jpg?v=1671613970`,
  ],
  [
    'passage-lounge',
    'Passage Lounge Table',
    'Coffee Tables',
    31999,
    `${A}/files/Audo_Passage_Lounge_Table_Sentiment_Paper_Weight_Eave_Modular_Sofa_54.jpg?v=1709026961`,
  ],
];

const lighting = [
  [
    'tr-bulb-wall',
    'TR Bulb Suspended Wall Lamp',
    'Wall Lamps',
    9999,
    `${A}/files/Audo_TR_Bulb_Suspended_Wall_Lamp_1.jpg?v=1723035859`,
    'Bestseller',
  ],
  ['cast-sconce', 'Cast Sconce Diffuser', 'Wall Lamps', 14999, `${A}/files/Audo_Cast_Sconce_Wall_Lamp_Diffuser_IP44_2.jpg?v=1724933064`],
  [
    'hashira-table',
    'Hashira Table Lamp',
    'Table Lamps',
    4999,
    `${A}/products/MENU_Hashira_Table_Lamp_Portable_Plinth_Granad.jpg?v=1654776165`,
    'Bestseller',
  ],
  [
    'hashira-floor',
    'Hashira Floor Lamp',
    'Floor Lamps',
    12499,
    `${A}/products/MENU_Hashira_Floor_Lamp_High_Tearoom_Sofa_High_Back_Plinth_Low.jpg?v=1646913077`,
  ],
  ['jwda-floor', 'JWDA Floor Lamp', 'Floor Lamps', 13999, `${A}/products/MENU_JWDA-Floor-Lamp.jpg?v=1587484596`],
  [
    'torso-table',
    'Torso Table Lamp',
    'Table Lamps',
    4999,
    `${A}/products/MENU_Torso_Table_Lamp_57_Babelia_Plage_de_Coquillages_5.jpg?v=1647850591`,
    'New',
  ],
  ['jwda-portable', 'JWDA Portable Lamp', 'Table Lamps', 2099, `${A}/products/MENU_JWDA_Table_Lamp_Portable_Echasse_Vase.jpg?v=1630948649`],
  [
    'la-lona-lamp',
    'La-Lona Lamp',
    'Floor Lamps',
    3999,
    `${A}/files/MENU_Houkime_Rug_Harbour_Side_Androgyne_Dining_Table_Hashira_eb214732-84ef-4c6e-b89e-f651d93ec4e6.jpg?v=1699962703`,
  ],
  ['umanoff-pendant', 'Umanoff Pendant', 'Pendants', 4999, `${A}/products/Umanoff_Pendant.jpg?v=1615553522`],
  ['cir-table', 'Cir Table Lamp', 'Table Lamps', 2499, `${A}/products/cir.jpg?v=1617092427`],
  [
    'tr-suspension',
    'TR Bulb Suspension Frame',
    'Pendants',
    6999,
    `${A}/files/MENU_HarbourSideChair_Snaregade_TRBulbSuspensionFrame.jpg?v=1687938532`,
  ],
  [
    'tr-stick',
    'TR Bulb Stick Lamp',
    'Wall Lamps',
    1499,
    `${A}/products/MENU_Stick_System_TR_Bulb_TableWall_Lamp_2.jpg?v=1587485435`,
    'Sale',
    1999,
  ],
  [
    'tr-stem',
    'TR Bulb Stem Lamp',
    'Table Lamps',
    5999,
    `${A}/products/MENU_Harbour-Chair_TR_Stem-Vase_Androgyne-Table_0acbead7-ea64-4f81-b4d3-86b220ebc084.jpg?v=1687937519`,
  ],
  ['minza-lamp', 'Minza Lamp', 'Table Lamps', 1799, `${A}/products/BI9A7803.jpg?v=1621258776`],
  [
    'hashira-ceiling',
    'Hashira Ceiling Lamp',
    'Pendants',
    7999,
    `${A}/files/Audo_Hashira_Ceiling_Lamp_Plinth_Tall_Divot_Bowl_2.png?v=1723729590`,
  ],
  [
    'tubulaire-chandelier',
    'Tubulaire Chandelier',
    'Pendants',
    18999,
    `${A}/files/Audo_Tubulaire_Chandelier_RailPendant_TearoomSideChair_EaveDining_PassageStools_HarbourColumnDiningTable_Plinth_16_rail.jpg?v=1709197462`,
    'New',
  ],
  [
    'pendant-cluster',
    'Hashira Pendant Cluster',
    'Pendants',
    15999,
    `${A}/products/MENU_Hashira_Pendant_Cluster_Raw_Androgyne_Dining_Table_NNWD_Footed_Bowl.jpg?v=1631202807`,
  ],
  [
    'hashira-floor-raw',
    'Hashira Floor Lamp Raw',
    'Floor Lamps',
    8999,
    `${A}/products/MENU_Hashira_Floor_Lamp_Androgyne_Lounge_Table_1_8b0baf39-dccc-4349-8a47-592fc12f2300.jpg?v=1631618802`,
  ],
  [
    'carrie-lamp',
    'Carrie Leather Table Lamp',
    'Table Lamps',
    11999,
    `${A}/products/MENU_Carrie_Table_Lamp_Leather_11_29e3f84f-8387-4622-8acd-949a17e238cb.jpg?v=1660200353`,
  ],
  ['jwda-pendant', 'JWDA Brass Pendant', 'Pendants', 9999, `${A}/products/MenuAW16_JWDA_Pendant_Polished_Brass.jpg?v=1587486131`],
  [
    'lizina-chandelier',
    'Lizina Chandelier',
    'Pendants',
    13999,
    `${A}/files/Audo_PlinthTall_CollapseVase_TubulaireChandelier_12.jpg?v=1708511691`,
  ],
  [
    'collector-pendant',
    'Collector 5 Pendant',
    'Pendants',
    16999,
    `${A}/products/MENU_Collector_5_Pendant_Taper_Bowl_Androgyne_Dining_Table.jpg?v=1664265839`,
  ],
  ['wing-floor', 'Wing Floor Lamp', 'Floor Lamps', 10999, `${A}/products/MENU_The_Tired_Man_Wing_Floor_Lamp.jpg?v=1725265701`],
  ['angus-arched', 'Angus Arched Floor Lamp', 'Floor Lamps', 12999, '/media/arched-lamp.jpeg', 'Bestseller'],
  ['studio-standing', 'Studio Standing Lamp', 'Floor Lamps', 7999, '/media/standing-lamp.jpeg'],
];

export const CATEGORIES = [
  {
    slug: 'seating',
    name: 'Seating',
    tagline: 'Sofas, lounge chairs and stools built for long conversations.',
    cover: `${A}/files/Audo_Eave_Modular_Sofa_86_Boucle_07_configuration_7.jpg?v=1702299113`,
  },
  {
    slug: 'tables',
    name: 'Tables',
    tagline: 'Dining, side and work tables. Places where people gather.',
    cover: `${A}/files/Audo_Androgyne_Dining_Table_Ready_Dining_Chair_Hashira_Linear_Oendant_Stance_Vase_1_c8c742e7-79d0-4ed5-8bb0-98755976b4e0.jpg?v=1725266773`,
  },
  {
    slug: 'lighting',
    name: 'Lighting',
    tagline: 'Pendants, lamps and sconces for warm, soft light.',
    cover: `${A}/files/Audo_TR_Bulb_Suspended_Wall_Lamp_1.jpg?v=1723035859`,
  },
];

// Defaults a new product picks up from its category (used by the seed and the admin editor).
const MATERIALS = {
  seating: ['Bouclé', 'Linen blend', 'Aniline leather'],
  tables: ['Solid oak', 'Smoked ash', 'Travertine'],
  lighting: ['Brushed brass', 'Matte black', 'Opal glass'],
};

const COLORS = {
  seating: [
    { name: 'Oat', hex: '#d9cfbf' },
    { name: 'Moss', hex: '#6b6f4f' },
    { name: 'Clay', hex: '#a86a4c' },
  ],
  tables: [
    { name: 'Natural', hex: '#c9a57a' },
    { name: 'Walnut', hex: '#5d4030' },
    { name: 'Ebony', hex: '#26221f' },
  ],
  lighting: [
    { name: 'Brass', hex: '#b8955a' },
    { name: 'Black', hex: '#222' },
    { name: 'Ivory', hex: '#ece6da' },
  ],
};

const STORIES = {
  seating:
    'Shaped by hand in our Pune workshop on a kiln-dried hardwood frame. Pocket springs and high-resilience foam keep it supportive for years, and the soft edges invite you to sink in.',
  tables:
    'Cut from responsibly sourced timber and finished with a natural hard-wax oil that brings out the grain. Joinery is cut to tight tolerances, so it stays solid and quiet for generations.',
  lighting:
    'Made to give glare-free, atmospheric light. The shade sends a soft glow downwards and outwards, and each lamp is hand-assembled and tested before it leaves our studio.',
};

const DIMENSIONS = {
  seating: 'W 210 × D 95 × H 78 cm · Seat height 42 cm',
  tables: 'W 180 × D 90 × H 74 cm',
  lighting: 'Ø 32 × H 54 cm · Cable 2.5 m · E27 bulb',
};

export const CATEGORY_DEFAULTS = Object.fromEntries(
  ['seating', 'tables', 'lighting'].map((c) => [c, { materials: MATERIALS[c], colors: COLORS[c], story: STORIES[c], dimensions: DIMENSIONS[c] }]),
);

// Representative 3D models (Khronos glTF sample assets by Eric Chadwick / Wayfair).
const MODELS = {
  'luxe-loveseat': { url: '/models/GlamVelvetSofa.glb', credit: '“Glam Velvet Sofa” by Eric Chadwick, © Wayfair LLC, CC BY 4.0' },
  'cozy-armchair': { url: '/models/SheenChair.glb', credit: '“Sheen Chair” by Eric Chadwick, © Wayfair LLC, CC0' },
  'tearoom-high-back': { url: '/models/ChairDamaskPurplegold.glb', credit: '“Chair Damask Purplegold” by Eric Chadwick, © Wayfair, CC BY 4.0' },
};

// Small deterministic hash so seeded ratings and stock are the same on every fresh database.
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const build =
  (category) =>
  ([id, name, type, price, image, badge, compareAt]) => {
    const h = hash(id);
    return {
      id,
      name,
      category,
      type,
      price,
      compareAt: compareAt ?? null,
      image,
      badge: badge ?? null,
      rating: Math.round((4 + (h % 10) / 10) * 10) / 10,
      reviews: 12 + (h % 240),
      materials: MATERIALS[category],
      colors: COLORS[category],
      story: STORIES[category],
      dimensions: DIMENSIONS[category],
      featured: h % 3 === 0 || badge === 'Bestseller',
      // A few pieces start nearly sold out so low-stock alerts have something to show.
      stock: h % 11 === 0 ? 2 : 4 + (h % 21),
      modelUrl: MODELS[id]?.url ?? null,
      modelCredit: MODELS[id]?.credit ?? null,
    };
  };

/**
 * Initial catalogue. The server copies this into the database on first start;
 * after that the database (managed from the admin panel) is the source of truth.
 */
export const SEED_PRODUCTS = [...seating.map(build('seating')), ...tables.map(build('tables')), ...lighting.map(build('lighting'))];

export const formatPrice = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// Shopify CDN supports on-the-fly resizing — request only what we need.
export const sized = (url, width = 800) => (url.includes('cdn/shop') ? `${url}${url.includes('?') ? '&' : '?'}width=${width}` : url);

export const FREE_SHIPPING_AT = 50000;
