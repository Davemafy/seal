/* eslint-disable @next/next/no-img-element -- Small local SVG brand marks do not need Next Image optimization. */
import Link from 'next/link';
import {browseCases} from '@/lib/browse-cases';
import BrowseGrid from './browse-grid';
import '../workspace.css';
import './browse.css';

const visualOrder=[
 'maryland-court-text-scam',
 'spain-public-judicial-notice',
 'connecticut-sample-jury-summons',
 'brazil-parana-citation-notice',
 'dallas-traffic-qr-scam',
 'france-court-convocation-form',
];

export default function Browse(){
 const order=new Map(visualOrder.map((id,index)=>[id,index]));
 const rankedCases=[...browseCases].sort((a,b)=>(order.get(a.id)??99)-(order.get(b.id)??99));
 const countryCount=new Set(browseCases.map(item=>item.country)).size;
 const languageCount=new Set(browseCases.map(item=>item.language||'English')).size;

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
    <p className="browse-eyebrow">PUBLIC SOURCE LIBRARY</p>
    <h1>Browse real cases</h1>
    <p className="browse-deck">Published court documents and scam examples from official sources. Open every original; examples that can be checked end to end are marked as runnable.</p>
    <div className="browse-proof" aria-label="Browse collection coverage">
     <span><strong>{browseCases.length}</strong> source documents</span>
     <span><strong>{countryCount}</strong> countries</span>
     <span><strong>{languageCount}</strong> languages</span>
    </div>
   </header>

   <BrowseGrid items={rankedCases}/>
  </section>
 </main>;
}
