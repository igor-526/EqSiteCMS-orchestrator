# Интеграция Playwright E2E — Summary

## Проблема

Quality Gate lane `QG-FE` требовал manual проверку UI в браузере, но субагент не может открыть браузер напрямую.

**Пользовательское требование**:
> Агент должен самостоятельно открывать браузер и проводить Manual QA с помощью Playwright.  
> Установить его один раз глобально, так как эта зависимость на production не нужна,  
> а frontend сервисов несколько — не переиспользовать будет глупо.

---

## Решение

✅ **Playwright E2E установлен глобально** на уровне монорепозитория для всех frontend-сервисов.

### Архитектура

```
eqSiteCMS/
├── package.json                    # Глобальный Playwright (devDependency)
├── playwright.config.ts            # Единая конфигурация
├── e2e/                            # E2E тесты
│   ├── frontend/                   # CMS Admin UI
│   │   ├── auth.spec.ts
│   │   └── example-projects.spec.ts
│   ├── site-ad/                    # Public Site
│   ├── site-ksk-inlove/            # Public Site
│   └── shared/                     # Общие helpers
│       ├── auth.ts
│       └── fixtures.ts
├── Makefile                        # Команды e2e-*
└── services/
    ├── frontend/                   # НЕТ своего Playwright
    ├── site-ad/                    # НЕТ своего Playwright
    └── site-ksk-inlove/            # НЕТ своего Playwright
```

**Преимущества**:
- ✅ Одна установка для всех сервисов
- ✅ Общие helpers и fixtures
- ✅ Единая конфигурация
- ✅ Не требуется на production
- ✅ Переиспользование между сервисами

---

## Что создано

### 1. Инфраструктура

| Файл | Описание |
|------|----------|
| [`package.json`](../../package.json) | Root package с Playwright devDependency и workspaces |
| [`playwright.config.ts`](../../playwright.config.ts) | Конфигурация для всех проектов (frontend, site-ad, site-ksk-inlove) |
| [`.gitignore`](../../.gitignore) | Игнорирование E2E artifacts (test-results, e2e-report) |

### 2. E2E Тесты (примеры)

| Файл | Что покрывает |
|------|---------------|
| [`e2e/shared/auth.ts`](../../e2e/shared/auth.ts) | Helpers авторизации (loginAsAdmin, logout, isLoggedIn) |
| [`e2e/shared/fixtures.ts`](../../e2e/shared/fixtures.ts) | Расширенные fixtures (authenticatedPage) |
| [`e2e/frontend/auth.spec.ts`](../../e2e/frontend/auth.spec.ts) | Авторизация в CMS Admin UI (login, logout, validation) |
| [`e2e/frontend/example-projects.spec.ts`](../../e2e/frontend/example-projects.spec.ts) | Projects CRUD (create, edit, delete, search, pagination) |

### 3. Makefile команды

```bash
make e2e-install      # Установка Playwright и браузеров
make e2e              # Запуск всех E2E тестов (headless)
make e2e-ui           # UI mode (интерактивная отладка)
make e2e-headed       # С открытым браузером
make e2e-frontend     # Только CMS frontend тесты
make e2e-report       # Показать отчёт
```

### 4. Документация

| Файл | Описание |
|------|----------|
| [`docs/operations/e2e-testing-setup.md`](e2e-testing-setup.md) | Полная документация по E2E тестированию |
| [`E2E-README.md`](../../E2E-README.md) | Quick start guide |
| [`agents/howto/browser-qa-protocol.md`](../../agents/howto/browser-qa-protocol.md) | Обновлён с интеграцией Playwright |

---

## Интеграция с Quality Gate

### QG-FE-AUTO lane

Quality Gate lane `QG-FE-AUTO` теперь запускает E2E тесты:

```bash
# В корне монорепозитория
cd /home/igor/projects/eqSiteCMS

# Unit тесты и статические проверки
cd services/frontend
npm test
npm run lint
tsc --noEmit
npm run build

# E2E тесты (если существуют)
cd ../..
if [ -d "e2e/frontend" ] && [ "$(ls -A e2e/frontend/*.spec.ts 2>/dev/null)" ]; then
  make e2e-frontend
fi
```

### Handoff формат

```
Unit: QG-FE-AUTO | Профиль: Quality Gate | Статус: done / rework
Verification:
  - npm test: 42 passed, 0 failed
  - lint: clean
  - tsc --noEmit: no errors
  - build: success
  - E2E (Playwright): 8 passed, 0 failed  ← НОВОЕ
Findings: нет
E2E Coverage: auth (3 tests), projects CRUD (5 tests)
Требуется QG-FE-MANUAL: нет (полностью покрыто E2E)
```

### Когда QG-FE-MANUAL не нужен

Если UI diff **полностью покрыт** Playwright E2E тестами, `QG-FE-MANUAL` помечается `неприменимо`:

```
QG-FE-MANUAL: неприменимо
Причина: все UI changes покрыты Playwright E2E тестами
Evidence: make e2e-frontend → 8 passed (auth, projects CRUD)
```

---

## Использование

### Установка (один раз)

```bash
cd /home/igor/projects/eqSiteCMS
make e2e-install
```

### Запуск

```bash
# Все тесты
make e2e

# Только frontend
make e2e-frontend

# UI mode для отладки
make e2e-ui
```

### Написание новых тестов

```typescript
// e2e/frontend/my-feature.spec.ts
import { test, expect } from '../shared/fixtures';

test('should do something', async ({ authenticatedPage: page }) => {
  // page уже авторизована
  await page.goto('/admin/my-feature');
  await page.click('button:has-text("Действие")');
  await expect(page.locator('h1')).toContainText('Успех');
});
```

---

## Roadmap

### ✅ Phase 1: Infrastructure (DONE)
- [x] Глобальная установка Playwright
- [x] Конфигурация для всех проектов
- [x] Shared helpers и fixtures
- [x] Примеры E2E тестов (auth, projects CRUD)
- [x] Makefile команды
- [x] Интеграция в QG-FE-AUTO
- [x] Документация

### 🔄 Phase 2: Coverage Expansion (IN PROGRESS)
- [ ] E2E тесты для всех критичных UI flows
  - [ ] Categories management
  - [ ] Horses management
  - [ ] Gallery selector
  - [ ] News management
- [ ] E2E тесты для `site-ad`
- [ ] E2E тесты для `site-ksk-inlove`

### ⏳ Phase 3: Advanced Testing (PLANNED)
- [ ] Visual regression testing (Percy / Chromatic)
- [ ] Accessibility testing (axe-core)
- [ ] Performance testing (Lighthouse CI)
- [ ] Mobile E2E (Pixel 5, iPhone)

### ⏳ Phase 4: Full Automation (GOAL)
- [ ] 100% UI changes покрыты E2E
- [ ] `QG-FE-MANUAL` неприменим для большинства changes
- [ ] CI/CD integration (GitHub Actions)

---

## Best Practices для разработчиков

### 1. Добавляй data-testid

```tsx
<button data-testid="create-project-button">Создать</button>
```

### 2. Пиши E2E для новых UI flows

```typescript
// Для каждого нового UI flow добавляй E2E тест
test('should handle new feature', async ({ authenticatedPage: page }) => {
  // ...
});
```

### 3. Проверяй E2E локально перед commit

```bash
make e2e-frontend
```

### 4. Используй UI mode для отладки

```bash
make e2e-ui
```

---

## FAQ

### Почему глобально, а не в каждом сервисе?

- Экономия: один Playwright вместо трёх
- Переиспользование helpers между сервисами
- Единая конфигурация и версия
- Не попадает в production bundles

### Как запустить только конкретный тест?

```bash
npm run e2e -- e2e/frontend/auth.spec.ts
npm run e2e -- --grep "should login"
```

### Как добавить E2E тест для site-ad?

1. Создай `e2e/site-ad/my-test.spec.ts`
2. Используй `baseURL` проекта `site-ad` (автоматически)
3. Запусти `npm run e2e -- --project=site-ad`

### Где смотреть отчёт?

```bash
make e2e-report
# Откроется браузер с HTML отчётом
```

---

## Связанные документы

- [`docs/operations/e2e-testing-setup.md`](e2e-testing-setup.md) — полная документация
- [`E2E-README.md`](../../E2E-README.md) — quick start
- [`agents/howto/browser-qa-protocol.md`](../../agents/howto/browser-qa-protocol.md) — интеграция с Quality Gate
- [`agents/quality_gate.md`](../../agents/quality_gate.md) — QG-FE-AUTO lane

---

**Дата внедрения**: 2024-10-06  
**Статус**: ✅ Активно, готово к использованию  
**Автор**: Router Agent  
**Запрос пользователя**: Самостоятельное открытие браузера агентом для Manual QA
