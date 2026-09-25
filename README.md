# SEAL

**Before you call, click, pay, or reply.**

SEAL is an independent court-message checker. A person can upload a screenshot/image, paste message text, or upload a PDF. SEAL separates the **action the message asks them to take** from surrounding official-looking details, then checks only the atomic claims that current independent official sources can establish.

The primary product question is:

> What is this message asking me to do, what can an independent official source establish, and how can I contact the court safely?

A matching court name, address, public phone number, or website does **not** authenticate a message or an individual summons. SEAL is not affiliated with any court.

## Primary supported workflow

The first complete action-first path is a jury-duty impersonation message claiming to involve the **U.S. District Court for the District of Connecticut**. SEAL can independently check covered action claims such as:

- a jury-duty payment demand using a payment app, cryptocurrency, gift cards, or wire transfer when current official guidance directly contradicts that request;
- a message-supplied URL when official guidance says not to use the URL supplied by the caller/message;
- a callback instruction in a payment/threat context when official guidance tells the recipient to contact the agency using an independently known-correct number;
- a request for sensitive personal information through calls, texts, or emails when the applicable official guidance directly covers that channel.

It then gives the recipient a **separately sourced court contact**. For the District of Connecticut flow, the safe-contact override is the jury-office number published on the court's own site rather than any number printed in the suspicious message.

Existing Riverside Superior Court coverage remains as regression coverage, including the known official-source conflict over the Desert Region jury number.

## Three verdicts

- **MATCH** — an official source positively confirms the exact atomic claim.
- **MISMATCH** — a saved official source directly contradicts the exact atomic claim or requested action.
- **COULD_NOT_VERIFY** — the available sources cannot establish the claim, the field is unreadable, the jurisdiction is unsupported, a live source failed, the data is private, or official sources materially disagree.

MISMATCH is intentionally hard to produce. Suspicion, absence from a database, an unfamiliar phone number, or an OCR guess is never enough.

When official sources materially disagree, SEAL returns **COULD_NOT_VERIFY** with “Official sources currently disagree.” Both source excerpts and checked timestamps remain visible. Riverside's 760-342-6264 / 951-342-6264 conflict is preserved as a regression fixture.

## Screenshot and image handling

The original uploaded binary stays in the browser. PDF text is read with PDF.js; images and scanned PDFs use Tesseract.js in the client.

OCR confidence is **field-scoped**, not a whole-page kill switch. A low-confidence field is withheld from verification and displayed as:

> We couldn’t read this field confidently.

Readable fields elsewhere on the same image remain available. The dense Connecticut PNG regression is generated from the checked-in public sample PDF at roughly 3,200 px width. Its low-confidence phone must abstain while independently readable fields survive. This does not prove accuracy on real personal summonses or camera photos.

Extracted text can be sent to the SEAL server and, when configured, to Groq for claim structuring. The original image/PDF is not silently sent to an external model. SEAL has no user account or document database.

## Demo

~~~bash
npm ci
npm run dev
~~~

Open http://localhost:3000/demo.

The primary demo is a **clearly labeled synthetic jury-scam message** with fictional details and no real-person data. It exists to test the engineering path, not to claim that SEAL has been validated on real scam victims.

The review UI keeps one visual chain central:

**message → requested action → official evidence → safe court contact**

Selecting a claim highlights it in the original message/image and shows its verdict, exact official excerpt, source link, source mode, and checked timestamp.

## Verification and benchmark

~~~bash
npm run typecheck
npm run lint
npm test
npm run benchmark
npm run e2e
npm run build
~~~

The current 15-case benchmark covers the action-first jury message, an unmodified public Connecticut sample PDF, a clearly labeled single-field phone alteration, Riverside phone/portal alterations, a nonexistent private identifier, an unsupported jurisdiction, degraded OCR, prompt injection, a generic paper fee, and the Riverside official-source conflict.

Current fixture-set metrics:

- **MISMATCH precision:** 1.00
- **False MISMATCH count:** 0
- **COULD_NOT_VERIFY rate:** 0.456
- **Full-flow success:** 0.933
- **Extraction accuracy by field:** 0.933–1.00 on the benchmark fields

These are engineering-fixture measurements, not a real-world accuracy estimate. There is no consented corpus of genuine personal summonses, camera photos, or real scam-message screenshots in this repository.

The public Connecticut sample is from the U.S. District Court for the District of Connecticut. On its text-PDF path, public court identity/address/status-number details can be independently corroborated while juror-specific and historical reporting details remain unverified. Those matches never authenticate the document.

## Official sources used by the action-first flow

SEAL uses fixed allowlists and saved excerpts; it never follows a URL printed in an uploaded message.

- U.S. Courts juror-scam guidance
- Federal Trade Commission jury-duty scam guidance
- Federal Trade Commission fake jury-duty website guidance
- Federal Trade Commission government-impersonation guidance
- U.S. District Court for the District of Connecticut jury information, FAQ, courthouse, and jury-contact pages
- Riverside Superior Court Jury Services pages and Countywide Numbers table for the existing Riverside resolver

Live checks can fail or official pages can change. When a live source is unavailable, affected verdicts abstain rather than silently inheriting a decisive cached result. A separately labeled, dated official snapshot may still be used for the safe-contact fallback.

Research rationale and the action-first kill test are in [docs/ACTION_FLOW_DECISION.md](docs/ACTION_FLOW_DECISION.md). Image-specific release criteria are in [docs/IMAGE_KILL_TEST.md](docs/IMAGE_KILL_TEST.md). Build checkpoints are in [docs/BUILD_LOG.md](docs/BUILD_LOG.md).

## Limits

SEAL does not determine authenticity, legal validity, enforceability, admissibility, or whether a particular person actually owes or must do anything. It does not validate demand or real-world uptake. If a real personal scam screenshot is unavailable, synthetic or official public examples are clearly labeled as such.

Further court coverage requires a reviewed resolver and source-specific contradiction rules; “support every court” is intentionally not the current scope.

## Prior art and related work

SEAL builds on public court scam alerts, consumer-protection guidance, court-source verification patterns, and legal citation-checking / source-checking tools. Related product prior art should be evaluated on its own terms; SEAL's specific product experiment is the claim-to-source chain for a suspicious court message plus an independently sourced safe-contact override.
