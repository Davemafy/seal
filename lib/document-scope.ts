export type EmbeddedRecipientScope={
 documentRole:'mixed_with_embedded_example';
 analysisText:string;
 wrapperText:string;
 marker:string;
};

const EMBEDDED_MARKER=/((?:sample|example)(?:\s+of)?\s+(?:(?:a|an)\s+)?(?:(?:fraudulent|fraud|fake|scam|suspicious|phishing)\s+)?(?:email|e-mail|text(?:\s+message)?|message|notice|summons|order|letter|communication))\b/i;
const COURTISH=/\b(?:court|courts|tribunal|tribunals|judiciary|judicial|jury|juror|clerk)\b/i;

function advisoryScore(value:string){
 let score=0;
 if(/\bpublic\s+notice\b/i.test(value))score+=4;
 if(/\b(?:scam|fraud)\s+(?:alert|warning|notice)\b/i.test(value))score+=4;
 if(/\b(?:warning|advisory)\b/i.test(value))score+=2;
 if(/\b(?:fraudulent|fraud|scam|fake|impersonat(?:e|ing|ion)|phishing)\b/i.test(value))score+=2;
 if(/\b(?:made aware of|please be advised|public alert|consumer alert)\b/i.test(value))score+=1;
 return score;
}

/**
 * Separates an official warning/advisory wrapper from a recipient-facing sample
 * embedded inside it. The detector is intentionally conservative: a sample
 * heading alone is not enough; the preceding wrapper must independently look
 * like court-related fraud/advisory material.
 */
export function detectEmbeddedRecipientScope(text:string):EmbeddedRecipientScope|null{
 if(!text||text.length<80)return null;
 const match=EMBEDDED_MARKER.exec(text);
 EMBEDDED_MARKER.lastIndex=0;
 let resolved=match;
 if(!resolved||typeof resolved.index!=='number'){
  const normalized=text.normalize('NFKC');
  const fallback=/(?:sample|example)\W{0,12}(?:of\W{0,8})?(?:fraudulent|fraud|fake|scam|suspicious|phishing)\W{0,12}(?:e-?mail|message|notice|summons|order|letter|communication)\b/i.exec(normalized);
  if(!fallback||typeof fallback.index!=='number')return null;
  resolved=fallback as RegExpExecArray;
 }
 const matchIndex=resolved.index;
 const fullMatch=resolved[0]||'';
 const markerCapture=resolved[1]||fullMatch;

 const markerText=markerCapture.trim();
 const markerOffset=fullMatch.lastIndexOf(markerCapture);
 const markerStart=matchIndex+Math.max(0,markerOffset);
 const prefix=text.slice(0,markerStart).trim();
 if(prefix.length<40||!COURTISH.test(prefix)||advisoryScore(prefix)<4)return null;

 const analysisText=text.slice(markerStart).trim();
 if(analysisText.length<40)return null;
 const marker=markerText;
 return {
  documentRole:'mixed_with_embedded_example',
  analysisText,
  wrapperText:prefix,
  marker
 };
}
