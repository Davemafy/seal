/* eslint-disable @next/next/no-img-element -- Small local SVG brand marks do not need Next Image optimization. */
import {browseCases} from '@/lib/browse-cases';
import BrowseGrid from './browse-grid';
import BrowseRail from './browse-rail';
import BrowseIntro,{BrowseMobileHeader} from './browse-intro';
import '../workspace.css';
import './browse.css';

const visualOrder=[
 'dallas-traffic-qr-scam',
 'maryland-court-text-scam',
 'connecticut-sample-jury-summons',
 'spain-public-judicial-notice',
 'india-supreme-court-fake-website-advisory',
 'brazil-parana-citation-notice',
 'france-court-convocation-form',
];

export default function Browse(){
 const order=new Map(visualOrder.map((id,index)=>[id,index]));
 const rankedCases=[...browseCases].sort((a,b)=>(order.get(a.id)??99)-(order.get(b.id)??99));
 return <main className="seal-app browse-page">
  <BrowseRail/>

  <BrowseMobileHeader/>

  <section className="browse-shell">
   <BrowseIntro/>
   <BrowseGrid items={rankedCases}/>
  </section>
 </main>;
}
