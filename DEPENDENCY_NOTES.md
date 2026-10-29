# Dependency audit remediation

The user's successful installation reported 21 audit findings. These counts include vulnerable transitive dependencies and affected parent packages; they do not represent 21 distinct application-code defects. No forced audit fix or Firebase downgrade was applied.

## Prepared changes

| Dependency | Previous request | Prepared request | Reason |
| --- | --- | --- | --- |
| Firebase SDK | `^12.4.0` | `^12.19.0` | Retain the already installed SDK major and version floor; avoid npm's suggested downgrade to Firebase 9 |
| Zod | `^4.1.12` | `^4.6.7` | Require at least the patched version already installed at the project root |
| Firebase CLI | `^14.22.0` | `^15.34.1` | Explicit upgrade identified by the supplied audit; replaces several old dependency requirements |
| Vitest | `^3.2.4` | `^5.0.5` | Explicit upgrade identified by the supplied audit; requires regression testing after installation |
| Firestore's gRPC | pinned upstream to `~1.9.0` | scoped override `^1.14.6` | Choose the installed patched 1.x line rather than downgrade Firebase; verify Node/emulator behavior after installation |

The gRPC override applies only below `@firebase/firestore`, not every library in the project. Keep this override documented until upstream Firestore itself requests a patched gRPC version. The browser build does not use Node's gRPC transport, but rules testing and other Node tooling still need verification.

## Evidence

- [gRPC certificate handling advisory](https://github.com/advisories/GHSA-m9gg-hp2v-232j): fixed in 1.13.6 and 1.14.5.
- [gRPC error disclosure advisory](https://github.com/advisories/GHSA-f596-whhp-79r4): same patched release lines.
- [Firebase CLI 15.34.1 manifest](https://github.com/firebase/firebase-tools/blob/v15.34.1/package.json): requests tar 7.5.21+, csv-parse 7.0.2+, stream-json 3.6.0+, and Zod 4 rather than the previous Zod 3 requirement.
- [Vitest 5.0.5 manifest](https://github.com/vitest-dev/vitest/blob/v5.0.5/packages/vitest/package.json) and [migration guide](https://vitest.dev/guide/migration/): compatible Node/Vite floors, changed mock clearing defaults, and removal of the previous tinypool dependency.
- [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): patched in 4.6.6; the root installation already contains 4.6.7.

## Current installation and verification status

The user completed installation under Node 24.22.2. The manifest and lockfile now agree, and the installed versions are Firebase CLI 15.34.1, Vitest 5.0.5, Firebase SDK 12.19.0 and root Zod 4.6.7. The scoped gRPC override is installed.

Verification rerun with Node 24.22.2: typecheck, lint, all 18 Vitest tests, 11 business tests, 14 service-adapter tests, static checks and production build passed. The major Vitest upgrade is now covered by those regression tests. Java and browser binaries are now installed; subsequent local runs passed all 8 official rules tests, 9 browser smoke tests and 6 authenticated browser tests. See VERIFICATION.md for the latest full status.

The user's fresh full audit dropped from 21 findings (including high/critical) to **5 moderate findings**, all under development-only Firebase CLI dependencies:

- Firebase CLI → Google Pub/Sub 5.3.1 → OpenTelemetry Core 1.30.1. The advisory concerns W3CBaggagePropagator.extract(); the patched line is 2.8.0+. Forcing a major OpenTelemetry or Pub/Sub upgrade outside upstream requirements is not applied without compatibility verification.
- Firebase CLI / Google auth tooling → gaxios 6.7.1 → uuid 9.0.1. The advisory concerns v3/v5/v6 with caller-provided buffers; the locally inspected gaxios usage calls v4 for multipart boundaries. This observation does not remove the advisory or establish full tooling safety.

Audit counts also include affected parents; the five reports trace to these two underlying advisories. These are unresolved tooling findings, not a clean audit. No advisory is suppressed, and no broad override or forced downgrade is applied.

Sources: [OpenTelemetry advisory](https://github.com/advisories/GHSA-8988-4f7v-96qf), [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

The session's own `npm audit --omit=dev` could not contact the registry (`ENOTFOUND`); no successful clean production-only audit is claimed. The development-only location above is based on the supplied full audit and the installed dependency tree.

Use Node 24 via `.nvmrc`. Do not follow npm's current `audit fix --force` suggestion to downgrade Firebase CLI. Revisit the upstream CLI dependency requirements when compatible fixes are available; official emulator and deployment tooling verification remains necessary before release. No deployment, account access or billing changes were made.
