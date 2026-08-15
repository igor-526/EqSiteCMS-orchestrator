# Backend Core Analysis — Этап 1 глубокого рефакторинга

**Статус:** ⚠️ Есть замечания (не критично)
**Дата:** 2026-08-14
**План:** `docs/plans/044_deep_refactoring.md`

---

## 1. Тесты

| Метрика | Значение |
|---------|----------|
| **Passed** | 873 |
| **Failed** | 0 |
| **Skipped** | 5 |
| **Errors** | 0 |
| **Время** | 1.79s |

✅ **Тесты проходят полностью.**

---

## 2. Линтеры

### ruff
| Метрика | Значение |
|---------|----------|
| Ошибки | 3 |
| Тип | F401 (unused imports) |

**Найденные проблемы:**
- `src/api/depends/user_management.py:5` — `UserScope` imported but unused
- `src/api/depends/user_management.py:9` — `get_user_repository` imported but unused
- `src/core/entities/user.py:1` — `datetime.datetime` imported but unused

### flake8
| Метрика | Значение |
|---------|----------|
| Ошибки | 7 |
| F401 (unused imports) | 3 |
| W293 (whitespace) | 4 |

**Дополнительно к ruff:**
- `src/api/depends/user_management.py` — 4 случая лишних пробелов в пустых строках (строки 21, 29, 32, 37)

### mypy
| Метрика | Значение |
|---------|----------|
| Ошибки | 1 |

**Проблема:**
- `src/api/depends/user_management.py:9` — `Cannot find implementation or library stub for module named "api.depends.services"` (import-not-found)

⚠️ **Примечание:** Файл импортирует `.services`, но `api/depends/services.py` не существует в этой директории. Основной `depends/services.py` находится в `src/depends/services.py`. Это может указывать на неправильный путь импорта.

---

## 3. Форматтеры

### black
| Метрика | Значение |
|---------|----------|
| Требуют форматирования | 4 файла |

**Файлы:**
- `src/api/depends/user_management.py`
- `src/core/protocols/repositories/user_management_repository.py`
- `src/migration/versions/a1b2c3d4e5f6_add_soft_delete_and_block_to_users.py`
- `src/core/schemas/user_management.py`

### isort
| Метрика | Значение |
|---------|----------|
| Требуют сортировки | 1 файл |

**Файл:**
- `src/api/depends/user_management.py`

---

## 4. Архитектурные находки (Clean Architecture)

### ✅ Пройденные проверки

| Проверка | Статус |
|----------|--------|
| `core/entities/` НЕ импортирует `api/`, `depends/`, `repositories/`, `models/`, `settings` | ✅ |
| `core/services/` зависит от Protocol-контрактов (`core/protocols`) | ✅ |
| Нет прямых импортов `repositories/*` в `core/services/` | ✅ |
| SQLAlchemy tables из `models/` НЕ импортированы в `core/services/` и `core/entities/` | ✅ |
| `api/` не содержит SQL-запросов и ручного управления транзакциями | ✅ |
| `api/` не содержит явной бизнес-логики | ✅ |
| `settings` НЕ импортируется в `core/` | ✅ |
| Используется DI (dependency-injector) | ✅ |
| Нет глобальных синглтонов в `core/` | ✅ |
| Depends-сборка: `session -> repository -> service` | ✅ |
| Бизнес-ошибки мапятся через `ClientError` и специализированные исключения | ✅ |

### ⚠️ Замечания

#### 1. **SRP: Большие сервисы** (средний приоритет)

| Файл | Строк | Классы | Рекомендация |
|------|-------|--------|--------------|
| `core/services/prices.py` | 843 | 2 (`PriceGroupService`, `PriceService`) | Рассмотреть разделение на отдельные файлы |
| `core/services/horse.py` | 795 | 1 (`HorseService`, 24 метода) | Слишком много ответственностей |

**HorseService** содержит 24 метода, включая:
- CRUD операции
- Валидацию родословной (`set_horse_pedigree`, `get_available_pedigree`)
- Работу с фото (`update_horse_photos`)
- Управление связями с услугами (`add_horse_service`, `remove_horse_service`)

**Рекомендация:** Разделить на `HorseCrudService`, `HorsePedigreeService`, `HorsePhotoService`.

#### 2. **Бизнес-валидация в InDto** (низкий приоритет)

| Файл | Валидация |
|------|-----------|
| `core/schemas/user_management.py` | Проверка совпадения паролей, сложность пароля |
| `core/schemas/horses.py` | Валидация родословной (`validate_pedigree`) |

**Примечание:** Согласно Quality Gate чеклисту: "Бизнес-валидация не спрятана в InDto-валидации (422 только для структурных ошибок)". Однако для паролей это допустимо как structural validation. Валидация родословной в `horses.py` может быть спорной.

#### 3. **Проблемный импорт в depends/user_management.py** (высокий приоритет)

```python
from .services import get_current_user, get_user_repository
```

Файл `src/api/depends/user_management.py` импортирует из `.services`, но:
- `src/api/depends/services.py` **не существует**
- Основной файл `src/depends/services.py` **существует**

Это вызывает ошибку mypy и может привести к runtime проблемам при определённых условиях запуска.

---

## 5. SOLID-принципы

| Принцип | Статус | Комментарий |
|---------|--------|-------------|
| **S**ingle Responsibility | ⚠️ | `HorseService` (795 строк, 24 метода) нарушает SRP |
| **O**pen/Closed | ✅ | Используются Protocol для расширяемости |
| **L**iskov Substitution | ✅ | Наследование корректно (BaseSchema, BaseEntity) |
| **I**nterface Segregation | ✅ | Protocol-контракты разделены по сущностям |
| **D**ependency Inversion | ✅ | `core/services` зависят от `core/protocols`, не от конкретных реализаций |

---

## 6. Структура проекта

```
src/
├── api/                    # FastAPI роутеры (14 файлов, 2323 строки)
├── clients/                # Внешние клиенты (NATS, Email)
├── containers/             # DI контейнеры
├── core/
│   ├── entities/           # Доменные сущности (14 файлов, 982 строки)
│   ├── exceptions/         # Иерархия ошибок (4 файла)
│   ├── middleware/          # CORS middleware
│   ├── protocols/          # Абстракции (Protocol)
│   │   ├── media/
│   │   ├── publishers/
│   │   └── repositories/   # 15 Protocol-контрактов
│   ├── schemas/            # Pydantic DTO
│   ├── services/           # Бизнес-логика (13 файлов, 4199 строк)
│   └── utils/              # Утилиты
├── depends/                # FastAPI Dependencies
├── migration/              # Alembic миграции
├── models/                 # SQLAlchemy модели (13 файлов)
├── repositories/           # Реализации репозиториев (15 файлов)
└── settings.py             # Pydantic Settings
```

---

## 7. Рекомендации (приоритизированные)

### 🔴 Высокий приоритет

1. **Исправить импорт в `depends/user_management.py`**
   - Удалить неиспользуемые импорты (`UserScope`, `get_user_repository`)
   - Исправить путь импорта `.services` → `depends.services` или перенести логику

### 🟡 Средний приоритет

2. **Разделить `HorseService` на несколько сервисов**
   - `HorseCrudService` — базовые CRUD операции
   - `HorsePedigreeService` — управление родословной
   - `HorsePhotoService` — работа с фотографиями

3. **Запустить форматтеры**
   ```bash
   cd services/backend
   uv run black src
   uv run isort src
   ```

4. **Рассмотреть перенос бизнес-валидации родословной из schemas в services**

### 🟢 Низкий приоритет

5. **Разделить `PriceService` и `PriceGroupService` в отдельные файлы** (уже 2 класса в одном файле)

6. **Добавить type hints** в места, где их нет (проверено —大部分 функций имеют аннотации)

---

## 8. Итог

Backend Core сервис **в целом соответствует Clean Architecture**:
- ✅ Чёткое разделение слоёв
- ✅ Использование Protocol для Dependency Inversion
- ✅ Изоляция core от infrastructure
- ✅ 873 теста проходят
- ⚠️ Несколько линтерных замечаний (легко исправить)
- ⚠️ Один проблемный импорт (requires fix)
- ⚠️ Один крупный сервис (SRP concern)

**Общая оценка: 8/10** — хорошая архитектура с несколькими зонами для улучшения.

