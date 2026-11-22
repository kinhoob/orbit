# Access preparation, not applied to production

This branch prepares code and a migration for review. It does not change Supabase Auth settings, exposed schemas, production policies, domains or deployment.

## Existing mobile app

`app.json` registers the `orbit` scheme. A development/standalone build containing this configuration can receive:

- `orbit://auth/callback` for confirmation/resend;
- `orbit://auth/callback?flow=recovery` for recovery.

Marco confirmed Expo Go on 22 November. Expo Go does NOT register the app's custom orbit scheme. The app detects Expo Go using Constants.expoVersion, which is non-null there, and refuses to send signup/resend/recovery mail without an explicit Expo Go callback. Password login for an already confirmed account does not require a callback and remains available.

For a temporary Expo Go test, obtain the actual server address reachable from the phone and configure its exact exp:// or exps:// URL ending in /--/auth/callback, plus the recovery query variant, in the app and Supabase allowlist after approval. Do not copy a localhost example or invent an IP. The server must remain reachable; changing its address invalidates that configuration. Accepting this URL in code is not evidence that an email client and Auth redirect have worked on the device.

Recommended stable route: make and install a development build containing the orbit scheme, then verify orbit://auth/callback on the phone before configuring Auth. This does not require a web domain or App Store publication. Build platform, signing, any service costs and installation remain separate decisions, not actions taken by this PR.

Official sources:
- https://docs.expo.dev/linking/into-your-app/ documents custom schemes requiring a new development build and Expo Go exp:// addresses with /--/ paths.
- https://docs.expo.dev/versions/latest/sdk/constants/ documents Constants.expoVersion as the Expo Go version, null outside Expo Go.
- https://docs.expo.dev/guides/authentication/ says Expo Go cannot test OAuth/OpenID redirects with customized schemes. That statement is not a blanket ban on email links, which must be validated separately.

There is no web app domain selected. The marketing landing page is not the app and must not be used as its callback. On web the code derives `/auth/callback` from the current app origin unless an explicit valid web callback is configured. It rejects a native callback on web, invalid paths, embedded credentials and non-local plain HTTP. The configured override must be platform-appropriate; do not reuse the mobile environment unchanged for web.

## Auth settings checklist, approval required

Observed 22 November: email confirmation on, email provider on, anonymous sign-in off, minimum password length 6, Site URL `http://localhost:3000`, no redirect allowlist.

After choosing the mobile run mode, add the exact confirmation and recovery callback URLs appropriate for that build. Keep confirmation on and anonymous sign-in off. Align the server password rules with the current app: at least 8 characters, uppercase, number and symbol. Do not silently change settings. Stronger server rules can affect future password changes, so test signup and recovery afterward. No hosting or new public domain is required merely to prepare the mobile app.

When a web app is actually deployed later, explicitly choose its Site URL and allowlist its exact callback URLs, including the recovery query variant. Never allow arbitrary wildcard domains to make a test pass.

## Private social helpers, approval required

Review `20261122202000_private_social_helpers.sql` separately. It moves the two SECURITY DEFINER helpers from `public` to `orbit_private`, retaining function OIDs so existing RLS dependencies follow them. It rewrites the textual nested call in `are_friends` and the textual reference in `friend_compatibility`. The compatibility function stays SECURITY INVOKER.

The private schema MUST NOT be included in Data API exposed schemas or extra search paths. Its grants let the existing policies execute the helpers inside PostgreSQL; they are not intended as client RPCs. No public wrapper is retained. Audit external SQL/code callers beyond this repo before applying. Do not solve this by adding `orbit_private` to API schemas. If that schema already exists remotely, inspect its owner, objects and grants before running this migration.

The live migration history contains only `login_preferences`, although older tables/functions exist. Do not run the whole historical directory against production. Compare current definitions with the reviewed baseline, take the normal backup, and apply only the reviewed new migration after authorization. This migration is not wired into startup or an automatic deploy.

## Repeatable checks

- `npm run typecheck`
- `npm test`
- `npm run test:sql`
- `npx expo export --platform web`

`test:sql` creates an isolated, in-memory PostgreSQL engine (PGlite), stubs the Auth user table and UID function, and applies the SQL only there. It checks the existing account/ranking suites plus friendship acceptance, friends-only visibility, blocks, anonymous public reads and compatibility after moving helpers. It does not connect to Supabase or prove PostgREST schema exposure, email delivery, JWT validation, installed mobile deep linking or real-device behavior. The account test fixtures now account for the new signup trigger creating settings automatically.

After authorized application, verify that anonymous/authenticated HTTP calls cannot resolve `public.is_blocked` or `public.are_friends`, that private schema selection is rejected by the Data API, and that normal profile/feed/friendship flows still work. Then run the real signup, confirmation, recovery, five-ratings, resume and second-device journey with approved test accounts. No production fixtures were created during preparation.
