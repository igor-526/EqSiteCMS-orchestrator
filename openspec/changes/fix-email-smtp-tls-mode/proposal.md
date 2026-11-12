# Proposal

## Why

На `smtp.mail.selcloud.ru:1127` отправитель ждёт plaintext SMTP greeting вместо немедленного TLS: выбор защиты привязан к портам 465/587 и игнорирует `SMTP_USE_TLS`. Исходный запрос: [113_email_smtp_tls_mode.md](../../../docs/tasks/113_email_smtp_tls_mode.md); доступность TLS/STARTTLS сообщена пользователем, авторизация и доставка не доказаны.

## What Changes

- Ввести `SMTP_TLS_MODE=tls|starttls|none`: явный режим не зависит от порта; отсутствие режима обрабатывает только документированная legacy-матрица.
- Сохранить безопасную совместимость 465/587; `SMTP_USE_TLS=true` на нестандартном порту означает implicit TLS, поэтому 1127 перестаёт игнорировать эту настройку. Для 1126 использовать явный `starttls`.
- **BREAKING**: отклонять неоднозначную конфигурацию нестандартного порта без настроек, legacy `false` без явного `none`, пустые/невалидные значения и конфликты. Вместо прежнего игнорирования флага либо plaintext происходит ошибка до сети. Runtime-конфигурацию автоматически не переписывать.
- Передавать оба булевых флага `aiosmtplib` явно, сохранять проверку сертификатов и исключить повторную попытку с более слабой защитой.
- Обновить service README и безопасный `.env.example`, добавить конфигурационные и adapter regression tests, убрать тему письма из логирования SMTP-адаптера.
- Разделить локальную проверку от отдельно разрешаемых deployment, авторизации и live-send; до внешней авторизации нужен перевыпуск опубликованного API-ключа владельцем.

## Capabilities

### New Capabilities

- `email-smtp-transport`: конфигурация и безопасный выбор SMTP-транспорта, совместимость legacy и граница доказательств доставки. Это инфраструктурный контракт; существующая `email-send-logic` описывает core-обработку события, а не TLS.

### Modified Capabilities

Нет. Формирование писем, HTTP API, подтверждение при привязке, Celery retry и NATS envelope не меняются.

## Impact

- Отдельный git-репозиторий `services/email-service`: `src/settings.py`, `src/infrastructure/email_sender.py`, service `README.md`, `.env.example`, новые `tests/unit/test_smtp_settings.py`, `tests/unit/test_email_sender.py`, тестовая изоляция `tests/conftest.py`.
- Root-репозиторий: только исходный task, этот OpenSpec change и будущий единственный QG-отчёт. Чужие dirty paths и смежные changes не затрагиваются.
- Новые зависимости, миграции, deployment/Helm/CI и runtime secrets не нужны. API endpoints не меняются: Public Read / Protected Write и существующие исключения остаются прежними; новая access matrix не требуется.
- Локальная реализация проверяется `QG-LITE`. Production timeout и доставка остаются `unchecked` до отдельного разрешения, без подмены mock-тестами. Approval этого change — только gate к последующей реализации, не разрешение runtime-операций.
