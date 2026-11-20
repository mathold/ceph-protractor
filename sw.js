/* service worker — Ceph Protractor
 *
 * network-first: ออนไลน์ = ได้ไฟล์ล่าสุดเสมอ · ออฟไลน์ = ใช้ของที่แคชไว้
 *
 * ทำไมต้องมี: GitHub Pages ตั้ง cache-control: max-age=600 ไว้
 * เปลี่ยนหน้าเว็บแล้วเครื่องที่เคยเปิดจะยังเห็นของเก่าได้ถึง 10 นาที
 * ตัวนี้ทำให้เห็นของใหม่ทันทีที่รีเฟรช โดยยังใช้งานตอนไม่มีเน็ตได้
 */
const VERSION = '1';
const CACHE = 'ceph-v' + VERSION;
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.search) return;                       // ไม่แตะ URL ที่มี query string
  // cache:'no-cache' = ถามเซิร์ฟเวอร์ทุกครั้งว่าไฟล์เปลี่ยนไหม (ได้ 304 ถ้าเหมือนเดิม จึงยังเร็ว)
  // ถ้าไม่ใส่ fetch() จะหยิบจากแคช HTTP ของเบราว์เซอร์ได้ — GitHub Pages ตั้ง max-age=600
  // ทำให้ยังเห็นของเก่าได้ถึง 10 นาทีทั้งที่ตั้งใจให้เป็น network-first
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        if (res && res.ok) {                    // เก็บเฉพาะที่โหลดสำเร็จจริง
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
