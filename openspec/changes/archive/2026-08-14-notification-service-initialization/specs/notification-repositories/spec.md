# notification-repositories

## Overview

Репозиторный слой для CRUD операций с данными notification-service. Предоставляет абстракцию над SQLAlchemy для работы с каналами, событиями и настройками уведомлений.

## ADDED Requirements

### Requirement: BaseRepository
The system MUST provide a base repository with common CRUD operations.

#### Scenario: Get entity by ID
- GIVEN an existing entity with known UUID
- WHEN calling get_by_id with that UUID
- THEN the entity is returned

#### Scenario: Get all entities
- GIVEN multiple entities exist
- WHEN calling get_all with offset and limit
- THEN paginated list is returned

### Requirement: ChannelRepository
The system MUST provide a repository for channel operations.

#### Scenario: Get channel by code
- GIVEN a channel with code "email" exists
- WHEN calling get_by_code with "email"
- THEN the channel is returned

#### Scenario: Get active channels
- GIVEN channels with is_active=True and is_active=False
- WHEN calling get_active_channels
- THEN only active channels are returned

### Requirement: EventRepository
The system MUST provide a repository for event operations.

#### Scenario: Get event by code
- GIVEN an event with code "callback_request" exists
- WHEN calling get_by_code with "callback_request"
- THEN the event is returned

### Requirement: UserNotificationSettingRepository
The system MUST provide a repository for user notification settings.

#### Scenario: Get user settings for event
- GIVEN settings for user_id and event_id
- WHEN calling get_by_user_and_event
- THEN list of settings with channels is returned

#### Scenario: Get users subscribed to event
- GIVEN multiple users with settings for an event
- WHEN calling get_users_by_event
- THEN list of user_ids is returned
