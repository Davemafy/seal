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
    <p>Public court pages, official scam warnings, and payment guidance. Every record below keeps its source visible.</p>
    <p className="browse-method">Run in SEAL uses the public excerpt shown here. Missing notice text is never reconstructed.</p>
   </header>

   <nav className="browse-index" aria-label="Case categories">
    {categories.map(([id,label])=><a href={`#${id}`} key={id}>{label}</a>)}
   </nav>

   <div className="case-archive">
    {browseCases.map((item,index)=><article className={`archive-entry archive-entry-${index+1}`} id={item.category} key={item.id}>
     <div className="case-visual" aria-hidden="true">
      <div className="case-sheet">
       <span>{item.issuer}</span>
       <div className="case-sheet-rule"/>
       <strong>{item.title}</strong>
       <p>{item.excerpt}</p>
      </div>
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
