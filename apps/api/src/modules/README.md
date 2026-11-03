# Business modules

Implemented modules: health, auth, posts, moments, media, taxonomy and publishing.

All routes are authenticated by the global AuthGuard except the health check and
login. Every mutation checks an allowed Origin and JSON content type; authenticated
mutations also require X-CSRF-Token. Sessions are stored server-side with hashed
random tokens. There is no registration endpoint; all existing users are trusted
administrators created with the local admin:init command.

Media multipart uploads require the same session, Origin and CSRF guard; only that
handler opts into multipart instead of JSON. Storage keys are server-generated
under ai-dramas/blog/, using server-only credentials. No remote deletion API.

Taxonomy CRUD includes counts, search and optimistic versions. Posts support one
category and multiple tags; removing taxonomy preserves posts and invalidates
stale post editors. All taxonomy routes use the global authentication/CSRF guard.

Publishing builds a consistent content snapshot in a separate workspace without
API credentials, and atomically switches the live version on success. Saving
PUBLISHED alone doesn't deploy; publishing is triggered explicitly. users/settings
remain for later work.
