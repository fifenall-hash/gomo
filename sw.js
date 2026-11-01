// sw.js - Zero-Delay Network-First Service Worker
self.addEventListener('install', (event) => {
  // 새 서비스 워커 발견 즉시 대기 상태를 건너뛰고 활성화
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 기존에 남아있을 수 있는 모든 브라우저 캐시 스토리지 완전 삭제 후 즉시 제어권 획득
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin && url.pathname.endsWith('/icon.png') && url.searchParams.has('size')) {
    const sz = parseInt(url.searchParams.get('size'), 10) || 192;
    event.respondWith((async () => {
      try {
        const res = await fetch('./icon.png', { cache: 'no-store' });
        const blob = await res.blob();
        if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
          const bmp = await createImageBitmap(blob);
          const canvas = new OffscreenCanvas(sz, sz);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bmp, 0, 0, sz, sz);
          const outBlob = await canvas.convertToBlob({ type: 'image/png' });
          return new Response(outBlob, {
            headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }
          });
        }
        return res;
      } catch (e) {
        return fetch(req);
      }
    })());
    return;
  }

  // GitHub Pages의 자체 파일(index.html, manifest.json 등)은 캐시를 완전히 무시하고 최신 서버 응답 직결
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => fetch(req))
    );
  }
});
