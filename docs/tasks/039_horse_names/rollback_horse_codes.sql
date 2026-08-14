-- SQL script to rollback horse pedigree codes
-- Sets code to NULL for all horses that were updated
-- Total horses to rollback: 131

BEGIN;

UPDATE horse SET code = NULL WHERE id = 'd48cd34d-9fbc-4388-8aee-7cc2e1f2a408'::uuid;
UPDATE horse SET code = NULL WHERE id = 'd90d1c1a-c9b6-4a66-bbcd-8d89e925c5bb'::uuid;
UPDATE horse SET code = NULL WHERE id = '162270d1-3b31-4b51-83e1-2e55f355f83e'::uuid;
UPDATE horse SET code = NULL WHERE id = 'bd43e477-1a8c-481b-bf91-c4051f5e9f54'::uuid;
UPDATE horse SET code = NULL WHERE id = 'd9dcd9cb-4b2b-4590-890d-b58212cf63ed'::uuid;
UPDATE horse SET code = NULL WHERE id = '42e965c6-c872-418c-af17-cbc89115eb86'::uuid;
UPDATE horse SET code = NULL WHERE id = '0731cafc-7587-4b5a-999f-69220790331e'::uuid;
UPDATE horse SET code = NULL WHERE id = 'a14369f0-0481-48a8-aff4-479b3991e724'::uuid;
UPDATE horse SET code = NULL WHERE id = 'e075dec1-47f3-4248-a9ce-5e1d3b21e4d4'::uuid;
UPDATE horse SET code = NULL WHERE id = '2ded3cb8-bf07-4c07-959f-f9a6a25b33f2'::uuid;
UPDATE horse SET code = NULL WHERE id = '7a909c73-6a6f-4375-b8ad-693e5510b8db'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f5a6c8c4-5ca6-5609-847f-328370e6227f'::uuid;
UPDATE horse SET code = NULL WHERE id = '5fd5ba65-0210-54b7-848c-39efbdfa6239'::uuid;
UPDATE horse SET code = NULL WHERE id = '46011bd9-8cea-507b-913e-550f330e68c1'::uuid;
UPDATE horse SET code = NULL WHERE id = '093d05f1-5398-507e-bf47-32896e78745a'::uuid;
UPDATE horse SET code = NULL WHERE id = '7d11c6b9-b923-4768-9e43-80fbec3b266b'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f0aef203-ff0c-5af1-a1dd-07433972a1ce'::uuid;
UPDATE horse SET code = NULL WHERE id = '82969eb6-68c9-59e4-9d92-f5f276107c09'::uuid;
UPDATE horse SET code = NULL WHERE id = '9909204f-adb4-5e38-a86c-47f5706e7e6f'::uuid;
UPDATE horse SET code = NULL WHERE id = '48d4f120-8475-5e21-b414-badd00273dec'::uuid;
UPDATE horse SET code = NULL WHERE id = '4d9cb7d6-472d-5669-96dc-c8ca74becbce'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f432ba16-be36-5c27-aa50-a950ad997e4e'::uuid;
UPDATE horse SET code = NULL WHERE id = 'ffa3d17e-1d23-4419-86aa-22882d8a65c4'::uuid;
UPDATE horse SET code = NULL WHERE id = '6f6aed30-fcfa-4ab1-b5a3-fecddd4a9cb7'::uuid;
UPDATE horse SET code = NULL WHERE id = 'ada4a185-3f63-4f7e-a925-40481d651ee0'::uuid;
UPDATE horse SET code = NULL WHERE id = '46cb4b1a-54f4-5199-9f7f-8f0584e7713b'::uuid;
UPDATE horse SET code = NULL WHERE id = 'c23bf373-e0bc-5bd4-9411-ea88cf842a98'::uuid;
UPDATE horse SET code = NULL WHERE id = '39eb75ce-055f-5f2a-bd22-7c1551867939'::uuid;
UPDATE horse SET code = NULL WHERE id = '798a20be-81eb-4a2f-acd9-e61580fd2cdb'::uuid;
UPDATE horse SET code = NULL WHERE id = '285252a8-9a61-4c13-8655-f7cc19ee0e14'::uuid;
UPDATE horse SET code = NULL WHERE id = 'c8eed635-2b18-4d36-9651-68fd37f0a5bc'::uuid;
UPDATE horse SET code = NULL WHERE id = 'e74a4d10-0b7a-412d-901a-bbb23507a9b2'::uuid;
UPDATE horse SET code = NULL WHERE id = 'eaf4ab61-3360-52d0-8be9-ba6962deaf27'::uuid;
UPDATE horse SET code = NULL WHERE id = '002da03e-7d38-5ffb-bf0d-d8eab345f147'::uuid;
UPDATE horse SET code = NULL WHERE id = '0dd713e4-216b-4439-bdfa-2ac0c5ef2f6c'::uuid;
UPDATE horse SET code = NULL WHERE id = 'c93b0166-4a20-5a72-8342-0d698523247e'::uuid;
UPDATE horse SET code = NULL WHERE id = '48de1205-6d11-59e1-a2af-4e5531d462ca'::uuid;
UPDATE horse SET code = NULL WHERE id = '23debf7e-438e-517d-ba17-e1b5407cbadf'::uuid;
UPDATE horse SET code = NULL WHERE id = '55e6fe16-7424-58b1-8fb8-0300f4c8d4ea'::uuid;
UPDATE horse SET code = NULL WHERE id = 'c0f2f8b3-ebe6-5412-a043-55c67217b56e'::uuid;
UPDATE horse SET code = NULL WHERE id = 'a5865be5-7b81-54a3-8318-736f90a833f4'::uuid;
UPDATE horse SET code = NULL WHERE id = 'b49f437b-06d1-4398-ae0f-d40441833e22'::uuid;
UPDATE horse SET code = NULL WHERE id = '731b9398-7e4e-49d6-b764-884831db9d12'::uuid;
UPDATE horse SET code = NULL WHERE id = '0473ac5a-c2f7-5cc3-b0f7-2f911d2a9e51'::uuid;
UPDATE horse SET code = NULL WHERE id = '2a9e35aa-44ca-5f63-84cb-2a3f4f2ff4bc'::uuid;
UPDATE horse SET code = NULL WHERE id = '3f72431d-15f8-5c51-a20f-aa0b4f05cfc3'::uuid;
UPDATE horse SET code = NULL WHERE id = '7ea40fc6-79be-576d-a3ef-ec6465a8cf1b'::uuid;
UPDATE horse SET code = NULL WHERE id = 'fbab59b1-f8bf-50ec-aeca-0d50e998e6c4'::uuid;
UPDATE horse SET code = NULL WHERE id = 'fcce4887-ad8f-5037-9faf-ca1ca527de02'::uuid;
UPDATE horse SET code = NULL WHERE id = '03774d99-9fa0-57cf-9c65-72741b0005a8'::uuid;
UPDATE horse SET code = NULL WHERE id = 'de6fffcb-2587-5add-98b1-cc9501a6d7e5'::uuid;
UPDATE horse SET code = NULL WHERE id = '8b2a8bcf-0f4e-5ab6-924b-795ce7260aa0'::uuid;
UPDATE horse SET code = NULL WHERE id = 'befcb051-7fd9-5755-aefb-2f084d299243'::uuid;
UPDATE horse SET code = NULL WHERE id = 'fe43b914-c8ce-5386-b01f-6446a5cf8f4c'::uuid;
UPDATE horse SET code = NULL WHERE id = '49d0b8c7-75e0-5477-a033-889d880a3fc6'::uuid;
UPDATE horse SET code = NULL WHERE id = '04c181be-415e-5cf1-8fc6-5b92b43c97aa'::uuid;
UPDATE horse SET code = NULL WHERE id = '56acd058-42df-41be-8230-3a2c1f6d4590'::uuid;
UPDATE horse SET code = NULL WHERE id = 'e79c9d6c-8dcd-5c24-ae71-607481c0ec0b'::uuid;
UPDATE horse SET code = NULL WHERE id = '31edfbf8-f076-5b97-ad23-486beac420a1'::uuid;
UPDATE horse SET code = NULL WHERE id = '9fcb1799-1885-5a80-beff-fb310de0bc13'::uuid;
UPDATE horse SET code = NULL WHERE id = '32b4c80a-2cb9-5721-8b5a-f311cca5152c'::uuid;
UPDATE horse SET code = NULL WHERE id = '20dd8fe5-48ca-5610-9c71-e1b1b8bdf600'::uuid;
UPDATE horse SET code = NULL WHERE id = 'cd3a10c4-52f5-4b1a-a268-5b78a479c513'::uuid;
UPDATE horse SET code = NULL WHERE id = '14db9a5a-fd6d-5f92-84b1-e6bc1ef2fc3d'::uuid;
UPDATE horse SET code = NULL WHERE id = '783abe00-09cb-5148-a446-1c2cab56f03b'::uuid;
UPDATE horse SET code = NULL WHERE id = 'fbf143c0-de52-481c-837d-14af0f7d9716'::uuid;
UPDATE horse SET code = NULL WHERE id = '2eeeb016-e657-5041-be40-d563ac98f6a1'::uuid;
UPDATE horse SET code = NULL WHERE id = '65a26d0f-0665-5ddd-ad9d-0d80de96827d'::uuid;
UPDATE horse SET code = NULL WHERE id = '982e85de-dea6-5b20-ab36-18e2b12ee793'::uuid;
UPDATE horse SET code = NULL WHERE id = '2d88947e-417d-57a6-ab97-9435f895a709'::uuid;
UPDATE horse SET code = NULL WHERE id = '0ebbeeee-f182-550a-baa7-07737ace8153'::uuid;
UPDATE horse SET code = NULL WHERE id = '9b900c7f-5c6d-5bd2-8c5d-b1e99e96c3d8'::uuid;
UPDATE horse SET code = NULL WHERE id = 'ce1ac1d7-f011-5728-b4df-7bc96e266b1f'::uuid;
UPDATE horse SET code = NULL WHERE id = '212e59bd-f603-5ace-a5c0-53e769132c03'::uuid;
UPDATE horse SET code = NULL WHERE id = '9103f4e3-9719-4486-84a2-5088c05f27d0'::uuid;
UPDATE horse SET code = NULL WHERE id = '083078ee-b917-5ba7-81c1-4e9794276f9e'::uuid;
UPDATE horse SET code = NULL WHERE id = '2053f12e-39aa-4ec8-8dea-75905abdeae0'::uuid;
UPDATE horse SET code = NULL WHERE id = '629e701f-0db8-4cf6-b54c-4838de49f371'::uuid;
UPDATE horse SET code = NULL WHERE id = 'a0f096ae-112e-5696-9720-20f0ad531e9a'::uuid;
UPDATE horse SET code = NULL WHERE id = 'ee5643c8-f090-458b-8f77-30dc34be3686'::uuid;
UPDATE horse SET code = NULL WHERE id = '05c89b7e-2518-56ac-a669-412bdcb467e8'::uuid;
UPDATE horse SET code = NULL WHERE id = '893f8972-77de-429e-a073-8721cd5df939'::uuid;
UPDATE horse SET code = NULL WHERE id = '0eaad7e3-e2b9-5c60-b7e3-472d532bafd7'::uuid;
UPDATE horse SET code = NULL WHERE id = '12945236-e19d-4f40-be45-d989ddb9d619'::uuid;
UPDATE horse SET code = NULL WHERE id = '732e7ca7-a61e-5d81-b942-bf87adaded1f'::uuid;
UPDATE horse SET code = NULL WHERE id = '35650056-bcc5-59e1-a7a7-45df5b593cca'::uuid;
UPDATE horse SET code = NULL WHERE id = 'b44407a1-22fe-5f79-8e52-849d261272dd'::uuid;
UPDATE horse SET code = NULL WHERE id = 'ae43afc7-81ce-58fd-a107-8844cfc1d493'::uuid;
UPDATE horse SET code = NULL WHERE id = '478fdf55-76c6-5551-a177-329fafe2d90a'::uuid;
UPDATE horse SET code = NULL WHERE id = 'eec237ce-49d7-4f37-b946-86d88248bebb'::uuid;
UPDATE horse SET code = NULL WHERE id = '18f27b20-3b80-4ef1-ba1e-593ec3c20ce3'::uuid;
UPDATE horse SET code = NULL WHERE id = '5fdec16d-0e5c-5f09-9b22-a8c697bb77d3'::uuid;
UPDATE horse SET code = NULL WHERE id = 'fd7f3978-9b42-4872-906c-c32f488af0f7'::uuid;
UPDATE horse SET code = NULL WHERE id = 'cdfc05b0-d12c-5ce1-96ce-6746508b87bf'::uuid;
UPDATE horse SET code = NULL WHERE id = '95e98ad1-a54e-56b0-81df-1c2ffd4d1188'::uuid;
UPDATE horse SET code = NULL WHERE id = '5811229c-620b-5ede-94a4-e236901b35d6'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f039f131-6bc4-4e0e-b0d0-3c17305d0e0a'::uuid;
UPDATE horse SET code = NULL WHERE id = '97f678bf-8306-54f5-b32b-474bf6a6fcc5'::uuid;
UPDATE horse SET code = NULL WHERE id = '54d9cc9e-e358-5c55-b411-606dd2d8ae01'::uuid;
UPDATE horse SET code = NULL WHERE id = 'cb0ce3c4-9d48-5824-9654-ddc0a6d4a9ff'::uuid;
UPDATE horse SET code = NULL WHERE id = '7c17239a-7be3-5f77-8092-d1e6c7732414'::uuid;
UPDATE horse SET code = NULL WHERE id = '3edf07a9-c792-525e-8049-247c7dc878d2'::uuid;
UPDATE horse SET code = NULL WHERE id = '50bec9ea-57cb-40e3-afb0-a4c720cb82db'::uuid;
UPDATE horse SET code = NULL WHERE id = 'a67d5944-4c88-5918-a92c-5cfb32fd2cf1'::uuid;
UPDATE horse SET code = NULL WHERE id = '430f67a9-e3b1-5f07-971c-81f5501cfb69'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f43c2512-a85e-4185-b7d5-801e9d8fe00a'::uuid;
UPDATE horse SET code = NULL WHERE id = '25ba7f96-ff1c-4968-8b82-fb0fa983ef77'::uuid;
UPDATE horse SET code = NULL WHERE id = '88e2d87b-6e09-5e1a-91d2-17c92fde5207'::uuid;
UPDATE horse SET code = NULL WHERE id = '9d456237-f38c-50cb-b7b6-673a716b7aa0'::uuid;
UPDATE horse SET code = NULL WHERE id = '3973028a-88c2-5c32-a2e1-7af5c4721db3'::uuid;
UPDATE horse SET code = NULL WHERE id = '288010e0-81d8-5e42-ba0b-4aec068e77a2'::uuid;
UPDATE horse SET code = NULL WHERE id = '86b27879-7089-5ca9-bbcf-7f629cc9c919'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f1df55d3-639a-5127-96e3-b8cb67836d8d'::uuid;
UPDATE horse SET code = NULL WHERE id = '7bf0ea8c-f5ec-4b54-b72a-1f8b5e2db97a'::uuid;
UPDATE horse SET code = NULL WHERE id = 'b1e917c4-2e56-503b-a9a3-a59f68bc197b'::uuid;
UPDATE horse SET code = NULL WHERE id = 'd964bdf8-50a2-41fd-8c8a-b743f6067139'::uuid;
UPDATE horse SET code = NULL WHERE id = 'a1936b21-9975-4686-9f70-13f5cc36bbff'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f9774cce-0eff-4c96-a089-bf1aa19b9c7e'::uuid;
UPDATE horse SET code = NULL WHERE id = 'e24befdf-5d0c-5317-a8b6-e5d2076d42b3'::uuid;
UPDATE horse SET code = NULL WHERE id = 'ac07b0a2-2865-50f1-bc2d-c4da9d032d25'::uuid;
UPDATE horse SET code = NULL WHERE id = '9f20840f-17d9-4386-b849-4cc28ab85e15'::uuid;
UPDATE horse SET code = NULL WHERE id = '35cc1656-372a-4aa7-96b5-08e7844cd869'::uuid;
UPDATE horse SET code = NULL WHERE id = 'ae5315d3-e849-5e86-80c3-c65c8bbf2663'::uuid;
UPDATE horse SET code = NULL WHERE id = 'd9a50851-baa6-53a4-9eac-209dc23fed89'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f0ff7042-996c-49c8-8508-634fbbbe6377'::uuid;
UPDATE horse SET code = NULL WHERE id = 'cb44b58c-587b-5092-9d3d-f14487e692c4'::uuid;
UPDATE horse SET code = NULL WHERE id = '00698665-7061-59d0-a435-978ab605ab98'::uuid;
UPDATE horse SET code = NULL WHERE id = '5d7c57c3-4366-4b8a-b02f-b796fe068f85'::uuid;
UPDATE horse SET code = NULL WHERE id = 'f17b73aa-10f5-4171-911d-920feb76e1ab'::uuid;
UPDATE horse SET code = NULL WHERE id = 'ef514972-d3cb-4ecb-861b-8449c2013cd8'::uuid;
UPDATE horse SET code = NULL WHERE id = 'a6d028c9-c740-41d6-9588-5ee8a328fe37'::uuid;

COMMIT;

-- Verification query:
-- SELECT id, name, code FROM horse WHERE id IN (
  'd48cd34d-9fbc-4388-8aee-7cc2e1f2a408'::uuid,
  'd90d1c1a-c9b6-4a66-bbcd-8d89e925c5bb'::uuid,
  '162270d1-3b31-4b51-83e1-2e55f355f83e'::uuid,
  'bd43e477-1a8c-481b-bf91-c4051f5e9f54'::uuid,
  'd9dcd9cb-4b2b-4590-890d-b58212cf63ed'::uuid,
  '42e965c6-c872-418c-af17-cbc89115eb86'::uuid,
  '0731cafc-7587-4b5a-999f-69220790331e'::uuid,
  'a14369f0-0481-48a8-aff4-479b3991e724'::uuid,
  'e075dec1-47f3-4248-a9ce-5e1d3b21e4d4'::uuid,
  '2ded3cb8-bf07-4c07-959f-f9a6a25b33f2'::uuid,
  '7a909c73-6a6f-4375-b8ad-693e5510b8db'::uuid,
  'f5a6c8c4-5ca6-5609-847f-328370e6227f'::uuid,
  '5fd5ba65-0210-54b7-848c-39efbdfa6239'::uuid,
  '46011bd9-8cea-507b-913e-550f330e68c1'::uuid,
  '093d05f1-5398-507e-bf47-32896e78745a'::uuid,
  '7d11c6b9-b923-4768-9e43-80fbec3b266b'::uuid,
  'f0aef203-ff0c-5af1-a1dd-07433972a1ce'::uuid,
  '82969eb6-68c9-59e4-9d92-f5f276107c09'::uuid,
  '9909204f-adb4-5e38-a86c-47f5706e7e6f'::uuid,
  '48d4f120-8475-5e21-b414-badd00273dec'::uuid,
  '4d9cb7d6-472d-5669-96dc-c8ca74becbce'::uuid,
  'f432ba16-be36-5c27-aa50-a950ad997e4e'::uuid,
  'ffa3d17e-1d23-4419-86aa-22882d8a65c4'::uuid,
  '6f6aed30-fcfa-4ab1-b5a3-fecddd4a9cb7'::uuid,
  'ada4a185-3f63-4f7e-a925-40481d651ee0'::uuid,
  '46cb4b1a-54f4-5199-9f7f-8f0584e7713b'::uuid,
  'c23bf373-e0bc-5bd4-9411-ea88cf842a98'::uuid,
  '39eb75ce-055f-5f2a-bd22-7c1551867939'::uuid,
  '798a20be-81eb-4a2f-acd9-e61580fd2cdb'::uuid,
  '285252a8-9a61-4c13-8655-f7cc19ee0e14'::uuid,
  'c8eed635-2b18-4d36-9651-68fd37f0a5bc'::uuid,
  'e74a4d10-0b7a-412d-901a-bbb23507a9b2'::uuid,
  'eaf4ab61-3360-52d0-8be9-ba6962deaf27'::uuid,
  '002da03e-7d38-5ffb-bf0d-d8eab345f147'::uuid,
  '0dd713e4-216b-4439-bdfa-2ac0c5ef2f6c'::uuid,
  'c93b0166-4a20-5a72-8342-0d698523247e'::uuid,
  '48de1205-6d11-59e1-a2af-4e5531d462ca'::uuid,
  '23debf7e-438e-517d-ba17-e1b5407cbadf'::uuid,
  '55e6fe16-7424-58b1-8fb8-0300f4c8d4ea'::uuid,
  'c0f2f8b3-ebe6-5412-a043-55c67217b56e'::uuid,
  'a5865be5-7b81-54a3-8318-736f90a833f4'::uuid,
  'b49f437b-06d1-4398-ae0f-d40441833e22'::uuid,
  '731b9398-7e4e-49d6-b764-884831db9d12'::uuid,
  '0473ac5a-c2f7-5cc3-b0f7-2f911d2a9e51'::uuid,
  '2a9e35aa-44ca-5f63-84cb-2a3f4f2ff4bc'::uuid,
  '3f72431d-15f8-5c51-a20f-aa0b4f05cfc3'::uuid,
  '7ea40fc6-79be-576d-a3ef-ec6465a8cf1b'::uuid,
  'fbab59b1-f8bf-50ec-aeca-0d50e998e6c4'::uuid,
  'fcce4887-ad8f-5037-9faf-ca1ca527de02'::uuid,
  '03774d99-9fa0-57cf-9c65-72741b0005a8'::uuid,
  'de6fffcb-2587-5add-98b1-cc9501a6d7e5'::uuid,
  '8b2a8bcf-0f4e-5ab6-924b-795ce7260aa0'::uuid,
  'befcb051-7fd9-5755-aefb-2f084d299243'::uuid,
  'fe43b914-c8ce-5386-b01f-6446a5cf8f4c'::uuid,
  '49d0b8c7-75e0-5477-a033-889d880a3fc6'::uuid,
  '04c181be-415e-5cf1-8fc6-5b92b43c97aa'::uuid,
  '56acd058-42df-41be-8230-3a2c1f6d4590'::uuid,
  'e79c9d6c-8dcd-5c24-ae71-607481c0ec0b'::uuid,
  '31edfbf8-f076-5b97-ad23-486beac420a1'::uuid,
  '9fcb1799-1885-5a80-beff-fb310de0bc13'::uuid,
  '32b4c80a-2cb9-5721-8b5a-f311cca5152c'::uuid,
  '20dd8fe5-48ca-5610-9c71-e1b1b8bdf600'::uuid,
  'cd3a10c4-52f5-4b1a-a268-5b78a479c513'::uuid,
  '14db9a5a-fd6d-5f92-84b1-e6bc1ef2fc3d'::uuid,
  '783abe00-09cb-5148-a446-1c2cab56f03b'::uuid,
  'fbf143c0-de52-481c-837d-14af0f7d9716'::uuid,
  '2eeeb016-e657-5041-be40-d563ac98f6a1'::uuid,
  '65a26d0f-0665-5ddd-ad9d-0d80de96827d'::uuid,
  '982e85de-dea6-5b20-ab36-18e2b12ee793'::uuid,
  '2d88947e-417d-57a6-ab97-9435f895a709'::uuid,
  '0ebbeeee-f182-550a-baa7-07737ace8153'::uuid,
  '9b900c7f-5c6d-5bd2-8c5d-b1e99e96c3d8'::uuid,
  'ce1ac1d7-f011-5728-b4df-7bc96e266b1f'::uuid,
  '212e59bd-f603-5ace-a5c0-53e769132c03'::uuid,
  '9103f4e3-9719-4486-84a2-5088c05f27d0'::uuid,
  '083078ee-b917-5ba7-81c1-4e9794276f9e'::uuid,
  '2053f12e-39aa-4ec8-8dea-75905abdeae0'::uuid,
  '629e701f-0db8-4cf6-b54c-4838de49f371'::uuid,
  'a0f096ae-112e-5696-9720-20f0ad531e9a'::uuid,
  'ee5643c8-f090-458b-8f77-30dc34be3686'::uuid,
  '05c89b7e-2518-56ac-a669-412bdcb467e8'::uuid,
  '893f8972-77de-429e-a073-8721cd5df939'::uuid,
  '0eaad7e3-e2b9-5c60-b7e3-472d532bafd7'::uuid,
  '12945236-e19d-4f40-be45-d989ddb9d619'::uuid,
  '732e7ca7-a61e-5d81-b942-bf87adaded1f'::uuid,
  '35650056-bcc5-59e1-a7a7-45df5b593cca'::uuid,
  'b44407a1-22fe-5f79-8e52-849d261272dd'::uuid,
  'ae43afc7-81ce-58fd-a107-8844cfc1d493'::uuid,
  '478fdf55-76c6-5551-a177-329fafe2d90a'::uuid,
  'eec237ce-49d7-4f37-b946-86d88248bebb'::uuid,
  '18f27b20-3b80-4ef1-ba1e-593ec3c20ce3'::uuid,
  '5fdec16d-0e5c-5f09-9b22-a8c697bb77d3'::uuid,
  'fd7f3978-9b42-4872-906c-c32f488af0f7'::uuid,
  'cdfc05b0-d12c-5ce1-96ce-6746508b87bf'::uuid,
  '95e98ad1-a54e-56b0-81df-1c2ffd4d1188'::uuid,
  '5811229c-620b-5ede-94a4-e236901b35d6'::uuid,
  'f039f131-6bc4-4e0e-b0d0-3c17305d0e0a'::uuid,
  '97f678bf-8306-54f5-b32b-474bf6a6fcc5'::uuid,
  '54d9cc9e-e358-5c55-b411-606dd2d8ae01'::uuid,
  'cb0ce3c4-9d48-5824-9654-ddc0a6d4a9ff'::uuid,
  '7c17239a-7be3-5f77-8092-d1e6c7732414'::uuid,
  '3edf07a9-c792-525e-8049-247c7dc878d2'::uuid,
  '50bec9ea-57cb-40e3-afb0-a4c720cb82db'::uuid,
  'a67d5944-4c88-5918-a92c-5cfb32fd2cf1'::uuid,
  '430f67a9-e3b1-5f07-971c-81f5501cfb69'::uuid,
  'f43c2512-a85e-4185-b7d5-801e9d8fe00a'::uuid,
  '25ba7f96-ff1c-4968-8b82-fb0fa983ef77'::uuid,
  '88e2d87b-6e09-5e1a-91d2-17c92fde5207'::uuid,
  '9d456237-f38c-50cb-b7b6-673a716b7aa0'::uuid,
  '3973028a-88c2-5c32-a2e1-7af5c4721db3'::uuid,
  '288010e0-81d8-5e42-ba0b-4aec068e77a2'::uuid,
  '86b27879-7089-5ca9-bbcf-7f629cc9c919'::uuid,
  'f1df55d3-639a-5127-96e3-b8cb67836d8d'::uuid,
  '7bf0ea8c-f5ec-4b54-b72a-1f8b5e2db97a'::uuid,
  'b1e917c4-2e56-503b-a9a3-a59f68bc197b'::uuid,
  'd964bdf8-50a2-41fd-8c8a-b743f6067139'::uuid,
  'a1936b21-9975-4686-9f70-13f5cc36bbff'::uuid,
  'f9774cce-0eff-4c96-a089-bf1aa19b9c7e'::uuid,
  'e24befdf-5d0c-5317-a8b6-e5d2076d42b3'::uuid,
  'ac07b0a2-2865-50f1-bc2d-c4da9d032d25'::uuid,
  '9f20840f-17d9-4386-b849-4cc28ab85e15'::uuid,
  '35cc1656-372a-4aa7-96b5-08e7844cd869'::uuid,
  'ae5315d3-e849-5e86-80c3-c65c8bbf2663'::uuid,
  'd9a50851-baa6-53a4-9eac-209dc23fed89'::uuid,
  'f0ff7042-996c-49c8-8508-634fbbbe6377'::uuid,
  'cb44b58c-587b-5092-9d3d-f14487e692c4'::uuid,
  '00698665-7061-59d0-a435-978ab605ab98'::uuid,
  '5d7c57c3-4366-4b8a-b02f-b796fe068f85'::uuid,
  'f17b73aa-10f5-4171-911d-920feb76e1ab'::uuid,
  'ef514972-d3cb-4ecb-861b-8449c2013cd8'::uuid,
  'a6d028c9-c740-41d6-9588-5ee8a328fe37'::uuid
) ORDER BY name;