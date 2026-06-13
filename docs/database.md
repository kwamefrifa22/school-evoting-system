
# Database Infrastructure Documentation (Supabase/PostgreSQL)

This application uses **Supabase (PostgreSQL)** for data storage and real-time updates.

## SQL Implementation
Run the script in `docs/schema.sql` in your Supabase SQL Editor.

### `classes`
- `id` (uuid): Primary key.
- `name` (text): Class name (e.g., "Grade A1").
- `population` (int): Total students in the class.
- `votes_cast` (int): Counter for used tokens.

### `positions`
- `id` (uuid): Primary key.
- `name` (text): Role title (e.g., "Head Boy").
- `order_index` (int): Sort sequence.

### `candidates`
- `id` (uuid): Primary key.
- `position_id` (uuid): FK to `positions`.
- `full_name` (text): Candidate name.
- `photo_url` (text): Portrait image URL.
- `votes` (int): Tally of received votes.

### `voter_tokens`
- `id` (text): Unique code.
- `class_id` (uuid): FK to `classes`.
- `status` (text): "unused" | "used".
- `used_at` (timestamp): Recorded timestamp of the vote.

### `system_config`
- `id` (text): "election_status".
- `is_open` (boolean): Controls whether polls are accessible.
- `opened_at` (timestamp with time zone): The time the election was opened.

## Real-time Integration
All tables have **Supabase Realtime** enabled via the `supabase_realtime` publication.
