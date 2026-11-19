# Fluid navigation and clearer paths

This branch builds on `fix/discovery-likes-ranking` (PR #7). It does not merge or deploy either change.

Implemented:

- Mobile tabs have short labels and a sliding active indicator. Native stack transitions take 220 ms; reduced-motion preferences disable them. Existing press responses, drawer gestures and bounded card entrances remain in place.
- Feed, catalogue search and media details use fixed-geometry skeleton groups with a single opacity animation per group. Reduced motion disables pulsing.
- Likes and saved icons pulse briefly when their real/optimistic state changes. Saving immediately changes the cached state, prevents duplicate writes, rolls back failures and refetches authoritative data. Feedback is inline, animated and accessible. Saving a work no longer resets an unchanged rating draft.
- Create opens work selection directly, with the two-step explanation. Search separates works and people. People open a real profile protected by existing RLS, and link to friendship management with the name prefilled.
- An optional first-access interest chooser organizes the local curation. Preferences are stored on the device, separately per account, with a skip option and an edit entry. This is not ORBIT Daily or a server recommendation system.
- Escape on web and Android back close the drawer before navigating away.
- Timelines preserve their reading order while background like counts refresh. Explicit refresh or accepting new posts replaces that order; removed/RLS-hidden rows disappear immediately.

The update uses existing dependencies. It does not add a shared-element cover transition: the native stack slides and existing screen entrance are used. Web stack behavior may differ. Real frame rate, keyboard behavior, loading geometry and assistive technology still require device/browser verification.

Manual checks after installing dependencies:

1. `npm install`, `npm run typecheck`, `npm test`.
2. At 390px and desktop widths, navigate all tabs and open a work. Check labels, focus and active indicator; use Android back/web Escape with the drawer open.
3. Enable Reduce Motion and verify pulses, entrance transitions and tab movement stop.
4. Throttle the network. Check skeletons, repeated saves, offline rollback and error retry. Keep a rating draft while saving a work.
5. Search works versus people, open a profile and friendship management. Create should start with work selection.
6. First access: select interests, skip, edit, reload and switch accounts; only the local curated suggestions change.

No Supabase migration or remote database write was performed by this UI update. The global ranking migration from PR #7 remains a prerequisite for that feed.
