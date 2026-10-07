GlitchTip error event
Source: https://glitchtip.eqcms.ru
Instance: https://glitchtip.eqcms.ru
Organization: equestrian-site-cms
Issue ID: 23
Event ID: 01a10b444f8579309aebc9b12fbf6443
Event URL: https://glitchtip.eqcms.ru/equestrian-site-cms/issues/23

Raw event JSON:
```json
{
  "platform": "python",
  "errors": null,
  "id": "01a10b444f8579309aebc9b12fbf6443",
  "eventID": "ad8d610d3b5448229a48318acbbc5c0f",
  "projectID": 6,
  "groupID": "23",
  "dateCreated": "2026-10-05T08:53:08.391Z",
  "dateReceived": "2026-10-05T08:53:08.613Z",
  "dist": null,
  "culprit": "uvloop.loop in uvloop.loop.Loop.create_connection",
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
  "message": "ConnectionRefusedError: [Errno 111] Connection refused",
  "metadata": {
    "type": "ConnectionRefusedError",
    "value": "[Errno 111] Connection refused",
    "filename": "uvloop/loop.pyx",
    "function": "uvloop.loop.Loop.create_connection"
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
      "value": "eqcms-vk-service-deployment-b6d4bd98d-8xkgd"
    }
  ],
  "entries": [
    {
      "type": "exception",
      "data": {
        "values": [
          {
            "type": "ConnectionRefusedError",
            "value": "[Errno 111] Connection refused",
            "mechanism": {
              "meta": {
                "errno": {
                  "number": 111
                }
              },
              "type": "logging",
              "handled": true
            },
            "stacktrace": {
              "frames": [
                {
                  "vars": {
                    "e": "ConnectionRefusedError(111, 'Connection refused')",
                    "s": "Srv(uri=ParseResult(scheme='nats', netloc='eqsitecms-nats:4222', path='', params='', query='', fragment=''), reconnects=2, last_attempt=1175214.231346993, did_connect=False, discovered=False, tls_name=None, server_version='2.15.0')",
                    "now": "1175212.218840526",
                    "self": "<nats client v2.15.0>"
                  },
                  "module": "nats.aio.client",
                  "filename": "nats/aio/client.py",
                  "function": "_select_next_server",
                  "context_line": "                await self._connect_to_server(s)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/nats/aio/client.py",
                  "lineNo": 1501,
                  "context": [
                    [
                      1496,
                      "            self._server_pool.append(s)"
                    ],
                    [
                      1497,
                      "            if s.last_attempt is not None and now < s.last_attempt + self.options[\"reconnect_time_wait\"]:"
                    ],
                    [
                      1498,
                      "                # Backoff connecting to server if we attempted recently."
                    ],
                    [
                      1499,
                      "                await asyncio.sleep(self.options[\"reconnect_time_wait\"])"
                    ],
                    [
                      1500,
                      "            try:"
                    ],
                    [
                      1501,
                      "                await self._connect_to_server(s)"
                    ],
                    [
                      1502,
                      "                self._current_server = s"
                    ],
                    [
                      1503,
                      "                break"
                    ],
                    [
                      1504,
                      "            except Exception as e:"
                    ],
                    [
                      1505,
                      "                s.last_attempt = time.monotonic()"
                    ],
                    [
                      1506,
                      "                s.reconnects += 1"
                    ]
                  ]
                },
                {
                  "vars": {
                    "s": "Srv(uri=ParseResult(scheme='nats', netloc='eqsitecms-nats:4222', path='', params='', query='', fragment=''), reconnects=2, last_attempt=1175214.231346993, did_connect=False, discovered=False, tls_name=None, server_version='2.15.0')",
                    "self": "<nats client v2.15.0>"
                  },
                  "module": "nats.aio.client",
                  "filename": "nats/aio/client.py",
                  "function": "_connect_to_server",
                  "context_line": "            await self._transport.connect(",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/nats/aio/client.py",
                  "lineNo": 1470,
                  "context": [
                    [
                      1465,
                      "                ssl_context=self.ssl_context,"
                    ],
                    [
                      1466,
                      "                buffer_size=DEFAULT_BUFFER_SIZE,"
                    ],
                    [
                      1467,
                      "                connect_timeout=self.options[\"connect_timeout\"],"
                    ],
                    [
                      1468,
                      "            )"
                    ],
                    [
                      1469,
                      "        else:"
                    ],
                    [
                      1470,
                      "            await self._transport.connect("
                    ],
                    [
                      1471,
                      "                s.uri,"
                    ],
                    [
                      1472,
                      "                buffer_size=DEFAULT_BUFFER_SIZE,"
                    ],
                    [
                      1473,
                      "                connect_timeout=self.options[\"connect_timeout\"],"
                    ],
                    [
                      1474,
                      "            )"
                    ],
                    [
                      1475,
                      ""
                    ]
                  ]
                },
                {
                  "vars": {
                    "uri": [
                      "'nats'",
                      "'eqsitecms-nats:4222'",
                      "''",
                      "''",
                      "''",
                      "''"
                    ],
                    "self": "<nats.aio.transport.TcpTransport object at 0x7bb9b8b2b250>",
                    "buffer_size": "32768",
                    "connect_timeout": "5"
                  },
                  "module": "nats.aio.transport",
                  "filename": "nats/aio/transport.py",
                  "function": "connect",
                  "context_line": "        r, w = await asyncio.wait_for(",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/nats/aio/transport.py",
                  "lineNo": 117,
                  "context": [
                    [
                      112,
                      "        self._io_reader: Optional[asyncio.StreamReader] = None"
                    ],
                    [
                      113,
                      "        self._bare_io_writer: Optional[asyncio.StreamWriter] = None"
                    ],
                    [
                      114,
                      "        self._io_writer: Optional[asyncio.StreamWriter] = None"
                    ],
                    [
                      115,
                      ""
                    ],
                    [
                      116,
                      "    async def connect(self, uri: ParseResult, buffer_size: int, connect_timeout: int):"
                    ],
                    [
                      117,
                      "        r, w = await asyncio.wait_for("
                    ],
                    [
                      118,
                      "            asyncio.open_connection("
                    ],
                    [
                      119,
                      "                host=uri.hostname,"
                    ],
                    [
                      120,
                      "                port=uri.port,"
                    ],
                    [
                      121,
                      "                limit=buffer_size,"
                    ],
                    [
                      122,
                      "            ),"
                    ]
                  ]
                },
                {
                  "vars": {
                    "fut": "<coroutine object open_connection at 0x7bb9bcacddf0>",
                    "timeout": "5"
                  },
                  "module": "asyncio.tasks",
                  "filename": "asyncio/tasks.py",
                  "function": "wait_for",
                  "context_line": "        return await fut",
                  "absPath": "/usr/local/lib/python3.14/asyncio/tasks.py",
                  "lineNo": 488,
                  "context": [
                    [
                      483,
                      "            return fut.result()"
                    ],
                    [
                      484,
                      "        except exceptions.CancelledError as exc:"
                    ],
                    [
                      485,
                      "            raise TimeoutError from exc"
                    ],
                    [
                      486,
                      ""
                    ],
                    [
                      487,
                      "    async with timeouts.timeout(timeout):"
                    ],
                    [
                      488,
                      "        return await fut"
                    ],
                    [
                      489,
                      ""
                    ],
                    [
                      490,
                      "async def _wait(fs, timeout, return_when, loop):"
                    ],
                    [
                      491,
                      "    \"\"\"Internal helper for wait()."
                    ],
                    [
                      492,
                      ""
                    ],
                    [
                      493,
                      "    The fs argument must be a collection of Futures."
                    ]
                  ]
                },
                {
                  "vars": {
                    "host": "'eqsitecms-nats'",
                    "kwds": {},
                    "loop": "<uvloop.Loop running=True closed=False debug=False>",
                    "port": "4222",
                    "limit": "32768",
                    "reader": "<StreamReader limit=32768>",
                    "protocol": "<asyncio.streams.StreamReaderProtocol object at 0x7bb9bcacec40>"
                  },
                  "module": "asyncio.streams",
                  "filename": "asyncio/streams.py",
                  "function": "open_connection",
                  "context_line": "    transport, _ = await loop.create_connection(",
                  "absPath": "/usr/local/lib/python3.14/asyncio/streams.py",
                  "lineNo": 48,
                  "context": [
                    [
                      43,
                      "    really nothing special here except some convenience.)"
                    ],
                    [
                      44,
                      "    \"\"\""
                    ],
                    [
                      45,
                      "    loop = events.get_running_loop()"
                    ],
                    [
                      46,
                      "    reader = StreamReader(limit=limit, loop=loop)"
                    ],
                    [
                      47,
                      "    protocol = StreamReaderProtocol(reader, loop=loop)"
                    ],
                    [
                      48,
                      "    transport, _ = await loop.create_connection("
                    ],
                    [
                      49,
                      "        lambda: protocol, host, port, **kwds)"
                    ],
                    [
                      50,
                      "    writer = StreamWriter(transport, protocol, reader, loop)"
                    ],
                    [
                      51,
                      "    return reader, writer"
                    ],
                    [
                      52,
                      ""
                    ],
                    [
                      53,
                      ""
                    ]
                  ]
                },
                {
                  "vars": {},
                  "module": "uvloop.loop",
                  "filename": "uvloop/loop.pyx",
                  "function": "create_connection",
                  "context_line": "                    raise exceptions[0]",
                  "inApp": true,
                  "absPath": "/app/uvloop/loop.pyx",
                  "lineNo": 2043,
                  "context": [
                    [
                      2038,
                      ""
                    ],
                    [
                      2039,
                      "            else:"
                    ],
                    [
                      2040,
                      "                # If they all have the same str(), raise one."
                    ],
                    [
                      2041,
                      "                model = str(exceptions[0])"
                    ],
                    [
                      2042,
                      "                if all(str(exc) == model for exc in exceptions):"
                    ],
                    [
                      2043,
                      "                    raise exceptions[0]"
                    ],
                    [
                      2044,
                      "                # Raise a combined exception so the user can see all"
                    ],
                    [
                      2045,
                      "                # the various error messages."
                    ],
                    [
                      2046,
                      "                raise OSError('Multiple exceptions: {}'.format("
                    ],
                    [
                      2047,
                      "                    ', '.join(str(exc) for exc in exceptions)))"
                    ],
                    [
                      2048,
                      "        else:"
                    ]
                  ]
                },
                {
                  "vars": {},
                  "module": "uvloop.loop",
                  "filename": "uvloop/loop.pyx",
                  "function": "uvloop.loop.Loop.create_connection",
                  "context_line": "                    await waiter",
                  "inApp": true,
                  "absPath": "/app/uvloop/loop.pyx",
                  "lineNo": 2020,
                  "context": [
                    [
                      2015,
                      ""
                    ],
                    [
                      2016,
                      "                            rai_iter = rai_iter.ai_next"
                    ],
                    [
                      2017,
                      "                            continue"
                    ],
                    [
                      2018,
                      ""
                    ],
                    [
                      2019,
                      "                    tr.connect(rai_iter.ai_addr)"
                    ],
                    [
                      2020,
                      "                    await waiter"
                    ],
                    [
                      2021,
                      ""
                    ],
                    [
                      2022,
                      "                except OSError as exc:"
                    ],
                    [
                      2023,
                      "                    if tr is not None:"
                    ],
                    [
                      2024,
                      "                        tr._close()"
                    ],
                    [
                      2025,
                      "                        tr = None"
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
            "category": "uvicorn.error",
            "message": "Started server process [10]",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-21T18:27:54.483Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Waiting for application startup.",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-21T18:27:54.496Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 1): [Errno 113] No route to host",
            "data": null,
            "level": "warning",
            "timestamp": "2026-09-21T18:27:54.517Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Application startup complete.",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-21T18:27:56.542Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-21T18:27:56.545Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.298Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": ";",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.299Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.300Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_vks.id, user_vks.user_id, user_vks.vk_peer_id, user_vks.state, user_vks.vk_screen_name, user_vks.vk_display_name, user_vks.deleted_at, user_vks.created_at, user_vks.updated_at \nFROM user_vks \nWHERE user_vks.user_id IN ($2::UUID) AND user_vks.deleted_at IS NULL AND user_vks.state = $1::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.302Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.302Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_vks.id, user_vks.user_id, user_vks.vk_peer_id, user_vks.state, user_vks.vk_screen_name, user_vks.vk_display_name, user_vks.deleted_at, user_vks.created_at, user_vks.updated_at FROM user_vks WHERE user_vks.user_id IN ($2::UUID) AND user_vks.deleted_at IS NULL AND user_vks.state = $1::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.303Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.306Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.306Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at \nFROM vk_notification_deliveries \nWHERE vk_notification_deliveries.event_uuid = $1::UUID AND vk_notification_deliveries.user_id = $2::UUID",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.310Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at FROM vk_notification_deliveries WHERE vk_notification_deliveries.event_uuid = $1::UUID AND vk_notification_deliveries.user_id = $2::UUID",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.311Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO vk_notification_deliveries (event_uuid, user_id, vk_peer_id, status, attempts, last_error, updated_at) VALUES ($1::UUID, $2::UUID, $3::BIGINT, $4::VARCHAR, $5::INTEGER, $6::VARCHAR, $7::TIMESTAMP WITH TIME ZONE) ON CONFLICT ON CONSTRAINT uq_vk_notification_deliveries_event_user DO UPDATE SET vk_peer_id = $8::BIGINT, status = $9::VARCHAR, attempts = (vk_notification_deliveries.attempts + $10::INTEGER), last_error = $11::VARCHAR, updated_at = $12::TIMESTAMP WITH TIME ZONE RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.316Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO vk_notification_deliveries (event_uuid, user_id, vk_peer_id, status, attempts, last_error, updated_at) VALUES ($1::UUID, $2::UUID, $3::BIGINT, $4::VARCHAR, $5::INTEGER, $6::VARCHAR, $7::TIMESTAMP WITH TIME ZONE) ON CONFLICT ON CONSTRAINT uq_vk_notification_deliveries_event_user DO UPDATE SET vk_peer_id = $8::BIGINT, status = $9::VARCHAR, attempts = (vk_notification_deliveries.attempts + $10::INTEGER), last_error = $11::VARCHAR, updated_at = $12::TIMESTAMP WITH TIME ZONE RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.316Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.496Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "UPDATE vk_notification_deliveries SET status=$1::VARCHAR, last_error=$2::VARCHAR, updated_at=$3::TIMESTAMP WITH TIME ZONE, sent_at=$4::TIMESTAMP WITH TIME ZONE WHERE vk_notification_deliveries.event_uuid = $5::UUID AND vk_notification_deliveries.user_id = $6::UUID RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.499Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "UPDATE vk_notification_deliveries SET status=$1::VARCHAR, last_error=$2::VARCHAR, updated_at=$3::TIMESTAMP WITH TIME ZONE, sent_at=$4::TIMESTAMP WITH TIME ZONE WHERE vk_notification_deliveries.event_uuid = $5::UUID AND vk_notification_deliveries.user_id = $6::UUID RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.499Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.vk_notification_delivery",
            "message": "VK notification sent event=f2dd8a92-bc63-4f56-89fe-efba59c72c5d user=44d66d4d-f080-4448-bd1e-f873959ba51a peer=28964076",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.501Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-24T11:59:21.502Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.163Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": ";",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.174Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.180Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_vks.id, user_vks.user_id, user_vks.vk_peer_id, user_vks.state, user_vks.vk_screen_name, user_vks.vk_display_name, user_vks.deleted_at, user_vks.created_at, user_vks.updated_at \nFROM user_vks \nWHERE user_vks.user_id IN ($2::UUID) AND user_vks.deleted_at IS NULL AND user_vks.state = $1::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.190Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.192Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.201Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at \nFROM vk_notification_deliveries \nWHERE vk_notification_deliveries.event_uuid = $1::UUID AND vk_notification_deliveries.user_id = $2::UUID",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.203Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO vk_notification_deliveries (event_uuid, user_id, vk_peer_id, status, attempts, last_error, updated_at) VALUES ($1::UUID, $2::UUID, $3::BIGINT, $4::VARCHAR, $5::INTEGER, $6::VARCHAR, $7::TIMESTAMP WITH TIME ZONE) ON CONFLICT ON CONSTRAINT uq_vk_notification_deliveries_event_user DO UPDATE SET vk_peer_id = $8::BIGINT, status = $9::VARCHAR, attempts = (vk_notification_deliveries.attempts + $10::INTEGER), last_error = $11::VARCHAR, updated_at = $12::TIMESTAMP WITH TIME ZONE RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.212Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.677Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "UPDATE vk_notification_deliveries SET status=$1::VARCHAR, last_error=$2::VARCHAR, updated_at=$3::TIMESTAMP WITH TIME ZONE, sent_at=$4::TIMESTAMP WITH TIME ZONE WHERE vk_notification_deliveries.event_uuid = $5::UUID AND vk_notification_deliveries.user_id = $6::UUID RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.683Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.vk_notification_delivery",
            "message": "VK notification sent event=ca141ff9-826d-4fce-a2f3-9949d62f174b user=0345b843-74d7-4e05-b4d1-3309933b5a85 peer=20565096",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.687Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-27T10:16:32.690Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:03.853Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": ";",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:03.855Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:03.869Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_vks.id, user_vks.user_id, user_vks.vk_peer_id, user_vks.state, user_vks.vk_screen_name, user_vks.vk_display_name, user_vks.deleted_at, user_vks.created_at, user_vks.updated_at \nFROM user_vks \nWHERE user_vks.user_id IN ($2::UUID) AND user_vks.deleted_at IS NULL AND user_vks.state = $1::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:03.875Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:03.875Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:03.881Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at \nFROM vk_notification_deliveries \nWHERE vk_notification_deliveries.event_uuid = $1::UUID AND vk_notification_deliveries.user_id = $2::UUID",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:03.883Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO vk_notification_deliveries (event_uuid, user_id, vk_peer_id, status, attempts, last_error, updated_at) VALUES ($1::UUID, $2::UUID, $3::BIGINT, $4::VARCHAR, $5::INTEGER, $6::VARCHAR, $7::TIMESTAMP WITH TIME ZONE) ON CONFLICT ON CONSTRAINT uq_vk_notification_deliveries_event_user DO UPDATE SET vk_peer_id = $8::BIGINT, status = $9::VARCHAR, attempts = (vk_notification_deliveries.attempts + $10::INTEGER), last_error = $11::VARCHAR, updated_at = $12::TIMESTAMP WITH TIME ZONE RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:03.889Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:04.191Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "UPDATE vk_notification_deliveries SET status=$1::VARCHAR, last_error=$2::VARCHAR, updated_at=$3::TIMESTAMP WITH TIME ZONE, sent_at=$4::TIMESTAMP WITH TIME ZONE WHERE vk_notification_deliveries.event_uuid = $5::UUID AND vk_notification_deliveries.user_id = $6::UUID RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:04.193Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.vk_notification_delivery",
            "message": "VK notification sent event=3309ab7a-a6b2-48e9-b06a-51d5ad3c8db2 user=0345b843-74d7-4e05-b4d1-3309933b5a85 peer=20565096",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:04.195Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-09-28T06:11:04.196Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:31.664Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": ";",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:31.672Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:31.675Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_vks.id, user_vks.user_id, user_vks.vk_peer_id, user_vks.state, user_vks.vk_screen_name, user_vks.vk_display_name, user_vks.deleted_at, user_vks.created_at, user_vks.updated_at \nFROM user_vks \nWHERE user_vks.user_id IN ($2::UUID) AND user_vks.deleted_at IS NULL AND user_vks.state = $1::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:31.680Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:31.680Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:31.685Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at \nFROM vk_notification_deliveries \nWHERE vk_notification_deliveries.event_uuid = $1::UUID AND vk_notification_deliveries.user_id = $2::UUID",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:31.689Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO vk_notification_deliveries (event_uuid, user_id, vk_peer_id, status, attempts, last_error, updated_at) VALUES ($1::UUID, $2::UUID, $3::BIGINT, $4::VARCHAR, $5::INTEGER, $6::VARCHAR, $7::TIMESTAMP WITH TIME ZONE) ON CONFLICT ON CONSTRAINT uq_vk_notification_deliveries_event_user DO UPDATE SET vk_peer_id = $8::BIGINT, status = $9::VARCHAR, attempts = (vk_notification_deliveries.attempts + $10::INTEGER), last_error = $11::VARCHAR, updated_at = $12::TIMESTAMP WITH TIME ZONE RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:31.695Z",
            "event_id": null
          },
          {
            "type": "http",
            "category": "httplib",
            "message": null,
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:32.061Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "UPDATE vk_notification_deliveries SET status=$1::VARCHAR, last_error=$2::VARCHAR, updated_at=$3::TIMESTAMP WITH TIME ZONE, sent_at=$4::TIMESTAMP WITH TIME ZONE WHERE vk_notification_deliveries.event_uuid = $5::UUID AND vk_notification_deliveries.user_id = $6::UUID RETURNING vk_notification_deliveries.id, vk_notification_deliveries.event_uuid, vk_notification_deliveries.user_id, vk_notification_deliveries.vk_peer_id, vk_notification_deliveries.status, vk_notification_deliveries.attempts, vk_notification_deliveries.last_error, vk_notification_deliveries.created_at, vk_notification_deliveries.updated_at, vk_notification_deliveries.sent_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:32.064Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.vk_notification_delivery",
            "message": "VK notification sent event=7879b320-11fb-4572-9c95-765e0878e457 user=0345b843-74d7-4e05-b4d1-3309933b5a85 peer=20565096",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:32.066Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-01T11:08:32.067Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Shutting down",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-05T08:53:05.994Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Waiting for application shutdown.",
            "data": null,
            "level": "info",
            "timestamp": "2026-10-05T08:53:06.101Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 2): nats: unexpected EOF",
            "data": null,
            "level": "warning",
            "timestamp": "2026-10-05T08:53:06.299Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS disconnected for vk-service",
            "data": null,
            "level": "warning",
            "timestamp": "2026-10-05T08:53:06.304Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.lifecycle",
            "message": "NATS connection error for vk-service (attempt 3): [Errno 111] Connection refused",
            "data": null,
            "level": "warning",
            "timestamp": "2026-10-05T08:53:06.321Z",
            "event_id": null
          }
        ]
      }
    },
    {
      "type": "message",
      "data": {
        "params": [
          "vk-service",
          "4"
        ],
        "message": "NATS is unavailable for %s: %s consecutive failed attempts",
        "formatted": "NATS is unavailable for vk-service: 4 consecutive failed attempts"
      }
    }
  ],
  "contexts": {
    "trace": {
      "type": "trace",
      "trace_id": "a0b2beb2763444e289e7c9e26f59d884",
      "span_id": "983915fd12bbdb36"
    },
    "runtime": {
      "type": "runtime",
      "name": "CPython",
      "version": "3.14.6"
    }
  },
  "context": {
    "asctime": "2026-10-05 08:53:08,333",
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
    "ip_address": "62.113.103.0"
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
  "title": "ConnectionRefusedError: [Errno 111] Connection refused",
  "userReport": null,
  "nextEventID": null,
  "previousEventID": null
}
```