# Final judge demo — target 87–90 seconds

Record the deployed Cloudflare build. This is a proof of one trust boundary, not a product tour.

## What the judge should remember

**The seal can be faked. The source can’t.**

**No independent source, no MATCH.**

**The model can extract a claim. It cannot promote that claim to a verdict.**

## 0:00–0:12 — The trap

Start on the Dallas artifact itself, already large enough to read.

Say:

> This looks like a court notice: case number, court language, a QR code, and a payment route. The City of Dallas published this exact artifact as a scam.

Do not begin on the SEAL homepage and do not explain the stack yet.

## 0:12–0:24 — What the message wants

Run the artifact in SEAL and keep the original visible.

Point to the consequential instruction:

> Scan the QR code to settle your unpaid balance.

Say:

> SEAL does not authenticate the appearance. It extracts the action the message is trying to cause.

## 0:24–0:43 — Independent evidence

Show the strongest Dallas source evidence and the result.

Say:

> The message is not allowed to prove itself. SEAL checks outside it. Dallas published this exact example, so the QR-payment route can be rejected from evidence the sender does not control.

Briefly open the original City of Dallas source if the transition is clean; otherwise keep the source card visible and readable.

## 0:43–0:58 — The engineering boundary

Show one clean architecture frame or repository excerpt:

```text
artifact → claims → independent resolvers → verdict boundary → safe action
```

Say:

> AI can structure the claim, but the extraction schema has no verdict field. MATCH or MISMATCH only survives if resolver evidence crosses the final code boundary. No evidence means no decisive verdict.

Do not list libraries or infrastructure.

## 0:58–1:10 — Prove restraint

Return to the Dallas result and show that rejecting the QR/payment route does **not** magically authenticate or invalidate every underlying case detail.

Say:

> Notice the narrower conclusion: SEAL can reject this route while leaving the underlying matter unconfirmed. A matching detail is not blanket approval, and missing evidence is not proof of fraud.

This single moment demonstrates COULD_NOT_VERIFY without spending time on a second full case.

## 1:10–1:22 — Benchmark

Show the benchmark/CI proof as text, not a scrolling terminal.

Say:

> The checked-in 15-case engineering benchmark has zero false MISMATCH verdicts and 0.933 full-flow success. A separate action stress gate is 15 out of 15. These are controlled engineering measurements, not real-world accuracy claims.

## 1:22–1:29 — Close

Return to the artifact/result composition.

Final line:

> The seal can be faked. The source can’t. SEAL never asks you to trust the message—or the model—as the authority.

## Recording rules

- Keep the recording under 90 seconds if possible; never pad to the three-minute allowance.
- One complete Dallas chain beats three partial case tours.
- Do not tour Browse, onboarding, translation, workspace tabs, or settings.
- Do not say “AI detects scams.”
- Do not claim SEAL authenticates a sender or whole document.
- Do not call pattern evidence direct case verification.
- Keep the original artifact visible during the core evidence comparison.
- If a live source/model call is flaky, use the deterministic/snapshot-safe path already supported by the product rather than hiding an abstention.
- End on the invariant, not the tech stack.