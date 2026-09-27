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
 'india-supreme-court-fake-website-advisory',
 'brazil-parana-citation-notice',
 'dallas-traffic-qr-scam',
 'france-court-convocation-form',
];

export default function Browse(){
 const order=new Map(visualOrder.map((id,index)=>[id,index]));
 const rankedCases=[...browseCases].sort((a,b)=>(order.get(a.id)??99)-(order.get(b.id)??99));
 return <main className="seal-app browse-page">
  <aside className="workspace-rail browse-workspace-rail" aria-label="Workspace">
   <div className="rail-topbar">
    <Link href="/" className="rail-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span className="rail-brand-word">SEAL</span><span className="rail-brand-reg">®</span></Link>
    <Link className="icon-control rail-icon-control rail-new-check" href="/" aria-label="New check" title="New check"><svg className="seal-ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></Link>
   </div>
   <nav className="rail-primary-nav" aria-label="Primary">
    <Link className="rail-nav-item is-current" href="/browse"><svg className="seal-ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="4.5" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="4.5" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7"/><rect x="4.5" y="14" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="14" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg><span>Browse</span></Link>
   </nav>
   <div className="rail-section-head"><span>Checks</span></div>
   <div className="browse-rail-empty">
    <Link href="/" className="browse-start-check"><span>New check</span><small>Start with a message</small></Link>
   </div>
   <div className="rail-spacer"/>
   <div className="rail-bottom">
    <div className="browse-rail-note"><strong>Public sources</strong><span>Original court and agency material.</span></div>
   </div>
  </aside>

  <header className="seal-nav mobile-only-nav">
   <Link href="/" className="mobile-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span>SEAL</span></Link>
   <Link href="/" className="mobile-nav-action">Check</Link>
  </header>

  <section className="browse-shell">
   <header className="browse-intro">
    <p className="browse-eyebrow">Source library</p>
    <h1>Court notices and scam warnings</h1>
    <p className="browse-deck">Open the original court or agency source, or run any example through SEAL.</p>
    <p className="browse-scope">Coverage varies by jurisdiction. Claims SEAL cannot verify stay unconfirmed.</p>
   </header>

   <BrowseGrid items={rankedCases}/>
  </section>
 </main>;
}
