import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {load} from 'cheerio';
import {z} from 'zod';
import {browseDiscoverySources,hostAllowed,type BrowseDiscoverySource} from '../lib/browse-source-registry';
import {curatedBrowseCases,type BrowseCase} from '../lib/browse-cases';

const run=promisify(execFile);
const outputPath=join(process.cwd(),'lib','browse-discovered.generated.json');
const tempRoot=await mkdtemp(join(tmpdir(),'seal-browse-discovery-'));
const existingGenerated=await readFile(outputPath,'utf8').then(value=>JSON.parse(value) as BrowseCase[]).catch(()=>[]);
const existingUrls=new Set([...curatedBrowseCases,...existingGenerated].map(item=>canonicalUrl(item.sourceUrl)));
const now=new Date().toISOString();

const curatorSchema=z.object({
 publish:z.boolean(),
 visualNote:z.string().min(10).max(260),
 excerpt:z.string().min(10).max(300),
 category:z.enum(['jury-duty-payment-demand','fake-summons-arrest-threat','personal-information','court-payment-fee','official-scam-guidance']),
 confidence:z.number().min(0).max(1),
 reason:z.string().max(220)
});

type Candidate={
 source:BrowseDiscoverySource;
 sourceUrl:string;
 title:string;
 text:string;
 preview:{type:'pdf'|'image';url:string;alt:string};
 publishedAt?:string;
};

const normalize=(value:string)=>value.replace(/\s+/g,' ').trim();
function canonicalUrl(value:string){
 try{
  const url=new URL(value);
  url.hash='';
  for(const key of [...url.searchParams.keys()]){
   if(/^utm_|^(?:fbclid|gclid)$/i.test(key))url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/,'');
 }catch{return value}
}
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42);
const matchesTerms=(value:string,terms:string[])=>{
 const lower=value.toLowerCase();
 return terms.some(term=>lower.includes(term.toLowerCase()));
};
const compactTitle=(value:string,source:BrowseDiscoverySource)=>{
 let title=normalize(value)
  .replace(/^(?:SCAM ALERT:\s*)/i,'')
  .replace(/^Maryland Judiciary warns of (?:new )?/i,'')
  .replace(/\s+(?:FOR IMMEDIATE RELEASE).*$/i,'')
  .trim();
 if(/^UNITED STATES DISTRICT COURT$/i.test(title))title='Jury and court-related scam warning';
 if(title)title=title.charAt(0).toUpperCase()+title.slice(1);
 const words=title.split(' ');
 if(title.length>96){
  let clipped='';
  for(const word of words){
   if((clipped+' '+word).trim().length>96)break;
   clipped=(clipped+' '+word).trim();
  }
  title=clipped;
 }
 return title||source.sourceTitlePrefix;
};
const userAgent='SEAL/1.0 official-source discovery (+https://github.com/Davemafy/seal)';

async function fetchSafe(url:string,accept:string){
 const response=await fetch(url,{
  redirect:'follow',
  signal:AbortSignal.timeout(20000),
  headers:{'User-Agent':userAgent,'Accept':accept}
 });
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 return response;
}

function publishedDateFromHtml(html:string){
 const $=load(html);
 const datetime=$('time[datetime]').first().attr('datetime')||$('meta[property="article:published_time"]').attr('content')||'';
 if(datetime){
  const parsed=new Date(datetime);
  if(!Number.isNaN(parsed.valueOf()))return parsed.toISOString();
 }
 const text=normalize($('body').text());
 const match=text.match(/FOR IMMEDIATE RELEASE\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})/i);
 if(match){
  const parsed=new Date(`${match[1]} ${match[2]}, ${match[3]}`);
  if(!Number.isNaN(parsed.valueOf()))return parsed.toISOString();
 }
 return undefined;
}

async function verifyImage(url:string,source:BrowseDiscoverySource){
 if(!hostAllowed(url,source))return false;
 try{
  const response=await fetchSafe(url,'image/*');
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(!type.startsWith('image/'))return false;
  const length=Number(response.headers.get('content-length')||0);
  if(length&&length<4000)return false;
  if(!length){
   const bytes=await response.arrayBuffer();
   if(bytes.byteLength<4000)return false;
  }else{
   await response.body?.cancel();
  }
  return true;
 }catch{return false}
}

function choosePageImage(html:string,pageUrl:string,source:BrowseDiscoverySource){
 const $=load(html);
 const candidates=$('main img, article img, .content img, #content img, img').toArray();
 const best=candidates
  .map(node=>{
   const src=$(node).attr('src')||$(node).attr('data-src')||'';
   if(!src)return null;
   let url='';
   try{url=new URL(src,pageUrl).toString()}catch{return null}
   if(!hostAllowed(url,source))return null;
   const alt=normalize($(node).attr('alt')||'');
   const hay=`${alt} ${url}`.toLowerCase();
   let score=0;
   if(/scam|spam|text|message|jury|warrant|notice|qr|fraud/.test(hay))score+=4;
   if(/logo|seal|header|footer|icon|social|banner|\bhome\b/.test(hay))score-=6;
   if(/\.svg(?:\?|$)/i.test(url))score-=3;
   return {url,alt:alt||`${source.issuer} published source image`,score};
  })
  .filter((value):value is {url:string;alt:string;score:number}=>Boolean(value))
  .sort((a,b)=>b.score-a.score)[0];
 return best&&best.score>=2?best:undefined;
}

async function readCandidate(url:string,source:BrowseDiscoverySource,contextTitle:string):Promise<Candidate|null>{
 const response=await fetchSafe(url,'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5');
 const type=(response.headers.get('content-type')||'').toLowerCase();
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>8_000_000)return null;
 const pdf=type.includes('pdf')||bytes.subarray(0,5).toString('ascii')==='%PDF-';

 if(pdf){
  const file=join(tempRoot,`${createHash('sha1').update(url).digest('hex')}.pdf`);
  await writeFile(file,bytes);
  const {stdout}=await run('pdftotext',['-f','1','-l','4','-layout',file,'-'],{timeout:30000,maxBuffer:4_000_000});
  const text=normalize(stdout);
  if(text.length<80||!source.explicitEvidence.test(text))return null;
  return {
   source,
   sourceUrl:url,
   title:contextTitle||source.sourceTitlePrefix,
   text,
   preview:{type:'pdf',url,alt:`${source.issuer} official PDF`}
  };
 }

 const html=bytes.toString('utf8');
 const $=load(html);
 $('script,style,noscript,nav,footer').remove();
 const text=normalize($('main').text()||$('article').text()||$('body').text());
 if(text.length<120||!source.explicitEvidence.test(text))return null;
 const h1=normalize($('h1').first().text());
 const title=h1||contextTitle||source.sourceTitlePrefix;
 const image=choosePageImage(html,url,source);
 if(!image||!(await verifyImage(image.url,source)))return null;
 return {
  source,
  sourceUrl:url,
  title,
  text,
  preview:{type:'image',url:image.url,alt:image.alt},
  publishedAt:publishedDateFromHtml(html)
 };
}

async function discoverFromSource(source:BrowseDiscoverySource){
 const response=await fetchSafe(source.indexUrl,'text/html,application/xhtml+xml');
 const html=await response.text();
 const $=load(html);
 const links=new Map<string,string>();
 $('a[href]').each((_,node)=>{
  const href=$(node).attr('href')||'';
  let url='';
  try{url=new URL(href,source.indexUrl).toString()}catch{return}
  if(!hostAllowed(url,source))return;
  const anchor=normalize($(node).text());
  const context=normalize([
   anchor,
   $(node).closest('tr,li,article,p,.views-row,.field-content').text()
  ].join(' '));
  if(!matchesTerms(context,source.includeTerms))return;
  const canonical=canonicalUrl(url);
  if(canonical===canonicalUrl(source.indexUrl))return;
  const titleHint=anchor.length>=12&&!/^(?:view|read more|details|download)$/i.test(anchor)?anchor:context;
  links.set(canonical,titleHint.slice(0,180));
 });
 return [...links.entries()].slice(0,24);
}

async function modelCurate(candidate:Candidate){
 const key=process.env.GROQ_API_KEY;
 if(!key)return null;
 const base=process.env.GROQ_BASE_URL||'https://api.groq.com/openai/v1';
 if(new URL(base).hostname!=='api.groq.com')throw new Error('Groq host not allowed');
 const instruction=`You curate SEAL's public court-source library. The source has already passed an official-domain allowlist and deterministic evidence gate. Do not infer authenticity beyond what the authority explicitly says. Publish only if this source is directly useful for understanding a court-related scam, warning, notice, or verification pattern. For category, choose the closest supplied enum. visualNote and excerpt must only state facts visibly supported by SOURCE TEXT. Do not invent dates, people, case numbers, contacts, or message content. Do not call something a confirmed scam unless the authority itself explicitly does so. Keep copy concise and neutral.`;
 const schema={
  type:'object',additionalProperties:false,
  properties:{
   publish:{type:'boolean'},
   visualNote:{type:'string'},
   excerpt:{type:'string'},
   category:{type:'string',enum:['jury-duty-payment-demand','fake-summons-arrest-threat','personal-information','court-payment-fee','official-scam-guidance']},
   confidence:{type:'number'},
   reason:{type:'string'}
  },
  required:['publish','visualNote','excerpt','category','confidence','reason']
 };
 const response=await fetch(base+'/chat/completions',{
  method:'POST',
  signal:AbortSignal.timeout(16000),
  headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify({
   model:process.env.GROQ_MODEL||'openai/gpt-oss-20b',
   temperature:0,
   messages:[
    {role:'system',content:instruction},
    {role:'user',content:`ISSUER: ${candidate.source.issuer}\nSOURCE URL: ${candidate.sourceUrl}\nSOURCE TITLE: ${candidate.title}\nSOURCE TEXT:\n${candidate.text.slice(0,12000)}`}
   ],
   response_format:{type:'json_schema',json_schema:{name:'browse_curator',strict:true,schema}}
  })
 });
 if(!response.ok)throw new Error(`Groq ${response.status}`);
 const body=await response.json() as {choices?:{message?:{content?:string}}[]};
 return curatorSchema.parse(JSON.parse(body.choices?.[0]?.message?.content||'{}'));
}

function fallbackCopy(candidate:Candidate){
 const scam=candidate.source.classification==='Confirmed scam example';
 return {
  publish:true,
  visualNote:scam
   ?`${candidate.source.issuer} published this example as a scam warning. The original authority asset is shown above.`
   :`${candidate.source.issuer} published this official warning. SEAL preserves the source asset and its provenance.`,
  excerpt:normalize(candidate.text).slice(0,260),
  category:candidate.source.category,
  confidence:1,
  reason:'Passed deterministic official-source and explicit-evidence gates.'
 };
}

const found:BrowseCase[]=[];
const seenRun=new Set<string>();

try{
 for(const source of browseDiscoverySources){
  let links:[string,string][]=[];
  let acceptedForSource=0;
  try{links=await discoverFromSource(source)}
  catch(error){
   console.error(`SOURCE_FAILED ${source.id}: ${error instanceof Error?error.message:String(error)}`);
   continue;
  }

  for(const [url,context] of links){
   const canonical=canonicalUrl(url);
   if(existingUrls.has(canonical)||seenRun.has(canonical))continue;
   seenRun.add(canonical);
   let candidate:Candidate|null=null;
   try{candidate=await readCandidate(url,source,context)}
   catch(error){
    console.log(`QUARANTINE fetch ${url}: ${error instanceof Error?error.message:String(error)}`);
    continue;
   }
   if(!candidate)continue;

   let curated=undefined as z.infer<typeof curatorSchema>|ReturnType<typeof fallbackCopy>|undefined;
   try{
    const model=await modelCurate(candidate);
    if(model){
     console.log(`CURATOR model ${url}`);
     if(!model.publish||model.confidence<.78){
      console.log(`QUARANTINE model ${url}: ${model.reason}`);
      continue;
     }
     curated=model;
    }else{
     console.log(`CURATOR deterministic ${url}`);
     curated=fallbackCopy(candidate);
    }
   }catch(error){
    console.log(`QUARANTINE model_error ${url}: ${error instanceof Error?error.message:String(error)}`);
    continue;
   }
   if(!curated)continue;

   const id=`feed-${slug(source.id)}-${createHash('sha256').update(canonical).digest('hex').slice(0,9)}`;
   const displayTitle=compactTitle(candidate.title,source);
   found.push({
    id,
    category:curated.category,
    section:source.section,
    title:displayTitle,
    language:source.language,
    ocrLanguage:source.ocrLanguage,
    jurisdiction:source.jurisdiction,
    country:source.country,
    issuer:source.issuer,
    sourceTitle:`${source.sourceTitlePrefix} — ${displayTitle}`,
    sourceUrl:url,
    classification:source.classification,
    visualNote:curated.visualNote,
    excerpt:curated.excerpt,
    preview:candidate.preview,
    sourcePublishedAt:candidate.publishedAt,
    discoveredAt:now
   });
   console.log(`PUBLISH ${source.id}: ${url}`);
   acceptedForSource++;
   if(acceptedForSource>=2)break;
  }
 }
}finally{
 await rm(tempRoot,{recursive:true,force:true});
}

const ranked=[...existingGenerated,...found]
 .filter((item,index,items)=>items.findIndex(other=>canonicalUrl(other.sourceUrl)===canonicalUrl(item.sourceUrl))===index)
 .sort((a,b)=>String(b.sourcePublishedAt||b.discoveredAt||'').localeCompare(String(a.sourcePublishedAt||a.discoveredAt||'')));

const combined:BrowseCase[]=[];
const issuerCounts=new Map<string,number>();
for(const item of ranked){
 const seen=issuerCounts.get(item.issuer)||0;
 if(seen>=2)continue;
 issuerCounts.set(item.issuer,seen+1);
 combined.push(item);
 if(combined.length>=24)break;
}

const stable=(items:BrowseCase[])=>JSON.stringify(items.map(({discoveredAt:_,...item})=>item),null,2);
if(stable(combined)===stable(existingGenerated)){
 console.log(`NO_CHANGE ${combined.length} generated Browse cases retained`);
 process.exit(0);
}
await writeFile(outputPath,JSON.stringify(combined,null,2)+'\n');
console.log(`UPDATED_FEED ${combined.length} generated Browse cases (${found.length} new)`);
