export type JurisdictionInference={
 jurisdiction:string;
 countryCode:string;
 evidenceQuote:string;
 confidence:number;
};

const compact=(value:string)=>value.normalize('NFKC').replace(/\s+/g,' ').trim();

export function groundJurisdictionInference(
 text:string,
 candidate:JurisdictionInference
):JurisdictionInference|null{
 const jurisdiction=compact(candidate.jurisdiction||'');
 const evidenceQuote=compact(candidate.evidenceQuote||'');
 const countryCode=(candidate.countryCode||'').trim().toUpperCase();
 const confidence=Number(candidate.confidence||0);

 if(!jurisdiction||!evidenceQuote||confidence<65)return null;
 if(countryCode&&!/^[A-Z]{2}$/.test(countryCode))return null;

 const haystack=compact(text).toLocaleLowerCase();
 const needle=evidenceQuote.toLocaleLowerCase();
 if(needle.length<3||!haystack.includes(needle))return null;

 return {
  jurisdiction,
  countryCode,
  evidenceQuote,
  confidence:Math.max(0,Math.min(100,confidence))
 };
}
