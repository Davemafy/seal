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
  <aside className="workspace-rail" aria-label="Workspace">
   <Link href="/" className="rail-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span className="rail-brand-word">SEAL</span><span className="rail-brand-reg">®</span></Link>
   <div className="rail-group-label">CHECKS</div>
   <Link className="rail-item rail-new-check" href="/">New check</Link>
   <Link className="rail-item rail-browse is-current" href="/browse">Browse</Link>
   <div className="rail-spacer"/>
   <div className="rail-foot"><strong>Public sources only</strong><span>Every item links back to the issuing court or agency.</span></div>
  </aside>

  <header className="seal-nav mobile-only-nav">
   <Link href="/" className="mobile-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span>SEAL</span></Link>
   <Link href="/" className="mobile-nav-action">Check</Link>
  </header>

  <section className="browse-shell">
   <header className="browse-intro">
    <p className="browse-eyebrow">PUBLIC SOURCES</p>
    <h1>Browse real cases</h1>
    <p className="browse-deck">Court documents and scam warnings published by courts and public agencies. Each entry keeps the original source attached and can be checked in SEAL.</p>
    <p className="browse-scope">Source coverage varies by jurisdiction. When SEAL cannot independently verify a court, it leaves the claim unconfirmed and points to an official directory when one is available.</p>
   </header>

   <BrowseGrid items={rankedCases}/>
  </section>
 </main>;
}
