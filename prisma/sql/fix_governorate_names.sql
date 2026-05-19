-- Safe governorate name cleanup (run manually if needed).

UPDATE governorate SET name = TRIM(REPLACE(name, ' Governorate', '')) WHERE name LIKE '% Governorate%';

CREATE OR REPLACE FUNCTION _jam3iya_merge_governorate(canonical TEXT, pattern TEXT) RETURNS void AS $$
DECLARE
  keep_id INT;
  drop_id INT;
BEGIN
  SELECT id INTO keep_id FROM governorate WHERE name = canonical LIMIT 1;
  IF keep_id IS NULL THEN
    SELECT MIN(id) INTO keep_id FROM governorate g WHERE lower(g.name) LIKE pattern AND g.name <> canonical;
    IF keep_id IS NOT NULL THEN
      UPDATE governorate SET name = canonical WHERE id = keep_id;
    END IF;
  END IF;
  IF keep_id IS NULL THEN
    RETURN;
  END IF;

  FOR drop_id IN
    SELECT g.id FROM governorate g
    WHERE lower(g.name) LIKE pattern AND g.id <> keep_id
  LOOP
    DELETE FROM delegation d_drop
    USING delegation d_keep
    WHERE d_drop."governorateId" = drop_id
      AND d_keep."governorateId" = keep_id
      AND d_keep.name = d_drop.name;
    UPDATE delegation SET "governorateId" = keep_id WHERE "governorateId" = drop_id;
    DELETE FROM governorate WHERE id = drop_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT _jam3iya_merge_governorate('Béja', '%b%ja%');
SELECT _jam3iya_merge_governorate('Gabès', '%gab%s%');
SELECT _jam3iya_merge_governorate('Kébili', '%k%bili%');
SELECT _jam3iya_merge_governorate('Médenine', '%m%denine%');

DROP FUNCTION _jam3iya_merge_governorate(TEXT, TEXT);

DELETE FROM governorate a USING governorate b
WHERE a.id > b.id AND lower(trim(a.name)) = lower(trim(b.name));
