import type {Claim,Verification} from './types';
import type {BrowserDocument} from './browser-file';

const SESSION_KEY='seal:completed-check:v1';
const DB_NAME='seal-local-session';
const STORE_NAME='artifacts';

type StoredFileMeta={
 kind:BrowserDocument['kind'];
 uncertain:boolean;
 sample:boolean;
 ocrConfidence?:number;
 unreadableFields:BrowserDocument['unreadableFields'];
};

export type StoredResultSession={
 version:1;
 text:string;
 claims:Claim[];
 verification:Verification;
 mode:'SNAPSHOT'|'LIVE';
 extractionMode:string;
 selected:string;
 file?:StoredFileMeta;
 blobKey?:string;
 savedAt:number;
};

export type RestoredResultSession=StoredResultSession&{
 browserFile:BrowserDocument|null;
};

function hasBrowser(){
 return typeof window!=='undefined'&&typeof indexedDB!=='undefined';
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

export async function clearOrphanedResultArtifacts(){
 if(!hasBrowser()||window.sessionStorage.getItem(SESSION_KEY))return;
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

export function clearResultSession(){
 if(typeof window==='undefined')return;
 const raw=window.sessionStorage.getItem(SESSION_KEY);
 window.sessionStorage.removeItem(SESSION_KEY);
 if(!raw)return;
 try{
  const stored=JSON.parse(raw) as StoredResultSession;
  if(stored.blobKey)void deleteBlob(stored.blobKey).catch(()=>{});
 }catch{}
}

export async function persistResultSession(
 data:Omit<StoredResultSession,'version'|'savedAt'|'blobKey'>,
 blob:Blob|null
){
 if(!hasBrowser())return;
 const previousRaw=window.sessionStorage.getItem(SESSION_KEY);
 let previousBlobKey='';
 try{previousBlobKey=(JSON.parse(previousRaw||'null') as StoredResultSession|null)?.blobKey||''}catch{}

 const blobKey=blob?`artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`:undefined;
 try{
  if(blob&&blobKey)await putBlob(blobKey,blob);
  const stored:StoredResultSession={...data,version:1,savedAt:Date.now(),blobKey};
  window.sessionStorage.setItem(SESSION_KEY,JSON.stringify(stored));
  if(previousBlobKey&&previousBlobKey!==blobKey)void deleteBlob(previousBlobKey).catch(()=>{});
 }catch{
  if(blobKey)void deleteBlob(blobKey).catch(()=>{});
 }
}

export async function restoreResultSession():Promise<RestoredResultSession|null>{
 if(!hasBrowser())return null;
 const raw=window.sessionStorage.getItem(SESSION_KEY);
 if(!raw)return null;

 try{
  const stored=JSON.parse(raw) as StoredResultSession;
  if(stored.version!==1||!stored.text||!stored.claims?.length||!stored.verification)return null;

  let browserFile:BrowserDocument|null=null;
  if(stored.file&&stored.blobKey){
   const blob=await getBlob(stored.blobKey);
   if(blob){
    browserFile={
     text:stored.text,
     tokens:[],
     preview:URL.createObjectURL(blob),
     kind:stored.file.kind,
     uncertain:stored.file.uncertain,
     sample:stored.file.sample,
     ocrConfidence:stored.file.ocrConfidence,
     unreadableFields:stored.file.unreadableFields||[]
    };
   }
  }

  return {...stored,browserFile};
 }catch{
  window.sessionStorage.removeItem(SESSION_KEY);
  return null;
 }
}
