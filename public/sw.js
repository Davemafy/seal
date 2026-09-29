const CACHE_NAME='seal-shell-v2';
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

 // Application code must be network-first. A cache-first JS/CSS strategy can
 // pair an old Next.js chunk with a new deployment and crash the entire view.
 if(request.destination==='script'||request.destination==='style'){
  event.respondWith(
   fetch(request).then(response=>{
    if(response.ok&&response.type==='basic'){
     const copy=response.clone();
     void caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
    }
    return response;
   }).catch(async()=>{
    const cached=await caches.match(request);
    return cached||Response.error();
   })
  );
  return;
 }

 // Fonts/images may use stale-while-revalidate without affecting app integrity.
 event.respondWith(
  caches.match(request).then(cached=>{
   const fresh=fetch(request).then(response=>{
    if(response.ok&&response.type==='basic'){
     const copy=response.clone();
     void caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
    }
    return response;
   }).catch(()=>cached||Response.error());

   return cached||fresh;
  })
 );
});
