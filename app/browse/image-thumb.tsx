/* eslint-disable @next/next/no-img-element -- Source previews use proxied runtime URLs and native load/error events. */
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
 const proxy=`/api/browse-asset?id=${encodeURIComponent(id)}`;
 const [src,setSrc]=useState(sourceUrl);
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);

 return <div className={`case-image-thumb ${ready?'is-ready':''} ${failed?'has-failed':''}`}>
  {!ready&&!failed&&<Skeleton/>}
  <img
   className="case-source-image"
   src={src}
   alt={alt}
   loading={priority?'eager':'lazy'}
   fetchPriority={priority?'high':'auto'}
   onLoad={()=>setReady(true)}
   onError={()=>{
    if(src!==proxy){setReady(false);setSrc(proxy);return}
    setFailed(true);
   }}
  />
  {failed&&<div className="pdf-thumb-fallback"><span>Preview unavailable</span><small>The original source is still available.</small></div>}
 </div>;
}
