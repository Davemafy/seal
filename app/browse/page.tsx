import Link from 'next/link';
import {browseCases,type BrowseCase,type BrowseSection} from '@/lib/browse-cases';
import PdfThumb from './pdf-thumb';
import '../workspace.css';
import './browse.css';

const sectionMeta:Record<BrowseSection,{title:string;description:string}>={
 'court-message-scams':{
  title:'Published court-message scams',
  description:'Messages and notices that courts or public agencies published as scam examples.'
 },
 'jury-duty-threats':{
  title:'Jury-duty threats and payment pressure',
  description:'Court-published warnings showing the language scammers use to create urgency, fear, and payment pressure.'
 },
 'legitimate-reference':{
  title:'Legitimate reference material',
  description:'Court-published examples that help establish what an authentic document can look like.'
 }
};

function CaseMedia({item,featured=false}:{item:BrowseCase;featured?:boolean}){
 return <div className={`archive-media ${featured?'is-featured':''} ${item.preview.type==='image'?'is-image':'is-document'}`}>
  {item.preview.type==='pdf'
   ?<PdfThumb id={item.id} alt={item.preview.alt}/>
   :<img className="archive-source-image" src={`/api/browse-asset?id=${encodeURIComponent(item.id)}`} alt={item.preview.alt} loading={featured?'eager':'lazy'}/>}
 </div>;
}

function CaseCopy({item,featured=false}:{item:BrowseCase;featured?:boolean}){
 return <div className={`archive-copy ${featured?'is-featured':''}`}>
  <p className="case-jurisdiction">{item.jurisdiction}</p>
  {featured?<h2>{item.title}</h2>:<h3>{item.title}</h3>}
  <p className="case-source">Source: <strong>{item.sourceTitle}</strong> · {item.classification}</p>
  <p className="case-note">{item.visualNote}</p>
  <p className="case-excerpt">{item.excerpt}</p>
  <div className="case-actions">
   <Link className="run-case" href={`/?case=${item.id}`}>Run in SEAL</Link>
   <a className="open-case" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Open original</a>
  </div>
 </div>;
}

export default function Browse(){
 const featured=browseCases.find(item=>item.featured)||browseCases[0];
 const sections=(Object.keys(sectionMeta) as BrowseSection[])
  .map(section=>({section,items:browseCases.filter(item=>item.section===section&&!item.featured)}))
  .filter(group=>group.items.length);

 return <main className="seal-app browse-page">
  <aside className="workspace-rail" aria-label="Workspace">
   <Link href="/" className="rail-brand">SEAL<span>®</span></Link>
   <div className="rail-group-label">WORKSPACE</div>
   <Link className="rail-item" href="/">Check a message</Link>
   <Link className="rail-item is-current" href="/browse">Browse real cases</Link>
   <div className="rail-spacer"/>
   <div className="rail-foot"><strong>Public sources</strong><span>Original court and government material only.</span></div>
  </aside>

  <header className="browse-mobile-nav">
   <Link href="/" className="mobile-brand">SEAL</Link>
   <Link href="/" className="browse-mobile-action">Check a message</Link>
  </header>

  <section className="browse-shell">
   <header className="browse-intro">
    <h1>Browse real cases</h1>
    <p>Real court documents, published scam notices, and source-backed examples. The artifacts do the explaining.</p>
   </header>

   <article className="featured-case">
    <CaseMedia item={featured} featured/>
    <CaseCopy item={featured} featured/>
   </article>

   <div className="archive-sections">
    {sections.map(({section,items})=><section className="archive-section" key={section}>
     <header className="archive-section-head">
      <h2>{sectionMeta[section].title}</h2>
      <p>{sectionMeta[section].description}</p>
     </header>
     <div className="archive-rows">
      {items.map((item,index)=><article className={`archive-row ${index%2?'is-reverse':''}`} key={item.id}>
       <CaseMedia item={item}/>
       <CaseCopy item={item}/>
      </article>)}
     </div>
    </section>)}
   </div>

   <p className="archive-method">SEAL keeps the original source link with every item. Where only a public warning exists, it does not reconstruct a missing notice.</p>
  </section>
 </main>;
}
