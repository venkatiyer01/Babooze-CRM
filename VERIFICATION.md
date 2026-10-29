# Verification report — 2026-10-28

## Cloud rules and indexes published by the user

The user's Firebase CLI run completed successfully: Firestore indexes were submitted for the default database and the tested Security Rules were released. The log confirmed a Standard / Native default database in asia-south1 (Mumbai), with free-tier eligibility. Initial API connectivity failure resolved on retry; no application change was necessary.

This was a user-executed deployment limited to Firestore rules/indexes. No Hosting or Functions deployment occurred. Index submission success does not prove every index has finished building; check the Firestore Indexes page before interpreting initial query errors.

The local ignored environment targets the confirmed real project and has emulator mode off. Real Google browser sign-in, automatic profile creation and shared CRM read/write behavior are the next checks. These are not claimed to pass yet. No billing account or paid resource was enabled by the agent.

## Real-project configuration added locally

The user created a Spark project and registered a Web app, then supplied its normal Firebase web configuration. The four required environment values were saved only in ignored `.env.local`; emulator mode is off. The existing initialization code remains in use, and Analytics code was not added. Vite's environment loader successfully read and validated the required values without printing the API key or making a live Firebase request.

Google provider setup, authorized localhost domain, Firestore creation, applying tested rules/indexes and live sign-in/data checks remain pending. No external deployment, project mutation or billing action was performed by the agent. The emulator-based verification below remains valid; the real cloud connection is not yet verified.

## Current verified local status

The authenticated-workflow rerun passed: **6 tests passed** across iPhone/WebKit, Android/Chromium and desktop/Chromium browser profiles. The saved runner summary explicitly scopes this rerun to authenticated workflows. It verifies venue + completed gig creation, initially unselected payment status, payment follow-up save/display, preserved rescheduling history, completion, and primary-screen layouts against the local Auth/Firestore emulators.

Together with the previous successful checks, the latest relevant local results are:

- 21 unit/component tests, 11 pure business tests and 14 service-adapter tests passed.
- 8 official Firestore rules tests passed.
- 9 browser smoke tests passed; 6 authenticated-only cases were intentionally deferred to their separate run.
- 6 authenticated browser tests passed in that separate run.
- Typecheck, lint, static checks and production build passed.

These checks were completed across the documented runs, not all in a single full rerun after the final history change. The final change was covered by the regression test and authenticated browser rerun; rules and smoke checks were not repeated unnecessarily.

A real Firebase project was subsequently created by the user and its web configuration added locally, as recorded above. Cloud service setup and live connection verification remain pending. Real Google OAuth, deployed indexes/rules, physical-device PWA installation, Hosting and slow-network rendering still require separate verification. Five moderate tooling audit findings remain documented in DEPENDENCY_NOTES.md. No external account, deployment, billing or paid resource was used.

Earlier sections below record the failures and changes that led to this result; their pending-browser statements have been superseded by this status.

## Second integration run: smoke passed; payment history refresh fixed

The user's second complete run finished at 2026-10-28T20:08:54Z. Java and cached browser installation passed; all **8 official Firestore rules tests** and all **9 browser smoke tests** passed. Six authenticated-only cases were intentionally skipped during the smoke phase and executed in the separate authenticated phase.

Authenticated phase: the three primary-screen layout tests passed. The three full workflows progressed through venue/gig creation, unselected initial payment status and successful payment follow-up save, then failed waiting for the new follow-up to appear. Snapshots showed `Saved successfully` alongside `No records yet` in history. The history query had loaded before the save and had no invalidation signal when the saved parent version changed.

Payment and venue editors now pass the saved record version to History; History incorporates it into its query inputs and reloads after a successful save. The same fix covers adding venue follow-ups while editing an existing venue. A component regression exercises the actual payment editor save flow against a mocked data boundary and confirms the new overdue follow-up appears without a manual refresh.

After this change: **21 unit/component tests passed**, full typecheck/lint passed, and production build succeeded under Node 24.22.2. No service-layer or rules changes were made. The browser workflow rerun remains pending because this agent session cannot run the local servers/browser processes.

Added `npm run verify:integration -- --workflows-only` to rerun only the failed authenticated checks and capture logs. Its summary includes an explicit scope so a partial rerun cannot be mistaken for a fresh full integration run. The script was syntax/lint checked; actual browser verification of the history fix is not yet claimed.

## First complete integration attempt and follow-up changes

The user's integration runner completed at 2026-10-28T20:03:36Z. Browser binaries and the Firestore emulator JAR are cached successfully. The official rules compiled and **all 8 rules tests passed** against Firestore emulator 1.22.0. Permission-denied messages in those tests accompany expected `assertFails` cases; they are not test failures.

Browser smoke results: 8 passed, 1 failed (iPhone offline message), 6 intentionally skipped emulator-only tests. Authenticated workflow results: the 3 primary-screen layout checks passed across iPhone/Android/desktop; the 3 full venue-to-payment workflows timed out at the Response selector.

Changes made after that run:

- Fields now use explicit `label htmlFor` and control IDs, with option text and validation errors outside the label. This stabilizes exact label association for select controls and preserves error descriptions separately.
- Connection state now uses `useSyncExternalStore` so a change between rendering and listener subscription cannot be lost. The offline browser check waits for the app heading before changing the network state.
- Added meaningful regressions for exact select-label association with options/errors and for an offline transition during component mount.
- Browser smoke and authenticated workflows now retain artifacts in separate test-results subdirectories.

After these changes: all **20 Vitest tests passed**, full typecheck/lint passed and the production build succeeded under Node 24.22.2. The existing 11 business and 14 service-adapter tests passed before these changes and were not unnecessarily rerun; they do not cover the modified UI hooks/labels.

The browser fixes have **not yet been verified by a second browser run**. The agent session cannot bind the test server ports, and a direct WebKit launch in this session exited with Abort trap 6. Rerun `npm run verify:integration` in the normal VS Code terminal. No Firebase production account, external deployment or billing action was involved.

## Java 21 installed; integration runner added

Temurin 21.0.13+9 is now discoverable in both the user's Terminal and the agent session. `/usr/libexec/java_home -V` resolves `/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home`. Node 24.22.2 remains selected for verification.

Retried `npm run test:rules`: the official CLI passed Java detection and attempted startup, but the session denied localhost listening on 4400, 4500, 8080 and 9150 with `EPERM`. Its final `port taken` message is misleading here: the observed errors are permission denials, not evidence of another process occupying those ports. Changing ports is not justified by this output. No rules tests ran.

Attempted `npx playwright install chromium webkit`: failed to resolve `cdn.playwright.dev`, so browser binaries were not installed and browser tests did not run. No network or port bypass was attempted.

Added `npm run verify:integration` for the user's normal terminal. It runs Java discovery, browser binary installation, rules tests, setup-screen browser tests and authenticated workflows against demo emulators, saving status and logs under `.verification/`. The script was syntax-checked and its help command tested here. Its actual integration run remains pending in an environment with localhost and download access.

## Latest status after dependency remediation and Node 24

The user installed Node 24.22.2 and completed the explicit dependency updates. Manifest, lockfile and installed dependencies agree. Firebase CLI is 15.34.1 and Vitest is 5.0.5. The user's fresh full audit reports 5 moderate findings, with no high/critical findings reported; the remaining paths are development-only Firebase CLI dependencies. See [DEPENDENCY_NOTES.md](DEPENDENCY_NOTES.md). A fresh production-only audit could not reach the registry here and is not claimed to pass.

Reran under Node 24.22.2: full typecheck, lint, 18 Vitest tests, 11 business tests, 14 service-adapter tests, static checks and production build **all passed**. No implementation failures occurred after the dependency upgrades. The SDK browser chunk remains 666.31 kB raw / 198.13 kB gzip, and app entry 367.03 kB raw / 115.23 kB gzip; the non-fatal chunk-size and Zod annotation warnings remain.

Earlier, Java was unavailable; that blocker is now resolved as recorded above. The official Firestore rules/emulator and authenticated browser workflows have not run. Earlier browser attempts could not bind the local preview port; Playwright browser binaries are not installed in the normal cache. These remain release-verification limitations.

The following earlier sections are retained as historical diagnostics; their old installation/audit blockers and counts have been superseded by the status above.

## Latest status after installation in the user's Terminal

Dependencies and `package-lock.json` are now present. The earlier installation-blocked sections below are historical.

| Check | Latest result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed after fixing one unnecessary regex escape in `src/lib/domain.ts` |
| `npm test` | 18 tests passed across 2 files |
| `npm run test:business` | 11 tests passed |
| `npm run test:services` | 14 tests passed using installed TypeScript/Zod and the test adapter |
| `npm run test:static` | Passed |
| `npm run build` | Passed; generated `dist/` and the static PWA asset allowlist |
| `npm run test:rules` | Official CLI now starts, but stops because `java -version` cannot locate a runtime in this session |
| `npm run test:e2e` | Preview server blocked by `listen EPERM 127.0.0.1:4173`; tests did not run |
| `npm audit --json --fetch-retries=0 --fetch-timeout=15000` | Blocked by registry DNS (`ENOTFOUND`); no advisory details retrieved |
| `npm install-scripts ls` | Five packages have scripts not covered by allowScripts; no blanket approval was applied |

The user's installation reported 21 vulnerabilities (7 moderate, 11 high, 3 critical). They are unresolved pending the audit details; no forced or breaking dependency updates were applied. The production build works despite the outstanding install-script notices. Playwright browser binaries and the Firestore emulator JAR are absent from their normal cache paths in this session.

Build measurement: app entry 367.03 kB raw / 115.23 kB gzip; Firebase chunk 666.31 kB raw / 198.13 kB gzip. Route chunks range from about 1 to 9 kB raw; CSS 6.57 kB raw / 2.19 kB gzip. Vite warns about the Firebase chunk exceeding 500 kB raw. Zod emits two non-fatal Rollup annotation warnings. Browser rendering and slow-connection performance have not been verified.

Node is v26.13.0. The installed Firebase CLI dependency superstatic declares Node 20, 22 or 24, explaining the user's EBADENGINE warning. `.nvmrc` now recommends Node 24; no Node installation or global environment change was made.


This is a partial verification report, not production approval. No Firebase account was accessed, no external deployment was performed, and no billing or paid resources were enabled.

## Passed in this workspace

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm run test:business` | 11 tests passed | Actual shared pure business rules: IST date boundary, past/manual-completed eligibility, today/cancelled exclusions, exact paise, member defaults/selection, overdue persistence, stale version rejection and search prefixes |
| `node scripts/service-check.mjs` with local TypeScript/Zod paths | 14 tests passed | Actual data-layer code against the test-only in-memory Firestore adapter: conditional fields, atomic flows, multiple gigs, payment validation, follow-up history, conflicts, payment snapshot sync, >100-record cascades, resumable locks, offline writes, per-profile theme isolation and explicit deletion |
| `npm run test:static` | Passed | Manifest names/standalone display, PNG signatures/dimensions for all three icons, static-only worker guards, SPA fallback, 33 committed indexes, placeholder config |
| TypeScript parser from locally installed VS Code | All application/test/config `.ts` / `.tsx` files parsed with no syntax errors | Syntax only; does not establish dependency type compatibility |
| `node --check public/sw.js` | Passed | Service-worker JavaScript syntax |
| `node --check scripts/build-sw.mjs` | Passed | Build finalizer JavaScript syntax |

The service checks used locally available TypeScript and Zod 4.4.3 because npm is unavailable. The portable command after normal dependency installation is `npm run test:services`. This adapter does not implement Security Rules, actual Firestore transaction retries, server audit timestamps or network failures. Those require the official emulator suite.

## Attempted and blocked

| Command | Observed result |
| --- | --- |
| `npm install react react-dom react-router-dom firebase zod` | Failed: `ENOTFOUND registry.npmjs.org` |
| Development dependency installation | Unavailable for the same registry/DNS restriction |
| `npm run typecheck` | Could not start: `tsc: command not found` |
| `npm run lint` | Could not start: `eslint: command not found` |
| `npm test` | Could not start: `vitest: command not found` |
| `npm run build` | Could not start: `tsc: command not found` |
| `npm run test:rules` | Could not start: `firebase: command not found`; Java is also absent |
| `npm run test:e2e` | Could not start: `playwright: command not found` |

No production bundle was produced or measured. No rules were compiled or run against Firestore. No authenticated page, OAuth popup, browser viewport, PWA installation or live Hosting behavior was verified in a browser. No package-lock was generated. Test files for these checks are included, but are not claimed to pass.

## Required before release

1. Restore npm registry access, run `npm install`, and retain the generated lockfile. Use Java 21+ for the official emulator and install Playwright Chromium/WebKit browsers.
2. Run every verification command in README.md, including the authenticated emulator workflows. Fix all failures before release.
3. Measure the Vite build's chunk/gzip sizes and test main routes on throttled mobile hardware.
4. Configure a Spark Firebase project when the band is ready. Test real Google sign-in and Security Rules on a confirmed, authorized project. Confirm physical iOS/Android installation after authorized Hosting deployment.

## Requested verification retry

Tool versions from the project directory:

- `node -v`: `v26.13.0`.
- `npm -v`: `11.20.0`.
- `java --version`: Apple launcher reported `Unable to locate a Java Runtime`.
- `command -v java`: `/usr/bin/java`.
- `JAVA_HOME`: unset.
- `/usr/libexec/java_home -V`: no registered runtime found.

The system JDK directory `/Library/Java/JavaVirtualMachines` is empty in this execution environment. The user JDK directory and usual SDKMAN, jenv, asdf, mise, `.jdks`, and Homebrew Java paths are absent here. This establishes why this session cannot discover Java; it does **not** establish that Java 25 is absent from the user's regular Terminal environment. The user has been asked for that Terminal's Java path/discovery output so an existing JDK can be used directly.

Retried `npm install --fetch-retries=0 --fetch-timeout=20000`: failed with `ENOTFOUND registry.npmjs.org`. Requested network escalation for the installation. The tool rejected the request before showing an approval prompt because the session policy has `sandbox_approval: false`. No alternative network bypass was attempted.

Reran the available checks: all 11 business tests, 14 service-adapter tests, and static checks passed. Retried typecheck, lint, Vitest, production build, official rules checks and Playwright: all remain unable to start because their dependencies were not installed. No implementation test failure was reached in those blocked checks. No deployment or billing action was performed.
