# Architecture

## The system in one line

`artifact → grounded claims/actions → independent resolvers → deterministic verdict boundary → sourced safe action`

## Distribution of authority

| Layer | Allowed to do | Not allowed to do |
| --- | --- | --- |
| Uploaded artifact | Supply text and the action being requested | Prove its own authenticity |
| OCR / PDF extraction | Recover visible text and coordinates | Repair unreadable facts into certainty |
| Optional LLM extraction | Structure grounded fields/actions from the supplied text | Emit or control MATCH / MISMATCH |
| Resolver layer | Compare claims with reviewed independent public sources | Treat absence as contradiction |
| Verdict boundary | Admit evidence-backed MATCH/MISMATCH or abstain | Promote an unsupported conclusion |
| Safe-action layer | Route the user to an independently sourced official next step | Reuse a phone/link merely because it appeared in the message |

## Runtime path

```text
image / PDF / pasted text
        ↓
browser PDF.js / Tesseract or pasted text
        ↓
optional Groq structured extraction
(schema has no verdict field)
        ↓
grounding + sanitization
(exact quote / field confidence)
        ↓
atomic Claim objects
        ↓
reviewed resolver + public-source checks
        ↓
assertVerdictBoundary()
        ↓
MATCH / MISMATCH / COULD_NOT_VERIFY
        ↓
cited evidence + independently sourced safe action
```

## Why the model is not the authority

`app/api/extract/route.ts` instructs the model to extract only visible fields/actions and explicitly says not to determine authenticity or legal validity. The strict extraction schema has no verdict property. Model-generated actions are subsequently grounded back to source text; unsupported or invented fields fall back to deterministic extraction.

`app/api/verify/route.ts` accepts grounded claims and invokes `verifyClaims(...)`. Verdicts are produced by application code against reviewed evidence adapters, not by a model completion.

`lib/resolver.ts` rejects decisive verdicts without evidence and re-checks the final merged results before returning verification.

## Evidence and provenance

Evidence records include URL, title, excerpt, check timestamp, and LIVE or SNAPSHOT mode. Snapshot mode exists for deterministic recording and regression tests; live fetching uses reviewed source routes and timeouts. Uploaded links are never treated as trusted evidence simply because they appeared in the artifact.

## Privacy / document handling

The original uploaded binary remains in the browser. Extracted text is transient in the request and may be sent to Groq for structured extraction when configured. No server-side user/document persistence is configured.

## Failure behavior

Unsupported jurisdiction, unreadable fields, unavailable sources, private identifiers, and official-source disagreement resolve to **COULD_NOT_VERIFY** rather than a guessed positive or negative result.

That abstention behavior is part of the architecture, not an error state.