/* ============================================================
   DentPilot Pro — Service Worker (تحديث آمن مُتحكَّم به)
   ============================================================ */
const CACHE = 'dentpilot-v2.6.3';
const ASSETS = [
  './', 'index.html', 'style.css', 'script.js', 'activation.js', 'manifest.json', 'version.json',
  'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png', 'favicon.ico', 'favicon-32.png',
  'dental-chair-navy.png',
  // ملفات الحساب/المزامنة المحلية فقط (لا تُضاف روابط CDN الخارجية لـ Firebase هنا نهائياً،
  // حتى لا يفشل التثبيت بالكامل إن تعذّر الوصول لأي منها — راجع fetch handler أدناه للتعامل معها كطلبات عادية)
  'firebase-config.js', 'firebase-auth.js', 'firebase-sync.js', 'account-ui.js'
];

// التثبيت: تخزين مسبق فقط — بلا skipWaiting تلقائي (ينتظر موافقة المستخدم)
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

// التفعيل: حذف كاش Pro القديم فقط (لا يمسّ أي كاش آخر) + السيطرة الفورية
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k !== CACHE && k.indexOf('dentpilot-v') === 0)   // كاش Pro فقط (dentpilot-vX)، ليس dentpilot-student
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// رسالة من الصفحة لتفعيل التحديث المنتظر
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // version.json: الشبكة أولاً لكشف التحديثات، مع رجوع للكاش دون اتصال
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (url.origin === self.location.origin) { const copy = res.clone(); caches.open(CACHE).then((cache) => cache.put(req, copy)); }
        return res;
      }).catch(() => { if (req.mode === 'navigate') return caches.match('index.html'); });
    })
  );
});
