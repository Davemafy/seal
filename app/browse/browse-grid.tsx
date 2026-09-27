'use client';

import Link from 'next/link';
import {useState} from 'react';
import type {BrowseCase} from '@/lib/browse-cases';
import PdfThumb from './pdf-thumb';
import ImageThumb from './image-thumb';

type BrowseFilter='all'|'runnable'|'scam'|'official'|'international';

const filters:{id:BrowseFilter;label:string}[]=[
 {id:'all',label:'All'},
 {id:'runnable',label:'Runnable'},
 {id:'scam',label:'Scam examples'},
 {id:'official',label:'Official documents'},
 {id:'international',label:'Outside U.S.'},
];

function CaseMedia({item,priority=false}:{item:BrowseCase;priority?:boolean}){
 return <div className={`case-visual ${item.preview.type==='image'?'is-image':'is-pdf'}`}>
  {item.preview.type==='pdf'
   ?<PdfThumb id={item.id} alt={item.preview.alt} priority={priority}/>
   :<ImageThumb id={item.id} alt={item.preview.alt}/>}
 </div>;
}

function matchesFilter(item:BrowseCase,filter:BrowseFilter){
 if(filter==='runnable')return Boolean(item.runText);
 if(filter==='scam')return item.classification==='Confirmed scam example';
 if(filter==='official')return item.classification!=='Confirmed scam example';
 if(filter==='international')return item.country!=='United States';
 return true;
}

export default function BrowseGrid({items}:{items:BrowseCase[]}){
 const [filter,setFilter]=useState<BrowseFilter>('all');
 const visible=items.filter(item=>matchesFilter(item,filter));

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

  <p className="case-filter-count" aria-live="polite">{visible.length} {visible.length===1?'document':'documents'}</p>

  <div className="case-archive">
   {visible.map((item,index)=><article className={`case-card ${index===0&&filter==='all'?'is-lead':''}`} key={item.id}>
    <CaseMedia item={item} priority={index<2}/>
    <div className="case-copy">
     <p className="case-kicker"><span>{item.jurisdiction}</span><span>{item.language||'English'}</span></p>
     <h2>{item.title}</h2>
     <p className="case-context"><span>{item.classification}</span><span aria-hidden="true">·</span><strong>{item.runText?'Runnable example':'Reference document'}</strong></p>
     <p className="case-note">{item.visualNote}</p>
     <p className="case-source">Source: {item.sourceTitle}</p>
     <div className="case-actions">
      {item.runText&&<Link className="case-run-action" href={`/?case=${item.id}`}>Run in SEAL</Link>}
      <a className="case-source-action" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Open original <span aria-hidden="true">↗</span></a>
     </div>
    </div>
   </article>)}
  </div>
 </>;
}
