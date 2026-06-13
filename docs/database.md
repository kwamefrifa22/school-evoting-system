
# Database Infrastructure Documentation (Supabase/PostgreSQL)

This application has been migrated from Firebase to **Supabase (PostgreSQL)** to provide a relational structure while maintaining real-time capabilities.

## SQL Implementation
The following tables are defined in `docs/schema.sql` and must be created in your Supabase SQL Editor:

### `classes`
Tracks student groups and their voting progress.
- `id` (uuid): Primary key.
- `name` (text): Class name (e.g., "Grade A1").
- `population` (int): Total students in the class.
- `votes_cast` (int): Counter for used tokens.

### `positions`
Electoral roles available for contest.
- `id` (uuid): Primary key.
- `name` (text): Role title (e.g., "Head Boy").
- `order_index` (int): Sort sequence.

### `candidates`
Registered candidates contesting for specific positions.
- `id` (uuid): Primary key.
- `position_id` (uuid): FK to `positions`.
- `full_name` (text): Candidate name.
- `photo_url` (text): Portrait image URL.
- `votes` (int): Tally of received votes.

### `voter_tokens`
Unique one-time identifiers for student authentication.
- `id` (text): Unique code (prefixed by class name, e.g., "G6A-123456").
- `class_id` (uuid): FK to `classes`.
- `status` (text): "unused" | "used".
- `used_at` (timestamp): Recorded timestamp of the vote.

### `system_config`
Global settings for the election.
- `id` (text): "election_status".
- `is_open` (boolean): Controls whether polls are accessible.
- `opened_at` (timestamp with time zone): The time the election was opened.

## Real-time Integration
All tables have **Supabase Realtime** enabled. The frontend uses PostgreSQL change listeners to update dashboards instantly as votes are cast.

## Token Generation Logic
- **Target**: `Class Population + 5` (for reserve/troubleshooting).
- **Prefix**: First 3 characters of class name (e.g., "G6A-").
- **Randomization**: 6-digit random suffix to ensure security.
