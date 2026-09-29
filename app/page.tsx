/* eslint-disable @next/next/no-img-element -- Landing uses local source artifacts and the existing SEAL brand mark. */
'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {DISPLAY_LANGUAGES,type DisplayLocale,type UiCopyKey} from '@/lib/ui-locales';
import {useStoredUiLocale,useUiText} from '@/lib/use-ui-text';
import './landing.css';

const featuredCases:[
 {titleKey:UiCopyKey;meta:string;image:string;href:string;labelKey:UiCopyKey},
 {titleKey:UiCopyKey;meta:string;image:string;href:string;labelKey:UiCopyKey},
 {titleKey:UiCopyKey;meta:string;image:string;href:string;labelKey:UiCopyKey}
]=[
 {
  titleKey:'landingCaseDallasTitle',
  meta:'Dallas, Texas',
  image:'/browse-assets/dallas-traffic-qr-scam.jpg',
  href:'/check/dallas-proof?case=dallas-traffic-qr-scam',
  labelKey:'landingConfirmedScamExample'
 },
 {
  titleKey:'landingCaseConnecticutTitle',
  meta:'District of Connecticut',
  image:'/browse-assets/connecticut-sample-jury-summons.jpg',
  href:'/check/connecticut-proof?case=connecticut-sample-jury-summons',
  labelKey:'landingOfficialSample'
 },
 {
  titleKey:'landingCaseIndiaTitle',
  meta:'India',
  image:'/browse-assets/india-supreme-court-fake-website-advisory.jpg',
  href:'/check/india-proof?case=india-supreme-court-fake-website-advisory',
  labelKey:'landingOfficialScamAdvisory'
 }
];

export default function Home(){
 const [locale,setLocale]=useStoredUiLocale();
 const ui=useUiText(locale);
 const [languageOpen,setLanguageOpen]=useState(false);
 const languageRef=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  document.documentElement.lang=locale;
 },[locale]);

 useEffect(()=>{
  if(!languageOpen)return;
  const close=(event:MouseEvent)=>{
   if(languageRef.current&&!languageRef.current.contains(event.target as Node))setLanguageOpen(false);
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setLanguageOpen(false)};
  document.addEventListener('mousedown',close);
  window.addEventListener('keydown',escape);
  return()=>{
   document.removeEventListener('mousedown',close);
   window.removeEventListener('keydown',escape);
  };
 },[languageOpen]);

 return <div className="landing-page">
  <header className="landing-site-nav">
   <Link className="landing-brand" href="/" aria-label="SEAL">
    <img src="/brand/seal-mark-black.svg" alt=""/>
    <span>SEAL</span>
   </Link>
   <nav aria-label={ui('landingNavigation')}>
    <Link href="/browse">{ui('browse')}</Link>
    <div ref={languageRef} className="landing-language">
     <button
      type="button"
      className="landing-language-trigger"
      aria-label={ui('displayLanguage')}
      aria-haspopup="listbox"
      aria-expanded={languageOpen}
      onClick={()=>setLanguageOpen(open=>!open)}
     >
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.7 12h16.6M12 3.5c2.2 2.2 3.35 5.05 3.35 8.5S14.2 18.3 12 20.5M12 3.5C9.8 5.7 8.65 8.55 8.65 12S9.8 18.3 12 20.5"/></svg>
      <span className="landing-language-name">{DISPLAY_LANGUAGES[locale]}</span>
      <span className="landing-language-code">{locale.toUpperCase()}</span>
      <svg className="landing-language-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7.5 9.5 4.5 4.5 4.5-4.5"/></svg>
     </button>
     {languageOpen&&<div className="landing-language-popover" role="listbox" aria-label={ui('displayLanguage')}>
      <div className="landing-language-popover-title">{ui('displayLanguage')}</div>
      {Object.entries(DISPLAY_LANGUAGES).map(([code,label])=><button
       type="button"
       role="option"
       aria-selected={code===locale}
       className={code===locale?'is-selected':''}
       key={code}
       onClick={()=>{setLocale(code as DisplayLocale);setLanguageOpen(false)}}
      ><span>{label}</span><small>{code.toUpperCase()}</small></button>)}
     </div>}
    </div>
    <Link className="landing-nav-check" href="/check/primary" aria-label={ui('checkCourtMessage')}><span className="landing-nav-check-full">{ui('checkCourtMessage')}</span><span className="landing-nav-check-short">{ui('landingNavCheck')}</span></Link>
   </nav>
  </header>

  <section className="landing-hero" id="check">
   <div className="landing-hero-inner">
    <div className="landing-hero-copy">
     <p className="landing-kicker">{ui('landingBeforeAction')}</p>
     <h1><span>{ui('landingHeadlineFake')}</span><span className="landing-headline-muted">{ui('landingHeadlineSource')}</span></h1>
     <p className="landing-hero-summary">{ui('landingHeroSummary')}</p>
     <p className="landing-hero-principle">{ui('landingHeroPrinciple')}</p>
     <div className="landing-hero-actions">
      <Link className="landing-hero-primary" href="/check/primary">{ui('checkCourtMessage')}</Link>
      <Link className="landing-hero-secondary" href="/browse">{ui('browse')}</Link>
     </div>
    </div>

    <aside className="landing-hero-evidence" aria-label={ui('landingPublishedArtifact')}>
     <div className="landing-hero-evidence-head">
      <span>{ui('landingPublishedArtifact')}</span>
      <small>City of Dallas</small>
     </div>
     <div className="landing-hero-evidence-frame">
      <img src="/browse-assets/dallas-traffic-qr-scam.jpg" alt="City of Dallas published traffic QR scam example"/>
     </div>
     <div className="landing-hero-evidence-foot">
      <div>
       <small>{ui('landingIndependentSource')}</small>
       <strong>City of Dallas · SCAM Notice</strong>
      </div>
      <Link href="/check/dallas-proof?case=dallas-traffic-qr-scam">{ui('landingOpenThisCheck')}</Link>
     </div>
    </aside>
   </div>
  </section>

  <div className="landing-marketing">
   <section className="landing-proof" aria-labelledby="landing-proof-title">
    <div className="landing-section-heading">
     <h2 id="landing-proof-title">{ui('landingProofTitle')}</h2>
     <p>{ui('landingProofSummary')}</p>
    </div>

    <div className="landing-proof-stage">
     <div className="landing-proof-document">
      <span className="landing-proof-tag">{ui('landingPublishedArtifact')} · City of Dallas</span>
      <div className="landing-document-frame">
       <img src="/browse-assets/dallas-traffic-qr-scam.jpg" alt="City of Dallas published traffic QR scam example"/>
      </div>
      <blockquote>“Scan the QR code to settle your unpaid balance.”</blockquote>
     </div>

     <div className="landing-proof-hinge" aria-hidden="true">
      <span>{ui('landingMessageLabel')}</span>
      <img src="/brand/seal-mark-white.svg" alt=""/>
      <span>{ui('landingSourceLabel')}</span>
     </div>

     <div className="landing-proof-result">
      <div className="landing-proof-result-head">
       <img src="/brand/seal-mark-black.svg" alt=""/>
       <span>SEAL</span>
       <small>{ui('resultTitle')}</small>
      </div>
      <div className="landing-proof-result-body">
       <span className="landing-result-status">{ui('landingProofStatus')}</span>
       <h3>{ui('landingProofAction')}</h3>
       <p>{ui('landingProofActionSummary')}</p>
       <div className="landing-source-row">
        <span>
         <small>{ui('landingIndependentSource')}</small>
         <strong>City of Dallas — SCAM Notice</strong>
        </span>
        <a data-testid="dallas-official-source" href="https://dallascityhall.com/departments/courtdetentionservices/DCH%20Documents/4-1-26%20-%20SCAM%20Notice.pdf" target="_blank" rel="noopener noreferrer">{ui('landingOpenCitySource')}</a>
       </div>
       <Link href="/check/dallas-proof?case=dallas-traffic-qr-scam">{ui('landingOpenThisCheck')}</Link>
      </div>
     </div>
    </div>
   </section>

   <section className="landing-method" aria-labelledby="landing-method-title">
    <div className="landing-method-intro">
     <h2 id="landing-method-title">{ui('landingMethodTitle')}</h2>
     <p>{ui('landingMethodSummary')}</p>
    </div>
    <div className="landing-method-grid">
     <article>
      <h3>{ui('landingExtractTitle')}</h3>
      <p>{ui('landingExtractCopy')}</p>
     </article>
     <article>
      <h3>{ui('landingResolveTitle')}</h3>
      <p>{ui('landingResolveCopy')}</p>
     </article>
     <article>
      <h3>{ui('landingVerdictTitle')}</h3>
      <p>{ui('landingVerdictCopy')}</p>
     </article>
    </div>
   </section>

   <section className="landing-browse" aria-labelledby="landing-browse-title">
    <div className="landing-browse-head">
     <div>
      <h2 id="landing-browse-title">{ui('landingBrowseTitle')}</h2>
     </div>
     <Link href="/browse">{ui('landingBrowseAll')}</Link>
    </div>
    <div className="landing-case-grid">
     {featuredCases.map(item=><Link href={item.href} className="landing-case" key={item.href}>
      <div className="landing-case-media"><img src={item.image} alt=""/></div>
      <div className="landing-case-copy">
       <span>{item.meta}</span>
       <h3>{ui(item.titleKey)}</h3>
       <small>{ui(item.labelKey)}</small>
      </div>
     </Link>)}
    </div>
   </section>

   <section className="landing-boundary">
    <div>
     <h2>{ui('landingBoundaryTitle')}</h2>
    </div>
    <p>{ui('landingBoundaryCopy')}</p>
   </section>

   <section className="landing-final">
    <img src="/brand/seal-mark-black.svg" alt=""/>
    <h2>{ui('landingFinalTitle')}</h2>
    <p>{ui('landingFinalCopy')}</p>
    <Link href="/check/primary">{ui('checkCourtMessage')}</Link>
   </section>

   <footer className="landing-footer">
    <div className="landing-footer-main">
     <div className="landing-footer-brand">
      <img src="/brand/seal-mark-white.svg" alt=""/>
      <span>SEAL</span>
     </div>
     <p className="landing-footer-thesis"><span>{ui('landingHeadlineFake')}</span><strong>{ui('landingHeadlineSource')}</strong></p>
     <nav aria-label={ui('landingFooterNavigation')}>
      <Link href="/check/primary">{ui('checkCourtMessage')}</Link>
      <Link href="/browse">{ui('browseCases')}</Link>
     </nav>
    </div>
    <div className="landing-footer-meta">
     <p>{ui('landingFooterMeta')}</p>
     <span>{ui('landingFooterAffiliation')}</span>
    </div>
   </footer>
  </div>
 </div>;
}
