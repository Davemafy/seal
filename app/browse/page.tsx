/* eslint-disable @next/next/no-img-element -- Small local SVG brand marks do not need Next Image optimization. */
import {browseCases} from '@/lib/browse-cases';
import BrowseGrid from './browse-grid';
import BrowseRail from './browse-rail';
import BrowseIntro from './browse-intro';
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

  <BrowseIntro/>

  <section className="browse-shell">
   <BrowseGrid items={rankedCases}/>
  </section>
 </main>;
}
