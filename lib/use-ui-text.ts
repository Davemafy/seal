'use client';

import {useCallback,useEffect,useState} from 'react';
import {DISPLAY_LANGUAGES,UI_COPY,displayLocaleFor,uiCopy,type DisplayLocale,type UiCopyKey} from './ui-locales';

export const DISPLAY_LOCALE_KEY='seal:display-locale:v1';
const EVENT='seal:locale-change';
const CACHE_VERSION='v3';
const memory=new Map<DisplayLocale,Partial<Record<UiCopyKey,string>>>();
const pending=new Map<DisplayLocale,Promise<Partial<Record<UiCopyKey,string>>>>();

function cacheKey(locale:DisplayLocale){return `seal:ui-copy:${CACHE_VERSION}:${locale}`}

async function loadBundle(locale:DisplayLocale){
 if(locale==='en')return UI_COPY as Record<UiCopyKey,string>;
 const fromMemory=memory.get(locale);
 if(fromMemory)return fromMemory;
 try{
  const raw=window.localStorage.getItem(cacheKey(locale));
  if(raw){
   const parsed=JSON.parse(raw) as Partial<Record<UiCopyKey,string>>;
   memory.set(locale,parsed);
   return parsed;
  }
 }catch{}
 const running=pending.get(locale);
 if(running)return running;
 const request=fetch('/api/translate',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({locale,strings:UI_COPY})
 }).then(async response=>{
  if(!response.ok)return {};
  const payload=await response.json() as {strings?:Partial<Record<UiCopyKey,string>>;mode?:string};
  const strings=payload.mode==='TRANSLATED'&&payload.strings?payload.strings:{};
  memory.set(locale,strings);
  try{window.localStorage.setItem(cacheKey(locale),JSON.stringify(strings))}catch{}
  return strings;
 }).catch(()=>({})).finally(()=>pending.delete(locale));
 pending.set(locale,request);
 return request;
}

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
 const [bundle,setBundle]=useState<Partial<Record<UiCopyKey,string>>>(()=>memory.get(locale)||{});

 useEffect(()=>{
  let live=true;
  setBundle(memory.get(locale)||{});
  void loadBundle(locale).then(strings=>{if(live)setBundle(strings)});
  return()=>{live=false};
 },[locale]);

 return useCallback((key:UiCopyKey)=>bundle[key]||uiCopy(locale,key),[bundle,locale]);
}
