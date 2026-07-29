/* ============================================================
   firebase-sync.js — DentPilot Pro
   المسؤولية الوحيدة: المزامنة بين LocalStorage وFirestore.
   لا يوجد هنا أي كود مصادقة (ذلك في firebase-auth.js) ولا أي واجهة (ذلك في account-ui.js).

   قواعد صارمة يفرضها هذا الملف على نفسه:
   - لا يقرأ ولا يكتب أبداً: dentpilot_attachments_v1, dentpilot_device_id,
     dentpilot_license, dentpilot_pro_trial_start, dentpilot_pro_trial_expires,
     dentpilot_license_meta — إطلاقاً.
   - لا يكتب مباشرة إلى الذاكرة الحيّة لتطبيق script.js؛ عند الحاجة لتحديث الواجهة
     بعد كتابة LocalStorage مباشرة (حالة الاستعادة فقط) يستدعي window.DPApp.reloadFromStorage()
     الموجودة أصلاً، دون تكرار أي منطق تحميل/تطبيع.
   - لا Real-time Listener دائم؛ فقط قراءات/كتابات لمرة واحدة عند أحداث محددة (Event-driven).
   - لا Firestore offline persistence.
   ============================================================ */
(function () {
  'use strict';

  // ---- مفاتيح LocalStorage (يجب أن تُطابق حرفياً المفاتيح في script.js) ----
  var LOCAL_PATIENTS_KEY = 'qarabesh_clinic_patients_v1';
  var LOCAL_SETTINGS_KEY = 'dentpilot_settings_v1';
  // ---- مفاتيح جديدة خاصة بالمزامنة فقط (لا تمسّ أي مفتاح قديم) ----
  var SYNC_STATE_KEY = 'dentpilot_pro_sync_state_v1';
  var PRESYNC_BACKUP_KEY = 'dentpilot_pro_presync_backup_v1';

  var SCHEMA_VERSION = 1;
  var SAVE_DEBOUNCE_MS = 1500;

  // ============================================================
  // أدوات LocalStorage الخام (قراءة/كتابة مباشرة بنفس بنية script.js تماماً)
  // ============================================================
  function readLocalPatients() {
    try { var r = localStorage.getItem(LOCAL_PATIENTS_KEY); var a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function readLocalSettings() {
    try { var r = localStorage.getItem(LOCAL_SETTINGS_KEY); var o = r ? JSON.parse(r) : {}; return (o && typeof o === 'object') ? o : {}; }
    catch (e) { return {}; }
  }
  function writeLocalPatients(arr) { try { localStorage.setItem(LOCAL_PATIENTS_KEY, JSON.stringify(arr)); return true; } catch (e) { return false; } }
  function writeLocalSettings(obj) { try { localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(obj)); return true; } catch (e) { return false; } }

  function defaultSyncState() {
    return { uid: null, lastSyncAt: null, lastSyncAtMs: 0, schemaVersion: SCHEMA_VERSION, patients: {}, tombstones: {}, conflicts: {}, pendingImportSync: false };
  }
  function getSyncState() {
    try {
      var r = localStorage.getItem(SYNC_STATE_KEY);
      if (!r) return defaultSyncState();
      var o = JSON.parse(r);
      if (!o || typeof o !== 'object') return defaultSyncState();
      var d = defaultSyncState();
      return Object.assign(d, o, { patients: o.patients || {}, tombstones: o.tombstones || {}, conflicts: o.conflicts || {} });
    } catch (e) { return defaultSyncState(); }
  }
  function setSyncState(next) {
    try { localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(next)); } catch (e) {}
    emitStateChanged();
  }
  function patchSyncState(patch) {
    var cur = getSyncState();
    var next = Object.assign({}, cur, patch);
    setSyncState(next);
    return next;
  }
  function writePresyncBackup(reason) {
    try {
      var backup = { patients: readLocalPatients(), settings: readLocalSettings(), createdAt: new Date().toISOString(), reason: reason || 'unspecified' };
      localStorage.setItem(PRESYNC_BACKUP_KEY, JSON.stringify(backup)); // نسخة واحدة فقط، تُستبدل في كل مرة
    } catch (e) {}
  }

  function emitStateChanged() { try { document.dispatchEvent(new CustomEvent('dp:sync-state-changed')); } catch (e) {} }
  function emitNeedsReconciliation() { try { document.dispatchEvent(new CustomEvent('dp:sync-needs-reconciliation')); } catch (e) {} }

  // ============================================================
  // Hash خفيف (غير تشفيري) لكشف تغيّر محتوى المريض — لغرض المقارنة المحلية فقط
  // ============================================================
  function hashOf(obj) {
    var str; try { str = JSON.stringify(obj); } catch (e) { return '0'; }
    var h = 5381;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) + h + str.charCodeAt(i)) | 0; }
    return String(h);
  }
  // أقدم توقيت مُشتق من صيغة معرّف المريض p_<base36 timestamp><5 أحرف عشوائية>
  // (نفس منطق regDateFromId في script.js تماماً) — تقريب "آخر إضافة" وليس "آخر تعديل"،
  // لأن بنية بيانات المريض الحالية لا تتضمن حقل تعديل زمني، ولا يجوز إضافته إليها.
  function createdMsFromId(id) {
    try {
      var s = String(id || ''); if (s.slice(0, 2) !== 'p_') return 0;
      var body = s.slice(2); if (body.length <= 5) return 0;
      var ts = parseInt(body.slice(0, -5), 36);
      if (ts > 1262304000000 && ts < 4102444800000) return ts;
    } catch (e) {}
    return 0;
  }

  // ============================================================
  // Firebase helpers
  // ============================================================
  function isReady() { var f = window.DPFirebase; return !!(f && f.ready && f.db); }
  function db() { return window.DPFirebase.db; }
  function currentUid() { var u = window.DPAuth && window.DPAuth.currentUser ? window.DPAuth.currentUser() : null; return u ? u.uid : null; }
  function clinicDoc(uid) { return db().collection('clinics').doc(uid); }
  function patientsCol(uid) { return clinicDoc(uid).collection('patients'); }
  function isOnline() { return typeof navigator === 'undefined' || navigator.onLine !== false; }

  function chunk(arr, size) { var out = []; for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; }

  // ============================================================
  // إنشاء/تحديث مستند العيادة الأساسي عند أول ربط
  // ============================================================
  function ensureClinicDoc(uid, email) {
    var ref = clinicDoc(uid);
    return ref.get().then(function (snap) {
      var settings = readLocalSettings();
      var now = firebase.firestore.FieldValue.serverTimestamp();
      if (!snap.exists) {
        return ref.set({
          app: 'dentpilot-pro',
          email: email || '',
          doctorName: settings.doctorName || '',
          clinicName: settings.clinic || '',
          createdAt: now,
          updatedAt: now,
          schemaVersion: SCHEMA_VERSION
        });
      }
      return ref.set({ updatedAt: now, doctorName: settings.doctorName || '', clinicName: settings.clinic || '' }, { merge: true });
    });
  }

  // ============================================================
  // تقييم حالة الربط الأول (البند 9) — 4 حالات
  // ============================================================
  function evaluateLinkCase() {
    var uid = currentUid();
    if (!uid || !isReady()) return Promise.resolve({ ok: false, message: 'لا يوجد اتصال بالإنترنت.' });
    var localList = readLocalPatients();
    var localCount = localList.length;
    var localLastAddedMs = localList.reduce(function (m, p) { return Math.max(m, createdMsFromId(p.id)); }, 0);

    return patientsCol(uid).where('deletedAt', '==', null).get().then(function (snap) {
      var cloudCount = snap.size;
      var cloudLastMs = 0;
      snap.forEach(function (doc) {
        var d = doc.data();
        if (d && typeof d.updatedAtMs === 'number') cloudLastMs = Math.max(cloudLastMs, d.updatedAtMs);
      });
      var c = (localCount > 0 && cloudCount === 0) ? 1 : (localCount === 0 && cloudCount > 0) ? 2 : (localCount > 0 && cloudCount > 0) ? 3 : 4;
      return { ok: true, case: c, localCount: localCount, cloudCount: cloudCount, localLastAddedMs: localLastAddedMs, cloudLastMs: cloudLastMs };
    }).catch(function () {
      return { ok: false, message: 'تعذّر التحقق من البيانات السحابية، حاول مجدداً.' };
    });
  }

  // رفع كامل بيانات هذا الجهاز (حالة 1 و3: "استخدام/رفع بيانات هذا الجهاز")
  // لا يحذف أي مريض موجود في السحابة وغير موجود محلياً — رفع/تحديث فقط، بلا استبدال قسري صامت.
  function uploadDeviceData() {
    var uid = currentUid();
    if (!uid || !isReady()) return Promise.resolve({ ok: false, message: 'لا يوجد اتصال بالإنترنت.' });
    writePresyncBackup('upload-device-data');
    var list = readLocalPatients();
    var nowMs = Date.now();
    var patientsMap = {};
    var batches = chunk(list, 400);

    function runBatch(i) {
      if (i >= batches.length) return Promise.resolve();
      var b = db().batch();
      batches[i].forEach(function (p) {
        var ref = patientsCol(uid).doc(p.id);
        b.set(ref, {
          patientId: p.id, payload: p,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAtMs: nowMs,
          deletedAt: null, schemaVersion: SCHEMA_VERSION
        });
        patientsMap[p.id] = { hash: hashOf(p), updatedAtMs: nowMs };
      });
      return b.commit().then(function () { return runBatch(i + 1); });
    }

    return ensureClinicDoc(uid, (window.DPAuth.currentUser() || {}).email)
      .then(function () { return runBatch(0); })
      .then(function () {
        return clinicDoc(uid).collection('sync').doc('settings').set(
          Object.assign({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, readLocalSettings())
        );
      })
      .then(function () {
        patchSyncState({ uid: uid, lastSyncAt: new Date().toISOString(), lastSyncAtMs: nowMs, patients: patientsMap, tombstones: {}, conflicts: {} });
        return { ok: true };
      })
      .catch(function () { return { ok: false, message: 'تعذّر رفع بيانات هذا الجهاز، حاول مجدداً.' }; });
  }

  // استعادة النسخة السحابية بالكامل إلى هذا الجهاز (حالة 2 و3: "استعادة بيانات العيادة")
  function restoreFromCloud() {
    var uid = currentUid();
    if (!uid || !isReady()) return Promise.resolve({ ok: false, message: 'لا يوجد اتصال بالإنترنت.' });
    writePresyncBackup('restore-from-cloud');

    return patientsCol(uid).where('deletedAt', '==', null).get().then(function (snap) {
      var list = []; var patientsMap = {}; var nowMs = Date.now();
      snap.forEach(function (doc) {
        var d = doc.data();
        if (d && d.payload) { list.push(d.payload); patientsMap[d.patientId] = { hash: hashOf(d.payload), updatedAtMs: (typeof d.updatedAtMs === 'number' ? d.updatedAtMs : nowMs) }; }
      });
      return clinicDoc(uid).collection('sync').doc('settings').get().then(function (sdoc) {
        var settingsData = sdoc.exists ? sdoc.data() : null;
        writeLocalPatients(list);
        if (settingsData) {
          var clean = { doctorName: settingsData.doctorName || '', specialty: settingsData.specialty || '', clinic: settingsData.clinicName || settingsData.clinic || '' };
          writeLocalSettings(clean);
        }
        if (window.DPApp && window.DPApp.reloadFromStorage) window.DPApp.reloadFromStorage();
        patchSyncState({ uid: uid, lastSyncAt: new Date().toISOString(), lastSyncAtMs: nowMs, patients: patientsMap, tombstones: {}, conflicts: {} });
        return { ok: true };
      });
    }).catch(function () { return { ok: false, message: 'تعذّرت استعادة البيانات السحابية، حاول مجدداً.' }; });
  }

  // ============================================================
  // المزامنة التدريجية العادية (بعد اكتمال الربط الأول) — ثنائية الاتجاه، بحدث واحد لكل نداء
  // ============================================================
  var syncing = false, debounceTimer = null;

  function scheduleSync(reason) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { runSyncNow(reason); }, SAVE_DEBOUNCE_MS);
  }

  function runSyncNow(reason) {
    var uid = currentUid();
    if (!uid || !isReady() || !isOnline()) return Promise.resolve({ ok: false, skipped: true });
    var st = getSyncState();
    if (st.uid !== uid) { emitNeedsReconciliation(); return Promise.resolve({ ok: false, skipped: true, reason: 'needs-reconciliation' }); }
    if (syncing) return Promise.resolve({ ok: false, skipped: true, reason: 'busy' });
    syncing = true;

    var localList = readLocalPatients();
    var localById = {}; localList.forEach(function (p) { localById[p.id] = p; });
    var nowMs = Date.now();

    // ---- 1) اسحب من السحابة كل ما تغيّر منذ آخر مزامنة (تشمل الحذف/deletedAt) ----
    var q = st.lastSyncAtMs ? patientsCol(uid).where('updatedAtMs', '>', st.lastSyncAtMs) : patientsCol(uid);
    return q.get().then(function (snap) {
      var stateCopy = getSyncState();
      var newConflicts = Object.assign({}, stateCopy.conflicts);
      var appliedRemoteChange = false;

      snap.forEach(function (doc) {
        var d = doc.data(); if (!d || !d.patientId) return;
        var pid = d.patientId;
        var lastKnown = stateCopy.patients[pid]; // آخر ما نعرفه محلياً عن حالة هذا المريض وقت آخر مزامنة ناجحة
        var localHasIndependentChange = localById[pid] && (!lastKnown || hashOf(localById[pid]) !== lastKnown.hash);

        if (localHasIndependentChange) {
          // تعارض محتمل: تغيّر محلياً وأيضاً تغيّر في السحابة منذ آخر مزامنة لهذا المريض تحديداً
          newConflicts[pid] = { detectedAt: new Date().toISOString(), cloudUpdatedAtMs: d.updatedAtMs || 0 };
          return; // لا نلمس أي طرف لهذا المريض حتى يُحل التعارض يدوياً
        }

        if (d.deletedAt) {
          // حذف من جهاز آخر — احترم الحذف ولا تُعِد المريض
          if (localById[pid]) { delete localById[pid]; appliedRemoteChange = true; }
          delete stateCopy.patients[pid];
          stateCopy.tombstones[pid] = { deletedAtMs: d.updatedAtMs || nowMs };
          delete newConflicts[pid];
        } else if (d.payload) {
          localById[pid] = d.payload;
          stateCopy.patients[pid] = { hash: hashOf(d.payload), updatedAtMs: d.updatedAtMs || nowMs };
          appliedRemoteChange = true;
          delete newConflicts[pid];
        }
      });

      if (appliedRemoteChange) {
        var mergedList = Object.keys(localById).map(function (k) { return localById[k]; });
        writeLocalPatients(mergedList);
        if (window.DPApp && window.DPApp.reloadFromStorage) window.DPApp.reloadFromStorage();
      }

      // ---- 2) ادفع تغييراتنا المحلية (فقط ما تغيّر فعلياً منذ آخر مزامنة، وبلا تعارض) ----
      var toPush = [];
      var currentLocalList = readLocalPatients(); // بعد أي دمج قد يكون حدث للتو
      var currentIds = {};
      currentLocalList.forEach(function (p) {
        currentIds[p.id] = true;
        var lastKnown = stateCopy.patients[p.id];
        var h = hashOf(p);
        if (!newConflicts[p.id] && (!lastKnown || lastKnown.hash !== h)) toPush.push(p);
      });
      // حذوفات محلية لم تُرفَع بعد كـ Tombstone
      var toTombstone = Object.keys(stateCopy.patients).filter(function (pid) { return !currentIds[pid] && !stateCopy.tombstones[pid]; });

      var batches = chunk(toPush, 400);
      function pushBatch(i) {
        if (i >= batches.length) return Promise.resolve();
        var b = db().batch();
        batches[i].forEach(function (p) {
          var ref = patientsCol(uid).doc(p.id);
          b.set(ref, { patientId: p.id, payload: p, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAtMs: nowMs, deletedAt: null, schemaVersion: SCHEMA_VERSION });
        });
        return b.commit().then(function () {
          batches[i].forEach(function (p) { stateCopy.patients[p.id] = { hash: hashOf(p), updatedAtMs: nowMs }; });
          return pushBatch(i + 1);
        });
      }
      function pushTombstones(i) {
        if (i >= toTombstone.length) return Promise.resolve();
        var pid = toTombstone[i];
        return patientsCol(uid).doc(pid).set({ deletedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAtMs: nowMs }, { merge: true })
          .then(function () { stateCopy.tombstones[pid] = { deletedAtMs: nowMs }; delete stateCopy.patients[pid]; return pushTombstones(i + 1); });
      }

      return pushBatch(0).then(function () { return pushTombstones(0); }).then(function () {
        // إعدادات الطبيب/العيادة — رفع بسيط عند كل مزامنة (خفيف الحجم، لا حاجة لـ Diff منفصل)
        return clinicDoc(uid).collection('sync').doc('settings').set(
          Object.assign({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, readLocalSettings())
        ).catch(function () {});
      }).then(function () {
        stateCopy.conflicts = newConflicts;
        stateCopy.lastSyncAt = new Date().toISOString();
        stateCopy.lastSyncAtMs = nowMs;
        setSyncState(stateCopy);
        return { ok: true, pushed: toPush.length, tombstoned: toTombstone.length, conflicts: Object.keys(newConflicts).length };
      });
    }).catch(function () {
      return { ok: false, message: 'تعذّرت المزامنة، سيُعاد المحاولة لاحقاً.' };
    }).finally(function () { syncing = false; });
  }

  function syncImportedBackup() {
    patchSyncState({ pendingImportSync: false });
    return runSyncNow('import-confirmed');
  }

  // ============================================================
  // ربط الأحداث (Event-driven فقط — بلا Listener مستمر وبلا فحص دوري)
  // ============================================================
  var suppressNextAutoSync = false;
  document.addEventListener('dp:backup-imported', function () {
    suppressNextAutoSync = true;
    patchSyncState({ pendingImportSync: true });
  });
  document.addEventListener('dp:patients-saved', function () {
    if (suppressNextAutoSync) { suppressNextAutoSync = false; return; } // الاستيراد يحتاج تأكيداً صريحاً بدل مزامنة تلقائية فورية
    var st = getSyncState(); var uid = currentUid();
    if (uid && st.uid === uid) scheduleSync('patients-saved');
  });
  document.addEventListener('dp:settings-saved', function () {
    var st = getSyncState(); var uid = currentUid();
    if (uid && st.uid === uid) scheduleSync('settings-saved');
  });
  window.addEventListener('online', function () {
    var st = getSyncState(); var uid = currentUid();
    if (uid && st.uid === uid) scheduleSync('online');
  });

  if (window.DPAuth && window.DPAuth.onChange) {
    window.DPAuth.onChange(function (user) {
      if (!user) return; // تسجيل الخروج: لا شيء هنا — تُدار الإيقافات في account-ui.js
      var st = getSyncState();
      if (st.uid && st.uid !== user.uid) { emitNeedsReconciliation(); return; } // حساب مختلف عن الجهاز — تحذير صريح مطلوب
      if (st.uid === user.uid) { scheduleSync('login'); return; } // نفس الحساب المرتبط سابقاً — مزامنة روتينية
      emitNeedsReconciliation(); // ربط أول لم يُحسم بعد على هذا الجهاز
    });
  }

  // ============================================================
  // الواجهة العامة
  // ============================================================
  window.DPSync = {
    get ready() { return isReady(); },
    getSyncState: getSyncState,
    getLocalSummary: function () {
      var list = readLocalPatients();
      return { count: list.length, lastAddedMs: list.reduce(function (m, p) { return Math.max(m, createdMsFromId(p.id)); }, 0) };
    },
    needsReconciliation: function () {
      var uid = currentUid(); if (!uid) return false;
      var st = getSyncState();
      return st.uid !== uid;
    },
    isDifferentAccount: function () {
      var uid = currentUid(); if (!uid) return false;
      var st = getSyncState();
      return !!(st.uid && st.uid !== uid);
    },
    confirmDifferentAccountProceed: function () {
      // إقرار صريح من المستخدم بمتابعة ربط حساب مختلف على جهاز فيه بيانات مرتبطة بحساب سابق
      var uid = currentUid(); if (!uid) return;
      patchSyncState({ uid: null }); // يُعاد التقييم الطبيعي (4 حالات) في الاستدعاء التالي لـ evaluateLinkCase
    },
    evaluateLinkCase: evaluateLinkCase,
    uploadDeviceData: uploadDeviceData,
    restoreFromCloud: restoreFromCloud,
    scheduleSync: scheduleSync,
    runSyncNow: runSyncNow,
    syncImportedBackup: syncImportedBackup,
    getStatus: function () {
      var uid = currentUid();
      var st = getSyncState();
      return {
        online: isOnline(), ready: isReady(), signedIn: !!uid,
        linked: !!(uid && st.uid === uid),
        lastSyncAt: st.lastSyncAt, pendingImportSync: !!st.pendingImportSync,
        conflictCount: Object.keys(st.conflicts || {}).length
      };
    }
  };
})();
