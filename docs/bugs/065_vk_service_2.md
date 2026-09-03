GlitchTip error event
Source: https://glitchtip.eqcms.ru
Instance: https://glitchtip.eqcms.ru
Organization: equestrian-site-cms
Issue ID: 13
Event ID: 01a0637f882b7b2ab198e3cecb43bf16
Event URL: https://glitchtip.eqcms.ru/equestrian-site-cms/issues/13

Raw event JSON:
```json
{
  "platform": "python",
  "errors": null,
  "id": "01a0637f882b7b2ab198e3cecb43bf16",
  "eventID": "42a7711fe9f94820bb78fd8090532145",
  "projectID": 6,
  "groupID": "13",
  "dateCreated": "2026-09-02T19:01:37.333Z",
  "dateReceived": "2026-09-02T19:01:37.451Z",
  "dist": null,
  "culprit": "clients.nats.consumers.notification_commands_send_vk in _consume",
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
  "type": "error",
  "message": "TimeoutError",
  "metadata": {
    "type": "TimeoutError",
    "value": "",
    "filename": "clients/nats/consumers/notification_commands_send_vk.py",
    "function": "_consume"
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
      "value": "eqcms-vk-service-deployment-7bf6db4b45-qdcnq"
    }
  ],
  "entries": [
    {
      "type": "exception",
      "data": {
        "values": [
          {
            "type": "TimeoutError",
            "value": "",
            "mechanism": {
              "type": "logging",
              "handled": true
            },
            "stacktrace": {
              "frames": [
                {
                  "vars": {
                    "self": "<clients.nats.consumers.notification_commands_send_vk.NotificationCommandsSendVkConsumer object at 0x7166d07d4c20>",
                    "messages": []
                  },
                  "module": "clients.nats.consumers.notification_commands_send_vk",
                  "filename": "clients/nats/consumers/notification_commands_send_vk.py",
                  "function": "_consume",
                  "context_line": "                messages = await self._subscription.fetch(",
                  "inApp": true,
                  "absPath": "/app/src/clients/nats/consumers/notification_commands_send_vk.py",
                  "lineNo": 64,
                  "context": [
                    [
                      59,
                      "    async def _consume(self) -> None:"
                    ],
                    [
                      60,
                      "        if self._subscription is None:"
                    ],
                    [
                      61,
                      "            raise RuntimeError(\"VK notification consumer has no subscription\")"
                    ],
                    [
                      62,
                      "        while True:"
                    ],
                    [
                      63,
                      "            try:"
                    ],
                    [
                      64,
                      "                messages = await self._subscription.fetch("
                    ],
                    [
                      65,
                      "                    batch=self._settings.nats_consumer_fetch_batch_size,"
                    ],
                    [
                      66,
                      "                    timeout=self._settings.nats_consumer_fetch_timeout_seconds,"
                    ],
                    [
                      67,
                      "                )"
                    ],
                    [
                      68,
                      "            except NatsTimeoutError:"
                    ],
                    [
                      69,
                      "                continue"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<nats.js.client.JetStreamContext.PullSubscription object at 0x7166d07d4ec0>",
                    "batch": "10",
                    "expires": "4999900000",
                    "timeout": "5.0",
                    "heartbeat": "None"
                  },
                  "module": "nats.js.client",
                  "filename": "nats/js/client.py",
                  "function": "fetch",
                  "context_line": "            msgs = await self._fetch_n(batch, expires, timeout, heartbeat)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/nats/js/client.py",
                  "lineNo": 1100,
                  "context": [
                    [
                      1095,
                      ""
                    ],
                    [
                      1096,
                      "            expires = int(timeout * 1_000_000_000) - 100_000 if timeout else None"
                    ],
                    [
                      1097,
                      "            if batch == 1:"
                    ],
                    [
                      1098,
                      "                msg = await self._fetch_one(expires, timeout, heartbeat)"
                    ],
                    [
                      1099,
                      "                return [msg]"
                    ],
                    [
                      1100,
                      "            msgs = await self._fetch_n(batch, expires, timeout, heartbeat)"
                    ],
                    [
                      1101,
                      "            return msgs"
                    ],
                    [
                      1102,
                      ""
                    ],
                    [
                      1103,
                      "        async def _fetch_one("
                    ],
                    [
                      1104,
                      "            self,"
                    ],
                    [
                      1105,
                      "            expires: Optional[int],"
                    ]
                  ]
                },
                {
                  "vars": {
                    "msgs": [],
                    "self": "<nats.js.client.JetStreamContext.PullSubscription object at 0x7166d07d4ec0>",
                    "batch": "10",
                    "queue": "<Queue at 0x7166d2a6a8b0 maxsize=524288 tasks=3201>",
                    "needed": "10",
                    "expires": "4999900000",
                    "timeout": "5.0",
                    "heartbeat": "None",
                    "start_time": "94556.777661077",
                    "got_any_response": "False"
                  },
                  "module": "nats.js.client",
                  "filename": "nats/js/client.py",
                  "function": "_fetch_n",
                  "context_line": "                raise asyncio.TimeoutError",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/nats/js/client.py",
                  "lineNo": 1289,
                  "context": [
                    [
                      1284,
                      "            # after the client has timed out, capturing the next published"
                    ],
                    [
                      1285,
                      "            # message and causing the subsequent fetch() to stall for the full"
                    ],
                    [
                      1286,
                      "            # timeout window."
                    ],
                    [
                      1287,
                      "            deadline = JetStreamContext._time_until(timeout, start_time)"
                    ],
                    [
                      1288,
                      "            if deadline is not None and deadline <= 0:"
                    ],
                    [
                      1289,
                      "                raise asyncio.TimeoutError"
                    ],
                    [
                      1290,
                      ""
                    ],
                    [
                      1291,
                      "            next_req = {}"
                    ],
                    [
                      1292,
                      "            next_req[\"batch\"] = needed"
                    ],
                    [
                      1293,
                      "            if deadline is not None:"
                    ],
                    [
                      1294,
                      "                remaining_expires = int(deadline * 1_000_000_000) - 100_000"
                    ]
                  ]
                }
              ]
            }
          }
        ],
        "hasSystemFrames": true
      }
    },
    {
      "type": "breadcrumbs",
      "data": {
        "values": [
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2623): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:28.497Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2624): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:30.499Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2625): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:32.501Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2626): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:34.502Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2627): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:36.504Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2628): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:38.506Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2629): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:40.508Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2630): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:42.511Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2631): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:44.514Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2632): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:46.517Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2633): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:48.518Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2634): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:50.520Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2635): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:52.521Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2636): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:54.525Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2637): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:56.527Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2638): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:15:58.530Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2639): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:00.533Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2640): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:02.534Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2641): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:04.537Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2642): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:06.538Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2643): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:08.541Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2644): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:10.544Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2645): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:12.547Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2646): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:14.549Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2647): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:16.550Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2648): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:18.553Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2649): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:20.556Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2650): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:22.559Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2651): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:24.562Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2652): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:26.565Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2653): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:28.568Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2654): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:30.571Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2655): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:32.573Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2656): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:34.575Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2657): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:36.577Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2658): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:38.578Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2659): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:40.581Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2660): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:42.583Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2661): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:44.585Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2662): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:46.588Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2663): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:48.590Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2664): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:50.592Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2665): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:52.595Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2666): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:54.598Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2667): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:56.601Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2668): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:58.603Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2669): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:00.605Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2670): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:02.607Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2671): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:04.610Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2672): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:06.613Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2673): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:08.615Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2674): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:10.617Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2675): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:12.619Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2676): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:14.621Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2677): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:16.623Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2678): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:18.626Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2679): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:20.628Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2680): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:22.631Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2681): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:24.634Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2682): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:26.636Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2683): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:28.638Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2684): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:30.639Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2685): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:32.642Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2686): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:34.645Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2687): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:36.648Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2688): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:38.651Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2689): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:40.654Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2690): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:42.655Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2691): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:44.658Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2692): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:46.661Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2693): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:48.664Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2694): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:50.667Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2695): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:52.670Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2696): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:54.672Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2697): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:56.675Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2698): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:58.678Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2699): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:00.680Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2700): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:02.682Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2701): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:04.684Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2702): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:06.686Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2703): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:08.688Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2704): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:10.690Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2705): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:12.692Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2706): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:14.695Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2707): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:16.698Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2708): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:18.700Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2709): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:20.703Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2710): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:22.706Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2711): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:24.708Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2712): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:26.710Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2713): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:28.712Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2714): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:30.714Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2715): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:32.716Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2716): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:34.717Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2717): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:36.720Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2718): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:38.725Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Application startup complete.",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-01T18:18:40.748Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-01T18:18:40.749Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.consumers.notification_commands_send_vk",
            "message": "Failed to fetch VK notification commands",
            "data": null,
            "level": "error",
            "timestamp": "2026-09-01T22:00:26.373Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.consumers.notification_commands_send_vk",
            "message": "Failed to fetch VK notification commands",
            "data": null,
            "level": "error",
            "timestamp": "2026-09-02T06:15:03.711Z",
            "event_id": null
          }
        ]
      }
    },
    {
      "type": "message",
      "data": {
        "params": [],
        "message": "Failed to fetch VK notification commands",
        "formatted": "Failed to fetch VK notification commands"
      }
    }
  ],
  "contexts": {
    "trace": {
      "type": "trace",
      "trace_id": "2623d8d73683410a8343e54901d1ef6b",
      "span_id": "9084d023d93f90e7"
    },
    "runtime": {
      "type": "runtime",
      "name": "CPython",
      "version": "3.14.6"
    }
  },
  "context": {
    "asctime": "2026-09-02 19:01:37,328",
    "sys.argv": [
      "/app/.venv/bin/uvicorn",
      "main:app",
      "--app-dir",
      "src",
      "--host",
      "0.0.0.0",
      "--port",
      "8000"
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
  "title": "TimeoutError",
  "userReport": null,
  "nextEventID": null,
  "previousEventID": "01a060c1baa772d1bc3d5f2c106571a6"
}
```