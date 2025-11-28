// Pemetaan alias nama negara -> kode bendera dua huruf
export const ALIAS_TO_CODE = {
  australia: "au",
  au: "au",
  "new zealand": "nz",
  "selandia baru": "nz",
  nz: "nz",
  canada: "ca",
  kanada: "ca",
  ca: "ca",
  netherlands: "nl",
  holland: "nl",
  belanda: "nl",
  nl: "nl",
  "united states": "us",
  usa: "us",
  america: "us",
  amerika: "us",
  "amerika serikat": "us",
  as: "us",
  us: "us",
  japan: "jp",
  jepang: "jp",
  jp: "jp",
  taiwan: "tw",
  tw: "tw",
  france: "fr",
  prancis: "fr",
  fr: "fr",
  germany: "de",
  jerman: "de",
  deutschland: "de",
  de: "de",
  "united kingdom": "gb",
  uk: "gb",
  britain: "gb",
  "great britain": "gb",
  england: "gb",
  inggris: "gb",
  gb: "gb",
  poland: "pl",
  polandia: "pl",
  pl: "pl",
  "south korea": "kr",
  "korea selatan": "kr",
  korea: "kr",
  kr: "kr",
  switzerland: "ch",
  swiss: "ch",
  ch: "ch",
  china: "cn",
  tiongkok: "cn",
  cn: "cn",
  singapore: "sg",
  singapura: "sg",
  sg: "sg",
  malaysia: "my",
  my: "my",
  italy: "it",
  italia: "it",
  it: "it",
};

const CODE_TO_LABEL = {
  au: "Australia",
  nz: "New Zealand",
  ca: "Canada",
  nl: "Netherlands",
  us: "United States",
  jp: "Japan",
  tw: "Taiwan",
  fr: "France",
  de: "Germany",
  gb: "United Kingdom",
  pl: "Poland",
  kr: "South Korea",
  ch: "Switzerland",
  cn: "China",
  sg: "Singapore",
  my: "Malaysia",
  it: "Italy",
};

// Daftar opsi select negara, deduplikasi per kode negara
export const COUNTRY_OPTIONS = Array.from(
  Object.entries(ALIAS_TO_CODE).reduce((map, [alias, code]) => {
    const c = String(code || "").toLowerCase();
    if (!c || map.has(c)) return map;
    const label = CODE_TO_LABEL[c] || alias;
    map.set(c, { code: c, value: label, label });
    return map;
  }, new Map())
).map(([, opt]) => opt)
  .sort((a, b) => a.label.localeCompare(b.label));

export const COUNTRY_CODE_TO_LABEL = COUNTRY_OPTIONS.reduce((acc, opt) => {
  acc[opt.code] = opt.label;
  return acc;
}, {});
