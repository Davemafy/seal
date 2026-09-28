import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import hi from './locales/hi.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';
import nl from './locales/nl.json';

export const DISPLAY_LANGUAGES={
 en:'English',zh:'中文',es:'Español',pt:'Português',fr:'Français',de:'Deutsch',it:'Italiano',
 hi:'हिन्दी',ar:'العربية',ja:'日本語',ko:'한국어',ru:'Русский',tr:'Türkçe',nl:'Nederlands'
} as const;

export type DisplayLocale=keyof typeof DISPLAY_LANGUAGES;

export const displayLocaleFor=(locale:string):DisplayLocale=>{
 const base=(locale||'en').toLowerCase().split('-')[0] as DisplayLocale;
 return base in DISPLAY_LANGUAGES?base:'en';
};

// Fixed product copy lives in locale files. Language switching is a dictionary swap.
// Runtime translation is reserved for content generated from the current check.
export const UI_COPY=en;
export type UiCopyKey=keyof typeof UI_COPY;

const LOCALES:Record<DisplayLocale,Partial<Record<UiCopyKey,string>>>={
 en,es,pt,fr,de,it,hi,ar,zh,ja,ko,ru,tr,nl
};

export function uiCopy(locale:DisplayLocale,key:UiCopyKey){
 return LOCALES[locale]?.[key]||UI_COPY[key];
}
