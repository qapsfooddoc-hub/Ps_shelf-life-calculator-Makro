// Service Worker: เครื่องคำนวณอายุสินค้า ลูกค้า Makro
// ทำให้เปิดใช้งาน (และคำนวณ) ได้แม้ไม่มีอินเทอร์เน็ต หลังจากเปิดหน้านี้แบบออนไลน์สำเร็จอย่างน้อย 1 ครั้ง
const CACHE_NAME = 'shelf-life-makro-v1';
const APP_SHELL = [
  './index_PS_PP.html',
  './manifest-makro.webmanifest',
  './icon-makro-192.png',
  './icon-makro-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// กลยุทธ์: stale-while-revalidate สำหรับไฟล์ในเว็บนี้เอง (same-origin)
// และสำหรับฟอนต์ Google Fonts (fonts.googleapis.com / fonts.gstatic.com)
// เพื่อให้ครั้งแรกที่เปิดออนไลน์ ระบบจะแคชฟอนต์และหน้าเว็บไว้ ครั้งต่อไปแม้ไม่มีเน็ตก็ยังใช้ได้
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin && !isFont) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
