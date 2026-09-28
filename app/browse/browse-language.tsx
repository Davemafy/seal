'use client';

import {useState} from 'react';
import {DISPLAY_LANGUAGES,type DisplayLocale} from '@/lib/ui-locales';
import {useStoredUiLocale,useUiText} from '@/lib/use-ui-text';

export default function BrowseLanguage(){
 const [locale,setLocale]=useStoredUiLocale();
 const ui=useUiText(locale);
 const [open,setOpen]=useState(false);

 function choose(next:DisplayLocale){
  setLocale(next);
  setOpen(false);
 }

 return <div className="rail-language">
  <div className="rail-language-menu">
   <button type="button" className="rail-language-trigger" aria-label={ui('displayLanguage')} title={ui('displayLanguage')} aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
    <svg className="seal-ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
     <circle cx="12" cy="12" r="8.25"/><path d="M3.9 12h16.2M12 3.75c2.15 2.2 3.2 4.95 3.2 8.25S14.15 18.05 12 20.25C9.85 18.05 8.8 15.3 8.8 12S9.85 5.95 12 3.75Z"/>
    </svg>
    <span>{locale.toUpperCase()}</span>
    <svg className="seal-guide-icon" viewBox="0 0 10 10" aria-hidden="true"><path d="m2.25 3.5 2.75 3 2.75-3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
   </button>
   {open&&<div className="rail-language-popover" role="listbox" aria-label={ui('displayLanguage')}>
    {Object.entries(DISPLAY_LANGUAGES).map(([code,label])=><button type="button" role="option" aria-selected={code===locale} className={code===locale?'is-selected':''} key={code} onClick={()=>choose(code as DisplayLocale)}><span>{label}</span><small>{code.toUpperCase()}</small></button>)}
   </div>}
  </div>
 </div>;
}
