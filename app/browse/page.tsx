import Link from 'next/link';
import {browseCases} from '@/lib/browse-cases';
import '../workspace.css';
import './browse.css';

const categories=[
 ['jury-duty-payment-demand','Jury duty payment demand'],
 ['fake-summons-arrest-threat','Fake summons / arrest threat'],
 ['personal-information','Request for personal information'],
 ['court-payment-fee','Court payment / fee message'],
 ['legitimate-court-notice','Legitimate court notice'],
 ['ambiguous-unsupported','Ambiguous / unsupported']
] as const;

export default function Browse(){
 return <main className="seal-app browse-page">
  <aside className="workspace-rail" aria-label="Workspace">
   <Link href="/" className="rail-brand">SEAL<span>®</span></Link>
   <div className="rail-group-label">WORKSPACE</div>
   <Link className="rail-item" href="/">Check a message</Link>
   <Link className="rail-item is-current" href="/browse">Browse real cases</Link>
   <div className="rail-spacer"/>
   <div className="rail-foot"><strong>Public sources only</strong><span>Every archive item links back to the issuing court or agency.</span></div>
  </aside>

  <header className="seal-nav">
   <Link href="/" className="mobile-brand">SEAL</Link>
   <div className="seal-nav-note">SEAL <span aria-hidden="true">/</span> Browse</div>
   <Link href="/" className="nav-action browse-check-link">Check a message</Link>
  </header>

  <section className="browse-shell">
   <header className="browse-intro">
    <h1>Browse real cases</h1>
    <p>Actual public court PDFs and published scam-message images, shown from their original sources.</p>
    <p className="browse-method">No recreated thumbnails. Run in SEAL uses source text only; missing notice text is never invented.</p>
   </header>

   <nav className="browse-index" aria-label="Case categories">
    {categories.map(([id,label])=><a href={`#${id}`} key={id}>{label}</a>)}
   </nav>

   <div className="case-archive">
    {browseCases.map((item,index)=><article className={`archive-entry archive-entry-${index+1}`} id={item.category} key={item.id}>
     <div className="case-visual">
      {item.preview.type==='image'
       ?<img className="case-source-image" src={item.preview.url} alt={item.preview.alt} loading="lazy"/>
       :<object className="case-source-pdf" data={`${item.preview.url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`} type="application/pdf" aria-label={item.preview.alt}>
         <a href={item.preview.url} target="_blank" rel="noopener noreferrer">Open source PDF</a>
        </object>}
      <a className="case-media-link" href={item.preview.url} target="_blank" rel="noopener noreferrer" aria-label={`Open original source document for ${item.title}`}>Open original</a>
     </div>
     <div className="case-copy">
      <p className="case-category">{item.categoryLabel}</p>
      <h2>{item.title}</h2>
      <p className="case-place">{item.jurisdiction} · {item.issuer}</p>
      <p className="case-excerpt">{item.excerpt}</p>
      <p className="case-classification">{item.classification}</p>
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
