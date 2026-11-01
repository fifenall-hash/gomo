// sw.js - Zero-Delay Network-First Service Worker + Dynamic PNG Icon Resizer
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // icon.png(289x289)를 크롬 WebAPK 설치 규격인 정밀한 192x192 / 512x512 PNG로 실시간 리샘플링
  if (url.origin === self.location.origin && url.pathname.endsWith('/icon.png') && url.searchParams.has('size')) {
    const sz = parseInt(url.searchParams.get('size'), 10) || 192;
    event.respondWith((async () => {
      try {
        const cleanIconUrl = new URL('./icon.png', self.location.href).href;
        const res = await fetch(cleanIconUrl, { cache: 'no-cache' });
        const blob = await res.blob();
        if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
          const bmp = await createImageBitmap(blob);
          const canvas = new OffscreenCanvas(sz, sz);
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, sz, sz);
          ctx.drawImage(bmp, 0, 0, sz, sz);
          const outBlob = await canvas.convertToBlob({ type: 'image/png' });
          return new Response(outBlob, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'no-cache'
            }
          });
        }
        return res;
      } catch (e) {
        return fetch(req);
      }
    })());
    return;
  }

  // 자체 파일(index.html, manifest.json 등)은 항상 최신 서버 응답 직결
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => fetch(req))
    );
  }
});
