import {officialCourtDirectoryFor} from './official-directories';

export type DetectedDocumentLanguage={
 code:string;
 label:string;
 confidence:'high'|'medium'|'low';
 script:string;
};

const labels:Record<string,string>={
 en:'English',zh:'中文',ja:'日本語',ko:'한국어',ar:'العربية',hi:'हिन्दी',ru:'Русский',
 es:'Español',pt:'Português',fr:'Français',de:'Deutsch',it:'Italiano',tr:'Türkçe',nl:'Nederlands'
};

const latinHints:Array<[string,RegExp]>=[
 ['es',/\b(?:tribunal|juzgado|audiencia|pago|comparecer|notificación|expediente|deberá)\b/giu],
 ['pt',/\b(?:tribunal|juízo|pagamento|compareça|intimação|processo|deverá)\b/giu],
 ['fr',/\b(?:tribunal|audience|paiement|comparaitre|comparaître|convocation|dossier|devez)\b/giu],
 ['de',/\b(?:gericht|ladung|zahlung|erscheinen|aktenzeichen|verfahren|müssen)\b/giu],
 ['it',/\b(?:tribunale|udienza|pagamento|comparire|avviso|procedimento|deve)\b/giu],
 ['tr',/\b(?:mahkeme|duruşma|ödeme|bildirim|dosya|gerekmektedir)\b/giu],
 ['nl',/\b(?:rechtbank|zitting|betaling|dagvaarding|zaaknummer|moet)\b/giu]
];

export function detectDocumentLanguage(text:string):DetectedDocumentLanguage{
 const value=(text||'').normalize('NFKC');
 const counts={
  han:(value.match(/[\u3400-\u9fff]/g)||[]).length,
  kana:(value.match(/[\u3040-\u30ff]/g)||[]).length,
  hangul:(value.match(/[\uac00-\ud7af]/g)||[]).length,
  arabic:(value.match(/[\u0600-\u06ff]/g)||[]).length,
  devanagari:(value.match(/[\u0900-\u097f]/g)||[]).length,
  cyrillic:(value.match(/[\u0400-\u04ff]/g)||[]).length,
  latin:(value.match(/[A-Za-zÀ-ÿ]/g)||[]).length
 };
 const total=Object.values(counts).reduce((sum,count)=>sum+count,0)||1;
 const pick=(code:string,script:string,count:number):DetectedDocumentLanguage=>({
  code,label:labels[code]||code,script,confidence:count/total>.55?'high':count/total>.25?'medium':'low'
 });
 if(counts.kana>4)return pick('ja','Japanese',counts.kana+counts.han);
 if(counts.hangul>4)return pick('ko','Korean',counts.hangul);
 if(counts.han>6)return pick('zh','Han',counts.han);
 if(counts.arabic>6)return pick('ar','Arabic',counts.arabic);
 if(counts.devanagari>6)return pick('hi','Devanagari',counts.devanagari);
 if(counts.cyrillic>6)return pick('ru','Cyrillic',counts.cyrillic);

 let best:{code:string;score:number}|null=null;
 for(const [code,pattern] of latinHints){
  const score=(value.match(pattern)||[]).length;
  pattern.lastIndex=0;
  if(!best||score>best.score)best={code,score};
 }
 if(best&&best.score>=2)return {code:best.code,label:labels[best.code],script:'Latin',confidence:best.score>=4?'high':'medium'};
 return {code:'en',label:'English',script:'Latin',confidence:counts.latin>20?'medium':'low'};
}

export function detectDocumentContext(text:string){
 const language=detectDocumentLanguage(text);
 const directory=officialCourtDirectoryFor(text);
 return {
  language,
  jurisdiction:directory?.jurisdiction||'',
  countryCode:directory?.countryCode||'',
  officialDirectory:directory
 };
}
