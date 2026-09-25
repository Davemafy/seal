import {emptyExtraction,type Extraction,type Claim,type Token} from './types';
export function fallbackExtract(text:string):Extraction {
 const e=emptyExtraction();
 const lines=text.split(/\n/).map(s=>s.trim()).filter(Boolean);
 e.court_name=lines.find(s=>/superior court of california|united states district court/i.test(s))||'';
 e.court_location=(lines.find(s=>/\d{2,5}\s+[^\n]{3,80}\b(?:street|st\.?|avenue|ave\.?|road|rd\.?)\b/i.test(s))||'').replace(/\s+/g,' ');
 e.juror_or_reference_number=lines.find(s=>/\b(?:juror|badge|reference)\s*(?:number|no\.?|#|id)\s*[:#]?\s*[A-Z0-9-]{4,}/i.test(s))?.match(/(?:number|no\.?|#|id)\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1]||'';
 e.case_or_docket_number=lines.find(s=>/\b(?:case|docket)\s*(?:number|no\.?|#)\s*[:#]?\s*[\w-]{4,}/i.test(s))?.match(/(?:number|no\.?|#)\s*[:#]?\s*([\w-]{4,})/i)?.[1]||'';
 e.phone_numbers=[...new Set(text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g)||[])];
 e.emails=[...new Set(text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi)||[])];
 e.urls=[...new Set(text.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:gov|com|org|edu|net|mil|us|ca|io|uk|co|info|int)\b(?:\/[\w./?=&%-]*)?/gi)||[])].filter(s=>(!e.emails.some(email=>email.includes(s))&&!/riverside\.courts\.ca\.gov/i.test(s))||/(?:https?:\/\/)?jurywest\.riverside\.courts\.ca\.gov/i.test(s));
 e.reporting_date=lines.find(s=>/report(?:ing)?\s+date\s*:/i.test(s))?.replace(/^.*?report(?:ing)?\s+date\s*:\s*/i,'')||'';
 const pay=lines.find(s=>/(?:pay|payment|fine|fee|send).*(?:\$\s*\d+|gift card|payment app|cash app|zelle|venmo|bitcoin|crypto|cryptocurrency|wire transfer)|(?:\$\s*\d+|gift card|payment app|cash app|zelle|venmo|bitcoin|crypto|cryptocurrency|wire transfer).*(?:pay|payment|fine|fee|send)/i.test(s));
 if(pay){e.payment_demand.amount=pay.match(/\$\s*\d+(?:[,.]\d{3})*(?:\.\d{2})?/)?.[0]||'';e.payment_demand.method=/payment app|cash app|zelle|venmo/i.test(pay)?'payment app':/gift card|prepaid/i.test(pay)?'gift card':/bitcoin|crypto/i.test(pay)?'cryptocurrency':/wire transfer|western union|moneygram/i.test(pay)?'wire transfer':'';e.payment_demand.url=e.urls.find(u=>pay.includes(u))||'';}
 e.information_requests=lines.filter(s=>/(?:provide|send|reply|confirm|enter|share).*(?:social security|ssn|date of birth|birthdate|bank account|credit card|debit card|driver.?s license|passport|personal information)/i.test(s));
 e.threats=lines.filter(s=>/arrest|failure to appear|warrant|jail|contempt/i.test(s));
 e.delivery_method=/\btext message|\bsms\b/i.test(text)?'text message':/\bemail\b/i.test(text)?'email':/\bphone call|\bcall(?:er|ing)?\b/i.test(text)?'phone call':'';
 return e;
}
const clean=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export function recoverLabeledJurorNumber(tokens:Token[]):string {
 for(let i=0;i<tokens.length;i++){
  if(!/^juror$/i.test(tokens[i].text.trim()))continue;
  const label=tokens.slice(i+1,i+5).find(t=>t.page===tokens[i].page&&/^number:?$/i.test(t.text.trim())&&Math.abs(t.y-tokens[i].y)<0.015&&t.x>tokens[i].x);
  if(!label)continue;
  const nearby=tokens.filter(t=>t.page===label.page&&t.x>label.x+label.width+0.005&&t.x<label.x+0.35&&Math.abs(t.y-label.y)<0.018&&/^\d{2,}-\d{3,}$/.test(t.text.trim()));
  if(nearby.length===1)return nearby[0].text.trim();
 }
 return '';
}
export function recoverLabeledReportingDate(tokens:Token[]):string {
 for(const label of tokens){
  if(!/^date:$/i.test(label.text.trim()))continue;
  const value=tokens.filter(t=>t.page===label.page&&t.x>label.x+0.11&&t.y>=label.y-0.017&&t.y<=label.y+0.013&&t.text.trim());
  const rows=new Map<number,Token[]>();for(const token of value){const row=Math.round(token.y*100);rows.set(row,[...(rows.get(row)||[]),token])}
  const printed=[...rows].sort((a,b)=>a[0]-b[0]).map(([,row])=>row.sort((a,b)=>a.x-b.x).map(t=>t.text).join(' ').replace(/\s+/g,' ').trim()).join(' ').replace(/\s+/g,' ').trim();
  if(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}/i.test(printed)&&/\b(?:19|20)\d{2}\b/.test(printed))return printed;
 }
 return '';
}
export function locatePhrase(phrase:string,tokens:Token[]):{page:number;source_bbox:{x:number;y:number;width:number;height:number};source_token_range:[number,number]}|undefined{
 const target=clean(phrase);if(!target)return;
 for(let a=0;a<tokens.length;a++){let acc='';for(let b=a;b<Math.min(tokens.length,a+35)&&tokens[b].page===tokens[a].page;b++){acc+=clean(tokens[b].text);if(acc===target){const slice=tokens.slice(a,b+1);const x=Math.min(...slice.map(t=>t.x)),y=Math.min(...slice.map(t=>t.y));return {page:tokens[a].page,source_bbox:{x,y,width:Math.max(...slice.map(t=>t.x+t.width))-x,height:Math.max(...slice.map(t=>t.y+t.height))-y},source_token_range:[a,b]};}if(acc.length>target.length+8)break;}}
}
export function claimsFromExtraction(e:Extraction,text:string,tokens:Token[]=[]):Claim[]{
 const result:Claim[]=[];
 const add=(type:Claim['type'],label:string,value:string,context='')=>{if(!value.trim())return;const line=text.split(/\n/).find(s=>s.includes(value))||context||value;const exact=line.trim();const anchor=locatePhrase(value,tokens);result.push({id:`c${result.length+1}`,type,label,value,exact_source_text:exact,page:anchor?.page||1,source_bbox:anchor?.source_bbox,source_token_range:anchor?.source_token_range,context:context||exact});};
 add('court','Court identity',e.court_name);add('location','Courthouse address',e.court_location);add('juror','Juror reference',e.juror_or_reference_number);add('reporting_date','Reporting date',e.reporting_date);add('docket','Case docket',e.case_or_docket_number);
 for(const p of e.phone_numbers){const line=text.split(/\n/).find(s=>s.includes(p))||'';const anchor=locatePhrase(p,tokens);const token=anchor&&tokens[anchor.source_token_range[0]];const printedLabel=token&&tokens.filter(t=>t.page===token.page&&t.x<token.x&&t.x>token.x-.2&&Math.abs(t.y-token.y)<.02).map(t=>t.text).join(' ').replace(/\s+/g,' ').trim();const printedRight=token&&tokens.filter(t=>t.page===token.page&&t.x>token.x+token.width&&t.x<token.x+.4&&Math.abs(t.y-token.y)<.02).sort((a,b)=>a.x-b.x).map(t=>t.text).join(' ').replace(/\s+/g,' ').trim();const printedLine=printedLabel&&/phone\s+to\s+call\s*:/i.test(printedLabel)?`${printedLabel} ${p} ${printedRight||''}`:line;add('phone',/\b(?:call|contact|text)\b/i.test(printedLine)?'Requested callback':'Jury contact number',p,printedLine);}
 for(const u of e.urls){const line=text.split(/\n/).find(s=>s.includes(u))||'';add('url',/\b(?:visit|open|click|go to|pay)\b/i.test(line)?'Requested link':'Jury service website',u,line);}
 for(const mail of e.emails)add('email','Email address',mail);
 if(e.payment_demand.amount){const line=text.split(/\n/).find(s=>s.includes(e.payment_demand.amount))||'';add('payment','Requested payment',line.trim()||`${e.payment_demand.amount}${e.payment_demand.method?' via '+e.payment_demand.method:''}`,line);}
 for(const info of e.information_requests)add('information','Requested information',info,info);
 for(const t of e.threats)add('threat','Threat or consequence',t,t);
 if(e.delivery_method)add('delivery','Delivery method',e.delivery_method);
 return result;
}
