export type NativeTranslator={
 translate:(input:string)=>Promise<string>;
 destroy?:()=>void;
};

type TranslatorFactory={
 create:(options:{
  sourceLanguage:string;
  targetLanguage:string;
  monitor?:(monitor:{addEventListener:(type:'downloadprogress',listener:(event:{loaded:number})=>void)=>void})=>void;
 })=>Promise<NativeTranslator>;
};

const translators=new Map<string,Promise<NativeTranslator|null>>();

const factory=():TranslatorFactory|null=>{
 if(typeof globalThis==='undefined')return null;
 const candidate=(globalThis as typeof globalThis&{Translator?:TranslatorFactory}).Translator;
 return candidate?.create?candidate:null;
};

export const browserTranslationSupported=()=>Boolean(factory());

export function primeBrowserTranslator(targetLanguage:string){
 if(!targetLanguage||targetLanguage==='en')return Promise.resolve<NativeTranslator|null>(null);
 const api=factory();
 if(!api)return Promise.resolve<NativeTranslator|null>(null);

 const key='en>'+targetLanguage;
 const existing=translators.get(key);
 if(existing)return existing;

 // Call create immediately. When this function is invoked from the language
 // picker, the browser still has the user activation some implementations
 // require to download/instantiate the on-device model.
 const pending=api.create({
  sourceLanguage:'en',
  targetLanguage
 }).then(translator=>translator).catch(()=>{
  translators.delete(key);
  return null;
 });
 translators.set(key,pending);
 return pending;
}

const translatable=(value:string)=>Boolean(
 value.trim()
 &&/[A-Za-z]/.test(value)
 &&!/^https?:\/\//i.test(value.trim())
);

export async function translateRecordWithBrowser(
 strings:Record<string,string>,
 targetLanguage:string,
 signal?:AbortSignal
):Promise<Record<string,string>|null>{
 const translator=await primeBrowserTranslator(targetLanguage);
 if(!translator)return null;
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');

 const entries=Object.entries(strings);
 const translated:Record<string,string>={};
 const concurrency=4;

 for(let index=0;index<entries.length;index+=concurrency){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const batch=entries.slice(index,index+concurrency);
  const values=await Promise.all(batch.map(async([key,value])=>{
   if(!translatable(value))return [key,value] as const;
   const output=await translator.translate(value);
   return [key,output?.trim()||value] as const;
  }));
  for(const [key,value] of values)translated[key]=value;
 }

 return translated;
}
