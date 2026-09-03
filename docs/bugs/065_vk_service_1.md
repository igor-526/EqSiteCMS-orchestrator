GlitchTip error event
Source: https://glitchtip.eqcms.ru
Instance: https://glitchtip.eqcms.ru
Organization: equestrian-site-cms
Issue ID: 11
Event ID: 01a063ec5c657909b2348353f2fa4643
Event URL: https://glitchtip.eqcms.ru/equestrian-site-cms/issues/11

Raw event JSON:
```json
{
  "platform": "python",
  "errors": null,
  "id": "01a063ec5c657909b2348353f2fa4643",
  "eventID": "d31aa6a007d44902bb61c0ea25001e7b",
  "projectID": 6,
  "groupID": "11",
  "dateCreated": "2026-09-02T21:00:29.571Z",
  "dateReceived": "2026-09-02T21:00:29.669Z",
  "dist": null,
  "culprit": "",
  "packages": {
    "h11": "0.16.0",
    "six": "1.17.0",
    "amqp": "5.3.1",
    "idna": "3.18",
    "mako": "1.4.1",
    "vbml": "1.1.post1",
    "vine": "5.1.0",
    "yarl": "1.24.5",
    "anyio": "4.14.2",
    "attrs": "26.1.0",
    "click": "8.4.2",
    "kombu": "5.6.2",
    "redis": "6.4.0",
    "celery": "5.6.3",
    "pyyaml": "6.0.3",
    "tzdata": "2026.3",
    "uvloop": "0.22.1",
    "aiohttp": "3.14.3",
    "alembic": "1.19.0",
    "asyncpg": "0.31.0",
    "certifi": "2026.7.22",
    "fastapi": "0.141.1",
    "msgspec": "0.21.1",
    "nats-py": "2.15.0",
    "tzlocal": "5.4.4",
    "urllib3": "2.7.0",
    "uvicorn": "0.52.1",
    "wcwidth": "0.8.2",
    "aiofiles": "24.1.0",
    "billiard": "4.2.4",
    "colorama": "0.4.6",
    "greenlet": "3.5.4",
    "pydantic": "2.13.4",
    "vkbottle": "4.11.0",
    "aiosignal": "1.4.0",
    "choicelib": "0.1.5",
    "httptools": "0.8.0",
    "multidict": "6.7.1",
    "packaging": "26.3",
    "propcache": "0.5.2",
    "starlette": "1.4.1",
    "click-repl": "0.3.0",
    "frozenlist": "1.8.0",
    "markupsafe": "3.0.3",
    "sentry-sdk": "2.66.1",
    "sqlalchemy": "2.0.51",
    "watchfiles": "1.2.0",
    "websockets": "17.0.1",
    "annotated-doc": "0.0.5",
    "click-plugins": "1.1.1.2",
    "pydantic_core": "2.46.4",
    "python-dotenv": "1.2.2",
    "prompt_toolkit": "3.0.53",
    "vkbottle-types": "5.199.99.22",
    "annotated-types": "0.8.0",
    "python-dateutil": "2.9.0.post0",
    "aiohappyeyeballs": "2.7.1",
    "click-didyoumean": "0.3.1",
    "prometheus_client": "0.26.0",
    "pydantic-settings": "2.14.2",
    "typing-inspection": "0.4.2",
    "typing_extensions": "4.16.0",
    "dependency-injector": "4.49.1",
    "prometheus-fastapi-instrumentator": "8.1.0"
  },
  "type": "default",
  "message": "Unable to make request to BotPolling, retrying...",
  "metadata": {
    "title": "Unable to make request to BotPolling, retrying..."
  },
  "tags": [
    {
      "key": "release",
      "value": "1"
    },
    {
      "key": "environment",
      "value": "production"
    },
    {
      "key": "server_name",
      "value": "eqcms-vk-service-vk-bot-56dc6fc567-289kk"
    }
  ],
  "entries": [
    {
      "type": "breadcrumbs",
      "data": {
        "values": [
          {
            "type": "log",
            "category": "bot.main",
            "message": "Starting VK bot runtime in production environment",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-01T18:19:01.837Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "bot.main",
            "message": "VK bot runtime started, long poll wait=25s",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-01T18:19:02.011Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "vkbottle",
            "message": "Starting BotPolling for <API token_generator=<<class 'vkbottle.api.token_generator.single.SingleTokenGenerator'>>...>",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-01T18:19:02.013Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "vkbottle",
            "message": "Unable to make request to BotPolling, retrying...",
            "data": null,
            "level": "error",
            "timestamp": "2026-09-01T21:00:36.572Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:24:29.355Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:24:51.251Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:24:51.274Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:24:51.613Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:25:13.511Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:25:35.413Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:25:57.311Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:26:19.208Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:26:41.106Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:27:03.003Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:27:24.901Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:27:46.798Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:28:08.697Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:28:30.594Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:28:52.492Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:29:14.391Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:29:36.320Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:29:58.217Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:30:20.115Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:30:42.013Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:31:03.913Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:31:25.811Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:31:47.711Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:32:09.607Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:32:31.505Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:32:53.404Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:33:15.304Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:33:37.201Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:33:59.097Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:34:20.994Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:34:42.893Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:35:04.790Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:35:26.688Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:35:48.584Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:36:10.483Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:36:32.381Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:36:54.281Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:37:16.178Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:37:38.076Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:37:59.973Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:38:21.871Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:38:43.770Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:39:05.668Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:39:27.564Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:39:49.460Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:40:11.358Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:40:33.257Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:40:55.156Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:41:17.053Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:41:38.951Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:42:00.849Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:42:22.746Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:42:44.643Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:43:06.542Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:43:28.440Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:43:50.339Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:44:12.236Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:44:34.134Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:44:56.031Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:45:17.927Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:45:39.824Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:46:01.721Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:46:23.619Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:46:45.519Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:47:07.415Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:47:29.315Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:47:51.213Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:48:13.114Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:48:35.011Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:48:56.908Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:49:18.809Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:49:40.707Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:50:02.605Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:50:24.504Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:50:46.401Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:51:08.298Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:51:30.195Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:51:52.093Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:52:14.323Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:52:36.221Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:52:58.121Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:53:20.021Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:53:41.919Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:54:03.822Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:54:25.719Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:54:47.619Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:55:09.520Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:55:31.418Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:55:53.315Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:56:15.215Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:56:37.113Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:56:59.012Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:57:20.940Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:57:42.838Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:58:04.735Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:58:26.633Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:58:48.530Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:59:10.428Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:59:32.327Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-02T20:59:54.228Z",
            "event_id": null
          }
        ]
      }
    },
    {
      "type": "message",
      "data": {
        "params": [],
        "message": "Unable to make request to BotPolling, retrying...",
        "formatted": "Unable to make request to BotPolling, retrying..."
      }
    }
  ],
  "contexts": {
    "trace": {
      "type": "trace",
      "trace_id": "e3e1e0435d2848519d005db0a6042aec",
      "span_id": "ae4cb7c1a56e0152"
    },
    "runtime": {
      "type": "runtime",
      "name": "CPython",
      "version": "3.14.6"
    }
  },
  "context": {
    "asctime": "2026-09-02 21:00:29,570",
    "sys.argv": [
      "/app/src/bot/__main__.py"
    ]
  },
  "user": {
    "ip_address": "193.176.79.0"
  },
  "sdk": {
    "name": "sentry.python.fastapi",
    "version": "2.66.1",
    "packages": [
      {
        "name": "pypi:sentry-sdk",
        "version": "2.66.1"
      }
    ],
    "integrations": [
      "aiohttp",
      "argv",
      "asyncpg",
      "atexit",
      "celery",
      "dedupe",
      "excepthook",
      "fastapi",
      "logging",
      "modules",
      "redis",
      "sqlalchemy",
      "starlette",
      "stdlib",
      "threading"
    ]
  },
  "title": "Unable to make request to BotPolling, retrying...",
  "userReport": null,
  "nextEventID": null,
  "previousEventID": "01a05ec61b9f7138b2d626b62451b8f0"
}
```