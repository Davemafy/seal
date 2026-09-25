# Image entry point: release gate

25 Sep 2026. Public test artifact: a 3,200 px PNG rendered from the District of Connecticut's unmodified, clearly watermarked public sample summons. This is a rasterization of a PDF, not a genuine individual's notice or a camera photograph.

## Observed production behavior

The live site accepted and displayed the PNG, but returned one `COULD_NOT_VERIFY` claim: “We couldn’t read this field confidently.” Its OCR path uses a single whole-page confidence cutoff of 75. Local Tesseract.js on that PNG scored 71 overall, despite identifying the court heading and jurisdiction. A 1,800 px version scored 66. The prior text-PDF test was 3 MATCH, 2 COULD_NOT_VERIFY. Consequently, image upload is supported syntactically, but this dense readable example does not deliver claim checks.

Word-level probe on the 3,200 px PNG: `UNITED` 95, `STATES` 96, `DISTRICT` 95, `COURT` 96, `Connecticut` 96, and printed `1-866-388-2430` 74. One `Street` in the header scored 0. The phone's original label was not reliably recovered in text order. These scores justify checking whether high-confidence fields can survive the noisy page; they **do not** justify verifying the phone from this image or treating Tesseract confidence as a calibrated probability of correctness.

## Next product experiment

The question to test is: “I received a message claiming to be from a court. Can I establish whether the requested action is supported before I call, click, pay, or disclose information?” Test a consented, redacted screenshot and a pasted message alongside official court warnings. Do not substitute a fabricated message and claim real-world use. Official examples: [U.S. Courts juror scam guidance](https://www.uscourts.gov/court-programs/jury-service/juror-scams) and [Northern District of California's 2026 scam-summons warning](https://cand.uscourts.gov/news/2026/05/20/beware-scam-summons-demanding-money).

Release criterion: the action phrase and target (phone, URL, or payment channel) must be located in the original screenshot and linked to an exact official excerpt or marked `COULD_NOT_VERIFY`. Field-level uncertainty must prevent guessed values from reaching verification. A whole-page confidence score must not discard independently readable fields. Unknown jurisdictions and unreadable actions must abstain. Measure false MISMATCH on altered images and test the actual deployed browser path before claiming image support works.


## Resolution — 25 Sep 2026

The original whole-page gate is no longer the image verification rule. SEAL now applies confidence to the field being checked instead of discarding the entire image because unrelated text lowers a page-wide score.

The controlled dense-image regression now renders the checked-in public Connecticut sample PDF to a **3196×4136 PNG** in CI. On that raster, readable fields remain available for verification while the low-confidence phone is withheld and surfaced as **“We couldn’t read this field confidently.”** The image flow produces no false MISMATCH. This directly addresses the failure that motivated this document: a noisy page no longer destroys independently readable fields.

A separate deployed-browser release gate tests a simpler, clearly labeled synthetic image so the phone action itself is confidently readable and the verdict law can be exercised end to end. The unaltered synthetic image contains the District of Connecticut heading and the court-published jury status number `1-866-388-2430`; production returns **2 MATCH, 0 MISMATCH, 0 COULD_NOT_VERIFY**. The otherwise identical image with only that callback changed to `1-203-555-0199` returns **1 MATCH, 1 MISMATCH, 0 COULD_NOT_VERIFY**. The mismatch is based on the official court status-number sources, not on visual suspicion or the fact that the altered number is unfamiliar. The safe next step remains the independently sourced jury-office contact `800-827-8224`.

GitHub Actions run [#73](https://github.com/Davemafy/seal/actions/runs/36137533072) passed the field-level dense-image browser test and the deployed good/altered image pair after waiting for the production alias to serve the exact commit under test.

### What this does and does not establish

This establishes that SEAL's controlled image path can preserve high-confidence fields, abstain on a low-confidence field, and produce a conservative sourced mismatch when one confidently read action field is deliberately altered.

It does **not** establish accuracy on genuine personal summonses, handheld camera photos, real scam screenshots, compression-heavy messaging-app images, or adversarial image edits. Tesseract confidence is not treated as a calibrated probability. A consented, redacted real-message corpus is still required before making real-world image-accuracy claims, and actual-user testing is still required before claiming demand has been validated.
