# Архивирование с blockers — reconcile-yandex-root-onboarding

**Дата:** 2026-10-22  
**Change:** `reconcile-yandex-root-onboarding`  
**Статус:** ⚠️ **ARCHIVED WITH BLOCKERS** (incomplete, not for production use)

---

## Причина архивирования

Пользовательский запрос на архивирование as-is, несмотря на известные blockers. Этот change **НЕ прошёл Quality Gate** и **НЕ готов к production use**.

---

## Blockers на момент архивирования

### AR-B01: Отсутствие QG evidence
- **Проблема:** Нет доступного QG-SYNTH APPROVED
- **Детали:** FORMAT.5 открыт; receipts (format/lint/test exits, isolation, accounting) отсутствуют
- **Impact:** Невозможно подтвердить, что change прошёл обязательную verification

### AR-B02: Strict validation failed
- **Проблема:** `openspec validate --strict` exit 1
- **Детали:** 4 ADDED requirements в delta spec имеют text >500 characters:
  - "Проверяемый корневой onboarding сервисов Яндекса"
  - "Разделение документируемых команд и гарантий поддержки"
  - "Безопасный инвентарь root env и ресурсов Яндекса"
  - "Документированные пределы registry и безопасная операционная граница"
- **Impact:** Delta spec не соответствует OpenSpec schema constraints

### AR-N01: Main/delta overlap unresolved
- **Проблема:** Capability `repository-process-tooling` пересекается с main spec
- **Детали:** 
  - Main spec требует registry aliases и bounded readiness для metrica/БД
  - Delta требует документировать их отсутствие как deferred
  - Потенциальное противоречие при sync
- **Impact:** Sync может привести к inconsistent spec

---

## Прогресс на момент архивирования

- **Planning artifacts:** Complete (proposal/specs/design/tasks)
- **Implementation tasks:** 77/78 (98.7%) — только FORMAT.5 открыт
- **Delta specs:** 1 capability (repository-process-tooling)
- **QG reports:** Только archive-readiness.md (BLOCKED verdict)

---

## Что НЕ выполнено

❌ **Quality Gate lanes:**
- QG-FORMAT — не выполнен (FORMAT.5 open, receipts missing)
- QG-SYNTH — не выполнен (no synthesis report)
- QG-CONTRACTS — unknown status
- Other lanes (ENV/BE/FE/LIVE) — unknown

❌ **Main specs sync:**
- Delta spec НЕ синхронизирован в main
- Main/delta overlap НЕ разрешён

❌ **Strict validation:**
- 4 oversized requirements НЕ исправлены

---

## Production gate

**⛔ BLOCKED для production use.**

Этот archived change:
- НЕ подтверждает quality gate pass
- НЕ гарантирует source integrity
- НЕ гарантирует contracts compliance
- НЕ может быть использован как baseline для deployment

---

## Metadata snapshot

- **Planning root HEAD:** `4be101744e20299690773060a84c362184a2d5cc` (historical)
- **Archive moment HEAD:** `457be4391fa800214ce6939030d3e125962b89be`
- **Worktree status:** dirty
- **Docs patch SHA-256:** `9a306fe1afd588a68f8de7a58ffbef7726facb022fde1dde587f80c20934ddb6`

### Artifact fingerprints (pre-archive)

| Artifact | SHA-256 |
|---|---|
| tasks.md | `3c234cbea9a7c63ca3b6f934825966356031381544eb397f4580d2ed55bd5659` |
| design.md | `8ade5020bc00f16fae6aa82c540b499cb2164f940a08aed630a693a287d4a985` |
| delta spec | `fef27055e48154d9e323b043858ea156d873f4d7ad24a4e1a7497ed8189d03f8` |
| main spec | `8ea48eb27d02f96a3bda6ae767f27a6765f854704ea068b2cf0a16b5a75a12ee` |

---

## Archived location

`openspec/changes/archive/2026-10-22-reconcile-yandex-root-onboarding/`

---

## Следующие шаги (если потребуется использовать)

Чтобы использовать этот change, потребуется:

1. **Исправить strict validation:**
   - Сократить 4 requirement texts до ≤500 characters
   - Или разбить на несколько requirements

2. **Выполнить Quality Gate:**
   - QG-FORMAT с полными receipts (format/lint/test exits, isolation, accounting)
   - QG-CONTRACTS
   - QG-SYNTH = APPROVED

3. **Разрешить main/delta overlap:**
   - Bounded contracts decision по repository-process-tooling
   - Согласовать metrica/БД registry requirements vs deferred documentation

4. **Sync и повторная validation:**
   - Sync delta → main spec
   - Повторить strict validation
   - Archive с APPROVED verdict

---

## Disclaimer

**Этот archived change НЕ является approved baseline.** Он заархивирован as-is по пользовательскому запросу, но содержит известные blockers и НЕ прошёл обязательную verification. Использование для production deployment или как reference baseline **НЕ рекомендуется** без предварительного устранения всех blockers и прохождения полного Quality Gate.
