# Контекст
В процессе использования возникли следующие баги:
## Main Backend
Возникшие в процессе эксплуатации баги описаны в этих файлах:
- `docs/bugs/064_main_backend_1.md`
- `docs/bugs/064_main_backend_2.md`
- `docs/bugs/064_main_backend_3.md`
## Email Service
Возникшие в процессе эксплуатации баги описаны в этих файлах:
- `docs/bugs/064_email_service_1.md`
- `docs/bugs/064_email_service_2.md`
## Notification Service
Возникшие в процессе эксплуатации баги описаны в этих файлах:
- `docs/bugs/064_notification_service.md`
Также возник следующий баг на этапе CI при деплое:
```
Run make test

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:9)uv run pytest -m "not infrastructure"

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:10)============================= test session starts ==============================

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:11)platform linux -- Python 3.14.6, pytest-9.1.1, pluggy-1.6.0

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:12)rootdir: /home/runner/work/EqSiteCMS-notification-service/EqSiteCMS-notification-service

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:13)configfile: pyproject.toml

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:14)testpaths: tests

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:15)plugins: anyio-4.14.2, asyncio-1.4.0

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:16)asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:17)collected 109 items / 2 deselected / 107 selected

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:18)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:19)tests/api/test_health.py ... [ 2%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:20)tests/api/test_notification_settings.py ... [ 5%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:21)tests/unit/clients/test_email_service_client.py .. [ 7%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:22)tests/unit/clients/test_main_backend_client.py ... [ 10%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:23)tests/unit/containers/test_application_wiring.py . [ 11%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:24)tests/unit/messaging/test_nats_adapter_contract.py ....F...... [ 21%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:25)tests/unit/messaging/test_vk_callback_delivery.py ...................... [ 42%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:26)[ 42%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:27)tests/unit/repositories/test_channel_repository.py .... [ 45%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:28)tests/unit/repositories/test_event_repository.py .... [ 49%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:29)tests/unit/repositories/test_user_notification_setting_repository.py ... [ 52%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:30)[ 52%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:31)tests/unit/services/test_callback_handler.py ... [ 55%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:32)tests/unit/services/test_notification_orchestrator.py ........ [ 62%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:33)tests/unit/services/test_notification_recipient_selection.py ......... [ 71%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:34)tests/unit/services/test_notification_settings.py ... [ 73%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:35)tests/unit/smoke_harness/test_notification_harness.py .................. [ 90%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:36)[ 90%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:37)tests/unit/test_observability.py .......... [100%]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:38)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:39)=================================== FAILURES ===================================

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:40)________ test_backend_and_notification_asyncapi_callback_schemas_match _________

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:41)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:42)def test_backend_and_notification_asyncapi_callback_schemas_match() -> None:

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:43)service_root = Path(__file__).parents[3]

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:44)notification_document = yaml.safe_load((service_root / "docs" / "asyncapi.yaml").read_text())

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:45)> backend_document = yaml.safe_load((service_root.parent / "backend" / "docs" / "asyncapi.yaml").read_text())

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:46)^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:47)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:48)tests/unit/messaging/test_nats_adapter_contract.py:99:

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:49)_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:50)../../_temp/uv-python-dir/cpython-3.14.6-linux-x86_64-gnu/lib/python3.14/pathlib/__init__.py:787: in read_text

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:51)with self.open(mode='r', encoding=encoding, errors=errors, newline=newline) as f:

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:52)^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:53)_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:54)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:55)self = PosixPath('/home/runner/work/EqSiteCMS-notification-service/backend/docs/asyncapi.yaml')

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:56)mode = 'r', buffering = -1, encoding = 'locale', errors = None, newline = None

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:57)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:58)def open(self, mode='r', buffering=-1, encoding=None,

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:59)errors=None, newline=None):

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:60)"""

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:61)Open the file pointed to by this path and return a file object, as

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:62)the built-in open() function does.

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:63)"""

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:64)if "b" not in mode:

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:65)encoding = io.text_encoding(encoding)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:66)> return io.open(self, mode, buffering, encoding, errors, newline)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:67)^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:68)E FileNotFoundError: [Errno 2] No such file or directory: '/home/runner/work/EqSiteCMS-notification-service/backend/docs/asyncapi.yaml'

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:69)

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:70)../../_temp/uv-python-dir/cpython-3.14.6-linux-x86_64-gnu/lib/python3.14/pathlib/__init__.py:771: FileNotFoundError

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:71)=========================== short test summary info ============================

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:72)FAILED tests/unit/messaging/test_nats_adapter_contract.py::test_backend_and_notification_asyncapi_callback_schemas_match - FileNotFoundError: [Errno 2] No such file or directory: '/home/runner/work/EqSiteCMS-notification-service/backend/docs/asyncapi.yaml'

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:73)================= 1 failed, 106 passed, 2 deselected in 2.91s ==================

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:74)make: *** [Makefile:19: test] Error 1

[](https://github.com/igor-526/EqSiteCMS-notification-service/actions/runs/33170810230/job/98847227101#step:6:75)Error: Process completed with exit code 2.
```
## VK Service
Баг произошёл при деплое на этапе CI:
```
Run make test

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:9)uv run pytest -m "not infrastructure"

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:10)============================= test session starts ==============================

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:11)platform linux -- Python 3.14.6, pytest-9.1.1, pluggy-1.6.0

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:12)rootdir: /home/runner/work/EqSiteCMS-vk-service/EqSiteCMS-vk-service

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:13)configfile: pyproject.toml

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:14)testpaths: tests

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:15)plugins: anyio-4.14.2, asyncio-1.4.0

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:16)asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:17)collected 289 items / 21 deselected / 268 selected

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:18)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:19)tests/api/test_health.py .............. [ 5%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:20)tests/api/test_vks.py .............................. [ 16%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:21)tests/bot/test_command_parsing.py ............. [ 21%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:22)tests/bot/test_event_handler.py ................. [ 27%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:23)tests/bot/test_longpoll_resilience.py ......... [ 30%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:24)tests/bot/test_runtime.py ...................... [ 39%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:25)tests/clients/nats/test_adapter_contract.py ..... [ 41%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:26)tests/clients/nats/test_vk_contract_equality.py F [ 41%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:27)tests/clients/nats/test_vk_notification_consumer.py ... [ 42%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:28)tests/unit/services/test_vk_binding_service.py .................. [ 49%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:29)tests/unit/services/test_vk_confirmation_service.py .............. [ 54%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:30)tests/unit/services/test_vk_notification_delivery_service.py ........ [ 57%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:31)tests/unit/services/test_vk_state_service.py ...... [ 59%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:32)tests/unit/smoke_harness/test_harness.py ............................... [ 71%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:33)........ [ 74%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:34)tests/unit/test_celery_app.py ..... [ 76%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:35)tests/unit/test_containers.py .... [ 77%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:36)tests/unit/test_observability.py ........... [ 81%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:37)tests/unit/test_settings.py ....................... [ 90%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:38)tests/unit/test_skeleton_boundaries.py .... [ 91%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:39)tests/unit/test_vk_code.py ......... [ 95%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:40)tests/unit/test_vk_library_isolation.py ...... [ 97%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:41)tests/unit/test_vk_models.py ....... [100%]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:42)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:43)=================================== FAILURES ===================================

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:44)_____ test_ut09_notification_and_vk_asyncapi_payload_and_headers_are_equal _____

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:45)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:46)def test_ut09_notification_and_vk_asyncapi_payload_and_headers_are_equal() -> None:

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:47)service_root = Path(__file__).parents[3]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:48)repo_root = service_root.parents[1]

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:49)> notification = yaml.safe_load((repo_root / "services/notification-service/docs/asyncapi.yaml").read_text())

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:50)^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:51)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:52)tests/clients/nats/test_vk_contract_equality.py:11:

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:53)_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:54)../../_temp/uv-python-dir/cpython-3.14.6-linux-x86_64-gnu/lib/python3.14/pathlib/__init__.py:787: in read_text

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:55)with self.open(mode='r', encoding=encoding, errors=errors, newline=newline) as f:

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:56)^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:57)_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:58)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:59)self = PosixPath('/home/runner/work/services/notification-service/docs/asyncapi.yaml')

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:60)mode = 'r', buffering = -1, encoding = 'locale', errors = None, newline = None

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:61)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:62)def open(self, mode='r', buffering=-1, encoding=None,

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:63)errors=None, newline=None):

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:64)"""

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:65)Open the file pointed to by this path and return a file object, as

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:66)the built-in open() function does.

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:67)"""

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:68)if "b" not in mode:

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:69)encoding = io.text_encoding(encoding)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:70)> return io.open(self, mode, buffering, encoding, errors, newline)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:71)^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:72)E FileNotFoundError: [Errno 2] No such file or directory: '/home/runner/work/services/notification-service/docs/asyncapi.yaml'

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:73)

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:74)../../_temp/uv-python-dir/cpython-3.14.6-linux-x86_64-gnu/lib/python3.14/pathlib/__init__.py:771: FileNotFoundError

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:75)=========================== short test summary info ============================

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:76)FAILED tests/clients/nats/test_vk_contract_equality.py::test_ut09_notification_and_vk_asyncapi_payload_and_headers_are_equal - FileNotFoundError: [Errno 2] No such file or directory: '/home/runner/work/services/notification-service/docs/asyncapi.yaml'

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:77)================= 1 failed, 267 passed, 21 deselected in 5.41s =================

[](https://github.com/igor-526/EqSiteCMS-vk-service/actions/runs/33170955628/job/98847710046#step:6:78)make: *** [Makefile:16: test] Error 1
```
# Задача
Необходимо исправить эти баги и не допустить их появления вновь