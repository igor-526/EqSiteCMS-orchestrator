GlitchTip error event
Source: https://glitchtip.eqcms.ru
Instance: https://glitchtip.eqcms.ru
Organization: equestrian-site-cms
Issue ID: 3
Event ID: 01a03d0d2b2e7c9391e05ed03e8af8e2
Event URL: https://glitchtip.eqcms.ru/equestrian-site-cms/issues/3?project=3

Raw event JSON:
```json
{
  "platform": "python",
  "errors": null,
  "id": "01a03d0d2b2e7c9391e05ed03e8af8e2",
  "eventID": "e70bc420ffdf4b25b3473d37cc3a3e8a",
  "projectID": 3,
  "groupID": "3",
  "dateCreated": "2026-08-26T07:51:08.019Z",
  "dateReceived": "2026-08-26T07:51:08.334Z",
  "dist": null,
  "culprit": "",
  "packages": {
    "h11": "0.16.0",
    "six": "1.17.0",
    "amqp": "5.3.1",
    "idna": "3.18",
    "mako": "1.4.1",
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
    "nats-py": "2.15.0",
    "tzlocal": "5.4.4",
    "urllib3": "2.7.0",
    "uvicorn": "0.52.1",
    "wcwidth": "0.8.2",
    "billiard": "4.2.4",
    "greenlet": "3.5.4",
    "pydantic": "2.13.4",
    "aiosignal": "1.4.0",
    "dnspython": "2.8.0",
    "httptools": "0.8.0",
    "multidict": "6.7.1",
    "packaging": "26.3",
    "propcache": "0.5.2",
    "starlette": "1.4.1",
    "aiosmtplib": "5.1.2",
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
    "annotated-types": "0.8.0",
    "email-validator": "2.3.0",
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
  "message": "UnexpectedEOF: nats: unexpected EOF",
  "metadata": {
    "type": "UnexpectedEOF",
    "value": "nats: unexpected EOF"
  },
  "tags": [
    {
      "key": "environment",
      "value": "production"
    },
    {
      "key": "server_name",
      "value": "eqcms-email-service-deployment-58d8597d96-2q7fb"
    }
  ],
  "entries": [
    {
      "type": "exception",
      "data": {
        "values": [
          {
            "type": "UnexpectedEOF",
            "value": "nats: unexpected EOF",
            "module": "nats.errors",
            "mechanism": {
              "type": "logging",
              "handled": true
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
            "category": "uvicorn.error",
            "message": "Started server process [10]",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-24T18:22:35.323Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Waiting for application startup.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-24T18:22:35.324Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Application startup complete.",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-24T18:22:35.336Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-24T18:22:35.337Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.email_processing",
            "message": "Processing incoming email event: event_uuid=ca102848-3d25-44af-8ab8-3da2b8ea2c66",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.147Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.148Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": ";",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.149Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.150Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO email_logs (id, event_uuid, \"to\", subject, body, cc, bcc, reply_to, from_name, from_email, status, attempts, created_at, updated_at) VALUES ($1::UUID, $2::UUID, $3::JSON, $4::VARCHAR, $5::VARCHAR, $6::JSON, $7::JSON, $8::VARCHAR, $9::VARCHAR, $10::VARCHAR, $11::VARCHAR, $12::INTEGER, $13::TIMESTAMP WITH TIME ZONE, $14::TIMESTAMP WITH TIME ZONE) ON CONFLICT (event_uuid) DO NOTHING RETURNING email_logs.id, email_logs.event_uuid, email_logs.\"to\", email_logs.subject, email_logs.body, email_logs.cc, email_logs.bcc, email_logs.reply_to, email_logs.from_name, email_logs.from_email, email_logs.status, email_logs.error_message, email_logs.attempts, email_logs.created_at, email_logs.sent_at, email_logs.updated_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.153Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.153Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO email_logs (id, event_uuid, \"to\", subject, body, cc, bcc, reply_to, from_name, from_email, status, attempts, created_at, updated_at) VALUES ($1::UUID, $2::UUID, $3::JSON, $4::VARCHAR, $5::VARCHAR, $6::JSON, $7::JSON, $8::VARCHAR, $9::VARCHAR, $10::VARCHAR, $11::VARCHAR, $12::INTEGER, $13::TIMESTAMP WITH TIME ZONE, $14::TIMESTAMP WITH TIME ZONE) ON CONFLICT (event_uuid) DO NOTHING RETURNING email_logs.id, email_logs.event_uuid, email_logs.\"to\", email_logs.subject, email_logs.body, email_logs.cc, email_logs.bcc, email_logs.reply_to, email_logs.from_name, email_logs.from_email, email_logs.status, email_logs.error_message, email_logs.attempts, email_logs.created_at, email_logs.sent_at, email_logs.updated_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.154Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "repositories.email_log",
            "message": "Created email_log id=be047eca-4648-4b6d-9657-0c1ff4bfac31 event_uuid=ca102848-3d25-44af-8ab8-3da2b8ea2c66",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.158Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.email_processing",
            "message": "Created email_log id=be047eca-4648-4b6d-9657-0c1ff4bfac31, dispatching to Celery",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.158Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.159Z",
            "event_id": null
          },
          {
            "type": "redis",
            "category": "redis",
            "message": "PING",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.374Z",
            "event_id": null
          },
          {
            "type": "redis",
            "category": "redis",
            "message": "redis.pipeline.execute",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.376Z",
            "event_id": null
          },
          {
            "type": "redis",
            "category": "redis",
            "message": "SADD '_kombu.binding.email' [Filtered]",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.377Z",
            "event_id": null
          },
          {
            "type": "redis",
            "category": "redis",
            "message": "LPUSH 'email' [Filtered]",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.378Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.handlers.notification_commands_send_email",
            "message": "Dispatched email_log_id=be047eca-4648-4b6d-9657-0c1ff4bfac31 to Celery",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:23:51.379Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.email_processing",
            "message": "Processing incoming email event: event_uuid=8627bab2-9ec2-4f1b-8c9e-3813f95282ed",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.018Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.020Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": ";",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.021Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.021Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO email_logs (id, event_uuid, \"to\", subject, body, cc, bcc, reply_to, from_name, from_email, status, attempts, created_at, updated_at) VALUES ($1::UUID, $2::UUID, $3::JSON, $4::VARCHAR, $5::VARCHAR, $6::JSON, $7::JSON, $8::VARCHAR, $9::VARCHAR, $10::VARCHAR, $11::VARCHAR, $12::INTEGER, $13::TIMESTAMP WITH TIME ZONE, $14::TIMESTAMP WITH TIME ZONE) ON CONFLICT (event_uuid) DO NOTHING RETURNING email_logs.id, email_logs.event_uuid, email_logs.\"to\", email_logs.subject, email_logs.body, email_logs.cc, email_logs.bcc, email_logs.reply_to, email_logs.from_name, email_logs.from_email, email_logs.status, email_logs.error_message, email_logs.attempts, email_logs.created_at, email_logs.sent_at, email_logs.updated_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.023Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.023Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "repositories.email_log",
            "message": "Created email_log id=1fc73a36-94cf-4c9f-8f9f-cc05255b1a66 event_uuid=8627bab2-9ec2-4f1b-8c9e-3813f95282ed",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.026Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.email_processing",
            "message": "Created email_log id=1fc73a36-94cf-4c9f-8f9f-cc05255b1a66, dispatching to Celery",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.026Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.027Z",
            "event_id": null
          },
          {
            "type": "redis",
            "category": "redis",
            "message": "LPUSH 'email' [Filtered]",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.031Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.handlers.notification_commands_send_email",
            "message": "Dispatched email_log_id=1fc73a36-94cf-4c9f-8f9f-cc05255b1a66 to Celery",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:24:20.031Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.email_processing",
            "message": "Processing incoming email event: event_uuid=e0206269-4838-4372-a36b-3fa88aaf218f",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.062Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.063Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": ";",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.064Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "ROLLBACK;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.065Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "INSERT INTO email_logs (id, event_uuid, \"to\", subject, body, cc, bcc, reply_to, from_name, from_email, status, attempts, created_at, updated_at) VALUES ($1::UUID, $2::UUID, $3::JSON, $4::VARCHAR, $5::VARCHAR, $6::JSON, $7::JSON, $8::VARCHAR, $9::VARCHAR, $10::VARCHAR, $11::VARCHAR, $12::INTEGER, $13::TIMESTAMP WITH TIME ZONE, $14::TIMESTAMP WITH TIME ZONE) ON CONFLICT (event_uuid) DO NOTHING RETURNING email_logs.id, email_logs.event_uuid, email_logs.\"to\", email_logs.subject, email_logs.body, email_logs.cc, email_logs.bcc, email_logs.reply_to, email_logs.from_name, email_logs.from_email, email_logs.status, email_logs.error_message, email_logs.attempts, email_logs.created_at, email_logs.sent_at, email_logs.updated_at",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.066Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "BEGIN;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.067Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "repositories.email_log",
            "message": "Created email_log id=187af4fb-127e-46a8-9173-2e200e0816ee event_uuid=e0206269-4838-4372-a36b-3fa88aaf218f",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.069Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "core.services.email_processing",
            "message": "Created email_log id=187af4fb-127e-46a8-9173-2e200e0816ee, dispatching to Celery",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.069Z",
            "event_id": null
          },
          {
            "type": "default",
            "category": "query",
            "message": "COMMIT;",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.069Z",
            "event_id": null
          },
          {
            "type": "redis",
            "category": "redis",
            "message": "LPUSH 'email' [Filtered]",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.073Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "clients.nats.handlers.notification_commands_send_email",
            "message": "Dispatched email_log_id=187af4fb-127e-46a8-9173-2e200e0816ee to Celery",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-25T19:28:53.074Z",
            "event_id": null
          },
          {
            "type": "log",
            "category": "uvicorn.error",
            "message": "Shutting down",
            "data": null,
            "level": "info",
            "timestamp": "2026-08-26T07:51:07.970Z",
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
      "trace_id": "3a69b4d199c64d62ab37540f8f360faf",
      "span_id": "809a89a51e11a6df"
    },
    "runtime": {
      "type": "runtime",
      "name": "CPython",
      "version": "3.14.6"
    }
  },
  "context": {
    "asctime": "2026-08-26 07:51:08,007",
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
  "title": "UnexpectedEOF: nats: unexpected EOF",
  "userReport": null,
  "nextEventID": null,
  "previousEventID": null
}
```