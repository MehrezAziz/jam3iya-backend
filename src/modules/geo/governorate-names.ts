/** Fixes mojibake / legacy seed names → proper UTF-8 display. */
const GOVERNORATE_FIXES: Record<string, string> = {
  'b??ja': 'Béja',
  'bÃ©ja': 'Béja',
  'béja governorate': 'Béja',
  'gab??s': 'Gabès',
  'gabÃ¨s': 'Gabès',
  'gabès governorate': 'Gabès',
  'k??bili': 'Kébili',
  'kÃ©bili': 'Kébili',
  'kébili governorate': 'Kébili',
  'm??denine': 'Médenine',
  'mÃ©denine': 'Médenine',
  'médenine governorate': 'Médenine',
  ariana: 'Ariana',
  'ben arous': 'Ben Arous',
  bizerte: 'Bizerte',
  gafsa: 'Gafsa',
  jendouba: 'Jendouba',
  kairouan: 'Kairouan',
  kasserine: 'Kasserine',
  kef: 'Kef',
  mahdia: 'Mahdia',
  manouba: 'Manouba',
  monastir: 'Monastir',
  nabeul: 'Nabeul',
  sfax: 'Sfax',
  'sidi bouzid': 'Sidi Bouzid',
  siliana: 'Siliana',
  sousse: 'Sousse',
  tataouine: 'Tataouine',
  tozeur: 'Tozeur',
  tunis: 'Tunis',
  zaghouan: 'Zaghouan',
};

export function normalizeGovernorateDisplayName(raw: string): string {
  let name = raw.replace(/\s+Governorate$/i, '').trim();
  const key = name.toLowerCase().replace(/\s+/g, ' ');
  if (GOVERNORATE_FIXES[key]) return GOVERNORATE_FIXES[key];
  if (name.includes('??') || name.includes('Ã')) {
    if (/^k.+bili$/.test(key)) return 'Kébili';
    if (/^b.+ja$/.test(key)) return 'Béja';
    if (/^gab.+s$/.test(key)) return 'Gabès';
    if (/^m.+denine$/.test(key)) return 'Médenine';
    for (const [bad, good] of Object.entries(GOVERNORATE_FIXES)) {
      if (bad.includes('??') && key === bad) return good;
    }
  }
  return name;
}
