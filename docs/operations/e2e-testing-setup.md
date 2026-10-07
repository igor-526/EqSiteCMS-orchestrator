# E2E Testing с Playwright — Setup & Usage

## Архитектура

Playwright установлен **глобально** на уровне монорепозитория для переиспользования между всеми frontend-сервисами:
- `services/frontend` (CMS Admin UI)
- `services/site-ad` (Public Site)
- `services/site-ksk-inlove` (Public Site)

**Преимущества**:
- Одна установка Playwright для всех сервисов
- Общие fixtures и helpers в `e2e/shared/`
- Единая конфигурация в `playwright.config.ts`
- Не требуется на production (dev dependency)

---

## Установка

### Первоначальная установка

```bash
# 1. Установить npm зависимости (включая Playwright)
npm install

# 2. Установить браузеры Playwright (только Chromium)
npm run playwright:install

# Или одной командой через Makefile:
make e2e-install
```

### Проверка установки

```bash
npx playwright --version
# Playwright Version 1.48.0
```

---

## Структура тестов

```
e2e/
├── frontend/               # E2E тесты для CMS Admin UI
│   ├── auth.spec.ts       # Авторизация
│   ├── example-projects.spec.ts  # Projects CRUD
│   └── ...
├── site-ad/               # E2E тесты для site-ad
│   └── .gitkeep
├── site-ksk-inlove/       # E2E тесты для site-ksk-inlove
│   └── .gitkeep
└── shared/                # Общие helpers и fixtures
    ├── auth.ts            # Авторизация helpers
    └── fixtures.ts        # Расширенные fixtures
```

---

## Запуск тестов

### Через Makefile (рекомендовано)

```bash
# Все тесты (headless)
make e2e

# UI mode (интерактивная отладка)
make e2e-ui

# Headed mode (с открытым браузером)
make e2e-headed

# Только frontend тесты
make e2e-frontend

# Показать отчёт после прогона
make e2e-report
```

### Через npm

```bash
# Все тесты
npm run e2e

# UI mode
npm run e2e:ui

# Headed mode
npm run e2e:headed

# Debug mode
npm run e2e:debug

# Конкретный проект
npm run e2e -- --project=frontend

# Конкретный файл
npm run e2e -- e2e/frontend/auth.spec.ts

# С фильтром по названию теста
npm run e2e -- --grep "should login"
```

---

## Конфигурация

### `playwright.config.ts`

Глобальная конфигурация для всех проектов:

```typescript
projects: [
  {
    name: 'frontend',
    use: { baseURL: 'http://localhost:3000' },
    testDir: './e2e/frontend',
  },
  {
    name: 'site-ad',
    use: { baseURL: 'http://localhost:3001' },
    testDir: './e2e/site-ad',
  },
  // ...
]
```

### Environment Variables

Переопределяй базовые URL через `.env` или export:

```bash
# .env в корне проекта
FRONTEND_URL=http://localhost:3000
SITE_AD_URL=http://localhost:3001
SITE_KSK_INLOVE_URL=http://localhost:3002

# Тестовые credentials
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=admin
```

---

## Написание тестов

### Базовый тест

```typescript
import { test, expect } from '@playwright/test';

test('should load homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

### С авторизацией (через fixture)

```typescript
import { test, expect } from '../shared/fixtures';

test('should create project', async ({ authenticatedPage: page }) => {
  // page уже авторизована
  await page.goto('/admin/projects/new');
  // ...
});
```

### С кастомной авторизацией

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../shared/auth';

test('my test', async ({ page }) => {
  await loginAsAdmin(page, {
    email: 'custom@example.com',
    password: 'custompass',
  });
  // ...
});
```

---

## Интеграция с Quality Gate

### QG-FE-AUTO lane

Quality Gate lane `QG-FE-AUTO` обязан запускать E2E тесты, если они существуют:

```bash
cd /home/igor/projects/eqSiteCMS

# Проверка наличия E2E тестов для frontend
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

Если UI diff **полностью покрыт** E2E тестами, `QG-FE-MANUAL` помечается `неприменимо`:

```
QG-FE-MANUAL: неприменимо
Причина: все UI changes покрыты E2E тестами (auth.spec.ts, example-projects.spec.ts)
Evidence: make e2e-frontend → 8 passed
```

---

## Best Practices

### 1. Используй data-testid

```tsx
// В компонентах
<button data-testid="submit-button">Сохранить</button>

// В тестах
await page.click('[data-testid="submit-button"]');
```

### 2. Избегай жёстких селекторов

```typescript
// ❌ Плохо (хрупкий селектор)
await page.click('div > div > button.btn-primary');

// ✅ Хорошо (семантический селектор)
await page.click('button:has-text("Создать")');
await page.click('[data-testid="create-button"]');
```

### 3. Используй waitFor

```typescript
// Ожидание элемента
await page.waitForSelector('[data-testid="project-list"]');

// Ожидание URL
await page.waitForURL('/admin/projects');

// Ожидание response
await page.waitForResponse(resp => resp.url().includes('/api/projects'));
```

### 4. Группируй тесты

```typescript
test.describe('Projects CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/projects');
  });

  test('should create', async ({ authenticatedPage: page }) => {
    // ...
  });

  test('should edit', async ({ authenticatedPage: page }) => {
    // ...
  });
});
```

### 5. Очищай данные после тестов (опционально)

```typescript
test.afterEach(async ({ page }) => {
  // Cleanup logic
  // Например, удаление созданных тестовых проектов
});
```

---

## Отладка тестов

### UI Mode (рекомендовано)

```bash
make e2e-ui
# Открывает интерактивный UI с пошаговым выполнением
```

### Headed Mode

```bash
make e2e-headed
# Запускает тесты с открытым браузером
```

### Debug Mode

```bash
npm run e2e:debug
# Запускает тесты с Playwright Inspector
```

### Screenshots & Videos

Автоматически создаются при падении теста:
- `test-results/<test-name>/test-failed-1.png`
- `test-results/<test-name>/video.webm`

### Трассировка

```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

---

## CI/CD Integration

### GitHub Actions пример

```yaml
- name: Install dependencies
  run: npm install

- name: Install Playwright browsers
  run: npm run playwright:install

- name: Run E2E tests
  run: make e2e
  env:
    FRONTEND_URL: http://localhost:3000
    TEST_ADMIN_EMAIL: admin@example.com
    TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: e2e-report
    path: e2e-report/
```

---

## Troubleshooting

### Браузеры не установлены

```bash
npm run playwright:install
```

### Тесты падают с timeout

Увеличь таймаут в `playwright.config.ts`:

```typescript
timeout: 60 * 1000, // 60 секунд
```

Или для конкретного теста:

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000);
  // ...
});
```

### Порт уже занят

Убедись, что сервисы запущены:

```bash
make fe  # Frontend на :3000
```

Или переопредели URL:

```bash
FRONTEND_URL=http://localhost:3333 make e2e-frontend
```

---

## Roadmap

### Short-term
- [ ] Добавить E2E тесты для всех критичных UI flows (auth, projects, categories, horses)
- [ ] Интегрировать в `QG-FE-AUTO` lane
- [ ] Добавить visual regression testing (Percy/Chromatic)

### Medium-term
- [ ] E2E тесты для `site-ad` и `site-ksk-inlove`
- [ ] Accessibility testing (axe-core)
- [ ] Performance testing (Lighthouse CI)

### Long-term
- [ ] Полное покрытие UI changes E2E тестами
- [ ] Устранение необходимости в `QG-FE-MANUAL` для большинства changes

---

**Статус**: Активно, готово к использованию  
**Последнее обновление**: 2024-10-06  
**Связанные документы**:
- [`browser-qa-protocol.md`](../../agents/howto/browser-qa-protocol.md)
- [`quality_gate.md`](../../agents/quality_gate.md)
