## Why

Запрос [097](<../../../docs/tasks/097_yandex_services_retrospective_specs.md>) требует оформить корневой репозиторий после ручной реализации двух сервисов Яндекса. Их записи уже присутствуют в manifest, Make и Compose, но архитектурный каталог их не описывает, а README ошибочно объявляет `test`/`lint` алиасами core gate; оператору нужна достоверная документация без легализации непроверенных runtime/access-контрактов.

## What Changes

- Дополнить [SERVICES.md](<../../../SERVICES.md>) минимальными ролями `yandex-service` (сервис интеграции с Яндексом) и `ya-metrica-service` (адаптер Яндекс Метрики), путями самостоятельных nested Git-репозиториев, ресурсами Compose и пределами подтверждённой поддержки. Детальную функциональность вынести в отдельный service-backfill.
- Согласовать [README.md](<../../../README.md>) с существующими индивидуальными Make-целями запуска/сборки и реальным агрегированием `test`, `lint`, mutating `format`; не обещать готовность core `check` без проверки его реализации.
- В каталоге описать только безопасные env placeholders из root Compose/Make, обязательные service `.env`, внешнюю сеть, отдельные DB/volumes и опубликованные host-порты. Реальные env и секреты не читать и не публиковать.
- Разделить manifest discovery, Make, `stackctl` и `shipctl`: профиль/alias `yandex`/`yandex-service` существует в `stackctl`, metrica и обе DB в его явных registry отсутствуют; `shipctl plan` обнаруживает репозитории по manifest, что не доказывает release/deployment поддержку.
- Зарегистрировать deferred gaps: расширенные root quality recipes против core-only нормативного gate, непроверенный core `check`, неполная stackctl-поддержка, network exposure/access, deployment readiness и полная service env/schema/API спецификация. Не менять tooling ради устранения этих gaps.

## Capabilities

### New Capabilities

Нет: отдельная runtime capability не вводится.

### Modified Capabilities

- `repository-process-tooling`: добавить документальный контракт согласования root onboarding двух сервисов с проверяемыми источниками, безопасными placeholders и явными пределами поддержки. Действующие требования core gate не расширяются и не переписываются под наблюдаемый drift.

## Impact

Будущий apply меняет только [SERVICES.md](<../../../SERVICES.md>) и [README.md](<../../../README.md>); planning — только этот change. Manifest, Make, Compose, scripts, runtime/services, Helm, CI и core release scope остаются неизменными. Endpoint changes отсутствуют: access matrix и anonymous/authenticated HTTP tests неприменимы; обнаруженные auth/token gaps не становятся разрешёнными исключениями. [Core release hardening](<../../specs/core-service-release-hardening/spec.md>) не изменяется.

Change независим от endpoint/error freeze: активный `normalize-yandex-client-failures` не редактируется, а будущий service-backfill должен дождаться его принятого результата для endpoint/errors. Apply возможен только после отдельного пользовательского approval; sync/archive/commit/deployment в это предложение не входят.
