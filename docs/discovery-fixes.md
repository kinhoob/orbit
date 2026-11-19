# Discovery and timeline fixes

Public catalogue search filters normalized results by the selected category. The existing provider classification of animation is unchanged.

Likes update TanStack Query data for the signed-in account, cancel in-flight timeline reads, prevent overlapping writes and refetch after success/failure. Errors roll back only the affected review. There is no permanent local override hiding refreshed counts. Switching accounts remounts timeline state, including watermarks; people search keys also include the account.

Apply `supabase/migrations/202611190001_discover_ranking.sql` after the existing migrations. `discover_timeline` ranks the full eligible public review set by visible likes, then date and UUID, before limiting the page. It executes as the caller with RLS, not as an administrator. The watermark covers the eligible set independently of the top 50. The UI requires this migration; there is no silent fallback to the incorrect latest-100 ranking.

Mural cards open `/curated/[id]`. This route resolves actual catalogue rows by title, category and release year and redirects to `/media/[id]` when there is one match. Multiple matches are presented for selection. Without a connected/matching catalogue row, it shows the real local metadata and explains why saving/rating is unavailable. It never invents UUIDs or grants client catalogue-write permissions.

Validation: run `npm run typecheck` and `npm test`. `supabase/tests/discover_ranking.sql` verifies ranking beyond 100 newer reviews, page limits, watermark, private content and blocked authors on a disposable Supabase database, in a rolled-back transaction. The SQL test requires the actual database; mocked client tests do not validate RLS.
