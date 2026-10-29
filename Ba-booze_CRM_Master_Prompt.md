# Ba-booze CRM — AI Agent Master Prompt

Build a complete, production-ready, installable web application called **Ba-booze CRM** for a music band. The app will manage venue outreach, confirmed gigs, follow-ups, and gig payments. It must work well on iPhone and Android as a Progressive Web App (PWA), as well as in desktop browsers.

Do not stop after creating a mockup or static interface. Implement the working application, Firebase integration, security rules, tests, documentation, and deployment instructions. Work through routine implementation decisions independently. Ask me only when a credential, external account action, or genuinely missing requirement blocks progress.

## 1. Non-negotiable constraints

- Create a new project from scratch. Do not reuse or migrate the old Next.js/Supabase experiment.
- Use React, TypeScript, and Vite for the frontend.
- Use Firebase Authentication with Google sign-in, Cloud Firestore for shared data, and Firebase Hosting for deployment.
- Add standards-based PWA support so the app can be installed from the browser on compatible iOS and Android devices.
- Use only services and features available without enabling billing. Keep Firebase on the Spark/no-cost plan. Do not attach a billing account, enable the Blaze plan, deploy Cloud Functions, purchase a domain, or create any paid resource.
- If any requested implementation would require billing, stop that part, clearly explain the limitation, and provide a no-cost alternative. Do not silently enable or assume billing.
- Do not implement push notifications, SMS, email reminders, background notifications, or phone notification-tray alerts.
- All reminders must appear inside the app when it is opened.
- The app is online-only for CRM data. Cache only the static app shell and safe static assets. Do not allow offline creation or editing. When offline, show a clear offline state and disable mutations that cannot be saved reliably.
- Use Asia/Kolkata as the business timezone for gig dates, follow-up times, dashboard calculations, and overdue logic. Clearly label scheduled times as IST where useful.
- Currency is INR. Store money as an integer number of paise to avoid floating-point errors, and format it as Indian rupees in the UI.
- Optimize for fast loading and smooth use on mid-range mobile phones and slower connections.

## 2. Access model

- Authentication must be Google sign-in only through Firebase Authentication.
- Any person with a Google account who reaches the app may sign in and access the shared CRM. There is no invitation, approval, owner, or admin workflow in this version.
- Every authenticated user can view, add, edit, and permanently delete every venue, gig, venue follow-up, and payment record.
- Unauthenticated users must have no access to CRM data.
- Make this access model explicit in the README: anyone with the app URL and a Google account can access the shared band CRM. Do not weaken the requirement or invent an allowlist.
- On first sign-in, automatically create a profile using the Firebase user's UID, Google display name, email, and profile photo. Store created and last-active timestamps.
- All authenticated members can read the member list so registered members can be selected in forms.
- A member may edit only their own theme preference and safe profile preferences. Google identity fields should be refreshed from Authentication rather than freely editable.
- Do not allow one user to edit or delete another user's profile.
- Sign-out must be available from the account/profile menu.
- Firestore Security Rules must enforce these permissions. Do not rely only on hidden buttons or client-side checks.

## 3. Per-user appearance

- Each member can choose Light mode, Dark mode, or System default.
- Use System default for a new profile until the member changes it.
- Save the preference to that member's profile and also apply a local fallback so the selected theme appears promptly on future loads.
- Both themes must be polished, accessible, and consistent. Use a modern music-oriented look with restrained accents, readable typography, clear status colors, and large touch targets. Avoid decorative charts and visual clutter.
- Meet WCAG AA contrast where practical, support keyboard navigation, provide visible focus styles, label inputs, and respect reduced-motion preferences.

## 4. Core data model

Design normalized Firestore collections and TypeScript types for at least:

- `profiles`
- `venues`
- `gigs`
- `venueFollowUps`
- `paymentRecords` or an equivalent well-justified payment model
- `paymentFollowUps`

Use stable document IDs and Firebase `Timestamp` values for instants. Use explicit local-date strings such as `YYYY-MM-DD` for calendar dates when that avoids timezone shifting. Every business record must include appropriate metadata such as `createdAt`, `createdByUid`, `createdByName`, `updatedAt`, `updatedByUid`, and `updatedByName`.

Preserve a display-name snapshot on historical records so they remain understandable if a Google profile name later changes. Use server timestamps for audit metadata. Add schema validation at application boundaries using a suitable TypeScript validation library.

Do not create a detailed activity-feed or change-log feature. The dashboard should show current operational information. Individual records may show who created them and when they were last updated.

## 5. Venue outreach

Provide a dedicated **Venue Approach** area accessible from the main mobile navigation/sidebar.

A venue approach record must support:

- Venue name — required.
- Contact person's name — required.
- Contact number — required and stored as text so country codes and leading zeroes are preserved.
- Approach date — default to today's date in Asia/Kolkata and allow correction.
- Approached by — an optional selector containing registered member profiles. If the user leaves it empty, save the currently signed-in user's UID and display name. Do not allow arbitrary typed names.
- Response — required dropdown with exactly these choices:
  - Awaiting reply
  - Not right now
  - Follow-up required
  - Gig confirmed
- Optional notes.

Behavior by response:

- **Awaiting reply:** save the venue without forcing a follow-up.
- **Not right now:** save the venue without creating a follow-up.
- **Follow-up required:** require a follow-up date and time in IST before saving. Create a pending venue follow-up linked to the venue.
- **Gig confirmed:** require the confirmed-gig fields described below and create a gig linked to the venue. A venue may have multiple gigs over time.

Phone numbers must be tappable on supported mobile devices. Provide search by venue name, contact person, and phone number. Provide filters by response, approached member, and follow-up state, plus useful sorting by approach date and follow-up date.

Allow add, view, edit, and permanent delete. Before deleting, show a specific confirmation naming the venue and explaining which directly dependent data will also be removed. Use a Firestore batch or another safe client-side approach so related records are not left in an inconsistent state. Because Cloud Functions are prohibited, document the practical limitations of client-driven cascading deletion and test the implementation carefully.

## 6. Confirmed gigs

A confirmed gig must be a separate record linked to its venue so the same venue can have multiple gigs.

Required fields:

- Gig name.
- Venue reference and a venue-name snapshot.
- Gig date.
- Gig time in IST.
- Finalized payout in INR.
- Status with these values:
  - Upcoming
  - Completed
  - Cancelled

When a user chooses **Gig confirmed** from a venue response, show the required gig fields in the same flow and validate them before saving. Also provide a dedicated gig detail/edit experience.

A member can manually mark a gig as completed. A member can also mark a gig as cancelled. Cancelled gigs remain visible in gig history but must be excluded from upcoming-gig lists and from Payments.

Upcoming gigs should be ordered by date and time. Clearly distinguish upcoming, past awaiting payment review, completed, and cancelled gigs.

## 7. Payments

Provide a dedicated **Payments** area in the main navigation.

A gig must become available in Payments when either condition is true:

1. A member manually marks it Completed, even if its scheduled date has not passed; or
2. Its gig calendar date is earlier than the current date in Asia/Kolkata.

Do not automatically change the gig to Completed merely because its date passed. It should simply appear in Payments for review. Never include Cancelled gigs.

For a gig entering Payments for the first time, show the gig name, venue, gig date, finalized payout, and an unselected required payment-status dropdown. Do not guess or preselect a payment status.

Payment status options must be exactly:

- Payment received
- Follow-up required
- Payment denied

Behavior:

- **Payment received:** save the selection and show it as settled.
- **Payment denied:** save the selection and show it clearly.
- **Follow-up required:** require a payment follow-up date and time in IST before saving and create a pending payment follow-up linked to the gig/payment.

Payment tracking becomes available only through the eligibility rules above, not merely when a future gig is confirmed.

## 8. Follow-ups and in-app reminders

Support separate venue and payment follow-ups while providing one combined in-app notification center.

Each follow-up must have:

- Type: Venue or Payment.
- Link to its venue and, for payment follow-ups, its gig/payment record.
- Scheduled date and time in IST.
- Status: Pending, Completed, or Rescheduled.
- Optional completion/rescheduling note.
- Created-by and completed-by metadata.
- Completion timestamp when completed.
- A link to the next follow-up when rescheduled, and/or a previous-follow-up reference so history can be displayed.

Rules:

- A pending follow-up becomes due when the current instant reaches its scheduled IST date and time.
- A pending follow-up is overdue after that time has passed.
- Due and overdue items remain visible every day until someone completes or reschedules them. This persistent visibility replaces the previously discussed daily push notification.
- Members can mark a follow-up completed, add an optional note, or schedule another follow-up.
- Rescheduling must preserve the old record as Rescheduled and create a new Pending record. Never overwrite or erase follow-up history.
- Completing a follow-up must not automatically alter the venue response, gig status, or payment status.
- Follow-up history must be visible from the related venue or payment record.

The in-app notification center should show a badge count for due and overdue items only while the app is running. It must not request browser notification permission or register for push messaging.

## 9. Dashboard

The dashboard is the first authenticated screen. It must give a useful operational summary without becoming an activity log.

Include:

- The most recently approached venue, including approach date, response, and approached-by member.
- Counts for total venues and venue responses.
- Venue follow-ups due now/today and overdue.
- Payment follow-ups due now/today and overdue.
- A combined prioritized list of pending follow-ups, with overdue items first and then the nearest scheduled items.
- Upcoming confirmed gigs, ordered chronologically.
- Gigs now awaiting payment-status selection.
- Payment summary counts for Payment received, Follow-up required, Payment denied, and Awaiting selection.
- Clear empty states when no data exists.

Dashboard cards and list items should link to the relevant filtered section or record. Use compact summaries, not decorative graphs.

## 10. Navigation and responsive experience

Required primary destinations:

- Dashboard
- Venue Approach
- Gigs
- Payments
- In-app Reminders
- Members/Profile and Settings

Use a sidebar on larger screens and an ergonomic mobile navigation pattern on phones. Keep key actions within thumb reach. Ensure forms work with mobile keyboards, date/time pickers, and safe areas on iOS. Avoid horizontal scrolling for primary mobile content. Tables may be used on desktop, but mobile should use readable cards or compact lists.

Include install guidance:

- On iPhone/iPad: explain how to use Safari's Share menu and **Add to Home Screen**.
- On Android: show an install action when the browser exposes the install prompt, with a fallback explanation through the browser menu.

Create a manifest with app name **Ba-booze CRM**, short name **Ba-booze**, suitable theme/background colors, standalone display mode, and proper icons. Create simple original placeholder icons if final band artwork is not provided. Do not use copyrighted imagery.

## 11. Validation and resilience

- Use clear inline validation messages.
- Preserve entered form data after a failed save.
- Prevent duplicate submissions.
- Show loading, success, empty, offline, permission, and recoverable error states.
- Confirm destructive actions. Deletions are permanent; do not implement Trash or soft deletion.
- Use optimistic UI only when rollback is reliable. Prefer correctness for payment and follow-up mutations.
- Use transactions or batched writes for multi-document workflows such as confirming a gig, rescheduling a follow-up, and setting payment follow-up status.
- Detect and handle concurrent edits. At minimum, use an `updatedAt`/version precondition or transaction so one member does not silently overwrite another member's newer changes. Show a useful conflict message and allow reloading the latest data.
- Avoid exposing internal error objects, API keys beyond normal Firebase web configuration, or sensitive debugging information to users.

## 12. Performance

- Keep the initial JavaScript bundle small. Lazy-load major routes and heavy components.
- Use Firestore real-time listeners only where live updates materially help; unsubscribe correctly.
- Use indexed, bounded queries and pagination or incremental loading for lists. Do not download entire growing collections for every dashboard render.
- Avoid N+1 reads. Store carefully chosen snapshots, such as venue name and member display name, where they reduce repeated reads without making source-of-truth behavior unclear.
- Add required Firestore composite indexes and commit the index configuration.
- Debounce search where appropriate.
- Use responsive images, reserve layout space, and avoid unnecessary animation.
- Cache static assets through the service worker, but do not cache authenticated Firestore responses as a substitute for online data.
- Measure the production build with available tooling and fix obvious bundle or rendering problems.

## 13. Firebase setup and security

Provide:

- Firebase client initialization using environment variables.
- `.env.example` with placeholders only.
- Instructions for creating a Firebase project, registering the web app, enabling Google Authentication, creating Firestore, selecting an appropriate region near India if available, adding authorized domains, and deploying to Firebase Hosting.
- Firestore Security Rules checked into source control.
- Firestore index configuration checked into source control.
- Firebase Hosting configuration with SPA fallback.
- Local development instructions using the Firebase Emulator Suite where practical.

Do not commit real Firebase credentials or secrets. Explain that Firebase web configuration values are client configuration and that actual authorization comes from Authentication and Security Rules. Still keep environment-specific configuration out of committed source except for documented placeholders.

Security Rules must ensure:

- Unauthenticated requests are denied.
- Authenticated users can read and write shared business collections as specified.
- Profiles are readable by authenticated users.
- A profile document can be created only for the authenticated user's UID and updated only by that same UID, with validation preventing unsafe identity changes.
- Data shapes, required fields, enum values, timestamps, and reasonable field-size limits are enforced where Firestore Rules can enforce them.

Use Firebase App Check only if it can be configured without billing and without making local development or supported browsers unusable. Treat it as defense in depth, never as a replacement for Security Rules. If deferred, document it as an optional hardening step.

## 14. Testing and verification

Create meaningful automated tests, not superficial snapshots. Use suitable tools such as Vitest, React Testing Library, Firebase Rules Unit Testing with the Emulator Suite, and Playwright where practical.

At minimum verify:

- Unauthenticated users cannot read or write CRM collections.
- A Google-authenticated user can create/read/update/delete shared venue, gig, follow-up, and payment data.
- Profile write restrictions prevent editing another profile.
- The approached-by field defaults to the signed-in member when left empty and accepts a selected registered member.
- Venue response conditional validation works for Follow-up required and Gig confirmed.
- A venue can have multiple gigs.
- A past-date non-cancelled gig becomes payment-eligible without being automatically marked Completed.
- A manually completed future gig becomes payment-eligible immediately.
- A cancelled gig never appears in Payments or upcoming gigs.
- Payment status starts unselected and Follow-up required demands a date and time.
- Venue and payment follow-ups become due/overdue correctly using Asia/Kolkata.
- Completing and rescheduling follow-ups preserves history.
- Concurrent edit protection prevents silent overwrites.
- Permanent deletion confirmations and dependent cleanup behave as documented.
- Theme choice persists independently per profile.
- Main screens are usable at common iPhone and Android viewport sizes.
- Offline mode clearly blocks unsafe writes.
- The production build succeeds and the PWA manifest/service worker are valid.

Run all tests and the production build. Report exactly what ran, what passed, and anything that could not be tested. Fix failures caused by the implementation rather than merely documenting them.

## 15. Delivery workflow

Work in these stages, but continue through them without waiting for approval unless blocked:

1. Inspect the working directory and any repository instructions such as `AGENTS.md`.
2. Briefly explain the chosen architecture and planned folder structure.
3. Scaffold the new React + TypeScript + Vite project and install only necessary stable dependencies.
4. Implement the data model, Firebase configuration, validation, security rules, and indexes.
5. Implement authentication, automatic profile creation, and per-user theme preferences.
6. Build venue outreach, gigs, payments, follow-up history, and in-app reminder behavior.
7. Build the dashboard and responsive navigation.
8. Add PWA installation, manifest, icons, service worker, and offline messaging.
9. Add and run tests, rule-emulator checks, type checking, linting, and the production build.
10. Write the README and exact setup/deployment instructions.

Do not deploy to an external account until I provide or authorize the required Firebase project access. Do not enable billing at any point. If Firebase CLI access is already authenticated and I have explicitly asked for deployment, deploy only to the confirmed project and report the resulting URL.

## 16. Required final deliverables

Deliver:

- Complete working source code.
- A clear folder structure.
- Firebase configuration using environment variables.
- Firestore Security Rules and composite indexes.
- PWA manifest, icons, service worker, and install instructions.
- Automated tests and their results.
- `.env.example` with no secrets.
- A concise but complete README containing prerequisites, local commands, Firebase console setup, emulator usage, deployment steps, and iOS/Android installation steps.
- A short explanation of the data model and important business rules.
- A list of free-tier quotas or operational limitations that the band should monitor.
- A final summary of completed features and any remaining limitations.

Start now by inspecting the directory, explaining the architecture in simple language, and then implementing the application. Do not stop after the plan.
