## ADDED Requirements

### Requirement: Контекст backend исключает временный Python bytecode

Сборка backend SHALL использовать context `services/backend` и исключать каталоги `__pycache__` и файлы `.pyc`/`.pyo` в корне и на любой глубине через context-root `.dockerignore`. Исходники Python и обязательные входные файлы образа MUST оставаться доступными. Исправление MUST сохранять прочие существующие ignore rules и не требовать изменения прав, владельцев или удаления caches.

#### Scenario: Корневые и вложенные caches

- **WHEN** в context присутствуют корневой `__pycache__`, `src/api/__pycache__`, cache глубже в пакетах и отдельные `.pyc`/`.pyo` на разных уровнях
- **THEN** они исключены из передачи build context и не переносятся через `COPY src/ ./src` в образ

#### Scenario: Сборка с существующим недоступным cache

- **WHEN** непривилегированный оператор выполняет `make be-build-nc` с существующим недоступным `src/api/__pycache__/yandex.cpython-313.pyc`, но доступными исходниками, родительскими каталогами и остальными обязательными файлами
- **THEN** проверка build context не завершается ошибкой чтения этого pyc без chmod/chown, cleanup или sudo
- **AND** при доступных Docker engine и сборочных зависимостях сборка завершается с exit code 0

#### Scenario: Исходники остаются доступными

- **WHEN** backend образ собран с новыми ignore rules
- **THEN** `/eqsitecms/src/main.py` присутствует, а `.py` и обязательные Python extensions вне caches не исключены новым набором правил

### Requirement: Образ backend отключает автоматическую запись bytecode

Backend Dockerfile SHALL задавать `PYTHONDONTWRITEBYTECODE=1` до запуска Python при установке зависимостей; стандартные Python-процессы образа SHALL наследовать это значение по умолчанию. Это требование не удаляет существующие caches и не распространяется на host Python или явную компиляцию bytecode.

#### Scenario: Автоматический bytecode отключён

- **WHEN** Python нового образа без environment override импортирует обычный модуль из writable временного каталога
- **THEN** `sys.dont_write_bytecode` истинно и import не создаёт для модуля `__pycache__` или `.pyc`

### Access policy

N/A: endpoint changes отсутствуют. Access matrix и anonymous/authenticated tests неприменимы; Public Read и Protected Write остаются без изменений.
