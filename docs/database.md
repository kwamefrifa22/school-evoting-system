
# Database Infrastructure Documentation

This application is prototyped using **Cloud Firestore** for real-time reactivity, but it is fully compatible with relational structures like **Supabase/PostgreSQL**.

## SQL Implementation (Supabase)
For your Supabase setup, please refer to the `docs/schema.sql` file. It contains the DDL (Data Definition Language) to create the following tables:

### `classes`
- `id` (uuid): Primary key.
- `name` (text): Class name (e.g., "Grade 6A").
- `population` (int): Number of students.
- `votes_cast` (int): Counter for used tokens.

### `positions`
- `id` (uuid): Primary key.
- `name` (text): Electoral role title.
- `order_index` (int): Sorting sequence.

### `candidates`
- `id` (uuid): Primary key.
- `position_id` (uuid): Foreign key to `positions`.
- `full_name` (text): Candidate name.
- `photo_url` (text): URL to portrait image.
- `votes` (int): Total votes received.

### `voter_tokens`
- `id` (text): 6-digit unique code.
- `class_id` (uuid): Foreign key to `classes`.
- `status` (text): "unused" | "used".
- `used_at` (timestamp): When the vote was recorded.

## Migration Utilities
I have provided standard Supabase SSR helpers in `src/utils/supabase/` to help you manage sessions and data fetching in your local environment.

## Prototype Environment
Please note that the **Live Preview** in this Studio continues to use **Firebase**. This ensures that the real-time AI Insights and the Live Activity Feed remain fully functional during the design process.
