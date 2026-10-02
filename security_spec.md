# Security Specification for Alexandria Personal Library

## 1. System Architecture & Scope
- **Domain**: Personal single-user digital library with 3D/2D reader, persistent progress, notes, and profile settings.
- **Persistence Model**: Firebase Firestore as the persistent cerebral layer, Firebase Cloud Storage as the physical book/media archive layer.
- **User Scope**: Single-user personal workspace. No multi-tenant partitions or cross-user permissions needed.

## 2. Invariants & Data Integrity
1. **Books Collection (`/books/{bookId}`)**:
   - `bookId` must be a valid alphanumeric identifier (max 128 characters).
   - `title`, `author`, `coverPath`, `contentPath` must be valid strings.
   - `status` must be one of: `"unread"`, `"reading"`, `"paused"`, `"finished"`.
   - `currentPage`, `progress`, and `readingOrder` must be numeric values.
   - `progress` must be bounded between `0.0` and `1.0`.

2. **Notes Subcollection (`/books/{bookId}/notes/{noteId}`)**:
   - Belongs to a valid parent book.
   - `page` must be a positive integer or 0.
   - `content` must be a non-empty string under 20,000 characters.

3. **Profile Settings (`/profile/{settingsDoc}`)**:
   - `name` must be a valid string under 200 characters.
   - `avatarPath` must be a string under 1000 characters if present.
