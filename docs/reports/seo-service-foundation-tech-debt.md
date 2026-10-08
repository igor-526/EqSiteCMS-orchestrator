## Known Issues (Tech Debt)

Следующие проблемы зарегистрированы как tech debt для отдельного change:

### QG-BE: mypy type checking errors (5 critical)
1. **Base declarative type**: Variable 'Base' is not valid as a type (models/parsing_schedule.py:13)
2. **Duplicate session annotation**: Name 'session' already defined (tasks/schedule_parsing.py:95)
3. **Missing celery stubs**: Library stubs not installed for 'celery'
4. **Missing croniter stubs**: Library stubs not installed for 'croniter'
5. **sessionmaker overload**: No overload variant matches (tests/smoke/test_schedule_parsing.py:29)

**Impact**: make lint fails, но все runtime тесты проходят (28/28 passed)
**Workaround**: Добавить mypy ignores для внешних библиотек
**Planned**: Отдельный change для полного mypy compliance

### QG-BE: Minor issues
- **datetime.utcnow() deprecation**: 51 warnings (Python 3.14 compatibility)
- **Redis DB registry**: agents/redis-databases.yaml не отражает DB 5/6 для seo-service

### QG-ENV: Minor issues  
- **standalone docker-compose**: Переименован в docker-compose.standalone.yaml для clarity
- **python_version mypy**: 3.12 vs requires-python 3.14 (несоответствие)

---
Создано: 2026-10-08
Change: seo-service-foundation

