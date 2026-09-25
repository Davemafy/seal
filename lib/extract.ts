import {emptyExtraction,type Extraction,type Claim,type Token} from './types';
export function fallbackExtract(text:string):Extraction {
 const e=emptyExtraction();
 const lines=text.split(/\n/).map(s=>s.trim()).filter(Boolean);
 e.court_name=lines.find(s=>/superior court of california|united states district court/i.test(s))||'';
 e.court_location=lines.find(s=>/\d{2,5}\s+[^\n]{3,80}\b(?:street|st\.?|avenue|ave\.?|road|rd\.?)\b/i.test(s))||'';
 e.juror_or_reference_number=lines.find(s=>/\b(?:juror|badge|reference)\s*(?:number|no\.?|#|id)\s*[:#]?\s*[A-Z0-9-]{4,}/i.test(s))?.match(/(?:number|no\.?|#|id)\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1]||'';
 e.case_or_docket_number=lines.find(s=>/\b(?:case|docket)\s*(?:number|no\.?|#)\s*[:#]?\s*[\w-]{4,}/i.test(s))?.match(/(?:number|no\.?|#)\s*[:#]?\s*([\w-]{4,})/i)?.[1]||'';
 e.phone_numbers=[...new Set(text.match(/(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g)||[])];
 e.emails=[...new Set(text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi)||[])];
 e.urls=[...new Set(text.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:gov|com|org|edu|net|mil|us|ca|io|uk|co|info|int)\b(?:\/[\w./?=&%-]*)?/gi)||[])].filter(s=>!e.emails.some(email=>email.includes(s))&&!/riverside\.courts\.ca\.gov/i.test(s) || /(?:https?:\/\/)?jurywest\.riverside\.courts\.ca\.gov/i.test(s));
 e.reporting_date=lines.find(s=>/report(?:ing)?\s+date\s*:/i.test(s))?.replace(/^.*?report(?:ing)?\s+date\s*:\s*/i,'')||'';
 const pay=lines.find(s=>/\$\s*\d+.*(?:pay|payment|confirm|attendance)|(?:pay|payment).*\$\s*\d+/i.test(s));
 if(pay){e.payment_demand.amount=pay.match(/\$\s*\d+(?:\.\d{2})?/)?.[0]||'';e.payment_demand.method=/payment app/i.test(pay)?'payment app':/gift card/i.test(pay)?'gift card':/cryptocurrency/i.test(pay)?'cryptocurrency':/wire transfer/i.test(pay)?'wire transfer':''; e.payment_demand.url=e.urls.find(u=>pay.includes(u))||'';}
 e.threats=lines.filter(s=>/arrest|failure to appear|warrant/i.test(s));
 return e;
}
const clean=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export function locatePhrase(phrase:string,tokens:Token[]):{page:number;source_bbox:{x:number;y:number;width:number;height:number};source_token_range:[number,number]}|undefined{
 const target=clean(phrase); if(!target)return;
 for(let a=0;a<tokens.length;a++){let acc='';for(let b=a;b<Math.min(tokens.length,a+35)&&tokens[b].page===tokens[a].page;b++) {acc+=clean(tokens[b].text);if(acc===target){const slice=tokens.slice(a,b+1);const x=Math.min(...slice.map(t=>t.x)),y=Math.min(...slice.map(t=>t.y));return {page:tokens[a].page,source_bbox:{x,y,width:Math.max(...slice.map(t=>t.x+t.width))-x,height:Math.max(...slice.map(t=>t.y+t.height))-y},source_token_range:[a,b]};}if(acc.length>target.length+8)break;}}
}
export function claimsFromExtraction(e:Extraction,text:string,tokens:Token[]=[]):Claim[]{
 const result:Claim[]=[];const add=(type:Claim['type'],label:string,value:string,context='')=>{if(!value.trim())return;const line=text.split(/\n/).find(s=>s.includes(value))||value;const exact=line.trim();const anchor=locatePhrase(value,tokens);result.push({id:`c${result.length+1}`,type,label,value,exact_source_text:exact,page:anchor?.page||1,source_bbox:anchor?.source_bbox,source_token_range:anchor?.source_token_range,context});};
 add('court','Court identity',e.court_name);add('location','Courthouse address',e.court_location);add('juror','Juror reference',e.juror_or_reference_number);add('reporting_date','Reporting date',e.reporting_date);add('docket','Case docket',e.case_or_docket_number);
 for(const p of e.phone_numbers)add('phone','Jury contact number',p,text.split(/\n/).find(s=>s.includes(p))||'');
 for(const u of e.urls)add('url','Jury service website',u,text.split(/\n/).find(s=>s.includes(u))||'');
 for(const mail of e.emails)add('email','Email address',mail);
 if(e.payment_demand.amount)add('payment','Attendance payment',`${e.payment_demand.amount}${e.payment_demand.method?' via '+e.payment_demand.method:''}`,text.split(/\n/).find(s=>s.includes(e.payment_demand.amount))||'');
 for(const t of e.threats)add('threat','Notice language',t);
 if(e.delivery_method)add('delivery','Delivery method',e.delivery_method);
 return result;
}
