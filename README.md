# Ba-booze CRM

A shared band workspace for venue outreach, confirmed gigs, follow-ups and INR payments. React + TypeScript + Vite, Firebase Google Authentication, Cloud Firestore and static Firebase Hosting. No server, Cloud Functions, billing account, paid services, push messaging, SMS or email reminders.

**Access model:** anyone with the app URL and a Google account can sign in, read, add, edit and permanently delete all shared CRM records. There is no approval, invitation, allowlist or administrator role. All authenticated members can see member profiles. A member can change only their own preferences; identity is refreshed from Google Authentication. Profiles cannot be deleted through the client. Do not put private information here that you would not share with everyone who can reach the URL and sign in with Google.

## Current verification status

Dependency updates are installed and verified under Node 24.22.2. Full TypeScript checking, lint, 21 Vitest unit/component tests, 11 business-rule tests, 14 service-adapter tests, static checks and the production build passed. The lockfile is current. See [DEPENDENCY_NOTES.md](DEPENDENCY_NOTES.md).

Local integration checks now pass: 8 official Firestore rules tests, 9 browser smoke tests, and 6 authenticated browser tests across iPhone, Android and desktop profiles. The latter covers the full venue/gig/payment/follow-up workflow. These results come from the documented successful runs; see [VERIFICATION.md](VERIFICATION.md).

The supplied real Firebase web configuration is now stored locally in ignored `.env.local`, with emulator mode off. The user created Firestore and successfully published the tested rules/indexes. Real Google sign-in and live CRM behavior still need verification. The user has created the real Firestore database and published its rules/indexes. Confirm index builds finish, then verify real Google sign-in and live CRM behavior. Hosting and physical-device PWA installation remain pending. The latest supplied audit still reports 5 moderate findings under Firebase CLI tooling; these remain unresolved. The user published database rules/indexes only; no Hosting or Functions deployment or billing change was performed.

## Folder structure

```text
src/
  App.tsx               Authentication gate and responsive navigation
  main.tsx              Entry point and production service-worker registration
  lib/
    business.ts         Pure INR, IST, eligibility and conflict rules
    domain.ts           Zod schemas, TypeScript models and Timestamp helpers
    firebase.ts         Environment configuration; memory-only Firestore cache
    data.ts             Online reads, transactions, audit fields and cascades
    hooks.ts            Pagination, connection status and app clock
    session.tsx         Authenticated user/profile context
    install.ts          Deferred browser installation prompt
  components/           Accessible fields, forms, confirmations and gig fields
  pages/                Dashboard, venues, gigs, payments, reminders, settings
public/                 Manifest, original PNG icons, static-only service worker
scripts/                PWA build finalizer and portable business/service checks
tests/                  Unit, component, rules, browser and service tests
firestore.rules         Authentication, profile ownership, schema and audit rules
firestore.indexes.json  Query indexes
firebase.json           Hosting SPA fallback and emulator configuration
```

## Prerequisites and local startup

Use Node 24 (recommended) or Node 22.18+ within the Node 22 release line, npm, and a Java 21+ JDK for the Firestore emulator. Node 26 is outside the supported engine range of the Firebase CLI dependency `superstatic`. Dependency and emulator/browser downloads require network access. This is a completely new project, with no dependency on the previous Next.js/Supabase experiment.

```sh
cd ~/Documents/Ba-booze-CRM
npm install
cp .env.example .env.local
npm run dev
```

Without Firebase configuration the app shows an explicit setup screen. Fill `.env.local` with the Firebase web configuration described below, then restart Vite. Do not copy real credentials into `.env.example`. Environment files are ignored. When installation succeeds, retain and commit the generated `package-lock.json`; use `npm ci` for subsequent installations. Build and test before release.

Firebase web configuration is public client configuration, not an authorization secret. Authentication and the checked-in Security Rules enforce access. Never put a service-account key, Google OAuth client secret, Firebase CLI login token or private credential in a Vite variable or source file.

## No-cost Firebase console setup

These are account actions for the band to perform; none were performed by the implementation agent.

1. Create a Firebase project on the **Spark plan**. Do not attach billing or enable Blaze. Google Analytics is unnecessary for this app.
2. Register a Web app and copy `apiKey`, `authDomain`, `projectId` and `appId` into the matching `VITE_FIREBASE_*` variables in `.env.local`.
3. In Authentication → Sign-in method, enable **Google only** and select the required project support email. Do not enable anonymous or password authentication.
4. In Authentication settings, add `localhost` for development and the eventual Firebase Hosting domain to Authorized domains. New projects may not include localhost automatically. Use the same origin consistently during Google sign-in.
5. Create the default Cloud Firestore database in **production mode**, Standard edition, while remaining on Spark. Choose an available region near the band: `asia-south1` (Mumbai) or `asia-south2` (Delhi), if offered. The location choice is effectively permanent; confirm it in the console before creation. See [Firestore locations](https://firebase.google.com/docs/firestore/locations).
6. Deploy the checked-in Firestore rules and indexes before using CRM data. Do not use test-mode open rules. Wait for indexes to finish building.
7. Do not create Storage buckets, Cloud Functions, scheduled jobs, notification services, paid domains or other services for this application. If the console requires billing for an optional operation, stop that operation. The alternative is the Spark-compatible static Hosting + Authentication + Firestore setup here.

App Check is deferred. Optional hardening can use a currently no-cost web provider after testing Safari, Android and local development; check the provider's current terms and quotas first. It is defense in depth and never replaces Security Rules. No App Check account or paid resource is created automatically.

## Local emulators — no real Firebase project needed

Use **only a demo project ID** for emulator testing. Do not point tests at a live project. Set this local configuration:

```dotenv
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-ba-booze
VITE_FIREBASE_APP_ID=demo-app
VITE_USE_EMULATORS=true
```

Start emulators in one terminal and Vite in another:

```sh
npx firebase emulators:start --project demo-ba-booze --only auth,firestore
npm run dev
```

The Google popup uses the Auth emulator's fake Google account interface. Local emulator data is temporary unless exported explicitly. There is no mock CRM mode in the production application. The separate in-memory test adapter runs only through `scripts/service-check.mjs`.

## Verification commands

Run the remaining integration checks from a regular VS Code terminal with network and localhost access:

```sh
nvm use 24
npm run verify:integration
```

This installs the Playwright Chromium/WebKit browser binaries, verifies Java, runs the official Firestore rules checks, and runs browser smoke/authenticated workflow tests against `demo-ba-booze`. It saves `.verification/summary.json` and individual logs for review. It does not deploy or require a real Firebase account. A failure is recorded rather than treated as a passing check. Downloading the browser binaries and emulator JAR requires internet access; keep the terminal open until it finishes. Do not start another server on port 4173 or another emulator on the configured ports during the run.

To rerun just the authenticated workflows after a fix, using the installed Java and browser binaries:

```sh
npm run verify:integration -- --workflows-only
```

This writes a summary explicitly scoped to authenticated workflows; it does not claim to rerun rules or browser smoke checks.

The individual checks remain available:

```sh
npm run test:business
npm run test:static
npm run test:services
npm test
npm run typecheck
npm run lint
npm run test:rules
npx playwright install chromium webkit
npm run test:e2e
npm run test:e2e:emulators
npm run build
npm run preview
```

`test:e2e` uses placeholder Firebase configuration and checks the setup screen at iPhone 13, Pixel 5 and desktop sizes. Run it without a real `.env.local` configuration. `test:e2e:emulators` supplies demo configuration to Vite, starts local emulators and exercises authenticated screens and the venue → gig → payment → rescheduled follow-up workflow. Close any previous Vite process on port 4173 before changing test modes. Browser binaries and Java must already be installed.

`test:services` runs the real data-layer implementation with real Zod schemas against a test adapter. It verifies business workflows, not SDK networking, server concurrency retries or Security Rules. The Rules Unit Testing suite is required separately. No test uses a production Firebase account.

The build lazy-loads major screens, splits Firebase into its own chunk, and generates a static asset allowlist for the service worker. Once dependencies are available, inspect Vite's reported raw/gzip chunk sizes. Use browser performance tooling on a throttled mobile connection; bundle sizes are recorded in VERIFICATION.md; browser rendering performance has not been measured in this environment. Check the installed production build over localhost or HTTPS, not just the Vite dev server.

## Data model and rules

- `profiles/{uid}`: Google identity snapshot, created/last-active timestamps and light/dark/system preference. Default is system. Theme fallback is scoped by UID in local storage. Google fields refresh from Authentication on sign-in and profile refresh.
- `venues/{id}`: contact, textual phone, IST local approach date, registered approached-by member, exact response enum and notes. Case-insensitive prefix tokens support server-side search by venue/contact/phone and individual words. No search service is required.
- `gigs/{id}`: venue reference, venue-name snapshot, local date and time in IST, integer paise payout and Upcoming/Completed/Cancelled status. Multiple gigs may reference the same venue.
- `paymentRecords/{gigId}`: one payment selection per gig. Absence means **Awaiting selection**, never a guessed default. Gig date/status snapshots enable bounded aggregate payment summaries; gig edits update those snapshots in the same transaction.
- `venueFollowUps/{id}` and `paymentFollowUps/{id}`: Timestamp schedule, Pending/Completed/Rescheduled status, links to related records, previous/next chain, completion note, actor and timestamp.
- Every business document has server-created/updated timestamps, actor UID/name snapshots and an integer version. Names on historical records remain snapshots rather than changing when a member changes their Google name.

The business timezone is **Asia/Kolkata**. Local dates remain `YYYY-MM-DD`; local times remain `HH:mm`. Follow-up schedules become instants using the explicit `+05:30` offset. Amount entry converts decimal strings to integer paise, with at most two decimals. UI currency uses `en-IN` INR formatting.

A non-cancelled gig enters Payments when manually Completed or when its calendar date is earlier than today in IST. A past date does not change Upcoming to Completed. Today's Upcoming gigs are not payment eligible. Cancelled gigs stay in gig history but are excluded from Payments and upcoming lists. Existing payment records survive cancellation for history and are excluded from eligible summaries.

Follow-up required always requires both a date and a time. Saving that selection creates another pending follow-up; it does not silently complete existing ones. Rescheduling changes the original to Rescheduled and creates a new Pending record atomically. Completing a follow-up changes no venue response, gig status or payment selection. Due/overdue reminders persist until explicitly handled, with overdue reminders first. Due counts and date calculations update while the app is open; the badge refreshes approximately every 30 seconds. No notification permission is requested.

## Online data, pagination and concurrency

CRM reads explicitly go to the server. Firestore uses memory cache only, with no IndexedDB persistence. Forms and service mutations check connectivity; transactions require server access. Failed saves keep entered data. Buttons prevent repeated submissions. Connectivity events are advisory; a network failure that occurs after a click is reported without claiming success.

Lists load 30 records at a time and support Load more and Refresh records. Search uses indexed, debounced prefixes. In follow-up-date/state mode, the app pages follow-ups in schedule order, batch-loads referenced venues, deduplicates them and applies additional venue filters to that loaded window. **Load more** expands these combined-filter results; they are not an exhaustive database-wide join on the first page. Member and venue selectors also load incrementally. Payment lookups use groups of at most 30 IDs to avoid N+1 reads.

Dashboard summaries use Firestore count aggregations rather than downloading growing collections. Lists are bounded; dashboard previews show the nearest/most recent items and link to the full sections. Counts refresh about once a minute; record lists refresh on navigation, explicit refresh and relevant local mutations. There are no unbounded real-time listeners.

Transactions compare the version originally loaded with the latest server version. A stale edit fails with a conflict message and a Reload latest data action. Rules additionally require versions to increase by one and preserve original creation metadata. Atomic workflows include venue + gig/follow-up creation, payment + follow-up creation, gig/payment summary synchronization and rescheduling. Security Rules validate Google authentication, profile ownership, enums, required shapes, timestamps and reasonable sizes. Calendar validation also happens in the Zod application boundary.

## Permanent deletion and practical limitations

Every deletion requires a named confirmation with the affected dependencies. Venue deletion removes linked gigs, payment records and both follow-up collections. Gig deletion removes its payment record and payment follow-ups. Deleting a payment record returns it to Awaiting selection and retains follow-ups linked to the gig. Deleting a single follow-up removes that history entry; surviving previous/next references may point to that deleted entry. There is no Trash, soft-delete or automatic recovery.

A cascade first sets a permanent deletion-in-progress lock on its root using a version-checked transaction. Rules reject new/updated dependent records under a locked root. Children are removed in atomic batches of at most 100; the root is removed last. This supports cascades exceeding one batch. If network access or quota fails halfway, the root stays locked and visible as deletion in progress. Open it and confirm Delete again to resume cleanup. No business record can be edited back into service during cleanup.

A large cascade is **not one globally atomic transaction**. There is no trusted background worker because Cloud Functions are prohibited. Keep the tab open until deletion completes. Locked roots must be resumed after interruption. Other signed-in members may see partial cleanup meanwhile. Direct authorized Firestore deletes outside this application can bypass the client cascade; rules cannot enumerate arbitrary descendant collections. All members already have shared destructive access by design. Do not use Console deletion for routine CRM cleanup.

## PWA installation and offline behavior

The manifest uses Ba-booze CRM / Ba-booze, standalone display and original 192/512/maskable PNG note icons. Replace icons with original band artwork if desired and rebuild.

- **iPhone/iPad:** open the deployed app in Safari → Share → Add to Home Screen.
- **Android:** open Members & Settings → Install app when available, or use the browser menu → Install app / Add to Home screen.
- Desktop Chromium browsers may also expose an install action.

Production service-worker registration requires HTTPS, except localhost. Only the same-origin, explicit static app-shell and asset allowlist is cached. Firebase requests, Google identity responses and CRM data are never added to the service-worker cache. Offline launch can show the shell and a connection message; CRM creation and editing remain disabled. No push subscription, notification tray, background reminder, SMS or email functionality is included. A newly built service worker waits for the previous version's tabs to close before replacing it.

## Deployment instructions — only after explicit authorization

No deployment was performed. These commands write to the selected external Firebase account. Run them only after the band confirms the actual project and authorizes deployment. Remain on Spark; do not enable billing to bypass an error.

```sh
npm run test:rules
npm test
npm run lint
npm run build
npx firebase login
npx firebase projects:list
npx firebase deploy --project YOUR_CONFIRMED_PROJECT_ID --only firestore:rules,firestore:indexes,hosting
```

Do not run an unqualified deployment, deploy Functions or select a project by guesswork. There is deliberately no committed default project alias. Hosting serves `dist/` with an SPA fallback; `/sw.js` is sent with no-cache. Confirm the deployed domain is authorized for Google Authentication. Verify sign-in, profile creation, shared data, theme isolation, offline writes and installation on real iPhone/Android devices before release.

## Spark quotas and operations

Monitor project Usage dashboards. At the documentation check on 2026-10-28, Firestore's standard free quota is 1 GiB stored data, 50,000 document reads/day, 20,000 writes/day, 20,000 deletes/day and 10 GiB/month outbound transfer. Only one database per project gets the free quota. Count aggregations and rule lookups consume read quota; dashboard polling and many open tabs increase usage. Search tokens consume storage/index entries. Large deletions consume delete quota and may need resuming after reset. See [Firestore quotas](https://firebase.google.com/docs/firestore/quotas) and [Firestore pricing](https://firebase.google.com/docs/firestore/pricing).

Firebase Hosting Spark includes 10 GB storage and 360 MB/day transfer on the current [Firebase pricing page](https://firebase.google.com/pricing). Hosting releases consume storage; monitor retained releases and transfer. Authentication has anti-abuse and rate limits; review its console before adding many users. Quotas may change. Spark exhaustion can interrupt the application; wait for the quota reset or reduce usage rather than enabling billing. Exporting/backing up records automatically is not implemented; managed backups, restore, TTL and paid exports must not be assumed available without billing.

## Remaining verification and operational limits

- Rule compilation/emulator checks, browser QA and dependency vulnerability triage remain outstanding. The dependency install, lockfile, typecheck, lint, unit tests and production build are now complete. See VERIFICATION.md.
- Real Google OAuth, a real Spark project, deployed indexes, Hosting and physical-device installation require the band's external setup. No external account was accessed.
- Combined venue/follow-up filters use incremental windows; record lists are refreshed rather than continuously synchronized. No full-text search backend or activity log is included.
- Browser tests cover common viewports and core workflows when emulators are available; they do not replace testing installation on physical devices, Safari popup policies, quota exhaustion or real slow-connection performance.
