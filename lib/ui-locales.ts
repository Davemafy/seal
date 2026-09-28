import en from './locales/en.json';
import fr from './locales/fr.json';
import ko from './locales/ko.json';
import tr from './locales/tr.json';
import hi from './locales/hi.json';

export const DISPLAY_LANGUAGES={
 en:'English',
 fr:'Français',
 ko:'한국어',
 tr:'Türkçe',
 hi:'हिन्दी'
} as const;

export type DisplayLocale=keyof typeof DISPLAY_LANGUAGES;

export const displayLocaleFor=(locale:string):DisplayLocale=>{
 const base=(locale||'en').toLowerCase().split('-')[0] as DisplayLocale;
 return base in DISPLAY_LANGUAGES?base:'en';
};

export const UI_COPY=en;
export type UiCopyKey=keyof typeof UI_COPY;

const LOCALES:Record<DisplayLocale,Partial<Record<UiCopyKey,string>>>={
 en,fr,ko,tr,hi
};

export function uiCopy(locale:DisplayLocale,key:UiCopyKey){
 return LOCALES[locale]?.[key]||UI_COPY[key];
}
