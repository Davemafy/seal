# Action-first product decision — 25 September 2026

## Decision

SEAL's primary workflow is no longer “authenticate a court notice.”

It is:

> A person receives a message claiming to be from a court and is told to call a number, open a link, pay, or disclose information. SEAL extracts the requested action, checks only the atomic claims that an independent official source can establish, and gives the person a court contact sourced independently from the message.

The first complete workflow is a **jury-duty impersonation message claiming to be from the U.S. District Court for the District of Connecticut**. Existing Riverside Superior Court and public Connecticut summons coverage remain regression coverage.

This is intentionally narrow. The official sources are strong enough to support the action checks, and the Connecticut court publishes a separate jury contact that can be used as a safe next step.

## Why this direction survived critique

A PDF-first “notice verifier” has a dangerous failure mode: a matching court name, address, portal, or public phone can make a forged message look reassuring even though those public details are easy to copy. Public-data matching therefore cannot establish authenticity.

The action-first workflow asks a different question: **does the message tell the recipient to do something that current official guidance directly contradicts?** That produces a smaller but more useful set of decisive statements.

Current official guidance supports this workflow:

- U.S. Courts, “Juror Scams”: people targeted by jury scams may receive calls, emails, or other messages; recipients should not provide requested information and should notify the Clerk of Court. https://www.uscourts.gov/court-programs/jury-service/juror-scams
- FTC, 26 June 2026: courts never demand payment over the phone, and scammers demanding jury-duty money may insist on payment apps, cryptocurrency, gift cards, or wire transfers. https://consumer.ftc.gov/consumer-alerts/2026/06/ignore-calls-texts-and-emails-threatening-arrest-you-missing-jury-duty
- FTC, fake jury-duty websites: if a jury-duty caller gives a URL, do not use that URL; independently look up the court's real website. https://consumer.ftc.gov/consumer-alerts/2025/08/scammers-are-using-fake-websites-twist-jury-duty-scams
- FTC, government impersonation scams: government agencies do not call, email, text, or message people to ask for money or personal information; contact the agency using a number independently known to be correct. https://consumer.ftc.gov/articles/how-avoid-government-impersonation-scam
- District of Connecticut Jury Info: warns about jury-duty calls threatening arrest unless a fine is paid and says not to disclose personal information or pay the fine. https://www.ctd.uscourts.gov/jury-info
- District of Connecticut jury contact page: publishes 866-388-2430 for status checks and 800-827-8224 for other jury questions. https://www.ctd.uscourts.gov/contact-parking-information

## Verification law

The existing three verdicts remain unchanged: MATCH, MISMATCH, COULD_NOT_VERIFY.

A MISMATCH means the saved official source directly contradicts the exact atomic claim or requested action. An unfamiliar number, missing database row, suspicious wording, or OCR guess is not a contradiction.

If two official sources disagree, SEAL returns COULD_NOT_VERIFY with “Official sources currently disagree.” Both sources and checked timestamps remain visible. Riverside's 760-342-6264 / 951-342-6264 conflict is retained as a regression fixture.

Matching public court details never authenticates a message, summons, or individual juror record.

## Primary kill test

The direction survives only if all of the following pass:

1. The clearly labeled synthetic Connecticut jury-scam message yields three sourced MISMATCH action checks: the requested payment, requested callback in the payment/threat context, and requested personal-information reply. It must also expose 800-827-8224 from the court's own page as the safe contact.
2. The same resolver must keep an unrelated unfamiliar phone number COULD_NOT_VERIFY.
3. A synthetic jury-status image with the court's published status number can MATCH, while a clearly labeled single-field alteration can MISMATCH only when the message explicitly designates the altered value as the jury status line.
4. The dense PNG raster of the unmodified public Connecticut sample must not be rejected because of one whole-page OCR score. High-confidence fields remain checkable. A low-confidence phone field is withheld from verification and displayed as “We couldn’t read this field confidently.”
5. Unsupported jurisdictions return no decisive verdicts.
6. Official-source disagreement returns COULD_NOT_VERIFY with both sources.
7. A failed live fetch cannot silently fall back to a decisive snapshot verdict; affected checks abstain while the separately labeled safe-contact snapshot can remain available.
8. Benchmark false-MISMATCH count remains zero.

## Limits

This work does **not** show accuracy on personal summonses, camera photos, or real scam messages. The primary demo is synthetic and based on published scam patterns. The Connecticut sample PDF is a public sample form. Neither validates real-world demand or uptake.

SEAL is not affiliated with any court. It does not make a final authenticity or legal-validity judgment.
