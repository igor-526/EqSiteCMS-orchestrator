```
INFO: 10.244.0.37:41662 - "POST /api/photos HTTP/1.1" 500 Internal Server Error  

ERROR: Exception in ASGI application  

Traceback (most recent call last):  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 545, in _prepare_and_execute  

self._rows = deque(await prepared_stmt.fetch(*parameters))  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 176, in fetch  

data = await self.__bind_execute(args, 0, timeout)  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 267, in __bind_execute  

data, status, _ = await self.__do_execute(  

^^^^^^^^^^^^^^^^^^^^^^^^  

lambda protocol: protocol.bind_execute(  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

self._state, args, '', limit, True, timeout))  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 256, in __do_execute  

return await executor(protocol)  

^^^^^^^^^^^^^^^^^^^^^^^^  

File "asyncpg/protocol/protocol.pyx", line 206, in bind_execute  

asyncpg.exceptions.StringDataRightTruncationError: value too long for type character varying(63)  

  

The above exception was the direct cause of the following exception:  

  

Traceback (most recent call last):  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context  

self.dialect.do_execute(  

~~~~~~~~~~~~~~~~~~~~~~~^  

cursor, str_statement, effective_parameters, context  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/default.py", line 951, in do_execute  

cursor.execute(statement, parameters)  

~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 580, in execute  

self._adapt_connection.await_(  

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^  

self._prepare_and_execute(operation, parameters)  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 132, in await_only  

return current.parent.switch(awaitable) # type: ignore[no-any-return,attr-defined] # noqa: E501  

~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 196, in greenlet_spawn  

value = await result  

^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 558, in _prepare_and_execute  

self._handle_exception(error)  

~~~~~~~~~~~~~~~~~~~~~~^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 508, in _handle_exception  

self._adapt_connection._handle_exception(error)  

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 792, in _handle_exception  

raise translated_error from error  

sqlalchemy.dialects.postgresql.asyncpg.AsyncAdapt_asyncpg_dbapi.Error: <class 'asyncpg.exceptions.StringDataRightTruncationError'>: value too long for type character varying(63)  

  

The above exception was the direct cause of the following exception:  

  

Traceback (most recent call last):  

File "/eqsitecms/.venv/lib/python3.13/site-packages/uvicorn/protocols/http/h11_impl.py", line 403, in run_asgi  

result = await app( # type: ignore[func-returns-value]  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

self.scope, self.receive, self.send  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/uvicorn/middleware/proxy_headers.py", line 60, in __call__  

return await self.app(scope, receive, send)  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/fastapi/applications.py", line 1054, in __call__  

await super().__call__(scope, receive, send)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/applications.py", line 113, in __call__  

await self.middleware_stack(scope, receive, send)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/middleware/errors.py", line 186, in __call__  

raise exc  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/middleware/errors.py", line 164, in __call__  

await self.app(scope, receive, _send)  

File "/eqsitecms/src/core/middleware/cors.py", line 72, in __call__  

await self.app(  

...<8 lines>...  

)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/middleware/exceptions.py", line 63, in __call__  

await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app  

raise exc  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app  

await app(scope, receive, sender)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/routing.py", line 716, in __call__  

await self.middleware_stack(scope, receive, send)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/routing.py", line 736, in app  

await route.handle(scope, receive, send)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/routing.py", line 290, in handle  

await self.app(scope, receive, send)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/routing.py", line 78, in app  

await wrap_app_handling_exceptions(app, request)(scope, receive, send)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app  

raise exc  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app  

await app(scope, receive, sender)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/starlette/routing.py", line 75, in app  

response = await f(request)  

^^^^^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/fastapi/routing.py", line 302, in app  

raw_response = await run_endpoint_function(  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

...<3 lines>...  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/fastapi/routing.py", line 213, in run_endpoint_function  

return await dependant.call(**values)  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

File "/eqsitecms/src/api/photos.py", line 139, in create_photo  

photo = await photo_service.create(  

^^^^^^^^^^^^^^^^^^^^^^^^^^^  

data, upload, equestrian_context=equestrian_context  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/src/core/services/photos.py", line 113, in create  

return await self.photo_repository.create(photo)  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

File "/eqsitecms/src/repositories/abstract_repository.py", line 128, in create  

await self.session.execute(stmt)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/ext/asyncio/session.py", line 463, in execute  

result = await greenlet_spawn(  

^^^^^^^^^^^^^^^^^^^^^  

...<6 lines>...  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 201, in greenlet_spawn  

result = context.throw(*sys.exc_info())  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/orm/session.py", line 2365, in execute  

return self._execute_internal(  

~~~~~~~~~~~~~~~~~~~~~~^  

statement,  

^^^^^^^^^^  

...<4 lines>...  

_add_event=_add_event,  

^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/orm/session.py", line 2260, in _execute_internal  

result = conn.execute(  

statement, params or {}, execution_options=execution_options  

)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1419, in execute  

return meth(  

self,  

distilled_parameters,  

execution_options or NO_OPTIONS,  

)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/sql/elements.py", line 526, in _execute_on_connection  

return connection._execute_clauseelement(  

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^  

self, distilled_params, execution_options  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1641, in _execute_clauseelement  

ret = self._execute_context(  

dialect,  

...<8 lines>...  

cache_hit=cache_hit,  

)  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1846, in _execute_context  

return self._exec_single_context(  

~~~~~~~~~~~~~~~~~~~~~~~~~^  

dialect, context, statement, parameters  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1986, in _exec_single_context  

self._handle_dbapi_exception(  

~~~~~~~~~~~~~~~~~~~~~~~~~~~~^  

e, str_statement, effective_parameters, cursor, context  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 2355, in _handle_dbapi_exception  

raise sqlalchemy_exception.with_traceback(exc_info[2]) from e  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context  

self.dialect.do_execute(  

~~~~~~~~~~~~~~~~~~~~~~~^  

cursor, str_statement, effective_parameters, context  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/engine/default.py", line 951, in do_execute  

cursor.execute(statement, parameters)  

~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 580, in execute  

self._adapt_connection.await_(  

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^  

self._prepare_and_execute(operation, parameters)  

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

)  

^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 132, in await_only  

return current.parent.switch(awaitable) # type: ignore[no-any-return,attr-defined] # noqa: E501  

~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 196, in greenlet_spawn  

value = await result  

^^^^^^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 558, in _prepare_and_execute  

self._handle_exception(error)  

~~~~~~~~~~~~~~~~~~~~~~^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 508, in _handle_exception  

self._adapt_connection._handle_exception(error)  

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^  

File "/eqsitecms/.venv/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 792, in _handle_exception  

raise translated_error from error  

sqlalchemy.exc.DBAPIError: (sqlalchemy.dialects.postgresql.asyncpg.Error) <class 'asyncpg.exceptions.StringDataRightTruncationError'>: value too long for type character varying(63)  

[SQL: INSERT INTO photos (id, created_at, updated_at, equestrian_id, name, description, path) VALUES ($1::UUID, $2::TIMESTAMP WITH TIME ZONE, $3::TIMESTAMP WITH TIME ZONE, $4::UUID, $5::VARCHAR, $6::VARCHAR, $7::VARCHAR)]  

[parameters: (UUID('e65ce781-6a3e-44c0-8b9f-63044f9b915d'), datetime.datetime(2026, 8, 18, 14, 52, 19, 359541), datetime.datetime(2026, 8, 18, 14, 52, 19, 359547), UUID('5f6496aa-4fe9-42da-a763-29f9bab22d73'), 'X3uWSgPbhGzpIokCqPcBngTzPqQbKNSqxIMgSzSGiMBjy--iQxuiK226XvdUBu6Y4OrpWt5rAuJXGGhjlt7ntVaV.jpg', '', '042839d5-0d1c-496c-b7a0-6a2280410434.jpg')]  

(Background on this error at: https://sqlalche.me/e/20/dbapi)
```

```
INFO: 10.244.0.37:52916 - "DELETE /api/photos/temp-1787064931222-0.5688643649315095 HTTP/1.1" 422 Unprocessable Content
```

```
413 Content Too Large
```