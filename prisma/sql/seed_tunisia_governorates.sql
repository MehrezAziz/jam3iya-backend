-- Tunisia governorates & delegations (reference data)
-- Run after tables exist: psql $DATABASE_URL -f backend/prisma/sql/seed_tunisia_governorates.sql

CREATE TABLE IF NOT EXISTS governorate (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS delegation (
  id SERIAL PRIMARY KEY,
  "governorateId" INT NOT NULL REFERENCES governorate(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE ("governorateId", name)
);

CREATE INDEX IF NOT EXISTS delegation_governorate_idx ON delegation ("governorateId");

INSERT INTO governorate (name) VALUES ('Ariana Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'La Soukra' FROM governorate g WHERE g.name = 'Ariana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mnihla' FROM governorate g WHERE g.name = 'Ariana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Raoued' FROM governorate g WHERE g.name = 'Ariana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Thabet' FROM governorate g WHERE g.name = 'Ariana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kalâat el-Andalous' FROM governorate g WHERE g.name = 'Ariana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Béja Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Amdoun' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Goubellat' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Medjez El Bab' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Nefza' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Téboursouk' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Testour' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Thibar' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Béja Nord' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Béja Sud' FROM governorate g WHERE g.name = 'Béja Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Ben Arous Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bou Mhel el-Bassatine' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Mourouj' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ezzahra' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Fouchana' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hammam Chott' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hammam Lif' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Khalidia' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mégrine' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mohamedia' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mornag' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Naassen' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Radès' FROM governorate g WHERE g.name = 'Ben Arous Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Bizerte Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bizerte' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Alia' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ghar El Melh' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ghezala' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Joumine' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mateur' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Bourguiba' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Jemil' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ras Jebel' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sejnane' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tinja' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Utique' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Zarzouna' FROM governorate g WHERE g.name = 'Bizerte Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Gabès Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Hamma' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Gabès' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Gabès Sud' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ghannouch' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Habib Thameur Bouatouch' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mareth' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Matmata' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel El Habib' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Métouia' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Oudhref' FROM governorate g WHERE g.name = 'Gabès Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Gafsa Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Guettar' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Ksar' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Gafsa' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mdhila' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Métlaoui' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Moularès' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Redeyef' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sened' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Aïch' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Boubaker' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Zannouch' FROM governorate g WHERE g.name = 'Gafsa Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Jendouba Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Aïn Draham' FROM governorate g WHERE g.name = 'Jendouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Balta - Bou Aouane' FROM governorate g WHERE g.name = 'Jendouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bou Salem' FROM governorate g WHERE g.name = 'Jendouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Fernana' FROM governorate g WHERE g.name = 'Jendouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ghardimaou' FROM governorate g WHERE g.name = 'Jendouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Jendouba' FROM governorate g WHERE g.name = 'Jendouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Oued Meliz' FROM governorate g WHERE g.name = 'Jendouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tabarka' FROM governorate g WHERE g.name = 'Jendouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Kairouan Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Aïn Djeloula' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bou Hajla' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Chebika' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Echrarda' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Alâa' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Haffouz' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hajeb el Ayoun' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kairouan' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Mehiri' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Nasrallah' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Oueslatia' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sbikha' FROM governorate g WHERE g.name = 'Kairouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Kasserine Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Ayoun' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ezzouhour' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Fériana' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Foussana' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Haïdra' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hassi El Ferid' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Jedelienne' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kasserine' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Majel Bel Abbès' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sbeïtla' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sbiba' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Thala' FROM governorate g WHERE g.name = 'Kasserine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Kébili Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Douz' FROM governorate g WHERE g.name = 'Kébili Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Faouar' FROM governorate g WHERE g.name = 'Kébili Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kébili' FROM governorate g WHERE g.name = 'Kébili Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Rjim Maatoug' FROM governorate g WHERE g.name = 'Kébili Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Souk Lahad' FROM governorate g WHERE g.name = 'Kébili Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Kef Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Dahmani' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Ksour' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Jérissa' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kalâat Khasba' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kalaat Senan' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kef' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Nebeur' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sakiet Sidi Youssef' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sers' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tajerouine' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Touiref' FROM governorate g WHERE g.name = 'Kef Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Mahdia Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bou Merdes' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Chebba' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Chorbane' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Bradâa' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Jem' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Essouassi' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hebira' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ksour Essef' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mahdia' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Melloulèche' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ouled Chamekh' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Rejiche' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Alouane' FROM governorate g WHERE g.name = 'Mahdia Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Manouba Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Borj El Amri' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Den Den' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Djedeida' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Douar Hicher' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Battan' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Manouba' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mornaguia' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Oued Ellil' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tebourba' FROM governorate g WHERE g.name = 'Manouba Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Médenine Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ben Gardane' FROM governorate g WHERE g.name = 'Médenine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Beni Khedache' FROM governorate g WHERE g.name = 'Médenine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Djerba Ajim' FROM governorate g WHERE g.name = 'Médenine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Djerba Houmt Souk' FROM governorate g WHERE g.name = 'Médenine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Djerba Midoun' FROM governorate g WHERE g.name = 'Médenine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Médenine' FROM governorate g WHERE g.name = 'Médenine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Makhlouf' FROM governorate g WHERE g.name = 'Médenine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Zarzis' FROM governorate g WHERE g.name = 'Médenine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Monastir Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Amiret El Fhoul' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Amiret El Hojjaj' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Amiret Touazra' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bekalta' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bembla' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Benen Bodher' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bouhjar' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Cherahil' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Masdour' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Jemmal' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ksar Hellal' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ksibet El Mediouni' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Lemta' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Ennour' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Farsi' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Hayet' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Kamel' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Moknine' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sayada' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Bennour' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Téboulba' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Touza' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Zaouiet Kontoch' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ghenada' FROM governorate g WHERE g.name = 'Monastir Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Nabeul Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Azmour' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Béni Khalled' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Béni Khiar' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bou Argoub' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Dar Allouch' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Dar Châabane El Fehri' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Haouaria' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Maâmoura' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Mida' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Fondouk Jedid - Seltene' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Grombalia' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hammam Ghezèze' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hammamet' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kelibia' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Korba' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Korbous' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Bouzelfa' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Horr' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Temime' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Nabeul' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Soliman' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Somâa' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Takelsa' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tazarka' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Zaouiet Djedidi' FROM governorate g WHERE g.name = 'Nabeul Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Sfax Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Agareb' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bir Ali Ben Khalifa' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Amra' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Hencha' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Graïba' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Jebiniana' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kerkennah' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mahrès' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Chaker' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sakiet Eddaïer' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sakiet Ezzit' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sfax' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Skhira' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Thyna' FROM governorate g WHERE g.name = 'Sfax Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Sidi Bouzid Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bir El Hafey' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Cebbala Ouled Asker' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Hichria' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Essaïda' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Jilma' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Meknassy' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Menzel Bouzaiane' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Mezzouna' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ouled Haffouz' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Regueb' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Ali Ben Aoun' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Bouzid' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Souk Jedid' FROM governorate g WHERE g.name = 'Sidi Bouzid Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Siliana Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bargou' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bou Arada' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Aroussa' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Krib' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Gaâfour' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kesra' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Makthar' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Rouhia' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Bou Rouis' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Siliana' FROM governorate g WHERE g.name = 'Siliana Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Sousse Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Akouda' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bouficha' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Enfida' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hammam Sousse' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hergla' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kalâa Kebira' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kalâa Seghira' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Kondar' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'M''saken' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Bou Ali' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi El Hani' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sousse' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Zaouiet Ksibet Thrayet' FROM governorate g WHERE g.name = 'Sousse Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Tataouine Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Beni Mehira' FROM governorate g WHERE g.name = 'Tataouine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bir Lahmar' FROM governorate g WHERE g.name = 'Tataouine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Dehiba' FROM governorate g WHERE g.name = 'Tataouine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Ghomrassen' FROM governorate g WHERE g.name = 'Tataouine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Remada' FROM governorate g WHERE g.name = 'Tataouine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Smâr' FROM governorate g WHERE g.name = 'Tataouine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tataouine' FROM governorate g WHERE g.name = 'Tataouine Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Tozeur Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Degache' FROM governorate g WHERE g.name = 'Tozeur Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Hamma du Jérid' FROM governorate g WHERE g.name = 'Tozeur Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Hazoua' FROM governorate g WHERE g.name = 'Tozeur Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Nefta' FROM governorate g WHERE g.name = 'Tozeur Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tamerza' FROM governorate g WHERE g.name = 'Tozeur Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tozeur' FROM governorate g WHERE g.name = 'Tozeur Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Tunis Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Carthage' FROM governorate g WHERE g.name = 'Tunis Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Le Bardo' FROM governorate g WHERE g.name = 'Tunis Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'La Goulette' FROM governorate g WHERE g.name = 'Tunis Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Le Kram' FROM governorate g WHERE g.name = 'Tunis Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'La Marsa' FROM governorate g WHERE g.name = 'Tunis Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Bou Said' FROM governorate g WHERE g.name = 'Tunis Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Sidi Hassine' FROM governorate g WHERE g.name = 'Tunis Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Tunis' FROM governorate g WHERE g.name = 'Tunis Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;

INSERT INTO governorate (name) VALUES ('Zaghouan Governorate') ON CONFLICT (name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Bir Mcherga' FROM governorate g WHERE g.name = 'Zaghouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Djebel Oust' FROM governorate g WHERE g.name = 'Zaghouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'El Fahs' FROM governorate g WHERE g.name = 'Zaghouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Nadhour' FROM governorate g WHERE g.name = 'Zaghouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Saouaf' FROM governorate g WHERE g.name = 'Zaghouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Zaghouan' FROM governorate g WHERE g.name = 'Zaghouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
INSERT INTO delegation ("governorateId", name) SELECT g.id, 'Zriba' FROM governorate g WHERE g.name = 'Zaghouan Governorate' ON CONFLICT ("governorateId", name) DO NOTHING;
