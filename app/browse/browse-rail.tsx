'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import BrowseLanguage from './browse-language';

type WorkspaceRunStatus='idle'|'reading'|'verifying'|'done'|'error';
type WorkspaceMeta={id:string;title:string;status:WorkspaceRunStatus;language?:string;jurisdiction?:string;preview?:string};
const WORKSPACE_LIST_KEY='seal:workspace-list:v1';

const clean=(value:string)=>String(value||'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim();

function BrowseIcon(){
 return <svg className="seal-ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
  <rect x="4.5" y="4.5" width="5.5" height="5.5" rx="1.2"/><rect x="14" y="4.5" width="5.5" height="5.5" rx="1.2"/><rect x="4.5" y="14" width="5.5" height="5.5" rx="1.2"/><rect x="14" y="14" width="5.5" height="5.5" rx="1.2"/>
 </svg>;
}
function PlusIcon(){
 return <svg className="seal-ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}
function TrashIcon(){
 return <svg className="seal-ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 7.25h13M9 7.25V5.5h6v1.75M7.5 7.25l.65 11h7.7l.65-11M10 10.5v4.75M14 10.5v4.75"/></svg>;
}

export default function BrowseRail(){
 const router=useRouter();
 const [workspaces,setWorkspaces]=useState<WorkspaceMeta[]>([]);
 const [activeId,setActiveId]=useState('');

 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   try{
    const parsed=JSON.parse(window.sessionStorage.getItem(WORKSPACE_LIST_KEY)||'null') as {active?:string;items?:WorkspaceMeta[]}|null;
    if(parsed?.items?.length){
     setWorkspaces(parsed.items);
     setActiveId(parsed.active||parsed.items[0].id);
    }else{
     setWorkspaces([{id:'primary',title:'New check',status:'idle'}]);
     setActiveId('primary');
    }
   }catch{
    setWorkspaces([{id:'primary',title:'New check',status:'idle'}]);
    setActiveId('primary');
   }
  },0);
  return()=>window.clearTimeout(timer);
 },[]);

 const save=(items:WorkspaceMeta[],active:string)=>{
  setWorkspaces(items);
  setActiveId(active);
  try{window.sessionStorage.setItem(WORKSPACE_LIST_KEY,JSON.stringify({active,items}))}catch{}
 };

 const openCheck=(id:string)=>{
  save(workspaces,id);
  router.push('/');
 };

 const newCheck=()=>{
  const id=`check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const next=[...workspaces,{id,title:'New check',status:'idle' as WorkspaceRunStatus}].slice(-8);
  save(next,id);
  router.push('/');
 };

 const deleteCheck=(id:string)=>{
  const index=workspaces.findIndex(item=>item.id===id);
  if(index<0)return;
  let next=workspaces.filter(item=>item.id!==id);
  let active=activeId;
  if(!next.length){
   const id2=`check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
   next=[{id:id2,title:'New check',status:'idle'}];
   active=id2;
  }else if(active===id){
   active=next[Math.min(index,next.length-1)].id;
  }
  save(next,active);
 };

 const rows=useMemo(()=>workspaces.map((item,index)=>{
  const raw=clean(item.title);
  const blank=!raw||/^new check(?: \d+)?$/i.test(raw);
  const title=blank?(workspaces.length===1?'New check':`Check ${index+1}`):(raw.length>=3?raw:`Check ${index+1}`);
  const preview=clean(item.preview||'');
  const status=item.status==='verifying'?'Checking sources':item.status==='reading'?'Reading':item.status==='done'?'Checked':item.status==='error'?'Needs attention':'';
  const secondary=item.status==='reading'||item.status==='verifying'||item.status==='error'
   ?[item.jurisdiction||item.language,status].filter(Boolean).join(' · ')
   :(preview.length>=8?preview:[item.jurisdiction||item.language,item.status==='done'?'Checked':''].filter(Boolean).join(' · '));
  return {...item,title,secondary,index};
 }),[workspaces]);

 return <aside className="workspace-rail browse-workspace-rail" aria-label="Workspace">
  <div className="rail-topbar">
   <Link href="/" className="rail-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span className="rail-brand-word">SEAL</span><span className="rail-brand-reg">®</span></Link>
   <button className="icon-control rail-icon-control rail-new-check" type="button" aria-label="New check" title="New check" onClick={newCheck}><PlusIcon/></button>
  </div>
  <nav className="rail-primary-nav" aria-label="Primary">
   <Link className="rail-nav-item is-current" href="/browse"><BrowseIcon/><span>Browse</span></Link>
  </nav>
  <div className="rail-section-head"><span>Checks</span><small>{workspaces.length}</small></div>
  <div className="rail-check-list" aria-label="Open checks">
   {rows.map(item=><div className="rail-check-row" key={item.id}>
    <button type="button" className="rail-check" onClick={()=>openCheck(item.id)}>
     <span className={`rail-check-state is-${item.status}`} aria-hidden="true"/>
     <span className="rail-check-copy"><strong>{item.title}</strong>{item.secondary&&<small>{item.secondary}</small>}</span>
    </button>
    <button className="rail-check-delete icon-control" type="button" aria-label={`Delete ${item.title}`} title={`Delete ${item.title}`} onClick={()=>deleteCheck(item.id)}><TrashIcon/></button>
   </div>)}
  </div>
  <div className="rail-spacer"/>
  <div className="rail-bottom"><BrowseLanguage/></div>
 </aside>;
}
