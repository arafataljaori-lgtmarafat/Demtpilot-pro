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
  const APP_VERSION = '2.5.1';
  const els = {
    splash: $('splash'), backBtn: $('backBtn'), installBtn: $('installBtn'), docLabel: $('docLabel'),
    trialBanner: $('trialBanner'), trialText: $('trialText'),
    updateOverlay: $('updateOverlay'), updateNowBtn: $('updateNowBtn'), updateLaterBtn: $('updateLaterBtn'),
    settingsExtra: $('settingsExtra'), accessStatus: $('accessStatus'), appVersion: $('appVersion'), checkUpdateBtn: $('checkUpdateBtn'), updateStatus: $('updateStatus'),
    // إعداد الطبيب
    doctorOverlay: $('doctorOverlay'), doctorForm: $('doctorForm'), doctorClose: $('doctorClose'),
    doctorCancel: $('doctorCancel'), doctorTitle: $('doctorTitle'), doctorHint: $('doctorHint'),
    docName: $('docName'), docSpecialty: $('docSpecialty'), docClinic: $('docClinic'),
    // عناصر بصرية إضافية للصفحة الرئيسية فقط (لا تغيّر أي منطق — عرض فقط)
    heroDoctorName: $('heroDoctorName'), heroMeta: $('heroMeta'),
    trialHours: $('trialHours'), trialRingFg: $('trialRingFg'),
    // لوحة التحكم
    dcPatients: $('dcPatients'), dcToday: $('dcToday'), dcLate: $('dcLate'), todayList: $('todayList'),
    // المرضى
    patientsList: $('patientsList'), empty: $('emptyState'), search: $('searchInput'),
    patientsFilterBar: $('patientsFilterBar'),
    addBtn: $('addBtn'), completedBtn: $('completedBtn'), completedCount: $('completedCount'),
    // المكتملون
    completedList: $('completedList'), completedEmpty: $('completedEmpty'),
    // المتأخرة
    lateList: $('lateList'), lateEmpty: $('lateEmpty'),
    // إحصائيات / تقارير
    statsContent: $('statsContent'), reportsContent: $('reportsContent'),
    // نسخة احتياطية
    exportBtn: $('exportBtn'), importBtn: $('importBtn'), importFile: $('importFile'), gdriveBackupBtn: $('gdriveBackupBtn'),
    // نافذة المريض
    overlay: $('modalOverlay'), modalTitle: $('modalTitle'), modalClose: $('modalClose'),
    cancelBtn: $('cancelBtn'), form: $('patientForm'),
    fId: $('patientId'), fName: $('name'), fTreatment: $('treatment'), fSession: $('session'),
    fPhone: $('phone'), fTotal: $('total'), fPaid: $('paid'), fRemaining: $('remaining'), fSecond: $('secondSession'), fNotes: $('notes'),
    pickContactBtn: $('pickContactBtn'),
    // بيانات ديموغرافية إضافية (متوافقة الإضافة — لا تمسّ الحقول القديمة)
    fAge: $('age'), fGender: $('gender'), genderChips: $('genderChips'),
    // حقل «نوع العمل» المخصّص (Treatment Picker)
    treatmentTrigger: $('treatmentTrigger'), treatmentDisplay: $('treatmentDisplay'),
    treatmentOtherWrap: $('treatmentOtherWrap'), treatmentOther: $('treatmentOther'),
    treatmentPicker: $('treatmentPicker'), tpickBackdrop: $('tpickBackdrop'), tpickClose: $('tpickClose'),
    // لوحة الاختيار العامة (تُستخدم لكل الحقول الفرعية الديناميكية)
    genericPicker: $('genericPicker'), gpickBackdrop: $('gpickBackdrop'), gpickClose: $('gpickClose'),
    gpickTitle: $('gpickTitle'), gpickList: $('gpickList'),
    // الحقول الديناميكية حسب نوع الحالة
    clinicalSection: $('clinicalSection'),
    opTooth: $('opTooth'), opClassTrigger: $('opClassTrigger'), opClassDisplay: $('opClassDisplay'), opClass: $('opClass'),
    opClassOtherWrap: $('opClassOtherWrap'), opClassOther: $('opClassOther'),
    opMaterialTrigger: $('opMaterialTrigger'), opMaterialDisplay: $('opMaterialDisplay'), opMaterial: $('opMaterial'),
    opMaterialOtherWrap: $('opMaterialOtherWrap'), opMaterialOther: $('opMaterialOther'),
    endoTooth: $('endoTooth'), endoDiagnosisTrigger: $('endoDiagnosisTrigger'), endoDiagnosisDisplay: $('endoDiagnosisDisplay'), endoDiagnosis: $('endoDiagnosis'),
    canalsList: $('canalsList'), addCanalBtn: $('addCanalBtn'),
    cleanProcTrigger: $('cleanProcTrigger'), cleanProcDisplay: $('cleanProcDisplay'), cleanProc: $('cleanProc'),
    cleanProcOtherWrap: $('cleanProcOtherWrap'), cleanProcOther: $('cleanProcOther'),
    gumStatusChips: $('gumStatusChips'), gumStatus: $('gumStatus'), calculusNotes: $('calculusNotes'),
    orthoVisitTrigger: $('orthoVisitTrigger'), orthoVisitDisplay: $('orthoVisitDisplay'), orthoVisit: $('orthoVisit'),
    orthoDiagnosis: $('orthoDiagnosis'), orthoNotes: $('orthoNotes'),
    surgTooth: $('surgTooth'), surgProcTrigger: $('surgProcTrigger'), surgProcDisplay: $('surgProcDisplay'), surgProc: $('surgProc'),
    surgProcOtherWrap: $('surgProcOtherWrap'), surgProcOther: $('surgProcOther'), surgPostOp: $('surgPostOp'),
    reviewReason: $('reviewReason'), reviewResult: $('reviewResult'), reviewNotes: $('reviewNotes'),
    pedTooth: $('pedTooth'), pedTreatTrigger: $('pedTreatTrigger'), pedTreatDisplay: $('pedTreatDisplay'), pedTreat: $('pedTreat'),
    pedBehaviorChips: $('pedBehaviorChips'), pedBehavior: $('pedBehavior'), guardianNotes: $('guardianNotes'),
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
  let patientsFilter = 'all'; // 'all' | 'today' | 'late' | 'upcoming' — فلترة عرض فقط، لا تغيير في البيانات

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

  /* ============================================================
     أيقونات SVG موحّدة (Stroke، بلا Emoji) — بصري فقط، تُستخدم في
     قائمة المرضى وملف المريض وإضافة مريض. لا تُقرأ أو تُعالج من أي
     منطق؛ استبدال بصري بحت لرموز الإيموجي القديمة.
     ============================================================ */
  const ICO = {
    open:     '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2h8.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>',
    call:     '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16.5v2.6a1.6 1.6 0 0 1-1.8 1.6A18.2 18.2 0 0 1 3.3 4.8 1.6 1.6 0 0 1 4.9 3h2.6a1.6 1.6 0 0 1 1.6 1.4c.1.9.3 1.8.7 2.7a1.6 1.6 0 0 1-.4 1.7L8.3 9.9a15.3 15.3 0 0 0 5.8 5.8l1.1-1.1a1.6 1.6 0 0 1 1.7-.4c.9.4 1.8.6 2.7.7a1.6 1.6 0 0 1 1.4 1.6z"/></svg>',
    wa:       '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z"/><path d="M8.8 9.2c0 3.3 2.7 6 6 6l1.3-1.3-1.9-1.2-1 .7a4.6 4.6 0 0 1-2.6-2.6l.7-1-1.2-1.9z"/></svg>',
    print:    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8.5V4h10v4.5"/><rect x="4.5" y="8.5" width="15" height="7.5" rx="1.6"/><path d="M7 14.5h10V20H7z"/></svg>',
    restore:  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.5A8.5 8.5 0 1 1 5 15.5"/><path d="M3.5 4.5v5h5"/></svg>',
    trash:    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M18 7l-.8 12.1A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.9L6 7"/><path d="M10 11v6M14 11v6"/></svg>',
    edit:     '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3"/><path d="M14 7l3 3"/></svg>',
    check:    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.4 2.4 5-5"/></svg>',
    circle:   '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8.5"/></svg>',
    plus:     '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    user:     '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 20v-1.2A4.3 4.3 0 0 1 8.8 14.5h6.4a4.3 4.3 0 0 1 4.3 4.3V20"/><circle cx="12" cy="7.3" r="3.8"/></svg>',
    tooth:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 3.2C5.4 3.2 4 4.9 4 7.2c0 1.6.4 2.6.8 4.2.5 1.9.5 3 .8 4.7.3 1.7.6 4 1.6 4 1 0 1.2-1.6 1.5-3.1.3-1.5.5-2.7 1.7-2.7s1.4 1.2 1.7 2.7c.3 1.5.5 3.1 1.5 3.1 1 0 1.3-2.3 1.6-4 .3-1.7.3-2.8.8-4.7.4-1.6.8-2.6.8-4.2C20 4.9 18.6 3.2 16.5 3.2c-1.7 0-2.6.9-4.5.9s-2.8-.9-4.5-.9Z"/></svg>',
    money:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.4"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v0M18 15v0"/></svg>',
    warn:     '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6 2.8 19.5a1.2 1.2 0 0 0 1 1.8h16.4a1.2 1.2 0 0 0 1-1.8z"/><path d="M12 9.5v4.2M12 17.4h.01"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M15.5 3v4M8.5 3v4M3.5 9.5h17"/></svg>',
    clock:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    note:     '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h9l3.5 3.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M14.5 3.5V7a1 1 0 0 0 1 1h3.5"/><path d="M8 12h8M8 15.5h5.5"/></svg>',
    wallet:   '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a1 1 0 0 1 1 1v2"/><path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20H19a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z"/><circle cx="16.2" cy="14" r="1.4"/></svg>',
    paperclip:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12.5l6.5-6.5a3 3 0 0 1 4.2 4.2l-8 8a5 5 0 0 1-7-7l7.3-7.3"/></svg>',
    filePdf:  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M14 3.5V7a1 1 0 0 0 1 1h3.5"/><path d="M8 14h1.2a1.2 1.2 0 1 1 0 2.4H8zM12.3 14v3.4M15 14h1.4v3.4H15"/></svg>',
    fileGeneric:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M14 3.5V7a1 1 0 0 0 1 1h3.5"/></svg>',
    back:     '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    phone:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16.5v2.6a1.6 1.6 0 0 1-1.8 1.6A18.2 18.2 0 0 1 3.3 4.8 1.6 1.6 0 0 1 4.9 3h2.6a1.6 1.6 0 0 1 1.6 1.4c.1.9.3 1.8.7 2.7a1.6 1.6 0 0 1-.4 1.7L8.3 9.9a15.3 15.3 0 0 0 5.8 5.8l1.1-1.1a1.6 1.6 0 0 1 1.7-.4c.9.4 1.8.6 2.7.7a1.6 1.6 0 0 1 1.4 1.6z"/></svg>',
  };

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
    return p ? `<a class="card-btn call ${cls}" href="tel:${encodeURIComponent(p)}" title="اتصال">${ICO.call}${label}</a>`
             : `<span class="card-btn call disabled ${cls}" title="لا يوجد رقم">${ICO.call}${label}</span>`;
  }
  function waLink(phone, cls, label) {
    const d = phoneDigits(phone);
    return d ? `<a class="card-btn wa ${cls}" href="https://wa.me/${d}" target="_blank" rel="noopener" title="واتساب">${ICO.wa}${label}</a>`
             : `<span class="card-btn wa disabled ${cls}" title="لا يوجد رقم">${ICO.wa}${label}</span>`;
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
    // أيقونات SVG موحّدة (Stroke) لبطاقات مواعيد اليوم — بصري فقط، نفس الإجراءات والروابط تماماً
    const svgOpen = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2h8.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>';
    const svgCall = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16.5v2.6a1.6 1.6 0 0 1-1.8 1.6A18.2 18.2 0 0 1 3.3 4.8 1.6 1.6 0 0 1 4.9 3h2.6a1.6 1.6 0 0 1 1.6 1.4c.1.9.3 1.8.7 2.7a1.6 1.6 0 0 1-.4 1.7L8.3 9.9a15.3 15.3 0 0 0 5.8 5.8l1.1-1.1a1.6 1.6 0 0 1 1.7-.4c.9.4 1.8.6 2.7.7a1.6 1.6 0 0 1 1.4 1.6z"/></svg>';
    const svgWa = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z"/><path d="M8.8 9.2c0 3.3 2.7 6 6 6l1.3-1.3-1.9-1.2-1 .7a4.6 4.6 0 0 1-2.6-2.6l.7-1-1.2-1.9z"/></svg>';
    const todayCall = (phone) => {
      const p = (phone || '').trim();
      return p ? `<a class="card-btn call icon-only" href="tel:${encodeURIComponent(p)}" title="اتصال">${svgCall}</a>`
               : `<span class="card-btn call disabled icon-only" title="لا يوجد رقم">${svgCall}</span>`;
    };
    const todayWa = (phone) => {
      const d = phoneDigits(phone);
      return d ? `<a class="card-btn wa icon-only" href="https://wa.me/${d}" target="_blank" rel="noopener" title="واتساب">${svgWa}</a>`
               : `<span class="card-btn wa disabled icon-only" title="لا يوجد رقم">${svgWa}</span>`;
    };
    els.todayList.innerHTML = list.map(p => `
      <div class="appt-item">
        <div class="appt-when"><span class="lbl">اليوم</span><span class="t">${escapeHtml(fmtTime(p.secondSession))}</span></div>
        <div class="appt-main"><div class="nm">${escapeHtml(p.name)}</div><div class="tr">${escapeHtml(p.treatment) || 'بدون تفاصيل علاج'}</div></div>
        <div class="appt-btns">
          <button class="card-btn open icon-only" data-act="open" data-id="${p.id}" title="فتح الملف">${svgOpen}</button>
          ${todayCall(p.phone)}
          ${todayWa(p.phone)}
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
          <div class="pcard-treat">
            <span class="pcard-treat-ico" aria-hidden="true">${ICO.tooth}</span>
            <span>${escapeHtml(p.treatment) || 'بدون نوع علاج'}</span>
          </div>
          ${p.phone ? `<div class="pcard-phone"><span aria-hidden="true">${ICO.phone}</span><span>${escapeHtml(p.phone)}</span></div>` : ''}
        </div>
        <span class="pcard-status st-${st.key}">${st.label}</span>
      </div>
      <div class="pcard-money">
        <span><i>التكلفة</i><b>${fmt(t.cost)}</b></span>
        <span><i>المدفوع</i><b>${fmt(t.paid)}</b></span>
        <span class="rem"><i>المتبقي</i><b class="${remCls}">${fmt(t.remaining)}</b></span>
      </div>
      <div class="pcard-sub">
        <span class="ps-appt">
          <span aria-hidden="true">${ICO.calendar}</span>
          <span>${appt}</span>
        </span>
      </div>
      <div class="pcard-actions">
        <button class="card-btn open primary" data-act="open" data-id="${p.id}">${ICO.open} فتح الملف</button>
        ${callLink(p.phone, 'icon-only', '')}
        ${waLink(p.phone, 'icon-only', '')}
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
          <div class="pcard-treat">
            <span class="pcard-treat-ico" aria-hidden="true">${ICO.tooth}</span>
            <span>${escapeHtml(p.treatment) || 'بدون نوع علاج'}</span>
          </div>
          ${p.phone ? `<div class="pcard-phone"><span aria-hidden="true">${ICO.phone}</span><span>${escapeHtml(p.phone)}</span></div>` : ''}
        </div>
        <span class="pcard-status st-done">${ICO.checkCircle} مكتمل</span>
      </div>
      <div class="pcard-money">
        <span><i>التكلفة</i><b>${fmt(t.cost)}</b></span>
        <span><i>المدفوع</i><b>${fmt(t.paid)}</b></span>
        <span class="rem"><i>المتبقي</i><b class="${remCls}">${fmt(t.remaining)}</b></span>
      </div>
      <div class="pcard-sub"><span class="ps-appt"><span aria-hidden="true">${ICO.calendar}</span><span>اكتمل في: ${escapeHtml(fmtDate(p.completedAt))}</span></span></div>
      <div class="pcard-actions">
        <button class="card-btn open primary" data-act="open" data-id="${p.id}">${ICO.open} فتح الملف</button>
        <button class="card-btn print" data-act="print" data-id="${p.id}">${ICO.print} طباعة</button>
        <button class="card-btn restore" data-act="restore" data-id="${p.id}">${ICO.restore} استعادة</button>
        <button class="card-btn del" data-act="purge" data-id="${p.id}">${ICO.trash} حذف نهائي</button>
      </div>
    </div>`;
  }

  function renderPatients() {
    const q = els.search.value.trim().toLowerCase();
    const base = activePatients();
    let list = q ? base.filter(p =>
      (p.name || '').toLowerCase().includes(q) || (p.phone || '').toLowerCase().includes(q) || (p.treatment || '').toLowerCase().includes(q)
    ) : base;
    if (patientsFilter !== 'all') {
      list = list.filter(p => {
        const k = statusOf(p).key;
        if (patientsFilter === 'upcoming') return k === 'upcoming' || k === 'tomorrow';
        return k === patientsFilter;
      });
    }
    if (els.patientsFilterBar) {
      els.patientsFilterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === patientsFilter));
    }
    if (base.length === 0) {
      els.patientsList.innerHTML = ''; els.empty.hidden = false;
      els.empty.querySelector('p').textContent = 'لا يوجد مرضى مسجّلون بعد.';
      els.empty.querySelector('span').textContent = 'اضغط «إضافة مريض» لبدء تسجيل أول مريض.';
    } else if (list.length === 0) {
      els.patientsList.innerHTML = ''; els.empty.hidden = false;
      els.empty.querySelector('p').textContent = 'لا توجد نتائج مطابقة.';
      els.empty.querySelector('span').textContent = 'جرّب البحث بالاسم أو رقم الهاتف أو نوع العلاج، أو غيّر الفلتر.';
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
        <button class="card-btn print" data-act="print" data-id="${p.id}">${ICO.print} طباعة</button>
        <button class="card-btn restore" data-act="restore" data-id="${p.id}">${ICO.restore} استعادة</button>
        <button class="card-btn del" data-act="purge" data-id="${p.id}">${ICO.trash} حذف نهائي</button>` : `
        ${callLink(p.phone, '', ' اتصال')}
        ${waLink(p.phone, '', ' واتساب')}
        <button class="card-btn edit" data-act="edit" data-id="${p.id}">${ICO.edit} تعديل</button>
        <button class="card-btn print" data-act="print" data-id="${p.id}">${ICO.print} طباعة</button>
        <button class="card-btn complete" data-act="finish" data-id="${p.id}">${ICO.checkCircle} إنهاء العلاج</button>
        <button class="card-btn del" data-act="del" data-id="${p.id}">${ICO.trash} حذف</button>`;

    const quickNav = `<nav class="file-quicknav" aria-label="التنقل داخل ملف المريض">
        <a href="#fsInfo">${ICO.user}<span>المعلومات</span></a>
        <a href="#fsSessions">${ICO.tooth}<span>الجلسات</span></a>
        <a href="#fsPayments">${ICO.wallet}<span>الدفعات</span></a>
        <a href="#fsAttachments">${ICO.paperclip}<span>المرفقات</span></a>
        ${p.notes ? `<a href="#fsNotes">${ICO.note}<span>ملاحظات</span></a>` : ''}
      </nav>`;

    fb.innerHTML = `
      <div class="file-hero ${p.completed ? 'done' : ''}">
        <span class="file-hero-grid" aria-hidden="true"></span>
        <span class="file-avatar">${escapeHtml(initial(p.name))}</span>
        <div class="file-hero-main">
          <h2>${escapeHtml(p.name)}</h2>
          <div class="file-hero-sub"><span aria-hidden="true">${ICO.tooth}</span>${escapeHtml(p.treatment) || 'بدون نوع علاج'}</div>
        </div>
        <span class="file-status ${p.completed ? 'st-done' : 'st-' + st.key}">${p.completed ? ICO.checkCircle + ' مكتمل' : st.label}</span>
      </div>

      ${p.completed ? `<div class="done-banner">تم إنهاء علاج هذا المريض وأرشفته في ${escapeHtml(fmtDateTime(p.completedAt))}.</div>` : ''}

      <div class="file-actions">${actions}</div>

      ${quickNav}

      <div class="file-block" id="fsInfo">
        <div class="fs-head plain"><span class="fs-ico">${ICO.user}</span><h3>معلومات المريض</h3></div>
        <div class="info-grid">
          ${info(ICO.user, 'الاسم', escapeHtml(p.name))}
          ${info(ICO.phone, 'رقم الهاتف', escapeHtml(p.phone) || '—')}
          ${info(ICO.tooth, 'نوع العلاج', escapeHtml(p.treatment) || '—')}
          ${info(ICO.money, 'تكلفة العلاج', fmt(tt.cost))}
          ${info(ICO.check, 'إجمالي المدفوع', fmt(tt.paid))}
          ${info(ICO.warn, 'المبلغ المتبقي', fmt(tt.remaining), remCls)}
          ${info(ICO.calendar, 'الموعد القادم', apptStr)}
          ${info(ICO.clock, 'تاريخ الإضافة', regStr)}
        </div>
      </div>

      ${sessionsSection(p)}
      ${paymentsSection(p)}
      ${attachmentsSection(p)}
      ${notesSection(p)}
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
            <button class="mini-btn ${s.completed ? 'on' : ''}" data-act="sess-toggle" data-id="${p.id}" data-sid="${s.id}" title="${s.completed ? 'مكتملة' : 'تعليم كمكتملة'}">${s.completed ? ICO.checkCircle : ICO.circle}</button>
            <button class="mini-btn" data-act="sess-edit" data-id="${p.id}" data-sid="${s.id}" title="تعديل">${ICO.edit}</button>
            <button class="mini-btn del" data-act="sess-del" data-id="${p.id}" data-sid="${s.id}" title="حذف">${ICO.trash}</button>
          </span>
        </div>
        ${s.treatment ? `<div class="sess-treat">${ICO.tooth} ${escapeHtml(s.treatment)}</div>` : ''}
        ${s.notes ? `<div class="sess-note">${ICO.note} ${escapeHtml(s.notes)}</div>` : ''}
        <div class="sess-foot">
          <span class="sess-paid">${ICO.wallet} مدفوع: <b>${fmt(toNum(s.paid))}</b></span>
          ${s.next ? `<span class="sess-next">${ICO.calendar} القادم: ${escapeHtml(fmtDateTime(s.next))} • ${escapeHtml(weekday(s.next))}</span>` : ''}
        </div>
      </div>`;
    }).join('') : '<div class="sub-empty">لا توجد جلسات بعد. اضغط «إضافة جلسة».</div>';

    return `<div class="file-section" id="fsSessions">
      <div class="fs-head"><span class="fs-ico">${ICO.tooth}</span><h3>جلسات العلاج</h3>
        ${p.completed ? '' : `<button class="card-btn open" data-act="sess-add" data-id="${p.id}">${ICO.plus} إضافة جلسة</button>`}</div>
      <div class="fs-body">${body}</div>
    </div>`;
  }

  /* ---------- سجل الدفعات: جدول حي مشتق من الجلسات الفعلية ----------
     مصدر البيانات بالكامل: p.paid (الدفعة المبدئية) + كل جلسة s.paid/s.date/
     s.time/s.number/s.treatment/s.notes الموجودة أصلاً — لا تخزين جديد، لا
     تغيير في طريقة حفظ الجلسات، فقط اشتقاق وعرض. ترتيب تصاعدي (الأقدم أولاً)
     مع حساب «المتبقي» تراكمياً بعد كل دفعة. ---------- */
  function paymentsTableRows(p) {
    const cost = toNum(p.total);
    const reg = regDateFromId(p.id);
    const rows = [];
    if (toNum(p.paid) > 0) {
      rows.push({ date: reg ? reg.toISOString() : '', sessionNum: '—', treatment: p.treatment || '—', amount: toNum(p.paid), notes: 'دفعة مبدئية عند التسجيل' });
    }
    (p.sessions || []).slice()
      .sort((a, b) => (new Date(sessionDateTime(a) || 0) - new Date(sessionDateTime(b) || 0)) || (toNum(a.number) - toNum(b.number)))
      .forEach(s => {
        if (toNum(s.paid) > 0) {
          rows.push({ date: sessionDateTime(s), sessionNum: s.number || '—', treatment: s.treatment || p.treatment || '—', amount: toNum(s.paid), notes: s.notes || '' });
        }
      });
    rows.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    let running = 0;
    return rows.map(r => { running += r.amount; return Object.assign({}, r, { remainingAfter: cost - running }); });
  }

  /* ---------- سجل الدفعات (جدول حي، الأقدم أولاً، مرتبط بالجلسات) ---------- */
  function paymentsSection(p) {
    const rows = paymentsTableRows(p);
    const tt = patientTotals(p);
    const summary = `<div class="pay-summary">
      <div class="pay-sum-item"><span>تكلفة العلاج</span><b>${fmt(tt.cost)}</b></div>
      <div class="pay-sum-item"><span>إجمالي المدفوع</span><b class="ok">${fmt(tt.paid)}</b></div>
      <div class="pay-sum-item"><span>المتبقي</span><b class="${tt.remaining > 0 ? 'due' : 'ok'}">${fmt(tt.remaining)}</b></div>
    </div>`;
    const body = rows.length ? `<div class="pay-table">${rows.map(r => `
      <div class="pay-trow">
        <div class="pay-trow-top">
          <span class="pay-date-badge">${escapeHtml(fmtDate(r.date))}${r.date ? ' • ' + escapeHtml(weekday(r.date)) : ''}</span>
          <span class="pay-sess-badge">جلسة ${escapeHtml(String(r.sessionNum))}</span>
        </div>
        <div class="pay-trow-treat">${escapeHtml(r.treatment)}</div>
        <div class="pay-trow-bottom">
          <span class="pay-paid">مدفوع: <b>${fmt(r.amount)}</b></span>
          <span class="pay-remain">المتبقي بعدها: <b>${fmt(r.remainingAfter)}</b></span>
        </div>
        ${r.notes ? `<div class="pay-trow-notes">${escapeHtml(r.notes)}</div>` : ''}
      </div>`).join('')}</div>` : '<div class="sub-empty">لا توجد دفعات مسجّلة بعد. تُسجَّل الدفعات تلقائياً عند إضافة المبلغ المدفوع في الجلسة.</div>';

    return `<div class="file-section" id="fsPayments">
      <div class="fs-head"><span class="fs-ico">${ICO.wallet}</span><h3>سجل الدفعات</h3><span class="fs-badge">${fmt(tt.paid)}</span></div>
      <div class="fs-body">${summary}${body}</div>
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
        : `<button type="button" class="att-thumb file" data-act="att-open" data-id="${p.id}" data-att="${a.id}" title="فتح"><span>${isPdf ? ICO.filePdf : ICO.fileGeneric}</span></button>`;
      return `<div class="att-card">
        ${thumb}
        <div class="att-name" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</div>
        <button class="mini-btn del" data-act="att-del" data-id="${p.id}" data-att="${a.id}" title="حذف">${ICO.trash}</button>
      </div>`;
    }).join('')}</div>` : '<div class="sub-empty">لا توجد مرفقات بعد. أضف صورة أشعة أو صورة أسنان أو مستنداً.</div>';

    return `<div class="file-section" id="fsAttachments">
      <div class="fs-head"><span class="fs-ico">${ICO.paperclip}</span><h3>المرفقات</h3>
        <button class="card-btn open" data-act="att-add" data-id="${p.id}">${ICO.plus} إضافة مرفق</button></div>
      <input type="file" id="attInput" data-id="${p.id}" accept="image/*,application/pdf" multiple hidden />
      <div class="fs-body">${body}</div>
    </div>`;
  }

  /* ---------- ملاحظات المريض (قسم مستقل — نفس الحقل p.notes، عرض فقط) ---------- */
  function notesSection(p) {
    if (!p.notes) return '';
    return `<div class="file-section" id="fsNotes">
      <div class="fs-head plain"><span class="fs-ico">${ICO.note}</span><h3>ملاحظات</h3></div>
      <div class="fs-body"><div class="notes-card"><p class="notes-text">${escapeHtml(p.notes)}</p></div></div>
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
    document.body.dataset.route = name; // لربط تصميم الصفحة الرئيسية فقط عبر CSS، دون أي تغيير منطقي
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
    // عرض بيانات الطبيب داخل الكرت الرئيسي العلوي (Hero) — بصري فقط، نفس بيانات الإعدادات
    if (els.heroDoctorName) {
      els.heroDoctorName.textContent = settings.doctorName ? ('د. ' + settings.doctorName) : 'DentPilot';
    }
    if (els.heroMeta) {
      var metaParts = [settings.clinic, settings.specialty].filter(Boolean);
      els.heroMeta.textContent = metaParts.join(' — ');
      els.heroMeta.hidden = metaParts.length === 0;
    }
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
  /* ============================================================
     حقل «نوع العمل» المخصّص (Treatment Picker)
     ------------------------------------------------------------
     عرض بصري/تفاعلي فقط. القيمة الفعلية المحفوظة تبقى دائماً في
     نفس الحقل المخفي #treatment (els.fTreatment) الذي تقرأ منه
     handleSubmit كما كان تماماً — لا تغيير في منطق الحفظ.
     ============================================================ */
  const TREATMENT_PRESETS = ['Operative', 'Endo', 'Orthodontics', 'Cleaning', 'Surgery', 'Review', 'Pediatric'];

  /* ============================================================
     الحقول الديناميكية حسب نوع الحالة (Clinical Details)
     ------------------------------------------------------------
     ميزة إضافية بالكامل: تُخزَّن في مفتاح جديد اختياري
     patient.clinicalDetails — لا تمسّ أياً من الحقول القديمة
     (name/treatment/session/phone/total/paid/secondSession/notes)
     ولا تغيّر طريقة القراءة/الكتابة الخاصة بها. المرضى القدامى
     الذين لا يملكون هذا المفتاح يعملون تماماً كما كانوا.
     ============================================================ */
  const CLASS_OPTIONS = ['Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Class VI'];
  const MATERIAL_OPTIONS = ['Composite', 'Amalgam', 'GIC', 'Temporary filling'];
  const DIAGNOSIS_OPTIONS = ['Normal pulp', 'Reversible pulpitis', 'Irreversible pulpitis', 'Necrosis', 'Previously treated', 'Retreatment'];
  const CANAL_NAME_OPTIONS = ['Single', 'MB', 'DB', 'ML', 'DL', 'Palatal', 'Distal', 'Mesial', 'Buccal', 'Lingual'];
  const CLEANING_PROC_OPTIONS = ['Scaling', 'Polishing', 'Scaling + Polishing', 'Fluoride application'];
  const ORTHO_VISIT_OPTIONS = ['Bracket bonding', 'Wire change', 'Activation', 'Retainer check', 'Emergency', 'Consultation'];
  const SURGERY_PROC_OPTIONS = ['Simple extraction', 'Surgical extraction', 'Implant', 'Biopsy'];
  const PEDIATRIC_TREAT_OPTIONS = ['Examination', 'Fluoride', 'Sealant', 'Filling', 'Pulpotomy', 'Pulpectomy', 'Extraction', 'Space maintainer'];

  let canalsState = []; // حالة القنوات الحالية داخل النموذج المفتوح فقط (لا تُحفظ إلا عند الحفظ الفعلي)
  let canalUid = 0;
  let gpickCurrentSelect = null; // دالة رد نداء تُستدعى عند اختيار عنصر من اللوحة العامة

  /* ---------- لوحة الاختيار العامة (تُستخدم لكل الحقول الفرعية) ---------- */
  function openGenericPicker(title, options, currentVal, onSelect) {
    if (!els.genericPicker) return;
    els.gpickTitle.textContent = title;
    els.gpickList.innerHTML = options.map(o =>
      `<button type="button" class="tpick-opt" role="option" data-val="${escapeHtml(o)}" aria-selected="${o === currentVal ? 'true' : 'false'}">${escapeHtml(o)}</button>`
    ).join('');
    els.gpickList.querySelectorAll('.tpick-opt').forEach(btn => {
      if (btn.dataset.val === currentVal) btn.classList.add('active');
      btn.addEventListener('click', () => { onSelect(btn.dataset.val); closeGenericPicker(); });
    });
    gpickCurrentSelect = onSelect;
    els.genericPicker.hidden = false;
    document.body.classList.add('sheet-open');
  }
  function closeGenericPicker() {
    if (!els.genericPicker) return;
    els.genericPicker.hidden = true;
    gpickCurrentSelect = null;
    document.body.classList.remove('sheet-open');
  }

  /* ---------- ربط عام: زر مُشغِّل + حقل مخفي + (اختياري) حقل "أخرى" ---------- */
  function wireOptionField(triggerEl, displayEl, hiddenEl, options, title, otherWrapEl, otherInputEl) {
    if (!triggerEl) return;
    triggerEl.addEventListener('click', () => {
      openGenericPicker(title, options, hiddenEl.value, (val) => {
        hiddenEl.value = val;
        displayEl.textContent = val;
        displayEl.classList.remove('placeholder');
        if (otherWrapEl) { otherWrapEl.hidden = true; otherInputEl.value = ''; }
      });
    });
  }
  function setOptionFieldUI(displayEl, hiddenEl, placeholder, value) {
    const v = (value || '').trim();
    hiddenEl.value = v;
    displayEl.textContent = v || placeholder;
    displayEl.classList.toggle('placeholder', !v);
  }

  /* ---------- حقول ذات خيار "Other" (تسلك نفس سلوك حقل نوع العمل تماماً) ---------- */
  function wireOptionFieldWithOther(triggerEl, displayEl, hiddenEl, options, title, otherWrapEl, otherInputEl) {
    if (!triggerEl) return;
    triggerEl.addEventListener('click', () => {
      const isCustom = hiddenEl.value && !options.includes(hiddenEl.value);
      openGenericPicker(title, options.concat(['Other']), isCustom ? 'Other' : hiddenEl.value, (val) => {
        if (val === 'Other') {
          hiddenEl.value = '';
          displayEl.textContent = 'Other';
          displayEl.classList.remove('placeholder');
          otherWrapEl.hidden = false;
          setTimeout(() => otherInputEl.focus(), 60);
        } else {
          hiddenEl.value = val;
          displayEl.textContent = val;
          displayEl.classList.remove('placeholder');
          otherWrapEl.hidden = true; otherInputEl.value = '';
        }
      });
    });
    otherInputEl.addEventListener('input', () => {
      hiddenEl.value = otherInputEl.value;
      displayEl.textContent = otherInputEl.value.trim() || 'Other';
    });
  }
  function setOptionFieldWithOtherUI(displayEl, hiddenEl, placeholder, otherWrapEl, otherInputEl, options, value) {
    const v = (value || '').trim();
    if (!v) {
      hiddenEl.value = ''; displayEl.textContent = placeholder; displayEl.classList.add('placeholder');
      otherWrapEl.hidden = true; otherInputEl.value = ''; return;
    }
    hiddenEl.value = v; displayEl.textContent = v; displayEl.classList.remove('placeholder');
    if (options.includes(v)) { otherWrapEl.hidden = true; otherInputEl.value = ''; }
    else { otherWrapEl.hidden = false; otherInputEl.value = v; }
  }

  /* ---------- مجموعات الشرائح (Chips): الجنس / حالة اللثة / سلوك الطفل ---------- */
  function wireChipGroup(groupEl, hiddenEl) {
    if (!groupEl) return;
    groupEl.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const already = btn.classList.contains('active');
        groupEl.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        if (already) { hiddenEl.value = ''; } // إعادة الضغط تُلغي الاختيار
        else { btn.classList.add('active'); hiddenEl.value = btn.dataset.val; }
      });
    });
  }
  function setChipGroupUI(groupEl, hiddenEl, value) {
    hiddenEl.value = value || '';
    groupEl.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b.dataset.val === value));
  }

  /* ---------- إظهار/إخفاء قسم الحقول الديناميكية حسب نوع العمل ---------- */
  const CLINICAL_TYPES = ['Operative', 'Endo', 'Cleaning', 'Orthodontics', 'Surgery', 'Review', 'Pediatric'];
  function showClinicalSection(type) {
    if (!els.clinicalSection) return;
    CLINICAL_TYPES.forEach(t => {
      const el = $('clin-' + t);
      if (el) el.hidden = (t !== type);
    });
    if (type === 'Endo' && canalsState.length === 0) addCanal();
  }

  /* ---------- إدارة القنوات (Canals) — خاصة بـ Endo فقط ---------- */
  function addCanal(data) {
    canalUid += 1;
    canalsState.push(Object.assign({ _uid: canalUid, name: '', isOtherName: false, initial: '', master: '', wl: '', stop: '' }, data || {}));
    renderCanals();
  }
  function removeCanal(uidVal) {
    canalsState = canalsState.filter(c => c._uid !== uidVal);
    renderCanals();
  }
  function renderCanals() {
    if (!els.canalsList) return;
    els.canalsList.innerHTML = canalsState.map((c, i) => {
      const isCustom = c.isOtherName || (c.name && !CANAL_NAME_OPTIONS.includes(c.name));
      const displayVal = c.name || (isCustom ? 'Other' : '');
      return `
      <div class="canal-card" data-uid="${c._uid}">
        <div class="canal-card-head">
          <span class="canal-card-title">Canal ${i + 1}</span>
          <button type="button" class="canal-remove" data-uid="${c._uid}" title="حذف القناة" aria-label="حذف القناة">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="field">
          <label>اسم القناة</label>
          <button type="button" class="tpick-trigger canal-name-trigger" data-uid="${c._uid}">
            <span class="tpick-display ${displayVal ? '' : 'placeholder'}">${escapeHtml(displayVal || 'اختر اسم القناة')}</span>
            ${'<svg class="tpick-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'}
          </button>
          <div class="tpick-other-field canal-name-other-wrap" data-uid="${c._uid}" ${isCustom ? '' : 'hidden'}>
            <input type="text" class="canal-name-other" data-uid="${c._uid}" placeholder="اكتب اسم القناة" value="${escapeHtml(c.name && isCustom ? c.name : '')}" autocomplete="off" />
          </div>
        </div>
        <div class="field-row-2">
          <div class="field"><label>Initial File</label><input type="text" class="canal-initial" data-uid="${c._uid}" value="${escapeHtml(c.initial)}" placeholder="مثال: 15" /></div>
          <div class="field"><label>Master File</label><input type="text" class="canal-master" data-uid="${c._uid}" value="${escapeHtml(c.master)}" placeholder="مثال: 30" /></div>
        </div>
        <div class="field-row-2">
          <div class="field"><label>Working Length (WL)</label><input type="text" class="canal-wl" data-uid="${c._uid}" value="${escapeHtml(c.wl)}" placeholder="مثال: 21mm" /></div>
          <div class="field"><label>Stop</label><input type="text" class="canal-stop" data-uid="${c._uid}" value="${escapeHtml(c.stop)}" placeholder="Stop" /></div>
        </div>
      </div>`;
    }).join('') || '<p class="clin-empty">لا توجد قنوات مضافة بعد.</p>';
  }
  function bindCanalsListEvents() {
    if (!els.canalsList) return;
    els.canalsList.addEventListener('click', (e) => {
      const rm = e.target.closest('.canal-remove');
      if (rm) { removeCanal(Number(rm.dataset.uid)); return; }
      const trig = e.target.closest('.canal-name-trigger');
      if (trig) {
        const uidVal = Number(trig.dataset.uid);
        const c = canalsState.find(x => x._uid === uidVal); if (!c) return;
        const isCustom = c.isOtherName || (c.name && !CANAL_NAME_OPTIONS.includes(c.name));
        openGenericPicker('اسم القناة', CANAL_NAME_OPTIONS.concat(['Other']), isCustom ? 'Other' : c.name, (val) => {
          if (val === 'Other') { c.name = ''; c.isOtherName = true; renderCanals(); setTimeout(() => { const inp = els.canalsList.querySelector(`.canal-name-other[data-uid="${uidVal}"]`); if (inp) inp.focus(); }, 60); }
          else { c.name = val; c.isOtherName = false; renderCanals(); }
        });
      }
    });
    els.canalsList.addEventListener('input', (e) => {
      const t = e.target; const uidVal = Number(t.dataset.uid); if (!uidVal) return;
      const c = canalsState.find(x => x._uid === uidVal); if (!c) return;
      if (t.classList.contains('canal-name-other')) { c.name = t.value; }
      else if (t.classList.contains('canal-initial')) { c.initial = t.value; }
      else if (t.classList.contains('canal-master')) { c.master = t.value; }
      else if (t.classList.contains('canal-wl')) { c.wl = t.value; }
      else if (t.classList.contains('canal-stop')) { c.stop = t.value; }
    });
    els.addCanalBtn.addEventListener('click', () => addCanal());
  }

  /* ---------- جمع الحقول الديناميكية عند الحفظ ---------- */
  function collectClinicalDetails() {
    const type = els.fTreatment.value.trim();
    if (type === 'Operative') {
      return { type, tooth: els.opTooth.value.trim(), class: els.opClass.value.trim(), material: els.opMaterial.value.trim() };
    }
    if (type === 'Endo') {
      return {
        type, tooth: els.endoTooth.value.trim(), diagnosis: els.endoDiagnosis.value.trim(),
        canals: canalsState.map(c => ({ name: c.name.trim(), initial: c.initial.trim(), master: c.master.trim(), wl: c.wl.trim(), stop: c.stop.trim() }))
          .filter(c => c.name || c.initial || c.master || c.wl || c.stop),
      };
    }
    if (type === 'Cleaning') {
      return { type, procedure: els.cleanProc.value.trim(), gumStatus: els.gumStatus.value.trim(), calculusNotes: els.calculusNotes.value.trim() };
    }
    if (type === 'Orthodontics') {
      return { type, visit: els.orthoVisit.value.trim(), diagnosis: els.orthoDiagnosis.value.trim(), notes: els.orthoNotes.value.trim() };
    }
    if (type === 'Surgery') {
      return { type, tooth: els.surgTooth.value.trim(), procedure: els.surgProc.value.trim(), postOp: els.surgPostOp.value.trim() };
    }
    if (type === 'Review') {
      return { type, reason: els.reviewReason.value.trim(), result: els.reviewResult.value.trim(), notes: els.reviewNotes.value.trim() };
    }
    if (type === 'Pediatric') {
      return { type, tooth: els.pedTooth.value.trim(), treatment: els.pedTreat.value.trim(), behavior: els.pedBehavior.value.trim(), guardianNotes: els.guardianNotes.value.trim() };
    }
    return null; // Other أو غير محدَّد: بلا حقول ديناميكية إضافية
  }

  /* ---------- تعبئة الحقول الديناميكية عند التعديل ---------- */
  function fillClinicalDetails(cd) {
    const d = cd || {};
    setOptionFieldUI(els.opClassDisplay, els.opClass, 'اختر Class', ''); // إعادة ضبط أولاً
    els.opTooth.value = ''; els.opMaterial.value = ''; els.opMaterialOtherWrap.hidden = true; els.opMaterialOther.value = '';
    els.opClassOtherWrap.hidden = true; els.opClassOther.value = '';
    els.endoTooth.value = ''; setOptionFieldUI(els.endoDiagnosisDisplay, els.endoDiagnosis, 'اختر التشخيص', '');
    els.cleanProc.value = ''; els.cleanProcOtherWrap.hidden = true; els.cleanProcOther.value = '';
    setChipGroupUI(els.gumStatusChips, els.gumStatus, ''); els.calculusNotes.value = '';
    setOptionFieldUI(els.orthoVisitDisplay, els.orthoVisit, 'اختر نوع الزيارة', ''); els.orthoDiagnosis.value = ''; els.orthoNotes.value = '';
    els.surgTooth.value = ''; els.surgProc.value = ''; els.surgProcOtherWrap.hidden = true; els.surgProcOther.value = ''; els.surgPostOp.value = '';
    els.reviewReason.value = ''; els.reviewResult.value = ''; els.reviewNotes.value = '';
    els.pedTooth.value = ''; setOptionFieldUI(els.pedTreatDisplay, els.pedTreat, 'اختر نوع العلاج', '');
    setChipGroupUI(els.pedBehaviorChips, els.pedBehavior, ''); els.guardianNotes.value = '';
    canalsState = []; canalUid = 0;

    if (d.type === 'Operative') {
      els.opTooth.value = d.tooth || '';
      setOptionFieldWithOtherUI(els.opClassDisplay, els.opClass, 'اختر Class', els.opClassOtherWrap, els.opClassOther, CLASS_OPTIONS, d.class || '');
      setOptionFieldWithOtherUI(els.opMaterialDisplay, els.opMaterial, 'اختر المادة', els.opMaterialOtherWrap, els.opMaterialOther, MATERIAL_OPTIONS, d.material || '');
    } else if (d.type === 'Endo') {
      els.endoTooth.value = d.tooth || '';
      setOptionFieldUI(els.endoDiagnosisDisplay, els.endoDiagnosis, 'اختر التشخيص', d.diagnosis || '');
      (d.canals || []).forEach(c => addCanal(c));
    } else if (d.type === 'Cleaning') {
      setOptionFieldWithOtherUI(els.cleanProcDisplay, els.cleanProc, 'اختر نوع الإجراء', els.cleanProcOtherWrap, els.cleanProcOther, CLEANING_PROC_OPTIONS, d.procedure || '');
      setChipGroupUI(els.gumStatusChips, els.gumStatus, d.gumStatus || '');
      els.calculusNotes.value = d.calculusNotes || '';
    } else if (d.type === 'Orthodontics') {
      setOptionFieldUI(els.orthoVisitDisplay, els.orthoVisit, 'اختر نوع الزيارة', d.visit || '');
      els.orthoDiagnosis.value = d.diagnosis || ''; els.orthoNotes.value = d.notes || '';
    } else if (d.type === 'Surgery') {
      els.surgTooth.value = d.tooth || '';
      setOptionFieldWithOtherUI(els.surgProcDisplay, els.surgProc, 'اختر نوع الإجراء', els.surgProcOtherWrap, els.surgProcOther, SURGERY_PROC_OPTIONS, d.procedure || '');
      els.surgPostOp.value = d.postOp || '';
    } else if (d.type === 'Review') {
      els.reviewReason.value = d.reason || ''; els.reviewResult.value = d.result || ''; els.reviewNotes.value = d.notes || '';
    } else if (d.type === 'Pediatric') {
      els.pedTooth.value = d.tooth || '';
      setOptionFieldUI(els.pedTreatDisplay, els.pedTreat, 'اختر نوع العلاج', d.treatment || '');
      setChipGroupUI(els.pedBehaviorChips, els.pedBehavior, d.behavior || '');
      els.guardianNotes.value = d.guardianNotes || '';
    } else {
      renderCanals(); // تفريغ عرض القنوات إن لم يوجد Endo
    }
  }

  function setTreatmentUI(value) {
    const v = (value || '').trim();
    if (!els.treatmentDisplay) return; // حماية في حال عدم وجود العناصر
    if (!v) {
      els.fTreatment.value = '';
      els.treatmentDisplay.textContent = 'اختر نوع العمل';
      els.treatmentDisplay.classList.add('placeholder');
      els.treatmentOtherWrap.hidden = true;
      els.treatmentOther.value = '';
      showClinicalSection(null);
      return;
    }
    els.fTreatment.value = v;
    els.treatmentDisplay.textContent = v;
    els.treatmentDisplay.classList.remove('placeholder');
    if (TREATMENT_PRESETS.includes(v)) {
      els.treatmentOtherWrap.hidden = true;
      els.treatmentOther.value = '';
    } else {
      // "Other" أو أي قيمة مخصّصة/قديمة لا تطابق القائمة الجاهزة
      els.treatmentOtherWrap.hidden = false;
      els.treatmentOther.value = v;
    }
    showClinicalSection(CLINICAL_TYPES.includes(v) ? v : null);
  }

  function highlightTreatmentOption() {
    const cur = els.fTreatment.value.trim();
    const isPreset = TREATMENT_PRESETS.includes(cur);
    els.treatmentPicker.querySelectorAll('.tpick-opt').forEach(btn => {
      const match = isPreset ? (btn.dataset.val === cur) : (btn.dataset.val === 'Other' && !els.treatmentOtherWrap.hidden);
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });
  }

  function openTreatmentPicker() {
    highlightTreatmentOption();
    els.treatmentPicker.hidden = false;
    els.treatmentTrigger.classList.add('open');
    document.body.classList.add('sheet-open');
  }
  function closeTreatmentPicker() {
    els.treatmentPicker.hidden = true;
    els.treatmentTrigger.classList.remove('open');
    document.body.classList.remove('sheet-open');
  }
  function selectTreatmentOption(val) {
    if (val === 'Other') {
      els.fTreatment.value = '';
      els.treatmentDisplay.textContent = 'Other';
      els.treatmentDisplay.classList.remove('placeholder');
      els.treatmentOtherWrap.hidden = false;
      closeTreatmentPicker();
      showClinicalSection(null);
      setTimeout(() => els.treatmentOther.focus(), 60);
    } else {
      els.fTreatment.value = val;
      els.treatmentDisplay.textContent = val;
      els.treatmentDisplay.classList.remove('placeholder');
      els.treatmentOtherWrap.hidden = true;
      els.treatmentOther.value = '';
      closeTreatmentPicker();
      showClinicalSection(CLINICAL_TYPES.includes(val) ? val : null);
    }
  }

  function openModal(patient) {
    els.form.reset(); els.fName.classList.remove('invalid');
    if (patient) {
      els.modalTitle.textContent = 'تعديل بيانات المريض';
      els.fId.value = patient.id; els.fName.value = patient.name || ''; setTreatmentUI(patient.treatment || '');
      els.fSession.value = patient.session || ''; els.fPhone.value = patient.phone || '';
      els.fTotal.value = patient.total ?? ''; els.fPaid.value = patient.paid ?? ''; els.fSecond.value = patient.secondSession || '';
      els.fNotes.value = patient.notes || '';
      if (els.fAge) els.fAge.value = patient.age ?? '';
      if (els.genderChips) setChipGroupUI(els.genderChips, els.fGender, patient.gender || '');
      fillClinicalDetails(patient.clinicalDetails || null);
    } else {
      els.modalTitle.textContent = 'إضافة مريض جديد'; els.fId.value = ''; setTreatmentUI('');
      if (els.fAge) els.fAge.value = '';
      if (els.genderChips) setChipGroupUI(els.genderChips, els.fGender, '');
      fillClinicalDetails(null);
    }
    recalcRemaining(); els.overlay.hidden = false; setTimeout(() => els.fName.focus(), 50);
  }
  function closeModal() { els.overlay.hidden = true; closeTreatmentPicker(); closeGenericPicker(); }

  /* ---------- اختيار رقم الهاتف من جهات اتصال الجهاز (Contact Picker API) ----------
     ميزة اختيارية تماماً: تُستخدم فقط عند دعم المتصفح لها (Contact Picker API).
     عند عدم الدعم: لا يحدث أي خطأ، ويبقى إدخال الرقم يدوياً يعمل بلا أي تأثر. ---------- */
  async function pickContact() {
    const supported = ('contacts' in navigator) && ('ContactsManager' in window) && navigator.contacts && typeof navigator.contacts.select === 'function';
    if (!supported) { toast('اختيار جهات الاتصال غير مدعوم على هذا الجهاز'); return; }
    try {
      const results = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!results || !results.length) return; // ألغى المستخدم الاختيار
      const c = results[0];
      if (c.tel && c.tel.length) els.fPhone.value = String(c.tel[0]).trim();
      if (!els.fName.value.trim() && c.name && c.name.length) els.fName.value = String(c.name[0]).trim();
    } catch (e) {
      // رفض الإذن أو إلغاء العملية — تجاهل بصمت، الإدخال اليدوي يبقى متاحاً
    }
  }

  function recalcRemaining() { els.fRemaining.value = fmt(toNum(els.fTotal.value) - toNum(els.fPaid.value)); }
  function handleSubmit(e) {
    e.preventDefault();
    const name = els.fName.value.trim();
    if (!name) { els.fName.classList.add('invalid'); els.fName.focus(); return; }
    els.fName.classList.remove('invalid');
    const data = {
      name, treatment: els.fTreatment.value.trim(), session: els.fSession.value.trim(), phone: els.fPhone.value.trim(),
      total: toNum(els.fTotal.value), paid: toNum(els.fPaid.value), secondSession: els.fSecond.value || '', notes: els.fNotes.value.trim(),
      age: els.fAge ? els.fAge.value.trim() : '', gender: els.fGender ? els.fGender.value.trim() : '',
      clinicalDetails: collectClinicalDetails(),
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

  /* ---------- الاحتفاظ في Google Drive (مرحلة أولى: مشاركة/تنزيل يدوي فقط) ----------
     لا يوجد Google API ولا OAuth ولا خادم. نفس بنية بيانات exportBackup() تماماً
     لضمان توافق الاستيراد، فقط باسم ملف أوضح واستخدام اختياري لـ Web Share API. ---------- */
  function gdriveBackupFile() {
    const data = { app: 'DentPilot', version: '2.0', exportedAt: new Date().toISOString(), settings, patients, attachments };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const today = new Date().toISOString().slice(0, 10);
    const rawName = (settings.doctorName || '').trim();
    const safeName = rawName.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 60);
    const filename = 'DentPilot-Backup-' + today + (safeName ? '-' + safeName : '') + '.dentbackup';
    return { blob, filename };
  }
  async function saveBackupToGoogleDrive() {
    let blob, filename;
    try {
      ({ blob, filename } = gdriveBackupFile());
    } catch (e) {
      toast('تعذّر إنشاء النسخة الاحتياطية. حاول مرة أخرى.');
      return;
    }
    let canShareFiles = false;
    let file = null;
    try {
      file = new File([blob], filename, { type: 'application/json' });
      canShareFiles = !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
    } catch (e) { canShareFiles = false; }

    if (canShareFiles) {
      try {
        await navigator.share({ files: [file], title: 'نسخة DentPilot الاحتياطية' });
        toast('تم تجهيز النسخة الاحتياطية. اختر Google Drive لحفظها.');
      } catch (err) {
        if (err && (err.name === 'AbortError' || /abort/i.test(String(err && err.message)))) {
          toast('لم يتم حفظ النسخة. يمكنك المحاولة مرة أخرى.');
        } else {
          toast('تعذّر إنشاء النسخة الاحتياطية. حاول مرة أخرى.');
        }
      }
      return;
    }
    // بديل: لا يوجد دعم لمشاركة الملفات — تنزيل عادي ثم توجيه المستخدم يدوياً
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('تم تنزيل ملف النسخة. احفظه في Google Drive حتى تستطيع استعادته لاحقاً.');
    } catch (e) {
      toast('تعذّر إنشاء النسخة الاحتياطية. حاول مرة أخرى.');
    }
  }

  /* ============================================================
     القائمة الجانبية (Side Drawer) — طبقة واجهة فقط
     ============================================================ */
  function initDrawer() {
    const btn = $('menuBtn'), ov = $('drawerOverlay'), dr = $('sideDrawer'), closeBtn = $('drawerClose');
    if (!btn || !ov || !dr) return;
    let closing = null;
    function markActiveLink() { // بصري فقط: تمييز عنصر الدرج المطابق للمسار الحالي
      var route = document.body.dataset.route || 'dashboard';
      if (route === 'completed' || route === 'late' || route === 'file') route = 'patients';
      dr.querySelectorAll('.drawer-link').forEach(function (l) { l.classList.toggle('active', l.dataset.go === route); });
    }
    function openDrawer() {
      markActiveLink();
      if (closing) { clearTimeout(closing); closing = null; }
      const dn = $('drawerDocName');
      if (dn && els.docLabel) dn.textContent = els.docLabel.textContent; // نفس بيانات الطبيب المعروضة — بدون منطق جديد
      ov.hidden = false;
      requestAnimationFrame(() => { ov.classList.add('show'); dr.classList.add('open'); });
      dr.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('drawer-lock'); // منع تمرير الخلفية
    }
    function closeDrawer() {
      ov.classList.remove('show'); dr.classList.remove('open');
      dr.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('drawer-lock');
      closing = setTimeout(() => { ov.hidden = true; closing = null; }, 260);
    }
    btn.addEventListener('click', openDrawer);
    ov.addEventListener('click', closeDrawer);           // إغلاق بالنقر خارجها
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dr.classList.contains('open')) closeDrawer(); });
    dr.querySelectorAll('.drawer-link').forEach(l => l.addEventListener('click', () => { closeDrawer(); go(l.dataset.go); }));
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
    document.querySelectorAll('.home-tab-btn').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.go)));
    initDrawer(); // القائمة الجانبية — واجهة فقط، تستخدم go() الحالي دون أي منطق جديد للبيانات
    if (els.trialBanner) els.trialBanner.addEventListener('click', () => go('support'));
    els.backBtn.addEventListener('click', goBack);

    els.addBtn.addEventListener('click', () => openModal(null));
    els.completedBtn.addEventListener('click', () => go('completed'));
    els.modalClose.addEventListener('click', closeModal);
    els.cancelBtn.addEventListener('click', closeModal);
    els.form.addEventListener('submit', handleSubmit);
    els.fTotal.addEventListener('input', recalcRemaining);
    if (els.pickContactBtn) els.pickContactBtn.addEventListener('click', pickContact);
    els.fPaid.addEventListener('input', recalcRemaining);

    // حقل «نوع العمل» المخصّص
    els.treatmentTrigger.addEventListener('click', openTreatmentPicker);
    els.tpickBackdrop.addEventListener('click', closeTreatmentPicker);
    els.tpickClose.addEventListener('click', closeTreatmentPicker);
    els.treatmentPicker.querySelectorAll('.tpick-opt').forEach(btn => {
      btn.addEventListener('click', () => selectTreatmentOption(btn.dataset.val));
    });
    els.treatmentOther.addEventListener('input', () => {
      const v = els.treatmentOther.value;
      els.fTreatment.value = v.trim();
      els.treatmentDisplay.textContent = v.trim() || 'Other';
    });

    // اللوحة العامة (الحقول الفرعية الديناميكية)
    if (els.genericPicker) {
      els.gpickBackdrop.addEventListener('click', closeGenericPicker);
      els.gpickClose.addEventListener('click', closeGenericPicker);
    }
    // الجنس
    wireChipGroup(els.genderChips, els.fGender);
    // Operative
    wireOptionFieldWithOther(els.opClassTrigger, els.opClassDisplay, els.opClass, CLASS_OPTIONS, 'اختر Class', els.opClassOtherWrap, els.opClassOther);
    wireOptionFieldWithOther(els.opMaterialTrigger, els.opMaterialDisplay, els.opMaterial, MATERIAL_OPTIONS, 'اختر مادة الحشو', els.opMaterialOtherWrap, els.opMaterialOther);
    // Endo
    wireOptionField(els.endoDiagnosisTrigger, els.endoDiagnosisDisplay, els.endoDiagnosis, DIAGNOSIS_OPTIONS, 'اختر التشخيص');
    bindCanalsListEvents();
    // Cleaning
    wireOptionFieldWithOther(els.cleanProcTrigger, els.cleanProcDisplay, els.cleanProc, CLEANING_PROC_OPTIONS, 'اختر نوع الإجراء', els.cleanProcOtherWrap, els.cleanProcOther);
    wireChipGroup(els.gumStatusChips, els.gumStatus);
    // Orthodontics
    wireOptionField(els.orthoVisitTrigger, els.orthoVisitDisplay, els.orthoVisit, ORTHO_VISIT_OPTIONS, 'اختر نوع الزيارة');
    // Surgery
    wireOptionFieldWithOther(els.surgProcTrigger, els.surgProcDisplay, els.surgProc, SURGERY_PROC_OPTIONS, 'اختر نوع الإجراء', els.surgProcOtherWrap, els.surgProcOther);
    // Pediatric
    wireOptionField(els.pedTreatTrigger, els.pedTreatDisplay, els.pedTreat, PEDIATRIC_TREAT_OPTIONS, 'اختر نوع العلاج');
    wireChipGroup(els.pedBehaviorChips, els.pedBehavior);

    els.search.addEventListener('input', debounce(renderPatients, 120));
    if (els.patientsFilterBar) {
      els.patientsFilterBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip'); if (!chip) return;
        patientsFilter = chip.dataset.filter || 'all';
        renderPatients();
      });
    }

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
    if (els.gdriveBackupBtn) els.gdriveBackupBtn.addEventListener('click', saveBackupToGoogleDrive);

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
      // عداد دائري بصري إضافي للصفحة الرئيسية فقط — نفس القيمة h، بلا أي تغيير في المنطق
      if (els.trialHours) els.trialHours.textContent = h;
      if (els.trialRingFg) {
        var pct = Math.max(0, Math.min(1, h / 72));
        var C = 2 * Math.PI * 27;
        els.trialRingFg.style.strokeDasharray = C.toFixed(2);
        els.trialRingFg.style.strokeDashoffset = (C * (1 - pct)).toFixed(2);
      }
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
        // إصلاح: فحص استباقي للتحديث بدل الاعتماد فقط على الفحص التلقائي
        // البطيء للمتصفح (قد يتأخر حتى 24 ساعة) أو على ضغط المستخدم يدوياً
        // على «التحقق من التحديثات». هذا يجعل سلوك التحديث يعمل تلقائياً
        // بمجرد فتح التطبيق، دون تغيير أي شيء في منطق التفعيل أو البيانات.
        if (navigator.serviceWorker.controller) reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && swReg) swReg.update().catch(() => {});
        });
        setInterval(() => { if (swReg) swReg.update().catch(() => {}); }, 60 * 60 * 1000);
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
