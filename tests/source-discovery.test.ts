import {afterEach,describe,expect,it,vi} from 'vitest';
import {discoverOfficialDirectory,isOfficialGovernmentHost} from '../lib/source-discovery';
import {verifyClaims} from '../lib/resolver';

afterEach(()=>vi.unstubAllGlobals());

describe('generic official-source discovery',()=>{
 it('accepts government namespaces and rejects lookalike commercial domains',()=>{
  expect(isOfficialGovernmentHost('https://www.gov.uk/guidance/example')).toBe(true);
  expect(isOfficialGovernmentHost('https://judiciary.gov.sg/example')).toBe(true);
  expect(isOfficialGovernmentHost('https://courts.ca.gov/example')).toBe(true);
  expect(isOfficialGovernmentHost('https://gov.uk.example.com/fake')).toBe(false);
  expect(isOfficialGovernmentHost('https://hmcts-support.com/fake')).toBe(false);
 });

 it('discovers an official warning for an unsupported institution without creating a verdict',async()=>{
  const warning='https://www.gov.uk/government/news/warning-about-bailiff-email-scam';
  const fetchMock=vi.fn(async(input:RequestInfo|URL)=>{
   const url=String(input);
   if(url.includes('duckduckgo.com/html/')||url.includes('bing.com/search')||url.includes('google.com/search'))return new Response(
    '<html><body><div class="result"><a class="result__a" href="'+warning+'">Warning about bailiff email scam</a><div class="result__snippet">HM Courts & Tribunals Service warning about false Notice of Enforcement documents.</div></div></body></html>',
    {status:200,headers:{'content-type':'text/html'}}
   );
   if(url===warning)return new Response(
    '<html><body><main><h1>Warning about bailiff email scam</h1><p>HM Courts & Tribunals Service warns that scammers posing as County Court bailiffs demand immediate payment.</p><p>These emails are not genuine. A typical document is a false Notice of Enforcement.</p></main></body></html>',
    {status:200,headers:{'content-type':'text/html'}}
   );
   return new Response('',{status:404,headers:{'content-type':'text/plain'}});
  });
  vi.stubGlobal('fetch',fetchMock);

  const text='HM Courts & Tribunals Service\nNOTICE OF ENFORCEMENT\nA payment of £2560 is required immediately.';
  const result=await discoverOfficialDirectory(text,'HM Courts & Tribunals Service','United Kingdom','LIVE');

  expect(result.lane.status).toBe('evidence_found');
  expect(result.lane.resolver_id).toBe('official-discovery');
  expect(result.signal?.kind).toBe('OFFICIAL_WARNING');
  expect(result.signal?.evidence[0]?.url).toBe(warning);
  expect(result.safeAction?.primary_url).toBe(warning);
  expect(result.safeAction?.evidence[0]?.source_mode).toBe('LIVE');
 });

 it('does not promote non-official search results',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
   const url=String(input);
   if(url.includes('duckduckgo.com/html/')||url.includes('bing.com/search')||url.includes('google.com/search'))return new Response(
    '<html><body><div class="result"><a class="result__a" href="https://hmcts-support.example.com/warning">Court warning</a><div class="result__snippet">Notice of Enforcement</div></div></body></html>',
    {status:200,headers:{'content-type':'text/html'}}
   );
   return new Response('',{status:404,headers:{'content-type':'text/plain'}});
  }));

  const result=await discoverOfficialDirectory(
   'HM Courts & Tribunals Service\nNOTICE OF ENFORCEMENT\nA payment of £2560 is required immediately.',
   'HM Courts & Tribunals Service','United Kingdom','LIVE'
  );
  expect(result.lane.status).toBe('unavailable');
  expect(result.signal).toBeUndefined();
  expect(result.safeAction).toBeUndefined();
 });
 it('does not let a generic reviewed directory short-circuit live semantic discovery',async()=>{
  const warning='https://www.dcd.uscourts.gov/sites/dcd/files/Fraud%20Attachment%20Notice%20From%20the%20Court%20June%202025.pdf';
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
   const url=String(input);
   if(url.includes('api.groq.com'))return new Response('',{status:503});
   if(url.includes('duckduckgo.com/html/')||url.includes('bing.com/search')||url.includes('google.com/search'))return new Response(
    '<html><body><div class="result"><a class="result__a" href="'+warning+'">Fraud Attachment Notice From the Court</a><div class="result__snippet">United States District Court for the District of Columbia jury duty scam warning.</div></div><li class="b_algo"><h2><a href="'+warning+'">Fraud Attachment Notice From the Court</a></h2><div class="b_caption"><p>District of Columbia jury duty scam warning.</p></div></li></body></html>',
    {status:200,headers:{'content-type':'text/html'}}
   );
   if(url===warning)return new Response('official warning pdf',{status:200,headers:{'content-type':'application/pdf'}});
   if(url.includes('uscourts.gov'))return new Response('<html><main>United States Courts</main></html>',{status:200,headers:{'content-type':'text/html'}});
   return new Response('',{status:404,headers:{'content-type':'text/plain'}});
  }));
  const text='UNITED STATES DISTRICT COURT FOR THE DISTRICT OF COLUMBIA\nURGENT: Jury Duty Summons – Immediate Response Required\nDownload Jury Summons';
  const claim={id:'a1',type:'action' as const,label:'Requested action',value:'Download Jury Summons',exact_source_text:'Download Jury Summons',page:2,action:{verb:'download',kind:'other' as const,object:'Jury Summons',target_type:'unknown' as const,target_value:'',qualifiers:[],source_text:'Download Jury Summons'}};
  const result=await discoverOfficialDirectory(text,'UNITED STATES DISTRICT COURT FOR THE DISTRICT OF COLUMBIA','United States · Federal','LIVE',[claim],text);
  expect(result.lane.resolver_id).toBe('official-discovery');
  expect(result.signal?.kind).toBe('OFFICIAL_WARNING');
  expect(result.safeAction?.primary_url).toBe(warning);
 });

 it('keeps discovered warnings outside the decisive verdict boundary',async()=>{
  const warning='https://www.gov.uk/government/news/warning-about-bailiff-email-scam';
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
   const url=String(input);
   if(url.includes('duckduckgo.com/html/')||url.includes('bing.com/search')||url.includes('google.com/search'))return new Response(
    '<html><body><div class="result"><a class="result__a" href="'+warning+'">Warning about bailiff email scam</a><div class="result__snippet">HM Courts & Tribunals Service warning about false Notice of Enforcement documents.</div></div><li class="b_algo"><h2><a href="'+warning+'">Warning about bailiff email scam</a></h2><div class="b_caption"><p>HM Courts & Tribunals Service false notice warning.</p></div></li></body></html>',
    {status:200,headers:{'content-type':'text/html'}}
   );
   if(url===warning)return new Response(
    '<html><body><main><h1>Warning about bailiff email scam</h1><p>HM Courts & Tribunals Service warns that scammers posing as County Court bailiffs demand immediate payment.</p><p>These emails are not genuine. A typical document is a false Notice of Enforcement.</p></main></body></html>',
    {status:200,headers:{'content-type':'text/html'}}
   );
   return new Response('',{status:404,headers:{'content-type':'text/plain'}});
  }));
  const claim={id:'pay',type:'payment' as const,label:'Requested payment',value:'£2560',exact_source_text:'a payment of £2560 is required immediately',page:1,action:{verb:'pay',kind:'pay' as const,object:'a payment of £2560 is required immediately',target_type:'money' as const,target_value:'£2560',qualifiers:['required','immediately'],source_text:'a payment of £2560 is required immediately'}};
  const verification=await verifyClaims([claim],'HM Courts & Tribunals Service','SNAPSHOT','United Kingdom','HM Courts & Tribunals Service\nNOTICE OF ENFORCEMENT\na payment of £2560 is required immediately');
  expect(verification.results[0].verdict).toBe('COULD_NOT_VERIFY');
  expect(verification.signals?.some(signal=>signal.kind==='OFFICIAL_WARNING')).toBe(true);
  expect(verification.safe_action?.primary_url).toBe(warning);
 });

});
