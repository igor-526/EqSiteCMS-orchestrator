# Протоколы NATS и Celery для SEO-модуля

Данный документ описывает контракты взаимодействия сервисов SEO-модуля через NATS JetStream и Celery.

---

## 📡 NATS JetStream: Stream SEO_TASKS

### Назначение

Асинхронная постановка задач парсинга от `seo-service` к парсерам (например, `yandex-metrics-parser-service`).

### Конфигурация Stream

```yaml
stream: SEO_TASKS
subjects:
  - seo.tasks.*
retention: WorkQueue
storage: File
max_age: 24h
max_msgs: 10000
discard: Old
```

**Описание параметров:**

- **retention: WorkQueue** — сообщения удаляются после подтверждения обработки (ack) парсером
- **storage: File** — сообщения сохраняются на диск для persistence
- **max_age: 24h** — максимальное время хранения необработанных сообщений (24 часа)
- **max_msgs: 10000** — максимум 10 000 сообщений в stream (защита от переполнения)
- **discard: Old** — при переполнении удаляются самые старые сообщения

### Subjects

Subjects в формате `seo.tasks.<parser_type>` определяют целевой парсер:

| Subject | Парсер | Статус |
|---------|--------|--------|
| `seo.tasks.yandex_metrics` | `yandex-metrics-parser-service` | 🔜 Планируется |
| `seo.tasks.google_analytics` | `google-analytics-parser-service` | 🔮 Будущее |

**Правило:** Каждый парсер подписывается только на свой subject. Wildcard-подписки (`seo.tasks.*`) не используются.

---

## 📬 Формат NATS Messages

### Структура Message

Все NATS messages для SEO-задач используют **JSON** формат.

#### Headers

```json
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Поля:**
- `trace_id` (string, UUID) — уникальный идентификатор для трассировки задачи в логах

#### Payload

##### Общая структура

```json
{
  "task_id": "uuid",
  "site_id": 123,
  "parser_type": "yandex_metrics",
  "params": {
    // Специфичные для парсера параметры
  },
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Обязательные поля:**
- `task_id` (string, UUID) — уникальный идентификатор задачи парсинга
- `site_id` (integer) — ID сайта в системе EqSiteCMS
- `parser_type` (string) — тип парсера (например, `yandex_metrics`)
- `params` (object) — параметры парсинга, специфичные для конкретного парсера
- `created_at` (string, ISO 8601) — время создания задачи

---

### Примеры Payloads

#### 1. Яндекс.Метрика: Общая статистика

**Subject:** `seo.tasks.yandex_metrics`

**Payload:**

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440001",
  "site_id": 42,
  "parser_type": "yandex_metrics",
  "params": {
    "counter_id": 87654321,
    "date_from": "2025-01-01",
    "date_to": "2025-01-14",
    "metrics": ["pageviews", "visits", "users", "bounceRate"],
    "dimensions": ["date"]
  },
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Описание `params`:**
- `counter_id` — ID счётчика Яндекс.Метрики
- `date_from`, `date_to` — диапазон дат для сбора метрик
- `metrics` — список метрик (например, `pageviews`, `visits`)
- `dimensions` — группировка данных (например, по дате)

#### 2. Яндекс.Метрика: Источники трафика

**Subject:** `seo.tasks.yandex_metrics`

**Payload:**

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440002",
  "site_id": 42,
  "parser_type": "yandex_metrics",
  "params": {
    "counter_id": 87654321,
    "date_from": "2025-01-01",
    "date_to": "2025-01-14",
    "metrics": ["visits", "pageviews"],
    "dimensions": ["trafficSource"],
    "filters": {
      "organic": true
    }
  },
  "created_at": "2025-01-15T10:35:00Z"
}
```

**Описание дополнительных полей:**
- `filters.organic` — только органический трафик (из поисковых систем)

#### 3. Google Analytics (будущий пример)

**Subject:** `seo.tasks.google_analytics`

**Payload:**

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440003",
  "site_id": 99,
  "parser_type": "google_analytics",
  "params": {
    "property_id": "123456789",
    "date_from": "2025-01-01",
    "date_to": "2025-01-14",
    "metrics": ["sessions", "pageviews", "bounceRate"],
    "dimensions": ["date", "country"]
  },
  "created_at": "2025-01-15T11:00:00Z"
}
```

---

## 🔄 Обработка NATS Messages парсерами

### Типичный flow обработки

1. **Получение message** из NATS stream через JetStream consumer
2. **Валидация payload** — проверка обязательных полей
3. **Выполнение парсинга:**
   - Получение access token (если требуется OAuth)
   - Запрос к внешнему API (Яндекс.Метрика, Google Analytics и т.д.)
   - Обработка и нормализация данных
4. **Сохранение результатов** в БД парсера
5. **Отправка Ack** в NATS (подтверждение обработки)

### Обязательные практики

- **Идемпотентность:** Парсер должен корректно обрабатывать дубликаты задач (по `task_id`)
- **Логирование с trace_id:** Все логи должны включать `trace_id` из headers для трассировки
- **Retry на ошибках:** Если парсинг не удался, парсер должен вернуть NAck (negative ack) для retry
- **Таймауты:** Обработка задачи не должна занимать более 5 минут (для WorkQueue retention)

---

## ⏰ Celery: Задача schedule_parsing

### Назначение

Периодическая проверка расписаний парсингов в БД `seo-service` и постановка задач в NATS.

### Конфигурация

**Имя задачи:** `app.tasks.schedule_parsing`

**Расписание (Celery Beat):**

```python
# celeryconfig.py в seo-service
beat_schedule = {
    'schedule-parsing-every-5-minutes': {
        'task': 'app.tasks.schedule_parsing',
        'schedule': crontab(minute='*/5'),  # Каждые 5 минут
    },
}
```

**Broker:** Redis (БД 5, см. `agents/redis-databases.yaml`)

**Backend:** Redis (БД 6, см. `agents/redis-databases.yaml`)

### Логика выполнения

#### Псевдокод

```python
def schedule_parsing():
    """
    Проверяет расписания и ставит задачи парсинга в NATS.
    """
    now = datetime.utcnow()
    
    # 1. Читаем активные расписания из БД
    schedules = db.query(ParsingSchedule).filter_by(is_active=True).all()
    
    for schedule in schedules:
        # 2. Проверяем, пора ли запускать задачу (по cron-расписанию)
        if should_run(schedule.cron, now):
            
            # 3. Формируем NATS message
            message = {
                "task_id": str(uuid.uuid4()),
                "site_id": schedule.site_id,
                "parser_type": schedule.parser_type,
                "params": schedule.params,  # JSON
                "created_at": now.isoformat()
            }
            
            headers = {
                "trace_id": str(uuid.uuid4())
            }
            
            # 4. Публикуем в NATS stream SEO_TASKS
            subject = f"seo.tasks.{schedule.parser_type}"
            nats.publish(subject, json.dumps(message), headers)
            
            # 5. Логируем выполнение
            logger.info(
                f"Published task {message['task_id']} to {subject}",
                extra={"trace_id": headers["trace_id"]}
            )
```

#### Пример записи в `parsing_schedules`

```sql
INSERT INTO parsing_schedules (
    site_id,
    parser_type,
    schedule_cron,
    params,
    is_active
) VALUES (
    42,
    'yandex_metrics',
    '0 2 * * *',  -- Каждый день в 02:00 UTC
    '{"counter_id": 87654321, "metrics": ["pageviews", "visits"]}',
    true
);
```

**Описание полей:**
- `schedule_cron` — расписание в cron-формате
- `params` — JSON с параметрами парсинга (будут переданы в NATS message)

### Мониторинг

**Метрики Celery:**
- `schedule_parsing.success` — успешных выполнений
- `schedule_parsing.failure` — неудачных выполнений
- `schedule_parsing.duration` — время выполнения задачи

**Логи:**
- Все публикации в NATS логируются с `trace_id`
- Ошибки публикации логируются с уровнем `ERROR`

---

## ⚠️ Важные ограничения

### 1. Результаты парсинга НЕ возвращаются через NATS

**Причина:**
- NATS stream `SEO_TASKS` используется **только** для постановки задач
- Результаты парсинга (метрики) остаются в БД парсеров
- `seo-service` не собирает результаты обратно

**Следствия:**
- Парсеры самостоятельно хранят и предоставляют метрики (через API или другой механизм)
- Агрегация результатов из разных парсеров требует отдельного сервиса или механизма (не реализовано на данном этапе)

### 2. At-least-once delivery

**NATS JetStream** гарантирует доставку сообщения как минимум один раз.

**Следствия:**
- Парсеры могут получить дубликаты задач
- Обработка задачи должна быть **идемпотентной** (повторное выполнение с тем же `task_id` не приводит к дублированию данных)

**Пример идемпотентной обработки:**

```python
# В парсере
def process_task(task_id, site_id, params):
    # Проверяем, не обработана ли уже эта задача
    existing_task = db.query(ParsingTask).filter_by(task_id=task_id).first()
    if existing_task:
        logger.info(f"Task {task_id} already processed, skipping")
        return  # Идемпотентность
    
    # Выполняем парсинг
    metrics = fetch_metrics(params)
    
    # Сохраняем результаты + запись о задаче
    db.add(ParsingTask(task_id=task_id, site_id=site_id, status='completed'))
    db.add_all([Metric(...) for m in metrics])
    db.commit()
```

### 3. Обработка ошибок

**Если парсинг не удался:**
1. Парсер возвращает **NAck** (negative acknowledgement) в NATS
2. NATS повторно доставит задачу согласно consumer configuration (retry policy)
3. После нескольких попыток задача может быть отправлена в Dead Letter Queue (если настроен)

**Таймауты:**
- Обработка задачи не должна занимать более 5 минут (рекомендация)
- Для долгих операций используйте chunking или разбиение задачи

---

## 📚 Связанная документация

- [Архитектура SEO-модуля](./architecture.md) — общая схема взаимодействия
- [Описание сервисов](./services.md) — роли и технологии сервисов
- [NATS JetStream протоколы EqSiteCMS](../agents/howto/nats-jetstream-protocols.md) — общие правила работы с NATS

---

## 🔮 Будущие расширения

### Dead Letter Queue для неудавшихся задач

**Концепция:**
- Создать отдельный stream `SEO_TASKS_DLQ` для задач, которые не удалось обработать после N попыток
- Мониторинг DLQ для выявления проблемных задач

**Статус:** Не в приоритете, рассматривается после реализации базовых парсеров

### Результаты парсинга через NATS (опционально)

**Альтернативный подход:**
- Парсеры публикуют результаты в отдельный stream `SEO_RESULTS`
- `seo-service` или агрегатор подписывается на результаты

**Статус:** Не планируется на данном этапе (результаты остаются в парсерах по design decision D2)

### Приоритизация задач

**Концепция:**
- Использовать NATS JetStream priorities для важных задач (например, real-time метрики)

**Статус:** Будет рассмотрено при необходимости
