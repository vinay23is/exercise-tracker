const CACHE_NAME='exercise-tracker-v1';
const APP_SHELL=[
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/offline.html'
];

const MODEL_HOSTS=[
  'tfhub.dev',
  'www.kaggle.com',
  'storage.googleapis.com'
];
const STATIC_HOSTS=[
  'cdn.jsdelivr.net'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const isModel=MODEL_HOSTS.includes(url.hostname)&&(
    url.href.includes('movenet')||
    url.href.includes('tfjs-model')||
    url.pathname.includes('/tfhub-modules/')
  );
  const isStatic=STATIC_HOSTS.includes(url.hostname);

  if(isModel||isStatic||APP_SHELL.includes(url.pathname)||url.origin===self.location.origin){
    event.respondWith(cacheFirst(req,isModel||isStatic));
    return;
  }

  event.respondWith(fetch(req).catch(()=>caches.match('/offline.html')));
});

async function cacheFirst(req,allowOpaque){
  const cached=await caches.match(req);
  if(cached)return cached;
  try{
    const res=await fetch(req);
    if(res.ok||(allowOpaque&&res.type==='opaque')){
      const cache=await caches.open(CACHE_NAME);
      cache.put(req,res.clone());
    }
    return res;
  }catch(e){
    if(req.mode==='navigate')return caches.match('/offline.html');
    const fallback=await caches.match(req);
    if(fallback)return fallback;
    throw e;
  }
}

self.addEventListener('message',event=>{
  if(!event.data||event.data.type!=='schedule-reminder')return;
  scheduleReminder(event.data.hour||9,event.data.minute||0);
});

function scheduleReminder(hour,minute){
  const now=new Date();
  const next=new Date();
  next.setHours(hour,minute,0,0);
  if(next<=now)next.setDate(next.getDate()+1);
  const delay=next-now;
  setTimeout(async()=>{
    await self.registration.showNotification('Time for your exercises!',{
      body:'Tap to start.',
      icon:'/icon.svg',
      badge:'/icon.svg',
      tag:'daily-exercise-reminder',
      renotify:true
    });
    scheduleReminder(hour,minute);
  },delay);
}

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
