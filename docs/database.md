
# Database Schema Documentation (Firestore)

This application uses Google Cloud Firestore (NoSQL) to manage electoral data. Below is the structure and purpose of each collection.

## Collections

### `classes`
Stores information about each student group.
- `id` (string): Unique identifier.
- `name` (string): Name of the class (e.g., "Grade 6A").
- `population` (number): Total students in the class.
- `votes_cast` (number): Current count of used tokens from this class.

### `positions`
Stores the roles being contested.
- `id` (string): Unique identifier.
- `name` (string): Role title (e.g., "School Prefect").
- `order_index` (number): Sorting order for UI.

### `candidates`
Stores details of students running for office.
- `id` (string): Unique identifier.
- `position_id` (string): Reference to the `positions` collection.
- `full_name` (string): Candidate's name.
- `photo_url` (string): URL to candidate's portrait.
- `votes` (number): Current vote tally.

### `voter_tokens`
Stores the unique IDs generated for students.
- `id` (string): The actual token code (randomized string).
- `class_id` (string): Reference to the `classes` collection.
- `status` (string): Either `unused` or `used`.
- `used_at` (timestamp/string): When the token was consumed.

## Business Logic
1. **Token Generation**: Each class is assigned `population + 5` tokens.
2. **One-Time Use**: When a student enters a token, the system checks if it exists and has status `unused`.
3. **Atomic Updates**: On vote submission, the token status is updated to `used`, the class `votes_cast` is incremented, and the candidate `votes` are incremented.
