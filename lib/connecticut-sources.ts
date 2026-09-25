import * as cheerio from 'cheerio';
import type {Evidence} from './types';

export const CT_SOURCE_PATHS={
 hartford:'/content/hartford',
 contact:'/contact-parking-information',
 faq:'/jury-info/jury-faqs',
 warning:'/jury-info'
} as const;
export type ConnecticutSourceKey=keyof typeof CT_SOURCE_PATHS;
export type ConnecticutSource={key:ConnecticutSourceKey;text:string;evidence:Evidence};
const root='https://www.ctd.uscourts.gov';
const checkedAt='2026-09-25T00:00:00.000Z';
// Text transcribed from the court's public pages on the checked date. Each
// excerpt is linked to its own page; a snapshot never masquerades as live data.
const saved:Record<ConnecticutSourceKey,{title:string;text:string}>={
 hartford:{title:'Hartford courthouse',text:'District of Connecticut. United States District Court. Abraham A. Ribicoff Federal Building. 450 Main Street. Suite A012. Hartford, CT 06103.'},
 contact:{title:'Jury Service Contact & Parking Information',text:'District of Connecticut. Status Check Only: Call (866) 388-2430 (You will need your nine-digit participant number listed on your summons.) Other Jury Questions: Call (800) 827-8224.'},
 faq:{title:'District of Connecticut jury FAQs',text:'How will I know when to report? You will receive a summons giving you two reporting dates. The summons will tell you to call the toll-free automated jury message system after 5:30 the night before each reporting date. When you call the automated jury message system at 1-866-388-2430, it will ask you to enter your 9-digit participant number shown on your summons.'},
 warning:{title:'District of Connecticut Jury Info',text:'Newer scams have also included threats of arrest unless a fine is paid for any failure to show for jury duty. If you should receive such a telephone call, do not disclose any personal information or pay any fine.'}
};
export function ctSnapshot(key:ConnecticutSourceKey):ConnecticutSource{return {key,text:saved[key].text,evidence:{title:saved[key].title,url:root+CT_SOURCE_PATHS[key],excerpt:saved[key].text,checked_at:checkedAt,source_mode:'SNAPSHOT'}}}
export function ctCite(source:ConnecticutSource,phrase:string):Evidence|undefined{
 const at=source.text.toLowerCase().indexOf(phrase.toLowerCase());if(at<0)return;
 const start=Math.max(0,at-65),end=Math.min(source.text.length,at+phrase.length+85);
 return {...source.evidence,excerpt:`${start?'…':''}${source.text.slice(start,end)}${end<source.text.length?'…':''}`};
}
async function ctLive(key:ConnecticutSourceKey):Promise<ConnecticutSource>{
 const url=root+CT_SOURCE_PATHS[key];
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'SEAL/1.0 (+https://github.com/Davemafy/seal)','Accept':'text/html'}});
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw new Error('Official source unavailable');
 const html=await response.text();if(html.length>2_000_000)throw new Error('Source too large');
 const $=cheerio.load(html);$('script,style,nav,footer,svg,form').remove();
 const text=($('main').text()||$('body').text()).replace(/\s+/g,' ').trim();
 if(text.length<100)throw new Error('Source text missing');
 return {key,text,evidence:{title:saved[key].title,url,excerpt:'',checked_at:new Date().toISOString(),source_mode:'LIVE'}};
}
export async function getCtSources(mode:'LIVE'|'SNAPSHOT'):Promise<Partial<Record<ConnecticutSourceKey,ConnecticutSource>>>{
 const keys=Object.keys(CT_SOURCE_PATHS) as ConnecticutSourceKey[];
 if(mode==='SNAPSHOT')return Object.fromEntries(keys.map(key=>[key,ctSnapshot(key)]));
 const settled=await Promise.allSettled(keys.map(ctLive));
 return Object.fromEntries(settled.flatMap((result,i)=>result.status==='fulfilled'?[[keys[i],result.value]]:[]));
}
