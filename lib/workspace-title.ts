const cleanWorkspaceText=(value:string)=>String(value||'')
 .replace(/[\u0000-\u001F\u007F]/g,' ')
 .replace(/\s+/g,' ')
 .trim();

const ACTIONISH_TITLE=/\b(?:appear|payment|pay|scan|qr\s*code|failure|comply|resolve|hearing\s+date|before\s+the\s+hearing|call|click|visit|respond|deadline|required\s+to)\b/i;
const GENERIC_DOCUMENT_HEADING=/^(?:notice(?:\s+of)?|parking\s+violation|traffic\s+violation|summons|citation|warning|important)\b/i;
const COURTISH=/\b(?:court|judiciary|tribunal|justice|clerk|magistrate)\b/i;

export function safeWorkspaceTitle(value:string){
 const clean=cleanWorkspaceText(value)
  .replace(/^[~≈·|:;,.\-–—\s]+|[~≈·|:;,.\-–—\s]+$/g,'');
 if(!clean)return '';
 const words=clean.split(/\s+/).filter(Boolean);
 const compact=clean.replace(/\s/g,'');
 const letters=(compact.match(/\p{L}/gu)||[]).length;
 const noise=(compact.match(/[^\p{L}\p{M}\p{N}.,'’&()\-]/gu)||[]).length;
 if(clean.length>72||words.length>10)return '';
 if(letters<3||noise>Math.max(2,Math.floor(compact.length*.08)))return '';
 if(/[.!?].{8,}/.test(clean))return '';
 if(ACTIONISH_TITLE.test(clean)&&words.length>4)return '';
 if(GENERIC_DOCUMENT_HEADING.test(clean)&&!COURTISH.test(clean))return '';
 return clean;
}
