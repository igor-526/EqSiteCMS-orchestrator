# notification-seed-data Specification

## Purpose
TBD - created by archiving change notification-service-initialization. Update Purpose after archive.
## Requirements
### Requirement: BaseSeeder
The system MUST provide an abstract base class for seeders with common lifecycle methods.

#### Scenario: Seeder lifecycle
- GIVEN a seeder implementation
- WHEN calling run()
- THEN prepare(), fetch_existing(), diff(), and create_missing() are called in sequence

### Requirement: SimpleSeeder
The system MUST provide a generic seeder for simple entity seeding with deduplication.

#### Scenario: Seed new entities
- GIVEN a list of seed entities with fixed UUIDs
- WHEN running the seeder
- THEN only missing entities are inserted

#### Scenario: Skip existing entities
- GIVEN entities that already exist in the database
- WHEN running the seeder
- THEN existing entities are not duplicated

### Requirement: ChannelSeeder
The system MUST provide a seeder for notification channels.

#### Scenario: Seed channels
- GIVEN CHANNEL_SEEDS with email, vk, sms channels
- WHEN running ChannelSeeder
- THEN channels are persisted in notification_channels table

### Requirement: EventSeeder
The system MUST provide a seeder for notification events.

#### Scenario: Seed callback event
- GIVEN EVENT_SEEDS with callback_request event
- WHEN running EventSeeder
- THEN event is persisted in notification_events table with metadata

### Requirement: init_registry
The system MUST provide initialization function for migrations and seeding.

#### Scenario: Apply migrations and seed
- GIVEN the application starts
- WHEN calling init_registry()
- THEN migrations are applied and seeders run with retry logic

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

