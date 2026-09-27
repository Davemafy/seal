/* eslint-disable @next/next/no-img-element -- Small local SVG brand marks do not need Next Image optimization. */
import Link from 'next/link';
import {browseCases,type BrowseCase} from '@/lib/browse-cases';
import PdfThumb from './pdf-thumb';
import ImageThumb from './image-thumb';
import '../workspace.css';
import './browse.css';

function reliabilityScore(item:BrowseCase){
 if(item.featured&&item.classification==='Confirmed scam example')return 100;
 if(item.classification==='Confirmed scam example')return 90;
 if(item.classification==='Legitimate sample/form')return 80;
 if(item.classification==='Official blank court form')return 75;
 if(item.classification==='Published judicial notice')return 70;
 return 10;
}

function CaseMedia({item,priority=false}:{item:BrowseCase;priority?:boolean}){
 return <div className={`case-visual ${item.preview.type==='image'?'is-image':'is-pdf'}`}>
  {item.preview.type==='pdf'
   ?<PdfThumb id={item.id} alt={item.preview.alt} priority={priority}/>
   :<ImageThumb id={item.id} alt={item.preview.alt}/>}
 </div>;
}

export default function Browse(){
 const rankedCases=[...browseCases].sort((a,b)=>reliabilityScore(b)-reliabilityScore(a));

 return <main className="seal-app browse-page">
  <aside className="workspace-rail" aria-label="Workspace">
   <Link href="/" className="rail-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span className="rail-brand-word">SEAL</span><span className="rail-brand-reg">®</span></Link>
   <div className="rail-group-label">WORKSPACE</div>
   <Link className="rail-item" href="/">Check a message</Link>
   <Link className="rail-item is-current" href="/browse">Browse real cases</Link>
   <div className="rail-spacer"/>
   <div className="rail-foot"><strong>Public sources only</strong><span>Every item links back to the issuing court or agency.</span></div>
  </aside>

  <header className="seal-nav mobile-only-nav">
   <Link href="/" className="mobile-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span>SEAL</span></Link>
   <Link href="/" className="mobile-nav-action">Check</Link>
  </header>

  <section className="browse-shell">
   <header className="browse-intro">
    <h1>Browse real cases</h1>
    <p>Published court documents and images from several countries. Open every original; verified runnable examples can also be opened in SEAL. Blank forms and historical notices are labeled.</p>
   </header>

   <div className="case-archive">
    {rankedCases.map((item,index)=><article className="case-card" key={item.id}>
     <CaseMedia item={item} priority={index<2}/>
     <div className="case-copy">
      <p className="case-kicker">{item.jurisdiction}{item.language?` · ${item.language}`:''}</p>
      <h2>{item.title}</h2>
      <p className="case-source">Source: {item.sourceTitle}</p>
      <p className="case-classification">{item.classification}</p>
      <p className="case-note">{item.visualNote}</p>
      <div className="case-actions">
       <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Open source</a>
       {item.runText&&<a href={`/?case=${item.id}`}>Run in SEAL</a>}
      </div>
     </div>
    </article>)}
   </div>
  </section>
 </main>;
}
