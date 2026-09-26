# Final judge demo — target 2:00–2:20

Keep the recording under three minutes. Record the deployed Cloudflare build, not localhost.

## 0:00–0:12 — Start on a real artifact

Open **Browse real cases** and land on:

**Traffic default notice with QR payment — Dallas, Texas**

Say:

> This notice looks official enough to obey. SEAL's job is not to decide whether it looks fake. It isolates what the message asks you to do, then shows what independent public sources can actually support.

Click **Run in SEAL**.

Do not narrate implementation yet.

## 0:12–0:38 — Show the action, not the whole document

Keep the same source artifact visible.

Show the decision-driving instruction:

> Scan the QR code to settle your unpaid balance.

Let the review film establish the document and requested action, then move immediately to the result.

Say:

> SEAL keeps the original beside the result so the evidence chain never becomes an AI summary detached from the message.

## 0:38–1:05 — Independent evidence

Show the source relationship and the strongest evidence cards.

Point out separately:

- the FTC traffic-ticket scam warning matching the traffic hearing + case number + pay-or-appear + QR-payment pattern;
- the Dallas/Miami-Dade published scam examples when the reused case-number pattern is present;
- **direct court confirmation is still treated separately** when SEAL cannot establish the individual case.

Say:

> Pattern evidence is not case authentication. SEAL keeps those two claims separate.

Open one official source link briefly.

## 1:05–1:22 — Safe route

Show **Safest next step**.

Say:

> When SEAL cannot verify the case directly, it does not tell the user the notice is safe or fake. It tells them not to use the supplied payment route and gives an independent path to verify before acting.

## 1:22–1:45 — Legitimate contrast

Return to **Browse real cases** and run:

**Sample federal jury summons — District of Connecticut**

Show that supported public details can MATCH while juror-specific or historical details remain **COULD NOT VERIFY**.

Say:

> The same system can corroborate public details without authenticating a private summons. A match is not a blanket approval.

This contrast is important. It shows SEAL is not a red-flag classifier.

## 1:45–2:03 — Reliability proof

Cut to a terminal or README section showing the release gates.

Say:

> We built explicit abstention into the engine. Our fixture benchmark has zero false MISMATCH verdicts, and the current 15-case live action stress gate correctly extracts the requested action or refuses the input on all 15 cases. Those are engineering tests, not a claim of real-world accuracy.

Show only the numbers long enough to read:

- 15/15 live action extraction-or-refusal gate
- 0 false MISMATCH on the checked-in benchmark
- unsupported or unreadable inputs abstain

## 2:03–2:15 — Close

Return to the Dallas result with the original artifact still visible.

Final line:

> SEAL does not ask people to trust another AI verdict. It shows what the message asks them to do, what independent sources support, what they do not, and where to verify before acting.

End on the live product URL.

## Recording rules

- No feature tour.
- No architecture monologue before value is visible.
- No claim that SEAL detects scams, authenticates documents, or supports every court.
- Never call pattern evidence direct case verification.
- Keep the Dallas artifact visually continuous through the main demonstration.
- If an API/model is rate-limited during recording, the conservative deterministic fallback is acceptable; do not hide an abstention.
- Do not spend more than ~10 seconds in Browse.
