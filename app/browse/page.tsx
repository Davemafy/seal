import {browseCases,type BrowseCase} from '@/lib/browse-cases';
import PdfThumb from './pdf-thumb';
import '../workspace.css';
import './browse.css';

function CaseMedia({item,priority=false}:{item:BrowseCase;priority?:boolean}){
 return <div className={`case-visual ${item.preview.type==='image'?'is-image':'is-pdf'}`}>
  {item.preview.type==='pdf'
   ?<PdfThumb id={item.id} alt={item.preview.alt} priority={priority}/>
   :<img
     className="case-source-image"
     src={`/api/browse-asset?id=${encodeURIComponent(item.id)}`}
     alt={item.preview.alt}
     loading={priority?'eager':'lazy'}
     fetchPriority={priority?'high':'auto'}
    />}
 </div>;
}

export default function Browse(){
 return <main className="seal-app browse-page">
  <aside className="workspace-rail" aria-label="Workspace">
   <a href="/" className="rail-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span className="rail-brand-word">SEAL</span><span className="rail-brand-reg">®</span></a>
   <div className="rail-group-label">WORKSPACE</div>
   <a className="rail-item" href="/">Check a message</a>
   <a className="rail-item is-current" href="/browse">Browse real cases</a>
   <div className="rail-spacer"/>
   <div className="rail-foot"><strong>Public sources only</strong><span>Every item links back to the issuing court or agency.</span></div>
  </aside>

  <header className="seal-nav mobile-only-nav">
   <a href="/" className="mobile-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span>SEAL</span></a>
   <a href="/" className="mobile-nav-action">Check</a>
  </header>

  <section className="browse-shell">
   <header className="browse-intro">
    <h1>Browse real cases</h1>
    <p>Court-published scam examples and legitimate reference forms. Open the source, or run supported artifacts through SEAL.</p>
   </header>

   <div className="case-archive">
    {browseCases.map((item,index)=><article className={`case-card ${item.featured?'is-featured':''}`} key={item.id}>
     <CaseMedia item={item} priority={index===0}/>
     <div className="case-copy">
      <p className="case-kicker">{item.jurisdiction}<span aria-hidden="true"> · </span>{item.classification}</p>
      <h2>{item.title}</h2>
      <p className="case-source">Source: {item.sourceTitle}</p>
      <p className="case-note">{item.visualNote}</p>
      <div className="case-actions">
       <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Open source</a>
       {(item.classification==='Confirmed scam example'||item.classification==='Legitimate sample/form')&&<a href={`/?case=${item.id}`}>Run in SEAL</a>}
      </div>
     </div>
    </article>)}
   </div>
  </section>
 </main>;
}
