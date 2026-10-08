# Финальные изменения: Stream creation из кода

**Дата**: 2025-01-08
**Причина**: Следование паттерну backend — stream создаётся из кода, а не через init-скрипт

## Изменения

### ✅ Добавлено
1. **src/infrastructure/nats/client.py**:
   - Метод `setup_streams()` создаёт stream SEO_TASKS при connect
   - Вызывается автоматически в `connect()` после инициализации JetStream context

### ❌ Удалено
1. **scripts/init-nats-seo.sh** — больше не нужен
2. **.docker-compose/docker-compose.seo.yml**:
   - Контейнер `nats-seo-init` удалён

## Преимущества

- ✅ Консистентность с backend (backend тоже создаёт streams из кода)
- ✅ Меньше зависимостей (не нужен nats-box image)
- ✅ Автоматическая актуализация stream config при изменениях
- ✅ Проще отладка (stream создаётся в том же процессе, что и использование)

## Verification

```bash
cd services/seo-service
uv run mypy src/infrastructure/nats/client.py  # Success
uv run pytest tests/smoke/test_task_publisher.py  # 8 passed
```

