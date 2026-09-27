# Architecture

Browser binary to PDF.js text items or Tesseract word boxes to extracted text to optional Groq schema extraction on server to atomic claim objects to allowlisted server resolvers to three-state verdicts to source highlights and evidence.

The binary is never uploaded. The text is transient in the request and no server persistence is configured. Groq cannot issue a verdict. Source provenance includes URL, title, excerpt, check timestamp, and LIVE or SNAPSHOT mode. Snapshot mode is only for deterministic recording; live fetching uses fixed Riverside paths with 8-second timeouts, manual redirect validation and Cheerio text parsing. Uploaded links are never fetched.

`lib/resolver.ts` centralizes verdict gates. Riverside compares court identity, Historic Courthouse location, published jury contact, official portal, and SMS/call payment warning. CourtListener search is optional and exact docket results only; no results abstain. Unsupported courts abstain. The official source conflict for the Desert Region number is preserved with both excerpts.

The image preview has OCR word boxes; PDF extraction retains text item coordinates. The document/result overlay uses a ResizeObserver and claim refs on desktop. Mobile stacks source and result without crossing lines. In demo mode, hand laid text lines provide deterministic anchors.
