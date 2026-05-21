/**
 * Generates backend/prisma/sql/seed_tunisia_governorates.sql (UTF-8).
 * Run: node backend/scripts/generate-geo-sql.mjs
 *
 * Governorate names are stored WITHOUT the word "Governorate".
 * Delegations that duplicate the governorate name are omitted (e.g. Ben Arous).
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Keys may end with " Governorate"; values are delegation/city names. */
const DATA = {
  Ariana: [
    'Ettadhamen',
    'La Soukra',
    'Mnihla',
    'Raoued',
    'Sidi Thabet',
    'Kalâat el-Andalous',
  ],
  Béja: [
    'Amdoun',
    'Goubellat',
    'Medjez El Bab',
    'Nefza',
    'Téboursouk',
    'Testour',
    'Thibar',
    'Béja Nord',
    'Béja Sud',
    'Béja',
  ],
  'Ben Arous': [
    'Bou Mhel el-Bassatine',
    'El Mourouj',
    'Ezzahra',
    'Fouchana',
    'Hammam Chott',
    'Hammam Lif',
    'Khalidia',
    'Mégrine',
    'Mohamedia',
    'Mornag',
    'Naassen',
    'Radès',
  ],
  Bizerte: [
    'Bizerte',
    'El Alia',
    'Ghar El Melh',
    'Ghezala',
    'Joumine',
    'Mateur',
    'Menzel Bourguiba',
    'Menzel Jemil',
    'Ras Jebel',
    'Sejnane',
    'Tinja',
    'Utique',
    'Zarzouna',
  ],
  Gabès: [
    'El Hamma',
    'Gabès',
    'Gabès Sud',
    'Ghannouch',
    'Habib Thameur Bouatouch',
    'Mareth',
    'Matmata',
    'Menzel El Habib',
    'Métouia',
    'Oudhref',
  ],
  Gafsa: [
    'El Guettar',
    'El Ksar',
    'Gafsa',
    'Mdhila',
    'Métlaoui',
    'Moularès',
    'Redeyef',
    'Sened',
    'Sidi Aïch',
    'Sidi Boubaker',
    'Zannouch',
  ],
  Jendouba: [
    'Aïn Draham',
    'Balta - Bou Aouane',
    'Bou Salem',
    'Fernana',
    'Ghardimaou',
    'Jendouba',
    'Oued Meliz',
    'Tabarka',
  ],
  Kairouan: [
    'Aïn Djeloula',
    'Bou Hajla',
    'Chebika',
    'Echrarda',
    'El Alâa',
    'Haffouz',
    'Hajeb el Ayoun',
    'Kairouan',
    'Menzel Mehiri',
    'Nasrallah',
    'Oueslatia',
    'Sbikha',
  ],
  Kasserine: [
    'El Ayoun',
    'Ezzouhour',
    'Fériana',
    'Foussana',
    'Haïdra',
    'Hassi El Ferid',
    'Jedelienne',
    'Kasserine',
    'Majel Bel Abbès',
    'Sbeïtla',
    'Sbiba',
    'Thala',
  ],
  Kébili: ['Douz', 'Faouar', 'Kébili', 'Rjim Maatoug', 'Souk Lahad'],
  Kef: [
    'Dahmani',
    'El Ksour',
    'Jérissa',
    'Kalâat Khasba',
    'Kalaat Senan',
    'Kef',
    'Nebeur',
    'Sakiet Sidi Youssef',
    'Sers',
    'Tajerouine',
    'Touiref',
  ],
  Mahdia: [
    'Bou Merdes',
    'Chebba',
    'Chorbane',
    'El Bradâa',
    'El Jem',
    'Essouassi',
    'Hebira',
    'Ksour Essef',
    'Mahdia',
    'Melloulèche',
    'Ouled Chamekh',
    'Rejiche',
    'Sidi Alouane',
  ],
  Manouba: [
    'Borj El Amri',
    'Den Den',
    'Djedeida',
    'Douar Hicher',
    'El Battan',
    'Manouba',
    'Mornaguia',
    'Oued Ellil',
    'Tebourba',
  ],
  Médenine: [
    'Ben Gardane',
    'Beni Khedache',
    'Djerba Ajim',
    'Djerba Houmt Souk',
    'Djerba Midoun',
    'Médenine',
    'Sidi Makhlouf',
    'Zarzis',
  ],
  Monastir: [
    'Amiret El Fhoul',
    'Amiret El Hojjaj',
    'Amiret Touazra',
    'Bekalta',
    'Bembla',
    'Benen Bodher',
    'Bouhjar',
    'Cherahil',
    'El Masdour',
    'Jemmal',
    'Ksar Hellal',
    'Ksibet El Mediouni',
    'Lemta',
    'Menzel Ennour',
    'Menzel Farsi',
    'Menzel Hayet',
    'Menzel Kamel',
    'Moknine',
    'Sayada',
    'Sidi Bennour',
    'Téboulba',
    'Touza',
    'Zaouiet Kontoch',
    'Ghenada',
  ],
  Nabeul: [
    'Azmour',
    'Béni Khalled',
    'Béni Khiar',
    'Bou Argoub',
    'Dar Allouch',
    'Dar Châabane El Fehri',
    'El Haouaria',
    'El Maâmoura',
    'El Mida',
    'Fondouk Jedid - Seltene',
    'Grombalia',
    'Hammam Ghezèze',
    'Hammamet',
    'Kelibia',
    'Korba',
    'Korbous',
    'Menzel Bouzelfa',
    'Menzel Horr',
    'Menzel Temime',
    'Nabeul',
    'Soliman',
    'Somâa',
    'Takelsa',
    'Tazarka',
    'Zaouiet Djedidi',
  ],
  Sfax: [
    'Agareb',
    'Bir Ali Ben Khalifa',
    'El Amra',
    'El Hencha',
    'Graïba',
    'Jebiniana',
    'Kerkennah',
    'Mahrès',
    'Menzel Chaker',
    'Sakiet Eddaïer',
    'Sakiet Ezzit',
    'Sfax',
    'Skhira',
    'Thyna',
  ],
  'Sidi Bouzid': [
    'Bir El Hafey',
    'Cebbala Ouled Asker',
    'El Hichria',
    'Essaïda',
    'Jilma',
    'Meknassy',
    'Menzel Bouzaiane',
    'Mezzouna',
    'Ouled Haffouz',
    'Regueb',
    'Sidi Ali Ben Aoun',
    'Sidi Bouzid',
    'Souk Jedid',
  ],
  Siliana: [
    'Bargou',
    'Bou Arada',
    'El Aroussa',
    'El Krib',
    'Gaâfour',
    'Kesra',
    'Makthar',
    'Rouhia',
    'Sidi Bou Rouis',
    'Siliana',
  ],
  Sousse: [
    'Akouda',
    'Bouficha',
    'Enfida',
    'Hammam Sousse',
    'Hergla',
    'Kalâa Kebira',
    'Kalâa Seghira',
    'Kondar',
    "M'saken",
    'Sidi Bou Ali',
    'Sidi El Hani',
    'Sousse',
    'Zaouiet Ksibet Thrayet',
  ],
  Tataouine: ['Beni Mehira', 'Bir Lahmar', 'Dehiba', 'Ghomrassen', 'Remada', 'Smâr', 'Tataouine'],
  Tozeur: ['Degache', 'El Hamma du Jérid', 'Hazoua', 'Nefta', 'Tamerza', 'Tozeur'],
  Tunis: [
    'Carthage',
    'Le Bardo',
    'La Goulette',
    'Le Kram',
    'La Marsa',
    'Sidi Bou Said',
    'Sidi Hassine',
    'Tunis',
    'Ettadhamen',
  ],
  Zaghouan: ['Bir Mcherga', 'Djebel Oust', 'El Fahs', 'Nadhour', 'Saouaf', 'Zaghouan', 'Zriba'],
};

function esc(s) {
  return s.replace(/'/g, "''");
}

function governorateName(key) {
  return key.replace(/\s+Governorate$/i, '').trim();
}

/** Skip delegation if it equals governorate (same-name rule as Ariana/Ben Arous). */
function delegationsFor(gov, list) {
  const g = governorateName(gov);
  return list.filter((d) => d.trim().toLowerCase() !== g.toLowerCase());
}

const lines = [
  '-- Tunisia governorates & delegations (UTF-8 reference data)',
  '-- Run: psql -v ON_ERROR_STOP=1 -f backend/prisma/sql/seed_tunisia_governorates.sql',
  '-- Or on VPS: see deploy/run-geo-seed.sh',
  '',
  "SET client_encoding = 'UTF8';",
  '',
  'CREATE TABLE IF NOT EXISTS governorate (',
  '  id SERIAL PRIMARY KEY,',
  '  name TEXT NOT NULL UNIQUE',
  ');',
  '',
  'CREATE TABLE IF NOT EXISTS delegation (',
  '  id SERIAL PRIMARY KEY,',
  '  "governorateId" INT NOT NULL REFERENCES governorate(id) ON DELETE CASCADE,',
  '  name TEXT NOT NULL,',
  '  UNIQUE ("governorateId", name)',
  ');',
  '',
  'CREATE INDEX IF NOT EXISTS delegation_governorate_idx ON delegation ("governorateId");',
  '',
];

for (const [govKey, rawDelegations] of Object.entries(DATA)) {
  const gov = governorateName(govKey);
  const delegations = delegationsFor(govKey, rawDelegations);
  lines.push(`INSERT INTO governorate (name) VALUES ('${esc(gov)}') ON CONFLICT (name) DO NOTHING;`);
  for (const d of delegations) {
    lines.push(
      `INSERT INTO delegation ("governorateId", name) SELECT g.id, '${esc(d)}' FROM governorate g WHERE g.name = '${esc(gov)}' ON CONFLICT ("governorateId", name) DO NOTHING;`,
    );
  }
  lines.push('');
}

const out = join(__dirname, '..', 'prisma', 'sql', 'seed_tunisia_governorates.sql');
writeFileSync(out, lines.join('\n'), 'utf8');
const govCount = Object.keys(DATA).length;
let delCount = 0;
for (const [govKey, list] of Object.entries(DATA)) {
  delCount += delegationsFor(govKey, list).length;
}
console.log(`Wrote ${out} (${govCount} governorates, ${delCount} delegations after same-name filter)`);
