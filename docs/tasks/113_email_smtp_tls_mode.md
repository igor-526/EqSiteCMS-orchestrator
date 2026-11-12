# 113 — Явный режим SMTP TLS в email-service

## Исходный запрос

Письма подтверждения через `smtp.mail.selcloud.ru:1127` не отправляются: `SMTPConnectTimeoutError: Timed out waiting for server ready message`. В `services/email-service/src/infrastructure/email_sender.py` используются `use_tls = smtp_settings.smtp_port == 465` и `starttls = smtp_settings.smtp_port == 587`. На порту 1127 оба флага выключены; `SMTP_USE_TLS=True` игнорируется.

Пользователь проверил из воркера: implicit TLS на 1127 и STARTTLS на 1126 доступны, сертификаты валидны. Это пользовательское наблюдение, не evidence агента; авторизация, отправка и доставка не проверены.

Нужны явные режимы implicit TLS / STARTTLS / plaintext независимо от порта, конкретная fail-closed совместимость новой настройки с `SMTP_USE_TLS`, обновление конфигурационной документации и тесты Selectel 1127/1126, стандартных 465/587, конфликтов и legacy-конфигурации. Скрытый downgrade недопустим.

## Acceptance и ограничения

- На 1127 TLS начинается немедленно; на 1126 STARTTLS запрашивается явно.
- Локальные тесты конфигурации и границы SMTP-клиента не являются доказательством доставки или отсутствия production timeout.
- Проверка доставки подтверждения и отсутствия timeout разрешена только после отдельного согласования deployment/live-send.
- Ранее опубликованный API-ключ необходимо перевыпустить до проверки авторизации. Выполнение перевыпуска не подтверждено. Значение ключа здесь отсутствует.
- Approval плана не разрешает deployment, внешнюю авторизацию, реальную отправку, смену ключей и изменение runtime secrets.
- Пароли, API-ключи и содержимое писем запрещены в логах и артефактах; credential-bearing env не читать.
- API, права, БД и NATS-контракты не изменяются. Подтверждение при привязке (`112_email_confirmation_on_bind.md`, `send-email-confirmation-on-bind`) — отдельная задача.

Единственный изменяемый план: `openspec/changes/fix-email-smtp-tls-mode/`.
