// Run against a deployed preview with GROQ_API_KEY configured:
// SEAL_BASE_URL=https://preview.example.com node --import tsx scripts/action-torture.ts
import {claimsFromExtraction} from '../lib/extract';
import {extractionSchema} from '../lib/types';

const cases=[
 {name:'fake traffic notice',text:'Municipal Traffic Court. To avoid a hearing, settle the balance by scanning the QR code below.',action:'settle the balance'},
 {name:'jury summons',text:'Superior Court jury summons. You must report to the courthouse on October 12 at 8 a.m.',action:'report to the courthouse'},
 {name:'jury scam text',text:'District Court jury division: Failure to appear. Send a $450 fine through a payment app today.',action:'Send a $450 fine'},
 {name:'email',text:'From: clerk@example.org\nCounty Court hearing update: Please respond to this email with your availability.',action:'respond to this email'},
 {name:'plain SMS',text:'Court notice: Call the clerk at (202) 555-0186 before Friday to confirm your hearing.',action:'Call the clerk'},
 {name:'dense notice',text:'IN THE CIRCUIT COURT. Case 26-CV-102. The defendant is directed to file a response within 21 days of service. Failure to respond may result in default.',action:'file a response'},
 {name:'low quality OCR',text:'C0URT N0T1CE ### ~~ x1#%%%\nP4Y ?? ???',action:null},
 {name:'unsupported state',text:'Northbridge State Court. Appear at 12 Cedar Street on November 4 for the hearing.',action:'Appear at 12 Cedar Street'},
 {name:'federal notice',text:'United States District Court, District of Alder. Submit the attached form to the clerk by December 2.',action:'Submit the attached form'},
 {name:'no payment reminder',text:'Superior Court reminder: Check your jury reporting status at the court website after 5 p.m.',action:'Check your jury reporting status'},
 {name:'personal information',text:'District Court jury office: Reply with your Social Security number and date of birth to clear the warrant.',action:'Reply with your Social Security number'},
 {name:'non court document',text:'Library newsletter: Join the autumn reading club and bring a book.',action:null},
 {name:'indirect request',text:'Traffic Court notice. Your outstanding balance must be cleared before the scheduled hearing.',action:'balance must be cleared'},
 {name:'QR navigation',text:'Magistrate Court. Use the QR symbol on this letter to open the payment page.',action:'Use the QR symbol'},
 {name:'quoted warning',text:'County Court public warning: Scam texts say “Pay your fine now.” Do not follow these messages.',action:null}
] as const;

const base=process.env.SEAL_BASE_URL;
if(!base)throw new Error('Set SEAL_BASE_URL to a deployed SEAL instance.');

const [homeResponse,browseResponse,versionResponse]=await Promise.all([
 fetch(new URL('/',base),{signal:AbortSignal.timeout(15000)}),
 fetch(new URL('/browse',base),{signal:AbortSignal.timeout(15000)}),
 fetch(new URL('/api/version',base),{signal:AbortSignal.timeout(15000)})
]);
if(!homeResponse.ok||!browseResponse.ok||!versionResponse.ok)throw new Error(`Live surface unavailable: home=${homeResponse.status} browse=${browseResponse.status} version=${versionResponse.status}`);
const [homeHtml,browseHtml]=await Promise.all([homeResponse.text(),browseResponse.text()]);
if(!homeHtml.includes('Check a court message'))throw new Error('Live home surface is missing the current intake heading.');
if(!browseHtml.includes('See what real court messages look like'))throw new Error('Live browse surface is missing the current case archive heading.');
console.log('PASS live surface: home + browse + version');

let passed=0;
for(const [index,item] of cases.entries()){
 if(index)await new Promise(resolve=>setTimeout(resolve,8000));
 let response:Response;
 try{response=await fetch(new URL('/api/extract',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:item.text}),signal:AbortSignal.timeout(30000)});}
 catch(error){console.log(`FAIL ${item.name}: request failed (${error instanceof Error?error.name:'unknown'})`);continue;}
 if(!response.ok){const error=await response.json().catch(()=>({})) as {category?:string};console.log(`FAIL ${item.name}: API returned ${response.status} (${error.category||'unknown'})`);continue;}
 const data=await response.json() as {mode:string;extraction:unknown};
 const extraction=extractionSchema.parse(data.extraction);
 const claims=claimsFromExtraction(extraction,item.text).filter(claim=>claim.action);
 const actual=claims.map(claim=>claim.action!.source_text);
 const ok=item.action?actual.some(quote=>quote.toLowerCase().includes(item.action.toLowerCase())):actual.length===0;
 if(ok)passed++;
 console.log(`${ok?'PASS':'FAIL'} ${item.name}: ${JSON.stringify(actual)}`);
}
console.log(`${passed}/${cases.length} correctly extracted or refused`);
if(passed!==cases.length)process.exitCode=1;
