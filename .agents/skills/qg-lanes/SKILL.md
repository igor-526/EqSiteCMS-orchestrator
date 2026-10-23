---
name: qg-lanes
description: Запуск lanes Quality Gate профиля QG-FULL отдельными delegate_quality_gate агентами
whenToUse: Только для профиля QG-FULL (миграции, NATS/AsyncAPI или >2 сервисов с кодом). Для QG-DOCS и QG-LITE не используй — делегируй одного QG-агента через delegate_quality_gate
---

# Quality Gate Lanes (QG-FULL)

Lanes профиля `QG-FULL` запускаются отдельными агентами `delegate_quality_gate` (фон, continuable). Инструмент `workflow` в preset `eqsite-router` отключён: агенты workflow получают persona Router и отказываются выполнять review.

Профили, классификация findings и содержимое lanes — в `agents/quality_gate.md`.

## Применимые lanes

По path-scoped diff change:

- `QG-ENV` — есть runtime/API/UI diff;
- `QG-BE` — diff в Python-сервисах; включает scoped `format/lint/test` этих сервисов;
- `QG-FE-AUTO` — diff в `services/frontend` или `services/site-*`; включает scoped `format/lint/test` этих сервисов;
- `QG-CONTRACTS` — всегда;
- `QG-LIVE` — runtime API diff;
- `QG-FE-MANUAL` — UI/UX behavior diff; CMS проверяется в одном viewport 1366×768;
- `QG-SYNTH` — всегда; пишет единственный отчёт `docs/reports/<change>.md`.

Отдельного агента `QG-FORMAT` нет: его процедура выполняется внутри `QG-BE` и `QG-FE-AUTO`.

## Порядок

```text
QG-ENV (фон, дождаться)
  → QG-BE ∥ QG-FE-AUTO ∥ QG-CONTRACTS   (одним сообщением, фон)
  → QG-LIVE ∥ QG-FE-MANUAL             (одним сообщением, фон; только если на предыдущем уровне нет blocking)
  → QG-SYNTH                           (фон)
```

После запуска уровня Router завершает ответ коротким статусом. Уведомления о завершении будят Router; следующий уровень запускается, когда завершены все агенты текущего.

Если на уровне `BE/FE-AUTO/CONTRACTS` есть `blocking` — сначала fix units владельцам, повторная проверка теми же агентами, затем `LIVE/FE-MANUAL`. Browser QA по коду, который ещё изменится, не запускается.

## Prompt lane

```text
Ты Quality Gate, lane <LANE>, профиль QG-FULL. Change: <change-id>.
contextFiles: <секции design.md, specs/<capability>/spec.md>
Изменённые пути: <union «Изменённые файлы» из handoff'ов units>
Handoff'ы units: <коротко, только нужное lane>
Evidence: .qa/<change-id>/<lane>/ . Файлов в docs/reports не создавай.
Верни handoff финальным сообщением: статус, findings с классом (blocking/minor/pre-existing/blocked-env), команды и результаты, пути к evidence.
```

`QG-SYNTH` получает handoff'ы всех lanes в prompt, сам проверки не повторяет, пишет `docs/reports/<change-id>.md` и ставит вердикт.

## Повтор после fix

Тот же агент lane через `send_message`, только затронутые findings. Не более одного повторного раунда. Результат дописывается в тот же отчёт: Router передаёт его агенту `QG-SYNTH` через `send_message`.
