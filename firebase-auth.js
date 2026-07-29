/* ============================================================
   firebase-auth.js — DentPilot Pro
   المسؤولية الوحيدة: إنشاء الحساب، الدخول، الخروج، استعادة كلمة المرور،
   ومراقبة حالة المستخدم. لا يوجد هنا أي كود مزامنة أو واجهة.

   يعتمد على window.DPFirebase (من firebase-config.js). إن لم يكن جاهزاً
   (بلا إنترنت أو فشل تحميل CDN)، كل دالة هنا تُعيد رسالة عربية واضحة
   بدل رمي استثناء، دون التأثير على بقية التطبيق.
   ============================================================ */
(function () {
  'use strict';

  function fb() { return window.DPFirebase; }
  function authOrNull() { var f = fb(); return (f && f.ready && f.auth) ? f.auth : null; }

  // ---- ترجمة أكواد Firebase التقنية إلى رسائل عربية مفهومة (لا تُعرض أكواد Firebase الخام أبداً) ----
  function arabicAuthError(err) {
    var code = (err && err.code) || '';
    var map = {
      'auth/email-already-in-use': 'البريد الإلكتروني مستخدم مسبقاً.',
      'auth/weak-password': 'كلمة المرور قصيرة، استخدم 6 أحرف على الأقل.',
      'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
      'auth/missing-email': 'يرجى إدخال البريد الإلكتروني.',
      'auth/user-not-found': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      'auth/wrong-password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      'auth/invalid-login-credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      'auth/user-disabled': 'هذا الحساب معطّل حالياً، يرجى التواصل مع الدعم.',
      'auth/too-many-requests': 'محاولات كثيرة متتالية، يرجى المحاولة لاحقاً.',
      'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت.',
      'auth/internal-error': 'تعذّر إكمال العملية، حاول مجدداً.'
    };
    return map[code] || 'تعذّر إكمال العملية، حاول مجدداً.';
  }

  function ensurePersistence(auth) {
    // Firebase Auth (compat) يستخدم LOCAL افتراضياً على الويب، لكن نضبطها صراحة كما طُلب
    try { return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }
    catch (e) { return Promise.resolve(); }
  }

  function signUp(email, password) {
    var auth = authOrNull();
    if (!auth) return Promise.resolve({ ok: false, message: 'لا يمكن إنشاء الحساب الآن — تحقّق من اتصال الإنترنت.' });
    email = String(email || '').trim();
    return ensurePersistence(auth)
      .then(function () { return auth.createUserWithEmailAndPassword(email, password); })
      .then(function (cred) { return { ok: true, user: cred.user }; })
      .catch(function (err) { return { ok: false, message: arabicAuthError(err) }; });
  }

  function signIn(email, password) {
    var auth = authOrNull();
    if (!auth) return Promise.resolve({ ok: false, message: 'لا يمكن تسجيل الدخول الآن — تحقّق من اتصال الإنترنت.' });
    email = String(email || '').trim();
    return ensurePersistence(auth)
      .then(function () { return auth.signInWithEmailAndPassword(email, password); })
      .then(function (cred) { return { ok: true, user: cred.user }; })
      .catch(function (err) { return { ok: false, message: arabicAuthError(err) }; });
  }

  function signOutUser() {
    var auth = authOrNull();
    if (!auth) return Promise.resolve({ ok: true }); // لا يوجد اتصال أصلاً، اعتبرها خرجت محلياً
    return auth.signOut()
      .then(function () { return { ok: true }; })
      .catch(function (err) { return { ok: false, message: arabicAuthError(err) }; });
  }

  function resetPassword(email) {
    var auth = authOrNull();
    if (!auth) return Promise.resolve({ ok: false, message: 'لا يوجد اتصال بالإنترنت.' });
    email = String(email || '').trim();
    if (!email) return Promise.resolve({ ok: false, message: 'يرجى إدخال البريد الإلكتروني.' });
    return auth.sendPasswordResetEmail(email)
      .then(function () { return { ok: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور.' }; })
      .catch(function (err) { return { ok: false, message: arabicAuthError(err) }; });
  }

  // مراقبة حالة المستخدم — تُستدعى دالة الاستماع فوراً بالحالة الحالية إن كان Firebase جاهزاً،
  // وتُعيد دالة إلغاء الاشتراك. إن لم يكن Firebase جاهزاً تستدعي cb(null) مرة واحدة فقط.
  function onChange(cb) {
    var auth = authOrNull();
    if (!auth) { try { cb(null); } catch (e) {} return function () {}; }
    return auth.onAuthStateChanged(function (user) { try { cb(user || null); } catch (e) {} });
  }

  function currentUser() {
    var auth = authOrNull();
    return auth ? auth.currentUser : null;
  }

  window.DPAuth = {
    get ready() { var f = fb(); return !!(f && f.ready); },
    currentUser: currentUser,
    onChange: onChange,
    signUp: signUp,
    signIn: signIn,
    signOutUser: signOutUser,
    resetPassword: resetPassword
  };
})();
