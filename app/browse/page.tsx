/* eslint-disable @next/next/no-img-element -- Small local SVG brand marks do not need Next Image optimization. */
import Link from 'next/link';
import {browseCases} from '@/lib/browse-cases';
import BrowseGrid from './browse-grid';
import BrowseRail from './browse-rail';
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
  <BrowseRail/>

  <header className="seal-nav mobile-only-nav">
   <Link href="/" className="mobile-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span>SEAL</span></Link>
   <Link href="/" className="mobile-nav-action">Check</Link>
  </header>

  <section className="browse-shell">
   <header className="browse-intro">
    <p className="browse-eyebrow">Real examples</p>
    <h1>See what real court messages look like</h1>
    <p className="browse-deck">Browse notices and scam warnings published by courts and public agencies. Open the original source, or check an example in SEAL.</p>
    <p className="browse-scope">If a detail cannot be independently confirmed, SEAL leaves it unconfirmed.</p>
   </header>

   <BrowseGrid items={rankedCases}/>
  </section>
 </main>;
}
