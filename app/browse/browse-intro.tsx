'use client';

import Link from 'next/link';
import {useStoredUiLocale,useUiText} from '@/lib/use-ui-text';

export default function BrowseIntro(){
 const [locale]=useStoredUiLocale();
 const ui=useUiText(locale);
 return <>
  <header className="seal-nav mobile-only-nav">
   <Link href="/" className="mobile-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span>SEAL</span></Link>
   <Link href="/" className="mobile-nav-action">{ui('check')}</Link>
  </header>

  <header className="browse-intro">
   <p className="browse-eyebrow">{ui('realExamples')}</p>
   <h1>{ui('seeRealCourtMessages')}</h1>
   <p className="browse-deck">{ui('browseDeck')}</p>
   <p className="browse-scope">{ui('browseScope')}</p>
  </header>
 </>;
}
