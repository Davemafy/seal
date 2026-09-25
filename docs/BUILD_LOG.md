# Build log

## 1. Extraction — passed
Browser PDF text extraction and lazy OCR are implemented; deterministic and optional schema-validated Groq modes feed atomic claims with source text and locations. Low-confidence whole-image OCR abstains without passing guessed fields to the resolver. `npm run typecheck` and extraction unit tests passed. No original binary is posted to the server.

## 2. Official-source resolver — passed
Allowlisted Riverside live fetch and labeled snapshots implemented, with no uploaded URL fetch. Official phone disagreement retained. Verdict law, private juror abstention, and missing-record regression tests passed in Vitest. CourtListener query shape checked against Free Law Project API documentation and corrected to `type=d` with exact docket and court match.

## 3. Product UI — code/build passed; browser gate pending
Landing, three demo fixtures, source/result comparison, desktop connectors, mobile claim stack, source excerpts, and official contact implemented. `next build` compiled both routes. Local Playwright could not start: Chromium is absent and this workspace’s network returned a zero-byte archive from the browser CDN. GitHub Actions runs the browser test in CI after push.

## 4. Benchmark — passed for current fixture set
Twelve cases include the flagship mixed notice, an unmodified official public notice excerpt and consistent, altered, missing, unsupported, a degraded text proxy and a degraded photo processed by Tesseract CLI, prompt injection, generic paper payment, and conflicting official number. `npm run benchmark` reports zero false MISMATCH, 100% precision and 11/12 full-flow success (the degraded photo loses fields) on this small fixture set. The extraction accuracy figures are fixture-level checks, not a real-world OCR estimate. A genuine unmodified individual jury summons and real-world photo corpus are still needed for external validity.

## 5. Deploy/harden — build passed; deployment pending
Typecheck, unit tests, benchmark, lint, and production build pass. Local browser run blocked by missing binary. CI is configured to install Chromium and run the flagship Playwright flow. Preview deployment requires an authenticated Vercel project connection.

## Founder-grade product pass · 25 Sep 2026

1. **Extraction — passed.** Re-ran extraction tests and typecheck. Nine demo claims still map to atomic source phrases; OCR uncertainty still abstains. No change to guessed-field policy.
2. **Official-source resolver — passed.** Audited the deployed live-source failure, then preserved a dated official snapshot for the safe court contact when live pages fail. Added a regression test that forces all five live fetches to fail and proves every verdict abstains while contact remains visibly `SNAPSHOT`. Ten unit tests pass. Official Desert Region conflict remains two-source `COULD_NOT_VERIFY`.
3. **Product UI — build passed; visual verification after deploy.** Rebuilt the review as a readable notice with inline claim marks, one focused evidence panel, a compact claim index, a single selected connector, and a compact mobile evidence sheet. A mismatch, match, or abstention remains attached to its precise claim. Conflicting official excerpts and timestamps appear together. Typecheck, lint (warnings only), and production build pass. Updated the Playwright flow for the new interface.
4. **Benchmark — passed.** Twelve cases repeated: field extraction accuracy 0.917–1.0 by field, MISMATCH precision 1.0, **false MISMATCH count 0**, COULD_NOT_VERIFY rate 0.459, full-flow success 0.917. This is a small fixture set; the degraded photo still loses fields.
5. **Deploy/harden — in progress.** Re-run CI browser flow and inspect the production URL after publishing. Local Chromium remains unavailable in this workspace.
