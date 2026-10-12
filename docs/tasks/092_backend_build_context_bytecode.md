# 092 — Ошибка контекста сборки backend

## Исходный запрос

Пользователь просит проанализировать ошибку `make be-build-nc` и придумать решение, без реализации до approval.

```text
docker compose -f .docker-compose/docker-compose.be.yml -p eqsitecms-be build --no-cache
WARN buildx Docker CLI plugin not found: falling back to classic builder
checking context: no permission to read from '/home/igor/projects/eqSiteCMS/services/backend/src/api/__pycache__/yandex.cpython-313.pyc'
Makefile:112 ошибка 1
```

## Границы

- Read-only диагностика backend build context, ignore rules, Dockerfile, compose, metadata прав проблемного пути; код API и посторонние сервисы не читать.
- Отделить доказанную недоступность bytecode от гипотезы о его создании root-процессом.
- Оценить минимальное исключение Python caches через `.dockerignore` и профилактику `PYTHONDONTWRITEBYTECODE`.
- Предупреждение buildx рассматривать отдельно от fatal ошибки контекста.
- Endpoint changes и access policy: N/A.
- До approval разрешены только этот исходный запрос и OpenSpec-артефакты. Запрещены implementation edits, chmod/chown, удаление caches, сборка, перезапуск runtime и sudo.

## Планирование

Единственный изменяемый план: [fix-backend-build-context-bytecode](<../../openspec/changes/fix-backend-build-context-bytecode/proposal.md>).
