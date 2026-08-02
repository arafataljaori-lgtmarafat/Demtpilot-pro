'use strict';
/* اختبار DP3 لتطبيق Pro — مستقل بالكامل، لا يعتمد على مسار مشروع Admin.
   يحمّل activation.js الحقيقي داخل VM بمحاكاة DOM بسيطة، ويُفعّل الأكواد عبر
   نفس مسار الإنتاج الحقيقي (محاكاة ضغط زر "تفعيل التطبيق"). مولّد الأكواد هنا
   نسخة اختبارية طبق الأصل من مواصفة DP3 (لتوليد أكواد صحيحة للاختبار فقط —
   وليست الشيفرة المستخدمة فعلياً؛ التوليد الحقيقي حصراً من خادم Admin).
   التشغيل:  node test/dp3-activation-test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

/* ---------------- مولّد DP3 + legacy اختباريان (مطابقان للمواصفة، مستقلان عن أي مشروع آخر) ---------------- */
function sha256(ascii) {
  function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
  var maxWord = Math.pow(2, 32), result = '';
  var words = [], asciiBitLength = ascii.length * 8;
  var hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [], primeCounter = k.length;
  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (var i = 0; i < 313; i += candidate) { isComposite[i] = candidate; }
      hash[primeCounter] = (Math.pow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) { var j = ascii.charCodeAt(i); if (j >> 8) return; words[i >> 2] |= j << ((3 - i) % 4) * 8; }
  words[words.length] = ((asciiBitLength / maxWord) | 0); words[words.length] = (asciiBitLength);
  for (j = 0; j < words.length;) {
    var w = words.slice(j, j += 16), oldHash = hash; hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2]; var a = hash[0], e = hash[4];
      var temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i]
        + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash); hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) { hash[i] = (hash[i] + oldHash[i]) | 0; }
  }
  for (i = 0; i < 8; i++) { for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); } }
  return result;
}
function _sx() { var p = [30, 10, 36, 99, 34, 105, 11, 49, 123, 55, 0, 5, 40, 110, 14, 121, 22, 51, 57, 4, 25, 53, 40, 63, 126, 104, 106, 104, 108, 124, 59, 11], m = 0x5A, s = ''; for (var i = 0; i < p.length; i++) s += String.fromCharCode(p[i] ^ m); return s; }
function _nrm(id) { return String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
const DP3_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function dp3Sig(productId, appKey, normalizedDevice, daysDecimal, nonce) {
  const s = _sx();
  let h = sha256(s + '::DP3::' + productId + '::' + appKey + '::' + normalizedDevice + '::' + daysDecimal + '::' + nonce + '::' + s);
  for (let i = 0; i < 128; i++) h = sha256(h + normalizedDevice + productId + appKey + daysDecimal + nonce + s + i);
  return h.substr(0, 16).toUpperCase();
}
function dp3Generate(productId, appKey, deviceId, days) {
  const n = _nrm(deviceId); if (!n) return '';
  const d = Math.max(0, Math.min(3650, Math.round(Number(days) || 0)));
  const nonce = Array.from(crypto.randomBytes(8)).map((b) => DP3_ALPHABET.charAt(b & 31)).join('');
  const sig = dp3Sig(productId, appKey, n, String(d), nonce);
  return 'DP3-' + appKey + '-' + d.toString(36).toUpperCase() + '-' + nonce + '-' + sig;
}
function genProCode(deviceId, days) { return dp3Generate('DENTPILOT_PRO', 'P', deviceId, days); }
function genStudentCode(deviceId, days) { return dp3Generate('DENTPILOT_STUDENT', 'S', deviceId, days); }
// legacy Pro: بلا PRODUCT_ID إطلاقاً (مطابق لـ licenseForClinic في Admin وlicenseFor في Pro/activation.js الأصلي)
function legacyProCode(deviceId) {
  const s = _sx(), n = _nrm(deviceId);
  if (!n) return '';
  let h = sha256(s + '::' + n + '::' + s);
  for (let i = 0; i < 512; i++) h = sha256(h + n + s + i);
  const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; let out = '';
  for (let i = 0; i < 15; i++) { const v = parseInt(h.substr(i * 2, 2), 16); out += A.charAt(v & 31); }
  let sum = 0; for (let i = 0; i < out.length; i++) sum = (sum * 33 + out.charCodeAt(i)) >>> 0;
  out += A.charAt(sum % 32);
  return out.replace(/(....)(....)(....)(....)/, '$1-$2-$3-$4');
}

/* ---------------- محاكاة DOM بسيطة لتشغيل activation.js الحقيقي ---------------- */
function makeEl() {
  const el = { _v: '', hidden: false, listeners: {}, get value() { return this._v; }, set value(v) { this._v = v; },
    classList: { add() {}, remove() {} }, addEventListener(ev, fn) { (el.listeners[ev] = el.listeners[ev] || []).push(fn); },
    click() { (el.listeners['click'] || []).forEach((fn) => fn({})); }, setAttribute() {}, getAttribute() { return null; } };
  return el;
}
function makeSandbox() {
  const store = {};
  const localStorage = { getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  let clockOffset = 0;
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + clockOffset); } static now() { return RealDate.now() + clockOffset; } }
  const els = { activationOverlay: makeEl(), actDeviceId: makeEl(), actCopyBtn: makeEl(), actCode: makeEl(), actActivateBtn: makeEl(), actError: makeEl(), actHint: makeEl() };
  els.activationOverlay.hidden = true; els.actError.hidden = true;
  const listeners = {};
  const document = { addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); }, getElementById: (id) => els[id] || null, querySelector: () => null };
  const sandbox = { window: {}, document, localStorage, navigator: { clipboard: null }, Date: FakeDate, console, setTimeout, clearTimeout };
  sandbox.window.crypto = { getRandomValues: (arr) => { const b = crypto.randomBytes(arr.length); for (let i = 0; i < arr.length; i++) arr[i] = b[i]; return arr; } };
  sandbox.window.localStorage = localStorage; sandbox.window.document = document;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'activation.js'), 'utf8'), sandbox, { filename: 'activation.js' });
  (listeners['DOMContentLoaded'] || []).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  return {
    DPLicense: sandbox.window.DPLicense, store,
    advanceClock: (ms) => { clockOffset += ms; },
    tryActivate(code) { els.actCode.value = code; els.actError.hidden = true; els.actActivateBtn.click(); return { ok: els.actError.hidden === true }; },
  };
}

let PASS = 0, FAIL = 0;
const ok = (n, c, x) => { c ? (PASS++, console.log('  \u2713 ' + n)) : (FAIL++, console.log('  \u2717 ' + n + (x !== undefined ? ' \u2192 ' + JSON.stringify(x) : ''))); };

console.log('\n== اختبار DP3 — DentPilot Pro (مستقل) ==\n');

[[30, 'monthly', 'شهري'], [180, 'six_months', 'ستة أشهر'], [365, 'annual', 'سنوي'], [0, 'lifetime', 'دائم']].forEach(([days, key, label]) => {
  const sb = makeSandbox();
  const dev = sb.DPLicense.getDeviceId();
  ok(`رمز جهاز Pro يبدأ بـ DP- (${dev})`, dev.indexOf('DP-') === 0);
  const code = genProCode(dev, days);
  const before = Date.now();
  const res = sb.tryActivate(code);
  ok(`تفعيل خطة ${label} (${days} يوم) ينجح`, res.ok, res);
  const info = sb.DPLicense.getActivationInfo();
  ok(`  الخطة المعروضة صحيحة (${key})`, info && info.plan === key, info);
  if (days === 0) ok('  دائم: لا expiresAt (0)', info.expiresAt === 0);
  else ok('  المدة تبدأ من لحظة التفعيل الفعلي (±2s)', Math.abs(info.expiresAt - (before + days * 86400000)) < 2000);
  ok('  accessState = activated', sb.DPLicense.getAccessState() === 'activated');
});

(function () {
  const sb = makeSandbox(); const dev = sb.DPLicense.getDeviceId();
  const codes = [30, 180, 365, 0].map((d) => genProCode(dev, d));
  ok('الأكواد الأربع لنفس الجهاز مختلفة', new Set(codes).size === 4);
})();
(function () {
  const sb = makeSandbox();
  ok('كود Student (APP_KEY=S) مرفوض داخل Pro', !sb.tryActivate(genStudentCode('DS-XXXX-XXXX-XXXX', 30)).ok);
})();
(function () {
  const sb = makeSandbox();
  ok('كود جهاز آخر مرفوض', !sb.tryActivate(genProCode('DP-ZZZZ-ZZZZ-ZZZZ', 30)).ok);
})();
(function () {
  const sb = makeSandbox(); const dev = sb.DPLicense.getDeviceId();
  const code = genProCode(dev, 30);
  const parts = code.split('-'); parts[4] = parts[4].slice(0, -1) + (parts[4].slice(-1) === 'A' ? 'B' : 'A');
  ok('كود بتوقيع مُعبَث به مرفوض', !sb.tryActivate(parts.join('-')).ok);
})();
(function () {
  const sb = makeSandbox(); const dev = sb.DPLicense.getDeviceId();
  const code = genProCode(dev, 30);
  const r1 = sb.tryActivate(code); const info1 = sb.DPLicense.getActivationInfo();
  const r2 = sb.tryActivate(code); const info2 = sb.DPLicense.getActivationInfo();
  ok('أول إدخال ينجح', r1.ok);
  ok('إعادة إدخال نفس الكود تُرفض', !r2.ok);
  ok('لا تمديد عند إعادة الإدخال', info1.expiresAt === info2.expiresAt);
})();
(function () {
  const sb = makeSandbox(); const dev = sb.DPLicense.getDeviceId();
  sb.tryActivate(genProCode(dev, 30));
  const info1 = sb.DPLicense.getActivationInfo();
  const r2 = sb.tryActivate(genProCode(dev, 30));
  const info2 = sb.DPLicense.getActivationInfo();
  ok('تمديد قبل الانتهاء يضيف المدة فوق الحالية', r2.ok && Math.abs((info2.expiresAt - info1.expiresAt) - 30 * 86400000) < 2000);
})();
(function () {
  const sb = makeSandbox(); const dev = sb.DPLicense.getDeviceId();
  sb.tryActivate(genProCode(dev, 0));
  const r2 = sb.tryActivate(genProCode(dev, 30));
  const info = sb.DPLicense.getActivationInfo();
  ok('دائم لا يُستبدَل بخطة مؤقتة', !r2.ok && info.plan === 'lifetime');
})();
(function () {
  const sb = makeSandbox(); const dev = sb.DPLicense.getDeviceId();
  sb.tryActivate(genProCode(dev, 30));
  sb.advanceClock(31 * 86400000);
  ok('بعد الانتهاء: accessState = expired', sb.DPLicense.getAccessState() === 'expired');
  ok('  activationInfo().active = false', sb.DPLicense.getActivationInfo().active === false);
  sb.advanceClock(-5 * 86400000);
  ok('إعادة الساعة للخلف لا تُعيد الاشتراك المنتهي', sb.DPLicense.getActivationInfo().active === false && sb.DPLicense.getAccessState() === 'expired');
})();
(function () {
  const sb = makeSandbox(); const dev = sb.DPLicense.getDeviceId();
  const res = sb.tryActivate(legacyProCode(dev));
  const info = sb.DPLicense.getActivationInfo();
  ok('legacy Pro يبقى مقبولاً كتفعيل دائم دون أي تغيير', res.ok && info.plan === 'lifetime' && info.expiresAt === 0);
})();
(function () {
  const sb = makeSandbox();
  sb.store['dentpilot_pro_some_clinic_data'] = JSON.stringify({ patients: ['x'] });
  const dev = sb.DPLicense.getDeviceId();
  sb.tryActivate(genProCode(dev, 30));
  sb.advanceClock(31 * 86400000);
  sb.DPLicense.getAccessState();
  ok('بيانات العيادة تبقى سليمة بعد الانتهاء', sb.store['dentpilot_pro_some_clinic_data'] === JSON.stringify({ patients: ['x'] }));
})();

console.log('\n----------------------------------------');
console.log('نتيجة اختبار DP3 — Pro: ' + PASS + ' ناجح، ' + FAIL + ' فاشل');
console.log('----------------------------------------\n');
process.exit(FAIL ? 1 : 0);
