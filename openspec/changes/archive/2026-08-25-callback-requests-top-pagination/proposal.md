## Why

На CMS-странице заявок обратного звонка пагинация сейчас находится под таблицей и визуально расходится с соседними разделами «Новости» и «Лошади». Нужно привести управляющую строку к принятому паттерну: вкладки слева, пагинация справа в верхней части страницы, без дублирующего нижнего контрола.

## What Changes

- Переместить единственную пагинацию callback-заявок в верхнюю строку справа от вкладок «Заявки» / «Инструкция».
- Опираться на фактический CMS-паттерн `filtersElements`/header row из «Новостей» и `HorsesHeader` из «Лошадей»: flex-контейнер с вкладками слева и группой управляющих элементов справа.
- Показывать пагинацию только для таба «Заявки»; на табе «Инструкция» не оставлять не относящийся к содержимому контрол.
- Сохранить контракт `{ limit, offset }`, варианты размера страницы и сброс `offset` при изменении фильтров, поиска, сортировки и размера страницы.
- Зафиксировать адаптивное поведение desktop/tablet/mobile без overlap: верхняя строка может переноситься, пагинация остаётся доступной и не накладывается на вкладки.
- Добавить regression/component coverage и Manual QA для позиции, отсутствия дубликата и поведения пагинации.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `callback-requests-admin-ui`: уточняется обязательное расположение и единственность пагинации на вкладке заявок при сохранении существующей семантики списка и доступа.

## Impact

- Сервис: только `services/frontend` (Protected Admin UI для `ADMIN`/`SUPERUSER`).
- Основные зоны: `src/features/callbackRequests/ui/CallbackRequestsPage.tsx` и его component tests; при необходимости используется существующий generic `src/ui/TablePaginator.tsx` без изменения API-контракта.
- Референсы: `src/app/(protected)/news/page.tsx` формирует `filtersElements` с tabs слева и `Pagination` в правой группе; `src/features/horses/ui/HorsesHeader.tsx` располагает `HorsesTabs` и `TablePaginator` в общем header layout через родительский `MainTable` (`justify-between flex-wrap`).
- Backend endpoint, DTO, access policy, БД, NATS и `site-*` не изменяются. Архив `2026-08-25-callback-requests-management-055` остаётся неизменным.
