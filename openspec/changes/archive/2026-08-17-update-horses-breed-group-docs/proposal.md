## Why

После добавления групп пород в `breeds-group-048` встроенные вкладки «Инструкция» и «Документация» раздела «Лошади» остались на прежнем контракте: администратор не видит рабочего процесса группировки пород, а разработчик — endpoint-ов, DTO и новых полей связи. Из-за этого справка внутри CMS расходится с фактическим UI и API.

## What Changes

- Обновить пользовательскую вкладку «Инструкция»: включить группы пород в обзор раздела, добавить отдельный сценарий управления группами и описать назначение группы в форме, таблице, фильтре и сортировке пород.
- Обновить developer-вкладку «Документация»: добавить ресурс `breed_groups`, полный контракт `/api/horses/breed-groups`, query/body/response примеры, `page_data`, access semantics и связь `breed_group_id`/`group` с породами.
- Добавить компонентные regression-тесты статического контента обеих вкладок, включая отсутствие устаревших формулировок и проверку ключевых contract tokens.
- Выполнить browser Manual QA вкладок на desktop/tablet/mobile с проверкой доступности по существующим scopes, читаемости таблиц/code blocks и отсутствия визуальных наложений. Если browser runtime объективно недоступен на текущей платформе, допускается только явно одобренный пользователем waiver с evidence попыток, перечнем отложенных проверок и принятого остаточного риска; такой waiver не означает, что browser QA пройден.
- Backend API, БД, access policy, маршруты, scopes и runtime-поведение групп пород не изменяются.

## Capabilities

### New Capabilities

- `cms-horse-breed-group-documentation`: встроенная пользовательская и developer-документация CMS для групп пород и их связи с породами.

### Modified Capabilities

Нет.

## Impact

- Сервис: `services/frontend` (Protected Admin CMS UI).
- Основные файлы: `src/features/horses/ui/HorsesUserDocumentationView.tsx`, `src/features/horses/ui/HorsesDeveloperDocumentationView.tsx` и новые colocated tests.
- Используется реализованный контракт `breeds-group-048`; backend и `site-*` не затрагиваются.
- Зависимости не добавляются. Изменение не является breaking.
