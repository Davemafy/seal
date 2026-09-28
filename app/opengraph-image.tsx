import {ImageResponse} from 'next/og';

export const alt='SEAL — The seal can be faked. The source can’t.';
export const size={width:1200,height:630};
export const contentType='image/png';

export default function OpenGraphImage(){
 return new ImageResponse(
  <div style={{
   width:'100%',height:'100%',display:'flex',position:'relative',overflow:'hidden',
   background:'#f7f6f1',color:'#0d0d0d',fontFamily:'Arial, Helvetica, sans-serif'
  }}>
   <div style={{
    width:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',
    padding:'58px 68px 54px'
   }}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
     <div style={{display:'flex',alignItems:'center',gap:13,fontSize:24,fontWeight:700}}>
      <div style={{width:30,height:30,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
       <span style={{width:30,height:9,borderRadius:3,background:'#111'}}/>
       <span style={{width:21,height:9,borderRadius:3,background:'#111'}}/>
      </div>
      <span>SEAL</span>
     </div>
     <span style={{fontSize:16,color:'#6d6b65'}}>Before you call, click, pay, or reply.</span>
    </div>

    <div style={{display:'flex',alignItems:'flex-end',gap:64}}>
     <div style={{width:610,display:'flex',flexDirection:'column'}}>
      <div style={{fontSize:64,lineHeight:1.02,fontWeight:700,letterSpacing:'-2.8px'}}>The seal can be faked.</div>
      <div style={{fontSize:64,lineHeight:1.02,fontWeight:700,letterSpacing:'-2.8px',color:'#5d5b56'}}>The source can’t.</div>
      <div style={{marginTop:28,fontSize:21,lineHeight:1.35,color:'#4e4d48'}}>
       Check what a court message asks you to do against independent public sources.
      </div>
     </div>

     <div style={{
      width:350,minHeight:250,display:'flex',flexDirection:'column',justifyContent:'space-between',
      padding:24,borderRadius:22,background:'#fff',boxShadow:'0 18px 50px rgba(0,0,0,.08)'
     }}>
      <div style={{fontSize:14,color:'#77746e'}}>Check result</div>
      <div style={{fontSize:31,lineHeight:1.08,fontWeight:700,letterSpacing:'-1px'}}>Do not scan or pay from this message.</div>
      <div style={{
       display:'flex',justifyContent:'space-between',alignItems:'center',
       padding:'14px 16px',borderRadius:12,background:'#f1f0eb',fontSize:13
      }}>
       <span>City of Dallas</span><span style={{fontWeight:700}}>Official source</span>
      </div>
     </div>
    </div>

    <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#77746e'}}>
     <span>Independent public-source checking</span>
     <span>Unconfirmed stays unconfirmed.</span>
    </div>
   </div>
  </div>,
  size
 );
}
