'use client';

export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <html lang="en"><body style={{margin:0,fontFamily:'Arial,sans-serif',background:'#fff',color:'#111'}}>
  <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'24px'}}>
   <section style={{width:'min(520px,100%)'}}>
    <img src="/brand/seal-mark-black.svg" alt="" style={{width:'24px',height:'24px',marginBottom:'28px'}}/>
    <h1 style={{margin:0,fontSize:'28px',lineHeight:'34px'}}>SEAL could not load this view.</h1>
    <p style={{margin:'12px 0 0',color:'#555',fontSize:'15px',lineHeight:'22px'}}>Retry the application. If the problem continues, open a fresh check.</p>
    <button type="button" onClick={reset} style={{marginTop:'24px',minHeight:'42px',padding:'9px 14px',border:0,borderRadius:'8px',background:'#111',color:'#fff',font:'inherit'}}>Retry</button>
   </section>
  </main>
 </body></html>;
}
