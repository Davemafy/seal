export type BrowseDiscoverySource={
 id:string;
 indexUrl:string;
 allowedHosts:string[];
 issuer:string;
 jurisdiction:string;
 country:string;
 language:string;
 ocrLanguage:'eng'|'spa'|'por'|'fra';
 classification:'Confirmed scam example'|'Official scam advisory';
 category:'jury-duty-payment-demand'|'fake-summons-arrest-threat'|'personal-information'|'court-payment-fee'|'official-scam-guidance';
 section:'court-message-scams'|'jury-duty-threats';
 includeTerms:string[];
 explicitEvidence:RegExp;
 sourceTitlePrefix:string;
};

export const browseDiscoverySources:BrowseDiscoverySource[]=[
 {
  id:'maryland-judiciary-news',
  indexUrl:'https://www.mdcourts.gov/media/news',
  allowedHosts:['www.mdcourts.gov','mdcourts.gov'],
  issuer:'Maryland Judiciary',
  jurisdiction:'Maryland',
  country:'United States',
  language:'English',
  ocrLanguage:'eng',
  classification:'Confirmed scam example',
  category:'fake-summons-arrest-threat',
  section:'court-message-scams',
  includeTerms:['scam','text scam','telephone scam','traffic violation','toll violation','parking violation'],
  explicitEvidence:/\b(?:this is a scam|these texts[^.]{0,90}are a scam|scam alert)\b/i,
  sourceTitlePrefix:'Maryland Judiciary'
 },
 {
  id:'supreme-court-india-notices',
  indexUrl:'https://www.sci.gov.in/notices-and-circulars/',
  allowedHosts:['www.sci.gov.in','sci.gov.in','cdnbbsr.s3waas.gov.in'],
  issuer:'Supreme Court of India',
  jurisdiction:'India',
  country:'India',
  language:'English',
  ocrLanguage:'eng',
  classification:'Official scam advisory',
  category:'official-scam-guidance',
  section:'court-message-scams',
  includeTerms:['fake website','fake websites','impersonating the official website','fraudulent website'],
  explicitEvidence:/\b(?:fake website|fake websites|impersonating the official website|fraudulent website)\b/i,
  sourceTitlePrefix:'Supreme Court of India'
 },
 {
  id:'eastern-district-texas-scam-index',
  indexUrl:'https://www.txed.uscourts.gov/?q=node%2F13137',
  allowedHosts:['www.txed.uscourts.gov','txed.uscourts.gov','coop.txed.uscourts.gov'],
  issuer:'U.S. District Court — Eastern District of Texas',
  jurisdiction:'Eastern District of Texas',
  country:'United States',
  language:'English',
  ocrLanguage:'eng',
  classification:'Official scam advisory',
  category:'jury-duty-payment-demand',
  section:'jury-duty-threats',
  includeTerms:['jury duty scam','jury scam','court related scams','spoof','false jury service'],
  explicitEvidence:/\b(?:jury(?: duty)? scam|scams? target|false jury service|fraudulent)\b/i,
  sourceTitlePrefix:'Eastern District of Texas'
 }
];

export function hostAllowed(url:string,source:BrowseDiscoverySource){
 try{
  const host=new URL(url).hostname.toLowerCase();
  return source.allowedHosts.some(allowed=>host===allowed||host.endsWith('.'+allowed));
 }catch{return false}
}
