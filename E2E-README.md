# E2E Testing Quick Start

## Установка

```bash
# Один раз для всех frontend-сервисов
make e2e-install
```

## Запуск

```bash
# Все E2E тесты
make e2e

# Только CMS frontend
make e2e-frontend

# UI mode (интерактивная отладка)
make e2e-ui

# С открытым браузером
make e2e-headed
```

## Структура

```
e2e/
├── frontend/           # CMS Admin UI тесты
│   ├── auth.spec.ts   # Авторизация
│   └── example-projects.spec.ts  # Projects CRUD
├── site-ad/           # site-ad тесты
├── site-ksk-inlove/   # site-ksk-inlove тесты
└── shared/            # Общие helpers
    ├── auth.ts
    └── fixtures.ts
```

## Написание тестов

```typescript
// С автоматической авторизацией
import { test, expect } from '../shared/fixtures';

test('should create project', async ({ authenticatedPage: page }) => {
  await page.goto('/admin/projects/new');
  await page.fill('input[name="title"]', 'Test Project');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/projects\/\d+/);
});
```

## Отчёты

```bash
# После прогона
make e2e-report
```

📖 **Полная документация**: [`docs/operations/e2e-testing-setup.md`](docs/operations/e2e-testing-setup.md)
