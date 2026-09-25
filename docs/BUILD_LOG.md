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
3. **Product UI — passed.** Rebuilt the review as a readable notice with inline claim marks, one focused evidence panel, a compact claim index, a single selected connector, and a compact mobile evidence sheet. A mismatch, match, or abstention remains attached to its precise claim. Conflicting official excerpts and timestamps appear together. Inspected the deployed desktop before and after the nine-claim reveal; the 390px claim-to-evidence browser check passed in CI.
4. **Benchmark — passed.** Twelve cases repeated: field extraction accuracy 0.917–1.0 by field, MISMATCH precision 1.0, **false MISMATCH count 0**, COULD_NOT_VERIFY rate 0.459, full-flow success 0.917. This is a small fixture set; the degraded photo still loses fields.
5. **Deploy/harden — passed.** Exercised production live-source failure: nine conservative unverified verdicts, an explicit failure message, and the dated snapshot court contact remained visible. Reproduced an early click before React hydration, disabled primary actions until handlers attach, and changed CI to test a production build. GitHub Actions run [#5](https://github.com/Davemafy/seal/actions/runs/36122453807) passed typecheck, lint, ten unit tests, the 12-case benchmark, two Playwright flows (desktop and 390px mobile), and the final build. Local Chromium remains unavailable in this workspace, so the browser gate ran in CI and production was inspected directly.

## Genuine public PDF probe · 25 Sep 2026
Downloaded the District of Connecticut's one-page public sample jury summons (545,953 bytes) and parsed its actual PDF text with PDF.js using the same page text assembly as the browser extractor. The deterministic path extracted court identity, a courthouse address, and a phone number; `courtlistener` returned three `COULD_NOT_VERIFY` verdicts and no false MISMATCH. The first pass also mislabeled OCR-like text `g.AREyOUASALARIEDEMPLoYEE` as a URL. Restricted fallback URL recognition to known web suffixes, added a regression test, and re-ran the PDF probe: zero bogus URLs and three conservative verdicts. Eleven unit tests, typecheck, benchmark (zero false MISMATCH), and build passed. This probe does not establish browser upload UX or real-world OCR accuracy. The Riverside 2017 court PDF returned HTTP 403 on each direct download variant, so its file bytes were not tested. A live browser upload attempt was rejected by automatic approval review when the session reached its usage limit; no upload ran.

### Production upload follow-up — Connecticut passed; Riverside source blocked
After browser access resumed, uploaded the actual Connecticut PDF through SEAL's public homepage. The client rendered page 1, extracted three claims, and completed the source check with 0 MATCH, 0 MISMATCH, 3 COULD_NOT_VERIFY. The false URL was absent. Visual inspection showed a provenance defect: the federal jury result was labeled as a Riverside source snapshot. Changed the header to `NO JURY-SOURCE COVERAGE` for federal jury-only results and clarified that CourtListener verifies exact dockets only. Added the unmodified public PDF as a repeatable Playwright upload fixture. Riverside's Cloudflare server returned 403 even for the official archive link and the cloud browser reported `ERR_BLOCKED_BY_CLIENT`; its file bytes remain untested here. Typecheck, 11 unit tests, lint (warnings only), benchmark, and build passed; browser regression runs in CI after push.

### Actual sample rendering and field recovery correction — 25 Sep 2026
The user's side-by-side screenshot exposed a missed failure: the PDF canvas omitted most printed text even though PDF.js extracted text for claims. The PDF has an unembedded Helvetica font; SEAL did not provide PDF.js standard font assets. The prior “rendered page 1” checkpoint measured a canvas element, not its visible text. Copy the 16 standard font files during install and provide `standardFontDataUrl` and system font fallback in both preview and extraction. Add a browser assertion that counts visible heading ink in the canvas. The same genuine PDF contains an oversized `Sample` watermark: flag it as an example form, explicitly not an actionable summons. Associate the printed `JUROR NUMBER` label with `02-0140` by location rather than guessing from the separate participant ID, and recover the complete printed date list. Preserve the printed `1-866-388-2430` prefix and normalize address spacing. The real PDF unit test now checks the number, dates, and sample watermark; 12 unit tests, typecheck, benchmark (0 false MISMATCH), lint (2 existing warnings), and build passed. Browser canvas and full upload gate await CI deployment.

**Browser gate failed, corrected, awaiting rerun.** Run [#9](https://github.com/Davemafy/seal/actions/runs/36126688708) measured zero ink in the printed heading; production screenshot independently showed the same blank text even with standard font files. Changed the preview to PDF.js `disableFontFace` path rendering, which draws glyph outlines without depending on browser font registration. The ink assertion stays in place and is the release gate for this fix.

**Second browser gate failed; positioned text fallback added.** Run [#10](https://github.com/Davemafy/seal/actions/runs/36127030059) also found zero ink from `disableFontFace`. The preview now tests its first printed text positions after PDF.js renders; if they contain no visible dark glyphs, it draws the PDF's own horizontal text items into the same canvas at their recorded page coordinates. This preserves the document artwork and clickable claim geometry while avoiding an invisible notice. The same ink assertion must pass in CI, followed by inspection of the production screenshot. Typecheck, 12 unit tests, and build pass locally.

**Visual gate passed; test selector corrected.** Run [#11](https://github.com/Davemafy/seal/actions/runs/36127323990) passed the canvas ink and five-claim assertions, then failed because the test's `Juror reference` selector matched both the canvas hotspot and claim index. Live production inspection confirmed a readable heading/body and five COULD_NOT_VERIFY results, with the sample warning and no red result. The browser test now targets claim-index rows specifically and checks the exact printed juror number, reporting dates, and 1-prefixed phone number. Full CI rerun pending.

**End-to-end gate passed; numeric visual check added.** Run [#12](https://github.com/Davemafy/seal/actions/runs/36127583237) passed all browser tests, unit tests, benchmark, lint, and build. A final production screenshot exposed that the positioned-text fallback only drew letter-bearing PDF tokens, leaving pure digits (including the printed juror and phone values) hard to see in the original-page panel. Include digit-bearing tokens and ignore barcode-like text streams. Added a second canvas assertion on the printed phone line. Final rerun pending.

**Final PDF release gate passed.** Run [#13](https://github.com/Davemafy/seal/actions/runs/36127872804) passed all three browser flows, including heading and phone-line pixel checks, exact sample fields, and zero fabricated MISMATCH. It also passed 12 unit tests, the 12-case benchmark with zero false MISMATCH, typecheck, lint (warnings only), and build. Production screenshot shows the court heading, sample watermark, printed juror number, and printed 1-prefixed phone in the original PDF panel. The sample warning remains visible and all five claims abstain under unsupported federal jury-source coverage.

### Genuine public notice: court coverage added — 25 Sep 2026
The five-unverified result exposed a real product limitation. Reviewed the District of Connecticut's current official Hartford courthouse, jury contact, jury FAQ, and jury scam guidance pages. Added a Connecticut-specific resolver with dated official snapshots and allowlisted live checks. The court name, Hartford address, and designated jury status phone on the public unmodified sample now produce three sourced MATCH results; the sample's personal juror number and historical reporting dates remain COULD_NOT_VERIFY. A separate official jury-questions number, 800-827-8224, overrides document contact as the safe next step. The interface explicitly states that matches on public details do not authenticate a document. A geographically labeled phone on an altered copy only becomes MISMATCH when its printed `PHONE TO CALL ... AFTER 5:30` context directly conflicts with both official status-number sources. If current official pages disagree, both excerpts and timestamps are shown with `Official sources currently disagree.` If live fetches fail, verdicts abstain and contact falls back to a labeled snapshot. Seventeen unit tests, typecheck, lint, build, and 14-case benchmark pass locally: zero false MISMATCH, 1.0 precision, 0.451 COULD_NOT_VERIFY rate, 0.929 full-flow success. CI browser gate and production inspection follow deployment.

**Live release check and altered-PDF correction.** GitHub Actions [#15](https://github.com/Davemafy/seal/actions/runs/36129581438) passed three browser tests, 17 unit tests, benchmark, lint, and build. Production upload of the genuine sample yielded 3 MATCH and 2 COULD_NOT_VERIFY; live refresh also reached the current official Connecticut pages and returned the same verdicts with live timestamps. A PDF editor then changed only the status phone but appended replacement text at the end of the PDF stream. The first product pass conservatively abstained, since the phone lost its printed label in stream order. Changed claim context assembly to use the PDF's geometrically adjacent `PHONE TO CALL` and `AFTER 5:30 PM` tokens. The actual altered PDF now yields 2 MATCH, 1 MISMATCH (phone only), and 2 COULD_NOT_VERIFY in the local end-to-end resolver probe. The benchmark simulates this reordered text stream and still records zero false MISMATCH. A deployed browser rerun remains the release gate for this correction.

**Final production gate — passed.** GitHub Actions [#16](https://github.com/Davemafy/seal/actions/runs/36130090187) passed typecheck, lint, 17 unit tests, the 14-case benchmark, all three Playwright flows, and production build. In the deployed browser, the unmodified public official sample yielded 3 MATCH, 2 COULD_NOT_VERIFY. A clearly marked synthetic test derivative with its printed status phone changed to `1-203-555-0199` yielded 1 MISMATCH for that phone, 2 MATCH, and 2 COULD_NOT_VERIFY. A live-source refresh reached the official Connecticut pages and preserved those verdicts with live timestamps. The evidence panel linked the conflicting phone to the official court contact and FAQ; the result never authenticated the personal juror number or historical reporting date.


## Action-first suspicious-message reimagination — 25 Sep 2026

### 1. Research and product decision — passed
Reviewed current U.S. Courts, FTC, District of Connecticut, and existing Riverside guidance before changing the interaction model. The narrower credible workflow is a jury-duty impersonation message that asks the recipient to call, open a link, pay, or provide information. Public court-detail matches remain secondary because they cannot authenticate a copied or forged message. The product decision, supported sources, limits, and pre-UI kill test are recorded in `docs/ACTION_FLOW_DECISION.md`.

### 2. Extraction and image entry — passed for the controlled release gates
Replaced the single whole-page OCR cutoff with field-level confidence handling. A phone field is withheld when its digit-bearing OCR tokens are below the field threshold, while independent high-confidence fields on the same page remain usable. Unreadable fields reach the UI as `We couldn’t read this field confidently.` and are never sent to verification as guessed values. The CI image gate rasterizes the unmodified public Connecticut sample to a 3196×4136 PNG: it retains independently readable claims, produces no MISMATCH, and exposes the low-confidence phone as an explicit abstention. Line-wrapped Connecticut headings are reconstructed only from visibly adjacent OCR lines, with unit regressions for routing and court-name comparison. The uploaded binary remains in the browser; only extracted text can be sent for claim structuring.

### 3. Official-source resolver — passed
Kept the Riverside and Connecticut court-detail resolvers and the Riverside two-source Desert Region disagreement. Added only the official guidance required by the action-first Connecticut flow: U.S. Courts juror-scam guidance and FTC jury-duty, government-impersonation, and fake-website guidance. A payment, callback, link, or information request becomes MISMATCH only when the saved official evidence directly contradicts that exact requested action in its context. An unfamiliar phone by itself remains COULD_NOT_VERIFY. The independent District of Connecticut jury-office contact remains 800-827-8224 from the court’s own contact page. Live-source failure forces affected verdicts to abstain; the safe-contact fallback is separately labeled as a dated snapshot.

### 4. Product UI and browser states — passed
Rebuilt the entry point around screenshot/image upload, pasted message text, or PDF. The review presents the original message first, then the requested action, atomic verdict, exact official excerpt/link/timestamp, unknowns, and independently sourced safe contact. Matching public details explicitly do not authenticate the message, and the product states that SEAL is not affiliated with any court. Inspected the actual desktop and 390px browser captures. The first mobile pass exposed an evidence sheet covering part of the message; mobile now stacks the complete source message before evidence. Playwright covers the primary action flow, paste flow, mobile, genuine public PDF, dense PNG partial readability, unsupported jurisdiction, official-source conflict, and failed live fetch.

### 5. Benchmark, deployed image pair, and release gate — passed
GitHub Actions run [#73](https://github.com/Davemafy/seal/actions/runs/36137533072) passed typecheck, lint, **24 unit tests**, the 15-case benchmark, the normal browser suite, production build, exact-production-SHA synchronization, and the deployed production image gate. Benchmark: extraction accuracy is 0.933–1.00 by field, MISMATCH precision **1.00**, false-MISMATCH count **0**, COULD_NOT_VERIFY rate **0.4556962025**, and full-flow success **0.9333333333**. The deliberately degraded photo remains the non-full-flow case.

The deployed production browser then tested a clearly labeled synthetic image containing the official Connecticut jury status number `1-866-388-2430`: **2 MATCH, 0 MISMATCH, 0 COULD_NOT_VERIFY**. The identical synthetic image with only that callback changed to `1-203-555-0199` returned **1 MATCH, 1 MISMATCH, 0 COULD_NOT_VERIFY**. The mismatch retained both official status-number sources through primary evidence plus progressive disclosure and kept the independent 800-827-8224 court contact. CI now waits until `seal-verify.vercel.app` reports the exact Git SHA under test before running this deployed gate, preventing alias-lag false failures.

These are controlled engineering examples. They do not establish accuracy on genuine personal summonses, camera photos, or real scam-message screenshots, and they do not establish user demand or uptake.


### Input-agnostic extraction correction — 25 Sep 2026

A low-resolution, readable court-looking image exposed that the extraction layer had become too coupled to the jurisdictions and scam examples used during development. The correction is architectural rather than jurisdiction-specific.

SEAL now follows: **message/image → generic action graph → field confidence → supported-source verification → abstention when unsupported**.

- Browser OCR preserves every recognized token and its confidence instead of deleting all words below a page-independent threshold. Small images are normalized/upscaled from their dimensions alone before OCR; no court or document identity affects that preprocessing.
- Extraction builds generic action nodes as `verb → object → target → qualifiers`, with action classes for payment, contact, navigation, information disclosure, and appearance/reporting. It does not require a dollar amount to preserve a payment action.
- Court identity extraction is generic and independent of resolver coverage. An unsupported fictional court can be extracted cleanly while verification still returns only `COULD_NOT_VERIFY`.
- Confidence belongs to the extracted value. Exact identifiers such as phones, URLs, juror IDs, and dockets use strict token confidence. Multi-word phrases use a robust field score so one noisy OCR word does not discard an otherwise readable phrase.
- Claims below the confidence threshold are withheld from the resolver and become `COULD_NOT_VERIFY — We couldn’t read this field confidently.` A low-confidence court identity is also prohibited from silently selecting a resolver for other claims.
- Spatial context for a target is reconstructed generically from nearby tokens, preserving label/value relationships without state- or court-specific layout rules.
- A `scan` verb does not imply a QR code. The scan action survives, but its target stays unknown unless QR is explicitly present in the recovered text or a future visual-code detector establishes it.

A new browser kill test creates a **526×791 synthetic notice from a fictional unsupported jurisdiction** and requires the real image path to recover separate requested payment, scan, and appearance actions before source verification. The test also requires zero MATCH and zero MISMATCH because there is no resolver for the fictional court.

GitHub Actions run [#89](https://github.com/Davemafy/seal/actions/runs/36141561316) passed 29 unit tests, the 15-case benchmark, 9 normal browser tests (plus the production-only test skipped locally), build, exact-production-SHA synchronization, and the deployed production image pair. Benchmark after correcting the ground truth for generic court extraction: court-name extraction 0.9333, MISMATCH precision 1.00, false-MISMATCH count 0, COULD_NOT_VERIFY rate 0.5376, and full-flow success 0.9333. The higher abstention rate is expected because the action graph now preserves additional requested actions that do not have a supported official-source rule instead of silently dropping them.

No Virginia resolver or Virginia-specific extraction rule was added.


### Deployment freeze + batch workflow — 25 Sep 2026

SEAL no longer uses the production deployment as part of the edit/test loop.

- Automatic Git deployments are disabled in `vercel.json` with `git.deploymentEnabled: false`. The last working production deployment stays live while engineering continues.
- Product changes are batched on `batch/seal-final-freeze` instead of being pushed incrementally to `main`.
- GitHub Actions owns normal validation: typecheck, lint, unit tests, benchmark, generated dense image, browser E2E, screenshots, and Next.js build.
- CI no longer waits for or tests the Vercel production alias on every push.
- Production smoke is an explicit `workflow_dispatch` input and is only used after one intentional manual production deployment.
- The dense-enforcement regression is jurisdiction-agnostic: a fictional low-resolution notice contains a descriptive “Failure to Pay” violation, a real payment directive repeated in a payment-instruction column, an appearance instruction, and a scan instruction. The expected action set is exactly payment + appearance + scan, with one payment action and no cross-column “Time … submit payment” claim.
- When Vercel capacity resets: merge/fast-forward the validated batch, make one manual production deployment, run the manual production smoke gate, then freeze.


#### Review-surface reduction

A real-looking unsupported notice exposed a second kind of noise: repeated consequence/warning language was being rendered as separate `Threat or consequence` rows, even though resolvers intentionally abstain on those lines. SEAL now retains extracted consequence text as context but does not promote it into the independently checked claim list. The result surface is for requested actions and details that can plausibly connect to an independent source, not a line-by-line OCR inventory.

The structured extractor also enforces the semantic meaning of `reporting_date`: an ordinary hearing, court, due, or notice date cannot be inserted into that field unless the recovered text actually associates the date with reporting instructions.


### Source intelligence layer — competition-grade final batch

A real traffic-enforcement notice found on Facebook exposed the remaining product failure: extraction could be correct while the user still received only `COULD_NOT_VERIFY`. SEAL now treats court resolution as one evidence lane rather than the boundary of usefulness.

The new pipeline is:

`message → generic action graph + explicit authorities → court resolver + public-source intelligence → source-backed conflicts/patterns → safe independent next step`

New behavior:
- explicit legal citations become first-class `authority` claims;
- an official-source authority adapter can contradict the notice’s claimed legal basis without making an authenticity claim;
- a high-specificity FTC traffic-hearing/QR/payment pattern is surfaced as an official warning, not as a probabilistic “scam score”;
- the repeated `26-TR-273196` core case number is cross-referenced against official Dallas and Miami-Dade scam-alert examples;
- Virginia notices with source findings receive the official Virginia case-search/payment path; Richmond notices also receive the independently sourced Richmond City General District Court Criminal/Traffic phone number;
- the outcome panel leads with a safe next step and source findings before the lower-level claim ledger.

The decisive-verdict law is unchanged: every MISMATCH still requires direct official evidence. Known-pattern signals are separate from claim verdicts and never authenticate or de-authenticate the notice by themselves.

Automatic Git deployments remain disabled. This batch is validated in GitHub CI before any production action.


### Final presentation freeze

No architecture or evidence-model changes. This pass only removes presentation defects exposed by the real Facebook notice:
- Virginia authority claims display as canonical `Va. Code § …` values while preserving the raw OCR source line as provenance.
- The collapsed technical record deduplicates evidence by source URL instead of repeating the same official source through claim, signal, and safe-action lanes.
- Technical status now distinguishes the court resolver from the cross-source layer: `Court resolver: unavailable · Source intelligence: active` rather than the misleading `Resolver: unsupported`.
- The number of authority conflicts remains evidence-driven; SEAL reports only the citations OCR recovered confidently enough to check.

This is the presentation freeze. CI/browser regression is the final release gate; no further product expansion is planned in this batch.


### Structured extraction grounding hotfix

A live GROQ run on the Facebook traffic notice exposed two unsupported structured fields in the review ledger: a juror/reference value inferred from an existing number and a delivery method inferred without explicit printed evidence.

The structured extractor now post-validates those fields against the recovered text:
- a juror/reference value survives only when it is locally anchored to an explicit juror, badge, or participant label;
- delivery method is derived deterministically only from explicit phrases such as `text message`, `SMS`, `email message`, or `phone call`;
- delivery channel remains extraction metadata and is no longer promoted to a separately checked claim.

This is a correctness/noise hotfix only. Source intelligence, verdict rules, evidence sources, and safe-resolution behavior are unchanged.
