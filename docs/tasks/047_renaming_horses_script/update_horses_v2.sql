-- Одноразовое обновление кличек лошадей по данным to_change_v2.json.
-- Сгенерировано для 35 записей. Скрипт атомарен: любая ошибка откатывает все изменения.

BEGIN;

CREATE TEMP TABLE tmp_horse_rename_v2 (
    id uuid PRIMARY KEY,
    name varchar(63) NOT NULL,
    pedigree_name varchar(63) NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_horse_rename_v2 (id, name, pedigree_name)
VALUES
    ('d2c1b933-3ed2-52f0-b69f-f34d82582097'::uuid, 'Corners Iyala', 'Corners Iyala (NDR)'),
    ('395710b8-b598-53ac-874e-fbc06cae08ce'::uuid, 'Coed Coch Aden', 'Coed Coch Aden (GB)'),
    ('f3a83ca5-7e2e-5eef-8dcf-7d1515a4cb6f'::uuid, 'Lemonshill Royal Flight', 'Lemonshill Royal Flight (GB)'),
    ('df06d51e-fd00-5a99-9e63-de138e6b05b5'::uuid, 'Amandas Kelly', 'Amandas Kelly (NDR)'),
    ('2e4748cd-f2e7-55d2-acd8-792f4d589e71'::uuid, 'Cwmnantgwyn Penadur', 'Cwmnantgwyn Penadur (GB)'),
    ('38cadb5c-4101-5cb5-934f-b0077bd8c482'::uuid, 'Stj Tinka''s Beauty', 'Stj Tinka''s Beauty (NDR)'),
    ('a5ccb2d6-7db6-50cc-83e3-28b1996afb4e'::uuid, 'Vikariens Jolyon', 'Vikariens Jolyon (NDR)'),
    ('43c9c8ba-7a59-4533-a10a-00fb97cb0a52'::uuid, 'Kraling''s Elias', 'Kraling''s Elias (NDR)'),
    ('d4a10eb3-cf0a-436c-9242-e1cb48eb1306'::uuid, 'Coed Coch Berwynfa', 'Coed Coch Berwynfa (GB)'),
    ('a9fec430-b7d2-5052-9a5b-d2d2603a1a7d'::uuid, 'Sarnau Pelydrog', 'Sarnau Pelydrog (GB)'),
    ('1f4440c9-11bc-5a09-867c-30685af68fb5'::uuid, 'Tetworth Kimono', 'Tetworth Kimono (GB)'),
    ('d93fc53c-49e4-4621-b319-dcd5a16f9e24'::uuid, 'Corners Cold Lady', 'Corners Cold Lady (NDR)'),
    ('0d029bb1-0d2b-47a8-8a9b-70a63d2654bd'::uuid, 'Coed Coch Deryn', 'Coed Coch Deryn (GB)'),
    ('7049a21b-5359-44fe-94eb-08b239e141ac'::uuid, 'Pendock Penny Black', 'Pendock Penny Black (GB)'),
    ('8083e9be-11d8-4a73-b25e-f89bcbc51a64'::uuid, 'Hengelhoef''s Datiska', 'Hengelhoef''s Datiska (NDR)'),
    ('b7c53719-920b-4904-8537-ab7ab122a37e'::uuid, 'Sarnau Jessica', 'Sarnau Jessica (GB)'),
    ('3e9db661-a6e0-4a55-8428-7451d81484ae'::uuid, 'Ysselvliedt''s Glamour Boy', 'Ysselvliedt''s Glamour Boy (NDR)'),
    ('96dcdc22-edbc-4a07-becd-bd6472612341'::uuid, 'Downland Mandarin', 'Downland Mandarin (GB)'),
    ('0209c8e0-a178-446c-a404-6a496608059b'::uuid, 'Vechtzicht''s Hywel', 'Vechtzicht''s Hywel (NDR)'),
    ('4b68b772-e890-4140-a21b-a9e9b364bbf7'::uuid, 'Powys Sant', 'Powys Sant (GB)'),
    ('4bc1f1c1-90a6-4c15-a9c1-cd3fd1b2783e'::uuid, 'Tetworth Terracotta', 'Tetworth Terracotta (GB)'),
    ('0c69da32-d110-4c0f-9752-327f3ad197e3'::uuid, 'Cwmsarah Jasmin', 'Cwmsarah Jasmin (GB)'),
    ('a5a07a07-2180-4cab-a1fb-79c54aa2d9ae'::uuid, 'Coed Coch Penadur', 'Coed Coch Penadur (GB)'),
    ('2d65e2ff-c139-4db1-b9fe-b1c9bb468336'::uuid, 'Cwmnantgwyn Cadbury', 'Cwmnantgwyn Cadbury (GB)'),
    ('c6dc40b7-33d7-53cd-a58c-47a767a6532e'::uuid, 'Ysselvliedt''s Kasparov', 'Ysselvliedt''s Kasparov (NDR)'),
    ('174746ee-c029-41de-954b-93db6874ce0c'::uuid, 'Must Be Magic', 'Must Be Magic (GER)'),
    ('34d833fc-334d-530a-b2b6-b29656092d0f'::uuid, 'Cwmsarah Awel', 'Cwmsarah Awel (GB)'),
    ('8658fbb2-d04d-5cb5-ba8a-b7ac33a8b058'::uuid, 'Rotherwood State Occasion', 'Rotherwood State Occasion (GB)'),
    ('5000617c-d1a1-4fcc-973a-47d3b6741b26'::uuid, 'Knolton Gwenan', 'Knolton Gwenan (GB)'),
    ('3668ea5c-3241-5049-915a-f7de5ca6f9d6'::uuid, 'Бабочка', '0307 Бабочка'),
    ('c89c9d0c-680d-5818-a39f-8c7c62a30f9a'::uuid, 'Белоснежка', ' 0306 Белоснежка'),
    ('98c51e67-766d-41fa-bce0-90235737d009'::uuid, 'Keston Royal Occasion', 'Keston Royal Occasion (GB)'),
    ('bad67d6d-344a-47ac-a4b4-30e6796dae4d'::uuid, 'Vechtzicht''s Harmony', 'Vechtzicht''s Harmony (NDR)'),
    ('dc9f2706-1e53-5aca-9cdb-fb74ef2cdc70'::uuid, 'Tinkerbel', 'Tinkerbel (NDR)'),
    ('dfdb6b86-6cca-4869-8ea7-c7e93a6e6b32'::uuid, 'Vikarien''s Justine', 'Vikarien''s Justine (NDR)');

DO $$
DECLARE
    source_count integer;
    missing_count integer;
    conflict_count integer;
BEGIN
    SELECT count(*) INTO source_count FROM tmp_horse_rename_v2;
    IF source_count <> 35 THEN
        RAISE EXCEPTION 'Expected 35 source rows, got %', source_count;
    END IF;

    SELECT count(*)
      INTO missing_count
      FROM tmp_horse_rename_v2 AS source
      LEFT JOIN horse AS target ON target.id = source.id
     WHERE target.id IS NULL;

    IF missing_count <> 0 THEN
        RAISE EXCEPTION '% horse UUID(s) do not exist; no rows were updated', missing_count;
    END IF;

    SELECT count(*)
      INTO conflict_count
      FROM tmp_horse_rename_v2 AS source
      JOIN horse AS target ON target.id = source.id
     WHERE target.name IS DISTINCT FROM source.pedigree_name
        OR target.pedigree_name IS NOT NULL;

    IF conflict_count <> 0 THEN
        RAISE EXCEPTION '% horse row(s) differ from the expected source state; no rows were updated', conflict_count;
    END IF;
END
$$;

UPDATE horse AS target
   SET name = source.name,
       pedigree_name = source.pedigree_name
  FROM tmp_horse_rename_v2 AS source
 WHERE target.id = source.id;

DO $$
DECLARE
    invalid_count integer;
BEGIN
    SELECT count(*)
      INTO invalid_count
      FROM tmp_horse_rename_v2 AS source
      JOIN horse AS target ON target.id = source.id
     WHERE target.name IS DISTINCT FROM source.name
        OR target.pedigree_name IS DISTINCT FROM source.pedigree_name;

    IF invalid_count <> 0 THEN
        RAISE EXCEPTION '% horse row(s) failed post-update verification', invalid_count;
    END IF;
END
$$;

COMMIT;
