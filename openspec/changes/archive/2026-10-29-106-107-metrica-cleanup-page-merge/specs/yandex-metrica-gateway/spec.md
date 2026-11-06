# Удаление счётчика и повторная привязка

## MODIFIED Requirements

### Requirement: Удаление по UUID привязки
Удаление SHALL использовать UUID записи привязки из path `counter_id`, а не ID счётчика Яндекс. Удаление существующей привязки SHALL атомарно сохранять запрос очистки всех статистик Метрики конюшни и удалять привязку. Отсутствующая запись и повторное удаление SHALL оставаться идемпотентными без новой очистки и без payload; предварительный account lookup не требуется.

#### Scenario: Y2-17 — удаление и повтор
- **WHEN** delete запрошен по UUID записи, в том числе отсутствующему либо уже удалённому
- **THEN** существующая привязка удаляется с устойчивым запросом очистки, повтор возвращает пустой успех без второй операции; HTTP outcome следует peer matrix

#### Scenario: Y2-18 — malformed path и body
- **WHEN** GET/DELETE binding получает malformed UUID либо set получает отсутствующие обязательные поля/невалидный UUID
- **THEN** binding repository и account repository не вызываются, ввод не отражается в безопасном отказе

## ADDED Requirements

### Requirement: Устойчивый lifecycle конюшни
Внутреннее чтение привязки SHALL дополнительно возвращать `binding_generation`, `cleanup_requested_seq`, `cleanup_completed_seq`, включая `counter=null`. Повторная привязка MUST NOT сбрасывать watermark. Только коррелированный результат очистки SHALL продвигать completed; запоздалый результат MUST NOT разблокировать более новое удаление.

#### Scenario: YD-01 Быстрое переподключение
- **WHEN** удалена привязка поколения G, создана новая, очистка ещё не закончена
- **THEN** generation изменяется, requested больше completed, существующие CMS DTO не получают lifecycle-поля; новая привязка сохраняется, но парсинг ждёт очистку

#### Scenario: YD-02 Откат и перестановка
- **WHEN** транзакция удаления откатилась либо результат старой очистки пришёл после нового DELETE
- **THEN** при rollback нет ни удаления, ни outbox; старый результат не очищает новый барьер и не удаляет новую привязку

### Requirement: Доступ при изменении lifecycle
Сервис SHALL сохранять access matrix ниже. Новые lifecycle-поля MUST оставаться private peer данными и MUST NOT попадать в gateway DTO. Причины peer исключений — доверенный межсервисный контур без user auth; CMS запись остаётся Protected Write, а чувствительный GET — private исключение. Production изоляция обязательна отдельно.


#### Scenario: YD-03 Anonymous и authenticated
- **WHEN** каждая строка вызывается без сессии, с SEO-only, SEO+ADMIN и без SEO; peer дополнительно без/с Cookie/Bearer
- **THEN** outcome соответствует matrix, ADMIN-only/SUPERUSER/DEVELOPER не обходят SEO, foreign gateway account отклоняется до мутации

#### Scenario: YD-04 Ошибка записи
- **WHEN** commit удаления или сохранения outbox не удался
- **THEN** peer возвращает безопасный 400, а не 204; HTTP успех означает сохранённое намерение, не окончание очистки

##### Access matrix

| method | path | access class | roles | expected without auth | expected with auth |
|---|---|---|---|---|---|
| DELETE | backend `/api/yandex/metrica/connection` | Protected Write | строго SEO, свой tenant | 401 | SEO 204; без SEO 403; отсутствующая привязка 204 |
| POST | backend `/api/yandex/metrica/connection` | Protected Write | строго SEO, свой tenant | 401 | SEO 200; без SEO 403; чужой account 404; invalid 400 |
| GET | backend `/api/yandex/metrica/connection` | Sensitive Private Read | строго SEO | 401 | SEO 200; без SEO 403; без lifecycle/token полей |
| DELETE | yandex `/api/connections/metrica/{counter_id}` | Internal Trusted Network Write, exception | доверенный peer | 204, absent 204; malformed 400 | то же, Cookie/Bearer игнорируются |
| POST | yandex `/api/connections/metrica` | Internal Trusted Network Write, exception | доверенный peer | 200; invalid/conflict 400 | то же |
| GET | yandex `/api/connections/metrica/{equestrian_id}` | Private Peer Read, exception | доверенный peer | 200 с lifecycle; malformed 400 | то же |
