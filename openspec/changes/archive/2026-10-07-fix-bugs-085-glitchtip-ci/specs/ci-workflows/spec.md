## ADDED Requirements

### Requirement: GitHub Actions backend workflow uv cache

Backend workflow (`.github/workflows/backend-test-build-push.yaml`) SHALL использовать `UV_CACHE_DIR=$HOME/.cache/uv` вместо project-local `.cache/uv`.

#### Scenario: uv sync успешно выполняется в CI

- **WHEN** GitHub Actions runner выполняет `uv sync --locked`
- **THEN** command завершается успешно без `Permission denied (os error 13)`

#### Scenario: uv cache сохраняется между runs

- **WHEN** GitHub Actions cache для `~/.cache/uv` существует
- **THEN** следующий workflow run использует кешированные dependencies
