# notification-database-models Specification

## Purpose
TBD - created by archiving change notification-service-initialization. Update Purpose after archive.
## Requirements
### Requirement: Channel Model
The system MUST provide a Channel model for storing notification delivery channels.

#### Scenario: Create channel record
- GIVEN valid channel data (code, name, description)
- WHEN creating a new channel
- THEN the channel is persisted with UUID, timestamps, and is_active=True

#### Scenario: Unique channel code
- GIVEN a channel with code "email" exists
- WHEN creating another channel with code "email"
- THEN the system raises a unique constraint violation

### Requirement: Event Model
The system MUST provide an Event model for storing notification events with metadata.

#### Scenario: Create event with metadata
- GIVEN valid event data with metadata JSON
- WHEN creating a new event
- THEN the event is persisted with metadata for validation

#### Scenario: Event metadata structure
- GIVEN an event with metadata containing field definitions
- WHEN accessing metadata
- THEN the system returns dict[str, dict[str, str]] structure

### Requirement: UserNotificationSetting Model
The system MUST provide a UserNotificationSetting model for storing user preferences.

#### Scenario: Create user setting
- GIVEN valid user_id, action_id (event), and channel_id
- WHEN creating a new setting
- THEN the setting is persisted with foreign keys to events and channels

#### Scenario: Unique user setting
- GIVEN a setting for user_id + action_id + channel_id exists
- WHEN creating duplicate setting
- THEN the system raises a unique constraint violation

### Requirement: Seed Data
The system MUST seed initial data for channels and events.

#### Scenario: Seed channels
- GIVEN the migration runs
- WHEN checking notification_channels table
- THEN email, vk, and sms channels exist

#### Scenario: Seed callback event
- GIVEN the migration runs
- WHEN checking notification_events table
- THEN callback_request event exists with metadata

