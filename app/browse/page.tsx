import Link from 'next/link';
import {browseCases,type BrowseCase} from '@/lib/browse-cases';
import PdfThumb from './pdf-thumb';
import '../workspace.css';
import './browse.css';

function CaseMedia({item}:{item:BrowseCase}){
 return <div className={`case-visual ${item.preview.type==='image'?'is-image':'is-pdf'}`}>
  {item.preview.type==='pdf'
   ?<PdfThumb id={item.id} alt={item.preview.alt}/>
   :<img className="case-source-image" src={`/api/browse-asset?id=${encodeURIComponent(item.id)}`} alt={item.preview.alt} loading="lazy"/>}
 </div>;
}

export default function Browse(){
 return <main className="seal-app browse-page">
  <aside className="workspace-rail" aria-label="Workspace">
   <Link href="/" className="rail-brand">SEAL<span>®</span></Link>
   <div className="rail-group-label">WORKSPACE</div>
   <Link className="rail-item" href="/">Check a message</Link>
   <Link className="rail-item is-current" href="/browse">Browse real cases</Link>
   <div className="rail-spacer"/>
   <div className="rail-foot"><strong>Public sources only</strong><span>Every item links back to the issuing court or agency.</span></div>
  </aside>

  <header className="seal-nav">
   <Link href="/" className="mobile-brand">SEAL</Link>
   <div className="seal-nav-note">SEAL <span aria-hidden="true">/</span> Browse</div>
   <Link href="/" className="nav-action browse-check-link">Check a message</Link>
  </header>

  <section className="browse-shell">
   <header className="browse-intro">
    <h1>Browse real cases</h1>
    <p>Actual court documents, published scam notices, and source-backed examples.</p>
   </header>

   <div className="case-archive">
    {browseCases.map(item=><article className="case-card" key={item.id}>
     <CaseMedia item={item}/>
     <div className="case-copy">
      <p className="case-kicker">{item.jurisdiction}</p>
      <h2>{item.title}</h2>
      <p className="case-source">Source: {item.sourceTitle}</p>
      <p className="case-note">{item.visualNote}</p>
      <div className="case-actions">
       <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Open source</a>
       <Link href={`/?case=${item.id}`}>Run in SEAL</Link>
      </div>
     </div>
    </article>)}
   </div>
  </section>
 </main>;
}
