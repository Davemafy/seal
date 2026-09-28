/* eslint-disable @next/next/no-img-element -- Landing uses local source artifacts and the existing SEAL brand mark. */
import Link from 'next/link';
import SealApp from './seal-app';
import './landing.css';

const featuredCases=[
 {
  title:'Traffic default notice with QR payment',
  meta:'Dallas, Texas',
  image:'/browse-assets/dallas-traffic-qr-scam.jpg',
  href:'/check/dallas-proof?case=dallas-traffic-qr-scam',
  label:'Confirmed scam example'
 },
 {
  title:'Sample federal jury summons',
  meta:'District of Connecticut',
  image:'/browse-assets/connecticut-sample-jury-summons.jpg',
  href:'/check/connecticut-proof?case=connecticut-sample-jury-summons',
  label:'Official sample'
 },
 {
  title:'Supreme Court fake-site advisory',
  meta:'India',
  image:'/browse-assets/india-supreme-court-fake-website-advisory.jpg',
  href:'/check/india-proof?case=india-supreme-court-fake-website-advisory',
  label:'Official scam advisory'
 }
];

export default function Home(){
 return <div className="landing-page">
  <header className="landing-site-nav">
   <Link className="landing-brand" href="/" aria-label="SEAL home">
    <img src="/brand/seal-mark-black.svg" alt=""/>
    <span>SEAL</span>
   </Link>
   <nav aria-label="Landing navigation">
    <Link href="/browse">Browse</Link>
    <a className="landing-nav-check" href="#check">Check a message</a>
   </nav>
  </header>

  <section className="landing-hero" id="check">
   <div className="landing-architecture" aria-hidden="true"/>
   <div className="landing-hero-inner">
    <div className="landing-hero-copy">
     <p className="landing-kicker">Before you call, click, pay, or reply.</p>
     <h1><span>The seal can be faked.</span><span className="landing-headline-muted">The source can’t.</span></h1>
     <p className="landing-hero-summary">Check what a court message is asking you to do against independent public sources.</p>
     <p className="landing-hero-principle">If a source cannot establish it, SEAL leaves it unconfirmed. SEAL is not affiliated with any court.</p>
    </div>

    <div className="landing-checker" aria-label="Check a court message">
     <div className="landing-checker-head">
      <div>
       <span>Check a court message</span>
       <small>Screenshot, PDF, or message text</small>
      </div>
      <span className="landing-checker-state">Your message</span>
     </div>
     <SealApp suppressOnboarding/>
    </div>
   </div>
  </section>

  <div className="landing-marketing">
   <section className="landing-proof" aria-labelledby="landing-proof-title">
    <div className="landing-section-heading">
     <h2 id="landing-proof-title">Official-looking details are not the same thing as an official message.</h2>
     <p>The City of Dallas published this court-looking QR-payment notice as a scam example. SEAL checks the requested action against that independent source.</p>
    </div>

    <div className="landing-proof-stage">
     <div className="landing-proof-document">
      <span className="landing-proof-tag">Published artifact · City of Dallas</span>
      <div className="landing-document-frame">
       <img src="/browse-assets/dallas-traffic-qr-scam.jpg" alt="City of Dallas published traffic QR scam example"/>
      </div>
      <blockquote>“Scan the QR code to settle your unpaid balance.”</blockquote>
     </div>

     <div className="landing-proof-bridge" aria-hidden="true">
      <span/>
      <small>checked independently</small>
     </div>

     <div className="landing-proof-result">
      <div className="landing-proof-result-head">
       <img src="/brand/seal-mark-black.svg" alt=""/>
       <span>SEAL</span>
       <small>Check result</small>
      </div>
      <div className="landing-proof-result-body">
       <span className="landing-result-status">Official warning found</span>
       <h3>Do not scan or pay from this message.</h3>
       <p>The City of Dallas published this exact example as a scam. The QR/payment route can be rejected from the authority’s own source.</p>
       <div className="landing-source-row">
        <span>
         <small>Independent source</small>
         <strong>City of Dallas — SCAM Notice</strong>
        </span>
        <strong>Source attached</strong>
       </div>
       <Link href="/check/dallas-proof?case=dallas-traffic-qr-scam">Open this check</Link>
      </div>
     </div>
    </div>
   </section>

   <section className="landing-method" aria-labelledby="landing-method-title">
    <div className="landing-method-intro">
     <h2 id="landing-method-title">The message and the evidence stay separate.</h2>
     <p>SEAL reads the action first, checks outside the message, then gives you an official route forward without pretending the sender has been authenticated.</p>
    </div>
    <div className="landing-method-grid">
     <article>
      <h3>Read the request</h3>
      <p>What is this message actually asking you to call, click, pay, share, or do?</p>
     </article>
     <article>
      <h3>Check outside the message</h3>
      <p>Public court and government sources are opened independently of the message.</p>
     </article>
     <article>
      <h3>Know what follows</h3>
      <p>Confirmed facts stay distinct from unknowns, with a safer official next step.</p>
     </article>
    </div>
   </section>

   <section className="landing-browse" aria-labelledby="landing-browse-title">
    <div className="landing-browse-head">
     <div>
      <h2 id="landing-browse-title">Source material, not mockups.</h2>
     </div>
     <Link href="/browse">Browse all examples</Link>
    </div>
    <div className="landing-case-grid">
     {featuredCases.map(item=><Link href={item.href} className="landing-case" key={item.title}>
      <div className="landing-case-media"><img src={item.image} alt=""/></div>
      <div className="landing-case-copy">
       <span>{item.meta}</span>
       <h3>{item.title}</h3>
       <small>{item.label}</small>
      </div>
     </Link>)}
    </div>
   </section>

   <section className="landing-boundary">
    <div>
     <h2>Matching details do not authenticate a message.</h2>
    </div>
    <p>A real court name, address, phone number, or public case record can appear inside a fraudulent message. SEAL reports only what an independent source establishes.</p>
   </section>

   <section className="landing-final">
    <img src="/brand/seal-mark-black.svg" alt=""/>
    <h2>Got a court message you’re unsure about?</h2>
    <p>Check it before you act.</p>
    <a href="#check">Check a court message</a>
   </section>

   <footer className="landing-footer">
    <div className="landing-footer-main">
     <div className="landing-footer-brand">
      <img src="/brand/seal-mark-white.svg" alt=""/>
      <span>SEAL</span>
     </div>
     <p className="landing-footer-thesis"><span>The seal can be faked.</span><strong>The source can’t.</strong></p>
     <nav aria-label="Footer navigation">
      <a href="#check">Check a message</a>
      <Link href="/browse">Browse real examples</Link>
     </nav>
    </div>
    <div className="landing-footer-meta">
     <p>SEAL checks court-message claims against independent public sources. It does not authenticate a sender from appearance alone.</p>
     <span>Not affiliated with any court.</span>
    </div>
   </footer>
  </div>
 </div>;
}
