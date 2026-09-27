'use client';

import {useEffect} from 'react';

export default function ErrorBoundary({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error('SEAL route error',error)},[error]);
 return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'24px',background:'#fff',color:'#111',fontFamily:'var(--font-uber-move),Arial,sans-serif'}}>
  <section style={{width:'min(520px,100%)',padding:'28px',border:'1px solid #e4e4e4',borderRadius:'12px'}}>
   <img src="/brand/seal-mark-black.svg" alt="" style={{width:'24px',height:'24px',marginBottom:'28px'}}/>
   <h1 style={{margin:0,fontSize:'28px',lineHeight:'34px',letterSpacing:'-.02em'}}>SEAL hit an unexpected error.</h1>
   <p style={{margin:'12px 0 0',color:'#555',fontSize:'15px',lineHeight:'22px'}}>The current screen could not finish. Retry this view first; if it fails again, start a new check.</p>
   <div style={{display:'flex',gap:'10px',marginTop:'24px',flexWrap:'wrap'}}>
    <button type="button" onClick={reset} style={{minHeight:'42px',padding:'9px 14px',border:0,borderRadius:'8px',background:'#111',color:'#fff',font:'inherit'}}>Try again</button>
    <a href="/" style={{minHeight:'42px',display:'inline-flex',alignItems:'center',padding:'9px 14px',border:'1px solid #ddd',borderRadius:'8px',color:'#111',textDecoration:'none'}}>New check</a>
   </div>
  </section>
 </main>;
}
