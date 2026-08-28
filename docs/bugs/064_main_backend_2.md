GlitchTip error event
Source: https://glitchtip.eqcms.ru
Instance: https://glitchtip.eqcms.ru
Organization: equestrian-site-cms
Issue ID: 6
Event ID: 01a03d0d2f737d3bb9604770a2332d01
Event URL: https://glitchtip.eqcms.ru/equestrian-site-cms/issues/6?project=1

Raw event JSON:
```json
{
  "platform": "python",
  "errors": null,
  "id": "01a03d0d2f737d3bb9604770a2332d01",
  "eventID": "c52aaefa308d4af981236a918b49a454",
  "projectID": 1,
  "groupID": "6",
  "dateCreated": "2026-08-26T07:51:09.318Z",
  "dateReceived": "2026-08-26T07:51:09.427Z",
  "dist": null,
  "culprit": "asyncio.selector_events in _sock_connect_cb",
  "packages": {
    "h11": "0.16.0",
    "six": "1.17.0",
    "cffi": "2.0.0",
    "comm": "0.2.3",
    "fqdn": "1.5.1",
    "idna": "3.10",
    "jedi": "0.19.2",
    "lark": "1.3.0",
    "mako": "1.3.10",
    "mypy": "1.17.1",
    "pytz": "2025.2",
    "ruff": "0.15.12",
    "yarl": "1.20.1",
    "anyio": "4.10.0",
    "arrow": "1.3.0",
    "attrs": "25.3.0",
    "babel": "2.17.0",
    "black": "25.1.0",
    "boto3": "1.40.61",
    "click": "8.2.1",
    "httpx": "0.28.1",
    "isort": "6.0.1",
    "json5": "0.12.1",
    "numpy": "2.3.2",
    "parso": "0.8.5",
    "pyjwt": "2.10.1",
    "pyzmq": "27.1.0",
    "redis": "6.4.0",
    "wrapt": "1.17.3",
    "bcrypt": "4.0.1",
    "bleach": "6.2.0",
    "flake8": "7.3.0",
    "jinja2": "3.1.6",
    "mccabe": "0.7.0",
    "pandas": "2.3.2",
    "pluggy": "1.6.0",
    "psutil": "7.1.0",
    "pytest": "8.4.2",
    "pyyaml": "6.0.3",
    "tzdata": "2025.2",
    "aiohttp": "3.12.15",
    "alembic": "1.16.5",
    "asyncpg": "0.30.0",
    "certifi": "2025.8.3",
    "debugpy": "1.8.17",
    "fastapi": "0.116.1",
    "ipython": "9.6.0",
    "mistune": "3.1.4",
    "nats-py": "2.15.0",
    "passlib": "1.7.4",
    "pexpect": "4.9.0",
    "rpds-py": "0.27.1",
    "sniffio": "1.3.1",
    "tornado": "6.5.2",
    "urllib3": "2.5.0",
    "uvicorn": "0.35.0",
    "wcwidth": "0.2.13",
    "aioboto3": "15.5.0",
    "aiofiles": "25.1.0",
    "botocore": "1.40.61",
    "eventlet": "0.40.3",
    "greenlet": "3.2.4",
    "httpcore": "1.0.9",
    "jmespath": "1.1.0",
    "nbclient": "0.10.2",
    "nbformat": "5.10.4",
    "notebook": "7.4.7",
    "pathspec": "0.12.1",
    "pydantic": "2.11.7",
    "pyflakes": "3.4.0",
    "pygments": "2.19.2",
    "requests": "2.32.5",
    "tinycss2": "1.4.0",
    "aiosignal": "1.4.0",
    "aiosqlite": "0.21.0",
    "asttokens": "3.0.0",
    "async-lru": "2.0.5",
    "decorator": "5.2.1",
    "dnspython": "2.7.0",
    "executing": "2.2.1",
    "iniconfig": "2.1.0",
    "ipykernel": "7.0.0",
    "multidict": "6.6.4",
    "nbconvert": "7.16.6",
    "packaging": "25.0",
    "propcache": "0.3.2",
    "pure_eval": "0.2.3",
    "pycparser": "2.23",
    "soupsieve": "2.8",
    "starlette": "0.47.3",
    "terminado": "0.18.1",
    "traitlets": "5.14.3",
    "webcolors": "24.11.1",
    "aiolimiter": "1.2.1",
    "defusedxml": "0.7.1",
    "frozenlist": "1.7.0",
    "jsonschema": "4.25.1",
    "jupyterlab": "4.4.9",
    "markupsafe": "3.0.2",
    "ptyprocess": "0.7.0",
    "s3transfer": "0.14.0",
    "send2trash": "1.8.3",
    "sentry-sdk": "2.68.0",
    "setuptools": "80.9.0",
    "sqlalchemy": "2.0.43",
    "stack-data": "0.6.3",
    "aiobotocore": "2.25.1",
    "argon2-cffi": "25.1.0",
    "isoduration": "20.11.0",
    "jsonpointer": "3.0.0",
    "jupyter-lsp": "2.3.0",
    "pycodestyle": "2.14.0",
    "referencing": "0.37.0",
    "aioitertools": "0.13.0",
    "jupyter_core": "5.8.1",
    "nest-asyncio": "1.6.0",
    "platformdirs": "4.4.0",
    "types-pyyaml": "6.0.12.20260815",
    "uri-template": "1.3.0",
    "webencodings": "0.5.1",
    "notebook_shim": "0.2.4",
    "pandocfilters": "1.5.1",
    "pydantic_core": "2.33.2",
    "python-dotenv": "1.1.1",
    "types-passlib": "1.7.7.20250602",
    "beautifulsoup4": "4.14.2",
    "fastjsonschema": "2.21.2",
    "jupyter-events": "0.12.0",
    "jupyter_client": "8.6.3",
    "jupyter_server": "2.17.0",
    "prompt_toolkit": "3.0.52",
    "pytest-asyncio": "1.1.0",
    "rfc3987-syntax": "1.1.0",
    "annotated-types": "0.7.0",
    "mypy_extensions": "1.1.0",
    "psycopg2-binary": "2.9.10",
    "python-dateutil": "2.9.0.post0",
    "aiohappyeyeballs": "2.6.1",
    "python-multipart": "0.0.20",
    "sqlalchemy-utils": "0.42.0",
    "websocket-client": "1.9.0",
    "jupyterlab_server": "2.27.3",
    "matplotlib-inline": "0.1.7",
    "prometheus_client": "0.23.1",
    "pydantic-settings": "2.10.1",
    "rfc3339-validator": "0.1.4",
    "rfc3986-validator": "0.1.1",
    "typing-inspection": "0.4.1",
    "typing_extensions": "4.15.0",
    "charset-normalizer": "3.4.4",
    "python-json-logger": "4.0.0",
    "dependency-injector": "4.49.1",
    "jupyterlab_pygments": "0.3.0",
    "argon2-cffi-bindings": "25.1.0",
    "types-python-dateutil": "2.9.0.20251008",
    "ipython_pygments_lexers": "1.1.1",
    "jupyter_server_terminals": "0.5.3",
    "jsonschema-specifications": "2025.9.1",
    "prometheus-fastapi-instrumentator": "7.1.0"
  },
  "type": "error",
  "message": "ConnectionRefusedError: [Errno 111] Connect call failed ('10.96.192.106', 4222)",
  "metadata": {
    "type": "ConnectionRefusedError",
    "value": "[Errno 111] Connect call failed ('10.96.192.106', 4222)",
    "filename": "asyncio/selector_events.py",
    "function": "_sock_connect_cb"
  },
  "tags": [
    {
      "key": "environment",
      "value": "production"
    },
    {
      "key": "server_name",
      "value": "eqcms-backend-deployment-7755c7cfbc-njmln"
    }
  ],
  "entries": [
    {
      "type": "exception",
      "data": {
        "values": [
          {
            "type": "ConnectionRefusedError",
            "value": "[Errno 111] Connect call failed ('10.96.192.106', 4222)",
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
                    "e": "ConnectionRefusedError(111, \"Connect call failed ('10.96.192.106', 4222)\")",
                    "s": "Srv(uri=ParseResult(scheme='nats', netloc='eqsitecms-nats:4222', path='', params='', query='', fragment=''), reconnects=1, last_attempt=769985.672602866, did_connect=False, discovered=False, tls_name=None, server_version='2.14.5')",
                    "now": "769985.667944397",
                    "self": "<nats client v2.15.0>"
                  },
                  "module": "nats.aio.client",
                  "filename": "nats/aio/client.py",
                  "function": "_select_next_server",
                  "context_line": "                await self._connect_to_server(s)",
                  "inApp": false,
                  "absPath": "/eqsitecms/.venv/lib/python3.13/site-packages/nats/aio/client.py",
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
                    "s": "Srv(uri=ParseResult(scheme='nats', netloc='eqsitecms-nats:4222', path='', params='', query='', fragment=''), reconnects=1, last_attempt=769985.672602866, did_connect=False, discovered=False, tls_name=None, server_version='2.14.5')",
                    "self": "<nats client v2.15.0>"
                  },
                  "module": "nats.aio.client",
                  "filename": "nats/aio/client.py",
                  "function": "_connect_to_server",
                  "context_line": "            await self._transport.connect(",
                  "inApp": false,
                  "absPath": "/eqsitecms/.venv/lib/python3.13/site-packages/nats/aio/client.py",
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
                    "self": "<nats.aio.transport.TcpTransport object at 0x764edd642660>",
                    "buffer_size": "32768",
                    "connect_timeout": "5"
                  },
                  "module": "nats.aio.transport",
                  "filename": "nats/aio/transport.py",
                  "function": "connect",
                  "context_line": "        r, w = await asyncio.wait_for(",
                  "inApp": false,
                  "absPath": "/eqsitecms/.venv/lib/python3.13/site-packages/nats/aio/transport.py",
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
                    "fut": "<coroutine object open_connection at 0x764edc63ec20>",
                    "timeout": "5"
                  },
                  "module": "asyncio.tasks",
                  "filename": "asyncio/tasks.py",
                  "function": "wait_for",
                  "context_line": "        return await fut",
                  "absPath": "/usr/lib/python3.13/asyncio/tasks.py",
                  "lineNo": 507,
                  "context": [
                    [
                      502,
                      "            return fut.result()"
                    ],
                    [
                      503,
                      "        except exceptions.CancelledError as exc:"
                    ],
                    [
                      504,
                      "            raise TimeoutError from exc"
                    ],
                    [
                      505,
                      ""
                    ],
                    [
                      506,
                      "    async with timeouts.timeout(timeout):"
                    ],
                    [
                      507,
                      "        return await fut"
                    ],
                    [
                      508,
                      ""
                    ],
                    [
                      509,
                      "async def _wait(fs, timeout, return_when, loop):"
                    ],
                    [
                      510,
                      "    \"\"\"Internal helper for wait()."
                    ],
                    [
                      511,
                      ""
                    ],
                    [
                      512,
                      "    The fs argument must be a collection of Futures."
                    ]
                  ]
                },
                {
                  "vars": {
                    "host": "'eqsitecms-nats'",
                    "kwds": {},
                    "loop": "<_UnixSelectorEventLoop running=True closed=False debug=False>",
                    "port": "4222",
                    "limit": "32768",
                    "reader": "<StreamReader limit=32768>",
                    "protocol": "<asyncio.streams.StreamReaderProtocol object at 0x764ede69dd10>"
                  },
                  "module": "asyncio.streams",
                  "filename": "asyncio/streams.py",
                  "function": "open_connection",
                  "context_line": "    transport, _ = await loop.create_connection(",
                  "absPath": "/usr/lib/python3.13/asyncio/streams.py",
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
                  "vars": {
                    "ssl": "None",
                    "host": "'eqsitecms-nats'",
                    "port": "4222",
                    "self": "<_UnixSelectorEventLoop running=True closed=False debug=False>",
                    "sock": "None",
                    "flags": "0",
                    "proto": "0",
                    "family": "0",
                    "local_addr": "None",
                    "protocol_factory": "<function open_connection.<locals>.<lambda> at 0x764edc67e980>"
                  },
                  "module": "asyncio.base_events",
                  "filename": "asyncio/base_events.py",
                  "function": "create_connection",
                  "context_line": "                        raise exceptions[0]",
                  "absPath": "/usr/lib/python3.13/asyncio/base_events.py",
                  "lineNo": 1166,
                  "context": [
                    [
                      1161,
                      "                exceptions = [exc for sub in exceptions for exc in sub]"
                    ],
                    [
                      1162,
                      "                try:"
                    ],
                    [
                      1163,
                      "                    if all_errors:"
                    ],
                    [
                      1164,
                      "                        raise ExceptionGroup(\"create_connection failed\", exceptions)"
                    ],
                    [
                      1165,
                      "                    if len(exceptions) == 1:"
                    ],
                    [
                      1166,
                      "                        raise exceptions[0]"
                    ],
                    [
                      1167,
                      "                    else:"
                    ],
                    [
                      1168,
                      "                        # If they all have the same str(), raise one."
                    ],
                    [
                      1169,
                      "                        model = str(exceptions[0])"
                    ],
                    [
                      1170,
                      "                        if all(str(exc) == model for exc in exceptions):"
                    ],
                    [
                      1171,
                      "                            raise exceptions[0]"
                    ]
                  ]
                },
                {
                  "vars": {
                    "ssl": "None",
                    "host": "'eqsitecms-nats'",
                    "port": "4222",
                    "self": "<_UnixSelectorEventLoop running=True closed=False debug=False>",
                    "sock": "None",
                    "flags": "0",
                    "proto": "0",
                    "family": "0",
                    "local_addr": "None",
                    "protocol_factory": "<function open_connection.<locals>.<lambda> at 0x764edc67e980>"
                  },
                  "module": "asyncio.base_events",
                  "filename": "asyncio/base_events.py",
                  "function": "create_connection",
                  "context_line": "                        sock = await self._connect_sock(",
                  "absPath": "/usr/lib/python3.13/asyncio/base_events.py",
                  "lineNo": 1141,
                  "context": [
                    [
                      1136,
                      "            exceptions = []"
                    ],
                    [
                      1137,
                      "            if happy_eyeballs_delay is None:"
                    ],
                    [
                      1138,
                      "                # not using happy eyeballs"
                    ],
                    [
                      1139,
                      "                for addrinfo in infos:"
                    ],
                    [
                      1140,
                      "                    try:"
                    ],
                    [
                      1141,
                      "                        sock = await self._connect_sock("
                    ],
                    [
                      1142,
                      "                            exceptions, addrinfo, laddr_infos)"
                    ],
                    [
                      1143,
                      "                        break"
                    ],
                    [
                      1144,
                      "                    except OSError:"
                    ],
                    [
                      1145,
                      "                        continue"
                    ],
                    [
                      1146,
                      "            else:  # using happy eyeballs"
                    ]
                  ]
                },
                {
                  "vars": {
                    "_": "''",
                    "self": "<_UnixSelectorEventLoop running=True closed=False debug=False>",
                    "proto": "6",
                    "type_": "<SocketKind.SOCK_STREAM: 1>",
                    "family": "<AddressFamily.AF_INET: 2>",
                    "address": [
                      "'10.96.192.106'",
                      "4222"
                    ],
                    "addr_info": [
                      "<AddressFamily.AF_INET: 2>",
                      "<SocketKind.SOCK_STREAM: 1>",
                      "6",
                      "''",
                      [
                        "'10.96.192.106'",
                        "4222"
                      ]
                    ],
                    "exceptions": "None",
                    "my_exceptions": "None",
                    "local_addr_infos": "None"
                  },
                  "module": "asyncio.base_events",
                  "filename": "asyncio/base_events.py",
                  "function": "_connect_sock",
                  "context_line": "            await self.sock_connect(sock, address)",
                  "absPath": "/usr/lib/python3.13/asyncio/base_events.py",
                  "lineNo": 1044,
                  "context": [
                    [
                      1039,
                      "                else:  # all bind attempts failed"
                    ],
                    [
                      1040,
                      "                    if my_exceptions:"
                    ],
                    [
                      1041,
                      "                        raise my_exceptions.pop()"
                    ],
                    [
                      1042,
                      "                    else:"
                    ],
                    [
                      1043,
                      "                        raise OSError(f\"no matching local address with {family=} found\")"
                    ],
                    [
                      1044,
                      "            await self.sock_connect(sock, address)"
                    ],
                    [
                      1045,
                      "            return sock"
                    ],
                    [
                      1046,
                      "        except OSError as exc:"
                    ],
                    [
                      1047,
                      "            my_exceptions.append(exc)"
                    ],
                    [
                      1048,
                      "            if sock is not None:"
                    ],
                    [
                      1049,
                      "                sock.close()"
                    ]
                  ]
                },
                {
                  "vars": {
                    "_": "''",
                    "fut": "None",
                    "self": "<_UnixSelectorEventLoop running=True closed=False debug=False>",
                    "sock": "<socket.socket [closed] fd=-1, family=2, type=1, proto=6>",
                    "address": [
                      "'10.96.192.106'",
                      "4222"
                    ],
                    "resolved": [
                      [
                        "<AddressFamily.AF_INET: 2>",
                        "<SocketKind.SOCK_STREAM: 1>",
                        "6",
                        "''",
                        [
                          "'10.96.192.106'",
                          "4222"
                        ]
                      ]
                    ]
                  },
                  "module": "asyncio.selector_events",
                  "filename": "asyncio/selector_events.py",
                  "function": "sock_connect",
                  "context_line": "            return await fut",
                  "absPath": "/usr/lib/python3.13/asyncio/selector_events.py",
                  "lineNo": 641,
                  "context": [
                    [
                      636,
                      "            _, _, _, _, address = resolved[0]"
                    ],
                    [
                      637,
                      ""
                    ],
                    [
                      638,
                      "        fut = self.create_future()"
                    ],
                    [
                      639,
                      "        self._sock_connect(fut, sock, address)"
                    ],
                    [
                      640,
                      "        try:"
                    ],
                    [
                      641,
                      "            return await fut"
                    ],
                    [
                      642,
                      "        finally:"
                    ],
                    [
                      643,
                      "            # Needed to break cycles when an exception occurs."
                    ],
                    [
                      644,
                      "            fut = None"
                    ],
                    [
                      645,
                      ""
                    ],
                    [
                      646,
                      "    def _sock_connect(self, fut, sock, address):"
                    ]
                  ]
                },
                {
                  "vars": {
                    "err": "111",
                    "fut": "None",
                    "self": "<_UnixSelectorEventLoop running=True closed=False debug=False>",
                    "sock": "<socket.socket [closed] fd=-1, family=2, type=1, proto=6>",
                    "address": [
                      "'10.96.192.106'",
                      "4222"
                    ]
                  },
                  "module": "asyncio.selector_events",
                  "filename": "asyncio/selector_events.py",
                  "function": "_sock_connect_cb",
                  "context_line": "                raise OSError(err, f'Connect call failed {address}')",
                  "absPath": "/usr/lib/python3.13/asyncio/selector_events.py",
                  "lineNo": 681,
                  "context": [
                    [
                      676,
                      ""
                    ],
                    [
                      677,
                      "        try:"
                    ],
                    [
                      678,
                      "            err = sock.getsockopt(socket.SOL_SOCKET, socket.SO_ERROR)"
                    ],
                    [
                      679,
                      "            if err != 0:"
                    ],
                    [
                      680,
                      "                # Jump to any except clause below."
                    ],
                    [
                      681,
                      "                raise OSError(err, f'Connect call failed {address}')"
                    ],
                    [
                      682,
                      "        except (BlockingIOError, InterruptedError):"
                    ],
                    [
                      683,
                      "            # socket is still registered, the callback will be retried later"
                    ],
                    [
                      684,
                      "            pass"
                    ],
                    [
                      685,
                      "        except (SystemExit, KeyboardInterrupt):"
                    ],
                    [
                      686,
                      "            raise"
                    ]
                  ]
                }
              ]
            }
          }
        ],
        "hasSystemFrames": false
      }
    },
    {
      "type": "breadcrumbs",
      "data": {
        "values": [
          {
            "type": "log",
            "category": "main",
            "message": "Logger has configured.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:00.257Z",
            "event_id": null
          },
          {
            "type": "subprocess",
            "category": "subprocess",
            "message": "git rev-parse HEAD",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:00.302Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Started server process [14]",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.002Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Waiting for application startup.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.012Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "connect",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.021Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT t.oid, t.typelem AS elemtype, t.typtype AS kind FROM pg_catalog.pg_type AS t WHERE t.oid = $1",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.130Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT t.oid, t.typelem AS elemtype, t.typtype AS kind FROM pg_catalog.pg_type AS t WHERE t.oid = $1",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.133Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.136Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "select pg_catalog.version()",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.137Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "select current_schema()",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.213Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "show transaction isolation level",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.215Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "show standard_conforming_strings",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.216Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.217Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "alembic.runtime.migration",
            "message": "Context impl PostgresqlImpl.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.219Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "alembic.runtime.migration",
            "message": "Will assume transactional DDL.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.219Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_catalog.pg_class.relname \nFROM pg_catalog.pg_class JOIN pg_catalog.pg_namespace ON pg_catalog.pg_namespace.oid = pg_catalog.pg_class.relnamespace \nWHERE pg_catalog.pg_class.relname = $1::VARCHAR AND pg_catalog.pg_class.relkind = ANY (ARRAY[$2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR]) AND pg_catalog.pg_table_is_visible(pg_catalog.pg_class.oid) AND pg_catalog.pg_namespace.nspname != $7::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.224Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.224Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT pg_catalog.pg_class.relname FROM pg_catalog.pg_class JOIN pg_catalog.pg_namespace ON pg_catalog.pg_namespace.oid = pg_catalog.pg_class.relnamespace WHERE pg_catalog.pg_class.relname = $1::VARCHAR AND pg_catalog.pg_class.relkind = ANY (ARRAY[$2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, $6::VARCHAR]) AND pg_catalog.pg_table_is_visible(pg_catalog.pg_class.oid) AND pg_catalog.pg_namespace.nspname != $7::VARCHAR",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.225Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT alembic_version.version_num \nFROM alembic_version",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.231Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT alembic_version.version_num FROM alembic_version",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.231Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.332Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "utils.seeding.init_registry",
            "message": "Миграции успешно были применены.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.402Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "utils.seeding.init_registry",
            "message": "Starting seeding lifecycle...",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.403Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "connect",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.414Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT t.oid, t.typelem AS elemtype, t.typtype AS kind FROM pg_catalog.pg_type AS t WHERE t.oid = $1",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.516Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT t.oid, t.typelem AS elemtype, t.typtype AS kind FROM pg_catalog.pg_type AS t WHERE t.oid = $1",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.518Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.520Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "select pg_catalog.version()",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.520Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "select current_schema()",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.522Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "show transaction isolation level",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.524Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "show standard_conforming_strings",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.525Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.526Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_scopes.id, user_scopes.scope_name, user_scopes.scope_description \nFROM user_scopes \nWHERE user_scopes.id IN ($1::UUID, $2::UUID, $3::UUID, $4::UUID)",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.528Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.528Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "SELECT user_scopes.id, user_scopes.scope_name, user_scopes.scope_description FROM user_scopes WHERE user_scopes.id IN ($1::UUID, $2::UUID, $3::UUID, $4::UUID)",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.529Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "root",
            "message": "UserScopesSeeder created 0 entities",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.531Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "DELETE FROM callback_request_statuses WHERE (callback_request_statuses.id NOT IN ($1::SMALLINT, $2::SMALLINT))",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.532Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "DELETE FROM callback_request_statuses WHERE (callback_request_statuses.id NOT IN ($1::SMALLINT, $2::SMALLINT))",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.532Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO callback_request_statuses (id, name, color) VALUES ($1::SMALLINT, $2::VARCHAR, $3::VARCHAR), ($4::SMALLINT, $5::VARCHAR, $6::VARCHAR) ON CONFLICT (id) DO UPDATE SET name = excluded.name, color = excluded.color",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.536Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO callback_request_statuses (id, name, color) VALUES ($1::SMALLINT, $2::VARCHAR, $3::VARCHAR), ($4::SMALLINT, $5::VARCHAR, $6::VARCHAR) ON CONFLICT (id) DO UPDATE SET name = excluded.name, color = excluded.color",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.536Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.538Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "utils.seeding.init_registry",
            "message": "Сидирование завершено.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.543Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Application startup complete.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:20:02.622Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "nats.aio.client",
            "message": "nats: encountered error",
            "data": null,
            "level": "error",
            "timestamp": "2026-08-26T07:51:08.010Z",
            "event_id": null
          }
        ]
      }
    },
    {
      "type": "message",
      "data": {
        "params": [],
        "message": "nats: encountered error",
        "formatted": "nats: encountered error"
      }
    }
  ],
  "contexts": {
    "trace": {
      "type": "trace",
      "trace_id": "3a72299fba37436a9aefa93a9df15e0f",
      "span_id": "ad88addc85f6d653"
    },
    "runtime": {
      "type": "runtime",
      "name": "CPython",
      "version": "3.13.5"
    }
  },
  "context": {
    "asctime": "2026-08-26 07:51:09,232",
    "sys.argv": [
      "src/main.py"
    ]
  },
  "user": {
    "ip_address": "193.176.79.0"
  },
  "sdk": {
    "name": "sentry.python.fastapi",
    "version": "2.68.0",
    "packages": [
      {
        "name": "pypi:sentry-sdk",
        "version": "2.68.0"
      }
    ],
    "integrations": [
      "aiohttp",
      "argv",
      "asyncpg",
      "atexit",
      "boto3",
      "dedupe",
      "excepthook",
      "fastapi",
      "httpx",
      "logging",
      "modules",
      "redis",
      "sqlalchemy",
      "starlette",
      "stdlib",
      "threading",
      "tornado"
    ]
  },
  "title": "ConnectionRefusedError: [Errno 111] Connect call failed ('10.96.192.106', 4222)",
  "userReport": null,
  "nextEventID": null,
  "previousEventID": null
}
```