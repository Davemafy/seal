const CACHE_NAME='seal-shell-v1';
const CORE_ASSETS=[
 '/offline.html',
 '/brand/seal-app-icon-dark.svg',
 '/brand/seal-app-icon-maskable.svg',
 '/brand/seal-mark-black.svg'
];

self.addEventListener('install',event=>{
 event.waitUntil(
  caches.open(CACHE_NAME)
   .then(cache=>cache.addAll(CORE_ASSETS))
   .then(()=>self.skipWaiting())
 );
});

self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key.startsWith('seal-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});

self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;

 const url=new URL(request.url);
 if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;

 if(request.mode==='navigate'){
  event.respondWith(
   fetch(request).catch(()=>caches.match('/offline.html'))
  );
  return;
 }

 const cacheableDestinations=new Set(['style','script','font','image']);
 if(!cacheableDestinations.has(request.destination))return;

 event.respondWith(
  caches.match(request).then(cached=>{
   const fresh=fetch(request).then(response=>{
    if(response.ok&&response.type==='basic'){
     const copy=response.clone();
     void caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
    }
    return response;
   }).catch(()=>{
    if(cached)return cached;
    return Response.error();
   });

   return cached||fresh;
  })
 );
});
