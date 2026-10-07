# DeepSeek Harness для EqSiteCMS

Проектная установка DeepSeek Harness (DSH). Runtime зафиксирован в
`package-lock.json`, а проектный Harness home находится в `dsh/home` и не
использует глобальный `~/.dsh`.

## Установка и запуск

Требуется Node.js. Из корня репозитория:

```bash
cd dsh
npm ci --ignore-scripts
npm run web:no-open
```

Web UI по умолчанию доступен на `http://127.0.0.1:3080`. Для обычного запуска
с открытием браузера используется `npm run web`.

Из корня репозитория Harness можно поднять с attach-lifecycle:

```bash
make harness
```

Первый вызов запускает профиль `web` в foreground, оставляя процесс и логи в
текущем терминале; остановить его можно через `Ctrl+C`. Повторный вызов при уже
работающем DSH на `127.0.0.1:3080` проверяет HTTP-сигнатуру Harness и успешно
завершается без запуска второго webserver. Если порт занят другим приложением,
target завершится с ошибкой и не будет вмешиваться в чужой процесс.

Хост и порт можно переопределить:

```bash
make harness HARNESS_HOST=127.0.0.1 HARNESS_PORT=3081
```

В DSH `0.2.0-rc.2` нет отдельной команды attach и нельзя присоединить новый CLI
к stdout/stderr уже работающего процесса. При повторном вызове продолжайте
работать в уже открытом Web UI и терминале процесса-владельца.

### Авторизация OpenAI Codex

Проектный профиль уже объявляет provider `openai-codex` и модель
`gpt-5.6-sol`. Для этого provider недостаточно существующего входа Codex CLI:
DSH не читает содержимое `~/.codex/auth.json` и хранит собственную OAuth-запись
в проектном credential store.

После первого запуска `make harness`:

1. Открыть Web UI по защищённой ссылке, напечатанной DSH в терминале.
2. Перейти в **Settings → Models → OpenAI Codex**.
3. Нажать **Sign in with ChatGPT** и полностью завершить OAuth flow, не
   перезагружая страницу во время входа.
4. Повторить turn с provider `openai-codex`.

Успешный вход создаёт запись `llm-pi-ai/openai-codex` в
`dsh/home/.credentials.yaml`. Файл исключён из Git и должен оставаться с
правами `0600`; его нельзя копировать в профиль или публиковать. Авторизацию
нужно отдельно выполнить на каждой рабочей машине.

Ошибка `Provider is not configured: openai-codex` при уже объявленном provider
означает отсутствие OAuth credential, а не отсутствие plugin или route.
Официальное описание интеграции Codex app-server и OAuth token:
<https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server>.

Проверка CLI:

```bash
cd dsh
npm run dsh -- --version
npm run dsh -- --profile web --help
```

## Переносимые настройки и плагины

Профиль `web` хранится в `home/profiles/web/`. Его `package.json`,
`cordis.patch.yml`, `cordis.yml` и workspace-файл версионируются. Добавление
плагина через проектный runtime должно выполняться так:

```bash
cd dsh
npm run dsh -- plugin --profile web add <package>
```

После изменения плагинов или настроек следует проверить diff в
`dsh/home/profiles/web/` и добавить переносимые файлы профиля в Git.

Не коммитить секреты, credentials, сессии, вложения, логи, кэш и локальные БД.
Эти пути исключены корневым `.gitignore`. Перед переносом на другую машину
секреты нужно настроить заново внутри DSH.

DSH находится в developer preview; обновление версии в `package.json` и
`package-lock.json` следует выполнять осознанно и проверять на совместимость.

## Агентные роли EqSiteCMS

Проектный профиль содержит preset `eqsite-router` с ролевыми делегирующими инструментами для мультиагентного workflow. Bundle `@eqsite/dsh-agents` версионируется в `home/profiles/web/bundles/eqsite-agents/`.

### Установка и проверка

После клонирования репозитория или изменения bundle:

```bash
cd dsh
DSH_HOME=./home npx dsh plugin --profile web install
```

Проверка конфигурации:

```bash
DSH_HOME=./home npx dsh --profile web --dump-config | grep -A5 "preset-eqsite-router"
```

Preset должен содержать пять делегирующих инструментов: `delegate_planner`, `delegate_backend`, `delegate_frontend`, `delegate_site_consumer`, `delegate_quality_gate`.

### Применение изменений persona-блоков

Ролевые правила в `agents/{planner,backend,frontend,site_consumer,quality_gate}.md` обёрнуты маркерами `<!-- dsh-persona:begin -->` и `<!-- dsh-persona:end -->`. Router читает `agents/router.md` целиком. Persona вычисляется при активации preset через `!!js` и передаётся в system prompt.

**После правок этих файлов:**

1. Переустановить bundle (если менялась только persona — не обязательно).
2. **Перезапустить DSH** (`npm run web` из `dsh/`).
3. Создать новую сессию с preset `eqsite-router` для применения изменений.

Существующие сессии держат старую ревизию persona. Изменения в `AGENTS.md` (общее ядро) применяются автоматически через `dsh-agent-instructions`.

### Использование Router preset

В новой сессии Web UI выбрать preset **EqSiteCMS Router**. Доступные инструменты:
- `delegate_planner` — делегирование задач Planner
- `delegate_backend` — делегирование Backend-имплементации
- `delegate_frontend` — делегирование Frontend-имплементации
- `delegate_site_consumer` — делегирование Site Consumer-работы
- `delegate_quality_gate` — делегирование проверок Quality Gate
- `workflow` — оркестрация через JavaScript-скрипт
- Базовые инструменты: `bash`, `read`, `write`, `edit`, `glob`, `grep`, skills, goals, MCP

Ролевые агенты ограничены `maxDepth: 1` и `toolFilter.deny`, запрещающим вложенные делегирования. Router продолжает диалог с тем же агентом через `send_message` (режим `continuable`).

### Откат default preset

Если нужно вернуться к preset `standard`:

1. Открой `dsh/home/profiles/web/cordis.patch.yml`
2. Удали или закомментируй блок `agent-preset-registry`
3. Перезапусти DSH: `npm run web` из `dsh/`

После этого новые сессии будут создаваться с preset `standard` по умолчанию.
