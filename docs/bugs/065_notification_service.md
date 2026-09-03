GlitchTip error event
Source: https://glitchtip.eqcms.ru
Instance: https://glitchtip.eqcms.ru
Organization: equestrian-site-cms
Issue ID: 12
Event ID: 01a0679b2f4874d6a81e8de34890bad3
Event URL: https://glitchtip.eqcms.ru/equestrian-site-cms/issues/12

Raw event JSON:
```json
{
  "platform": "python",
  "errors": null,
  "id": "01a0679b2f4874d6a81e8de34890bad3",
  "eventID": "3767c35b90a34d238ac6fca2ab80e8e4",
  "projectID": 2,
  "groupID": "12",
  "dateCreated": "2026-09-03T14:10:18.419Z",
  "dateReceived": "2026-09-03T14:10:18.568Z",
  "dist": null,
  "culprit": "clients.nats.consumers.callback_request in _consume",
  "packages": {
    "h11": "0.16.0",
    "idna": "3.18",
    "mako": "1.4.1",
    "ruff": "0.16.1",
    "yarl": "1.24.5",
    "anyio": "4.14.2",
    "attrs": "26.1.0",
    "click": "8.4.2",
    "pyyaml": "6.0.3",
    "uvloop": "0.22.1",
    "aiohttp": "3.14.3",
    "alembic": "1.19.0",
    "asyncpg": "0.31.0",
    "certifi": "2026.7.22",
    "fastapi": "0.141.1",
    "nats-py": "2.15.0",
    "urllib3": "2.7.0",
    "uvicorn": "0.52.1",
    "greenlet": "3.5.4",
    "pydantic": "2.13.4",
    "aiosignal": "1.4.0",
    "httptools": "0.8.0",
    "multidict": "6.7.1",
    "propcache": "0.5.2",
    "starlette": "1.4.1",
    "frozenlist": "1.8.0",
    "markupsafe": "3.0.3",
    "sentry-sdk": "2.66.1",
    "sqlalchemy": "2.0.51",
    "watchfiles": "1.2.0",
    "websockets": "17.0.1",
    "annotated-doc": "0.0.5",
    "pydantic_core": "2.46.4",
    "python-dotenv": "1.2.2",
    "annotated-types": "0.8.0",
    "aiohappyeyeballs": "2.7.1",
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
    "filename": "clients/nats/consumers/callback_request.py",
    "function": "_consume"
  },
  "tags": [
    {
      "key": "environment",
      "value": "production"
    },
    {
      "key": "server_name",
      "value": "eqcms-notification-service-deployment-6469cf758c-m55lb"
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
                    "self": "<clients.nats.consumers.callback_request.CallbackRequestConsumer object at 0x78daa9b1a660>",
                    "message": "Msg(_client=<nats client v2.15.0>, subject='events.site.callback.requested', reply='$JS.ACK.SITE_EVENTS.notification-service-callback-requested.1.1.1.1788428633415936388.0', data=b'{\"occurred_at\":\"2026-09-03T09:43:53.406466\",\"equestrian_id\":\"5f6496aa-4fe9-42da-a763-29f9bab22d73\",\"callback_request_id\":\"c0863f55-2cfa-490e-bc64-6c88480b78d4\",\"name\":\"\\xd0\\x90\\xd1\\x80\\xd1\\x82\\xd0\\xb5\\xd0\\xbc\",\"comment\":\"\\xd0\\xa5\\xd0\\xbe\\xd1\\x82\\xd0\\xb5\\xd0\\xbb \\xd0\\xb1\\xd1\\x8b \\xd0\\xb7\\xd0\\xb0\\xd0\\xb1\\xd1\\x80\\xd0\\xbe\\xd0\\xbd\\xd0\\xb8\\xd1\\x80\\xd0\\xbe\\xd0\\xb2\\xd0\\xb0\\xd1\\x82\\xd1\\x8c \\xd0\\xbf\\xd1\\x80\\xd0\\xbe\\xd0\\xb3\\xd1\\x83\\xd0\\xbb\\xd0\\xba\\xd1\\x83 \\xd0\\xb2 \\xd0\\xbf\\xd0\\xbe\\xd0\\xbb\\xd1\\x8f\\xd1\\x85 \\xd0\\x9f\\xd0\\xb0\\xd0\\xb2\\xd0\\xbb\\xd0\\xbe\\xd0\\xb2\\xd1\\x81\\xd0\\xba\\xd0\\xb0\",\"phone\":\"+79992005594\"}', headers={'Nats-Msg-Id': '8b41ffe6-90f9-449d-a12f-cbeb2dfc2166'}, _metadata=None, _ackd=True, _sid=2)",
                    "messages": []
                  },
                  "module": "clients.nats.consumers.callback_request",
                  "filename": "clients/nats/consumers/callback_request.py",
                  "function": "_consume",
                  "context_line": "                messages = await self._subscription.fetch(",
                  "inApp": true,
                  "absPath": "/app/src/clients/nats/consumers/callback_request.py",
                  "lineNo": 72,
                  "context": [
                    [
                      67,
                      "            logger.error(\"Consumer started without subscription\")"
                    ],
                    [
                      68,
                      "            return"
                    ],
                    [
                      69,
                      ""
                    ],
                    [
                      70,
                      "        while True:"
                    ],
                    [
                      71,
                      "            try:"
                    ],
                    [
                      72,
                      "                messages = await self._subscription.fetch("
                    ],
                    [
                      73,
                      "                    batch=self._settings.nats_consumer_fetch_batch_size,"
                    ],
                    [
                      74,
                      "                    timeout=self._settings.nats_consumer_fetch_timeout_seconds,"
                    ],
                    [
                      75,
                      "                )"
                    ],
                    [
                      76,
                      "            except TimeoutError:"
                    ],
                    [
                      77,
                      "                continue"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<nats.js.client.JetStreamContext.PullSubscription object at 0x78daa9b1bb60>",
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
                    "self": "<nats.js.client.JetStreamContext.PullSubscription object at 0x78daa9b1bb60>",
                    "batch": "10",
                    "queue": "<Queue at 0x78daa9a92780 maxsize=524288 tasks=5027>",
                    "needed": "10",
                    "expires": "4999900000",
                    "timeout": "5.0",
                    "heartbeat": "None",
                    "start_time": "163477.848655841",
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
            "message": "NATS connection error for notification-service (attempt 2647): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:27.916Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2648): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:29.919Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2649): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:31.921Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2650): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:33.924Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2651): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:35.926Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2652): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:37.928Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2653): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:39.931Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2654): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:41.933Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2655): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:43.936Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2656): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:45.938Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2657): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:47.941Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2658): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:49.944Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2659): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:51.947Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2660): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:53.950Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2661): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:55.952Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2662): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:57.956Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2663): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:16:59.959Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2664): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:01.962Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2665): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:03.964Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2666): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:05.967Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2667): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:07.970Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2668): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:09.973Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2669): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:11.976Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2670): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:13.978Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2671): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:15.980Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2672): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:17.982Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2673): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:19.985Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2674): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:21.988Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2675): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:23.990Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2676): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:25.992Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2677): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:27.995Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2678): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:29.997Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2679): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:31.999Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2680): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:34.002Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2681): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:36.004Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2682): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:38.007Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2683): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:40.010Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2684): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:42.012Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2685): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:44.015Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2686): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:46.018Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2687): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:48.019Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2688): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:50.022Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2689): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:52.026Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2690): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:54.029Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2691): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:56.031Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2692): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:17:58.033Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2693): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:00.036Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2694): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:02.039Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2695): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:04.042Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2696): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:06.045Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2697): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:08.047Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2698): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:10.050Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2699): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:12.053Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2700): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:14.056Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2701): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:16.059Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2702): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:18.060Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2703): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:20.062Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2704): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:22.065Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2705): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:24.068Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2706): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:26.069Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2707): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:28.071Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2708): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:30.074Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2709): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:32.076Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2710): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:34.078Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2711): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:36.081Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2712): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:38.084Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for notification-service (attempt 2713): [Errno -3] Temporary failure in name resolution",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:40.087Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.client",
            "message": "Stream SITE_EVENTS ещё не создан владельцем (попытка 1 из 10). Повтор через 2.0 секунд.",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:42.109Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.client",
            "message": "Stream SITE_EVENTS ещё не создан владельцем (попытка 2 из 10). Повтор через 4.0 секунд.",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:44.112Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.client",
            "message": "Stream SITE_EVENTS ещё не создан владельцем (попытка 3 из 10). Повтор через 6.0 секунд.",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:48.119Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.client",
            "message": "Stream SITE_EVENTS ещё не создан владельцем (попытка 4 из 10). Повтор через 8.0 секунд.",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:18:54.126Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.client",
            "message": "Stream SITE_EVENTS ещё не создан владельцем (попытка 5 из 10). Повтор через 10.0 секунд.",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-01T18:19:02.134Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Application startup complete.",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-01T18:19:12.150Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-01T18:19:12.151Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.consumers.callback_request",
            "message": "Failed to fetch NATS messages",
            "data": null,
            "level": "error",
            "timestamp": "2026-09-02T08:51:29.780Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.consumers.callback_request",
            "message": "Failed to fetch NATS messages",
            "data": null,
            "level": "error",
            "timestamp": "2026-09-02T13:15:11.527Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.consumers.callback_request",
            "message": "Failed to fetch NATS messages",
            "data": null,
            "level": "error",
            "timestamp": "2026-09-03T09:20:06.231Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.notification_orchestrator",
            "message": "Processing event: event_code=callback, correlation_id=c0863f55-2cfa-490e-bc64-6c88480b78d4",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.440Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.443Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": ";",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.450Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.453Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT notification_events.id, notification_events.created_at, notification_events.updated_at, notification_events.code, notification_events.name, notification_events.description, notification_events.metadata, notification_events.is_active \nFROM notification_events \nWHERE notification_events.code = $1::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.458Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.458Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT notification_events.id, notification_events.created_at, notification_events.updated_at, notification_events.code, notification_events.name, notification_events.description, notification_events.metadata, notification_events.is_active FROM notification_events WHERE notification_events.code = $1::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.458Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "connect",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.479Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT notification_channels.id, notification_channels.created_at, notification_channels.updated_at, notification_channels.code, notification_channels.name, notification_channels.description, notification_channels.is_active \nFROM notification_channels \nWHERE notification_channels.is_active = true ORDER BY notification_channels.code",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.515Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.515Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT notification_channels.id, notification_channels.created_at, notification_channels.updated_at, notification_channels.code, notification_channels.name, notification_channels.description, notification_channels.is_active FROM notification_channels WHERE notification_channels.is_active = true ORDER BY notification_channels.code",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.516Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "connect",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.521Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_notification_settings.id, user_notification_settings.created_at, user_notification_settings.updated_at, user_notification_settings.user_id, user_notification_settings.action_id, user_notification_settings.channel_id \nFROM user_notification_settings \nWHERE user_notification_settings.action_id = $1::UUID",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.588Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.588Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_notification_settings.id, user_notification_settings.created_at, user_notification_settings.updated_at, user_notification_settings.user_id, user_notification_settings.action_id, user_notification_settings.channel_id FROM user_notification_settings WHERE user_notification_settings.action_id = $1::UUID",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.589Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.notification_orchestrator",
            "message": "Processing channel: channel_code=email, event_code=callback",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.592Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.757Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.857Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.notification_orchestrator",
            "message": "Notification command published: event_id=1ec4553b-94cb-561b-b4b6-44b2c76a7fc5, channel_code=email, correlation_id=c0863f55-2cfa-490e-bc64-6c88480b78d4",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.863Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.notification_orchestrator",
            "message": "Processing channel: channel_code=sms, event_code=callback",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.864Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.handlers.callback_handler",
            "message": "Unsupported channel for callback: sms",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-03T09:43:53.865Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.notification_orchestrator",
            "message": "Handler returned no notification: channel_code=sms, correlation_id=c0863f55-2cfa-490e-bc64-6c88480b78d4",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-03T09:43:53.865Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.notification_orchestrator",
            "message": "Processing channel: channel_code=vk, event_code=callback",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:53.865Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:54.024Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.notification_orchestrator",
            "message": "Notification command published: event_id=4063c472-8676-516c-9119-65eae6eaf338, channel_code=vk, correlation_id=c0863f55-2cfa-490e-bc64-6c88480b78d4",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:54.066Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-03T09:43:54.213Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.consumers.callback_request",
            "message": "Failed to fetch NATS messages",
            "data": null,
            "level": "error",
            "timestamp": "2026-09-03T11:38:25.379Z",
            "event_id": null
          }
        ]
      }
    },
    {
      "type": "message",
      "data": {
        "params": [],
        "message": "Failed to fetch NATS messages",
        "formatted": "Failed to fetch NATS messages"
      }
    }
  ],
  "contexts": {
    "trace": {
      "type": "trace",
      "trace_id": "95e8fcb6f08e4f2e8dfda2e670b57ae6",
      "span_id": "ad22bf5ebb57b323"
    },
    "runtime": {
      "type": "runtime",
      "name": "CPython",
      "version": "3.14.6"
    }
  },
  "context": {
    "asctime": "2026-09-03 14:10:18,406",
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
      "dedupe",
      "excepthook",
      "fastapi",
      "logging",
      "modules",
      "sqlalchemy",
      "starlette",
      "stdlib",
      "threading"
    ]
  },
  "title": "TimeoutError",
  "userReport": null,
  "nextEventID": null,
  "previousEventID": "01a06710212c797793a7959583c56d4c"
}
```