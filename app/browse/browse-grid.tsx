'use client';

import Link from 'next/link';
import {useState} from 'react';
import {useStoredUiLocale,useUiText} from '@/lib/use-ui-text';
import type {BrowseCase} from '@/lib/browse-cases';
import PdfThumb from './pdf-thumb';
import ImageThumb from './image-thumb';

type BrowseFilter='all'|'scam'|'official'|'international';

const filters:{id:BrowseFilter;labelKey:'all'|'scamWarnings'|'officialNotices'|'outsideUS'}[]=[
 {id:'all',labelKey:'all'},
 {id:'scam',labelKey:'scamWarnings'},
 {id:'official',labelKey:'officialNotices'},
 {id:'international',labelKey:'outsideUS'},
];

function CaseMedia({item,priority=false,openSourceLabel}:{item:BrowseCase;priority?:boolean;openSourceLabel:string}){
 return <a className={`case-visual ${item.preview.type==='image'?'is-image':'is-pdf'}`} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${openSourceLabel}: ${item.title}`}>
  {item.preview.type==='pdf'
   ?<PdfThumb id={item.id} alt={item.preview.alt} priority={priority}/>
   :<ImageThumb id={item.id} alt={item.preview.alt} sourceUrl={item.preview.url} priority={priority}/>}
 </a>;
}

function matchesFilter(item:BrowseCase,filter:BrowseFilter){
 if(filter==='scam')return item.classification==='Confirmed scam example'||item.category==='official-scam-guidance';
 if(filter==='official')return item.classification!=='Confirmed scam example';
 if(filter==='international')return item.country!=='United States';
 return true;
}

export default function BrowseGrid({items}:{items:BrowseCase[]}){
 const [locale]=useStoredUiLocale();
 const ui=useUiText(locale);
 const [filter,setFilter]=useState<BrowseFilter>('all');
 const visible=items.filter(item=>matchesFilter(item,filter));

 const featured=visible[0];
 const library=visible.slice(1);

 return <>
  <div className="case-filter-row" role="group" aria-label={ui('filterSourceDocuments')}>
   {filters.map(option=><button
    type="button"
    key={option.id}
    className={filter===option.id?'is-active':''}
    aria-pressed={filter===option.id}
    onClick={()=>setFilter(option.id)}
   >{ui(option.labelKey)}</button>)}
  </div>

  <div className="case-library-head">
   <p className="case-filter-count" aria-live="polite">{visible.length} {visible.length===1?ui('source'):ui('sources')}</p>
   <span>{ui('originalCourtMaterial')}</span>
  </div>

  {featured&&<article className="case-feature" key={featured.id}>
   <div className="case-feature-media">
    <CaseMedia item={featured} priority openSourceLabel={ui('openSource')}/>
   </div>
   <div className="case-feature-copy">
    <span className="case-feature-label">{ui('featuredSource')}</span>
    <p className="case-kicker"><span>{featured.jurisdiction}</span><span>{featured.language||'English'}</span></p>
    <h2>{featured.title}</h2>
    <p className="case-context"><span>{featured.classification}</span><span aria-hidden="true">·</span><strong>{ui('originalSourceAttached')}</strong></p>
    <p className="case-note">{featured.visualNote}</p>
    <p className="case-source">{ui('source')}: {featured.sourceTitle}</p>
    <div className="case-actions">
     <Link className="case-run-action" href={`/?case=${featured.id}`}>{ui('checkInSeal')}</Link>
     <a className="case-source-action" href={featured.sourceUrl} target="_blank" rel="noopener noreferrer">{ui('openSource')}</a>
    </div>
   </div>
  </article>}

  {!!library.length&&<div className="case-library-grid">
   {library.map((item,index)=><article className="case-library-card" key={item.id}>
    <CaseMedia item={item} priority={index<1} openSourceLabel={ui('openSource')}/>
    <div className="case-copy">
     <p className="case-kicker"><span>{item.jurisdiction}</span><span>{item.language||'English'}</span></p>
     <h2>{item.title}</h2>
     <p className="case-context"><span>{item.classification}</span><span aria-hidden="true">·</span><strong>{ui('originalSourceAttached')}</strong></p>
     <p className="case-note">{item.visualNote}</p>
     <div className="case-actions">
      <Link className="case-run-action" href={`/?case=${item.id}`}>{ui('checkInSeal')}</Link>
      <a className="case-source-action" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{ui('openSource')}</a>
     </div>
    </div>
   </article>)}
  </div>}
 </>;
}
