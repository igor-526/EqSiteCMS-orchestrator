# Конекст
В какой-то момент не самые сложные задачи стали съедать больше пятичасового лимита codex. Наша задача оптимизировать пайплайн таким образом, чтобы избежат таких трат. Этого нужно добиться методом корректировки инструкций в файлах `AGENTS.md` и инструкциях агентов в директории `agents`. Проанализируй информацию ниже
# Информация
Корневой `AGENTS.md` на самом деле содержит правильную идею: после утверждения change Router должен разбить его на ограниченные непересекающиеся deliverables, и большой change не должен целиком попадать одному субагенту.

Но дальше возникает противоречие.

`planner.md` требует для backend-фичи явно перечислять **минимум 30 unit + 30 smoke тестов**, причём каждый пункт должен быть атомарным checklist item.

В результате Planner производит структуру вроде:

```
### Backend

1.1 implementation
1.2 implementation
...
1.10 implementation

1.11 unit scenario
1.12 unit scenario
...
1.44 unit scenario

1.45 notification implementation
...

1.54 smoke scenario
...
1.94 smoke scenario

1.95 run smoke suite
```

А Router фактически воспринимает весь `### Backend` как **один ownership/deliverable**.

Backend-агент при этом получает task IDs, ownership и инструкцию работать до завершения deliverable, не ожидая дополнительных указаний.

То есть три понятия постепенно слились в одно:

**acceptance scenario → OpenSpec checkbox → agent execution unit**

А это три совершенно разных уровня.

---

### Где именно это стало плохо

|Change|Что произошло|Моя оценка|
|---|---|---|
|`observability-054`|Один backend workstream охватывает сразу `backend`, `email-service` и `notification-service`, плюс lifecycle/Sentry/metrics unit и smoke проверки.|Первый серьёзный сигнал|
|`callback-requests-management-055`|Backend-секция разрастается до **1.1–1.95**, включая реализацию, notification-service, unit и реальные PostgreSQL/NATS smoke.|**Переломная точка**|
|`vk-service-initialization-059`|Один ownership `services/vk-service/**`, но tasks.md уже около 197 строк и содержит огромный implementation + testing scope.|Проблема ещё сильнее|
|`vk-user-confirmation-060`|Появляются явные Deliverables A–F и зависимости между ними.|Уже движение в правильную сторону|

Особенно показателен `055`.

Для агента это не «одна backend-задача». В реальности там минимум несколько отдельных рабочих сессий:

schema/storage → domain/repository → API → notification integration → unit verification → live PostgreSQL/NATS verification.

Но инструкция говорит ему: вот Backend ownership, **доведи deliverable до конца**.

Поэтому совершенно неудивительно, что одна такая задача перестала помещаться в пятичасовой бюджет.

### Главная архитектурная ошибка

У тебя decomposition сейчас оптимизирован в основном под **ownership correctness**:

> кто имеет право менять какие файлы?

Но почти не оптимизирован под **execution boundedness**:

> сколько работы один экземпляр агента должен выполнить прежде, чем вернуть управление Router?

Это разные задачи.

Например:

```
services/vk-service/**
```

— прекрасный ownership boundary.

Но ужасный execution boundary.

Один агент действительно может быть единственным владельцем `vk-service/**`, но это не означает, что **один invocation этого агента** должен реализовать весь сервис.

И это особенно важно для instruction-only orchestration. Кодовый orchestrator сам по себе здесь ничего магически не исправил бы. Просто в коде проще принудительно ввести лимиты и state machine. Через `AGENTS.md` то же самое возможно, но эти ограничения нужно сформулировать явно.

### Что я бы поменял

1. **Убрал бы правило `30 unit + 30 smoke` из Planner.** Оно искусственно раздувает любую backend-фичу независимо от риска. Вместо этого нужна risk/behavior-based test matrix. Можно иметь хоть 70 acceptance scenarios, но они не должны превращаться в 70 верхнеуровневых execution tasks.
2. **Ввёл бы отдельную сущность `Execution Unit`.** OpenSpec change состоит из deliverables, а deliverable может состоять из нескольких execution units одного и того же профиля. Например `BE-1`, `BE-2`, `BE-3` — это три последовательных запуска Backend-agent с одним общим ownership.
3. **Router должен делегировать execution unit, а не секцию `### Backend`.** Хороший эвристический лимит: один сервис или один архитектурный slice, примерно 8–12 существенных действий, одна группа verification. Это не абсолютные числа, а circuit breaker.
4. **Acceptance tests нужно отделить от tasks.** Вместо 30 строк вида `проверить X`, `проверить Y`, `проверить Z` в `tasks.md` можно иметь одну задачу `Implement and verify callback query semantics against UT-CB-01..18`, а сами 18 сценариев хранить в test matrix/spec.
5. **Нужен обязательный checkpoint между execution units.** Агент завершает небольшой связный кусок, запускает соответствующие тесты, отмечает task IDs, оставляет краткий handoff: changed files / tests / decisions / remaining work. Следующий invocation стартует уже со свежим контекстом.
6. **Нужен circuit breaker для самого агента.** Если после чтения задачи он понимает, что deliverable выходит за установленный budget, он не должен героически выполнять его до конца. Он должен завершить безопасную атомарную часть и вернуть Router предложение `BE-3 → BE-3a + BE-3b`.
7. **Quality Gate тоже стоит логически оставить одним, но физически распараллелить/раздробить.** Например backend/runtime QG, frontend/browser QG, architecture/contracts QG и затем короткий synthesis. Иначе после дробления реализации следующим монолитом станет QG.

### Как выглядел бы `callback-requests-management-055`

Вместо одного Backend `1.1–1.95` я бы сделал примерно такую DAG:

```
CB-BE-1
schema + models + migration

      ↓

CB-BE-2
repository + domain/query/mutation services

      ↓

CB-BE-3
HTTP API + access control + contracts

      ↓
       ↘
CB-BE-4  CB-NOTIFY-1
unit     notification integration
tests

       ↘   ↙
CB-SMOKE-1
PostgreSQL + NATS live verification
```

При этом `CB-BE-1`, `CB-BE-2`, `CB-BE-3` вполне может выполнять один и тот же профиль Backend. Просто это **три независимых запуска агента**, а не один пятичасовой марафон.

И это не нарушает твоё правило «одна tightly-coupled зона — один owner»: ownership остаётся у Backend-профиля, меняется только lifetime execution context.

### `060` уже показывает, что ты интуитивно пришёл примерно туда

В `vk-user-confirmation-060` уже появились явно названные Deliverables A–F, плюс зависимости A → B → C и отдельные backend/CMS/QA зоны.

Это существенно лучше предыдущих change'ей.

Но я бы пошёл ещё на уровень глубже. Например A сейчас можно разделить:

```
A1 models + migration + repositories
A2 binding/confirmation domain services
A3 domain tests
```

B:

```
B1 API + settings
B2 API tests + contracts/docs
```

E:

```
E1 CMS implementation
E2 automated UI tests
E3 browser/manual QA
```

Сам change `060` тоже довольно большой: реализационный commit затронул около 60 файлов и добавил более 4 тысяч строк. Поэтому наличие A–F само по себе ещё не гарантирует, что каждый A/B/C помещается в одну агентную сессию.

### И ещё один важный момент про пятичасовой лимит

Если ты говоришь именно про **общий rolling usage budget Codex**, а не технический timeout одной агентной сессии, то просто породить пять агентов вместо одного недостаточно. Параллельность может даже быстрее съесть общий бюджет.

В таком случае особенно критичны две вещи: перестать заставлять Planner генерировать десятки искусственных test tasks и перестать каждому новому агенту перечитывать огромный объём одинакового контекста.

То есть оптимальная архитектура у тебя примерно такая:

**OpenSpec Change → Deliverables → Execution Units → Agent invocation**

а не нынешняя фактическая:

**OpenSpec Change → Backend/Frontend section → один огромный Agent invocation**.

По истории репозитория я бы назвал **`055` моментом, когда текущая модель перестала масштабироваться**. `054` был предупреждением, `059` подтвердил системность проблемы, а `060` уже выглядит как начало правильного рефакторинга оркестратора.

Если дальше править систему, я бы в первую очередь менял именно **`AGENTS.md` + `agents/planner.md` + контракт Router→worker**, а карту агентов почти не трогал: сама специализация агентов у тебя выглядит не главной причиной проблемы.