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

export default function ImageThumb({id,alt}:{id:string;alt:string}){
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);

 return <div className={`case-image-thumb ${ready?'is-ready':''} ${failed?'has-failed':''}`}>
  {!ready&&!failed&&<Skeleton/>}
  <img
   className="case-source-image"
   src={`/api/browse-asset?id=${encodeURIComponent(id)}`}
   alt={alt}
   loading="lazy"
   onLoad={()=>setReady(true)}
   onError={()=>setFailed(true)}
  />
  {failed&&<div className="pdf-thumb-fallback"><span>Preview unavailable</span><small>The original source is still available.</small></div>}
 </div>;
}
