/* eslint-disable @next/next/no-img-element -- Browse previews deliberately use static/cached authority thumbnails. */
'use client';

import {useState} from 'react';

function Skeleton(){
 return <div className="case-media-skeleton" aria-hidden="true">
  <span className="skeleton-line is-wide"/>
  <span className="skeleton-line"/>
  <span className="skeleton-line is-short"/>
  <span className="skeleton-block"/>
 </div>;
}

export default function ImageThumb({id,alt,sourceUrl,priority=false}:{id:string;alt:string;sourceUrl:string;priority?:boolean}){
 const local=`/browse-assets/${id}.jpg`;
 const proxy=`/api/browse-asset?id=${encodeURIComponent(id)}`;
 const [src,setSrc]=useState(local);
 const [stage,setStage]=useState<'local'|'proxy'|'remote'>('local');
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);

 return <div className={`case-image-thumb ${ready?'is-ready':''} ${failed?'has-failed':''}`}>
  {!ready&&!failed&&<Skeleton/>}
  <img
   className="case-source-image"
   src={src}
   alt={alt}
   loading={priority?'eager':'lazy'}
   decoding="async"
   fetchPriority={priority?'high':'auto'}
   onLoad={()=>setReady(true)}
   onError={()=>{
    setReady(false);
    if(stage==='local'){
     setStage('proxy');
     setSrc(proxy);
     return;
    }
    if(stage==='proxy'){
     setStage('remote');
     setSrc(sourceUrl);
     return;
    }
    setFailed(true);
   }}
  />
  {failed&&<div className="pdf-thumb-fallback"><span>Preview unavailable</span><small>The original source is still available.</small></div>}
 </div>;
}
