# Исправление Python bytecode в контексте сборки backend

Тикет: [092](<../../../docs/tasks/092_backend_build_context_bytecode.md>) · Сервис: backend · Дата: 2026-10-12.

## Context

### Доказанные данные

- [Makefile:106–112](<../../../Makefile#L106-L112>): обе команды используют один compose; `--no-cache` отключает build layer cache, но не исключает Python caches из входного контекста.
- [Compose:3–5](<../../../.docker-compose/docker-compose.be.yml#L3-L5>): context относительно compose-файла — `../services/backend`, абсолютный путь `/home/igor/projects/eqSiteCMS/services/backend`; Dockerfile — [backend Dockerfile](<../../../services/backend/Dockerfile>). Другого Dockerfile-specific ignore файла при поиске `*.dockerignore` в backend не обнаружено.
- [Ignore rules](<../../../services/backend/.dockerignore>): `venv/`, `__pycache__/`, `.idea/`, `*.env`. Docker не использует gitignore; одиночное `__pycache__/` не выражает рекурсивное исключение произвольной глубины, в частности `src/api/__pycache__`. Нужен явный `**`.
- [Dockerfile](<../../../services/backend/Dockerfile>): Python 3.13, `COPY src/ ./src`, `uv sync --locked`, нет `PYTHONDONTWRITEBYTECODE`, нет `USER`. [Compose](<../../../.docker-compose/docker-compose.be.yml>): `user` отсутствует; `src` bind mount имеет `${DEV_MOUNT:-ro}`. Default `ro` не позволяет записывать caches в исходники; writable override потенциально позволяет.
- Лог пользователя фиксирует fatal на `checking context`, до исполнения инструкций Dockerfile: клиент не может прочитать pyc. Это не ошибка приложения или установки зависимостей.
- Read-only `id; namei -l ...; stat ...` в текущем sandbox: агент uid/gid 1000, cache каталог mode 755 uid/gid 65534 (`nobody`), pyc mode 600 uid/gid 65534 (`nobody`). Доступ прохода по видимым родительским каталогам есть; mode файла не даёт uid1000 читать его через обычные Unix permissions. ACL отдельно не исследовались. Чтение содержимого pyc не предпринималось.
- И корневой, и backend-репозиторий содержат чужие незавершённые изменения. Их не менять, не форматировать и не включать в будущий diff.

### Гипотезы и ограничения

Root-процесс контейнера с writable bind mount и ограничительным umask мог создать этот pyc. Это **не доказано**: sandbox показывает `nobody`, а отображение UID может отличаться от хоста; runtime configuration и история создания файла не исследовались. Ни root ownership на хосте, ни фактический `DEV_MOUNT=rw` не утверждаются. Необходимо исправить набор входных файлов, а не гадать о создателе.

Warning `buildx Docker CLI plugin not found: falling back to classic builder` сообщает о выборе builder. По логу fallback произошёл, fatal — недоступный файл. Установка buildx полезна как отдельное обслуживание окружения, но не заменяет корректные ignore rules и не гарантирует устранение permission error.

## Goals / Non-Goals

**Цели:** backend build context не включает Python caches на любой глубине; существующий недоступный pyc не требует cleanup или изменения прав; обычные Python imports в новом образе не записывают bytecode.

**Вне scope:** API, БД, NATS, исходники приложения, dependency versions, пользователь контейнера, compose mounts, Makefile, chmod/chown, удаление caches, установка buildx, sudo. Production-развёртывание не входит в change. Rebuild и подготовка проверочного backend-стека допускаются только после approval в QG-ENV, в согласованном Router окружении.

## Decisions

### 1. Минимальное рекурсивное исключение

После approval дополнить [`.dockerignore`](<../../../services/backend/.dockerignore>) следующими правилами, сохранив текущие исключения:

```dockerignore
**/__pycache__/
*.py[co]
**/*.py[co]
```

Сохранить существующее `__pycache__/` для явной совместимости корневого случая. Явные корневое и рекурсивное правила bytecode покрывают `.pyc` и `.pyo`. Не использовать более широкое `*.py[cod]`: `.pyd` может быть необходимым Python extension, а не временным bytecode; его исключение для этой ошибки не требуется.

Не расширять этот change на `.venv`, logs, tests, secrets и остальные сервисы: это отдельная hygiene-задача. Не добавлять широкое исключение `src` или negation, возвращающие caches в контекст.

Альтернатива: только recursive ignore — достаточно для исходной fatal ошибки, но не предотвращает новые caches на host. Альтернатива cleanup/ремонт владельца — требует разрешения, не решает повторное возникновение и здесь не планируется. `chmod 777` и сборка через sudo неприемлемы.

### 2. Профилактика bytecode в образе

В [Dockerfile](<../../../services/backend/Dockerfile>) сразу после `FROM python:3.13` задать `ENV PYTHONDONTWRITEBYTECODE=1`. Это действует на последующие стандартные Python-процессы и наследуется runtime, включая `uv run` и Python healthcheck, без дублирования compose environment.

Переменная не удаляет существующие caches, не запрещает чтение существующего bytecode и не является защитой от явного `compileall`/`py_compile` или переопределения environment. Она не предотвращает сборочные permission errors сама по себе: Docker проверяет контекст до выполнения `ENV`. Host Python вне контейнера этой настройкой не управляется.

Изменение container UID могло бы решить более широкий вопрос writable mounts, но затронет доступ к логам и другие пути; это отдельный security change.

## Access matrix

**N/A:** endpoint не добавляются и не меняются. Роли, исключения Public Read/Protected Write и anonymous/authenticated тесты неприменимы. API-контракт и схема БД без изменений.

## Execution units

Deliverable A — инфраструктурное исправление: Backend единолично владеет [`.dockerignore`](<../../../services/backend/.dockerignore>) и [Dockerfile](<../../../services/backend/Dockerfile>), capability `backend-build-context-hygiene`.
Deliverable B — общий Quality Gate: только проверка результата и подготовка согласованного проверочного окружения, без ownership implementation-файлов; при rework вернуть Backend. PLAN-2 корректирует план после PLAN-1; все дальнейшие units закрыты approval gate. Только QG-SYNTH вправе выдать общий APPROVED.

| Unit | Профиль | Deliverable | Ownership paths | Зависит от | Verification |
|---|---|---|---|---|---|
| BE-1 | Backend | A | `services/backend/.dockerignore`, `services/backend/Dockerfile` | PLAN-2 + approval | Статическая сверка двух файлов, `git diff --check` в backend |
| QG-ENV | Quality Gate | B | —, проверочное окружение | BE-1 | Подготовка/doctor, backend rebuild T-02 и health/ready |
| QG-BE | Quality Gate | B | —, проверки | QG-ENV PASS | T-01, T-03, T-04 и evidence T-02 |
| QG-CONTRACTS | Quality Gate | B | —, проверки | QG-ENV PASS | Spec/scenarios/tasks/ownership соответствие, N/A access |
| QG-FORMAT | Quality Gate | B | —, verification; rework владельцу | QG-BE PASS, QG-CONTRACTS PASS | `make format`, `make lint`, `make test` по правилам проекта |
| QG-SYNTH | Quality Gate | B | —, итог | QG-FORMAT PASS | Evidence всех lanes, общий APPROVED/REWORK |

```text
PLAN-2 → approval → BE-1 → уведомление Full Access → QG-ENV
                                                     ├→ QG-BE ────────┐
                                                     └→ QG-CONTRACTS ─┴→ QG-FORMAT → QG-SYNTH
```

QG-CONTRACTS применим всегда: отсутствие API diff не отменяет проверку соответствия spec/task/ownership. QG-FORMAT обязателен перед SYNTH. QG-ENV применим из-за Docker/runtime-конфигурации; QG-BE и QG-CONTRACTS стартуют только после успешного ENV и могут идти параллельно (verification only). QG-FE-AUTO/QG-FE-MANUAL неприменимы без UI diff; QG-LIVE неприменим без API diff, health/ready проверяются в ENV, а bytecode — в BE. Точечные contextFiles приведены в [tasks](<tasks.md>).

### Граница доступа и окружение QG

Перед запуском QG Router уведомляет пользователя о необходимости Full Access для Docker daemon и проверочного стека, явно перечисляет rebuild/health и разрешённое окружение. Это уведомление не заменяет approval и не даёт права на sudo, chmod/chown, cache cleanup или production restart. Если выбранная сессия не имеет нужного доступа, Router обеспечивает разрешённую QG-сессию; исполнитель фиксирует environment blocker и не обходит sandbox denied. В PLAN-2 доступа не запрашивать и проверки не запускать.

QG-ENV загружает `stack-control`, обнаруживает фактическое проверочное окружение, проверяет doctor/status, выполняет backend rebuild без очистки исходного cache и проверяет health/ready. Если stackctl rebuild использует cached build, отдельно выполнить T-02 `make be-build-nc`; health относится именно к новому образу. Не пересоздавать production или unrelated сервисы; при невозможности отделить проверочный стек вернуть Router конкретный blocker.

Для инструментальных caches при недоступности home использовать только доступные каталоги workspace: `UV_CACHE_DIR`, `XDG_CACHE_HOME`, `MYPY_CACHE_DIR`, `PYTHONPYCACHEPREFIX` в отдельном `.cache/qg-backend-build-context/` (при необходимости fallback `HOME` только для инструментов). Не перенаправлять и не удалять исходный `src/api/__pycache__`: он нужен для регрессии T-02. Sandbox denial не обходить alternate-path трюками; workspace fallback относится только к обычным инструментальным caches, а не к доступу к запрещённым данным.

`make format` может изменять файлы вне change. Чтобы обязательный FORMAT не затронул чужую работу, Router заранее выбирает чистое изолированное проверочное дерево с переносом только назначенного diff. Formatting diffs в implementation возвращаются владельцу BE-1, затем затронутые lanes перепроверяются; чужие файлы не форматировать и не откатывать. Если чистую проверку организовать нельзя — blocker, не пропускать FORMAT. Общий итог до SYNTH запрещён.

## Test matrix

Все проверки ниже **планируются после approval**, сейчас сборка не запускалась. Existing pyc не читать, не удалять и не менять права; регрессию проверять на исходном контексте без очистки. При недоступности Docker engine/сетевых зависимостей фиксировать environment blocker, не обходить его sudo.

| ID | Уровень | Риск/ось | Сценарий → delta spec | Ожидание | Где проверяется |
|---|---|---|---|---|---|
| T-01 | Статика | Глубина и границы | «Корневые и вложенные caches», «Исходники остаются доступными» | Explicit root/recursive cache и bytecode rules; нет исключения `src`; текущие unrelated rules сохранены | Diff двух файлов, проверка patterns до Docker build |
| T-02 | Docker regression | Исходная permission ошибка | «Сборка с существующим недоступным cache» | `make be-build-nc` под непривилегированным оператором без cleanup проходит context checking; при успехе всей сборки exit 0 | Корень монорепозитория, тот же builder fallback допустим; stdout и exit code |
| T-03 | Проверка образа | Состав исходников | «Корневые и вложенные caches», «Исходники остаются доступными» | В `/eqsitecms/src` образа нет перенесённых `__pycache__`/bytecode; `/eqsitecms/src/main.py` существует | Изолированный `docker run --rm --network none --entrypoint python eqsitecms-backend:latest`, без mounts |
| T-04 | Проверка образа | Профилактика записи | «Автоматический bytecode отключён» | `PYTHONDONTWRITEBYTECODE=1`, `sys.dont_write_bytecode` истинно; import простого собственного временного модуля в writable temp dir не создаёт cache | Тот же изолированный образ; временный модуль только в контейнере, не API import и не host src |

Happy path и регрессия: T-02/T-03. Граничная глубина/расширения: T-01/T-03. Внешние ошибки: QG-ENV отделяет context error от последующих apt/uv/network failures; успешный context этап не равен успешной всей сборке. Транзакции, конкурентность, PostgreSQL, контракт ответа и доступ к чужим API-ресурсам: неприменимо, конфигурационная задача без API/БД-записей. Общепроектные format/lint/test обязательны в QG-FORMAT и выполняются без изменения чужого рабочего diff в изолированном проверочном дереве. Любые baseline failures отделяются от change findings, но не скрываются и не дают автоматически PASS.

## Risks / Trade-offs

- [Другой недоступный файл вне caches] → сообщить точный путь; не расширять exclusions вслепую, запросить отдельный scope.
- [Недоступен даже родительский каталог] → ignore не чинит traversal rights; metadata сейчас этого не показывает, при повторении вернуть blocker оператору.
- [Host или env override продолжает создавать caches] → recursive ignore остаётся основной гарантией; ENV только профилактика внутри нового образа.
- [Малое увеличение времени imports без записи bytecode] → приемлемо; измерение performance не требуется для устранения context failure.
- [Чужие изменения/новая ветка] → профильный исполнитель следует сервисному git-workflow из [SERVICES](<../../../SERVICES.md#L22-L32>); не сбрасывает и не переносит чужие изменения, при конфликте веток возвращает blocker.

## Migration Plan

После approval BE-1 вносит только две правки. Router уведомляет о Full Access, выбирает проверочный стек и чистое дерево для FORMAT. QG-ENV подготавливает окружение, выполняет rebuild и health/ready; после его PASS идут BE и CONTRACTS, затем обязательный FORMAT и SYNTH. Только QG-SYNTH принимает весь change. Оператор отдельно решает, когда пересоздавать production backend для применения runtime ENV: текущий контейнер от изменения Dockerfile сам не обновится.

Rollback — отменить только эти две правки, затем при отдельном разрешении пересобрать нужный образ. Файлы caches, владельцы и данные не изменяются. Sync delta spec и archive — после успешного общего Quality Gate и решения Router/оператора; в PLAN-1 не выполнять.

## Open Questions

Блокирующих проектирование вопросов нет. Approval для apply отсутствует. Неизвестны фактический host UID создателя caches, runtime override `DEV_MOUNT` и способ появления mode 600; расследовать их для этого исправления необязательно. Наличие buildx и решение о его установке — отдельная задача оператора, не prerequisite данного изменения.
