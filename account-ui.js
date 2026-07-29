/* ============================================================
   account-ui.js — DentPilot Pro
   المسؤولية الوحيدة: واجهة صفحة الحساب — ربط الأزرار والنوافذ بحسابي
   DPAuth (مصادقة) وDPSync (مزامنة). لا يوجد هنا أي منطق Firebase مباشر.

   يُستدعى render() من script.js عبر window.DPAccountUI.render عند فتح
   صفحة الحساب (Router)، ويُعيد الرسم تلقائياً عند أي تغيّر حالة حقيقي
   (تسجيل دخول/خروج، تغيّر حالة المزامنة، حاجة للتصالح بين جهازين).
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function fmtDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso); if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtMs(ms) { if (!ms) return '—'; return fmtDateTime(new Date(ms).toISOString()); }
  var toastTimer = null;
  function toast(msg) {
    var el = $('toast'); if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  var uiState = { tab: 'login', busy: false, linkCase: null, forgotOpen: false };

  function body() { return $('accountBody'); }

  // ============================================================
  // اللوحات الفرعية (HTML)
  // ============================================================
  function offlineNoticeHtml() {
    var f = window.DPFirebase;
    if (f && f.ready) return '';
    return '<div class="sup2-status expired"><div class="sup2-status-txt"><h3>غير متصل</h3><p>لا يمكن الوصول إلى الحساب السحابي الآن. وظائف التطبيق المحلية تعمل كالمعتاد.</p></div></div>';
  }

  function authTabsHtml() {
    var t = uiState.tab;
    return (
      '<div class="acc-card">' +
      '<div class="acc-tabs">' +
        '<button type="button" class="acc-tab' + (t === 'login' ? ' active' : '') + '" data-act="acc-tab" data-tab="login">تسجيل الدخول</button>' +
        '<button type="button" class="acc-tab' + (t === 'signup' ? ' active' : '') + '" data-act="acc-tab" data-tab="signup">إنشاء حساب</button>' +
      '</div>' +
      (t === 'login' ? loginFormHtml() : signupFormHtml()) +
      '</div>'
    );
  }

  function loginFormHtml() {
    return (
      '<form id="accLoginForm" class="form acc-form" novalidate>' +
        '<div class="field"><label for="accLoginEmail">البريد الإلكتروني</label><input type="email" id="accLoginEmail" autocomplete="email" required /></div>' +
        '<div class="field"><label for="accLoginPass">كلمة المرور</label><input type="password" id="accLoginPass" autocomplete="current-password" required /></div>' +
        '<p id="accLoginMsg" class="acc-msg" hidden></p>' +
        '<div class="form-actions"><button type="submit" class="btn btn-primary" style="width:100%">تسجيل الدخول</button></div>' +
        '<button type="button" class="acc-link" data-act="acc-forgot">نسيت كلمة المرور؟</button>' +
      '</form>'
    );
  }

  function signupFormHtml() {
    return (
      '<form id="accSignupForm" class="form acc-form" novalidate>' +
        '<div class="field"><label for="accSignupEmail">البريد الإلكتروني</label><input type="email" id="accSignupEmail" autocomplete="email" required /></div>' +
        '<div class="field"><label for="accSignupPass">كلمة المرور</label><input type="password" id="accSignupPass" autocomplete="new-password" required /></div>' +
        '<div class="field"><label for="accSignupPass2">تأكيد كلمة المرور</label><input type="password" id="accSignupPass2" autocomplete="new-password" required /></div>' +
        '<p id="accSignupMsg" class="acc-msg" hidden></p>' +
        '<div class="form-actions"><button type="submit" class="btn btn-primary" style="width:100%">إنشاء الحساب</button></div>' +
      '</form>'
    );
  }

  function forgotHtml() {
    if (!uiState.forgotOpen) return '';
    return (
      '<div class="acc-forgot-box">' +
        '<div class="field"><label for="accForgotEmail">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</label><input type="email" id="accForgotEmail" autocomplete="email" /></div>' +
        '<p id="accForgotMsg" class="acc-msg" hidden></p>' +
        '<div class="sup2-selected-actions">' +
          '<button type="button" class="btn btn-primary" data-act="acc-send-reset">إرسال رابط إعادة التعيين</button>' +
          '<button type="button" class="btn btn-ghost" data-act="acc-forgot-cancel">إلغاء</button>' +
        '</div>' +
      '</div>'
    );
  }

  function differentAccountWarningHtml(email) {
    return (
      '<div class="sup2-status expired">' +
        '<div class="sup2-status-txt"><h3>هذا الجهاز مرتبط بحساب آخر</h3>' +
        '<p>البيانات المحلية على هذا الجهاز كانت مرتبطة بحساب مختلف عن «' + esc(email) + '». لن تتم أي مزامنة تلقائية حتى تؤكد المتابعة صراحة، لمنع تسريب بيانات عيادة إلى حساب آخر.</p></div>' +
      '</div>' +
      '<div class="sup2-selected-actions" style="margin-top:12px">' +
        '<button type="button" class="btn btn-primary" data-act="acc-confirm-different">فهمت، متابعة الربط بهذا الحساب</button>' +
        '<button type="button" class="btn btn-ghost" data-act="acc-signout">تسجيل الخروج بدل ذلك</button>' +
      '</div>'
    );
  }

  function linkCaseHtml(res) {
    if (!res || !res.ok) {
      return '<div class="sup2-status expired"><div class="sup2-status-txt"><h3>تعذّر التحقق</h3><p>' + esc(res && res.message || 'حاول مجدداً.') + '</p></div></div>' +
        '<div class="sup2-selected-actions" style="margin-top:12px"><button type="button" class="btn btn-ghost" data-act="acc-recheck-link">إعادة المحاولة</button></div>';
    }
    var head = '';
    if (res.case === 1) {
      head = '<div class="sup2-status trial"><div class="sup2-status-txt"><h3>لديك بيانات على هذا الجهاز</h3><p>يوجد ' + res.localCount + ' مريض محفوظون هنا، والحساب السحابي فارغ حالياً. هل تريد رفعها إلى حسابك؟</p></div></div>' +
        '<div class="sup2-selected-actions" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="acc-upload-device">رفع بيانات هذا الجهاز</button></div>';
    } else if (res.case === 2) {
      head = '<div class="sup2-status trial"><div class="sup2-status-txt"><h3>توجد نسخة سحابية مرتبطة بهذا الحساب</h3><p>يوجد ' + res.cloudCount + ' مريض محفوظون في حسابك، وهذا الجهاز فارغ حالياً.</p></div></div>' +
        '<div class="sup2-selected-actions" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="acc-restore-cloud">استعادة بيانات العيادة</button></div>';
    } else if (res.case === 3) {
      head = '<div class="sup2-status expired"><div class="sup2-status-txt"><h3>يوجد بيانات في الجهاز وفي الحساب معاً</h3>' +
        '<p>هذا الجهاز: <b>' + res.localCount + '</b> مريض (أحدث إضافة: ' + esc(fmtMs(res.localLastAddedMs)) + ').<br/>' +
        'الحساب السحابي: <b>' + res.cloudCount + '</b> مريض (آخر تعديل مسجَّل: ' + esc(fmtMs(res.cloudLastMs)) + ').</p>' +
        '<p style="margin-top:8px">لن يتم دمج أو استبدال أي نسخة تلقائياً — اختر بنفسك:</p></div></div>' +
        '<div class="sup2-selected-actions" style="margin-top:12px">' +
          '<button type="button" class="btn btn-primary" data-act="acc-upload-device">استخدام بيانات هذا الجهاز ورفعها</button>' +
          '<button type="button" class="btn btn-ghost" data-act="acc-restore-cloud">استعادة النسخة السحابية</button>' +
        '</div>';
    } else {
      head = '<div class="sup2-status ok"><div class="sup2-status-txt"><h3>الحساب جاهز</h3><p>لا توجد بيانات محلية أو سحابية بعد. ستُحفظ أي بيانات جديدة وتُزامَن تلقائياً من الآن.</p></div></div>';
      // حالة 4: لا حاجة لاختيار — نُفعّل الربط مباشرة
      window.DPSync && window.DPSync.getSyncState && setTimeout(function () {
        try {
          var st = window.DPSync.getSyncState();
          localStorage.setItem('dentpilot_pro_sync_state_v1', JSON.stringify(Object.assign({}, st, { uid: (window.DPAuth.currentUser() || {}).uid || st.uid, lastSyncAt: new Date().toISOString() })));
        } catch (e) {}
        render();
      }, 30);
    }
    return head;
  }

  function statusPanelHtml() {
    var user = window.DPAuth.currentUser();
    var status = window.DPSync.getStatus();
    var localSummary = window.DPSync.getLocalSummary();
    var pending = status.pendingImportSync;
    var conflictNote = status.conflictCount > 0
      ? '<div class="sup2-selected-note" style="margin-top:10px">تعارض غير محسوم في ' + status.conflictCount + ' مريض بين هذا الجهاز وجهاز آخر. راجع الجهازين يدوياً قبل الاعتماد على أحدهما.</div>'
      : '';
    return (
      '<div class="acc-panel">' +
        '<div class="acc-panel-row"><span>البريد الإلكتروني</span><b>' + esc(user ? user.email : '—') + '</b></div>' +
        '<div class="acc-panel-row"><span>حالة الاتصال</span><b>' + (status.online ? 'متصل' : 'غير متصل') + '</b></div>' +
        '<div class="acc-panel-row"><span>حالة المزامنة</span><b>' + (status.linked ? 'مفعّلة' : 'غير مفعّلة') + '</b></div>' +
        '<div class="acc-panel-row"><span>آخر مزامنة</span><b>' + esc(fmtDateTime(status.lastSyncAt)) + '</b></div>' +
        '<div class="acc-panel-row"><span>عدد المرضى المحليين</span><b>' + localSummary.count + '</b></div>' +
      '</div>' +
      conflictNote +
      (pending ? '<div class="sup2-selected-actions" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="acc-sync-import">مزامنة البيانات المستوردة</button></div>' : '') +
      '<div class="sup2-selected-actions" style="margin-top:12px">' +
        '<button type="button" class="btn btn-ghost sup2-cta-sec" data-act="acc-sync-now">مزامنة الآن</button>' +
        '<button type="button" class="btn btn-ghost sup2-cta-sec" data-act="acc-signout">تسجيل الخروج</button>' +
      '</div>' +
      '<p class="acc-scope-note">المزامنة الحالية تشمل بيانات المرضى والجلسات والإعدادات، ولا تشمل الصور والمرفقات.</p>' +
      '<p class="acc-privacy-note">عند تفعيل المزامنة، تُحفظ بيانات المرضى والجلسات في حساب العيادة السحابي لتسهيل استعادتها على الأجهزة الأخرى.</p>'
    );
  }

  // ============================================================
  // الرسم الرئيسي
  // ============================================================
  function render() {
    var b = body(); if (!b) return;
    var f = window.DPFirebase, auth = window.DPAuth, sync = window.DPSync;
    var header = '<div class="sup2-head acc-head"><span class="sup2-head-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M4.5 19.2a7.5 7.5 0 0 1 15 0"/></svg></span>' +
      '<div class="sup2-head-txt"><h2>حساب DentPilot</h2><p>احفظ بيانات عيادتك واستعدها عند تغيير الهاتف أو المتصفح.</p></div></div>';

    var user = (auth && auth.ready) ? auth.currentUser() : null;

    if (!user) {
      b.innerHTML = header + offlineNoticeHtml() + authTabsHtml() + forgotHtml();
      return;
    }

    if (sync && sync.isDifferentAccount()) {
      b.innerHTML = header + differentAccountWarningHtml(user.email);
      return;
    }

    if (sync && sync.needsReconciliation()) {
      b.innerHTML = header + '<div class="sup2-status trial"><div class="sup2-status-txt"><h3>جارٍ التحقق من بياناتك…</h3><p>يرجى الانتظار قليلاً.</p></div></div>';
      sync.evaluateLinkCase().then(function (res) {
        uiState.linkCase = res;
        if (currentlyOnAccount()) b.innerHTML = header + linkCaseHtml(res);
      });
      return;
    }

    b.innerHTML = header + statusPanelHtml();
  }

  function currentlyOnAccount() { return document.body.dataset.route === 'account'; }

  // ============================================================
  // الأحداث المفوَّضة (Delegation على #accountBody — تُربط مرة واحدة فقط)
  // ============================================================
  var bound = false;
  function bindOnce() {
    if (bound) return; bound = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-act]'); if (!btn || !body() || !body().contains(btn)) return;
      var act = btn.dataset.act;
      if (act === 'acc-tab') { uiState.tab = btn.dataset.tab; render(); }
      else if (act === 'acc-forgot') { uiState.forgotOpen = true; render(); var f = $('accForgotEmail'); if (f) setTimeout(function () { f.focus(); }, 40); }
      else if (act === 'acc-forgot-cancel') { uiState.forgotOpen = false; render(); }
      else if (act === 'acc-send-reset') {
        var email = ($('accForgotEmail') || {}).value;
        setBusy(btn, true);
        window.DPAuth.resetPassword(email).then(function (res) {
          setBusy(btn, false);
          var m = $('accForgotMsg'); if (m) { m.hidden = false; m.textContent = res.ok ? res.message : res.message; m.className = 'acc-msg ' + (res.ok ? 'ok' : 'err'); }
        });
      }
      else if (act === 'acc-confirm-different') { window.DPSync.confirmDifferentAccountProceed(); render(); }
      else if (act === 'acc-signout') {
        window.DPAuth.signOutUser().then(function () { toast('تم تسجيل الخروج'); render(); });
      }
      else if (act === 'acc-recheck-link') { render(); }
      else if (act === 'acc-upload-device') {
        setBusy(btn, true);
        window.DPSync.uploadDeviceData().then(function (res) {
          setBusy(btn, false);
          toast(res.ok ? 'تم رفع بيانات هذا الجهاز' : (res.message || 'تعذّرت العملية'));
          render();
        });
      }
      else if (act === 'acc-restore-cloud') {
        setBusy(btn, true);
        window.DPSync.restoreFromCloud().then(function (res) {
          setBusy(btn, false);
          toast(res.ok ? 'تمت استعادة بيانات العيادة' : (res.message || 'تعذّرت العملية'));
          render();
        });
      }
      else if (act === 'acc-sync-now') {
        setBusy(btn, true);
        window.DPSync.runSyncNow('manual').then(function (res) {
          setBusy(btn, false);
          toast(res && res.ok ? 'تمت المزامنة' : 'تعذّرت المزامنة الآن');
          render();
        });
      }
      else if (act === 'acc-sync-import') {
        setBusy(btn, true);
        window.DPSync.syncImportedBackup().then(function (res) {
          setBusy(btn, false);
          toast(res && res.ok ? 'تمت مزامنة البيانات المستوردة' : 'تعذّرت المزامنة');
          render();
        });
      }
    });

    document.addEventListener('submit', function (e) {
      if (e.target && e.target.id === 'accLoginForm') {
        e.preventDefault();
        var email = $('accLoginEmail').value, pass = $('accLoginPass').value;
        var msg = $('accLoginMsg');
        window.DPAuth.signIn(email, pass).then(function (res) {
          if (!res.ok) { showMsg(msg, res.message, false); }
          else { render(); }
        });
      } else if (e.target && e.target.id === 'accSignupForm') {
        e.preventDefault();
        var email2 = $('accSignupEmail').value, p1 = $('accSignupPass').value, p2 = $('accSignupPass2').value;
        var msg2 = $('accSignupMsg');
        if (p1 !== p2) { showMsg(msg2, 'كلمتا المرور غير متطابقتين.', false); return; }
        window.DPAuth.signUp(email2, p1).then(function (res) {
          if (!res.ok) { showMsg(msg2, res.message, false); }
          else { render(); }
        });
      }
    });

    document.addEventListener('dp:sync-state-changed', function () { if (currentlyOnAccount()) render(); });
    document.addEventListener('dp:sync-needs-reconciliation', function () { if (currentlyOnAccount()) render(); });
    if (window.DPAuth && window.DPAuth.onChange) window.DPAuth.onChange(function () { if (currentlyOnAccount()) render(); });
  }

  function showMsg(el, text, ok) { if (!el) return; el.hidden = false; el.textContent = text; el.className = 'acc-msg ' + (ok ? 'ok' : 'err'); }
  function setBusy(btn, busy) { if (!btn) return; btn.disabled = !!busy; btn.classList.toggle('is-busy', !!busy); }

  bindOnce();
  window.DPAccountUI = { render: render };
})();
