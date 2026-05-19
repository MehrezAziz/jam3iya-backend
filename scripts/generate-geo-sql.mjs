/**
 * Generates backend/prisma/sql/seed_tunisia_governorates.sql
 * Run: node backend/scripts/generate-geo-sql.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA = {
  'Ariana Governorate': [
    'La Soukra', 'Mnihla', 'Raoued', 'Sidi Thabet', 'Kalâat el-Andalous',
  ],
  'Béja Governorate': [
    'Amdoun', 'Goubellat', 'Medjez El Bab', 'Nefza', 'Téboursouk', 'Testour', 'Thibar', 'Béja Nord', 'Béja Sud',
  ],
  'Ben Arous Governorate': [
    'Bou Mhel el-Bassatine', 'El Mourouj', 'Ezzahra', 'Fouchana', 'Hammam Chott', 'Hammam Lif', 'Khalidia',
    'Mégrine', 'Mohamedia', 'Mornag', 'Naassen', 'Radès',
  ],
  'Bizerte Governorate': [
    'Bizerte', 'El Alia', 'Ghar El Melh', 'Ghezala', 'Joumine', 'Mateur', 'Menzel Bourguiba', 'Menzel Jemil',
    'Ras Jebel', 'Sejnane', 'Tinja', 'Utique', 'Zarzouna',
  ],
  'Gabès Governorate': [
    'El Hamma', 'Gabès', 'Gabès Sud', 'Ghannouch', 'Habib Thameur Bouatouch', 'Mareth', 'Matmata',
    'Menzel El Habib', 'Métouia', 'Oudhref',
  ],
  'Gafsa Governorate': [
    'El Guettar', 'El Ksar', 'Gafsa', 'Mdhila', 'Métlaoui', 'Moularès', 'Redeyef', 'Sened', 'Sidi Aïch',
    'Sidi Boubaker', 'Zannouch',
  ],
  'Jendouba Governorate': [
    'Aïn Draham', 'Balta - Bou Aouane', 'Bou Salem', 'Fernana', 'Ghardimaou', 'Jendouba', 'Oued Meliz', 'Tabarka',
  ],
  'Kairouan Governorate': [
    'Aïn Djeloula', 'Bou Hajla', 'Chebika', 'Echrarda', 'El Alâa', 'Haffouz', 'Hajeb el Ayoun', 'Kairouan',
    'Menzel Mehiri', 'Nasrallah', 'Oueslatia', 'Sbikha',
  ],
  'Kasserine Governorate': [
    'El Ayoun', 'Ezzouhour', 'Fériana', 'Foussana', 'Haïdra', 'Hassi El Ferid', 'Jedelienne', 'Kasserine',
    'Majel Bel Abbès', 'Sbeïtla', 'Sbiba', 'Thala',
  ],
  'Kébili Governorate': ['Douz', 'Faouar', 'Kébili', 'Rjim Maatoug', 'Souk Lahad'],
  'Kef Governorate': [
    'Dahmani', 'El Ksour', 'Jérissa', 'Kalâat Khasba', 'Kalaat Senan', 'Kef', 'Nebeur', 'Sakiet Sidi Youssef',
    'Sers', 'Tajerouine', 'Touiref',
  ],
  'Mahdia Governorate': [
    'Bou Merdes', 'Chebba', 'Chorbane', 'El Bradâa', 'El Jem', 'Essouassi', 'Hebira', 'Ksour Essef', 'Mahdia',
    'Melloulèche', 'Ouled Chamekh', 'Rejiche', 'Sidi Alouane',
  ],
  'Manouba Governorate': [
    'Borj El Amri', 'Den Den', 'Djedeida', 'Douar Hicher', 'El Battan', 'Manouba', 'Mornaguia', 'Oued Ellil', 'Tebourba',
  ],
  'Médenine Governorate': [
    'Ben Gardane', 'Beni Khedache', 'Djerba Ajim', 'Djerba Houmt Souk', 'Djerba Midoun', 'Médenine', 'Sidi Makhlouf', 'Zarzis',
  ],
  'Monastir Governorate': [
    'Amiret El Fhoul', 'Amiret El Hojjaj', 'Amiret Touazra', 'Bekalta', 'Bembla', 'Benen Bodher', 'Bouhjar', 'Cherahil',
    'El Masdour', 'Jemmal', 'Ksar Hellal', 'Ksibet El Mediouni', 'Lemta', 'Menzel Ennour', 'Menzel Farsi', 'Menzel Hayet',
    'Menzel Kamel', 'Moknine', 'Sayada', 'Sidi Bennour', 'Téboulba', 'Touza', 'Zaouiet Kontoch', 'Ghenada',
  ],
  'Nabeul Governorate': [
    'Azmour', 'Béni Khalled', 'Béni Khiar', 'Bou Argoub', 'Dar Allouch', 'Dar Châabane El Fehri', 'El Haouaria',
    'El Maâmoura', 'El Mida', 'Fondouk Jedid - Seltene', 'Grombalia', 'Hammam Ghezèze', 'Hammamet', 'Kelibia', 'Korba',
    'Korbous', 'Menzel Bouzelfa', 'Menzel Horr', 'Menzel Temime', 'Nabeul', 'Soliman', 'Somâa', 'Takelsa', 'Tazarka', 'Zaouiet Djedidi',
  ],
  'Sfax Governorate': [
    'Agareb', 'Bir Ali Ben Khalifa', 'El Amra', 'El Hencha', 'Graïba', 'Jebiniana', 'Kerkennah', 'Mahrès', 'Menzel Chaker',
    'Sakiet Eddaïer', 'Sakiet Ezzit', 'Sfax', 'Skhira', 'Thyna',
  ],
  'Sidi Bouzid Governorate': [
    'Bir El Hafey', 'Cebbala Ouled Asker', 'El Hichria', 'Essaïda', 'Jilma', 'Meknassy', 'Menzel Bouzaiane', 'Mezzouna',
    'Ouled Haffouz', 'Regueb', 'Sidi Ali Ben Aoun', 'Sidi Bouzid', 'Souk Jedid',
  ],
  'Siliana Governorate': [
    'Bargou', 'Bou Arada', 'El Aroussa', 'El Krib', 'Gaâfour', 'Kesra', 'Makthar', 'Rouhia', 'Sidi Bou Rouis', 'Siliana',
  ],
  'Sousse Governorate': [
    'Akouda', 'Bouficha', 'Enfida', 'Hammam Sousse', 'Hergla', 'Kalâa Kebira', 'Kalâa Seghira', 'Kondar', "M'saken",
    'Sidi Bou Ali', 'Sidi El Hani', 'Sousse', 'Zaouiet Ksibet Thrayet',
  ],
  'Tataouine Governorate': ['Beni Mehira', 'Bir Lahmar', 'Dehiba', 'Ghomrassen', 'Remada', 'Smâr', 'Tataouine'],
  'Tozeur Governorate': ['Degache', 'El Hamma du Jérid', 'Hazoua', 'Nefta', 'Tamerza', 'Tozeur'],
  'Tunis Governorate': [
    'Carthage', 'Le Bardo', 'La Goulette', 'Le Kram', 'La Marsa', 'Sidi Bou Said', 'Sidi Hassine', 'Tunis',
  ],
  'Zaghouan Governorate': ['Bir Mcherga', 'Djebel Oust', 'El Fahs', 'Nadhour', 'Saouaf', 'Zaghouan', 'Zriba'],
};

function esc(s) {
  return s.replace(/'/g, "''");
}

const lines = [
  '-- Tunisia governorates & delegations (reference data)',
  '-- Run after tables exist: psql $DATABASE_URL -f backend/prisma/sql/seed_tunisia_governorates.sql',
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

const stripGov = (name) => name.replace(/\s+Governorate$/i, '').trim();

for (const [govKey, delegations] of Object.entries(DATA)) {
  const gov = stripGov(govKey);
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
console.log('Wrote', out);
