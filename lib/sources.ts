import * as cheerio from 'cheerio';
import type {Evidence} from './types';
const root='https://www.riverside.courts.ca.gov';
export const SOURCE_PATHS={jury:'/divisions/jury-services',status:'/online-services/jury-status-update',location:'/location/riverside-historic-courthouse',phones:'/es/node/22',warning:'/news/riverside-superior-court-warns-residents-jury-duty-scam'} as const;
export type SourceKey=keyof typeof SOURCE_PATHS;
export type Source={key:SourceKey;text:string;evidence:Evidence};
const checked='2026-09-24T00:00:00.000Z';
const snapshots:Record<SourceKey,{title:string;text:string}>={
 jury:{title:'Jury Services',text:'Superior Court of California County of Riverside. If you have received a jury summons, access the juror web portal for confirmation of reporting time, date, and location instructions. 951-275-5076 (phone) or 760-342-6264 (phone). Access the Juror Web Portal: jurywest.riverside.courts.ca.gov.'},
 status:{title:'Jury Status Update - Juror Portal',text:'Log on to the Juror Portal to check Your Juror Status, Request a Postponement, or Submit Your Response Form. 951.275.5076 760.342.6264. SMS Text - Text your badge number to: 951.289.7434.'},
 location:{title:'Riverside Historic Courthouse',text:'Riverside Historic Courthouse 4050 Main Street, Riverside, CA 92501 (951) 777-3147. Matters Served Civil Probate.'},
 phones:{title:'Court Phone Numbers',text:'Riverside Jury Services | 951.275.5076. Indio & Palm Springs Jury Services | 760.342.6264. Countywide Numbers Jury Services Western/Mid-County | 951.275.5076. Jury Services Desert Region | 951.342.6264.'},
 warning:{title:'Riverside Superior Court Warns Residents of Jury Duty Scam',text:'Aug 18, 2026. Riverside Superior Court will not call or send text messages threatening residents with arrest or pressuring them to immediately report to a courthouse, provide personal or financial information, or make a payment. Contact Riverside Superior Court directly using official Court contact information to verify any questions regarding jury service.'}
};
export function snapshot(key:SourceKey):Source {return {key,text:snapshots[key].text,evidence:{title:snapshots[key].title,url:root+SOURCE_PATHS[key],excerpt:snapshots[key].text,checked_at:checked,source_mode:'SNAPSHOT'}};}
export async function liveSource(key:SourceKey):Promise<Source>{
 let url=root+SOURCE_PATHS[key];let response:Response|undefined;
 for(let i=0;i<3;i++){
  response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'SEAL/1.0 (+https://github.com/Davemafy/seal; official-source-check)','Accept':'text/html'}});
  if(![301,302,303,307,308].includes(response.status))break;
  const location=response.headers.get('location');if(!location)throw new Error('Redirect without location');
  const next=new URL(location,url);if(next.protocol!=='https:'||next.hostname!=='www.riverside.courts.ca.gov'&&next.hostname!=='riverside.courts.ca.gov'||!Object.values(SOURCE_PATHS).includes(next.pathname as typeof SOURCE_PATHS[SourceKey]))throw new Error('Official source redirected outside allowlist');url=next.href;
 }
 if(!response?.ok||!response.headers.get('content-type')?.includes('text/html'))throw new Error('Official source unavailable');
 const html=await response.text();if(html.length>2_000_000)throw new Error('Source too large');
 const $=cheerio.load(html);$('script,style,nav,footer,header,svg,form').remove();
 const text=($('main').text()||$('body').text()).replace(/\s+/g,' ').trim();
 if(text.length<100)throw new Error('Official source text missing');
 return {key,text,evidence:{title:snapshots[key].title,url:root+SOURCE_PATHS[key],excerpt:'',checked_at:new Date().toISOString(),source_mode:'LIVE'}};
}
export async function getSources(mode:'LIVE'|'SNAPSHOT'):Promise<Partial<Record<SourceKey,Source>>>{
 if(mode==='SNAPSHOT')return Object.fromEntries((Object.keys(SOURCE_PATHS) as SourceKey[]).map(k=>[k,snapshot(k)]));
 const keys=Object.keys(SOURCE_PATHS) as SourceKey[];
 const settled=await Promise.allSettled(keys.map(liveSource));return Object.fromEntries(settled.flatMap((r,i)=>r.status==='fulfilled'?[[keys[i],r.value]]:[]));
}
export function cite(source:Source,phrase:string):Evidence|undefined {
 const index=source.text.toLowerCase().indexOf(phrase.toLowerCase());if(index<0)return;
 let start=Math.max(0,index-85),end=Math.min(source.text.length,index+phrase.length+90);
 if(start>0){const boundary=source.text.indexOf(' ',start);if(boundary>=0&&boundary<index)start=boundary+1;}
 if(end<source.text.length){const boundary=source.text.lastIndexOf(' ',end);if(boundary>index+phrase.length)end=boundary;}
 return {...source.evidence,excerpt:`${start?'…':''}${source.text.slice(start,end)}${end<source.text.length?'…':''}`};
}
