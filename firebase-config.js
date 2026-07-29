/* ============================================================
   firebase-config.js — DentPilot Pro
   المسؤولية الوحيدة: تهيئة Firebase (Compat SDK عبر CDN) فقط.
   لا يوجد هنا أي منطق مصادقة أو مزامنة — ذلك في firebase-auth.js وfirebase-sync.js.

   - لا npm، لا Build tools، لا import/export — سكربتات Compat عادية فقط،
     بنفس أسلوب تحميل activation.js وscript.js الحاليين.
   - إن فشل تحميل مكتبات firebase من الشبكة (بلا إنترنت مثلاً)، أو لم تُحمَّل
     الملفات بالترتيب الصحيح، يفشل هذا الملف بهدوء دون أي استثناء غير مُلتقَط،
     ويُبقي window.DPFirebase.ready = false حتى تستمر بقية التطبيق بالعمل محلياً.
   ============================================================ */
(function () {
  'use strict';

  var firebaseConfig = {
    apiKey: "AIzaSyCqZbs4clewjbWfka0BlQhC1vL15F19ww8",
    authDomain: "dentpilot-pro-production.firebaseapp.com",
    projectId: "dentpilot-pro-production",
    storageBucket: "dentpilot-pro-production.firebasestorage.app",
    messagingSenderId: "131958809802",
    appId: "1:131958809802:web:7f14faba177d1210658033"
  };

  var state = { ready: false, app: null, auth: null, db: null, error: null };

  try {
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
      throw new Error('Firebase SDK غير مُحمَّل (تحقّق من الاتصال أو ترتيب سكربتات CDN)');
    }
    state.app = firebase.apps && firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(firebaseConfig);
    state.auth = firebase.auth();
    state.db = firebase.firestore();
    // لا نستخدم Firestore offline persistence عمداً — التخزين المحلي الأساسي هو LocalStorage بالفعل،
    // وFirestore هنا للمزامنة/النسخة السحابية فقط (تعليمات صريحة بعدم تفعيل enablePersistence).
    state.ready = true;
  } catch (err) {
    state.error = (err && err.message) ? err.message : String(err);
    state.ready = false;
    // لا نطبع الخطأ التقني للمستخدم؛ فقط في الـ Console للمطوّر عند الحاجة للتشخيص
    try { console.warn('[DentPilot][firebase-config] تعذّرت تهيئة Firebase — سيعمل التطبيق محلياً بدون مزامنة:', state.error); } catch (e) {}
  }

  window.DPFirebase = {
    get ready() { return state.ready; },
    get app() { return state.app; },
    get auth() { return state.auth; },
    get db() { return state.db; },
    get error() { return state.error; }
  };
})();
