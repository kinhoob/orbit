# Account menu and profile timeline

This branch builds on PR #8 and includes its dependency on PR #7. It adds the following functional routes:

| Area | Behaviour |
| --- | --- |
| My profile | Existing profile editing, avatar when available, cosmetic header, actual XP summary and paginated newest-first reviews, including links to edit own reviews |
| My library | Private saved items, status filters and moving between planned/in_progress/completed |
| My collections | Create, edit title/description/visibility, add/remove catalogue works, explicit confirmation for deletion |
| Friends | Existing mutual friendship workflow plus links to actual profiles |
| History | Earliest save/rating per work, privately stored by backend triggers; no invented Daily history |
| Achievements | Server ledger totals, configured levels and milestones based on distinct rated works / first collection |
| Customization | Preview and equip profile themes/frames/badges unlocked by XP; backend validates eligibility |
| Settings | Default visibility for new ratings, notification badge preference, reduced motion and unblock list |
| Help | FAQ and explicit user-reviewed GitHub feedback draft; never automatic transmission |

The same scrollable account menu is used in mobile drawer and desktop sidebar. It shows profile metadata and XP only when successfully read. Guests receive sign-in routes for personal areas. Existing .env remains untouched.

## Backend

Apply `202611190002_account_universe.sql` after all previous migrations in a **development** database. It creates owner-only account_settings, immutable discovery_history and xp_transactions, read-only XP/level settings, cosmetic profile columns and protected compatibility for accepted friends (default five shared visible ratings). Historical ratings/saves are backfilled with their recorded dates. XP is granted once per distinct rated work and once for the first collection; deletion/recreation and repeated requests cannot duplicate the same reward. Transaction uniqueness and database triggers enforce this; no client writes to XP/history are granted.

This is an initial participation XP implementation, not the full ORBIT Daily, timed challenges, paid cosmetic store or GIF/sticker inventory. Cosmetic items here unlock by lifetime XP, not purchases. Historic recommendations are not fabricated; history contains only actual saves/ratings. Profile-level cosmetics do not change the whole app theme.

## Verification

Run `npm run typecheck` and `npm test`. `supabase/tests/account_universe.sql` checks duplicate XP, read-only grants, cosmetic gating, private data isolation and no compatibility without friendship, with rolled-back fixtures. `supabase/tests/discover_ranking.sql` from PR #7 remains relevant. These SQL tests require Supabase and cannot be replaced by Node mocks.

Manual checks: mobile drawer scroll with all entries, desktop sidebar, public vs friends/private collections with users A/B/C, own vs others timelines and pagination, library statuses, collection add/remove/delete, persisted settings, reduced motion, block/unblock, locked/unlocked cosmetic attempts, and stale/offline operations. Missing backend migrations display honest errors/empty-unavailable summaries rather than fabricated XP or collections.
