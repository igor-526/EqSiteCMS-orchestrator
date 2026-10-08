## ADDED Requirements

### Requirement: Расширение корневого Makefile для seo-service
Система SHALL добавить команды управления seo-service в корневой `Makefile`.

#### Scenario: Команды сборки
- **WHEN** выполняется `make build-seo-service`
- **THEN** собирается Docker-образ для seo-service
- **THEN** используется Dockerfile из `services/seo-service/`

#### Scenario: Команды тестирования
- **WHEN** выполняется `make test-seo-service`
- **THEN** запускаются тесты в `services/seo-service/tests/`
- **THEN** используется pytest с coverage

#### Scenario: Команды миграций
- **WHEN** выполняется `make migrate-seo-service`
- **THEN** применяются миграции Alembic для БД `seo_service`
- **THEN** миграции выполняются внутри Docker-контейнера

#### Scenario: Команды очистки
- **WHEN** выполняется `make clean-seo-service`
- **THEN** удаляются временные файлы и кэши
- **THEN** удаляются неиспользуемые Docker-образы

### Requirement: Добавление seo-service в services.manifest
Система SHALL зарегистрировать seo-service в `services.manifest` с указанием Git-репозитория.

#### Scenario: Запись в manifest
- **WHEN** обновляется `services.manifest`
- **THEN** добавляется запись для seo-service
- **THEN** запись содержит `name: seo-service`, `path: services/seo-service`, `repo: git@github.com:igor-526/EqSiteCMS-seo-service.git`

#### Scenario: Валидация manifest
- **WHEN** выполняется проверка manifest
- **THEN** формат записи соответствует остальным сервисам
- **THEN** путь и репозиторий корректны

### Requirement: Git hooks для синхронизации
Система SHALL поддерживать синхронизацию seo-service с отдельным Git-репозиторием.

#### Scenario: Initial commit в отдельный репозиторий
- **WHEN** выполняется инициализация Git
- **THEN** выполняются команды:
  ```
  cd services/seo-service
  git init
  git remote add origin git@github.com:igor-526/EqSiteCMS-seo-service.git
  git add .
  git commit -m "Initial commit"
  git branch -M main
  git push -u origin main
  git push -u origin release
  ```
- **THEN** ветки `main` и `release` содержат одинаковый initial commit

#### Scenario: Проверка синхронизации
- **WHEN** код запушен в отдельный репозиторий
- **THEN** выполнение `git remote -v` показывает корректный remote origin
- **THEN** ветки `main` и `release` существуют в remote

### Requirement: Интеграция в общий build process
Система SHALL включить seo-service в общие команды сборки монорепозитория.

#### Scenario: Команда make build-all
- **WHEN** выполняется `make build-all`
- **THEN** seo-service включён в список сервисов для сборки
- **THEN** образ собирается вместе с остальными сервисами

#### Scenario: Команда make test-all
- **WHEN** выполняется `make test-all`
- **THEN** тесты seo-service включены в общий запуск
- **THEN** результаты тестирования включены в общий отчёт
