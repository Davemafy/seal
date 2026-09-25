import {emptyExtraction,type Extraction,type Claim,type Token,type ActionNode,type ClaimType} from './types';

const PHONE=/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;
const URL=/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:gov|com|org|edu|net|mil|us|ca|io|uk|co|info|int)\b(?:\/[\w./?=&%-]*)?/i;
const MONEY=/(?:\$\s*\d+(?:[,.]\d{3})*(?:\.\d{2})?|\b\d+(?:[,.]\d{3})*(?:\.\d{2})?\s*(?:usd|dollars?)\b)/i;
const ACTION_VERBS=/\b(pay|remit|submit|transfer|call|contact|phone|text|open|visit|click|scan|reply|provide|share|enter|send|disclose|appear|report|attend)\b/i;
const FIELD_CONFIDENCE=80;

function courtLineScore(line:string){
 if(!/\bcourt\b/i.test(line))return -Infinity;
 let score=2;
 if(/\b(?:district|superior|circuit|supreme|municipal|magistrate|appeals?|bankruptcy|traffic|county)\b/i.test(line))score+=3;
 if(line.length<100)score+=1;
 if(/\b(?:pay|call|click|scan|provide|appear|required|failure|costs?|payment)\b/i.test(line))score-=3;
 return score;
}

function extractCourtName(lines:string[]){
 let index=-1,best=-Infinity;
 lines.forEach((line,i)=>{const score=courtLineScore(line);if(score>best){best=score;index=i}});
 if(index<0)return '';
 let value=lines[index];
 const next=lines[index+1]||'';
 const continuation=/\b(?:of|for|in|—|-)\s*$/i.test(value)||/^(?:district|division|county|circuit|for\b|of\b)/i.test(next);
 if(continuation&&next.length<=90&&!/[.!?]$/.test(value))value=`${value} ${next}`.replace(/\s+/g,' ').trim();
 return value;
}

function tokenActionSegments(tokens:Token[]):string[]{
 if(!tokens.length)return [];
 const byPage=new Map<number,Token[]>();
 for(const token of tokens)byPage.set(token.page,[...(byPage.get(token.page)||[]),token]);
 const segments:string[]=[];
 for(const pageTokens of byPage.values()){
  const sorted=[...pageTokens].filter(t=>t.text.trim()).sort((a,b)=>a.y-b.y||a.x-b.x);
  const rows:Token[][]=[];
  for(const token of sorted){
   const row=rows.find(r=>Math.abs((r.reduce((sum,t)=>sum+t.y,0)/r.length)-token.y)<Math.max(.012,token.height*.7));
   if(row)row.push(token);else rows.push([token]);
  }
  for(const row of rows){
   const ordered=row.sort((a,b)=>a.x-b.x);let current:Token[]=[];
   for(const token of ordered){
    const prev=current[current.length-1];
    const gap=prev?token.x-(prev.x+prev.width):0;
    if(prev&&gap>Math.max(.055,Math.min(.14,(prev.height+token.height)*1.8))){
     const text=current.map(t=>t.text).join(' ').replace(/\s+/g,' ').trim();if(text)segments.push(text);current=[];
    }
    current.push(token);
   }
   const text=current.map(t=>t.text).join(' ').replace(/\s+/g,' ').trim();if(text)segments.push(text);
  }
 }
 return segments;
}

function directiveVerb(source:string){
 const semantic=source.replace(/^[^:]{1,50}:\s*(?=\S)/,'').replace(/^[\s•*\-–—\d.)]+/,'').trim();
 const verbs=[...semantic.matchAll(new RegExp(ACTION_VERBS.source,'ig'))];
 for(const match of verbs){
  const verb=match[1].toLowerCase(),at=match.index||0,before=semantic.slice(0,at);
  const clauseStart=before.match(/(?:^|[.;!?]\s+|,\s+)(?:please\s+)?$/i);
  const purposeThenDirective=/^to\b[^,.;]{0,100},\s*$/i.test(before);
  const addressedDirective=/\b(?:you|recipient|defendant|juror|driver|respondent|party)\s+(?:must|shall|should|need(?:s)?\s+to|are\s+required\s+to|is\s+required\s+to|are\s+ordered\s+to|is\s+ordered\s+to|are\s+directed\s+to|is\s+directed\s+to)\s*$/i.test(before);
  const bareDeontic=/\b(?:must|shall|should|required\s+to|ordered\s+to|directed\s+to|need\s+to)\s*$/i.test(before);
  const imperative=at===0||Boolean(clauseStart)||purposeThenDirective;
  if(imperative||addressedDirective||bareDeontic)return {semantic,verb,match};
 }
 return null;
}

function actionWords(value:string){
 return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(word=>word.length>2&&!/^(?:the|and|for|with|through|this|that|your|you|are|from|into|full|total|official|court|payment|system|immediately)$/.test(word)));
}
function similarActions(a:ActionNode,b:ActionNode){
 if(a.kind!==b.kind)return false;
 if(a.target_type!==b.target_type&&a.target_type!=='unknown'&&b.target_type!=='unknown')return false;
 if(a.target_value&&b.target_value&&clean(a.target_value)!==clean(b.target_value))return false;
 const A=actionWords(a.object),B=actionWords(b.object);
 if(!A.size||!B.size)return a.kind===b.kind&&(!a.target_value||!b.target_value||clean(a.target_value)===clean(b.target_value));
 let overlap=0;for(const word of A)if(B.has(word))overlap++;
 return overlap/Math.min(A.size,B.size)>=.5;
}

export function extractActionGraph(text:string,tokens:Token[]=[]):ActionNode[]{
 const textLines=text.split(/\n/).map(s=>s.trim()).filter(Boolean);
 const visual=tokenActionSegments(tokens);
 const sources=[...new Set((visual.length?visual:textLines).map(s=>s.trim()).filter(Boolean))];
 const actions:ActionNode[]=[];
 for(const source of sources){
  const directive=directiveVerb(source);if(!directive)continue;
  const {semantic,verb,match}=directive;
  const moneyObject=/\b(?:payment|balance|fine|fee|amount|money|costs?)\b/i.test(semantic);
  const kind=(moneyObject&&/(?:pay|remit|submit|send|transfer)/.test(verb))||/(?:pay|remit|transfer)/.test(verb)?'pay':/(?:call|contact|phone|text)/.test(verb)?'contact':/(?:open|visit|click|scan)/.test(verb)?'navigate':/(?:reply|provide|share|enter|send|disclose|submit)/.test(verb)?'disclose':/(?:appear|report|attend)/.test(verb)?'appear':'other';
  const phone=semantic.match(PHONE)?.[0]||'',url=semantic.match(URL)?.[0]||'',money=semantic.match(MONEY)?.[0]||'';
  let target_type:ActionNode['target_type']='unknown',target_value='';
  if(phone){target_type='phone';target_value=phone}
  else if(url){target_type='url';target_value=url}
  else if(money){target_type='money';target_value=money}
  else if(verb==='scan'&&/\bqr\b/i.test(semantic)){target_type='qr'}
  else if(kind==='disclose'){target_type='information';target_value=semantic.slice((match.index||0)+match[0].length).replace(/^[\s:,-]+/,'').trim()}
  else if(kind==='appear'){
   const date=semantic.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?/i)?.[0]||'';
   if(date){target_type='date';target_value=date}
   else if(/\b(?:court|courthouse|hearing|room|street|st\.?|avenue|ave\.?|road|rd\.?)\b/i.test(semantic)){target_type='place';target_value=semantic.slice((match.index||0)+match[0].length).trim()}
  }
  const object=semantic.slice((match.index||0)+match[0].length).replace(/^[\s:,-]+/,'').trim();
  const qualifiers=[...new Set([
   ...(semantic.match(/\b(?:must|shall|required|immediately|today|now|before|after|within)\b/gi)||[]),
   ...(semantic.match(/\b(?:by|before|after)\s+[^,.;]{1,50}/gi)||[])
  ])].slice(0,6);
  const node:ActionNode={verb,kind,object,target_type,target_value,qualifiers,source_text:source};
  const duplicate=actions.find(existing=>similarActions(existing,node));
  if(!duplicate)actions.push(node);
  else if(node.source_text.length>duplicate.source_text.length&&node.source_text.length<220)Object.assign(duplicate,node);
 }
 return actions;
}
export function sanitizeStructuredExtraction(extraction:Extraction,text:string):Extraction{
 const next:Extraction={...extraction,payment_demand:{...extraction.payment_demand},phone_numbers:[...extraction.phone_numbers],emails:[...extraction.emails],urls:[...extraction.urls],information_requests:[...extraction.information_requests],threats:[...extraction.threats],uncertain_fields:[...extraction.uncertain_fields]};
 const value=next.juror_or_reference_number.trim();
 if(value){
  const lower=text.toLowerCase(),needle=value.toLowerCase();
  let at=lower.indexOf(needle),grounded=false;
  while(at>=0&&!grounded){
   const nearby=lower.slice(Math.max(0,at-120),Math.min(lower.length,at+needle.length+120));
   grounded=/\b(?:juror|badge|participant)\b[\s\S]{0,80}\b(?:number|no\.?|id)\b/.test(nearby)||/\b(?:juror|badge|participant)\s*(?:number|no\.?|#|id)?\s*[:#-]?\s*$/.test(nearby.slice(0,Math.max(0,nearby.indexOf(needle))));
   at=lower.indexOf(needle,at+needle.length);
  }
  if(!grounded)next.juror_or_reference_number='';
 }
 next.delivery_method=/\btext message|\bsms\b/i.test(text)?'text message':/\bemail(?: message)?\b/i.test(text)?'email':/\bphone call\b/i.test(text)?'phone call':'';
 return next;
}

export function fallbackExtract(text:string):Extraction {
 const e=emptyExtraction();
 const lines=text.split(/\n/).map(s=>s.trim()).filter(Boolean);
 e.court_name=extractCourtName(lines);
 e.court_location=(lines.find(s=>/\d{2,5}\s+[^\n]{3,90}\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|highway|hwy\.?)\b/i.test(s))||'').replace(/\s+/g,' ');
 e.juror_or_reference_number=lines.find(s=>/\b(?:juror|badge|reference|participant)\s*(?:number|no\.?|#|id)\s*[:#]?\s*[A-Z0-9-]{4,}/i.test(s))?.match(/(?:number|no\.?|#|id)\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1]||'';
 e.case_or_docket_number=lines.find(s=>/\b(?:case|docket)\s*(?:number|no\.?|#)\s*[:#]?\s*[\w-]{4,}/i.test(s))?.match(/(?:number|no\.?|#)\s*[:#]?\s*([\w-]{4,})/i)?.[1]||'';
 e.phone_numbers=[...new Set(text.match(new RegExp(PHONE.source,'g'))||[])];
 e.emails=[...new Set(text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi)||[])];
 e.urls=[...new Set(text.match(new RegExp(URL.source,'gi'))||[])].filter(s=>!e.emails.some(email=>email.includes(s)));
 e.reporting_date=lines.find(s=>/report(?:ing)?\s+date\s*:/i.test(s))?.replace(/^.*?report(?:ing)?\s+date\s*:\s*/i,'')||'';
 const actions=extractActionGraph(text),pay=actions.find(a=>a.kind==='pay');
 if(pay){
  e.payment_demand.amount=pay.source_text.match(MONEY)?.[0]||'';
  e.payment_demand.method=/payment app|cash app|zelle|venmo/i.test(pay.source_text)?'payment app':/gift card|prepaid/i.test(pay.source_text)?'gift card':/bitcoin|crypto/i.test(pay.source_text)?'cryptocurrency':/wire transfer|western union|moneygram/i.test(pay.source_text)?'wire transfer':'';
  e.payment_demand.url=pay.source_text.match(URL)?.[0]||'';
 }
 e.information_requests=actions.filter(a=>a.kind==='disclose').map(a=>a.source_text);
 e.threats=lines.filter(s=>/arrest|failure to appear|warrant|jail|contempt/i.test(s));
 e.delivery_method=/\btext message|\bsms\b/i.test(text)?'text message':/\bemail(?: message)?\b/i.test(text)?'email':/\bphone call\b/i.test(text)?'phone call':'';
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
 for(let a=0;a<tokens.length;a++){
  let acc='';
  for(let b=a;b<Math.min(tokens.length,a+45)&&tokens[b].page===tokens[a].page;b++){
   acc+=clean(tokens[b].text);
   if(acc===target){
    const slice=tokens.slice(a,b+1),x=Math.min(...slice.map(t=>t.x)),y=Math.min(...slice.map(t=>t.y));
    return {page:tokens[a].page,source_bbox:{x,y,width:Math.max(...slice.map(t=>t.x+t.width))-x,height:Math.max(...slice.map(t=>t.y+t.height))-y},source_token_range:[a,b]};
   }
   if(acc.length>target.length+10)break;
  }
 }
}
function confidenceFor(value:string,tokens:Token[],strict=false){
 const anchor=locatePhrase(value,tokens);if(!anchor)return undefined;
 const values=tokens.slice(anchor.source_token_range[0],anchor.source_token_range[1]+1).filter(t=>/[a-z0-9]/i.test(t.text)).map(t=>t.confidence).filter((v):v is number=>typeof v==='number').sort((a,b)=>a-b);
 if(!values.length)return undefined;
 if(strict)return values[0];
 return values[Math.floor((values.length-1)*0.25)];
}
function claimTypeForAction(action:ActionNode):ClaimType{
 if(action.kind==='pay')return 'payment';
 if(action.kind==='contact'&&action.target_type==='phone')return 'phone';
 if(action.kind==='navigate'&&action.target_type==='url')return 'url';
 if(action.kind==='disclose')return 'information';
 return 'action';
}
function labelForAction(action:ActionNode){
 if(action.kind==='pay')return 'Requested payment';
 if(action.kind==='contact')return action.target_type==='phone'?'Requested callback':'Requested contact';
 if(action.kind==='navigate')return action.target_type==='url'?'Requested link':action.verb==='scan'?'Requested scan':'Requested navigation';
 if(action.kind==='disclose')return 'Requested information';
 if(action.kind==='appear')return 'Requested appearance';
 return 'Requested action';
}

function spatialContext(value:string,tokens:Token[],fallback:string){
 const anchor=locatePhrase(value,tokens);if(!anchor)return fallback;
 const target=tokens[anchor.source_token_range[0]],page=target.page;
 const sameLine=tokens.filter(t=>t.page===page&&Math.abs(t.y-target.y)<Math.max(.018,target.height*.8)&&t.x<target.x+.55&&t.x+t.width>target.x-.35).sort((a,b)=>a.x-b.x);
 const line=sameLine.map(t=>t.text).join(' ').replace(/\s+/g,' ').trim();
 return line||fallback;
}

export function extractAuthorityCitations(text:string):Array<{raw:string;section:string;context:string;jurisdiction:string}>{
 const lines=text.split(/\n/).map(line=>line.trim()).filter(Boolean),out:Array<{raw:string;section:string;context:string;jurisdiction:string}>=[],seen=new Set<string>();
 const documentVirginia=/\b(?:commonwealth of virginia|virginia court|district court of virginia|richmond,?\s*va|va\.?\s*code|virginia code)\b/i.test(text);
 for(let i=0;i<lines.length;i++){
  const line=lines[i],re=/(?:\b(?:Va\.?\s*Code|Virginia\s+Code)(?:\s*,\s*[^§\n]{0,60})?\s*)?§{1,2}\s*(46\.2-\d+(?:\.\d+)?(?::\d+)?)/gi;
  for(const match of line.matchAll(re)){
   const section=match[1],key=section.toLowerCase();if(seen.has(key))continue;seen.add(key);
   const raw=(match[0]||`§ ${section}`).replace(/\s+/g,' ').trim();
   const context=[lines[i-1],line,lines[i+1]].filter(Boolean).join(' ');
   const jurisdiction=/\b(?:Va\.?\s*Code|Virginia\s+Code)\b/i.test(raw)||documentVirginia?'Virginia':'';
   out.push({raw,section,context,jurisdiction});
  }
 }
 return out;
}

export function claimsFromExtraction(e:Extraction,text:string,tokens:Token[]=[]):Claim[]{
 const result:Claim[]=[];
 const add=(type:ClaimType,label:string,value:string,context='',action?:ActionNode,confidenceBasis?:string)=>{
  if(!value.trim())return;
  const line=text.split(/\n/).find(s=>s.includes(value))||context||value,exact=line.trim();
  const anchor=locatePhrase(confidenceBasis||value,tokens)||locatePhrase(value,tokens);
  const strictConfidence=['phone','url','docket','juror'].includes(type);
  const fieldConfidence=tokens.length?confidenceFor(confidenceBasis||value,tokens,strictConfidence):undefined;
  result.push({id:`c${result.length+1}`,type,label,value,exact_source_text:exact,page:anchor?.page||1,source_bbox:anchor?.source_bbox,source_token_range:anchor?.source_token_range,context:context||exact,field_confidence:fieldConfidence,verification_eligible:fieldConfidence===undefined||fieldConfidence>=FIELD_CONFIDENCE,action});
 };
 add('court','Court identity',e.court_name);
 add('location','Courthouse address',e.court_location);
 add('juror','Juror reference',e.juror_or_reference_number);
 add('reporting_date','Reporting date',e.reporting_date);
 add('docket','Case docket',e.case_or_docket_number);
 for(const citation of extractAuthorityCitations(text)){
  const display=citation.jurisdiction==='Virginia'?`Va. Code § ${citation.section}`:citation.raw;
  add('authority','Cited authority',display,citation.context,undefined,citation.raw);
  const created=result[result.length-1];
  if(created){
   created.normalization={section:citation.section,jurisdiction:citation.jurisdiction};
   created.exact_source_text=text.split(/\n/).find(line=>line.includes(citation.raw))?.trim()||citation.raw;
   created.context=citation.context;
  }
 }

 const actions=extractActionGraph(text,tokens),consumedPhones=new Set<string>(),consumedUrls=new Set<string>();
 for(const action of actions){
  const type=claimTypeForAction(action),label=labelForAction(action);
  if(action.target_type==='phone'&&action.target_value)consumedPhones.add(clean(action.target_value));
  if(action.target_type==='url'&&action.target_value)consumedUrls.add(clean(action.target_value));
  const value=(type==='phone'||type==='url')&&action.target_value?action.target_value:action.source_text;
  const confidenceBasis=(type==='phone'||type==='url')&&action.target_value?action.target_value:action.source_text;
  const context=(type==='phone'||type==='url')&&action.target_value?spatialContext(action.target_value,tokens,action.source_text):action.source_text;
  add(type,label,value,context,action,confidenceBasis);
 }
 for(const p of e.phone_numbers)if(!consumedPhones.has(clean(p))){const fallback=text.split(/\n/).find(s=>s.includes(p))||'';const context=spatialContext(p,tokens,fallback);add('phone',/\b(?:call|contact|phone)\b/i.test(context)?'Requested callback':'Phone number',p,context,undefined,p)}
 for(const u of e.urls)if(!consumedUrls.has(clean(u))){const fallback=text.split(/\n/).find(s=>s.includes(u))||'';const context=spatialContext(u,tokens,fallback);add('url',/\b(?:visit|open|click|go|pay)\b/i.test(context)?'Requested link':'Website',u,context,undefined,u)}
 for(const mail of e.emails)add('email','Email address',mail);
 // Consequence/threat and delivery-channel metadata remain extraction context.
 // The checked-detail ledger is reserved for requested actions and independently checkable details.
 return result;
}
