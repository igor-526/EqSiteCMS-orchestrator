# Seed контента 070: INLOVE

Применён 2026-09-10 к tenant `685c6079-3922-4dbb-95b6-533bc9060547`, проверенному по `service_key=inlove` и имени клуба. Старый `seed.sql` не исполнялся. Runtime код backend не менялся.

Запуск из корня: `python3 docs/sites/inlove/070_content_seed.py`. Скрипт использует локальный контейнер `eqsitecms-db`, параметры соединения читает в памяти. Одна tenant-scoped транзакция, стабильные UUID/slug. Повтор восстанавливает желаемые `name`, `snippet` и `content` только у собственных записей при совпадении tenant и slug, не добавляет дубли и не меняет slug или дату публикации. Коллизия собственного UUID с записью другого tenant или с другим slug остаётся без изменений. Публикация имеет реальное время первого seed, не дату вымышленного события. Все три новости явно помечены как демонстрационные редакционные записи.

Снимок прежних значений (включая исходный повреждённый JSON features) и IDs хранится в `070_content_seed.backup.json` и не перезаписывается. Обратное применение: `python3 docs/sites/inlove/070_content_seed.py --rollback`; выполнять только при необходимости. Оно восстанавливает старые about значения и удаляет только три собственных UUID с совпадающим редакционным содержимым; изменённые пользователем значения сохраняются. Rollback в ходе проверки не запускался.

Источники about: `docs/parsings/ksk.inlove/business.json` (место, замысел уютного клуба), `content.json` → `review_derived_topics` (образы окружения, темы отзывов). Тексты написаны заново, темы отзывов атрибутированы, доступность инфраструктуры не обещана. `about.intro` и `about.setting` — string; `about.features` — object JSON с тремя `{id,label,value,approved:true}`: редакционное одобрение этой заметкой, не независимая проверка инфраструктуры.

## Проверки NOTE-06

- Anonymous `GET /api/news?limit=100` с selector INLOVE: ровно три seed slug.
- Anonymous `GET /api/news/by-slug/{slug}`: все три читаются, UUID совпадают, полный демонстрационный текст присутствует.
- Повторный seed: весь ответ list равен предыдущему, включая IDs, total, даты; дублей нет.
- Намеренный drift `name` одной собственной записи исправляется повторным seed; её slug и `published_at` сохраняются.
- Guarded-upsert probe оставляет запись другого tenant и существующие новости INLOVE неизменными.
- Anonymous `GET /api/site_settings?key=about.*`: каждый из трёх ключей точно равен сохранённому типу/тексту.
- Проверки format/test/lint backend неприменимы: только разрешённый data slice, targeted live verification по Router.

## Контакты для SC-N2 (read-only)

| Key | Значение |
|---|---|
| contacts.primary_phone | +79219880772 |
| social.vk_url | https://vk.ru/inlovehorse |
| social.instagram_url | https://www.instagram.com/ksk.inlove/ |
| contacts.coordinates | {"latitude":59.773315,"longitude":29.973801} |
| contacts.maps_url | https://yandex.ru/maps/org/inlav/65789410136/ |
| contacts.address | Ломоносовский район, д. Иннолово, Заречная ул., с. 3 |

`contacts.phones`, `contacts.working_hours`, `contacts.nearest_stop` имеют исходный повреждённый JSON с literal NULL; в рамках этого unit не менялись. Для трёх каналов использовать валидные primary_phone/VK/Instagram.
