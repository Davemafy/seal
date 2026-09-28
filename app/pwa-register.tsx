'use client';

import {useEffect} from 'react';

export default function PwaRegister(){
 useEffect(()=>{
  if(process.env.NODE_ENV!=='production'||!('serviceWorker' in navigator))return;

  let cancelled=false;
  const register=()=>{
   void navigator.serviceWorker.register('/sw.js',{
    scope:'/',
    updateViaCache:'none'
   }).then(registration=>{
    if(!cancelled)void registration.update();
   }).catch(()=>{});
  };

  if(document.readyState==='complete')register();
  else window.addEventListener('load',register,{once:true});

  return()=>{
   cancelled=true;
   window.removeEventListener('load',register);
  };
 },[]);

 return null;
}
