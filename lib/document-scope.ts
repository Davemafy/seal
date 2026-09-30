export type EmbeddedRecipientScope={
 documentRole:'mixed_with_embedded_example';
 analysisText:string;
 wrapperText:string;
 marker:string;
};

// Provider-failure fallback only. Keep this intentionally narrow: primary
// document segmentation belongs to the grounded semantic model.
const EMBEDDED_MARKER=/^(\s*((?:sample|example)(?:\s+of)?\s+(?:(?:a|an)\s+)?(?:(?:fraudulent|fraud|fake|scam|suspicious|phishing)\s+)?(?:email|e-mail|text(?:\s+message)?|message|notice|summons|order|letter|communication)\b[^\n]{0,120}))$/im;
const COURTISH=/\b(?:court|courts|tribunal|tribunals|judiciary|judicial|jury|juror|clerk)\b/i;

function advisoryScore(value:string){
 let score=0;
 if(/\bpublic\s+notice\b/i.test(value))score+=4;
 if(/\b(?:scam|fraud)\s+(?:alert|warning|notice)\b/i.test(value))score+=4;
 if(/\b(?:warning|advisory)\b/i.test(value))score+=2;
 if(/\b(?:fraudulent|fraud|scam|fake|impersonat(?:e|ing|ion)|phishing)\b/i.test(value))score+=2;
 return score;
}

export function detectEmbeddedRecipientScope(text:string):EmbeddedRecipientScope|null{
 if(!text||text.length<80)return null;
 const match=EMBEDDED_MARKER.exec(text);
 EMBEDDED_MARKER.lastIndex=0;
 if(!match||typeof match.index!=='number')return null;
 const lineStart=text.lastIndexOf('\n',Math.max(0,match.index-1))+1;
 const prefix=text.slice(0,lineStart).trim();
 if(prefix.length<40||!COURTISH.test(prefix)||advisoryScore(prefix)<4)return null;
 const analysisText=text.slice(lineStart).trim();
 if(analysisText.length<40)return null;
 return {documentRole:'mixed_with_embedded_example',analysisText,wrapperText:prefix,marker:(match[2]||match[0]||'').trim()};
}
