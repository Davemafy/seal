import type {Claim,Token,Verification} from './types';
import type {BrowserDocument} from './browser-file';

const LEGACY_SESSION_KEY='seal:completed-check:v2';
const LEGACY_KEYS=['seal:completed-check:v1'] as const;
const sessionKey=(workspaceId:string)=>`seal:completed-check:v3:${workspaceId||'primary'}`;
const DB_NAME='seal-local-session';
const STORE_NAME='artifacts';
const MAX_SESSION_AGE=6*60*60*1000;

export type StoredCheckOrigin={
 kind:'browse';
 caseId:string;
 title?:string;
 jurisdiction?:string;
 curated?:boolean;
};

type StoredFileMeta={
 kind:BrowserDocument['kind'];
 tokens?:Token[];
 uncertain:boolean;
 sample:boolean;
 ocrConfidence?:number;
 unreadableFields:BrowserDocument['unreadableFields'];
};

export type StoredResultSession={
 version:2;
 text:string;
 claims:Claim[];
 verification:Verification;
 mode:'SNAPSHOT'|'LIVE';
 extractionMode:string;
 selected:string;
 origin?:StoredCheckOrigin;
 file?:StoredFileMeta;
 blobKey?:string;
 savedAt:number;
};

export type RestoredResultSession=StoredResultSession&{
 browserFile:BrowserDocument|null;
 sourceBlob:Blob|null;
};

function hasBrowser(){
 return typeof window!=='undefined'&&typeof indexedDB!=='undefined';
}

function validClaim(value:unknown):value is Claim{
 if(!value||typeof value!=='object')return false;
 const claim=value as Partial<Claim>;
 return typeof claim.id==='string'
  &&typeof claim.type==='string'
  &&typeof claim.label==='string'
  &&typeof claim.value==='string'
  &&typeof claim.exact_source_text==='string'
  &&typeof claim.page==='number';
}

function validVerification(value:unknown):value is Verification{
 if(!value||typeof value!=='object')return false;
 const verification=value as Partial<Verification>;
 return typeof verification.resolver_id==='string'
  &&Array.isArray(verification.results)
  &&verification.results.every(result=>Boolean(result)
   &&typeof result.claim_id==='string'
   &&['MATCH','MISMATCH','COULD_NOT_VERIFY'].includes(result.verdict)
   &&typeof result.explanation==='string'
   &&Array.isArray(result.evidence));
}

function validStoredSession(value:unknown):value is StoredResultSession{
 if(!value||typeof value!=='object')return false;
 const stored=value as Partial<StoredResultSession>;
 return stored.version===2
  &&typeof stored.text==='string'
  &&stored.text.length>0
  &&Array.isArray(stored.claims)
  &&stored.claims.length>0
  &&stored.claims.every(validClaim)
  &&validVerification(stored.verification)
  &&(stored.mode==='SNAPSHOT'||stored.mode==='LIVE')
  &&typeof stored.extractionMode==='string'
  &&typeof stored.selected==='string'
  &&typeof stored.savedAt==='number'
  &&Date.now()-stored.savedAt<=MAX_SESSION_AGE;
}

function openDb(){
 return new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Could not open local result store.'));
 });
}

async function putBlob(key:string,blob:Blob){
 const db=await openDb();
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE_NAME,'readwrite');
   tx.objectStore(STORE_NAME).put(blob,key);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error||new Error('Could not save local artifact.'));
   tx.onabort=()=>reject(tx.error||new Error('Could not save local artifact.'));
  });
 }finally{db.close()}
}

async function getBlob(key:string){
 const db=await openDb();
 try{
  return await new Promise<Blob|null>((resolve,reject)=>{
   const tx=db.transaction(STORE_NAME,'readonly');
   const request=tx.objectStore(STORE_NAME).get(key);
   request.onsuccess=()=>resolve(request.result instanceof Blob?request.result:null);
   request.onerror=()=>reject(request.error||new Error('Could not restore local artifact.'));
  });
 }finally{db.close()}
}

async function deleteBlob(key:string){
 if(!hasBrowser())return;
 const db=await openDb();
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE_NAME,'readwrite');
   tx.objectStore(STORE_NAME).delete(key);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error||new Error('Could not clear local artifact.'));
   tx.onabort=()=>reject(tx.error||new Error('Could not clear local artifact.'));
  });
 }finally{db.close()}
}

async function clearArtifactStore(){
 if(!hasBrowser())return;
 const db=await openDb();
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE_NAME,'readwrite');
   tx.objectStore(STORE_NAME).clear();
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error||new Error('Could not clear local artifacts.'));
   tx.onabort=()=>reject(tx.error||new Error('Could not clear local artifacts.'));
  });
 }finally{db.close()}
}

function removeLegacySessionKeys(){
 if(typeof window==='undefined')return;
 for(const key of LEGACY_KEYS)window.sessionStorage.removeItem(key);
}

export async function clearOrphanedResultArtifacts(workspaceId='primary'){
 if(!hasBrowser())return;
 removeLegacySessionKeys();
 if(window.sessionStorage.getItem(sessionKey(workspaceId)))return;
}

export function clearResultSession(workspaceId='primary'){
 if(typeof window==='undefined')return;
 removeLegacySessionKeys();
 const key=sessionKey(workspaceId);
 const raw=window.sessionStorage.getItem(key);
 window.sessionStorage.removeItem(key);
 if(workspaceId==='primary')window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
 if(!raw)return;
 try{
  const parsed=JSON.parse(raw) as unknown;
  if(validStoredSession(parsed)&&parsed.blobKey)void deleteBlob(parsed.blobKey).catch(()=>{});
  else void clearArtifactStore().catch(()=>{});
 }catch{
  void clearArtifactStore().catch(()=>{});
 }
}

export async function persistResultSession(
 data:Omit<StoredResultSession,'version'|'savedAt'|'blobKey'>,
 blob:Blob|null,
 workspaceId='primary'
){
 if(!hasBrowser())return;
 removeLegacySessionKeys();
 const key=sessionKey(workspaceId);
 const previousRaw=window.sessionStorage.getItem(key);
 let previousBlobKey='';
 try{
  const parsed=JSON.parse(previousRaw||'null') as unknown;
  previousBlobKey=validStoredSession(parsed)?parsed.blobKey||'':'';
 }catch{}

 const blobKey=blob?'artifact-'+Date.now()+'-'+Math.random().toString(36).slice(2):undefined;
 try{
  if(blob&&blobKey)await putBlob(blobKey,blob);
  const stored:StoredResultSession={...data,version:2,savedAt:Date.now(),blobKey};
  window.sessionStorage.setItem(key,JSON.stringify(stored));
  if(previousBlobKey&&previousBlobKey!==blobKey)void deleteBlob(previousBlobKey).catch(()=>{});
 }catch{
  if(blobKey)void deleteBlob(blobKey).catch(()=>{});
 }
}

export async function restoreResultSession(workspaceId='primary'):Promise<RestoredResultSession|null>{
 if(!hasBrowser())return null;
 removeLegacySessionKeys();
 const key=sessionKey(workspaceId);
 const raw=window.sessionStorage.getItem(key)
  ||(workspaceId==='primary'?window.sessionStorage.getItem(LEGACY_SESSION_KEY):null);
 if(!raw)return null;

 try{
  const parsed=JSON.parse(raw) as unknown;
  if(!validStoredSession(parsed)){
   window.sessionStorage.removeItem(key);
   await clearArtifactStore().catch(()=>{});
   return null;
  }

  let browserFile:BrowserDocument|null=null;
  let sourceBlob:Blob|null=null;
  if(parsed.file&&parsed.blobKey){
   const blob=await getBlob(parsed.blobKey);
   if(blob){
    sourceBlob=blob;
    browserFile={
     text:parsed.text,
     tokens:parsed.file.tokens||[],
     preview:URL.createObjectURL(blob),
     kind:parsed.file.kind,
     uncertain:parsed.file.uncertain,
     sample:parsed.file.sample,
     ocrConfidence:parsed.file.ocrConfidence,
     unreadableFields:parsed.file.unreadableFields||[]
    };
   }
  }

  return {...parsed,browserFile,sourceBlob};
 }catch{
  window.sessionStorage.removeItem(key);
  await clearArtifactStore().catch(()=>{});
  return null;
 }
}
