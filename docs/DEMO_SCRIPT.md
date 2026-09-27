# Final judge demo — target 2:15–2:35

Keep the recording under three minutes. Record the deployed Cloudflare build, not localhost.

The demo thesis is simple:

> ChatGPT can analyze what you gave it. SEAL is built to distrust what you gave it.

Do not start with architecture.

## 0:00–0:12 — Start on the artifact

Open **Browse** and choose the Dallas traffic notice with the QR payment route.

Say:

> This looks official enough to obey. SEAL does not decide whether it looks fake. It starts with the action the message wants me to take.

Click **Run in SEAL**.

## 0:12–0:35 — Requested action

Keep the original artifact visible.

Show the decision-driving instruction:

> Scan the QR code to settle your unpaid balance.

Say:

> The document itself is not evidence. SEAL keeps the original attached to the check, extracts the requested action, and then verifies against sources outside the message.

Move to **Evidence**.

## 0:35–1:02 — Independent evidence

Show the strongest public-source finding and open one original source briefly.

Point out the distinction:

- pattern/process evidence can match what the notice is doing;
- that is not the same as authenticating the individual case.

Say:

> SEAL separates evidence about the pattern from evidence about the actual case. It does not turn a warning page into a fake-case verdict.

## 1:02–1:22 — Resolve

Move horizontally to **Resolve**.

Show the independent next route rather than any number, URL, or QR code from the notice.

Say:

> If SEAL cannot establish the case directly, it keeps the instruction unverified and gives me a route I can reach independently.

## 1:22–1:50 — Global + parallel moment

Start **New check** while the Dallas check remains available.

Run the New Delhi coverage-limit example.

Show the detected document language / jurisdiction context and the official India eCourts route.

If the display-language switch is stable in the deployed build, change it once and show that the explanation translates while the source evidence remains canonical.

Say:

> Language and jurisdiction are separate. SEAL can explain the check in the user's language, but verification still follows the document's jurisdiction. And starting a second check does not destroy the first one.

Switch back to Dallas once to prove the first check is still intact.

## 1:50–2:10 — Legitimate contrast

Run the Connecticut sample.

Show that public court details can match while private or historical details remain **COULD NOT VERIFY**.

Say:

> A match is not a blanket approval. SEAL can corroborate a public detail without authenticating a private summons.

## 2:10–2:25 — Reliability proof

Show the repository/release gates briefly.

Say:

> The engine is designed to abstain. Our checked-in benchmark has zero false MISMATCH verdicts, and unsupported or unreadable inputs stay unverified instead of being guessed.

Show only:

- zero false MISMATCH on the checked-in benchmark;
- action extraction-or-refusal stress gate;
- browser reliability / CI passing on the submission build.

## 2:25–2:35 — Close

Return to the live product.

Final line:

> SEAL does not ask people to trust another AI verdict. It shows what the message asks them to do, what independent sources can support, what they cannot, and where to verify before acting.

## Recording rules

- No feature tour.
- No architecture monologue before value is visible.
- Do not claim SEAL authenticates documents, determines fraud, or has direct case coverage for every court.
- Never call pattern/process evidence direct case verification.
- Keep the original artifact visible through the core result.
- Show the horizontal Result, Original, Evidence, and Resolve interaction once, not repeatedly.
- Show parallel checks once; do not turn the demo into workspace management.
- Translation may explain SEAL's result, but do not imply translated text replaces the original evidence.
- If a model/API is rate-limited during recording, use the conservative fallback or record after the provider recovers; never hide an abstention.
