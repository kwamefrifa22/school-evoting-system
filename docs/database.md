
# Database Schema Documentation

This application uses **Cloud Firestore** for its real-time backend. Below is the document-based schema and its relational SQL equivalent for reference.

## Firestore Collections (Active)

### `classes`
- `id` (string): Unique identifier.
- `name` (string): e.g., "Grade 6A".
- `population` (number): Total students.
- `votes_cast` (number): Atomic counter of used tokens.

### `positions`
- `id` (string): Unique identifier.
- `name` (string): Role title.
- `order_index` (number): Sorting order.

### `candidates`
- `id` (string): Unique identifier.
- `position_id` (string): Reference to positions.
- `full_name` (string): Candidate name.
- `photo_url` (string): Portrait URL.
- `votes` (number): Atomic vote count.

### `voter_tokens`
- `id` (string): 6-character unique code.
- `class_id` (string): Reference to classes.
- `status` (string): "unused" | "used".
- `used_at` (timestamp): When the vote was cast.

## SQL Schema Reference (Exportable)
For users preferring a relational structure (e.g., Supabase/PostgreSQL), the following DDL defines the equivalent structure.

```sql
-- See docs/schema.sql for the full implementation
```
