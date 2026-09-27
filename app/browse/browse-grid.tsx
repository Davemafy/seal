'use client';

import Link from 'next/link';
import {useState} from 'react';
import type {BrowseCase} from '@/lib/browse-cases';
import PdfThumb from './pdf-thumb';
import ImageThumb from './image-thumb';

type BrowseFilter='all'|'scam'|'official'|'international';

const filters:{id:BrowseFilter;label:string}[]=[
 {id:'all',label:'All'},
 {id:'scam',label:'Scam warnings'},
 {id:'official',label:'Official notices'},
 {id:'international',label:'Outside U.S.'},
];

function CaseMedia({item,priority=false}:{item:BrowseCase;priority?:boolean}){
 return <a className={`case-visual ${item.preview.type==='image'?'is-image':'is-pdf'}`} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open original source for ${item.title}`}>
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
 const [filter,setFilter]=useState<BrowseFilter>('all');
 const visible=items.filter(item=>matchesFilter(item,filter));

 const featured=visible[0];
 const library=visible.slice(1);

 return <>
  <div className="case-filter-row" role="group" aria-label="Filter source documents">
   {filters.map(option=><button
    type="button"
    key={option.id}
    className={filter===option.id?'is-active':''}
    aria-pressed={filter===option.id}
    onClick={()=>setFilter(option.id)}
   >{option.label}</button>)}
  </div>

  <div className="case-library-head">
   <p className="case-filter-count" aria-live="polite">{visible.length} {visible.length===1?'source':'sources'}</p>
   <span>Original court and agency material</span>
  </div>

  {featured&&<article className="case-feature" key={featured.id}>
   <div className="case-feature-media">
    <CaseMedia item={featured} priority/>
   </div>
   <div className="case-feature-copy">
    <span className="case-feature-label">Featured source</span>
    <p className="case-kicker"><span>{featured.jurisdiction}</span><span>{featured.language||'English'}</span></p>
    <h2>{featured.title}</h2>
    <p className="case-context"><span>{featured.classification}</span><span aria-hidden="true">·</span><strong>Original source attached</strong></p>
    <p className="case-note">{featured.visualNote}</p>
    <p className="case-source">Source: {featured.sourceTitle}</p>
    <div className="case-actions">
     <Link className="case-run-action" href={`/?case=${featured.id}`}>Check in SEAL</Link>
     <a className="case-source-action" href={featured.sourceUrl} target="_blank" rel="noopener noreferrer">Open source</a>
    </div>
   </div>
  </article>}

  {!!library.length&&<div className="case-library-grid">
   {library.map((item,index)=><article className="case-library-card" key={item.id}>
    <CaseMedia item={item} priority={index<1}/>
    <div className="case-copy">
     <p className="case-kicker"><span>{item.jurisdiction}</span><span>{item.language||'English'}</span></p>
     <h2>{item.title}</h2>
     <p className="case-context"><span>{item.classification}</span><span aria-hidden="true">·</span><strong>Original source attached</strong></p>
     <p className="case-note">{item.visualNote}</p>
     <div className="case-actions">
      <Link className="case-run-action" href={`/?case=${item.id}`}>Check in SEAL</Link>
      <a className="case-source-action" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Open source</a>
     </div>
    </div>
   </article>)}
  </div>}
 </>;
}
