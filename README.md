# SEAL

**The seal can be faked. The source can’t.**

**Check the message before you act on it.**

SEAL checks court messages against public sources.

Upload a screenshot, image, PDF, or paste the message. SEAL identifies the details that could change what you do next, checks those details against evidence outside the message, and shows what is confirmed, what conflicts, and what still cannot be verified.

**Live product:** https://seal.imafidondavid1.workers.dev

## Why SEAL

An official-looking message can contain a real court name, a familiar logo, and a valid address while still giving you a phone number, payment instruction, or link you should not trust.

SEAL does not ask whether the whole document "looks real."

It asks a narrower question:

> **What is this message asking me to do, and what can I independently verify before I do it?**

That distinction drives the product.

A matching court name, address, public phone number, or website does not authenticate a message or an individual summons. SEAL is not affiliated with any court.

## How it works

1. **Read the message**  
   Recover text from a PDF, screenshot, image, or pasted message.

2. **Find the claims that matter**  
   Identify details such as the court, phone number, URL, reporting date, payment request, or requested action.

3. **Check outside evidence**  
   Compare those claims with independent public sources. The uploaded message is never allowed to prove itself.

4. **Show the result**  
   Every checked claim ends in one of three states:
   - **MATCH** when an independent source supports it
   - **MISMATCH** when an independent source directly contradicts it
   - **COULD_NOT_VERIFY** when the available evidence is not strong enough

5. **Give the user a safe next step**  
   When possible, SEAL provides contact information sourced separately from the suspicious message.

The review experience keeps the original message, the extracted claim, the evidence, and the next step distinct so the user can inspect the comparison rather than accept a black-box score.

## The verification rule

For every extracted claim (c), SEAL produces exactly one result:

[
V(c) \in
\{
\text{MATCH},
\text{MISMATCH},
\text{COULD\_NOT\_VERIFY}
\}
]

A decisive result requires evidence:

[
V(c) \in
\{
\text{MATCH},
\text{MISMATCH}
\}
\Rightarrow
|E(c)| \geq 1
]

A mismatch also requires direct contradiction:

[
V(c)=\text{MISMATCH}
\Rightarrow
E(c)\text{ directly contradicts }c
]

Otherwise:

[
V(c)=\text{COULD\_NOT\_VERIFY}
]

**No independent source, no MATCH. No evidence, no decisive verdict.**

That rule is enforced twice: claim-specific resolver constructors reject decisive states without evidence, and a final merged-result guard re-checks every result before it leaves verification.

A failed search is not treated as proof of fraud. An OCR guess is not promoted into a claim. If official sources materially disagree, SEAL keeps the result unresolved and preserves the conflicting evidence.

## What makes SEAL different

SEAL is not a document summarizer and it is not an authenticity classifier.

It keeps three things separate:

**what the message says**

**what an independent source says**

**what can actually be concluded from the comparison**

One message can therefore contain a confirmed court name, a mismatched payment instruction, and an unverified reporting date at the same time.

No single confidence score hides those differences.

## Primary reviewed verification flow

The first fully reviewed action-first workflow covers a jury-duty impersonation message claiming to involve the **U.S. District Court for the District of Connecticut**.

SEAL can independently check covered action-sensitive claims including:

- suspicious jury-duty payment methods
- message-supplied URLs
- callback instructions in payment or threat contexts
- sensitive-information requests through covered channels
- selected court contact details

The safe-contact route is sourced separately from the message.

Existing Riverside Superior Court coverage remains in the regression suite, including a known case where official sources disagree about the Desert Region jury number. That disagreement intentionally produces **COULD_NOT_VERIFY**, not a forced answer.

For courts outside the reviewed direct-check network, SEAL can still describe readable instructions and, for clearly identified jurisdictions, provide an independently opened official court directory as a navigation aid. A directory handoff never changes the verdict by itself.

## Document handling

The original uploaded binary stays in the browser.

PDF text is read with PDF.js. Images and scanned PDFs use Tesseract.js client-side.

OCR confidence is field-scoped rather than a whole-page pass or fail. If SEAL cannot confidently recover one field, it withholds that field from verification and shows:

> **We couldn't read this field confidently.**

Other readable fields can continue through the pipeline.

Extracted text can be sent to the SEAL server and, when configured, to Groq for structured claim extraction. The original image or PDF is not silently sent to an external model.

SEAL currently has no user account or document database.

## Engineering

SEAL is built with React and TypeScript.

The verification system separates document understanding from evidence resolution:

```text
Document
  |
  v
Text extraction
  |
  v
Optional model structuring
(no verdict field)
  |
  v
Grounded claims
  |
  v
Claim-specific resolver
  |
  v
Independent evidence
  |
  v
Final evidence guard
  |
  v
MATCH / MISMATCH / COULD_NOT_VERIFY
  |
  v
Evidence + safe next step
```

The comparison rules are claim-specific.

A phone number is only contradicted when the message clearly presents it as the relevant official number and comparable official information exists.

A URL is only contradicted when it is presented as the official route and outside evidence establishes another one.

An exact docket match can support a claim, but no docket result remains an absence of evidence rather than proof that the message is false.

Conflicting official sources remain unresolved.

Document language, display language, and jurisdiction are treated as separate concerns. SEAL can translate its explanation while preserving original source wording. Multiple checks can remain open as isolated workspaces so one investigation does not overwrite another.

## Benchmark

The current 15-case engineering benchmark covers:

- the primary jury-message flow
- an unmodified public Connecticut court PDF
- a controlled single-field phone alteration
- Riverside phone and portal alterations
- a nonexistent private identifier
- an unsupported jurisdiction
- degraded OCR
- prompt injection
- a generic paper fee request
- official-source disagreement

Current fixture-set results:

| Metric | Result |
| --- | ---: |
| MISMATCH precision | **1.00** |
| False MISMATCH count | **0** |
| COULD_NOT_VERIFY rate | **0.456** |
| Full-flow success | **0.933** |
| Field extraction accuracy | **0.933 to 1.00** |

These are engineering-fixture measurements, not estimates of real-world accuracy.

There is no consented corpus of genuine personal summonses, real scam-victim screenshots, or uncontrolled camera photos in this repository.

## Demo

The judge demo uses the **City of Dallas published traffic QR-payment scam artifact**.

The point is not to prove that the graphic looks suspicious. Dallas itself published the artifact as a scam example. SEAL demonstrates the harder boundary: it extracts the consequential action, checks outside the message, rejects the QR/payment route from independent evidence, and keeps the underlying case separate when it cannot be established.

The target recording is **87–90 seconds**. It shows one complete chain rather than a feature tour:

```text
artifact → requested action → independent source → verdict boundary → safe action
```

The close is the same rule the code enforces:

> **The seal can be faked. The source can’t.**
>
> **No independent source, no MATCH.**

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run benchmark
npm run e2e
npm run build
```

The repository includes unit tests, browser reliability tests, verification benchmarks, live sanity checks, image-specific release criteria, and regression fixtures for known edge cases.

## Official sources

The reviewed action-first flow currently uses material from:

- U.S. Courts
- Federal Trade Commission
- U.S. District Court for the District of Connecticut
- Riverside Superior Court

SEAL uses reviewed source routes and saved excerpts for decisive checks. It never treats a URL printed inside an uploaded message as trusted merely because it appeared in the document.

Live sources can fail or change. When a required source is unavailable, affected claims abstain rather than silently inheriting a decisive cached result.

## Limits

SEAL does not determine authenticity, legal validity, enforceability, admissibility, or whether a particular person actually owes money or must take an action.

It does not treat the absence of a public record as proof that a message is fraudulent.

Image OCR supports multiple language models, but those are extraction options rather than measured accuracy guarantees. New direct court checks require reviewed sources and claim-specific comparison rules for the issuing court.

The absence of a dedicated resolver must never turn a foreign or unsupported court into a false warning.

## Research notes

- [Action-flow decision and kill test](docs/ACTION_FLOW_DECISION.md)
- [Image-specific release criteria](docs/IMAGE_KILL_TEST.md)
- [Build checkpoints](docs/BUILD_LOG.md)
