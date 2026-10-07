# Photo Selector E2E Tests - Инструкция по запуску

## Описание

E2E тесты для `PhotoSelectorModal` с новым upload UI (change `photos-selector-improve`).

**Файл:** `e2e/frontend/photo-selector.spec.ts`

## Покрытые сценарии

### 1. Layout Verification (3 теста)
- ✅ Проверка 4-колоночной сетки
- ✅ Отображение 10 фотографий в 3 ряда (4+4+2)
- ✅ Отображение 3 фотографий в 1 ряд с прижатием влево

### 2. Upload via File Picker (4 теста)
- ✅ Открытие file picker при клике на кнопку "Загрузить"
- ✅ Успешная загрузка одного файла
- ✅ Успешная загрузка нескольких файлов (3 файла)
- ✅ Отмена выбора файлов без изменений

### 3. File Validation (1 тест)
- ✅ Отклонение non-image файлов с error notification

### 4. Drag-and-Drop Upload (3 теста)
- ✅ Визуальная индикация при drag-over
- ✅ Успешная загрузка файла через drag-and-drop
- ✅ Отклонение non-image файла через drag-and-drop

### 5. Backward Compatibility (3 теста)
- ✅ Добавление фотографии из галереи (PlusOutlined)
- ✅ Установка главной фотографии (StarOutlined)
- ✅ Комбинированный workflow: upload + gallery + set main photo

### 6. Partial Success Handling (1 тест)
- ✅ Обработка частичного успеха (2 из 3 файлов)

### 7. Concurrent Upload Protection (2 теста)
- ✅ Блокировка конкурентных загрузок с предупреждением
- ✅ Отключение кнопки "Загрузить" во время upload

### 8. Infinite Scroll Regression (2 теста)
- ✅ Сохранение infinite scroll после upload
- ✅ Сохранение 4-колоночной сетки после infinite scroll

**Всего: 19 тестов**

## Prerequisites

### 1. Установка зависимостей

Playwright должен быть установлен на уровне монорепозитория:

```bash
# Из корня монорепозитория
npm install -D @playwright/test

# Установка браузеров (если ещё не установлены)
npx playwright install
```

### 2. Запуск серверов

**Из корня монорепозитория через Make:**

```bash
# 1. Запустить инфраструктуру (PostgreSQL, NATS, Redis)
make infra

# 2. Запустить Backend
make be

# 3. Запустить Frontend
make fe
```

Убедитесь, что:
- Backend доступен на `http://localhost:8000`
- Frontend доступен на `http://localhost:3000`

**Альтернативно (для локальной разработки без Docker):**

```bash
# Terminal 1: Backend
cd services/backend
PYTHONPATH=src uv run python src/main.py

# Terminal 2: Frontend
cd services/frontend
npm run dev
```

### 3. Тестовые данные

Убедитесь, что в системе есть:
- Хотя бы одна услуга (price) для тестирования
- (Опционально) Фотографии в галерее для тестов backward compatibility

## Запуск тестов

### Все тесты photo-selector

```bash
npx playwright test e2e/frontend/photo-selector.spec.ts
```

### Headed mode (с визуализацией браузера)

```bash
npx playwright test e2e/frontend/photo-selector.spec.ts --headed
```

### С UI режимом Playwright

```bash
npx playwright test e2e/frontend/photo-selector.spec.ts --ui
```

### Конкретная группа тестов

```bash
# Только layout verification
npx playwright test e2e/frontend/photo-selector.spec.ts -g "Layout Verification"

# Только drag-and-drop
npx playwright test e2e/frontend/photo-selector.spec.ts -g "Drag-and-Drop"

# Только backward compatibility
npx playwright test e2e/frontend/photo-selector.spec.ts -g "Backward Compatibility"
```

### Один конкретный тест

```bash
npx playwright test e2e/frontend/photo-selector.spec.ts -g "should upload single file successfully"
```

### Debug mode

```bash
npx playwright test e2e/frontend/photo-selector.spec.ts --debug
```

## Отчёты

### HTML Report

```bash
# Запуск тестов и генерация отчёта
npx playwright test e2e/frontend/photo-selector.spec.ts

# Просмотр отчёта
npx playwright show-report
```

### JSON Reporter

```bash
npx playwright test e2e/frontend/photo-selector.spec.ts --reporter=json
```

## Troubleshooting

### Проблема: "Target closed" или timeout

**Решение:**
- Увеличьте timeout в `playwright.config.ts`:
  ```typescript
  timeout: 30000, // 30 seconds
  ```
- Убедитесь, что серверы запущены и доступны

### Проблема: "Element not found"

**Решение:**
- Проверьте, что используются правильные селекторы (`data-testid`)
- Убедитесь, что в системе есть тестовые данные (услуга для PhotoSelectorModal)

### Проблема: Тесты с drag-and-drop падают

**Решение:**
- Drag-and-drop симулируется через JavaScript events
- Убедитесь, что компонент правильно обрабатывает `dragover`, `dragleave`, `drop` события

### Проблема: Временные файлы не удаляются

**Решение:**
- Проверьте `finally` блоки в тестах — они удаляют временные PNG/TXT файлы
- Вручную очистите `/tmp` если нужно:
  ```bash
  rm -f /tmp/test-photo-*.png /tmp/dnd-*.png /tmp/*.txt
  ```

## CI/CD Integration

Для GitHub Actions:

```yaml
- name: Run Photo Selector E2E Tests
  run: |
    npx playwright test e2e/frontend/photo-selector.spec.ts --reporter=html
  env:
    CI: true
```

## Связанные файлы

- **OpenSpec:** `openspec/changes/photos-selector-improve/specs/photo-upload-ui/spec.md`
- **QA Checklist:** `openspec/changes/photos-selector-improve/QA_CHECKLIST.md`
- **Component:** `services/frontend/src/components/PhotoSelectorModal.tsx`
- **Auth helpers:** `e2e/shared/auth.ts`
- **Fixtures:** `e2e/shared/fixtures.ts`

## Примечания

- Тесты создают временные PNG файлы в `/tmp` для симуляции upload
- Каждый тест cleanup за собой (удаляет временные файлы в `finally`)
- Используется автоматическая авторизация через `authenticatedPage` fixture
- Real network requests — не используются моки для backend API

## Контакты

При проблемах с тестами проверьте:
1. Backend logs (`services/backend`)
2. Frontend console (Browser DevTools)
3. Playwright trace: `npx playwright show-trace trace.zip`
