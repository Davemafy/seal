'use client';

import {useCallback,useEffect,useState} from 'react';
import {DISPLAY_LANGUAGES,displayLocaleFor,uiCopy,type DisplayLocale,type UiCopyKey} from './ui-locales';

export const DISPLAY_LOCALE_KEY='seal:display-locale:v1';
const EVENT='seal:locale-change';

export function persistUiLocale(locale:DisplayLocale){
 try{window.localStorage.setItem(DISPLAY_LOCALE_KEY,locale)}catch{}
 window.dispatchEvent(new CustomEvent<DisplayLocale>(EVENT,{detail:locale}));
}

export function useStoredUiLocale(){
 const [locale,setLocaleState]=useState<DisplayLocale>('en');

 useEffect(()=>{
  const sync=()=>{
   const browser=navigator.languages?.[0]||navigator.language||'en';
   let next=displayLocaleFor(browser);
   try{next=displayLocaleFor(window.localStorage.getItem(DISPLAY_LOCALE_KEY)||browser)}catch{}
   setLocaleState(next);
  };
  const onLocale=(event:Event)=>{
   const next=(event as CustomEvent<DisplayLocale>).detail;
   if(next&&next in DISPLAY_LANGUAGES)setLocaleState(next);
  };
  sync();
  window.addEventListener(EVENT,onLocale);
  window.addEventListener('storage',sync);
  return()=>{
   window.removeEventListener(EVENT,onLocale);
   window.removeEventListener('storage',sync);
  };
 },[]);

 const setLocale=useCallback((next:DisplayLocale)=>{
  setLocaleState(next);
  persistUiLocale(next);
 },[]);

 return [locale,setLocale] as const;
}

export function useUiText(locale:DisplayLocale){
 return useCallback((key:UiCopyKey)=>uiCopy(locale,key),[locale]);
}
