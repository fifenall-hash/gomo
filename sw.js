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

  // GitHub Pages의 자체 파일(index.html, manifest.json 등)은 캐시를 완전히 무시하고 최신 서버 응답 직결
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => fetch(req))
    );
  }
});