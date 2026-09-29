import * as cheerio from 'cheerio';
import type {Evidence,SafeAction,SourceSignal,VerificationLane} from './types';
import {officialCourtDirectoryFor} from './official-directories';

type SearchCandidate={title:string;url:string;snippet:string};
type OfficialPage={title:string;url:string;text:string;excerpt:string;warning:boolean;score:number};

const USER_AGENT='Mozilla/5.0 (compatible; SEAL/1.0; +https://github.com/Davemafy/seal)';
const SEARCH_HEADERS={'User-Agent':USER_AGENT,'Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.8'};

function evidenceFor(title:string,url:string,excerpt:string,mode:'LIVE'|'SNAPSHOT'):Evidence{
 return {title,url,excerpt,checked_at:new Date().toISOString(),source_mode:mode};
}

const normalize=(value:string)=>value.normalize('NFKC').replace(/\s+/g,' ').trim();
const words=(value:string)=>new Set(
 normalize(value).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,' ').split(/\s+/)
  .filter(word=>word.length>=3&&!/^(?:the|and|for|with|from|this|that|court|courts|tribunal|tribunals|service|official|united|kingdom)$/.test(word))
);

export function isOfficialGovernmentHost(value:string){
 let host='';
 try{host=new URL(value).hostname.toLowerCase().replace(/^www\./,'')}catch{return false}
 return host.endsWith('.gov')
  ||host==='gov.uk'||host.endsWith('.gov.uk')
  ||/(?:^|\.)gov\.[a-z]{2,3}$/i.test(host)
  ||/(?:^|\.)gov\.[a-z]{2}\.[a-z]{2}$/i.test(host)
  ||/(?:^|\.)go\.[a-z]{2,3}$/i.test(host)
  ||/(?:^|\.)gouv\.[a-z]{2,3}$/i.test(host)
  ||/(?:^|\.)govt\.[a-z]{2,3}$/i.test(host)
  ||host==='canada.ca'||host.endsWith('.gc.ca');
}

function institutionHint(rawText:string,courtName:string){
 const lines=rawText.split(/\n/).map(normalize).filter(line=>line.length>=6&&line.length<=110);
 const candidates=[courtName,...lines].filter(Boolean).map((line,index)=>{
  let score=0;
  if(/\b(?:courts?|tribunals?|judiciary|judicial)\b/i.test(line))score+=4;
  if(/\b(?:service|ministry|department|clerk|registry|registrar)\b/i.test(line))score+=2;
  if(/\b(?:courts?\s*(?:&|and)\s*tribunals?|court\s+service|judicial\s+branch)\b/i.test(line))score+=3;
  if(index<=8)score+=1;
  if(/\b(?:payment|amount|account|reference|claimant|required|notice of|case no|case reference)\b/i.test(line))score-=3;
  return {line,score};
 }).filter(candidate=>candidate.score>0);
 candidates.sort((a,b)=>b.score-a.score||a.line.length-b.line.length);
 return candidates[0]?.line||'';
}

function documentHeading(rawText:string){
 const lines=rawText.split(/\n/).map(normalize).filter(Boolean);
 const scored=lines.map((line,index)=>{
  let score=0;
  if(/\b(?:notice|summons|order|warrant|advisory|citation|enforcement|judgment|judgement)\b/i.test(line))score+=4;
  if(line.length>=8&&line.length<=90)score+=1;
  if(index<20)score+=1;
  if(/\b(?:payment details|account no|sort code|amount|total|claimant)\b/i.test(line))score-=3;
  return {line,score};
 }).filter(candidate=>candidate.score>0);
 scored.sort((a,b)=>b.score-a.score||a.line.length-b.line.length);
 return scored[0]?.line||'';
}

function actionHint(rawText:string){
 if(/\b(?:pay|payment|amount|balance|fine|fee|remit|transfer|bank details|account no|sort code)\b/i.test(rawText))return 'payment';
 if(/\b(?:jury|juror|summons|appear|hearing)\b/i.test(rawText))return 'court notice';
 if(/\b(?:provide|share|personal information|identity|bank details)\b/i.test(rawText))return 'personal information';
 return 'court notice';
}

export function buildOfficialDiscoveryQueries(rawText:string,courtName:string,jurisdictionHint:string){
 const institution=institutionHint(rawText,courtName);
 const heading=documentHeading(rawText);
 const jurisdiction=normalize(jurisdictionHint);
 const action=actionHint(rawText);
 const q1=[institution&&`"${institution.slice(0,100)}"`,heading&&`"${heading.slice(0,100)}"`,action,'scam warning'].filter(Boolean).join(' ');
 const q2=[institution&&`"${institution.slice(0,100)}"`,jurisdiction,action,'official'].filter(Boolean).join(' ');
 return [...new Set([q1,q2].map(normalize).filter(query=>query.length>=8))].slice(0,2);
}

function unwrapSearchUrl(value:string,base='https://html.duckduckgo.com'){
 try{
  const url=new URL(value,base);
  if(/(?:^|\.)duckduckgo\.com$/i.test(url.hostname)){
   const target=url.searchParams.get('uddg');
   if(target)return decodeURIComponent(target);
  }
  if(/(?:^|\.)google\.[a-z.]+$/i.test(url.hostname)&&url.pathname==='/url'){
   const target=url.searchParams.get('q')||url.searchParams.get('url');
   if(target)return target;
  }
  return url.toString();
 }catch{return ''}
}

function addCandidate(out:SearchCandidate[],title:string,href:string,snippet:string,base:string){
 const target=unwrapSearchUrl(href,base);
 if(!target||!isOfficialGovernmentHost(target)||out.some(item=>item.url===target))return;
 out.push({title:normalize(title)||new URL(target).hostname,url:target,snippet:normalize(snippet)});
}

async function searchDuckDuckGo(query:string):Promise<SearchCandidate[]>{
 try{
  const base='https://html.duckduckgo.com';
  const response=await fetch(base+'/html/?q='+encodeURIComponent(query),{headers:SEARCH_HEADERS,redirect:'follow',signal:AbortSignal.timeout(5000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return [];
  const html=await response.text();if(html.length>1_500_000)return [];
  const $=cheerio.load(html),out:SearchCandidate[]=[];
  $('.result').each((_,node)=>{
   const anchor=$(node).find('a.result__a').first();
   addCandidate(out,anchor.text(),anchor.attr('href')||'',$(node).find('.result__snippet').first().text(),base);
  });
  return out.slice(0,6);
 }catch{return []}
}

async function searchBing(query:string):Promise<SearchCandidate[]>{
 try{
  const base='https://www.bing.com';
  const response=await fetch(base+'/search?q='+encodeURIComponent(query)+'&count=10',{headers:SEARCH_HEADERS,redirect:'follow',signal:AbortSignal.timeout(5000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return [];
  const html=await response.text();if(html.length>1_500_000)return [];
  const $=cheerio.load(html),out:SearchCandidate[]=[];
  $('li.b_algo').each((_,node)=>{
   const anchor=$(node).find('h2 a').first();
   addCandidate(out,anchor.text(),anchor.attr('href')||'',$(node).find('.b_caption p').first().text(),base);
  });
  return out.slice(0,6);
 }catch{return []}
}

async function searchGoogle(query:string):Promise<SearchCandidate[]>{
 try{
  const base='https://www.google.com';
  const response=await fetch(base+'/search?num=10&q='+encodeURIComponent(query),{headers:SEARCH_HEADERS,redirect:'follow',signal:AbortSignal.timeout(5000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return [];
  const html=await response.text();if(html.length>1_500_000)return [];
  const $=cheerio.load(html),out:SearchCandidate[]=[];
  $('a').each((_,node)=>{
   const anchor=$(node),heading=anchor.find('h3').first();
   if(!heading.length)return;
   addCandidate(out,heading.text(),anchor.attr('href')||'','',base);
  });
  return out.slice(0,6);
 }catch{return []}
}

async function search(query:string):Promise<SearchCandidate[]>{
 const settled=await Promise.allSettled([searchDuckDuckGo(query),searchBing(query),searchGoogle(query)]);
 const merged=settled.flatMap(result=>result.status==='fulfilled'?result.value:[]);
 return [...new Map(merged.map(item=>[item.url,item])).values()].slice(0,10);
}

function overlapScore(source:Set<string>,target:string){
 if(!source.size)return 0;
 const lower=target.toLowerCase();
 let count=0;
 for(const word of source)if(lower.includes(word))count++;
 return count;
}

function excerptAround(text:string,patterns:RegExp[]){
 for(const pattern of patterns){
  const match=pattern.exec(text);pattern.lastIndex=0;
  if(!match?.index&&match?.index!==0)continue;
  const start=Math.max(0,match.index-130),end=Math.min(text.length,match.index+match[0].length+220);
  return normalize(`${start?'…':''}${text.slice(start,end)}${end<text.length?'…':''}`);
 }
 return normalize(text.slice(0,320));
}

async function inspectCandidate(candidate:SearchCandidate,institution:string,heading:string):Promise<OfficialPage|null>{
 try{
  const response=await fetch(candidate.url,{headers:{...SEARCH_HEADERS,'Accept':'text/html,application/xhtml+xml,application/pdf;q=0.8'},redirect:'follow',signal:AbortSignal.timeout(5500)});
  if(!response.ok)return null;
  const finalUrl=response.url||candidate.url;
  if(!isOfficialGovernmentHost(finalUrl))return null;
  const type=(response.headers.get('content-type')||'').toLowerCase();
  const institutionWords=words(institution),headingWords=words(heading);
  if(type.includes('pdf')){
   const combined=`${candidate.title} ${candidate.snippet} ${finalUrl}`;
   const relevance=overlapScore(institutionWords,combined)+overlapScore(headingWords,combined);
   if(relevance<1)return null;
   return {title:candidate.title||'Official court document',url:finalUrl,text:'',excerpt:candidate.snippet||'Official PDF located on a government domain.',warning:/\b(?:scam|fraud|fake|false|warning|not genuine|suspicious)\b/i.test(combined),score:6+relevance};
  }
  if(!type.includes('html')&&!type.includes('text'))return null;
  const html=await response.text();if(html.length>2_000_000)return null;
  const $=cheerio.load(html);$('script,style,nav,footer,svg,form,noscript').remove();
  const title=normalize($('h1').first().text()||$('title').text()||candidate.title||new URL(finalUrl).hostname);
  const text=normalize($('main').text()||$('article').text()||$('body').text());
  if(text.length<80)return null;
  const combined=`${title} ${candidate.snippet} ${text.slice(0,12000)}`;
  const institutionOverlap=overlapScore(institutionWords,combined);
  const headingOverlap=overlapScore(headingWords,combined);
  const relevant=institutionOverlap>=1||headingOverlap>=2;
  if(!relevant)return null;
  const warning=/\b(?:scam(?:s|mers)?|fraud(?:ulent)?|fake|false|not genuine|suspicious|impersonat(?:e|ing|ion)|warning)\b/i.test(combined);
  const score=8+institutionOverlap*2+headingOverlap+(warning?3:0);
  const excerpt=excerptAround(text,[
   /\b(?:scam(?:s|mers)?|fraud(?:ulent)?|fake|false|not genuine|suspicious|impersonat(?:e|ing|ion)|warning)\b/i,
   /\b(?:notice|summons|order|warrant|enforcement|payment)\b/i
  ]);
  return {title,url:finalUrl,text,excerpt,warning,score};
 }catch{return null}
}

async function discoverLive(rawText:string,courtName:string,jurisdictionHint:string){
 const institution=institutionHint(rawText,courtName);
 const heading=documentHeading(rawText);
 const queries=buildOfficialDiscoveryQueries(rawText,courtName,jurisdictionHint);
 if(!queries.length)return null;
 const searched=(await Promise.all(queries.map(search))).flat();
 const unique=[...new Map(searched.map(item=>[item.url,item])).values()].slice(0,8);
 if(!unique.length)return null;
 const pages=(await Promise.all(unique.slice(0,4).map(candidate=>inspectCandidate(candidate,institution,heading))))
  .filter((page):page is OfficialPage=>Boolean(page))
  .sort((a,b)=>b.score-a.score);
 return pages[0]||null;
}

export async function discoverOfficialDirectory(rawText:string,courtName:string,jurisdictionHint:string,mode:'LIVE'|'SNAPSHOT'):Promise<{lane:VerificationLane;signal?:SourceSignal;safeAction?:SafeAction}>{
 const started=Date.now();
 const directory=officialCourtDirectoryFor([rawText,courtName,jurisdictionHint].filter(Boolean).join('\n'));
 if(directory){
  let live=false;
  if(mode==='LIVE'){
   try{
    const response=await fetch(directory.url,{method:'GET',headers:{'User-Agent':USER_AGENT},signal:AbortSignal.timeout(4500),redirect:'follow'});
    live=response.ok&&isOfficialGovernmentHost(response.url||directory.url);
   }catch{}
  }
  const evidence=evidenceFor(directory.label,directory.url,directory.note,live?'LIVE':'SNAPSHOT');
  const lane:VerificationLane={id:'official-directory',label:'Official court directory',status:'evidence_found',summary:live?('Reached the official judiciary route for '+directory.jurisdiction+'.'):('Identified the reviewed official judiciary route for '+directory.jurisdiction+'.'),evidence:[evidence],resolver_id:'official-directory',duration_ms:Date.now()-started};
  const signal:SourceSignal={id:'directory-'+directory.id,kind:'OFFICIAL_DIRECTORY',title:'Official court route found for '+directory.jurisdiction,summary:directory.note,evidence:[evidence]};
  const safeAction:SafeAction={title:'Verify through the official court system',summary:'SEAL identified an official judiciary route for '+directory.jurisdiction+'. Use it independently of any link, phone number, or QR code in the message.',primary_url:directory.url,primary_label:directory.label,steps:['Open the official judiciary route below independently.','Search for the court or case using details from the document, not a link supplied by the message.','Treat the message as unverified until the official record or court contact confirms what action is required.'],evidence:[evidence]};
  return {lane,signal,safeAction};
 }

 if(mode!=='LIVE')return {lane:{id:'official-directory',label:'Official source discovery',status:'not_applicable',summary:'No reviewed directory matched this document. Live discovery was not requested for this source snapshot.',evidence:[],resolver_id:'official-discovery',duration_ms:Date.now()-started}};

 const page=await discoverLive(rawText,courtName,jurisdictionHint);
 if(!page)return {lane:{id:'official-directory',label:'Official source discovery',status:'unavailable',summary:'No sufficiently relevant government or judiciary source was found during this check.',evidence:[],resolver_id:'official-discovery',duration_ms:Date.now()-started}};

 const evidence=evidenceFor(page.title,page.url,page.excerpt,'LIVE');
 const jurisdiction=normalize(jurisdictionHint)||normalize(courtName)||'this jurisdiction';
 const kind:SourceSignal['kind']=page.warning?'OFFICIAL_WARNING':'OFFICIAL_DIRECTORY';
 const signal:SourceSignal={
  id:'discovered-official-source',
  kind,
  title:page.warning?'An official warning relevant to this notice was found':'An official court or government source was found',
  summary:page.warning
   ?'SEAL found a government-published warning that overlaps with the institution or notice language in this document. This is independent evidence about the pattern, not proof of who sent this copy.'
   :'SEAL found an independently reached government or judiciary source relevant to the institution named in the document.',
  evidence:[evidence]
 };
 const safeAction:SafeAction={
  title:page.warning?'Use the official warning before acting on this notice':'Continue through the independently found official source',
  summary:page.warning
   ?'Do not use payment or contact details from the notice until you compare them with the independently found government guidance.'
   :'Use the independently found government or judiciary page rather than a link, phone number, or payment route supplied by the message.',
  primary_url:page.url,
  primary_label:page.warning?'Open the official warning':'Open the official source',
  steps:page.warning
   ?['Read the government warning below.','Do not pay or contact anyone through details supplied only by the notice.','If the underlying case could still be real, reach the court through an independently found official channel.']
   :['Open the official source below independently.','Find the court or case using details from the document.','Treat the message as unverified until the official source confirms what action is required.'],
  evidence:[evidence]
 };
 const lane:VerificationLane={id:'official-directory',label:'Official source discovery',status:'evidence_found',summary:'Found and fetched a relevant source on an official government or judiciary domain.',evidence:[evidence],resolver_id:'official-discovery',duration_ms:Date.now()-started};
 void jurisdiction;
 return {lane,signal,safeAction};
}
