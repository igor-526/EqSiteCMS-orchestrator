## Why

Задача `docs/tasks/070_inlove_static_pages.md` требует заменить заглушки главной, новостей и страницы «О клубе» полноценным серверным контентом INLOVE. Каждая новость должна открываться по slug в отдельном URL. Контент должен быть индексируемым без клиентского JavaScript и адаптивным для компьютеров, планшетов и телефонов.

## What Changes

- Реализовать `/` по scheme.md: hero с локальной фотографией, четыре квадратные service cards с иконками, преимущества программ и клуба, последняя новость, переиспользуемые контакты с картой; блок стоимости исключён.
- Реализовать `/about`: вступление, инфраструктура, галерея, одобренная команда, сводка отзывов и общие с главной контакты; тексты из settings, без оплаты и секции обработки персональных данных.
- Реализовать `/novosti` с серверной выдачей и ссылочной пагинацией и `/novosti/[slug]` с полным санитизированным content и metadata.
- Добавить в backend сохраняемый автоматически создаваемый стабильный news slug и `GET /api/news/by-slug/{slug}`. Существующий UUID detail сохранить и расширить full content, list/CMS outputs — slug. Входные payloads CMS совместимы; CMS UI не меняется.
- Добавить миграцию news.slug с backfill и tenant unique constraint. Рекомендуемый slug — нормализованное название с полным UUID suffix; после переименования неизменяем.
- После approval отдельным Planner unit согласовать прежнее inline-only ограничение scheme/components и пересекающиеся placeholder требования 069. Четыре другие заглушки сохраняются.

## Capabilities

### New Capabilities

- `news-public-slugs`: сохраняемый slug, Public Read full content, совместимость UUID/CMS и access matrix A1–A9.
- `inlove-content-pages`: SSR-композиции главной/about, settings, fallback, SEO, безопасность и responsive.
- `inlove-news-pages`: SSR архив, пагинация, отдельная новость, canonical и error/404 semantics.
- `inlove-placeholder-pages`: переход трёх заглушек к контенту с сохранением четырёх остальных. Capability добавлена активным 069, но ещё отсутствует в main specs: delta сейчас ADDED; design «Переход 069» определяет переход к MODIFIED при появлении baseline перед sync.

### Modified Capabilities

Существующих main capabilities не меняем. Пересечение с активным `inlove-site-header-footer` обрабатывается явно в DOC-1/SYNC-1, не выдаётся за уже синхронизированное требование.

## Impact

Backend: news table/entity/migration, repository/protocol/service, API/DTO/tests. Site: три route pages, новый `[slug]`, news wrappers/types, server loaders, page compositions, targeted shared compatibility/tests и sanitizer dependency при необходимости. Документы: scheme/components, четыре delta/main capabilities и один QG report. NATS, deployment, CMS UI, seed и остальные сервисы не меняются.

Проверенные факты: текущий news detail параметр UUID, публичный DTO не содержит slug/content; scheme/components задавали inline-only; 069 имеет незавершённые QA units. Перед изменением общих paths нужен конкретный baseline/handoff владельца 069, но завершение всего 069 не является безусловным prerequisite реализации. Перед sync обязательно упорядочить пересекающиеся delta, чтобы поздний 069 не вернул заглушки.

Полный design содержит deliverables → bounded execution units → tasks, DAG и risk-based test matrix; все пять QG lanes применимы, NATS внутри live lane неприменим. После общего APPROVED — sync, strict validation и archive.

### Статус approval

Пользователь явно подтвердил Apply (передано Router в DOC-1, 2026-09-09). Утверждены backend migration/API, неизменяемый slug с UUID suffix, SSR пагинация, ограничение галереи существующим public API и безопасный privacy fallback. Реализация выполняется по execution units; Quality Gate и sync/archive остаются отдельными этапами.

## Уточнение пользователя — промежуточная заметка 070

Пользователь поручил продолжать с перечисленными исправлениями, включая три mock новости в реальной БД и новый текст about в site-settings. Это авторизованное уточнение текущего change, отдельный approval не требуется. Конкретные новые units и актуальные критерии находятся в design/tasks → «Промежуточная заметка 070»; прежние выполненные задачи сохраняют историю, но не заменяют проверку уточнённого результата. Новых backend endpoint и внешней публикации нет.
