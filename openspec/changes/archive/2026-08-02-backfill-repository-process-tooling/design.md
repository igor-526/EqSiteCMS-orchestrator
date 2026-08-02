## Context

Пакет `PR-1` выделен реестром ownership в change `integrate-openspec-workflow` и охватывает задачи `001`, `005`, `008`, `021`, `022`, `023`. Источниками фактов являются актуальные repository instructions, итоговые reports, offline import artifacts и состояние OpenSpec change; тексты исходных задач и legacy plans описывают намерение и сами по себе не доказывают реализацию.

## Goals / Non-Goals

**Goals:**

- Создать один apply-ready русскоязычный delta spec `repository-process-tooling` с единственным владельцем Backend/tooling.
- Зафиксировать подтверждённые process/tooling контракты и трассировку всех шести назначенных задач.
- Сохранить gaps `G-005`, `G-021`, `G-023` как явные ограничения доказательств.
- Подготовить отдельный change к review, последующим sync и archive в tasks `7.4`–`7.5` родительского change.

**Non-Goals:**

- Изменение runtime-кода, endpoint, auth behavior, схемы БД или данных.
- Исполнение Joomla import либо закрытие его gap.
- Утверждение неподтверждённых live smoke, skipped-test audit, полного historical coverage, QG, sync или archive.
- Редактирование main specs или specs других capability-пакетов.

## Decisions

### 1. Один spec объединяет repository process и offline tooling

Capability следует утверждённому ownership `PR-1`: агентные правила, quality tooling, offline import и управление документационными артефактами являются репозиторными механизмами, а не runtime-возможностями сервисов. Альтернатива — разнести их по backend/frontend capabilities — отклонена из-за смешения process-контрактов с бизнес-контрактами.

### 2. Нормативны только наблюдаемые свойства

Для `implemented` строк нормативно фиксируется фактическое состояние файлов и подтверждённый report. Для `partial` строк фиксируется только подтверждённая часть, а отсутствующее evidence обозначается gap ID. Legacy task/plan используется для трассировки происхождения, но не для доказательства выполнения.

### 3. Access policy имеет значение N/A

Пакет не добавляет и не меняет endpoint. Поэтому access matrix, роли и anonymous/authenticated HTTP scenarios неприменимы; spec запрещено превращать процессные инструкции или offline import в runtime API assertions.

### 4. Lifecycle остаётся незавершённым до внешних стадий

Этот change создаётся apply-ready, но не синхронизируется и не архивируется в task `7.3`. Process reviewer выполняет task `7.4`, а task `7.5` владеет validation/sync/archive. Тем самым исполнитель не обходит общий Quality Gate и пакетный lifecycle родительского change.

## Risks / Trade-offs

- [Текущие инструкции изменятся до sync] → Reviewer повторно сверяет spec с repository evidence и блокирует неподтверждённые claims.
- [Описание offline import будет воспринято как успешный импорт] → `G-021` явно запрещает claim о dry-run, выбранной БД и применении данных.
- [Наличие quality-правил будет воспринято как evidence прогонов] → `G-005` отделяет документированный процесс от отсутствующего timestamped live-smoke/skipped-test audit.
- [Текущий OpenSpec change будет объявлен завершённым преждевременно] → `G-023` сохраняется до фактических tasks `5.1`–`9.9`, QG, sync и archive.

## Migration Plan

1. Process reviewer сверяет change с назначенным evidence и gaps в task `7.4`.
2. После успешного review Backend/tooling валидирует, синхронизирует и архивирует пакет в task `7.5`.
3. Общий coverage review связывает main spec с manifest в task `8.1`.

Rollback выполняется OpenSpec change, изменяющим синхронизированный main spec; ручное изменение runtime или БД не требуется.

## Open Questions

Блокирующих вопросов нет. Закрытие `G-005`, `G-021`, `G-023` требует отдельного фактического evidence и не входит в этот backfill.
