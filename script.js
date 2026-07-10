/* ============================================================
   DentPilot v2.0 — Release Candidate
   نظام إدارة عيادة أسنان: مرضى • جلسات • دفعات • خط زمني •
   مرفقات • تقارير • أرشفة • طباعة • نسخ احتياطي • PWA
   التخزين: LocalStorage (متوافق مع البيانات السابقة)
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY  = 'qarabesh_clinic_patients_v1';   // مفتاح المرضى — لم يتغيّر
  const SETTINGS_KEY = 'dentpilot_settings_v1';
  const ATT_KEY      = 'dentpilot_attachments_v1';       // المرفقات (مفتاح منفصل لعزل الحجم)

  /* ============================================================
     إعدادات صفحة «الدعم والتفعيل» — نسخة العيادات Pro
     كل نصوص/أرقام الصفحة مجمّعة هنا ليسهل ربطها مستقبلاً بلوحة تحكم
     مستقلة دون لمس منطق التفعيل أو مفاتيح التخزين. (بيانات عرض فقط)
     ============================================================ */
  const PRO_SUPPORT_CONFIG = {
    developer: 'د. عرفات الجعوري',
    price: { amount: '7000', currency: 'ريال', label: 'سعر تفعيل نسخة العيادات' },
    plans: [
      { key: 'monthly',  title: 'شهري',      note: '' },
      { key: 'yearly',   title: 'سنوي',      note: 'سنة واحدة' },
      { key: 'lifetime', title: 'مدى الحياة', note: '' }
    ],
    payInstructions: [
      'اختر خطة التفعيل المناسبة.',
      'ادفع عبر إحدى طرق الدفع التالية.',
      'انسخ رقم الحساب أو رقم الدفع.',
      'بعد الدفع أرسل صورة الإيصال أو رقم العملية عبر واتساب مع رمز التطبيق الخاص بهذا الجهاز.',
      'سيتم إرسال كود التفعيل لك.'
    ],
    payMethods: {
      alkuraimi: { name: 'بنك الكريمي', holder: 'عرفات الجعوري', number: '3015367236', numberLabel: 'رقم الحساب', note: '' },
      jeeb:      { name: 'محفظة جيب',  holder: 'عرفات الجعوري', number: '25910',      numberLabel: 'رقم الدفع',  note: 'هذا رقم الدفع البديل لمحفظة جيب' }
    },
    // أرقام الدعم الرسمية فقط (واتساب). wa = الرقم الدولي الكامل لرابط wa.me
    whatsapp: [
      { display: '775101518', wa: '967775101518' },
      { display: '779449744', wa: '967779449744' }
    ],
    // مفتاح قراءة اختياري (للقراءة فقط) قد تكتبه لوحة تحكم مستقبلية:
    // { plan:'monthly|yearly|lifetime', activatedAt:ISO, expiresAt:ISO }
    // لا يُنشأ ولا يُكتب من هنا إطلاقاً — يُقرأ فقط إن وُجد.
    metaKey: 'dentpilot_license_meta'
  };

  const $ = (id) => document.getElementById(id);
  const APP_VERSION = '2.3.0';
  const els = {
    splash: $('splash'), backBtn: $('backBtn'), installBtn: $('installBtn'), docLabel: $('docLabel'),
    trialBanner: $('trialBanner'), trialText: $('trialText'),
    updateOverlay: $('updateOverlay'), updateNowBtn: $('updateNowBtn'), updateLaterBtn: $('updateLaterBtn'),
    settingsExtra: $('settingsExtra'), accessStatus: $('accessStatus'), appVersion: $('appVersion'), checkUpdateBtn: $('checkUpdateBtn'), updateStatus: $('updateStatus'),
    // إعداد الطبيب
    doctorOverlay: $('doctorOverlay'), doctorForm: $('doctorForm'), doctorClose: $('doctorClose'),
    doctorCancel: $('doctorCancel'), doctorTitle: $('doctorTitle'), doctorHint: $('doctorHint'),
    docName: $('docName'), docSpecialty: $('docSpecialty'), docClinic: $('docClinic'),
    // لوحة التحكم
    dcPatients: $('dcPatients'), dcToday: $('dcToday'), dcLate: $('dcLate'), todayList: $('todayList'),
    // المرضى
    patientsList: $('patientsList'), empty: $('emptyState'), search: $('searchInput'),
    addBtn: $('addBtn'), completedBtn: $('completedBtn'), completedCount: $('completedCount'),
    // المكتملون
    completedList: $('completedList'), completedEmpty: $('completedEmpty'),
    // المتأخرة
    lateList: $('lateList'), lateEmpty: $('lateEmpty'),
    // إحصائيات / تقارير
    statsContent: $('statsContent'), reportsContent: $('reportsContent'),
    // نسخة احتياطية
    exportBtn: $('exportBtn'), importBtn: $('importBtn'), importFile: $('importFile'),
    // نافذة المريض
    overlay: $('modalOverlay'), modalTitle: $('modalTitle'), modalClose: $('modalClose'),
    cancelBtn: $('cancelBtn'), form: $('patientForm'),
    fId: $('patientId'), fName: $('name'), fTreatment: $('treatment'), fSession: $('session'),
    fPhone: $('phone'), fTotal: $('total'), fPaid: $('paid'), fRemaining: $('remaining'), fSecond: $('secondSession'), fNotes: $('notes'),
    // نافذة الجلسة
    sessionOverlay: $('sessionOverlay'), sessionForm: $('sessionForm'), sessionTitle: $('sessionTitle'),
    sessionClose: $('sessionClose'), sessionCancel: $('sessionCancel'),
    sessPatientId: $('sessPatientId'), sessId: $('sessId'), sessNumber: $('sessNumber'), sessDate: $('sessDate'),
    sessTime: $('sessTime'), sessTreatment: $('sessTreatment'), sessPaid: $('sessPaid'), sessNext: $('sessNext'),
    sessNotes: $('sessNotes'), sessCompleted: $('sessCompleted'),
    // تأكيد عام
    confirmOverlay: $('confirmOverlay'), confirmTitle: $('confirmTitle'), confirmText: $('confirmText'),
    confirmOk: $('confirmOk'), confirmCancel: $('confirmCancel'),
    // طباعة / تنبيه
    printArea: $('printArea'),
    bellBtn: $('bellBtn'), bellCount: $('bellCount'), alertBanner: $('alertBanner'), alertList: $('alertList'), alertClose: $('alertClose'),
    toast: $('toast'),
  };

  let patients = [];
  let settings = { doctorName: '', specialty: '', clinic: '' };
  let attachments = {};   // { patientId: [ {id,name,type,dataUrl,addedAt} ] }
  let pendingConfirm = null;
  let deferredPrompt = null;
  let currentView = 'dashboard';
  let currentParam = '';
  let fileOrigin = 'patients';
  let pendingScrollToday = false;
  let toastTimer = null;

  const VIEWS = ['dashboard', 'patients', 'completed', 'late', 'stats', 'reports', 'backup', 'support', 'file'];

  /* ============================================================
     التخزين
     ============================================================ */
  function load() {
    try { const r = localStorage.getItem(STORAGE_KEY); patients = r ? JSON.parse(r) : []; if (!Array.isArray(patients)) patients = []; }
    catch (e) { patients = []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(patients)); }
    catch (e) { alert('تعذّر حفظ البيانات. قد تكون مساحة التخزين ممتلئة.'); }
  }
  function loadSettings() {
    try { const r = localStorage.getItem(SETTINGS_KEY); if (r) settings = Object.assign(settings, JSON.parse(r)); } catch (e) {}
  }
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }

  // المرفقات (مفتاح منفصل)
  function loadAttachments() {
    try { const r = localStorage.getItem(ATT_KEY); const o = r ? JSON.parse(r) : {}; attachments = (o && typeof o === 'object') ? o : {}; }
    catch (e) { attachments = {}; }
  }
  function saveAttachments() { localStorage.setItem(ATT_KEY, JSON.stringify(attachments)); }
  function getAtt(pid) { return attachments[pid] || []; }

  // توافق مع البيانات القديمة: ضمان الحقول الجديدة
  function normalize() {
    patients.forEach(p => {
      if (!Array.isArray(p.sessions)) p.sessions = [];
      if (typeof p.completed !== 'boolean') p.completed = false;
      if (typeof p.notes !== 'string') p.notes = '';
      if (!p.completedAt) p.completedAt = p.completedAt || '';
    });
  }

  /* ============================================================
     أدوات مساعدة
     ============================================================ */
  function uid() { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function sid(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function dayDiffFromToday(s) {
    if (!s) return null; const a = new Date(s); if (isNaN(a.getTime())) return null;
    return Math.round((startOfDay(a) - startOfDay(new Date())) / 86400000);
  }
  function fmtDate(s) { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  function fmtDateTime(s) {
    if (!s) return '—'; const d = new Date(s); if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' • ' +
           d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtTime(s) { const d = new Date(s); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
  function weekday(s) { const d = new Date(s); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('ar-EG', { weekday: 'long' }); }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function phoneDigits(p) { return String(p || '').replace(/\D/g, ''); }
  function initial(name) { const t = (name || '').trim(); return t ? t[0] : 'م'; }
  function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; }

  function regDateFromId(id) {
    try {
      const s = String(id || ''); if (!s.startsWith('p_')) return null;
      const body = s.slice(2); if (body.length <= 5) return null;
      const ts = parseInt(body.slice(0, -5), 36);
      if (ts > 1262304000000 && ts < 4102444800000) return new Date(ts);
    } catch (e) {}
    return null;
  }

  // تاريخ ووقت الجلسة المجمّع
  function sessionDateTime(s) {
    if (!s || !s.date) return '';
    return s.time ? (s.date + 'T' + s.time) : s.date;
  }

  // الإجماليات المالية المشتقة (تتحدث تلقائياً مع كل جلسة)
  function patientTotals(p) {
    const cost = toNum(p.total);
    let paid = toNum(p.paid);
    (p.sessions || []).forEach(s => { paid += toNum(s.paid); });
    return { cost, paid, remaining: cost - paid };
  }

  // سجل الدفعات المشتق (الأحدث أولاً)
  function patientPayments(p) {
    const arr = [];
    const reg = regDateFromId(p.id);
    if (toNum(p.paid) > 0) arr.push({ date: reg ? reg.toISOString() : '', num: 'مبدئية', amount: toNum(p.paid), notes: 'دفعة مبدئية عند التسجيل' });
    (p.sessions || []).forEach(s => {
      if (toNum(s.paid) > 0) arr.push({ date: sessionDateTime(s), num: s.number || '—', amount: toNum(s.paid), notes: s.notes || '' });
    });
    arr.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return arr;
  }

  function activePatients() { return patients.filter(p => !p.completed); }
  function completedPatients() { return patients.filter(p => p.completed); }

  function statusOf(p) {
    const diff = dayDiffFromToday(p.secondSession);
    if (diff === null) return { key: 'none', label: 'لا يوجد موعد', diff };
    if (diff < 0)      return { key: 'late', label: 'متأخر', diff };
    if (diff === 0)    return { key: 'today', label: 'اليوم', diff };
    if (diff === 1)    return { key: 'tomorrow', label: 'غداً', diff };
    return { key: 'upcoming', label: 'قادم', diff };
  }

  function toast(msg) {
    els.toast.textContent = msg; els.toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2600);
  }

  /* ============================================================
     تنبيه صوتي
     ============================================================ */
  function playBeep() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = new AC(); let t = ctx.currentTime;
      [880, 1100, 880].forEach((f) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.24); t += 0.26;
      });
      setTimeout(() => ctx.close(), 1200);
    } catch (e) {}
  }

  /* ============================================================
     روابط الاتصال والواتساب
     ============================================================ */
  function callLink(phone, cls, label) {
    const p = (phone || '').trim();
    return p ? `<a class="card-btn call ${cls}" href="tel:${encodeURIComponent(p)}" title="اتصال">📞${label}</a>`
             : `<span class="card-btn call disabled ${cls}" title="لا يوجد رقم">📞${label}</span>`;
  }
  function waLink(phone, cls, label) {
    const d = phoneDigits(phone);
    return d ? `<a class="card-btn wa ${cls}" href="https://wa.me/${d}" target="_blank" rel="noopener" title="واتساب">💬${label}</a>`
             : `<span class="card-btn wa disabled ${cls}" title="لا يوجد رقم">💬${label}</span>`;
  }

  /* ============================================================
     لوحة التحكم: العدّادات + مواعيد اليوم
     ============================================================ */
  function updateCounts() {
    let today = 0, late = 0;
    activePatients().forEach(p => { const d = dayDiffFromToday(p.secondSession); if (d === 0) today++; else if (d !== null && d < 0) late++; });
    els.dcPatients.textContent = activePatients().length;
    els.dcToday.textContent = today;
    els.dcLate.textContent = late;
    if (els.completedCount) els.completedCount.textContent = completedPatients().length;
  }

  function renderToday() {
    const list = activePatients()
      .filter(p => dayDiffFromToday(p.secondSession) === 0)
      .sort((a, b) => new Date(a.secondSession) - new Date(b.secondSession));
    if (list.length === 0) {
      els.todayList.innerHTML = '<div class="empty-state"><p>لا توجد مواعيد اليوم.</p><span>المواعيد المجدولة لليوم ستظهر هنا.</span></div>';
      return;
    }
    els.todayList.innerHTML = list.map(p => `
      <div class="appt-item">
        <div class="appt-when"><span class="lbl">اليوم</span><span class="t">${escapeHtml(fmtTime(p.secondSession))}</span></div>
        <div class="appt-main"><div class="nm">${escapeHtml(p.name)}</div><div class="tr">${escapeHtml(p.treatment) || 'بدون تفاصيل علاج'}</div></div>
        <div class="appt-btns">
          <button class="card-btn open icon-only" data-act="open" data-id="${p.id}" title="فتح الملف">📂</button>
          ${callLink(p.phone, 'icon-only', '')}
          ${waLink(p.phone, 'icon-only', '')}
        </div>
      </div>`).join('');
  }

  /* ============================================================
     بطاقات المرضى
     ============================================================ */
  function patientCard(p) {
    const st = statusOf(p);
    const t = patientTotals(p);
    const remCls = t.remaining > 0 ? 'pos' : 'zero';
    const cardState = (st.key === 'late' || st.key === 'today' || st.key === 'tomorrow') ? 'is-' + st.key : '';
    const appt = p.secondSession ? (escapeHtml(fmtDateTime(p.secondSession)) + ' • ' + escapeHtml(weekday(p.secondSession))) : 'لا يوجد موعد قادم';
    return `
    <div class="pcard compact ${cardState}">
      <div class="pcard-top">
        <span class="pcard-avatar">${escapeHtml(initial(p.name))}</span>
        <div class="pcard-id">
          <div class="pcard-name">${escapeHtml(p.name)}</div>
          <div class="pcard-treat">${escapeHtml(p.treatment) || 'بدون نوع علاج'}${p.phone ? ' • ' + escapeHtml(p.phone) : ''}</div>
        </div>
        <span class="pcard-status st-${st.key}">${st.label}</span>
      </div>
      <div class="pcard-money">
        <span><i>التكلفة</i><b>${fmt(t.cost)}</b></span>
        <span><i>المدفوع</i><b>${fmt(t.paid)}</b></span>
        <span><i>المتبقي</i><b class="${remCls}">${fmt(t.remaining)}</b></span>
      </div>
      <div class="pcard-sub">
        <span class="ps-appt">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <span>${appt}</span>
        </span>
      </div>
      <div class="pcard-actions">
        <button class="card-btn open" data-act="open" data-id="${p.id}">📂 ملف</button>
        ${callLink(p.phone, '', ' اتصال')}
        ${waLink(p.phone, '', ' واتساب')}
      </div>
    </div>`;
  }

  function completedCard(p) {
    const t = patientTotals(p);
    const remCls = t.remaining > 0 ? 'pos' : 'zero';
    return `
    <div class="pcard compact is-done">
      <div class="pcard-top">
        <span class="pcard-avatar done">${escapeHtml(initial(p.name))}</span>
        <div class="pcard-id">
          <div class="pcard-name">${escapeHtml(p.name)}</div>
          <div class="pcard-treat">${escapeHtml(p.treatment) || 'بدون نوع علاج'}${p.phone ? ' • ' + escapeHtml(p.phone) : ''}</div>
        </div>
        <span class="pcard-status st-done">✅ مكتمل</span>
      </div>
      <div class="pcard-money">
        <span><i>التكلفة</i><b>${fmt(t.cost)}</b></span>
        <span><i>المدفوع</i><b>${fmt(t.paid)}</b></span>
        <span><i>المتبقي</i><b class="${remCls}">${fmt(t.remaining)}</b></span>
      </div>
      <div class="pcard-sub"><span class="ps-appt"><span>📅 اكتمل في: ${escapeHtml(fmtDate(p.completedAt))}</span></span></div>
      <div class="pcard-actions">
        <button class="card-btn open" data-act="open" data-id="${p.id}">📂 ملف</button>
        <button class="card-btn print" data-act="print" data-id="${p.id}">🖨 طباعة</button>
        <button class="card-btn restore" data-act="restore" data-id="${p.id}">🔄 استعادة</button>
        <button class="card-btn del" data-act="purge" data-id="${p.id}">🗑 حذف نهائي</button>
      </div>
    </div>`;
  }

  function renderPatients() {
    const q = els.search.value.trim().toLowerCase();
    const base = activePatients();
    const list = q ? base.filter(p =>
      (p.name || '').toLowerCase().includes(q) || (p.phone || '').toLowerCase().includes(q) || (p.treatment || '').toLowerCase().includes(q)
    ) : base;
    if (base.length === 0) {
      els.patientsList.innerHTML = ''; els.empty.hidden = false;
      els.empty.querySelector('p').textContent = 'لا يوجد مرضى مسجّلون بعد.';
      els.empty.querySelector('span').textContent = 'اضغط «إضافة مريض» لبدء تسجيل أول مريض.';
    } else if (list.length === 0) {
      els.patientsList.innerHTML = ''; els.empty.hidden = false;
      els.empty.querySelector('p').textContent = 'لا توجد نتائج مطابقة.';
      els.empty.querySelector('span').textContent = 'جرّب البحث بالاسم أو رقم الهاتف أو نوع العلاج.';
    } else {
      els.empty.hidden = true; els.patientsList.innerHTML = list.map(patientCard).join('');
    }
  }

  function renderCompleted() {
    const list = completedPatients().sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
    if (list.length === 0) { els.completedList.innerHTML = ''; els.completedEmpty.hidden = false; }
    else { els.completedEmpty.hidden = true; els.completedList.innerHTML = list.map(completedCard).join(''); }
  }

  function renderLate() {
    const list = activePatients()
      .filter(p => { const d = dayDiffFromToday(p.secondSession); return d !== null && d < 0; })
      .sort((a, b) => new Date(b.secondSession) - new Date(a.secondSession));
    if (list.length === 0) { els.lateList.innerHTML = ''; els.lateEmpty.hidden = false; }
    else { els.lateEmpty.hidden = true; els.lateList.innerHTML = list.map(patientCard).join(''); }
  }

  function renderStats() {
    let cost = 0, paid = 0, today = 0, tomorrow = 0, late = 0, none = 0, upcoming = 0;
    activePatients().forEach(p => {
      const tt = patientTotals(p); cost += tt.cost; paid += tt.paid;
      const k = statusOf(p).key;
      if (k === 'today') today++; else if (k === 'tomorrow') tomorrow++; else if (k === 'late') late++; else if (k === 'none') none++; else upcoming++;
    });
    const box = (l, v, cls = '') => `<div class="sbox ${cls}"><div class="sl">${l}</div><div class="sv">${v}</div></div>`;
    els.statsContent.innerHTML =
      box('المرضى الحاليون', activePatients().length) +
      box('المرضى المكتملون', completedPatients().length) +
      box('مواعيد اليوم', today, 'today') +
      box('مواعيد الغد', tomorrow) +
      box('مواعيد متأخرة', late, 'late') +
      box('مواعيد قادمة', upcoming) +
      box('إجمالي الفواتير', fmt(cost)) +
      box('إجمالي المدفوع', fmt(paid)) +
      box('إجمالي المتبقي', fmt(cost - paid), 'money');
  }

  function renderReports() {
    let cost = 0, paid = 0, sessions = 0, today = 0, late = 0;
    activePatients().forEach(p => {
      const tt = patientTotals(p); cost += tt.cost; paid += tt.paid;
      sessions += (p.sessions || []).length;
      const k = statusOf(p).key; if (k === 'today') today++; else if (k === 'late') late++;
    });
    const outstanding = cost - paid;
    const collection = cost > 0 ? Math.round((paid / cost) * 100) : 0;
    const top = activePatients().map(p => ({ p, r: patientTotals(p).remaining })).filter(x => x.r > 0).sort((a, b) => b.r - a.r).slice(0, 5);
    const box = (l, v, cls = '') => `<div class="sbox ${cls}"><div class="sl">${l}</div><div class="sv">${v}</div></div>`;
    let html = `<div class="stats-grid">
      ${box('المرضى الحاليون', activePatients().length)}
      ${box('المرضى المكتملون', completedPatients().length)}
      ${box('إجمالي الجلسات', sessions)}
      ${box('مواعيد اليوم', today, 'today')}
      ${box('مواعيد متأخرة', late, 'late')}
      ${box('إجمالي الفواتير', fmt(cost))}
      ${box('إجمالي المحصّل', fmt(paid))}
      ${box('إجمالي المتبقّي', fmt(outstanding), 'money')}
      ${box('نسبة التحصيل', collection + '%')}
    </div>`;
    if (top.length) {
      html += `<div class="file-block" style="margin-top:14px"><div class="fs-head plain"><span class="fs-ico">📌</span><h3>أعلى المبالغ المتبقية</h3></div>
        <div class="report-list">${top.map(x => `<div class="report-row"><span>${escapeHtml(x.p.name)}</span><b class="pos">${fmt(x.r)}</b></div>`).join('')}</div></div>`;
    }
    els.reportsContent.innerHTML = html;
  }

  /* ============================================================
     الدعم والتفعيل (نسخة العيادات Pro)
     - تُبنى من PRO_SUPPORT_CONFIG (بيانات عرض قابلة للتعديل لاحقاً)
     - تقرأ حالة التفعيل من DPLicense دون تغيير منطقه
     ============================================================ */
  function licenseMeta() {
    // قراءة فقط: تفاصيل الاشتراك إن كتبتها لوحة تحكم مستقبلية. غير موجودة الآن = null
    try {
      const r = localStorage.getItem(PRO_SUPPORT_CONFIG.metaKey);
      if (!r) return null;
      const o = JSON.parse(r);
      return (o && typeof o === 'object') ? o : null;
    } catch (e) { return null; }
  }
  function planTitle(key) {
    const p = PRO_SUPPORT_CONFIG.plans.find(x => x.key === key);
    return p ? p.title : (key || '—');
  }
  function copyBtn(value, label) {
    return `<button type="button" class="btn btn-ghost sup-copy" data-act="copy" data-copy="${escapeHtml(value)}">${label || 'نسخ الرقم'}</button>`;
  }
  function supPlansHtml() {
    return `<div class="sup-plans">${PRO_SUPPORT_CONFIG.plans.map(pl =>
      `<div class="sup-plan"><span class="sup-plan-title">${escapeHtml(pl.title)}</span>${pl.note ? `<span class="sup-plan-note">${escapeHtml(pl.note)}</span>` : ''}</div>`
    ).join('')}</div>`;
  }
  function supWhatsappHtml() {
    return `<div class="sup-wa">${PRO_SUPPORT_CONFIG.whatsapp.map(w =>
      `<a class="card-btn wa" href="https://wa.me/${escapeHtml(w.wa)}" target="_blank" rel="noopener">💬 واتساب ${escapeHtml(w.display)}</a>`
    ).join('')}</div>`;
  }
  function supDeviceCardHtml() {
    let dev = '';
    try { dev = (window.DPLicense && window.DPLicense.getDeviceId) ? window.DPLicense.getDeviceId() : ''; } catch (e) { dev = ''; }
    if (!dev) return '';   // لا نعرض بطاقة فارغة
    return `<div class="sup-card">
      <div class="sup-card-head"><span>🔑</span><h3>رمز التطبيق الخاص بهذا الجهاز</h3></div>
      <div class="sup-code">${escapeHtml(dev)}</div>
      ${copyBtn(dev, 'نسخ رمز التطبيق')}
    </div>`;
  }
  function supPayMethodsHtml() {
    const k = PRO_SUPPORT_CONFIG.payMethods.alkuraimi, j = PRO_SUPPORT_CONFIG.payMethods.jeeb;
    const method = (m) => `<div class="sup-pay">
      <div class="sup-pay-head">${escapeHtml(m.name)}</div>
      <div class="sup-pay-row"><span>صاحب الحساب</span><b>${escapeHtml(m.holder)}</b></div>
      <div class="sup-pay-row"><span>${escapeHtml(m.numberLabel)}</span><b class="sup-num">${escapeHtml(m.number)}</b></div>
      ${m.note ? `<div class="sup-pay-note">${escapeHtml(m.note)}</div>` : ''}
      ${copyBtn(m.number, 'نسخ الرقم')}
    </div>`;
    return `<div class="sup-pays">${method(k)}${method(j)}</div>`;
  }

  function renderSupport() {
    const body = $('supportBody'); if (!body) return;
    const cfg = PRO_SUPPORT_CONFIG;
    let activated = false, state = 'activated';
    try {
      if (window.DPLicense) {
        activated = !!window.DPLicense.isActivated();
        state = window.DPLicense.getAccessState();
      }
    } catch (e) {}

    if (activated) {
      // ===== بعد التفعيل: تفاصيل التفعيل + دعم فقط (بلا سعر/دفع) =====
      const meta = licenseMeta();
      let details = '';
      if (meta) {
        const rows = [];
        if (meta.plan) rows.push(['نوع الاشتراك', planTitle(meta.plan)]);
        if (meta.activatedAt) rows.push(['تاريخ التفعيل', fmtDate(meta.activatedAt)]);
        if (meta.plan === 'lifetime') rows.push(['تاريخ الانتهاء', 'لا يوجد تاريخ انتهاء']);
        else if (meta.expiresAt) rows.push(['تاريخ الانتهاء', fmtDate(meta.expiresAt)]);
        if (rows.length) {
          details = `<div class="sup-details">${rows.map(r =>
            `<div class="sup-pay-row"><span>${escapeHtml(r[0])}</span><b>${escapeHtml(r[1])}</b></div>`
          ).join('')}</div>`;
        }
      }
      body.innerHTML = `
        <div class="sup-active">
          <div class="sup-active-ico">✅</div>
          <div class="sup-active-main">
            <h3>التطبيق مفعل بنجاح</h3>
            <p>تم تطوير التطبيق بواسطة: ${escapeHtml(cfg.developer)}</p>
          </div>
        </div>
        ${details}
        ${supDeviceCardHtml()}
        <div class="sup-card">
          <div class="sup-card-head"><span>💬</span><h3>الدعم الرسمي</h3></div>
          ${supWhatsappHtml()}
        </div>`;
      return;
    }

    // ===== غير مفعّل / فترة تجريبية =====
    let trialCard = '';
    try {
      if (state === 'trial' && window.DPLicense) {
        const h = window.DPLicense.trialRemainingHours();
        trialCard = `<div class="sup-trial">⏳ الفترة التجريبية المجانية سارية — المتبقي: ${h} ساعة.</div>`;
      } else if (state === 'expired') {
        trialCard = `<div class="sup-trial expired">⛔ انتهت الفترة التجريبية المجانية. فعّل التطبيق للاستمرار.</div>`;
      }
    } catch (e) {}

    body.innerHTML = `
      ${trialCard}
      <div class="sup-card sup-cta">
        <button type="button" class="btn btn-primary" data-act="open-activation" style="width:100%">🔓 تفعيل التطبيق الآن</button>
      </div>

      <div class="sup-card">
        <div class="sup-card-head"><span>🛒</span><h3>شراء مرة واحدة أو اشتراك حسب الخطة</h3></div>
        <div class="sup-price">
          <span class="sup-price-label">${escapeHtml(cfg.price.label)}</span>
          <span class="sup-price-val">${escapeHtml(cfg.price.amount)} ${escapeHtml(cfg.price.currency)}</span>
        </div>
        ${supPlansHtml()}
      </div>

      <div class="sup-card">
        <div class="sup-card-head"><span>🧾</span><h3>تعليمات الدفع</h3></div>
        <ol class="sup-steps">${cfg.payInstructions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      </div>

      <div class="sup-card">
        <div class="sup-card-head"><span>💳</span><h3>طرق الدفع</h3></div>
        ${supPayMethodsHtml()}
      </div>

      ${supDeviceCardHtml()}

      <div class="sup-card">
        <div class="sup-card-head"><span>💬</span><h3>الدعم الرسمي عبر واتساب</h3></div>
        ${supWhatsappHtml()}
      </div>`;
  }

  /* ============================================================
     ملف المريض
     ============================================================ */
  function renderFile(id) {
    const fb = $('fileBody');
    const p = patients.find(x => x.id === id);
    if (!p) { go(fileOrigin || 'patients'); return; }
    const st = statusOf(p);
    const tt = patientTotals(p);
    const remCls = tt.remaining > 0 ? 'pos' : 'zero';
    const reg = regDateFromId(p.id);
    const regStr = reg ? fmtDate(reg.toISOString()) : '—';
    const apptStr = p.secondSession ? (escapeHtml(fmtDateTime(p.secondSession)) + ' • ' + escapeHtml(weekday(p.secondSession))) : 'لا يوجد موعد قادم';

    const info = (icon, label, value, cls = '') => `
      <div class="info-card"><span class="info-ico">${icon}</span>
        <div class="info-meta"><span class="info-label">${label}</span><span class="info-value ${cls}">${value}</span></div></div>`;

    const actions = p.completed ? `
        ${callLink(p.phone, '', ' اتصال')}
        ${waLink(p.phone, '', ' واتساب')}
        <button class="card-btn print" data-act="print" data-id="${p.id}">🖨 طباعة</button>
        <button class="card-btn restore" data-act="restore" data-id="${p.id}">🔄 استعادة</button>
        <button class="card-btn del" data-act="purge" data-id="${p.id}">🗑 حذف نهائي</button>` : `
        ${callLink(p.phone, '', ' اتصال')}
        ${waLink(p.phone, '', ' واتساب')}
        <button class="card-btn edit" data-act="edit" data-id="${p.id}">✏️ تعديل</button>
        <button class="card-btn print" data-act="print" data-id="${p.id}">🖨 طباعة</button>
        <button class="card-btn complete" data-act="finish" data-id="${p.id}">✅ إنهاء العلاج</button>
        <button class="card-btn del" data-act="del" data-id="${p.id}">🗑️ حذف</button>`;

    fb.innerHTML = `
      <div class="file-hero ${p.completed ? 'done' : ''}">
        <span class="file-avatar">${escapeHtml(initial(p.name))}</span>
        <div class="file-hero-main">
          <h2>${escapeHtml(p.name)}</h2>
          <div class="file-hero-sub">${escapeHtml(p.treatment) || 'بدون نوع علاج'}</div>
        </div>
        <span class="file-status ${p.completed ? 'st-done' : 'st-' + st.key}">${p.completed ? '✅ مكتمل' : st.label}</span>
      </div>

      ${p.completed ? `<div class="done-banner">تم إنهاء علاج هذا المريض وأرشفته في ${escapeHtml(fmtDateTime(p.completedAt))}.</div>` : ''}

      <div class="file-actions">${actions}</div>

      <div class="file-block">
        <div class="fs-head plain"><span class="fs-ico">🧾</span><h3>معلومات المريض</h3></div>
        <div class="info-grid">
          ${info('👤', 'الاسم', escapeHtml(p.name))}
          ${info('📞', 'رقم الهاتف', escapeHtml(p.phone) || '—')}
          ${info('🦷', 'نوع العلاج', escapeHtml(p.treatment) || '—')}
          ${info('💰', 'تكلفة العلاج', fmt(tt.cost))}
          ${info('✅', 'إجمالي المدفوع', fmt(tt.paid))}
          ${info('⚠️', 'المبلغ المتبقي', fmt(tt.remaining), remCls)}
          ${info('🗓️', 'الموعد القادم', apptStr)}
          ${info('📅', 'تاريخ الإضافة', regStr)}
        </div>
        ${p.notes ? `<div class="notes-card"><span class="info-label">📝 ملاحظات</span><p class="notes-text">${escapeHtml(p.notes)}</p></div>` : ''}
      </div>

      ${sessionsSection(p)}
      ${timelineSection(p)}
      ${paymentsSection(p)}
      ${attachmentsSection(p)}
    `;
  }

  /* ---------- جلسات العلاج (إدارة) ---------- */
  function sessionsSection(p) {
    const list = (p.sessions || []).slice().sort((a, b) => (toNum(a.number) - toNum(b.number)) || (new Date(sessionDateTime(a) || 0) - new Date(sessionDateTime(b) || 0)));
    const body = list.length ? list.map(s => {
      const dt = sessionDateTime(s);
      return `<div class="sess-card ${s.completed ? 'done' : ''}">
        <div class="sess-head">
          <span class="sess-no">جلسة ${escapeHtml(s.number) || '—'}</span>
          <span class="sess-when">${escapeHtml(fmtDate(s.date))}${s.date ? ' • ' + escapeHtml(weekday(s.date)) : ''}${s.time ? ' • ' + escapeHtml(s.time) : ''}</span>
          <span class="sess-tools">
            <button class="mini-btn ${s.completed ? 'on' : ''}" data-act="sess-toggle" data-id="${p.id}" data-sid="${s.id}" title="${s.completed ? 'مكتملة' : 'تعليم كمكتملة'}">${s.completed ? '✅' : '⭕'}</button>
            <button class="mini-btn" data-act="sess-edit" data-id="${p.id}" data-sid="${s.id}" title="تعديل">✏️</button>
            <button class="mini-btn del" data-act="sess-del" data-id="${p.id}" data-sid="${s.id}" title="حذف">🗑️</button>
          </span>
        </div>
        ${s.treatment ? `<div class="sess-treat">🦷 ${escapeHtml(s.treatment)}</div>` : ''}
        ${s.notes ? `<div class="sess-note">📝 ${escapeHtml(s.notes)}</div>` : ''}
        <div class="sess-foot">
          <span class="sess-paid">💵 مدفوع: <b>${fmt(toNum(s.paid))}</b></span>
          ${s.next ? `<span class="sess-next">🗓️ القادم: ${escapeHtml(fmtDateTime(s.next))} • ${escapeHtml(weekday(s.next))}</span>` : ''}
        </div>
      </div>`;
    }).join('') : '<div class="sub-empty">لا توجد جلسات بعد. اضغط «إضافة جلسة».</div>';

    return `<div class="file-section">
      <div class="fs-head"><span class="fs-ico">🦷</span><h3>جلسات العلاج</h3>
        ${p.completed ? '' : `<button class="card-btn open" data-act="sess-add" data-id="${p.id}">➕ إضافة جلسة</button>`}</div>
      <div class="fs-body">${body}</div>
    </div>`;
  }

  /* ---------- الخط الزمني (عرض رأسي) ---------- */
  function timelineSection(p) {
    const list = (p.sessions || []).slice().sort((a, b) => (new Date(sessionDateTime(a) || 0) - new Date(sessionDateTime(b) || 0)) || (toNum(a.number) - toNum(b.number)));
    const nodes = list.length ? `<div class="timeline">${list.map(s => `
      <div class="tl-node ${s.completed ? 'done' : ''}">
        <span class="tl-marker">${s.completed ? '✓' : (escapeHtml(s.number) || '•')}</span>
        <div class="tl-card">
          <div class="tl-title">جلسة ${escapeHtml(s.number) || ''}${s.treatment ? ' — ' + escapeHtml(s.treatment) : ''}</div>
          <div class="tl-meta">${escapeHtml(fmtDate(s.date))}${s.date ? ' • ' + escapeHtml(weekday(s.date)) : ''}${s.time ? ' • ' + escapeHtml(s.time) : ''}</div>
          <div class="tl-pay">💵 مدفوع: ${fmt(toNum(s.paid))}</div>
          ${s.notes ? `<div class="tl-sub">📝 ${escapeHtml(s.notes)}</div>` : ''}
        </div>
      </div>`).join('')}</div>` : '<div class="sub-empty">لا توجد جلسات لعرضها في الخط الزمني بعد.</div>';

    return `<div class="file-section">
      <div class="fs-head"><span class="fs-ico">📈</span><h3>الخط الزمني للعلاج</h3></div>
      <div class="fs-body">${nodes}</div>
    </div>`;
  }

  /* ---------- سجل الدفعات (مشتق، الأحدث أولاً) ---------- */
  function paymentsSection(p) {
    const list = patientPayments(p);
    const body = list.length ? list.map(pay => `
      <div class="pay-row">
        <span class="pay-amount">${fmt(pay.amount)}</span>
        <span class="pay-meta">
          <span class="pay-date">${escapeHtml(fmtDate(pay.date))}${pay.date ? ' • ' + escapeHtml(weekday(pay.date)) : ''}</span>
          <span class="pay-num">جلسة: ${escapeHtml(String(pay.num))}</span>
          ${pay.notes ? '<span class="pay-note">' + escapeHtml(pay.notes) + '</span>' : ''}
        </span>
      </div>`).join('') : '<div class="sub-empty">لا توجد دفعات مسجّلة بعد. تُسجَّل الدفعات تلقائياً عند إضافة المبلغ المدفوع في الجلسة.</div>';

    const totalPaid = patientTotals(p).paid;
    return `<div class="file-section">
      <div class="fs-head"><span class="fs-ico">💳</span><h3>سجل الدفعات</h3><span class="fs-badge">${fmt(totalPaid)}</span></div>
      <div class="fs-body">${body}</div>
    </div>`;
  }

  /* ---------- المرفقات (صور أشعة / مستندات) ---------- */
  function attachmentsSection(p) {
    const list = getAtt(p.id);
    const body = list.length ? `<div class="att-grid">${list.map(a => {
      const isImg = (a.type || '').startsWith('image/');
      const isPdf = (a.type || '') === 'application/pdf' || /\.pdf$/i.test(a.name || '');
      const thumb = isImg
        ? `<button type="button" class="att-thumb" data-act="att-open" data-id="${p.id}" data-att="${a.id}" title="فتح"><img src="${a.dataUrl}" alt="${escapeHtml(a.name)}" loading="lazy"/></button>`
        : `<button type="button" class="att-thumb file" data-act="att-open" data-id="${p.id}" data-att="${a.id}" title="فتح"><span>${isPdf ? '📄' : '📎'}</span></button>`;
      return `<div class="att-card">
        ${thumb}
        <div class="att-name" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</div>
        <button class="mini-btn del" data-act="att-del" data-id="${p.id}" data-att="${a.id}" title="حذف">🗑️</button>
      </div>`;
    }).join('')}</div>` : '<div class="sub-empty">لا توجد مرفقات بعد. أضف صورة أشعة أو صورة أسنان أو مستنداً.</div>';

    return `<div class="file-section">
      <div class="fs-head"><span class="fs-ico">📎</span><h3>المرفقات</h3>
        <button class="card-btn open" data-act="att-add" data-id="${p.id}">➕ إضافة مرفق</button></div>
      <input type="file" id="attInput" data-id="${p.id}" accept="image/*,application/pdf" multiple hidden />
      <div class="fs-body">${body}</div>
    </div>`;
  }

  function triggerAttach(pid) { const inp = $('attInput'); if (inp) { inp.dataset.id = pid; inp.click(); } }
  function readFileAsDataURL(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
  function downscaleImage(dataUrl, maxDim, quality) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) { const sc = Math.min(maxDim / w, maxDim / h); w = Math.round(w * sc); h = Math.round(h * sc); }
        try { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); res(c.toDataURL('image/jpeg', quality)); }
        catch (e) { res(dataUrl); }
      };
      img.onerror = () => res(dataUrl); img.src = dataUrl;
    });
  }
  async function addAttachments(pid, files) {
    if (!files || !files.length) return;
    if (!attachments[pid]) attachments[pid] = [];
    let added = 0;
    for (const file of Array.from(files)) {
      try {
        let dataUrl = await readFileAsDataURL(file);
        let type = file.type || '';
        if (type.startsWith('image/')) { dataUrl = await downscaleImage(dataUrl, 1400, 0.7); type = 'image/jpeg'; }
        attachments[pid].push({ id: sid('att'), name: file.name || 'مرفق', type, dataUrl, addedAt: new Date().toISOString() });
        added++;
      } catch (e) {}
    }
    try { saveAttachments(); }
    catch (err) {
      attachments[pid] = attachments[pid].slice(0, attachments[pid].length - added);
      try { saveAttachments(); } catch (e) {}
      toast('المساحة المحلية ممتلئة — تعذّر حفظ المرفق. جرّب صورة أصغر حجماً.');
      renderActiveView(); return;
    }
    renderActiveView();
    toast(added > 1 ? 'تمت إضافة المرفقات' : 'تمت إضافة المرفق');
  }
  function deleteAttachment(pid, attid) {
    confirmAsk({ title: 'حذف المرفق', text: 'هل تريد حذف هذا المرفق؟', okLabel: 'حذف',
      onOk: () => { attachments[pid] = (attachments[pid] || []).filter(a => a.id !== attid); try { saveAttachments(); } catch (e) {} renderActiveView(); toast('تم حذف المرفق'); } });
  }

  // تحويل data URL إلى Blob (لفتح آمن عبر Blob URL بدل data: التي يحجبها بعض المتصفحات)
  function dataUrlToBlob(dataUrl) {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) throw new Error('bad dataurl');
    const meta = dataUrl.slice(0, comma);
    const dataStr = dataUrl.slice(comma + 1);
    const mimeM = meta.match(/^data:([^;]+)/);
    const mime = (mimeM && mimeM[1]) ? mimeM[1] : 'application/octet-stream';
    const isB64 = /;base64/i.test(meta);
    let bytes;
    if (isB64) {
      const bin = atob(dataStr);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      // data URL غير مُرمَّز base64 (نادر) — نفكّ ترميز النسبة المئوية إلى بايتات خام
      const raw = dataStr.replace(/\+/g, ' ');
      const out = [];
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '%' && /[0-9A-Fa-f]{2}/.test(raw.substr(i + 1, 2))) { out.push(parseInt(raw.substr(i + 1, 2), 16)); i += 2; }
        else out.push(raw.charCodeAt(i) & 0xff);
      }
      bytes = new Uint8Array(out);
    }
    return new Blob([bytes], { type: mime });
  }

  // فتح المرفق: الصور معاينة داخل التطبيق؛ PDF/غيره عبر Blob URL (فتح/تنزيل) مع رسالة خطأ واضحة
  function openAttachment(pid, attid) {
    const a = (attachments[pid] || []).find(x => x.id === attid);
    if (!a || !a.dataUrl) { toast('تعذّر فتح المرفق — الملف غير متاح.'); return; }
    const isImg = (a.type || '').startsWith('image/');
    if (isImg) { openLightbox(a.dataUrl, a.name || 'صورة'); return; }

    let url = '';
    try {
      const blob = dataUrlToBlob(a.dataUrl);
      url = URL.createObjectURL(blob);
    } catch (e) { toast('تعذّر فتح هذا المرفق على هذا المتصفح.'); return; }

    const isPdf = (a.type || '') === 'application/pdf' || /\.pdf$/i.test(a.name || '');
    let opened = null;
    try { if (isPdf) opened = window.open(url, '_blank', 'noopener'); } catch (e) { opened = null; }

    if (!isPdf || !opened) {
      // تنزيل آمن (أو فتح إن دعمه المتصفح) عبر رابط مؤقّت بـ Blob URL
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = a.name || 'مرفق';
        link.rel = 'noopener';
        document.body.appendChild(link); link.click(); link.remove();
      } catch (e) {
        toast('تعذّر فتح هذا المرفق على هذا المتصفح.');
      }
    }
    // إبقاء الرابط حياً بما يكفي لفتح/تنزيل الملف ثم تحريره
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
  }

  // معاينة الصور داخل التطبيق (Lightbox)
  function openLightbox(src, name) {
    const box = $('attLightbox'); if (!box) return;
    const img = $('attLbImg'), nm = $('attLbName');
    if (img) { img.src = src; img.alt = name || ''; }
    if (nm) nm.textContent = name || '';
    box.hidden = false;
  }
  function closeLightbox() {
    const box = $('attLightbox'); if (!box) return;
    box.hidden = true;
    const img = $('attLbImg'); if (img) img.src = '';
  }

  // نسخ نص إلى الحافظة (لأزرار «نسخ» في صفحة الدعم)
  function copyText(value) {
    const v = String(value == null ? '' : value);
    if (!v) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(function () { toast('تم النسخ'); }, function () { _copyFallback(v); });
      } else { _copyFallback(v); }
    } catch (e) { _copyFallback(v); }
  }
  function _copyFallback(v) {
    try {
      const ta = document.createElement('textarea');
      ta.value = v; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      toast('تم النسخ');
    } catch (e) { toast('تعذّر النسخ — انسخ الرقم يدوياً.'); }
  }

  // فتح شاشة التفعيل الحالية (activation.js) من زر «تفعيل التطبيق الآن» — دون تغيير منطق التفعيل
  function openActivation() {
    const ov = document.getElementById('activationOverlay');
    if (ov) { ov.hidden = false; const inp = document.getElementById('actCode'); if (inp) setTimeout(function () { inp.focus(); }, 60); }
    else { toast('شاشة التفعيل غير متاحة.'); }
  }

  /* ============================================================
     التنبيهات
     ============================================================ */
  function buildAlerts(autoSound) {
    const upcoming = activePatients()
      .map(p => ({ p, diff: dayDiffFromToday(p.secondSession) }))
      .filter(x => x.diff === 0 || x.diff === 1)
      .sort((a, b) => a.diff - b.diff || new Date(a.p.secondSession) - new Date(b.p.secondSession));
    if (upcoming.length > 0) { els.bellCount.hidden = false; els.bellCount.textContent = upcoming.length; } else els.bellCount.hidden = true;
    els.alertList.innerHTML = '';
    upcoming.forEach(({ p, diff }) => {
      const li = document.createElement('li'); li.className = diff === 1 ? 'tomorrow' : '';
      li.innerHTML = `<span class="tag">${diff === 0 ? 'اليوم' : 'غداً'}</span>
        <strong>${escapeHtml(p.name)}</strong><span>— ${fmtDateTime(p.secondSession)}</span>
        ${p.phone ? '<span>• ☎ ' + escapeHtml(p.phone) + '</span>' : ''}`;
      els.alertList.appendChild(li);
    });
    if (upcoming.length > 0) { els.alertBanner.hidden = false; if (autoSound) playBeep(); } else els.alertBanner.hidden = true;
    return upcoming.length;
  }

  /* ============================================================
     الموجّه
     ============================================================ */
  function parseHash() {
    const raw = location.hash.replace(/^#/, '');
    const [name, param] = raw.split('/');
    return { name: VIEWS.includes(name) ? name : 'dashboard', param: param || '' };
  }
  function go(name) {
    if (name === 'add') { openModal(null); return; }
    if (name === 'settings') { openDoctor(true); return; }
    if (name === 'today') { pendingScrollToday = true; location.hash = 'dashboard'; applyRoute(); return; }
    location.hash = name; applyRoute();
  }
  function openFile(id) { fileOrigin = (currentView === 'completed') ? 'completed' : 'patients'; location.hash = 'file/' + id; applyRoute(); }
  function goBack() {
    if (currentView === 'file') go(fileOrigin || 'patients');
    else if (currentView === 'completed') go('patients');
    else go('dashboard');
  }
  function applyRoute() {
    const { name, param } = parseHash();
    currentView = name; currentParam = param;
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== name; });
    els.backBtn.hidden = (name === 'dashboard');
    renderActiveView();
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
    if (pendingScrollToday) { pendingScrollToday = false; const s = $('todaySection'); if (s) setTimeout(() => s.scrollIntoView({ behavior: 'smooth' }), 70); }
  }
  function renderActiveView() {
    updateCounts();
    if (currentView === 'dashboard') renderToday();
    else if (currentView === 'patients') renderPatients();
    else if (currentView === 'completed') renderCompleted();
    else if (currentView === 'late') renderLate();
    else if (currentView === 'stats') renderStats();
    else if (currentView === 'reports') renderReports();
    else if (currentView === 'support') renderSupport();
    else if (currentView === 'file') renderFile(currentParam);
  }
  function refresh() { renderActiveView(); }

  /* ============================================================
     إعداد الطبيب / الإعدادات
     ============================================================ */
  function applyDoctorLabel() {
    els.docLabel.textContent = settings.doctorName ? ('د. ' + settings.doctorName) : 'د. —';
    if (settings.specialty) els.docLabel.title = settings.specialty;
  }
  function openDoctor(editable) {
    els.docName.value = settings.doctorName || ''; els.docSpecialty.value = settings.specialty || ''; els.docClinic.value = settings.clinic || '';
    els.doctorClose.hidden = !editable; els.doctorCancel.hidden = !editable;
    els.doctorTitle.textContent = editable ? 'الإعدادات' : 'إعداد التطبيق';
    els.doctorHint.textContent = editable ? 'يمكنك تعديل بيانات الطبيب في أي وقت.' : 'مرحباً بك في DentPilot. أدخل بيانات الطبيب لبدء استخدام التطبيق.';
    if (els.settingsExtra) els.settingsExtra.hidden = !editable;
    if (editable) updateSettingsStatus();
    els.doctorOverlay.hidden = false; setTimeout(() => els.docName.focus(), 50);
  }
  function updateSettingsStatus() {
    if (els.appVersion) els.appVersion.textContent = APP_VERSION;
    if (els.accessStatus && window.DPLicense) {
      var st = window.DPLicense.getAccessState();
      els.accessStatus.textContent = st === 'activated' ? 'مفعل'
        : st === 'trial' ? ('تجربة مجانية — المتبقي: ' + window.DPLicense.trialRemainingHours() + ' ساعة')
        : 'انتهت التجربة';
    }
    if (els.updateStatus) els.updateStatus.textContent = '';
  }
  function closeDoctor() { els.doctorOverlay.hidden = true; }
  function handleDoctorSubmit(e) {
    e.preventDefault();
    const name = els.docName.value.trim();
    if (!name) { els.docName.classList.add('invalid'); els.docName.focus(); return; }
    els.docName.classList.remove('invalid');
    settings.doctorName = name; settings.specialty = els.docSpecialty.value.trim(); settings.clinic = els.docClinic.value.trim();
    saveSettings(); applyDoctorLabel(); closeDoctor(); toast('تم حفظ بيانات الطبيب');
  }

  /* ============================================================
     نافذة المريض (إضافة/تعديل)
     ============================================================ */
  function openModal(patient) {
    els.form.reset(); els.fName.classList.remove('invalid');
    if (patient) {
      els.modalTitle.textContent = 'تعديل بيانات المريض';
      els.fId.value = patient.id; els.fName.value = patient.name || ''; els.fTreatment.value = patient.treatment || '';
      els.fSession.value = patient.session || ''; els.fPhone.value = patient.phone || '';
      els.fTotal.value = patient.total ?? ''; els.fPaid.value = patient.paid ?? ''; els.fSecond.value = patient.secondSession || '';
      els.fNotes.value = patient.notes || '';
    } else { els.modalTitle.textContent = 'إضافة مريض جديد'; els.fId.value = ''; }
    recalcRemaining(); els.overlay.hidden = false; setTimeout(() => els.fName.focus(), 50);
  }
  function closeModal() { els.overlay.hidden = true; }
  function recalcRemaining() { els.fRemaining.value = fmt(toNum(els.fTotal.value) - toNum(els.fPaid.value)); }
  function handleSubmit(e) {
    e.preventDefault();
    const name = els.fName.value.trim();
    if (!name) { els.fName.classList.add('invalid'); els.fName.focus(); return; }
    els.fName.classList.remove('invalid');
    const data = {
      name, treatment: els.fTreatment.value.trim(), session: els.fSession.value.trim(), phone: els.fPhone.value.trim(),
      total: toNum(els.fTotal.value), paid: toNum(els.fPaid.value), secondSession: els.fSecond.value || '', notes: els.fNotes.value.trim(),
    };
    const id = els.fId.value;
    if (id) { const i = patients.findIndex(p => p.id === id); if (i !== -1) patients[i] = Object.assign({}, patients[i], data); }
    else { data.id = uid(); data.sessions = []; data.completed = false; data.completedAt = ''; patients.unshift(data); }
    save(); refresh(); buildAlerts(false); closeModal();
    toast(id ? 'تم تحديث بيانات المريض' : 'تمت إضافة المريض');
  }

  /* ============================================================
     التأكيد العام
     ============================================================ */
  function confirmAsk(opts) {
    els.confirmTitle.textContent = opts.title || 'تأكيد';
    els.confirmText.textContent = opts.text || 'هل أنت متأكد؟';
    els.confirmOk.textContent = opts.okLabel || 'تأكيد';
    els.confirmOk.className = 'btn ' + (opts.danger === false ? 'btn-primary' : 'btn-danger');
    pendingConfirm = opts.onOk || null;
    els.confirmOverlay.hidden = false;
  }
  function confirmYes() { const fn = pendingConfirm; pendingConfirm = null; els.confirmOverlay.hidden = true; if (typeof fn === 'function') fn(); }
  function confirmNo() { pendingConfirm = null; els.confirmOverlay.hidden = true; }

  function askDelete(id) {
    const p = patients.find(x => x.id === id);
    confirmAsk({
      title: 'حذف المريض', text: 'هل تريد حذف المريض «' + (p ? p.name : '') + '»؟ لا يمكن التراجع.', okLabel: 'حذف',
      onOk: () => { patients = patients.filter(x => x.id !== id); if (attachments[id]) { delete attachments[id]; try { saveAttachments(); } catch (e) {} } save(); buildAlerts(false); if (currentView === 'file') go('patients'); else refresh(); toast('تم حذف المريض'); }
    });
  }

  /* ============================================================
     الجلسات (إضافة/تعديل/حذف/تعليم)
     ============================================================ */
  function openSession(pid, sessionId) {
    const p = patients.find(x => x.id === pid); if (!p) return;
    els.sessionForm.reset(); els.sessPatientId.value = pid; els.sessId.value = sessionId || '';
    if (sessionId) {
      const s = (p.sessions || []).find(x => x.id === sessionId);
      if (s) {
        els.sessionTitle.textContent = 'تعديل الجلسة';
        els.sessNumber.value = s.number || ''; els.sessDate.value = s.date || ''; els.sessTime.value = s.time || '';
        els.sessTreatment.value = s.treatment || ''; els.sessPaid.value = s.paid ?? ''; els.sessNext.value = s.next || '';
        els.sessNotes.value = s.notes || ''; els.sessCompleted.checked = !!s.completed;
      }
    } else {
      els.sessionTitle.textContent = 'إضافة جلسة';
      els.sessNumber.value = String(((p.sessions || []).length) + 1);
      els.sessDate.value = new Date().toISOString().slice(0, 10);
      els.sessTreatment.value = p.treatment || '';
      els.sessCompleted.checked = false;
    }
    els.sessionOverlay.hidden = false; setTimeout(() => els.sessDate.focus(), 50);
  }
  function closeSession() { els.sessionOverlay.hidden = true; }
  function handleSessionSubmit(e) {
    e.preventDefault();
    const pid = els.sessPatientId.value;
    const p = patients.find(x => x.id === pid); if (!p) { closeSession(); return; }
    if (!Array.isArray(p.sessions)) p.sessions = [];
    const data = {
      number: els.sessNumber.value.trim(), date: els.sessDate.value || '', time: els.sessTime.value || '',
      treatment: els.sessTreatment.value.trim(), paid: toNum(els.sessPaid.value), next: els.sessNext.value || '',
      notes: els.sessNotes.value.trim(), completed: els.sessCompleted.checked,
    };
    const sessionId = els.sessId.value;
    if (sessionId) { const i = p.sessions.findIndex(s => s.id === sessionId); if (i !== -1) p.sessions[i] = Object.assign({}, p.sessions[i], data); }
    else { data.id = sid('s'); p.sessions.push(data); }
    if (data.next) p.secondSession = data.next;   // الموعد القادم للمريض = موعد الجلسة (تحديث تلقائي)
    save(); renderActiveView(); buildAlerts(false); closeSession();
    toast(sessionId ? 'تم تحديث الجلسة' : 'تمت إضافة الجلسة');
  }
  function deleteSession(pid, sessionId) {
    const p = patients.find(x => x.id === pid); if (!p) return;
    confirmAsk({ title: 'حذف الجلسة', text: 'هل تريد حذف هذه الجلسة؟', okLabel: 'حذف',
      onOk: () => { p.sessions = (p.sessions || []).filter(s => s.id !== sessionId); save(); renderActiveView(); buildAlerts(false); toast('تم حذف الجلسة'); } });
  }
  function toggleSession(pid, sessionId) {
    const p = patients.find(x => x.id === pid); if (!p) return;
    const s = (p.sessions || []).find(x => x.id === sessionId); if (!s) return;
    s.completed = !s.completed; save(); renderActiveView();
  }

  /* ============================================================
     إنهاء العلاج / الاستعادة / الحذف النهائي
     ============================================================ */
  function finishTreatment(id) {
    const p = patients.find(x => x.id === id); if (!p) return;
    confirmAsk({
      title: 'إنهاء العلاج', text: 'هل تريد إنهاء علاج «' + p.name + '» ونقله إلى المرضى المكتملين؟ تُحفظ كل البيانات.',
      okLabel: 'إنهاء وأرشفة', danger: false,
      onOk: () => { p.completed = true; p.completedAt = new Date().toISOString(); save(); buildAlerts(false); go('completed'); toast('تم إنهاء العلاج وأرشفة المريض'); }
    });
  }
  function restorePatient(id) {
    const p = patients.find(x => x.id === id); if (!p) return;
    confirmAsk({
      title: 'استعادة المريض', text: 'إعادة «' + p.name + '» إلى المرضى الحاليين؟', okLabel: 'استعادة', danger: false,
      onOk: () => { p.completed = false; p.completedAt = ''; save(); buildAlerts(false); go('patients'); toast('تمت استعادة المريض'); }
    });
  }
  function purgePatient(id) {
    const p = patients.find(x => x.id === id); if (!p) return;
    confirmAsk({
      title: 'حذف نهائي', text: 'حذف «' + p.name + '» نهائياً مع كل جلساته ودفعاته؟ لا يمكن التراجع.', okLabel: 'حذف نهائي',
      onOk: () => { patients = patients.filter(x => x.id !== id); if (attachments[id]) { delete attachments[id]; try { saveAttachments(); } catch (e) {} } save(); buildAlerts(false); go('completed'); toast('تم الحذف النهائي'); }
    });
  }

  /* ============================================================
     طباعة ملف المريض (تقرير A4)
     ============================================================ */
  function printPatient(id) {
    const p = patients.find(x => x.id === id); if (!p) return;
    const tt = patientTotals(p);
    const reg = regDateFromId(p.id);
    const sessions = (p.sessions || []).slice().sort((a, b) => (toNum(a.number) - toNum(b.number)) || (new Date(sessionDateTime(a) || 0) - new Date(sessionDateTime(b) || 0)));
    const pays = patientPayments(p);

    const sessRows = sessions.length ? sessions.map(s => `
      <tr>
        <td>${escapeHtml(s.number) || '—'}</td>
        <td>${escapeHtml(fmtDate(s.date))}${s.date ? '<br><small>' + escapeHtml(weekday(s.date)) + (s.time ? ' • ' + escapeHtml(s.time) : '') + '</small>' : ''}</td>
        <td>${escapeHtml(s.treatment) || '—'}</td>
        <td>${escapeHtml(s.notes) || '—'}</td>
        <td>${fmt(toNum(s.paid))}</td>
        <td>${s.completed ? '✔' : '—'}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center">لا توجد جلسات</td></tr>';

    const payRows = pays.length ? pays.map(pay => `
      <tr><td>${escapeHtml(fmtDate(pay.date))}</td><td>${escapeHtml(weekday(pay.date)) || '—'}</td><td>${escapeHtml(String(pay.num))}</td><td>${fmt(pay.amount)}</td><td>${escapeHtml(pay.notes) || '—'}</td></tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center">لا توجد دفعات</td></tr>';

    const timeline = sessions.length ? sessions.map(s => `
      <div class="p-tl-item"><b>جلسة ${escapeHtml(s.number) || ''}</b> — ${escapeHtml(fmtDate(s.date))} (${escapeHtml(weekday(s.date))})${s.treatment ? ' — ' + escapeHtml(s.treatment) : ''}${toNum(s.paid) ? ' — مدفوع: ' + fmt(toNum(s.paid)) : ''}</div>`).join('') : '<div>لا توجد جلسات</div>';

    els.printArea.innerHTML = `
      <div class="print-doc">
        <div class="p-head">
          <img class="p-logo" src="icon-192.png" alt="DentPilot" />
          <div class="p-brand">
            <h1>DentPilot</h1>
            <div>${settings.clinic ? escapeHtml(settings.clinic) : 'عيادة الأسنان'}</div>
            <div>${settings.doctorName ? 'د. ' + escapeHtml(settings.doctorName) : ''}${settings.specialty ? ' — ' + escapeHtml(settings.specialty) : ''}</div>
          </div>
          <div class="p-meta">
            <div>تاريخ التقرير: ${escapeHtml(fmtDate(new Date().toISOString()))}</div>
            ${p.completed ? '<div>تاريخ الإكمال: ' + escapeHtml(fmtDate(p.completedAt)) + '</div>' : ''}
          </div>
        </div>

        <h2 class="p-section">معلومات المريض</h2>
        <table class="p-info">
          <tr><td>الاسم</td><td>${escapeHtml(p.name)}</td><td>الهاتف</td><td>${escapeHtml(p.phone) || '—'}</td></tr>
          <tr><td>نوع العلاج</td><td>${escapeHtml(p.treatment) || '—'}</td><td>تاريخ الإضافة</td><td>${reg ? escapeHtml(fmtDate(reg.toISOString())) : '—'}</td></tr>
          <tr><td>تكلفة العلاج</td><td>${fmt(tt.cost)}</td><td>إجمالي المدفوع</td><td>${fmt(tt.paid)}</td></tr>
          <tr><td>المبلغ المتبقي</td><td colspan="3"><b>${fmt(tt.remaining)}</b></td></tr>
        </table>

        ${p.notes ? '<h2 class="p-section">ملاحظات</h2><div class="p-notes">' + escapeHtml(p.notes) + '</div>' : ''}

        <h2 class="p-section">الخط الزمني للعلاج</h2>
        <div class="p-tl">${timeline}</div>

        <h2 class="p-section">الجلسات</h2>
        <table class="p-table">
          <thead><tr><th>#</th><th>التاريخ</th><th>العلاج</th><th>ملاحظات</th><th>مدفوع</th><th>تمّت</th></tr></thead>
          <tbody>${sessRows}</tbody>
        </table>

        <h2 class="p-section">سجل الدفعات</h2>
        <table class="p-table">
          <thead><tr><th>التاريخ</th><th>اليوم</th><th>الجلسة</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
          <tbody>${payRows}</tbody>
        </table>

        <div class="p-foot">
          <div>إجمالي المتبقي: <b>${fmt(tt.remaining)}</b></div>
          <div>تم إنشاء هذا التقرير بواسطة DentPilot</div>
        </div>
      </div>`;

    document.body.classList.add('printing');
    const cleanup = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => { window.print(); }, 60);
    setTimeout(cleanup, 1500); // احتياط لمتصفحات لا تطلق afterprint
  }

  /* ============================================================
     النسخة الاحتياطية
     ============================================================ */
  function exportBackup() {
    const data = { app: 'DentPilot', version: '2.0', exportedAt: new Date().toISOString(), settings, patients, attachments };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dentpilot-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('تم تصدير النسخة الاحتياطية');
  }
  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || !Array.isArray(obj.patients)) throw new Error('صيغة غير صالحة');
        patients = obj.patients; normalize();
        if (obj.settings && typeof obj.settings === 'object') settings = Object.assign({ doctorName: '', specialty: '', clinic: '' }, obj.settings);
        if (obj.attachments && typeof obj.attachments === 'object') { attachments = obj.attachments; try { saveAttachments(); } catch (e) {} }
        save(); saveSettings(); applyDoctorLabel(); refresh(); buildAlerts(false);
        toast('تم استيراد النسخة الاحتياطية بنجاح');
      } catch (err) { toast('تعذّر استيراد الملف — تأكد أنه نسخة DentPilot صحيحة'); }
    };
    reader.readAsText(file);
  }

  /* ============================================================
     ربط الأحداث
     ============================================================ */
  function bindEvents() {
    els.doctorForm.addEventListener('submit', handleDoctorSubmit);
    if (els.updateNowBtn) els.updateNowBtn.addEventListener('click', applyUpdate);
    if (els.updateLaterBtn) els.updateLaterBtn.addEventListener('click', function () { els.updateOverlay.hidden = true; });
    if (els.checkUpdateBtn) els.checkUpdateBtn.addEventListener('click', checkForUpdates);
    els.doctorClose.addEventListener('click', closeDoctor);
    els.doctorCancel.addEventListener('click', closeDoctor);

    document.querySelectorAll('.dash-card').forEach(card => card.addEventListener('click', () => go(card.dataset.go)));
    els.backBtn.addEventListener('click', goBack);

    els.addBtn.addEventListener('click', () => openModal(null));
    els.completedBtn.addEventListener('click', () => go('completed'));
    els.modalClose.addEventListener('click', closeModal);
    els.cancelBtn.addEventListener('click', closeModal);
    els.form.addEventListener('submit', handleSubmit);
    els.fTotal.addEventListener('input', recalcRemaining);
    els.fPaid.addEventListener('input', recalcRemaining);
    els.search.addEventListener('input', debounce(renderPatients, 120));

    // الجلسة
    els.sessionForm.addEventListener('submit', handleSessionSubmit);
    els.sessionClose.addEventListener('click', closeSession);
    els.sessionCancel.addEventListener('click', closeSession);

    // تفويض الأحداث
    $('app').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const id = btn.dataset.id, act = btn.dataset.act;
      if (act === 'open') openFile(id);
      else if (act === 'edit') { const p = patients.find(x => x.id === id); if (p) openModal(p); }
      else if (act === 'del') askDelete(id);
      else if (act === 'finish') finishTreatment(id);
      else if (act === 'restore') restorePatient(id);
      else if (act === 'purge') purgePatient(id);
      else if (act === 'print') printPatient(id);
      else if (act === 'sess-add') openSession(id, '');
      else if (act === 'sess-edit') openSession(id, btn.dataset.sid);
      else if (act === 'sess-del') deleteSession(id, btn.dataset.sid);
      else if (act === 'sess-toggle') toggleSession(id, btn.dataset.sid);
      else if (act === 'att-add') triggerAttach(id);
      else if (act === 'att-del') deleteAttachment(id, btn.dataset.att);
      else if (act === 'att-open') openAttachment(id, btn.dataset.att);
      else if (act === 'copy') copyText(btn.dataset.copy);
      else if (act === 'open-activation') openActivation();
    });

    // مدخل المرفقات يُعاد إنشاؤه مع كل عرض — تفويض حدث التغيير
    $('app').addEventListener('change', (e) => {
      if (e.target && e.target.id === 'attInput') { const pid = e.target.dataset.id; addAttachments(pid, e.target.files); e.target.value = ''; }
    });

    // تأكيد عام
    els.confirmOk.addEventListener('click', confirmYes);
    els.confirmCancel.addEventListener('click', confirmNo);

    // معاينة المرفقات (Lightbox)
    var _lbClose = $('attLbClose'); if (_lbClose) _lbClose.addEventListener('click', closeLightbox);
    var _lb = $('attLightbox');
    if (_lb) _lb.addEventListener('click', function (e) { if (e.target === _lb) closeLightbox(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var b = $('attLightbox'); if (b && !b.hidden) closeLightbox(); } });

    // النسخة الاحتياطية
    els.exportBtn.addEventListener('click', exportBackup);
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importBackup(f); e.target.value = ''; });

    // التنبيه
    els.bellBtn.addEventListener('click', () => {
      const c = buildAlerts(true);
      if (c === 0) {
        els.alertBanner.hidden = false;
        els.alertList.innerHTML = '<li style="background:var(--teal-100)">لا توجد مواعيد قريبة لليوم أو الغد.</li>';
        setTimeout(() => { if (c === 0) els.alertBanner.hidden = true; }, 2500);
      }
    });
    els.alertClose.addEventListener('click', () => { els.alertBanner.hidden = true; });

    const overlays = [els.overlay, els.confirmOverlay, els.sessionOverlay].filter(Boolean);
    overlays.forEach(ov => ov.addEventListener('click', (e) => { if (e.target === ov) ov.hidden = true; }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { overlays.forEach(ov => ov.hidden = true); if (settings.doctorName) els.doctorOverlay.hidden = true; }
    });

    window.addEventListener('hashchange', applyRoute);

    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (els.installBtn) els.installBtn.hidden = false; });
    if (els.installBtn) els.installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return; deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (e) {}
      deferredPrompt = null; els.installBtn.hidden = true;
    });
    window.addEventListener('appinstalled', () => { if (els.installBtn) els.installBtn.hidden = true; });
  }

  /* ---------- شريط التجربة + نظام تحديث PWA الآمن ---------- */
  function updateTrialBanner() {
    if (!window.DPLicense || !els.trialBanner) return;
    var st = window.DPLicense.getAccessState();
    if (st === 'trial') {
      var h = window.DPLicense.trialRemainingHours();
      els.trialText.textContent = 'الفترة التجريبية المجانية (3 أيام) — متبقٍ: ' + h + ' ساعة.';
      els.trialBanner.hidden = false;
    } else { els.trialBanner.hidden = true; }
  }

  var swReg = null, _refreshing = false;
  function showUpdate() { if (els.updateOverlay) els.updateOverlay.hidden = false; }
  function applyUpdate() {
    if (els.updateOverlay) els.updateOverlay.hidden = true;
    if (swReg && swReg.waiting) swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    else window.location.reload();
  }
  function checkForUpdates() {
    if (!('serviceWorker' in navigator) || !swReg) { if (els.updateStatus) els.updateStatus.textContent = 'التحديث غير متاح في هذا السياق.'; return; }
    if (els.updateStatus) els.updateStatus.textContent = 'جارٍ التحقق…';
    var handled = false;
    swReg.update().then(function () {
      setTimeout(function () { if (swReg.waiting && navigator.serviceWorker.controller) { handled = true; if (els.updateStatus) els.updateStatus.textContent = 'يتوفّر تحديث جديد.'; showUpdate(); } }, 700);
    }).catch(function () {});
    fetch('version.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (handled) return;
      if (j && j.version && j.version !== APP_VERSION) { if (els.updateStatus) els.updateStatus.textContent = 'يتوفّر تحديث (' + j.version + '). سيُطبَّق عند إعادة فتح التطبيق.'; }
      else if (!swReg.waiting) { if (els.updateStatus) els.updateStatus.textContent = 'أنت على أحدث إصدار (' + APP_VERSION + ').'; }
    }).catch(function () { if (!handled && els.updateStatus) els.updateStatus.textContent = 'تعذّر التحقق (لا يوجد اتصال؟).'; });
  }

  function setupPWA() {
    window.addEventListener('load', () => {
      const s = els.splash; if (s) setTimeout(() => s.remove(), 1600);
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('service-worker.js').then((reg) => {
        swReg = reg;
        if (reg.waiting && navigator.serviceWorker.controller) showUpdate();
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(); });
        });
      }).catch(() => {});
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (_refreshing) return; _refreshing = true; window.location.reload(); });
    });
  }

  function init() {
    loadSettings(); load(); normalize(); loadAttachments();
    bindEvents();
    applyDoctorLabel();
    applyRoute();
    buildAlerts(true);
    setupPWA();
    // بوابة الوصول: مُفعّل/تجربة → إعداد الطبيب عند اللزوم؛ منتهية → التفعيل يحظر (activation.js)
    var _needDoctor = function () { if (!settings.doctorName) openDoctor(false); };
    var _state = window.DPLicense ? window.DPLicense.getAccessState() : 'activated';
    if (_state !== 'expired') _needDoctor();
    if (window.DPLicense) window.DPLicense.onActivated = function () {
      if (els.trialBanner) els.trialBanner.hidden = true;   // إخفاء الشريط بعد التفعيل
      _needDoctor();
      if (els.doctorOverlay && !els.doctorOverlay.hidden) updateSettingsStatus();
    };
    updateTrialBanner();
    setInterval(updateTrialBanner, 60000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
