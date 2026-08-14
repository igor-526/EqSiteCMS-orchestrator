# notification-orchestrator

## Overview

Сервис оркестрации пайплайна обработки событий notification-service. Координирует взаимодействие между NATS, main backend, БД и каналами доставки.

## ADDED Requirements

### Requirement: NotificationOrchestratorService
The system MUST provide an orchestrator service for processing notification events.

#### Scenario: Process callback_request event
- GIVEN a callback_request event with phone, comment, equestrian_id
- WHEN calling process_event
- THEN the event is validated, recipients found, and email notification sent

#### Scenario: Validate event payload
- GIVEN an event with metadata defining required fields
- WHEN processing event with missing required field
- THEN InvalidPayloadError is raised

### Requirement: EventHandlerRegistry
The system MUST provide a registry for mapping event codes to handlers.

#### Scenario: Get handler for known event
- GIVEN a handler registered for "callback_request"
- WHEN calling get_handler with "callback_request"
- THEN the handler instance is returned

#### Scenario: Get handler for unknown event
- GIVEN no handler for "unknown_event"
- WHEN calling get_handler with "unknown_event"
- THEN HandlerNotFoundError is raised

### Requirement: CallbackEventHandler
The system MUST provide a handler for formatting callback_request notifications.

#### Scenario: Format email notification
- GIVEN callback_request payload and channel_code="email"
- WHEN calling format_notification
- THEN EmailNotificationData with subject and HTML body is returned

#### Scenario: Unsupported channel
- GIVEN callback_request payload and channel_code="sms"
- WHEN calling format_notification
- THEN UnsupportedChannelError is raised
