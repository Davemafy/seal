# Image entry point: release gate

25 Sep 2026. Public test artifact: a 3,200 px PNG rendered from the District of Connecticut's unmodified, clearly watermarked public sample summons. This is a rasterization of a PDF, not a genuine individual's notice or a camera photograph.

## Observed production behavior

The live site accepted and displayed the PNG, but returned one `COULD_NOT_VERIFY` claim: “We couldn’t read this field confidently.” Its OCR path uses a single whole-page confidence cutoff of 75. Local Tesseract.js on that PNG scored 71 overall, despite identifying the court heading and jurisdiction. A 1,800 px version scored 66. The prior text-PDF test was 3 MATCH, 2 COULD_NOT_VERIFY. Consequently, image upload is supported syntactically, but this dense readable example does not deliver claim checks.

Word-level probe on the 3,200 px PNG: `UNITED` 95, `STATES` 96, `DISTRICT` 95, `COURT` 96, `Connecticut` 96, and printed `1-866-388-2430` 74. One `Street` in the header scored 0. The phone's original label was not reliably recovered in text order. These scores justify checking whether high-confidence fields can survive the noisy page; they **do not** justify verifying the phone from this image or treating Tesseract confidence as a calibrated probability of correctness.

## Next product experiment

The question to test is: “I received a message claiming to be from a court. Can I establish whether the requested action is supported before I call, click, pay, or disclose information?” Test a consented, redacted screenshot and a pasted message alongside official court warnings. Do not substitute a fabricated message and claim real-world use. Official examples: [U.S. Courts juror scam guidance](https://www.uscourts.gov/court-programs/jury-service/juror-scams) and [Northern District of California's 2026 scam-summons warning](https://cand.uscourts.gov/news/2026/05/20/beware-scam-summons-demanding-money).

Release criterion: the action phrase and target (phone, URL, or payment channel) must be located in the original screenshot and linked to an exact official excerpt or marked `COULD_NOT_VERIFY`. Field-level uncertainty must prevent guessed values from reaching verification. A whole-page confidence score must not discard independently readable fields. Unknown jurisdictions and unreadable actions must abstain. Measure false MISMATCH on altered images and test the actual deployed browser path before claiming image support works.
