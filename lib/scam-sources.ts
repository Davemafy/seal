import * as cheerio from 'cheerio';
import type {Evidence} from './types';

export const SCAM_SOURCE_URLS={
 usCourts:'https://www.uscourts.gov/court-programs/jury-service/juror-scams',
 ftcJury:'https://consumer.ftc.gov/consumer-alerts/2026/06/ignore-calls-texts-and-emails-threatening-arrest-you-missing-jury-duty',
 ftcGovernment:'https://consumer.ftc.gov/articles/how-avoid-government-impersonation-scam',
 ftcWebsite:'https://consumer.ftc.gov/consumer-alerts/2025/08/scammers-are-using-fake-websites-twist-jury-duty-scams'
} as const;
export type ScamSourceKey=keyof typeof SCAM_SOURCE_URLS;
export type ScamSource={key:ScamSourceKey;text:string;evidence:Evidence};
const checkedAt='2026-09-25T00:00:00.000Z';
const saved:Record<ScamSourceKey,{title:string;text:string}>={
 usCourts:{title:'U.S. Courts — Juror Scams',text:"Persons receiving such a telephone call or email should not provide the requested information and should immediately notify the Clerk of Court's office."},
 ftcJury:{title:'FTC — Jury duty scam warning',text:'Courts never demand payment over the phone. Only scammers say you can only pay with a payment app, cryptocurrency, gift cards, or a wire transfer service.'},
 ftcGovernment:{title:'FTC — Government impersonation scams',text:'Government agencies will never call, email, text, or message you on social media to ask for money or personal information. Call the government agency directly at a number you know is correct.'},
 ftcWebsite:{title:'FTC — Fake jury-duty websites',text:"If you think the call could be real, don’t go to the URL they give you. Instead, look up the court’s real website for jury duty information."}
};
export function scamSnapshot(key:ScamSourceKey):ScamSource{return {key,text:saved[key].text,evidence:{title:saved[key].title,url:SCAM_SOURCE_URLS[key],excerpt:saved[key].text,checked_at:checkedAt,source_mode:'SNAPSHOT'}}}
export function scamCite(source:ScamSource,phrase:string):Evidence|undefined{
 const at=source.text.toLowerCase().indexOf(phrase.toLowerCase());if(at<0)return;
 const start=Math.max(0,at-45),end=Math.min(source.text.length,at+phrase.length+65);
 return {...source.evidence,excerpt:`${start?'…':''}${source.text.slice(start,end)}${end<source.text.length?'…':''}`};
}
async function live(key:ScamSourceKey):Promise<ScamSource>{
 const url=SCAM_SOURCE_URLS[key];const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'SEAL/1.0 (+https://github.com/Davemafy/seal)','Accept':'text/html'}});
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw new Error('Official source unavailable');
 const html=await response.text();if(html.length>2_000_000)throw new Error('Source too large');
 const $=cheerio.load(html);$('script,style,nav,footer,svg,form').remove();const text=($('main').text()||$('body').text()).replace(/\s+/g,' ').trim();if(text.length<100)throw new Error('Source text missing');
 return {key,text,evidence:{title:saved[key].title,url,excerpt:'',checked_at:new Date().toISOString(),source_mode:'LIVE'}};
}
export async function getScamSources(mode:'LIVE'|'SNAPSHOT'):Promise<Partial<Record<ScamSourceKey,ScamSource>>>{
 const keys=Object.keys(SCAM_SOURCE_URLS) as ScamSourceKey[];if(mode==='SNAPSHOT')return Object.fromEntries(keys.map(k=>[k,scamSnapshot(k)]));
 const settled=await Promise.allSettled(keys.map(live));return Object.fromEntries(settled.flatMap((r,i)=>r.status==='fulfilled'?[[keys[i],r.value]]:[]));
}
