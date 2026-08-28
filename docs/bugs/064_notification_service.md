GlitchTip error event
Source: https://glitchtip.eqcms.ru
Instance: https://glitchtip.eqcms.ru
Organization: equestrian-site-cms
Issue ID: 8
Event ID: 01a03d134c55714c967e892db834caf0
Event URL: https://glitchtip.eqcms.ru/equestrian-site-cms/issues/8?project=2

Raw event JSON:
```json
{
  "platform": "python",
  "errors": null,
  "id": "01a03d134c55714c967e892db834caf0",
  "eventID": "c9f89a2eae2b4da49c6cebc77c1f7fb2",
  "projectID": 2,
  "groupID": "8",
  "dateCreated": "2026-08-26T07:57:49.505Z",
  "dateReceived": "2026-08-26T07:57:50.037Z",
  "dist": null,
  "culprit": "clients.nats.client in _setup_callback_requested_consumer",
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
  "message": "NotFoundError: nats: NotFoundError: code=404 err_code=10059 description='stream not found'",
  "metadata": {
    "type": "NotFoundError",
    "value": "nats: NotFoundError: code=404 err_code=10059 description='stream not found'",
    "filename": "clients/nats/client.py",
    "function": "_setup_callback_requested_consumer"
  },
  "tags": [
    {
      "key": "environment",
      "value": "production"
    },
    {
      "key": "server_name",
      "value": "eqcms-notification-service-deployment-86988c9687-g4lpc"
    }
  ],
  "entries": [
    {
      "type": "exception",
      "data": {
        "values": [
          {
            "type": "NotFoundError",
            "value": "nats: NotFoundError: code=404 err_code=10059 description='stream not found'",
            "module": "nats.js.errors",
            "mechanism": {
              "type": "starlette",
              "handled": false
            },
            "stacktrace": {
              "frames": [
                {
                  "vars": {
                    "self": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                    "send": "<bound method LifespanOn.send of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "scope": {
                      "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                      "asgi": {
                        "version": "'3.0'",
                        "spec_version": "'2.0'"
                      },
                      "type": "'lifespan'",
                      "state": {},
                      "router": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                      "fastapi_middleware_astack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>"
                    },
                    "receive": "<bound method LifespanOn.receive of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>"
                  },
                  "module": "starlette.applications",
                  "filename": "starlette/applications.py",
                  "function": "__call__",
                  "context_line": "        await self.middleware_stack(scope, receive, send)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/starlette/applications.py",
                  "lineNo": 90,
                  "context": [
                    [
                      85,
                      ""
                    ],
                    [
                      86,
                      "    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:"
                    ],
                    [
                      87,
                      "        scope[\"app\"] = self"
                    ],
                    [
                      88,
                      "        if self.middleware_stack is None:"
                    ],
                    [
                      89,
                      "            self.middleware_stack = self.build_middleware_stack()"
                    ],
                    [
                      90,
                      "        await self.middleware_stack(scope, receive, send)"
                    ],
                    [
                      91,
                      ""
                    ],
                    [
                      92,
                      "    def mount(self, path: str, app: ASGIApp, name: str | None = None) -> None:"
                    ],
                    [
                      93,
                      "        self.router.mount(path, app=app, name=name)  # pragma: no cover"
                    ],
                    [
                      94,
                      ""
                    ],
                    [
                      95,
                      "    def host(self, host: str, app: ASGIApp, name: str | None = None) -> None:"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<starlette.middleware.errors.ServerErrorMiddleware object at 0x7e74ad4a27b0>",
                    "send": "<bound method LifespanOn.send of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "scope": {
                      "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                      "asgi": {
                        "version": "'3.0'",
                        "spec_version": "'2.0'"
                      },
                      "type": "'lifespan'",
                      "state": {},
                      "router": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                      "fastapi_middleware_astack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>"
                    },
                    "receive": "<bound method LifespanOn.receive of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>"
                  },
                  "module": "starlette.middleware.errors",
                  "filename": "starlette/middleware/errors.py",
                  "function": "__call__",
                  "context_line": "            await self.app(scope, receive, send)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/starlette/middleware/errors.py",
                  "lineNo": 151,
                  "context": [
                    [
                      146,
                      "        self.handler = handler"
                    ],
                    [
                      147,
                      "        self.debug = debug"
                    ],
                    [
                      148,
                      ""
                    ],
                    [
                      149,
                      "    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:"
                    ],
                    [
                      150,
                      "        if scope[\"type\"] != \"http\":"
                    ],
                    [
                      151,
                      "            await self.app(scope, receive, send)"
                    ],
                    [
                      152,
                      "            return"
                    ],
                    [
                      153,
                      ""
                    ],
                    [
                      154,
                      "        response_started = False"
                    ],
                    [
                      155,
                      ""
                    ],
                    [
                      156,
                      "        async def _send(message: Message) -> None:"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<prometheus_fastapi_instrumentator.middleware.PrometheusInstrumentatorMiddleware object at 0x7e74ad4a2120>",
                    "send": "<bound method LifespanOn.send of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "scope": {
                      "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                      "asgi": {
                        "version": "'3.0'",
                        "spec_version": "'2.0'"
                      },
                      "type": "'lifespan'",
                      "state": {},
                      "router": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                      "fastapi_middleware_astack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>"
                    },
                    "receive": "<bound method LifespanOn.receive of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>"
                  },
                  "module": "prometheus_fastapi_instrumentator.middleware",
                  "filename": "prometheus_fastapi_instrumentator/middleware.py",
                  "function": "__call__",
                  "context_line": "            return await self.app(scope, receive, send)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/prometheus_fastapi_instrumentator/middleware.py",
                  "lineNo": 130,
                  "context": [
                    [
                      125,
                      "                multiprocess_mode=\"livesum\","
                    ],
                    [
                      126,
                      "            )"
                    ],
                    [
                      127,
                      ""
                    ],
                    [
                      128,
                      "    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:"
                    ],
                    [
                      129,
                      "        if scope[\"type\"] != \"http\":"
                    ],
                    [
                      130,
                      "            return await self.app(scope, receive, send)"
                    ],
                    [
                      131,
                      ""
                    ],
                    [
                      132,
                      "        request = Request(scope)"
                    ],
                    [
                      133,
                      "        start_time = default_timer()"
                    ],
                    [
                      134,
                      ""
                    ],
                    [
                      135,
                      "        handler, is_templated = self._get_handler(request)"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<starlette.middleware.exceptions.ExceptionMiddleware object at 0x7e74ad4a1fd0>",
                    "send": "<bound method LifespanOn.send of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "scope": {
                      "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                      "asgi": {
                        "version": "'3.0'",
                        "spec_version": "'2.0'"
                      },
                      "type": "'lifespan'",
                      "state": {},
                      "router": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                      "fastapi_middleware_astack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>"
                    },
                    "receive": "<bound method LifespanOn.receive of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>"
                  },
                  "module": "starlette.middleware.exceptions",
                  "filename": "starlette/middleware/exceptions.py",
                  "function": "__call__",
                  "context_line": "            await self.app(scope, receive, send)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/starlette/middleware/exceptions.py",
                  "lineNo": 49,
                  "context": [
                    [
                      44,
                      "            assert issubclass(exc_class_or_status_code, Exception)"
                    ],
                    [
                      45,
                      "            self._exception_handlers[exc_class_or_status_code] = handler"
                    ],
                    [
                      46,
                      ""
                    ],
                    [
                      47,
                      "    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:"
                    ],
                    [
                      48,
                      "        if scope[\"type\"] not in (\"http\", \"websocket\"):"
                    ],
                    [
                      49,
                      "            await self.app(scope, receive, send)"
                    ],
                    [
                      50,
                      "            return"
                    ],
                    [
                      51,
                      ""
                    ],
                    [
                      52,
                      "        scope[\"starlette.exception_handlers\"] = ("
                    ],
                    [
                      53,
                      "            self._exception_handlers,"
                    ],
                    [
                      54,
                      "            self._status_handlers,"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<fastapi.middleware.asyncexitstack.AsyncExitStackMiddleware object at 0x7e74ad4a1e80>",
                    "send": "<bound method LifespanOn.send of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "scope": {
                      "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                      "asgi": {
                        "version": "'3.0'",
                        "spec_version": "'2.0'"
                      },
                      "type": "'lifespan'",
                      "state": {},
                      "router": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                      "fastapi_middleware_astack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>"
                    },
                    "stack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>",
                    "receive": "<bound method LifespanOn.receive of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>"
                  },
                  "module": "fastapi.middleware.asyncexitstack",
                  "filename": "fastapi/middleware/asyncexitstack.py",
                  "function": "__call__",
                  "context_line": "            await self.app(scope, receive, send)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/fastapi/middleware/asyncexitstack.py",
                  "lineNo": 18,
                  "context": [
                    [
                      13,
                      "        self.context_name = context_name"
                    ],
                    [
                      14,
                      ""
                    ],
                    [
                      15,
                      "    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:"
                    ],
                    [
                      16,
                      "        async with AsyncExitStack() as stack:"
                    ],
                    [
                      17,
                      "            scope[self.context_name] = stack"
                    ],
                    [
                      18,
                      "            await self.app(scope, receive, send)"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                    "send": "<bound method LifespanOn.send of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "scope": {
                      "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                      "asgi": {
                        "version": "'3.0'",
                        "spec_version": "'2.0'"
                      },
                      "type": "'lifespan'",
                      "state": {},
                      "router": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                      "fastapi_middleware_astack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>"
                    },
                    "receive": "<bound method LifespanOn.receive of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>"
                  },
                  "module": "starlette.routing",
                  "filename": "starlette/routing.py",
                  "function": "__call__",
                  "context_line": "        await self.middleware_stack(scope, receive, send)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/starlette/routing.py",
                  "lineNo": 660,
                  "context": [
                    [
                      655,
                      ""
                    ],
                    [
                      656,
                      "    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:"
                    ],
                    [
                      657,
                      "        \"\"\""
                    ],
                    [
                      658,
                      "        The main entry point to the Router class."
                    ],
                    [
                      659,
                      "        \"\"\""
                    ],
                    [
                      660,
                      "        await self.middleware_stack(scope, receive, send)"
                    ],
                    [
                      661,
                      ""
                    ],
                    [
                      662,
                      "    async def app(self, scope: Scope, receive: Receive, send: Send) -> None:"
                    ],
                    [
                      663,
                      "        assert scope[\"type\"] in (\"http\", \"websocket\", \"lifespan\")"
                    ],
                    [
                      664,
                      ""
                    ],
                    [
                      665,
                      "        if \"router\" not in scope:"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                    "send": "<bound method LifespanOn.send of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "scope": {
                      "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                      "asgi": {
                        "version": "'3.0'",
                        "spec_version": "'2.0'"
                      },
                      "type": "'lifespan'",
                      "state": {},
                      "router": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                      "fastapi_middleware_astack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>"
                    },
                    "receive": "<bound method LifespanOn.receive of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>"
                  },
                  "module": "fastapi.routing",
                  "filename": "fastapi/routing.py",
                  "function": "app",
                  "context_line": "            await self.lifespan(scope, receive, send)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/fastapi/routing.py",
                  "lineNo": 2726,
                  "context": [
                    [
                      2721,
                      ""
                    ],
                    [
                      2722,
                      "        if \"router\" not in scope:"
                    ],
                    [
                      2723,
                      "            scope[\"router\"] = self"
                    ],
                    [
                      2724,
                      ""
                    ],
                    [
                      2725,
                      "        if scope[\"type\"] == \"lifespan\":"
                    ],
                    [
                      2726,
                      "            await self.lifespan(scope, receive, send)"
                    ],
                    [
                      2727,
                      "            return"
                    ],
                    [
                      2728,
                      ""
                    ],
                    [
                      2729,
                      "        partial: tuple[BaseRoute, Scope] | None = None"
                    ],
                    [
                      2730,
                      "        for route in self.routes:"
                    ],
                    [
                      2731,
                      "            match, child_scope = route.matches(scope)"
                    ]
                  ]
                },
                {
                  "vars": {
                    "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                    "self": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                    "send": "<bound method LifespanOn.send of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "scope": {
                      "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                      "asgi": {
                        "version": "'3.0'",
                        "spec_version": "'2.0'"
                      },
                      "type": "'lifespan'",
                      "state": {},
                      "router": "<fastapi.routing.APIRouter object at 0x7e74ad69ad50>",
                      "fastapi_middleware_astack": "<contextlib.AsyncExitStack object at 0x7e74ad4a2900>"
                    },
                    "receive": "<bound method LifespanOn.receive of <uvicorn.lifespan.on.LifespanOn object at 0x7e74ad4a16a0>>",
                    "started": "False",
                    "exc_text": "'Traceback (most recent call last):\\n  File \"/app/.venv/lib/python3.14/site-packages/starlette/routing.py\", line 638, in lifespan\\n    async with self.lifespan_context(app) as maybe_state:\\n               ~~~~~~~~~~~~~~~~~~~~~^^^^^\\n  File \"/usr/local/lib/python3.14/contextlib.py\", line 214, in __aenter__\\n    return await anext(self.gen)\\n           ^^^^^^^^^^^^^^^^^^^^^\\n  File \"/app/.venv/lib/python3.14/site-packages/fastapi/routing.py\", line 240, in merged_lifespan\\n    async with original_context(app) as maybe_original_state:\\n               ~~~~~~~~~~~~~~~~^^^^^\\n  File \"/usr/local/lib/python3.14/contextlib.py\", line 214, in __aenter__\\n    return await anext(self.gen)\\n           ^^^^^^^^^^^^^^^^^^^^^\\n  File \"/app/src/main.py\", line 35, in lifespan\\n    await nats_client.setup()\\n  File \"/app/src/clients/nats/client.py\", line 65, in setup\\n    await self.setup_consumers()\\n  File \"/app/src/clients/nats/client.py\", line 71, in setup_consumers\\n    await self._setup_callback_requested_consumer()\\n  File \"/app/src/clients/nats/client.py\", line 88, in _setup_callback_requested_consumer\\n    await jetstream.add_consumer(\\n    ...<9 lines>...\\n    )\\n  File \"/app/.venv/lib/python3.14/site-packages/nats/js/manager.py\", line 242, in add_consumer\\n    resp = await self._api_request(subject, req_data, timeout=timeout)\\n           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\\n  File \"/app/.venv/lib/python3.14/site-packages/nats/js/manager.py\", line 471, in _api_request\\n    raise APIError.from_error(resp[\"error\"])\\n          ~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^\\n  File \"/app/.venv/lib/python3.14/site-packages/nats/js/errors.py\", line 87, in from_error\\n    raise NotFoundError(**err)\\nnats.js.errors.NotFoundError: nats: NotFoundError: code=404 err_code=10059 description=\\'stream not found\\'\\n'"
                  },
                  "module": "starlette.routing",
                  "filename": "starlette/routing.py",
                  "function": "lifespan",
                  "context_line": "            async with self.lifespan_context(app) as maybe_state:",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/starlette/routing.py",
                  "lineNo": 638,
                  "context": [
                    [
                      633,
                      "        \"\"\""
                    ],
                    [
                      634,
                      "        started = False"
                    ],
                    [
                      635,
                      "        app: Any = scope.get(\"app\")"
                    ],
                    [
                      636,
                      "        await receive()"
                    ],
                    [
                      637,
                      "        try:"
                    ],
                    [
                      638,
                      "            async with self.lifespan_context(app) as maybe_state:"
                    ],
                    [
                      639,
                      "                if maybe_state is not None:"
                    ],
                    [
                      640,
                      "                    if \"state\" not in scope:"
                    ],
                    [
                      641,
                      "                        raise RuntimeError('The server does not support \"state\" in the lifespan scope.')"
                    ],
                    [
                      642,
                      "                    scope[\"state\"].update(maybe_state)"
                    ],
                    [
                      643,
                      "                await send({\"type\": \"lifespan.startup.complete\"})"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<contextlib._AsyncGeneratorContextManager object at 0x7e74ad4a2a50>"
                  },
                  "module": "contextlib",
                  "filename": "contextlib.py",
                  "function": "__aenter__",
                  "context_line": "            return await anext(self.gen)",
                  "absPath": "/usr/local/lib/python3.14/contextlib.py",
                  "lineNo": 214,
                  "context": [
                    [
                      209,
                      "    async def __aenter__(self):"
                    ],
                    [
                      210,
                      "        # do not keep args and kwds alive unnecessarily"
                    ],
                    [
                      211,
                      "        # they are only needed for recreation, which is not possible anymore"
                    ],
                    [
                      212,
                      "        del self.args, self.kwds, self.func"
                    ],
                    [
                      213,
                      "        try:"
                    ],
                    [
                      214,
                      "            return await anext(self.gen)"
                    ],
                    [
                      215,
                      "        except StopAsyncIteration:"
                    ],
                    [
                      216,
                      "            raise RuntimeError(\"generator didn't yield\") from None"
                    ],
                    [
                      217,
                      ""
                    ],
                    [
                      218,
                      "    async def __aexit__(self, typ, value, traceback):"
                    ],
                    [
                      219,
                      "        if typ is None:"
                    ]
                  ]
                },
                {
                  "vars": {
                    "app": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                    "nested_context": "<fastapi.routing._DefaultLifespan object at 0x7e74aea716a0>",
                    "original_context": "<function lifespan at 0x7e74ad61b110>"
                  },
                  "module": "fastapi.routing",
                  "filename": "fastapi/routing.py",
                  "function": "merged_lifespan",
                  "context_line": "        async with original_context(app) as maybe_original_state:",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/fastapi/routing.py",
                  "lineNo": 240,
                  "context": [
                    [
                      235,
                      ") -> Lifespan[Any]:"
                    ],
                    [
                      236,
                      "    @asynccontextmanager"
                    ],
                    [
                      237,
                      "    async def merged_lifespan("
                    ],
                    [
                      238,
                      "        app: AppType,"
                    ],
                    [
                      239,
                      "    ) -> AsyncIterator[Mapping[str, Any] | None]:"
                    ],
                    [
                      240,
                      "        async with original_context(app) as maybe_original_state:"
                    ],
                    [
                      241,
                      "            async with nested_context(app) as maybe_nested_state:"
                    ],
                    [
                      242,
                      "                if maybe_nested_state is None and maybe_original_state is None:"
                    ],
                    [
                      243,
                      "                    yield None  # old ASGI compatibility"
                    ],
                    [
                      244,
                      "                else:"
                    ],
                    [
                      245,
                      "                    yield {**(maybe_nested_state or {}), **(maybe_original_state or {})}"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<contextlib._AsyncGeneratorContextManager object at 0x7e74ad48d950>"
                  },
                  "module": "contextlib",
                  "filename": "contextlib.py",
                  "function": "__aenter__",
                  "context_line": "            return await anext(self.gen)",
                  "absPath": "/usr/local/lib/python3.14/contextlib.py",
                  "lineNo": 214,
                  "context": [
                    [
                      209,
                      "    async def __aenter__(self):"
                    ],
                    [
                      210,
                      "        # do not keep args and kwds alive unnecessarily"
                    ],
                    [
                      211,
                      "        # they are only needed for recreation, which is not possible anymore"
                    ],
                    [
                      212,
                      "        del self.args, self.kwds, self.func"
                    ],
                    [
                      213,
                      "        try:"
                    ],
                    [
                      214,
                      "            return await anext(self.gen)"
                    ],
                    [
                      215,
                      "        except StopAsyncIteration:"
                    ],
                    [
                      216,
                      "            raise RuntimeError(\"generator didn't yield\") from None"
                    ],
                    [
                      217,
                      ""
                    ],
                    [
                      218,
                      "    async def __aexit__(self, typ, value, traceback):"
                    ],
                    [
                      219,
                      "        if typ is None:"
                    ]
                  ]
                },
                {
                  "vars": {
                    "_": "<fastapi.applications.FastAPI object at 0x7e74ad68eba0>",
                    "nats_client": "<clients.nats.client.NatsJetstreamClient object at 0x7e74ad4e81a0>",
                    "callback_request_consumer": "<clients.nats.consumers.callback_request.CallbackRequestConsumer object at 0x7e74ad4ea270>"
                  },
                  "module": "main",
                  "filename": "main.py",
                  "function": "lifespan",
                  "context_line": "    await nats_client.setup()",
                  "inApp": true,
                  "absPath": "/app/src/main.py",
                  "lineNo": 35,
                  "context": [
                    [
                      30,
                      "    await init_registry()"
                    ],
                    [
                      31,
                      "    wire_event_handlers(container)"
                    ],
                    [
                      32,
                      "    nats_client = container.nats_client()"
                    ],
                    [
                      33,
                      "    callback_request_consumer = container.callback_request_consumer()"
                    ],
                    [
                      34,
                      "    await nats_client.connect()"
                    ],
                    [
                      35,
                      "    await nats_client.setup()"
                    ],
                    [
                      36,
                      "    await callback_request_consumer.start()"
                    ],
                    [
                      37,
                      "    metrics_runtime = start_metrics_runtime(environment=settings.environment)"
                    ],
                    [
                      38,
                      "    try:"
                    ],
                    [
                      39,
                      "        yield"
                    ],
                    [
                      40,
                      "    finally:"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<clients.nats.client.NatsJetstreamClient object at 0x7e74ad4e81a0>"
                  },
                  "module": "clients.nats.client",
                  "filename": "clients/nats/client.py",
                  "function": "setup",
                  "context_line": "        await self.setup_consumers()",
                  "inApp": true,
                  "absPath": "/app/src/clients/nats/client.py",
                  "lineNo": 65,
                  "context": [
                    [
                      60,
                      "        \"\"\""
                    ],
                    [
                      61,
                      "        if not self.is_connected:"
                    ],
                    [
                      62,
                      "            raise RuntimeError(\"NATS client must be connected before setup\")"
                    ],
                    [
                      63,
                      ""
                    ],
                    [
                      64,
                      "        await self.setup_streams()"
                    ],
                    [
                      65,
                      "        await self.setup_consumers()"
                    ],
                    [
                      66,
                      ""
                    ],
                    [
                      67,
                      "    async def setup_streams(self) -> None:"
                    ],
                    [
                      68,
                      "        await self._setup_notification_commands_stream()"
                    ],
                    [
                      69,
                      ""
                    ],
                    [
                      70,
                      "    async def setup_consumers(self) -> None:"
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<clients.nats.client.NatsJetstreamClient object at 0x7e74ad4e81a0>"
                  },
                  "module": "clients.nats.client",
                  "filename": "clients/nats/client.py",
                  "function": "setup_consumers",
                  "context_line": "        await self._setup_callback_requested_consumer()",
                  "inApp": true,
                  "absPath": "/app/src/clients/nats/client.py",
                  "lineNo": 71,
                  "context": [
                    [
                      66,
                      ""
                    ],
                    [
                      67,
                      "    async def setup_streams(self) -> None:"
                    ],
                    [
                      68,
                      "        await self._setup_notification_commands_stream()"
                    ],
                    [
                      69,
                      ""
                    ],
                    [
                      70,
                      "    async def setup_consumers(self) -> None:"
                    ],
                    [
                      71,
                      "        await self._setup_callback_requested_consumer()"
                    ],
                    [
                      72,
                      ""
                    ],
                    [
                      73,
                      "    async def _setup_notification_commands_stream(self) -> None:"
                    ],
                    [
                      74,
                      "        jetstream = self._get_jetstream()"
                    ],
                    [
                      75,
                      ""
                    ],
                    [
                      76,
                      "        config = StreamConfig("
                    ]
                  ]
                },
                {
                  "vars": {
                    "self": "<clients.nats.client.NatsJetstreamClient object at 0x7e74ad4e81a0>",
                    "jetstream": "<nats.js.client.JetStreamContext object at 0x7e74ad4eaa50>"
                  },
                  "module": "clients.nats.client",
                  "filename": "clients/nats/client.py",
                  "function": "_setup_callback_requested_consumer",
                  "context_line": "        await jetstream.add_consumer(",
                  "inApp": true,
                  "absPath": "/app/src/clients/nats/client.py",
                  "lineNo": 88,
                  "context": [
                    [
                      83,
                      "        await jetstream.add_stream(config=config)"
                    ],
                    [
                      84,
                      ""
                    ],
                    [
                      85,
                      "    async def _setup_callback_requested_consumer(self) -> None:"
                    ],
                    [
                      86,
                      "        jetstream = self._get_jetstream()"
                    ],
                    [
                      87,
                      ""
                    ],
                    [
                      88,
                      "        await jetstream.add_consumer("
                    ],
                    [
                      89,
                      "            stream=self._settings.nats_stream_site_events,"
                    ],
                    [
                      90,
                      "            config=ConsumerConfig("
                    ],
                    [
                      91,
                      "                durable_name=(self._settings.nats_consumer_callback_requested),"
                    ],
                    [
                      92,
                      "                filter_subject=(self._settings.nats_subject_callback_requested),"
                    ],
                    [
                      93,
                      "                deliver_policy=DeliverPolicy.ALL,"
                    ]
                  ]
                },
                {
                  "vars": {
                    "req": {
                      "config": {
                        "ack_wait": "30000000000",
                        "ack_policy": "<AckPolicy.EXPLICIT: 'explicit'>",
                        "max_deliver": "5",
                        "durable_name": "'notification-service-callback-requested'",
                        "replay_policy": "<ReplayPolicy.INSTANT: 'instant'>",
                        "deliver_policy": "<DeliverPolicy.ALL: 'all'>",
                        "filter_subject": "'events.site.callback.requested'",
                        "idle_heartbeat": "0",
                        "inactive_threshold": "0"
                      },
                      "stream_name": "'SITE_EVENTS'"
                    },
                    "resp": "None",
                    "self": "<nats.js.client.JetStreamContext object at 0x7e74ad4eaa50>",
                    "config": "ConsumerConfig(name=None, durable_name='notification-service-callback-requested', description=None, deliver_policy=<DeliverPolicy.ALL: 'all'>, opt_start_seq=None, opt_start_time=None, ack_policy=<AckPolicy.EXPLICIT: 'explicit'>, ack_wait=30, max_deliver=5, backoff=None, filter_subject='events.site.callback.requested', filter_subjects=None, replay_policy=<ReplayPolicy.INSTANT: 'instant'>, rate_limit_bps=None, sample_freq=None, max_waiting=None, max_ack_pending=None, flow_control=None, idle_heartbeat=None, headers_only=None, deliver_subject=None, deliver_group=None, inactive_threshold=None, num_replicas=None, mem_storage=None, metadata=None, pause_until=None)",
                    "params": {},
                    "stream": "'SITE_EVENTS'",
                    "subject": "'$JS.API.CONSUMER.DURABLE.CREATE.SITE_EVENTS.notification-service-callback-requested'",
                    "timeout": "5",
                    "req_data": "b'{\"stream_name\": \"SITE_EVENTS\", \"config\": {\"durable_name\": \"notification-service-callback-requested\", \"deliver_policy\": \"all\", \"ack_policy\": \"explicit\", \"ack_wait\": 30000000000, \"max_deliver\": 5, \"filter_subject\": \"events.site.callback.requested\", \"replay_policy\": \"instant\", \"idle_heartbeat\": 0, \"inactive_threshold\": 0}}'",
                    "durable_name": "'notification-service-callback-requested'"
                  },
                  "module": "nats.js.manager",
                  "filename": "nats/js/manager.py",
                  "function": "add_consumer",
                  "context_line": "        resp = await self._api_request(subject, req_data, timeout=timeout)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/nats/js/manager.py",
                  "lineNo": 242,
                  "context": [
                    [
                      237,
                      "            # name option can be used instead."
                    ],
                    [
                      238,
                      "            subject = f\"{self._prefix}.CONSUMER.DURABLE.CREATE.{stream}.{durable_name}\""
                    ],
                    [
                      239,
                      "        else:"
                    ],
                    [
                      240,
                      "            subject = f\"{self._prefix}.CONSUMER.CREATE.{stream}\""
                    ],
                    [
                      241,
                      ""
                    ],
                    [
                      242,
                      "        resp = await self._api_request(subject, req_data, timeout=timeout)"
                    ],
                    [
                      243,
                      "        return api.ConsumerInfo.from_response(resp)"
                    ],
                    [
                      244,
                      ""
                    ],
                    [
                      245,
                      "    async def delete_consumer(self, stream: str, consumer: str) -> bool:"
                    ],
                    [
                      246,
                      "        \"\"\""
                    ],
                    [
                      247,
                      "        Delete a consumer from a given stream."
                    ]
                  ]
                },
                {
                  "vars": {
                    "msg": "Msg(_client=<nats client v2.15.0>, subject='_INBOX.Kb2vPMGUDYjKvPkBX2rcZ2.Kb2vPMGUDYjKvPkBX2rcfg8f02', reply='', data=b'{\"type\":\"io.nats.jetstream.api.v1.consumer_create_response\",\"error\":{\"code\":404,\"err_code\":10059,\"description\":\"stream not found\"}}', headers=None, _metadata=None, _ackd=False, _sid=1)",
                    "req": "b'{\"stream_name\": \"SITE_EVENTS\", \"config\": {\"durable_name\": \"notification-service-callback-requested\", \"deliver_policy\": \"all\", \"ack_policy\": \"explicit\", \"ack_wait\": 30000000000, \"max_deliver\": 5, \"filter_subject\": \"events.site.callback.requested\", \"replay_policy\": \"instant\", \"idle_heartbeat\": 0, \"inactive_threshold\": 0}}'",
                    "resp": {
                      "type": "'io.nats.jetstream.api.v1.consumer_create_response'",
                      "error": {
                        "code": "404",
                        "err_code": "10059",
                        "description": "'stream not found'"
                      }
                    },
                    "self": "<nats.js.client.JetStreamContext object at 0x7e74ad4eaa50>",
                    "timeout": "5",
                    "req_subject": "'$JS.API.CONSUMER.DURABLE.CREATE.SITE_EVENTS.notification-service-callback-requested'"
                  },
                  "module": "nats.js.manager",
                  "filename": "nats/js/manager.py",
                  "function": "_api_request",
                  "context_line": "            raise APIError.from_error(resp[\"error\"])",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/nats/js/manager.py",
                  "lineNo": 471,
                  "context": [
                    [
                      466,
                      "        except NoRespondersError:"
                    ],
                    [
                      467,
                      "            raise ServiceUnavailableError"
                    ],
                    [
                      468,
                      ""
                    ],
                    [
                      469,
                      "        # Check for API errors."
                    ],
                    [
                      470,
                      "        if \"error\" in resp:"
                    ],
                    [
                      471,
                      "            raise APIError.from_error(resp[\"error\"])"
                    ],
                    [
                      472,
                      ""
                    ],
                    [
                      473,
                      "        return resp"
                    ]
                  ]
                },
                {
                  "vars": {
                    "cls": "<class 'nats.js.errors.APIError'>",
                    "err": {
                      "code": "404",
                      "err_code": "10059",
                      "description": "'stream not found'"
                    },
                    "code": "404"
                  },
                  "module": "nats.js.errors",
                  "filename": "nats/js/errors.py",
                  "function": "from_error",
                  "context_line": "            raise NotFoundError(**err)",
                  "inApp": false,
                  "absPath": "/app/.venv/lib/python3.14/site-packages/nats/js/errors.py",
                  "lineNo": 87,
                  "context": [
                    [
                      82,
                      "        if code == 503:"
                    ],
                    [
                      83,
                      "            raise ServiceUnavailableError(**err)"
                    ],
                    [
                      84,
                      "        elif code == 500:"
                    ],
                    [
                      85,
                      "            raise ServerError(**err)"
                    ],
                    [
                      86,
                      "        elif code == 404:"
                    ],
                    [
                      87,
                      "            raise NotFoundError(**err)"
                    ],
                    [
                      88,
                      "        elif code == 400:"
                    ],
                    [
                      89,
                      "            raise BadRequestError(**err)"
                    ],
                    [
                      90,
                      "        else:"
                    ],
                    [
                      91,
                      "            raise APIError(**err)"
                    ],
                    [
                      92,
                      ""
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
            "timestamp": "2026-08-26T07:57:30.056Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Waiting for application startup.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:30.059Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "connect",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:30.087Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.285Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "select pg_catalog.version()",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.286Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "select current_schema()",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.294Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "show transaction isolation level",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.298Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "show standard_conforming_strings",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.301Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.303Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "alembic.runtime.migration",
            "message": "Context impl PostgresqlImpl.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.306Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "alembic.runtime.migration",
            "message": "Will assume transactional DDL.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.306Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_catalog.pg_class.relname \nFROM pg_catalog.pg_class JOIN pg_catalog.pg_namespace ON pg_catalog.pg_namespace.oid = pg_catalog.pg_class.relnamespace \nWHERE pg_catalog.pg_class.relname = $1::VARCHAR AND pg_catalog.pg_class.relkind = ANY (ARRAY[$2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR]) AND pg_catalog.pg_table_is_visible(pg_catalog.pg_class.oid) AND pg_catalog.pg_namespace.nspname != $7::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.320Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.321Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_catalog.pg_class.relname FROM pg_catalog.pg_class JOIN pg_catalog.pg_namespace ON pg_catalog.pg_namespace.oid = pg_catalog.pg_class.relnamespace WHERE pg_catalog.pg_class.relname = $1::VARCHAR AND pg_catalog.pg_class.relkind = ANY (ARRAY[$2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR]) AND pg_catalog.pg_table_is_visible(pg_catalog.pg_class.oid) AND pg_catalog.pg_namespace.nspname != $7::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.325Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT alembic_version.version_num \nFROM alembic_version",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.343Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT alembic_version.version_num FROM alembic_version",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.343Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.356Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "connect",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.366Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.400Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "select pg_catalog.version()",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.401Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "select current_schema()",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.403Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "show transaction isolation level",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.404Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "show standard_conforming_strings",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.405Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.406Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT notification_channels.id, notification_channels.created_at, notification_channels.updated_at, notification_channels.code, notification_channels.name, notification_channels.description, notification_channels.is_active \nFROM notification_channels \nWHERE notification_channels.id IN ($1::UUID, $2::UUID, $3::UUID)",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.409Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.409Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT notification_channels.id, notification_channels.created_at, notification_channels.updated_at, notification_channels.code, notification_channels.name, notification_channels.description, notification_channels.is_active FROM notification_channels WHERE notification_channels.id IN ($1::UUID, $2::UUID, $3::UUID)",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.411Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT notification_events.id, notification_events.created_at, notification_events.updated_at, notification_events.code, notification_events.name, notification_events.description, notification_events.metadata, notification_events.is_active \nFROM notification_events \nWHERE notification_events.id IN ($1::UUID)",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.421Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT notification_events.id, notification_events.created_at, notification_events.updated_at, notification_events.code, notification_events.name, notification_events.description, notification_events.metadata, notification_events.is_active FROM notification_events WHERE notification_events.id IN ($1::UUID)",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.422Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:57:35.426Z",
            "event_id": null
          }
        ]
      }
    }
  ],
  "contexts": {
    "trace": {
      "type": "trace",
      "trace_id": "ba4b0394b4604f05b0b16031e152fbeb",
      "span_id": "99e3f453bf13b347"
    },
    "runtime": {
      "type": "runtime",
      "name": "CPython",
      "version": "3.14.6"
    }
  },
  "context": {
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
  "title": "NotFoundError: nats: NotFoundError: code=404 err_code=10059 description='stream not found'",
  "userReport": null,
  "nextEventID": null,
  "previousEventID": null
}
```