# Реестр материалов — исходный снимок 2026-11-12

Это постоянный результат статического аудита, не список юридически разрешённых материалов. Все исходные графические материалы ниже имеют статус прав **не подтверждены** доступными документами. Полный SHA-256 идентифицирует конкретные байты, но не правообладателя. Технические координаты ссылок — `.qa/site-ad-copyright-risk-remediation/static-inventory.json`.

**PLAN-2: граница реализации изменена.** Разделы исходного снимка ниже сохраняют наблюдения и исторические рекомендации широкого PLAN-1; они **не являются командами удалить/скрыть материалы**. Единственные действующие решения — в [PLAN-2](#plan-2) в конце реестра и актуальных proposal/design/tasks. Права и неиспользуемость — независимые статусы. Аудит audit.md сохранён без изменений; широкий план из восьми units снят до реализации.

## Правила статуса

- «Подключён в коде» — найден активный источник/компонент; runtime публикация не проверена.
- «Условный fallback» — вызывается при отсутствии CMS фото; требует тех же прав.
- «Непотреблённое поле» — данные создаются, но текущая страница их не передаёт компоненту.
- «Нет активных ссылок» — в проверенном src нет доказательства показа; файл public всё ещё потенциально доступен напрямую.
- Stories/неиспользуемый компонент не равны публичной странице. CMS HTML может ссылаться на любой файл; текущий HTML недоступен.

Историческое предложение PLAN-1 (в PLAN-2 отменено, runtime-реестр не создавать) для `services/site-ad/docs/content-provenance.json`: `id`, тип, путь/объект, маршруты, usage, fingerprint, sourceUrl, дата обращения, автор/правообладатель, license/version, разрешённые способы использования, evidenceRef, attribution, reviewer, reviewedAt, status, decision, supersedes. Состояния: `pending`, `approved`, `rejected`, `removed`. Только `approved` с evidenceRef и совпадающей версией допускает публикацию. EvidenceRef не содержит сам договор, PII или секретный URL. Сроки/ограничения прав учитываются при ревью.

## Локальные файлы public

Все пути в первой колонке относительно `services/site-ad/public/`. Для строк без установленного источника: источник/автор/лицензия **неизвестны**. PLAN-2 не исключает используемые материалы из публикации по этому признаку; удаление определяется исключительно актуальным scope и доказанной неиспользуемостью. Исходные SHA сохранены для сравнения, не являются доказательством прав.

| Файл | Использование по исходникам | Место ссылки (от src/) | SHA-256 |
|---|---|---|---|
| `favicon.png` | Подключён metadata layout | `app/layout.tsx:15` | `ec553ebc3a7597430d426683a44b541a206da04195f42b4cccd444ff0e0a59cb` |
| `file.svg` | Нет активных ссылок | — | `2b67812c325c199a02536cdbeea0c593a72f707d323b72ee3e08dbab06753bd4` |
| `globe.svg` | Нет активных ссылок | — | `b614b9bf183925957661ac851498fe1d8029fd43a62fbfed86f9e2624a57e7cf` |
| `icons/farm.ico` | Подключён в коде | `features/home/services/homePageDataService.tsx:37` | `2d968fb0f7ceec6781ced2003531ae6af30f3c1c8a63268b529db14f0ddd59bb` |
| `icons/group.ico` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:106` | `3ecdcbb3df0f8fe42bd67f67b018c0bd1543aac8978a438982a282a744d71298` |
| `icons/individual.ico` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:95` | `6e23b27017769a9f4f7571140e7783a7dc8dedd69451c9b814370cc930ef5348` |
| `icons/mail.svg` | Нет прямой ссылки на файл; аналоги inline в Icon.tsx | — | `6d52b6f29c7a0f399ddb943805df5e254c14cc17f52cbccca0c1a922c5b13339` |
| `icons/phone.svg` | Нет прямой ссылки на файл; аналоги inline в Icon.tsx | — | `43df1139f0954346166c36bfa6d918af411f2fce39d3f753fd2e5eb13485024e` |
| `icons/rent.ico` | Подключён в коде | `features/home/services/homePageDataService.tsx:48` | `0d913dbc6a3d43845ff74a924d2cc08ad9ae5d4b2ff89efb3c23220851d8433f` |
| `icons/ridding.ico` | Подключён в коде | `features/home/services/homePageDataService.tsx:28` | `45a4aded976126846bbc8342619e0bf6d06c5e99fc2a6e34c3f8d0e405235bae` |
| `icons/sale.ico` | Подключён в коде | `features/home/services/homePageDataService.tsx:60` | `e1d7918f16e31552472dc624171939b22764b4cf67e5c6cff38dd9c29228fb29` |
| `icons/sport.ico` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:118` | `8f3533f58ddece28ec889a321c5472ae0fcfc012a8b153cab24c0e9a3915737f` |
| `icons/telegram.svg` | Нет прямой ссылки на файл; аналоги inline в Icon.tsx | — | `fa20f58212154d79c915451ed5feb255b39b9ef99f9bc38d09be4c67f120169c` |
| `icons/tour.ico` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:86` | `5dd257b7f230a6cf69271455c3ac920f4fd04ba70656256eb19a7980cdeba324` |
| `icons/vk.svg` | Нет прямой ссылки на файл; аналоги inline в Icon.tsx | — | `645b3cc7c73bcfa0565c3bd16dab3be49399a6ab92abb059ea3f4a00458bf6df` |
| `icons/whatsapp.svg` | Нет прямой ссылки на файл; аналоги inline в Icon.tsx | — | `dde28cf6ba474a69306d8aa4c276dea1364ca6cd73306203e850f4b6b1f22144` |
| `images/Logo.jpg` | Подключён в коде | `app/layout.tsx:82`; `features/header/data/dataHeader.tsx:66` | `094e31f1ac4bb71f9382b77e5df41d4401ab88465cc38a3c69c9db8bb18727ae` |
| `images/about/6rU6IKLgIgDho-2Nxefg1uOCmTiRNCcbM4zP1BZCrpOvV-ytyBt6Gj63Pt8Yj9pw1zaWL4jI.jpg` | Нет активных ссылок | — | `b3c482402cc9bf04cd3b6c7174a6088330fd08fa7fca95ff6967bfa199340e35` |
| `images/about/9ZbtyCkPSS3Svdl3smFMwRohtRJKDQGmN-JA1lynf5XRO6Y7Bdg2YUHiq0FCN6Ptz-0cBJ67eItD1cQiZHRzlcO_.jpg` | Нет активных ссылок | — | `e687261252459e5074f8d9084f7ec78ffcf76a38ffbd219fcf9bcae70627cb47` |
| `images/about/OUFgbsJyA8bogk6aRaDG4Y6xCPDgxhsivNXg4lAtMDael-nLkdZRPkKNLnuyuckYu-LpKNFtzAdvNCQSmePMLRxL.jpg` | Нет активных ссылок | — | `fc99ab41d7991a91847d264eb34af1dd85bd73905f4ea8ee98120073373e3613` |
| `images/about/cepAnSveSGYE_ejcbrZ9H66LgdGyrsSVfnPHIa7z7IofpwV2D6sN_SGJ8MG0jgmkB26ExtWc.jpg` | Нет активных ссылок | — | `a333b898a9cc0002a0997bc5f7608d3146177653f9549b67e6872ebf3d4a3f2a` |
| `images/about/eB9ev-TAwSkQIjOxtSrDqc8yHfriGtwNDZEnRO_881OHi1-FXXCJQofk_kPGmHZzwx_PAbgxoCZFtHTl4dnlJGGp.jpg` | Нет активных ссылок | — | `8a8fc727a8435933612c23ceb95ba567c5515389ff3bdbdc1322b12619618c12` |
| `images/about/kgQAFwsJTHdlywuvXsizqk6xrEtq990RRZU-diLQcexTP6BYJun8f4Uu0TJhhvqS4gKdnX9xWgqJR7rdfLJmIYRM.jpg` | Нет активных ссылок | — | `16dfd46ae7cffdd41f0d94af0c6f7d3864966a44b21757029843aead267a8d1c` |
| `images/about/x_0a0b8671.jpg` | Нет активных ссылок | — | `41bc716ef2587fab72cba758766ee0fcf7e6283a91b8507100f7a605441b6a7d` |
| `images/farm/97BqWDIV_P5xUB1JhxzQqTuCoclMSNJ1aL5_4xtwd7NY4KbAHA2xwxAq1le_qMO-0pDbOOG2sNo951pzrVyjPdkA.jpg` | Нет активных ссылок | — | `6c28b02c7ef9340def6fe1966d320844838de7d751e7af4b49d712e41ed7791c` |
| `images/farm/9Ash-qzc6kQDU9DhY7ZuZMeUOWrmIfaXSCs_kccR9g4ANtReJDSDFHB14Q6yA4ZHKiwPHQ.jpg` | Нет активных ссылок | — | `5ae317e31a3baf03c887658495de8f08fa1dd93db5dbfcb19615e6c986f85b2f` |
| `images/farm/EPSOgmTLmUROn2rjrfJjmOpQf95AdOFps4BpBHEVj2HR0bfiLyuHgCP_bzj_v5NeksKEplHx.jpg` | Нет активных ссылок | — | `d31bbbaefa93e4c5ea9746bbae40670963a6f984b01dddd688c257482a86e49d` |
| `images/farm/GPchjirNZ6BtJ1ze6bT76LJxDJki5rkFB6m1buQMqE8ToU6aPP75J0_4wGhap6qSVF_rFKdd.jpg` | Нет активных ссылок | — | `674b4244b0076e5d86f8643a51c61ae185f89fe560014835ae1b47b767303535` |
| `images/farm/I8Nfxrl7Rv20TKsM7hzOepx7t52COAa3duHgq3duv6YIN-O4KcpXfVuEb3gn1MCOK_bFT2Jc.jpg` | Нет активных ссылок | — | `2fc632d454775c2b2aa1f60314c364bc06b4ea05d62cb8931e7682eebee00ce8` |
| `images/farm/Kn1AGUib-Nb4P5w05fYfqP9ruxzwvWmON5E9ynzLCq2fL6y0XxpU1OJjBetzzJDlre83PBrZ.jpg` | Нет активных ссылок | — | `6654931305e01f894228da4b2deb3d1b29812d0c47c43c11c5cbec3ca7331b98` |
| `images/farm/LOwjPKy3aemxZmWu2-P21wQA_5A7BgCeFxL5xQAmD_qbnoJz3_MnzOHR1qElMZEgmA0tOEYZ.jpg` | Нет активных ссылок | — | `8add2dd088dd1ce82db1e3cd1c3edcd9873a8bf7e657414f857c590c09b34ff9` |
| `images/farm/LvhbyiPzqcC5DClR-NxWTfrPpiVgaKWbZaCAqS_HAFYkRubtKTbvlYQRKIDkhK-lGwbvtqIr.jpg` | Нет активных ссылок | — | `1d4fc9b9a0a5d247711a1bde2211b860df74c851e76256e4954cc7d6cad8ec13` |
| `images/farm/NM2HTOicl5XSXOPw5w1y7L7HM9JaZ2u_i6Ui8pR_L_i7Xcig17sqGikrsGnARbKt10NHvg.jpg` | Нет активных ссылок | — | `6bde9d3ce0e3b6b6dcdcbcf188cd15d0276076156f659748a49e355be08aa6e1` |
| `images/farm/NU52NNfNWTa2nRp9U7QmfJqX6eGvhfLixOy8AVvvZudfpDeUZ2RFljKgETzhtpJWerP2IV6DxIm-OtKKw6_GQ1vY.jpg` | Нет активных ссылок | — | `ed98bf2c8123400e9e9fd6d54cbfe47fe2bd0f9d357626671f6044a7c0431acc` |
| `images/farm/OH9HkbXknwlNgcD7mgeSm8lPBg1PRWm2qCdc-i8L7CFzXDmBoA9UqJpzR4gGwKE7VlPRmNBI.jpg` | Нет активных ссылок | — | `7635f6c99a6e81eb5d25edcbc3e511aa3828b6e39b16aaf2f89bdc8c43cc3744` |
| `images/farm/WgPlNq83nVfjQWFbtoyKFI1evoFamp-CaTdtzaP3FfWDkUzI593d2482HkNRf6vfCIn_FSp_.jpg` | Нет активных ссылок | — | `e4161904955f9e5500e48394be546727224e5870ed6f356b888650bdc6113986` |
| `images/farm/XZAlD7F7muKhZzElQ1E8Q9FtqnXm-8SkC_gfxOqo_cBcdgJKZBj1PQwwEaj0B0VKKsb7_SwQ.jpg` | Нет активных ссылок | — | `5fed4471f6ba8ca3b959eedfca8bc2334089b7531140c17898e06eb6f264145f` |
| `images/farm/a_eqJPoMCWqDIcbyCpnw5qGZ6rcXXwq4TrKvv9JiKdgWRYm5DJBAvBr5vezxyPYaqkFrbTCo.jpg` | Нет активных ссылок | — | `b4a6ce45443bd1cc9460b962e930e779a5b8ff0f62a3ba883e532e6ad49db061` |
| `images/farm/bfY5S7dOdw0u91LBaov9IFaKEoQrW-l7-qbLWqFiywZDXyTTn0sl3MFvYOaXJrCOPuDn88kgvq8KBGE3OmUACNK9.jpg` | Нет активных ссылок | — | `364a9896c14a6e2af5ce32caef0f42bb1b4744e0c005bdc62479650ba4af5a99` |
| `images/farm/farm1.jpg` | Нет активных ссылок | — | `d3c3ea73725e4806df0dc74be5b79d8fd98b7752b7f53ea0a2771470f16443dc` |
| `images/farm/gZIA6MsjTcf9462iPIX7u-2GAEi0ZQ_kGOPNRqcsuRsMtlU8OOl4r23cyq7qzJbonjieWx6G.jpg` | Нет активных ссылок | — | `08e5b900ba1533cc04776bf5374cf9a777319a42482ea738409d42a663aac3e1` |
| `images/farm/l0RqXNBJwJJGFuEi9jEgD_7TYmvLNWClk0NmsSEClqAbEp2ZDx8_aTnoKlLsfphtrQHlbTk6GnYdU5Kc0VZITORf.jpg` | Нет активных ссылок | — | `cfd9a251adaf96ddcbb8fea67b15de14efc2d765cddad5012bafca203cfa8169` |
| `images/farm/y9Zn8WpKe_wKcmwwnVMP3VztNCGh2zvP2UsQXZ_P562IwsD9_dEMHXV1A0oTTKl0Zj9ZyyL8meLWke18SPVOuz_4.jpg` | Нет активных ссылок | — | `a44117500dbe6797af2bae6d32d4e5ec7dfdd38dd5d2db88a14f32ca5d498e07` |
| `images/gallery/new-year1.jpg` | Нет активных ссылок; часть упоминаний закомментирована | — | `8a336b1be097b54d719a44e7f9e0d9349035c6637fb75c5909be0bce54157590` |
| `images/gallery/new-year2.jpg` | Нет активных ссылок; часть упоминаний закомментирована | — | `fab8bf61b7bede4ce5eeec01b4c4932f0bd7f3ba3b8cf1a771c24ae7890001e6` |
| `images/gallery/new-year3.jpg` | Нет активных ссылок; часть упоминаний закомментирована | — | `14219ea692e25a8d5092bd41fefabaf7be5a96f3368d7bc86d37d42919e0acaf` |
| `images/gallery/new-year4.jpg` | Нет активных ссылок; часть упоминаний закомментирована | — | `15e832112907ef94e00067fb2f37ed16c6045a2baea6340511af87565f8a72c1` |
| `images/gallery/new-year5.jpg` | Нет активных ссылок; часть упоминаний закомментирована | — | `ca748c7ad7f389daeb33095b6d1004cefaa09593d0cde26c43c10703e97dce62` |
| `images/gallery/new-year6.jpg` | Нет активных ссылок; часть упоминаний закомментирована | — | `3f197af89af77d2498b4fa9c543c343c74bfcca5b7d4ccd498f510e07e7f2319` |
| `images/gallery/zQL6NFMdPQ0PcoXf4x1aKstpVaH684wfYFbny3zwsVVmlbMfmxFzHVoQwOL01noXQeDei8Z2Dz1Qs_hy3ro3yVVp.jpg` | Нет активных ссылок | — | `2f91a9bdc83390cbff98e045541597d9578df74436232502747d15aa2a56f44a` |
| `images/home-img.jpg` | Архивный кандидат; CSS фон, маршрут / конфликтует | `app/(site)/(archive)/page.tsx:15` | `f7cea8293e12e90a31d008c7b17d9e0cf2f2aaf06dc789ca59b932a18119ee70` |
| `images/home-img1.jpg` | Подключён в коде | `features/contacts/data/contactsPageDataService.ts:9`; `features/home/services/homePageDataService.tsx:15` | `15c533af5d3e8efdd41fe511e107ed104032f9e92665cf6fe3bcc3058581b69a` |
| `images/horses/breeding.jpg` | Подключён в коде | `features/about/data/aboutPageData.tsx:10`; `features/horses/data/breedingPageData.tsx:19` | `bbc4ac62627ac1e33c591fa52d8e6fce88d4f81328e1073d576d5071280944d1` |
| `images/horses/horse.jpg` | Подключён в коде | `features/horses/data/breedingPageData.tsx:38`; `features/horses/data/horseListPageData.tsx:17` | `1d24b2383787f6a5945a7a144241c1634a8a53ae041d3bf4a4b11203279ec47f` |
| `images/horses/horse1.jpg` | Условный fallback CMS-лошадей | `features/horses/ui/HorseCard.tsx:31`; `features/horses/ui/OneHorsePage.tsx:25` | `a86a41553fb401bc0b8b0367c7003cd444f44d6ea465b8c2c1cb221ff9534213` |
| `images/horses/horse2.jpg` | Условный fallback CMS-лошадей | `features/horses/ui/OneHorsePage.tsx:26` | `4241a97780f0ac0cc524530b0d48f97a2d3604715831e48c5d89f5acc93af310` |
| `images/horses/horse3.jpg` | Условный fallback CMS-лошадей | `features/horses/ui/OneHorsePage.tsx:27` | `08b61640ee6845309f15aa50b5f9485cd1a45ca4e742efdcb71566ac3bd71ae4` |
| `images/horses/konevoz.jpg` | Нет активных ссылок | — | `ef4ca281aa26ae7c4a08c46e6a3fef36c4c5400dea227fc857069d77bfe1ffbd` |
| `images/horses/pony.jpg` | Подключён в коде | `features/horses/data/breedingPageData.tsx:49`; `features/horses/data/ponyListPageData.tsx:17` | `1012e18113552c8d319b5221ff90bd47935e6de77cd98e3d7522e5946be1b381` |
| `images/horses/sale.jpg` | Подключён в коде | `features/horses/data/breedingPageData.tsx:64`; `features/horses/data/saleListPageData.tsx:27` | `1164722d56b2919f13ff386a5e9184c19a1f1c4b037273f0c3902f9a5ffd18ca` |
| `images/horses/stallion.jpg` | Непотреблённое поле CTA; inactive stallions list | `features/horses/data/breedingPageData.tsx:58` | `32cee9e2c94ae71303317a2767d76ae43108e1f34ce95a32341f506b8f43ea10` |
| `images/horses/stallions.jpg` | Только inactive data source; страница stallions выводит EmptyPage | `features/horses/data/stallionsListPageData.tsx:27` | `abc9ccedc0cbbc2f13e464fae028714638d4aaefa4f02bdeba96553755e75193` |
| `images/main.jpg` | Нет активных ссылок | — | `a58df04b45182db42be3bbdb4607364a698ea1629210694833377776752a379c` |
| `images/ponies/WvKbHJAQFC0.jpg` | Нет активных ссылок | — | `a7742065931249a2292bfe055d8bd79b1511fae508a61e5faed5af53d74b2639` |
| `images/services/farm/01.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:32`; `features/price/services/farmPageDataService.tsx:84` | `60d5b97e72cd69bae60d621a4efb931915f682a20b956590ac48f3d6fd219bbc` |
| `images/services/farm/02.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:92` | `3f58577caeb8416b855203a976348add3349fa92416be4180cefc18570028699` |
| `images/services/farm/03.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:96` | `14c66da89b7e109f9c4303beb67d40b281da6f65944e09c980435863ef34777b` |
| `images/services/farm/04.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:72` | `84ab65f9bea2a7c1ed217405c515a6b3ce7c4869d0b93aa87d0498165c2c55de` |
| `images/services/farm/05.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:68` | `83536420a4b8dd404d247fc2da1b3d052646fd52b722bf5bb69eb259d112882d` |
| `images/services/farm/06.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:88` | `263088e46786e6b2194ff67a80a3914b30acbe856546641b2a7ff1e61e81969d` |
| `images/services/farm/07.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:80` | `0c0a9176c307231063b98b9dd2ca152a652678cc3d3ff505a729a5bcd9fdc299` |
| `images/services/farm/08.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:112` | `0f3a4492965f0fcc71c3052a4bc694d4891bdba5dc9068a9b5c742895610d952` |
| `images/services/farm/09.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:100` | `fd92ca5df77856f97b878374df1f85585d70236a196c6629317489fc7de32acb` |
| `images/services/farm/10.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:104` | `4cda6c7b236a35c0c7877ca787151ffb6f491eb7a29916fcc277cd8ff5532814` |
| `images/services/farm/11.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:108` | `341ff5c5420f8f6e4b24a555e4b06fcb58c624b00a008f73a3a849973008cd7d` |
| `images/services/farm/12.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:76` | `2454d39f184b5e81af0565894d55e23e1dcbe7ce9b891b469ad44ef10c899bc4` |
| `images/services/farm/13.jpg` | Подключён в коде | `features/price/services/farmPageDataService.tsx:116` | `7eaba5eb06dd30cb3d7d13d50609301a73df80e4081349fd42b92b5b1948dd2b` |
| `images/services/gift-certificate.jpg` | Нет активных ссылок | — | `7c7dfe309350f2ead690446aa8b697c7f0707971bbce10cc0b62a58a05413c52` |
| `images/services/rental/animals.jpg` | Подключён в коде | `features/price/services/Rental/animalsPageDataService.tsx:26`; `features/price/services/Rental/rentalPageDataService.tsx:49` | `c9470aeb85bd56d6b96cb04727b3ead0523ffadf33f86c5118ce5b97b265b616` |
| `images/services/rental/carriages.jpg` | Подключён в коде | `features/price/services/Rental/carriagesPageDataService.tsx:26`; `features/price/services/Rental/rentalPageDataService.tsx:38` | `dda7eac58f9102bd7d4cf456a428a58f0436e742cba91c9eb2a3669327ce949a` |
| `images/services/rental/fotosession.jpg` | Подключён в коде | `features/price/services/Rental/fotosessionPageDataService.tsx:26`; `features/price/services/Rental/rentalPageDataService.tsx:56` | `1bcb4ffb70c9122c8e16d8a99c6913785238f704bcc9f0ec123f895673f512aa` |
| `images/services/rental/rental.jpg` | Подключён в коде | `features/price/services/Rental/rentalPageDataService.tsx:18` | `90b1bfebc8bf8ba21231679d974172d8113cc6aee5daa327810dad22cae0583e` |
| `images/services/rental/sport.jpg` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:135` | `18f5852ce19494b7beb0f2fa98e11cbf86755e81cb1d1d20efc89bc18f522a44` |
| `images/services/rides/group/group1.jpg` | Подключён в коде | `features/price/services/Ride/groupPageDataService.tsx:76` | `d3f24e0b4a88cd02e4651871d95b721ae5e027f6718822fe29a9fb995fd45cdf` |
| `images/services/rides/group/group2.jpg` | Подключён в коде | `features/price/services/Ride/groupPageDataService.tsx:80` | `f5be5d9b05fcfcb0ef79cc5544e36ae381a537fd7a82f3ba23bf0aa7a56a4af2` |
| `images/services/rides/group/group3.jpg` | Подключён в коде | `features/price/services/Ride/groupPageDataService.tsx:84` | `4fd72ee2cfe8123a7d1e71ca39d1614b9601f0e0bcacc8ffb535079da9d9e05c` |
| `images/services/rides/group/group4.jpg` | Подключён в коде | `features/price/services/Ride/groupPageDataService.tsx:88` | `8766906343b7ada114dffd40cd92fc0bb1bfd8b5a681181f8363d20c16bc9ca1` |
| `images/services/rides/group/group5.jpg` | Подключён в коде | `features/price/services/Ride/groupPageDataService.tsx:92` | `854458c2ea871ba4a31e60678313b4c3c2eacd73c1a813c2c5951c04be79ac6e` |
| `images/services/rides/group/group6.jpg` | Подключён в коде | `features/price/services/Ride/groupPageDataService.tsx:96` | `9e6c9bbd65af99c07ecb6d174cc9720dd5c3249ea5d0cfdd84392c3c2d8640ac` |
| `images/services/rides/group.jpg` | Подключён в коде | `features/price/services/Ride/groupPageDataService.tsx:41` | `c186d1bee31804eb94d17b61fa8636fffc03a6fa5d983e3ea8579e78ae01f722` |
| `images/services/rides/individual/individual1.jpg` | Подключён в коде | `features/price/services/Ride/individualPageDataService.tsx:100` | `4744a37511f3780e694e661a89876ae31e280092d73fb3d95eda0c53cc9cfb55` |
| `images/services/rides/individual/individual2.jpg` | Подключён в коде | `features/price/services/Ride/individualPageDataService.tsx:104` | `6c450c01ebb2e4fc29ac89853895f23dbe66429a4636ef4c7360e7842f9796c1` |
| `images/services/rides/individual/individual3.jpg` | Подключён в коде | `features/price/services/Ride/individualPageDataService.tsx:108` | `6a4e724b3d9bc563f26877392aa462e5234a58130009e990fbdb98f4d28fdbb8` |
| `images/services/rides/individual/individual4.jpg` | Подключён в коде | `features/price/services/Ride/individualPageDataService.tsx:112` | `1d2bef9fb8bdc1b89362abe8f4399ae13cfb291eac339d9264335768c1d81613` |
| `images/services/rides/individual/individual5.jpg` | Подключён в коде | `features/price/services/Ride/individualPageDataService.tsx:116` | `74ff016c0da0fa036383a5d039a1aa8e7f51f0f935862e7c43816f8b4ccbe94d` |
| `images/services/rides/individual/individual6.jpg` | Подключён в коде | `features/price/services/Ride/individualPageDataService.tsx:120` | `c3606e3f3fa5148352d5a6626f35b6ce89d68e0ab2978ad95efe7e65fbd91eef` |
| `images/services/rides/individual.jpg` | Подключён в коде | `features/price/services/Ride/individualPageDataService.tsx:36` | `cea9acdc116ca8dd648f57b6a7ee85027774ad781e9e14b56a4d70e1f61ec552` |
| `images/services/rides/ride/ride1.jpg` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:38` | `3e868c4f7f23a4e1f9b2a795ee9aa284ab997123246543261b55a31c3a610593` |
| `images/services/rides/ride/ride2.jpg` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:42` | `0e947f6e721584e8a46c2e74dc998822276b3cb4b4dad5f47dc64520a557950c` |
| `images/services/rides/ride/ride3.jpg` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:46` | `21e66eeb0a23fd13615f0f37ded24b1260627fbee83cf749a9a323a328443a44` |
| `images/services/rides/ride/ride4.jpg` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:50` | `817ff0a38d9a3480963f0fb58d0fd76474b391fb564ec68293a1532c6a004059` |
| `images/services/rides/ride/ride5.jpg` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:54` | `fdd27f89701bd9eead58f1c44b107ec5bff8c38c58c612ece0c4df28a19b8f42` |
| `images/services/rides/ride.jpg` | Подключён в коде | `features/price/services/Ride/ridePageDataService.tsx:21` | `211dc9dc4e75dde1fcacd88ecf557a58343718a67a309382c97a4d37fb1a4800` |
| `images/services/rides/sport.jpg` | Подключён в коде | `features/price/services/Ride/sportPageDataService.tsx:40` | `18f5852ce19494b7beb0f2fa98e11cbf86755e81cb1d1d20efc89bc18f522a44` |
| `images/services/rides/tour.jpg` | Подключён в коде | `features/price/services/Ride/toursPageDataService.tsx:34` | `adc13923de0eaac5d815e6e0e9fefb309c1640e186b69c00210c3b1007a43b3e` |
| `images/services/sale/sale.jpg` | Нет активных ссылок | — | `b957d9625184943f980083f384879f85496276c0e998832e5a455f0b8c1a3ba8` |
| `images/services/services.jpg` | Подключён в коде | `features/price/services/servicesPageDataService.tsx:14` | `68a01f4808facc873c6edb9bcfbadfe0f84ed10bdb953171225bbe334625fe73` |
| `next.svg` | Нет активных ссылок | — | `55995dfad6ecb4945a1e856ddca03c5e16aa5bf13fd21b4df6a74ae79357bcfc` |
| `vercel.svg` | Нет активных ссылок | — | `f081337b2fee635b455b63275406a3e7f39d6a014e25ad90dab5a67e62a12ac4` |
| `window.svg` | Нет активных ссылок | — | `644768c4aaeb4767bce293344eeb0c125fb804a94d801440424072202d85e3a1` |

## Материалы вне public и динамические источники

| ID / объект | Использование и доказательство | Происхождение / статус / решение |
|---|---|---|
| APP-FAVICON `src/app/favicon.ico` | Next file convention; отдельный от public/favicon.png материал | Не подтверждён; отключить/заменить нейтральным после approval; нельзя забыть при удалении PNG |
| SVG-PHONE `src/ui/atoms/Icon.tsx` phone | Header/Footer/Contacts при наличии телефона; 112 координат совпадают с public/icons/phone.svg | Комментарий SVG Repo в оригинальном SVG — подтверждённая локальная зацепка, не лицензия. Конкретная карточка/автор неизвестны; текстовая ссылка вместо контура |
| SVG-UI `Icon.tsx` chevron-down/right, location, calendar | общая оболочка, breadcrumbs, контакты | Автор/лицензия неизвестны; заменить простыми текстовыми/CSS-индикаторами без копирования path |
| SVG-SOCIAL `Icon.tsx` vk/mail | условно settings.vk/mail → Header mobile, Footer, Contacts | Источник path и brand permissions неизвестны; подписи VK/Email вместо SVG |
| SVG-OTHER `Icon.tsx` horse/leaf/arrow-right/quote/whatsapp/telegram | API компонента, stories и отдельные UI-блоки; активный показ в перечисленных страницах не установлен | Нельзя выводить происхождение из внешнего вида; удалить неподтверждённые пути/примеры при замене Icon, сохранив функциональные подписи |
| CSS / шрифты `src/app/globals.css` | font-family имена без загрузки файлов | Только ссылка на установленный шрифт; не установлено распространение Jost/Manrope/Inter/Cormorant Infant/PT Serif/JetBrains Mono. Новое подключение требует отдельного документа |
| TEXT-LOCAL `src/features/{home,about,contacts,horses,price}/**`, `src/app/**/page.tsx`, `src/features/metadata/metadata.ts` | hardcoded JSX, data descriptions, SEO, архивные статьи, labels | Авторство/правообладатель неизвестны; подтвердить конкретную версию либо новый текст по фактам без рерайта спорного оригинала; служебные краткие labels учитываются отдельно от статей |
| CMS-HORSE `horses[].photos`, detail/pedigree/foals, `description`, `services[].description` | horseService → HorseList/Card, OneHorsePage, Pedigree/Card; metadata description | Текущие payload/количество/права unchecked; фото каждой версии и текст каждого поля — отдельная запись допуска, не «всё из CMS разрешено» |
| CMS-PRICE `prices[].photos`, `description`, `page_data`, price_tables; groups description | priceService → ServicesList/ServiceGallery/OneServicePage; SEO | unchecked; page_data может содержать вложенные URL/CSS/embeds/fonts. Блокировать весь неизвестный HTML; разрешённый HTML связывать с перечнем вложенных ресурсов |
| CMS-SETTINGS `site_name`, контакты, coordinates, соцсети | getSiteSettings → оболочка/карта/metadata | Значения unchecked; фактические контакты не равны лицензии на логотип; подтвердить название/контент отдельно, не сохранять секреты |
| EMBED-YANDEX `src/ui/media/MapEmbed.tsx` | условно координаты Home/Contacts; yandex map-widget iframe | Лицензионные условия не прочитаны; при отсутствии проверки оставить адрес/ссылку вместо iframe; не извлекать/обрезать tiles или attribution |
| EMBED-GOOGLE тот же компонент | реализован fallback provider, вызовы страниц задают yandex | Только потенциальное использование; не объявлять активной картой |
| SCRIPT-METRIKA `src/app/layout.tsx` | tag.js + noscript watch pixel | Используется сторонний сервис, а не локальная фотография; условия/полномочия владельца unchecked. Изменение счётчика/consent не входит в change |
| LIBRARIES `package-lock.json`, пакетные LICENSE | версии/краткий обзор в audit.md; не транзитивная проверка | MIT metadata и TW Elements Free local license; сохранить необходимые notices фактически поставляемого кода, не выдавать за разрешение на контент |

## Начальные решения по главной

`ridding.ico`, `farm.ico`, `rent.ico`, `sale.ico`: явное требование пользователя удалить после нового approval плана; сейчас не удалены. Конкретный внешний источник не установлен. `tour.ico`, `individual.ico`, `group.ico`, `sport.ico` остаются используемыми и **сохраняются**: прежняя широкая рекомендация PLAN-1 не одобрена. Полные исходные SHA приведены выше; коммиты появления и внешний поиск ограничений — в [audit.md](audit.md).

Реестр не подтверждает претензию пользователя и не признаёт нарушение. Дата обращения к внешним URL и результат (в том числе отказ) фиксируются в audit.md; гипотезы о каталогах не превращаются в авторство.

Версия отдельного APP-FAVICON: `src/app/favicon.ico`, SHA-256 `2b8ad2d33455a8f736fc3a8ebf8f0bdea8848ad4c0db48a2833bd0f9cd775932`. Доказательство идентичности, не прав.


## PLAN-2

### Действующие решения и проверка использования

Это план после уточнения scope, не уже выполненное удаление. Четыре явно указанных пользователем файла: `public/icons/ridding.ico`, `public/icons/farm.ico`, `public/icons/rent.ico`, `public/icons/sale.ico` — **remove-after-approval**, отключить только обращения главной с короткими комментариями. Ссылки и тексты карточек сохранить.

**48 дополнительных кандидатов:** 38 JPG + 10 SVG. Все пока **uncertain / сохранить**: отсутствие локальных активных ссылок подтверждает кандидатуру, но полный CMS/live/export и внешний перечень не предоставлены. **0 дополнительных файлов доказаны end-to-end для удаления; 0 файлов удалены.** После разрешённой сверки исполнитель меняет решение каждой строки на `delete` с evidence или `retain/uncertain` с причиной. Standalone vk/mail — только две строки этого списка, не автоматический delete из-за inline-замены.

Исходные 49 файлов без AST references включали favicon.png: это ложный кандидат, исправлен по metadata layout. Источники проверки PLAN-2: `src` TS/TSX/CSS, `.storybook`, docs/README/config и текстовые конфиги без secrets/зависимостей/build outputs. Прямые и basename mentions записаны в `.qa/site-ad-copyright-risk-remediation/plan2-deletion-candidates.json`; CSS/metadata/dynamic поиск — `plan2-media-refs.txt`. Gallery new-year1/2/3 встречаются в закомментированном news-блоке home data, не в исполняемых ссылках. Basename `sale.jpg` кандидата `images/services/sale/sale.jpg` совпал с другим используемым файлом `images/horses/sale.jpg`: две строки mentions ниже относятся к horses, а не являются прямыми ссылками на services/sale. Полные URL различены; оба решения всё равно консервативны (horses retain, кандидат uncertain). Не расширять разрешённые комментарии на весь код.

Динамический `getImagesFromFolder` формирует gallery по readdirSync, но вызовов/импортов в src не найдено; эту достижимость перепроверить при apply. Используемые style/Tailwind backgrounds rental/breeding и `home-img.jpg` в archive/stories **retain**. Archive route group не делает файл непубличным. `public/favicon.png` и `src/app/favicon.ico` **retain**, как и horse1/2/3 fallback, Logo.jpg и другие используемые фото/тексты. `stallion.jpg`/`stallions.jpg` — **uncertain/retain**, ссылки в data есть, непотреблённость отдельного поля не доказывает полного отсутствия потребителей. Дубликаты sport JPG сохранять: оба имеют ссылки. Четыре используемые rides ICO остаются без изменения, права unchecked.

Нет предоставленного разрешённого CMS/live target; `photos`, `page_data`, поля settings/HTML могут ссылаться на локальные public URL, в том числе encoded/dynamic. Внешние прямые потребители неизвестны. Нельзя удалить такой файл только по AST/grep, отсутствию правовых документов или имени каталога. Нет snapshot/полноты — сохранить и указать gap, не блокировать оставшийся контент. Удаление явно выбранных четырёх ICO — отдельное пользовательское решение; обнаруженный иной активный потребитель до удаления требует решения Router, не его скрытого отключения.

### Пофайловые дополнительные кандидаты

Пути относительно `services/site-ad/`. SHA — в исходной таблице выше и JSON evidence. Для **каждой** строки текущая причина uncertain одинакова: недоступны полный CMS/export и внешние потребители; CSS/dynamic/conventions/fallback/archive локально проверены по описанию выше. Это закрытый перечень кандидатов, не glob для удаления.

| № | Путь | Локальные текстовые mentions | Решение PLAN-2 |
|---|---|---|---|
| 1 | `public/file.svg` | не найдены | uncertain — сохранить до полной сверки |
| 2 | `public/globe.svg` | не найдены | uncertain — сохранить до полной сверки |
| 3 | `public/icons/mail.svg` | не найдены | uncertain — сохранить до полной сверки |
| 4 | `public/icons/phone.svg` | не найдены | uncertain — сохранить до полной сверки |
| 5 | `public/icons/telegram.svg` | не найдены | uncertain — сохранить до полной сверки |
| 6 | `public/icons/vk.svg` | не найдены | uncertain — сохранить до полной сверки |
| 7 | `public/icons/whatsapp.svg` | не найдены | uncertain — сохранить до полной сверки |
| 8 | `public/images/about/6rU6IKLgIgDho-2Nxefg1uOCmTiRNCcbM4zP1BZCrpOvV-ytyBt6Gj63Pt8Yj9pw1zaWL4jI.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 9 | `public/images/about/9ZbtyCkPSS3Svdl3smFMwRohtRJKDQGmN-JA1lynf5XRO6Y7Bdg2YUHiq0FCN6Ptz-0cBJ67eItD1cQiZHRzlcO_.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 10 | `public/images/about/OUFgbsJyA8bogk6aRaDG4Y6xCPDgxhsivNXg4lAtMDael-nLkdZRPkKNLnuyuckYu-LpKNFtzAdvNCQSmePMLRxL.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 11 | `public/images/about/cepAnSveSGYE_ejcbrZ9H66LgdGyrsSVfnPHIa7z7IofpwV2D6sN_SGJ8MG0jgmkB26ExtWc.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 12 | `public/images/about/eB9ev-TAwSkQIjOxtSrDqc8yHfriGtwNDZEnRO_881OHi1-FXXCJQofk_kPGmHZzwx_PAbgxoCZFtHTl4dnlJGGp.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 13 | `public/images/about/kgQAFwsJTHdlywuvXsizqk6xrEtq990RRZU-diLQcexTP6BYJun8f4Uu0TJhhvqS4gKdnX9xWgqJR7rdfLJmIYRM.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 14 | `public/images/about/x_0a0b8671.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 15 | `public/images/farm/97BqWDIV_P5xUB1JhxzQqTuCoclMSNJ1aL5_4xtwd7NY4KbAHA2xwxAq1le_qMO-0pDbOOG2sNo951pzrVyjPdkA.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 16 | `public/images/farm/9Ash-qzc6kQDU9DhY7ZuZMeUOWrmIfaXSCs_kccR9g4ANtReJDSDFHB14Q6yA4ZHKiwPHQ.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 17 | `public/images/farm/EPSOgmTLmUROn2rjrfJjmOpQf95AdOFps4BpBHEVj2HR0bfiLyuHgCP_bzj_v5NeksKEplHx.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 18 | `public/images/farm/GPchjirNZ6BtJ1ze6bT76LJxDJki5rkFB6m1buQMqE8ToU6aPP75J0_4wGhap6qSVF_rFKdd.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 19 | `public/images/farm/I8Nfxrl7Rv20TKsM7hzOepx7t52COAa3duHgq3duv6YIN-O4KcpXfVuEb3gn1MCOK_bFT2Jc.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 20 | `public/images/farm/Kn1AGUib-Nb4P5w05fYfqP9ruxzwvWmON5E9ynzLCq2fL6y0XxpU1OJjBetzzJDlre83PBrZ.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 21 | `public/images/farm/LOwjPKy3aemxZmWu2-P21wQA_5A7BgCeFxL5xQAmD_qbnoJz3_MnzOHR1qElMZEgmA0tOEYZ.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 22 | `public/images/farm/LvhbyiPzqcC5DClR-NxWTfrPpiVgaKWbZaCAqS_HAFYkRubtKTbvlYQRKIDkhK-lGwbvtqIr.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 23 | `public/images/farm/NM2HTOicl5XSXOPw5w1y7L7HM9JaZ2u_i6Ui8pR_L_i7Xcig17sqGikrsGnARbKt10NHvg.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 24 | `public/images/farm/NU52NNfNWTa2nRp9U7QmfJqX6eGvhfLixOy8AVvvZudfpDeUZ2RFljKgETzhtpJWerP2IV6DxIm-OtKKw6_GQ1vY.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 25 | `public/images/farm/OH9HkbXknwlNgcD7mgeSm8lPBg1PRWm2qCdc-i8L7CFzXDmBoA9UqJpzR4gGwKE7VlPRmNBI.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 26 | `public/images/farm/WgPlNq83nVfjQWFbtoyKFI1evoFamp-CaTdtzaP3FfWDkUzI593d2482HkNRf6vfCIn_FSp_.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 27 | `public/images/farm/XZAlD7F7muKhZzElQ1E8Q9FtqnXm-8SkC_gfxOqo_cBcdgJKZBj1PQwwEaj0B0VKKsb7_SwQ.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 28 | `public/images/farm/a_eqJPoMCWqDIcbyCpnw5qGZ6rcXXwq4TrKvv9JiKdgWRYm5DJBAvBr5vezxyPYaqkFrbTCo.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 29 | `public/images/farm/bfY5S7dOdw0u91LBaov9IFaKEoQrW-l7-qbLWqFiywZDXyTTn0sl3MFvYOaXJrCOPuDn88kgvq8KBGE3OmUACNK9.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 30 | `public/images/farm/farm1.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 31 | `public/images/farm/gZIA6MsjTcf9462iPIX7u-2GAEi0ZQ_kGOPNRqcsuRsMtlU8OOl4r23cyq7qzJbonjieWx6G.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 32 | `public/images/farm/l0RqXNBJwJJGFuEi9jEgD_7TYmvLNWClk0NmsSEClqAbEp2ZDx8_aTnoKlLsfphtrQHlbTk6GnYdU5Kc0VZITORf.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 33 | `public/images/farm/y9Zn8WpKe_wKcmwwnVMP3VztNCGh2zvP2UsQXZ_P562IwsD9_dEMHXV1A0oTTKl0Zj9ZyyL8meLWke18SPVOuz_4.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 34 | `public/images/gallery/new-year1.jpg` | `src/features/home/services/homePageDataService.tsx:73` | uncertain — сохранить до полной сверки |
| 35 | `public/images/gallery/new-year2.jpg` | `src/features/home/services/homePageDataService.tsx:74` | uncertain — сохранить до полной сверки |
| 36 | `public/images/gallery/new-year3.jpg` | `src/features/home/services/homePageDataService.tsx:75` | uncertain — сохранить до полной сверки |
| 37 | `public/images/gallery/new-year4.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 38 | `public/images/gallery/new-year5.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 39 | `public/images/gallery/new-year6.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 40 | `public/images/gallery/zQL6NFMdPQ0PcoXf4x1aKstpVaH684wfYFbny3zwsVVmlbMfmxFzHVoQwOL01noXQeDei8Z2Dz1Qs_hy3ro3yVVp.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 41 | `public/images/horses/konevoz.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 42 | `public/images/main.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 43 | `public/images/ponies/WvKbHJAQFC0.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 44 | `public/images/services/gift-certificate.jpg` | не найдены | uncertain — сохранить до полной сверки |
| 45 | `public/images/services/sale/sale.jpg` | `src/features/horses/data/breedingPageData.tsx:64`; `src/features/horses/data/saleListPageData.tsx:27` | uncertain — сохранить до полной сверки |
| 46 | `public/next.svg` | не найдены | uncertain — сохранить до полной сверки |
| 47 | `public/vercel.svg` | не найдены | uncertain — сохранить до полной сверки |
| 48 | `public/window.svg` | не найдены | uncertain — сохранить до полной сверки |

### Inline и standalone: независимые решения

- Inline `Icon.tsx` vk/mail: заменить общий renderer, старые paths удалить, оставить два кратких комментария. Это охватывает ContactsBlock (главная/контакты), Footer и MobileMenu. Новый VK — нейтральная цепочка + подпись «VK», а не брендовый логотип.
- Standalone `public/icons/vk.svg` и `mail.svg`: локальных потребителей файлов не найдено, **uncertain** по внешнему/CMS gap. После замены проверить повторно; удалить лишь при полном доказательстве, сохранив остальных consumers.
- Standalone phone/telegram/whatsapp имеют тот же отдельный статус кандидатов. Inline phone/telegram/whatsapp и остальные используемые SVG **сохранить**; локальная зацепка SVG Repo для phone остаётся историческим наблюдением, не задачей замены.

### Библиотечная замена и лицензия

| Назначение | Точный модуль | Пакет/версия | Происхождение | Лицензия / условия |
|---|---|---|---|---|
| VK (не логотип) | `@ant-design/icons/LinkOutlined` | icons 5.6.1 + icons-svg 4.4.2 | установленная транзитивная dependency `antd@5.27.3`; React module + соответствующий ASN | MIT, полный copyright/permission/disclaimer в поставке |
| Email | `@ant-design/icons/MailOutlined` | те же версии | те же установленные пакеты, не исходный SVG public | тот же полный MIT notice |

`@ant-design/icons/LICENSE` локально: **Copyright (c) 2018-present Ant UED, https://xtech.antfin.com/**. icons-svg package.json и lock указывают MIT, но LICENSE отсутствует в установленной npm-упаковке. Точная публикация https://registry.npmjs.org/@ant-design%2ficons-svg/4.4.2 проверена 2026-11-12, gitHead `038764e4e46499212751a452704f64231fa756ba`. Успешный источник полного LICENSE: https://raw.githubusercontent.com/ant-design/ant-design-icons/038764e4e46499212751a452704f64231fa756ba/LICENSE — идентичен локальному icons LICENSE. Evidence: `plan2-icons-svg-npm.json`, `plan2-icons-svg-LICENSE.txt` в .qa текущего change. Предполагаемые tag URLs icons-svg@4.4.2 и icons@5.6.1 вернули 404; источник подтверждён по npm gitHead, не по этим тегам.

При реализации создать `public/third-party-notices.txt`: оба имени/версии, source URL, полный неизменённый MIT текст (общий одинаковый текст с двумя именами допустим); ссылка Footer «Лицензии иконок». Не нужен видимый copyright возле каждого конверта; не убирать notices имеющейся поставки. Это не полный транзитивный аудит зависимостей. Manifest/lock не менять, новых пакетов не устанавливать. Если установленный модуль/лицензия недоступны — текст VK/Email или простой CSS, зафиксировать fallback, без нового copyrighted path.


### SC-1 — фактическое решение после approval PLAN-2

Пользователь подтвердил узкий PLAN-2 («Да»). Повторный scan выполнен до изменения: 110 public-файлов, 48 дополнительных кандидатов, src (включая archive и fallback), CSS/style/Tailwind, metadata/file conventions, stories/tests, .storybook, docs и открытые конфиги без secrets. Пофайловые SHA и прямые/basename/URL-encoded mentions: `.qa/site-ad-copyright-risk-remediation/SC-1/usage-scan.json`; исходные SHA всех public: `public-before.json` в том же каталоге. SHA 48 кандидатов не изменились относительно PLAN-2.

**Окончательные решения всех 48 строк таблицы выше: uncertain / сохранить.** Для каждой строки повторены локальные категории проверки; CMS/export и внешний перечень по-прежнему неизвестны. Полного разрешённого снимка/URL нет, поэтому дополнительных удалений **0**. Standalone `public/icons/vk.svg` и `mail.svg` сохранены независимо от замены inline; phone/telegram/whatsapp SVG также сохранены. Отсутствие локального consumer не доказывает отсутствие внешнего. Никакой правовой гарантии/полной очистки не заявляется.

`getImagesFromFolder` по-прежнему найден только в определении `src/api/imagesFromFolder.ts`; вызовов в просмотренных исходниках/конфигах/docs нет. Неизвестная CMS может поставлять произвольные пути: dynamic usage не считается исключённым end-to-end. Используемые archive/story backgrounds `home-img.jpg`, rental/breeding, horse1/2/3 fallback, оба favicon, Logo и все фото сохранены. `stallion.jpg`/`stallions.jpg` и оба sport JPG также сохранены. Сравнение всех 110 исходных SHA после изменения: `public-after-comparison.json` (106 неизменных, 4 согласованных удаления).

Четыре ICO удалены только после отключения home refs и проверки каждого resolved absolute path на точное равенство согласованному пути без symlink. Evidence: `absolute-path-review.json`; исполняемый checker manifest: `deletion-manifest.json` (110 исходных записей, 4 delete explicit-home / 106 retain; новые notices не являются изображением). Короткие комментарии содержат единственные исторические refs удалённых ICO.

| Путь относительно сервиса | Исходный SHA256 | Решение |
|---|---|---|
| `public/icons/ridding.ico` | `45a4aded976126846bbc8342619e0bf6d06c5e99fc2a6e34c3f8d0e405235bae` | delete — explicit-home, пользовательское решение PR-01 |
| `public/icons/farm.ico` | `2d968fb0f7ceec6781ced2003531ae6af30f3c1c8a63268b529db14f0ddd59bb` | delete — explicit-home, пользовательское решение PR-01 |
| `public/icons/rent.ico` | `0d913dbc6a3d43845ff74a924d2cc08ad9ae5d4b2ff89efb3c23220851d8433f` | delete — explicit-home, пользовательское решение PR-01 |
| `public/icons/sale.ico` | `e1d7918f16e31552472dc624171939b22764b4cf67e5c6cff38dd9c29228fb29` | delete — explicit-home, пользовательское решение PR-01 |

Inline vk/mail заменены на установленные `@ant-design/icons/LinkOutlined` / `MailOutlined`: icons **5.6.1**, icons-svg **4.4.2**, оба MIT; локальные версии совпали с неизменённым lock. Полный текст MIT в public notice совпадает с локальным icons LICENSE и сохранённым gitHead LICENSE icons-svg из PLAN-2. В notice указаны оба пакета/версии/источника и точный gitHead; Footer содержит ссылку «Лицензии иконок». Небрендовая цепочка сопровождается видимым VK во всех трёх контактных renderers. Fallback fixture недоступных библиотечных exports проверяет текст VK/Email; новые пакеты не устанавливались. Если сами static modules отсутствуют в иной установке, требуется предусмотренная design-time текстовая замена, а не установка зависимости.

PR-06 before/after **blocked**: разрешённый dev URL и runtime fixtures не предоставлены; адрес DSH GUI не является сайтом. Браузер/сервер/стек не запускались, формы и CMS не трогались. `browser-status.json` фиксирует gap, DOM/network/screenshots отсутствуют и не подменяются unit tests. CMS/external coverage PR-07 остаётся **unchecked**, сохранением всех uncertain ограничение соблюдено. Независимая браузерная приёмка требуется Router/QG на явно разрешённом target.


**SC-1 verification (owner, не независимый QG):** `npm test` PASS — 13 файлов / 46 tests; `npm run build` PASS (Next 15.5.9, type validation и генерация страниц включены); scoped native ESLint всех изменённых TS/TSX/MJS PASS. `node --test scripts/verify-image-cleanup.test.mjs` PASS — 20 tests; `node scripts/verify-image-cleanup.mjs --manifest ../../.qa/site-ad-copyright-risk-remediation/SC-1/deletion-manifest.json` PASS — 110 entries, 0 errors. Начальный negative test выявил ошибку traversal guard собственного checker; guard исправлен, повторены только checker tests/checker, продуктовые suite/build не дублировались. Все прочие ветви Icon сравнены с HEAD без изменений (`untouched-icon-branches.json`). API/package/lock не менялись. Formatter N/A: canonical formatter/Makefile отсутствует, новый не вводился. Strict OpenSpec validate PASS. Ledger и логи — `.qa/site-ad-copyright-risk-remediation/SC-1/verification-ledger.json` и соседние файлы. SC-1.8 остаётся unchecked/blocked, QG tasks не отмечены; будущий порядок QG — Router QG-LITE → QG-FE-MANUAL.
