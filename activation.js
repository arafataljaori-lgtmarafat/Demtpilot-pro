/* ============================================================
   DentPilot Pro — التفعيل + التجربة المجانية (72 ساعة / 3 أيام)
   محلي بالكامل. لا يغيّر مفاتيح التفعيل الحالية (dentpilot_device_id / dentpilot_license).
   ترتيب الوصول: مُفعّل ← تجربة سارية ← تجربة منتهية (تفعيل إلزامي).
   ============================================================ */
(function () {
  'use strict';
function sha256(ascii){
  function rr(v,a){return (v>>>a)|(v<<(32-a));}
  var maxWord=Math.pow(2,32),result='';
  var words=[],asciiBitLength=ascii.length*8;
  var hash=sha256.h=sha256.h||[],k=sha256.k=sha256.k||[],primeCounter=k.length;
  var isComposite={};
  for(var candidate=2;primeCounter<64;candidate++){
    if(!isComposite[candidate]){
      for(var i=0;i<313;i+=candidate){isComposite[i]=candidate;}
      hash[primeCounter]=(Math.pow(candidate,.5)*maxWord)|0;
      k[primeCounter++]=(Math.pow(candidate,1/3)*maxWord)|0;
    }
  }
  ascii+='\x80';
  while(ascii.length%64-56)ascii+='\x00';
  for(i=0;i<ascii.length;i++){
    var j=ascii.charCodeAt(i);
    if(j>>8)return;
    words[i>>2]|=j<<((3-i)%4)*8;
  }
  words[words.length]=((asciiBitLength/maxWord)|0);
  words[words.length]=(asciiBitLength);
  for(j=0;j<words.length;){
    var w=words.slice(j,j+=16),oldHash=hash;
    hash=hash.slice(0,8);
    for(i=0;i<64;i++){
      var w15=w[i-15],w2=w[i-2];
      var a=hash[0],e=hash[4];
      var temp1=hash[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&hash[5])^((~e)&hash[6]))+k[i]
        +(w[i]=(i<16)?w[i]:(w[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
      var temp2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
      hash=[(temp1+temp2)|0].concat(hash);hash[4]=(hash[4]+temp1)|0;
    }
    for(i=0;i<8;i++){hash[i]=(hash[i]+oldHash[i])|0;}
  }
  for(i=0;i<8;i++){for(j=3;j+1;j--){var b=(hash[i]>>(j*8))&255;result+=((b<16)?0:'')+b.toString(16);}}
  return result;
}
function _sx(){var p=[30,10,36,99,34,105,11,49,123,55,0,5,40,110,14,121,22,51,57,4,25,53,40,63,126,104,106,104,108,124,59,11],m=0x5A,s='';for(var i=0;i<p.length;i++)s+=String.fromCharCode(p[i]^m);return s;}
function _nrm(id){return String(id||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function licenseFor(id){
  var s=_sx(),n=_nrm(id);
  if(!n) return '';
  var h=sha256(s+'::'+n+'::'+s);
  for(var i=0;i<512;i++){h=sha256(h+n+s+i);}
  var A='0123456789ABCDEFGHJKMNPQRSTVWXYZ',out='';
  for(i=0;i<15;i++){var v=parseInt(h.substr(i*2,2),16);out+=A.charAt(v&31);}
  var sum=0;for(i=0;i<out.length;i++)sum=(sum*33+out.charCodeAt(i))>>>0;
  out+=A.charAt(sum%32);
  return out.replace(/(....)(....)(....)(....)/,'$1-$2-$3-$4');
}
function licenseValid(id,code){ if(!id||!code) return false; return _nrm(code)===_nrm(licenseFor(id)); }

/* ============================================================
   DP3 — يضاف إلى جانب legacy أعلاه دون حذف أو تعديله. نفس sha256/_sx (السرّ)
   ونفس مواصفة DP3-<APP_KEY>-<DAYS36>-<NONCE8>-<SIG16> المستخدمة في لوحة التحكم وStudent.
   APP_KEY='P' وPRODUCT_ID='DENTPILOT_PRO' خاصّان بـ Pro فقط (يرفضان كود Student). */
var PRODUCT_ID = 'DENTPILOT_PRO';
var DP3_APP_KEY = 'P';
function _dp3Sig(normalizedDevice, daysDecimal, nonce) {
  var s = _sx();
  var raw = s + '::DP3::' + PRODUCT_ID + '::' + DP3_APP_KEY + '::' + normalizedDevice + '::' + daysDecimal + '::' + nonce + '::' + s;
  var h = sha256(raw);
  for (var i = 0; i < 128; i++) h = sha256(h + normalizedDevice + PRODUCT_ID + DP3_APP_KEY + daysDecimal + nonce + s + i);
  return h.substr(0, 16).toUpperCase();
}
function dp3Parse(code) {
  var parts = String(code || '').toUpperCase().trim().split('-');
  if (parts.length !== 5 || parts[0] !== 'DP3') return null;
  var appKey = parts[1], days36 = parts[2], nonce = parts[3], sig = parts[4];
  if (appKey.length !== 1) return null;
  var days = parseInt(days36, 36);
  if (isNaN(days) || days < 0 || days > 3650) return null;
  if (!nonce || nonce.length !== 8) return null;
  if (!/^[0-9A-F]{16}$/.test(sig)) return null;
  return { appKey: appKey, days: days, nonce: nonce, sig: sig };
}
function dp3Verify(deviceIdVal, code) {
  var parsed = dp3Parse(code);
  if (!parsed || parsed.appKey !== DP3_APP_KEY) return null;   // يرفض كود Student (APP_KEY='S')
  var n = _nrm(deviceIdVal);
  if (!n) return null;
  var expectSig = _dp3Sig(n, String(parsed.days), parsed.nonce);
  if (expectSig !== parsed.sig) return null;
  return { days: parsed.days };
}
function _dp3PlanMeta(days) {
  if (days === 0) return { key: 'lifetime', label: 'دائم' };
  if (days === 30) return { key: 'monthly', label: 'شهري' };
  if (days === 180) return { key: 'six_months', label: 'ستة أشهر' };
  if (days === 365) return { key: 'annual', label: 'سنوي' };
  return { key: 'custom', label: days + ' يوم' };
}
function _dp3StateSig(normalizedDevice, normalizedCode, startsAt, expiresAt) {
  var s = _sx();
  var raw = s + '::DP3STATE::' + PRODUCT_ID + '::' + normalizedDevice + '::' + normalizedCode + '::' + startsAt + '::' + expiresAt + '::' + s;
  return sha256(raw).substr(0, 16).toUpperCase();
}
  var DK = 'dentpilot_device_id', LK = 'dentpilot_license';                 // مفاتيح Pro الحالية — دون تغيير
  var TKS = 'dentpilot_pro_trial_start', TKE = 'dentpilot_pro_trial_expires'; // مفاتيح تجربة Pro الجديدة
  var TRIAL_MS = 72 * 60 * 60 * 1000;   // 72 ساعة
  var _A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function _now() { return Date.now(); }
  function _gen() {
    var r = [], i;
    if (window.crypto && window.crypto.getRandomValues) { var u = new Uint8Array(12); window.crypto.getRandomValues(u); for (i=0;i<12;i++) r.push(u[i]); }
    else { for (i=0;i<12;i++) r.push(Math.floor(Math.random()*256)); }
    var s=''; for (i=0;i<12;i++) s += _A.charAt(r[i] & 31);
    return 'DP-' + s.substr(0,4) + '-' + s.substr(4,4) + '-' + s.substr(8,4);
  }
  function deviceId() {
    var id; try { id = localStorage.getItem(DK); } catch (e) {}
    if (!id) { id = _gen(); try { localStorage.setItem(DK, id); } catch (e) {} }
    return id;
  }
  var USED_KEY = 'dentpilot_pro_activation_used_v1';   // بصمات أكواد DP3 المُستخدَمة محلياً — منع إعادة الاستخدام لتمديد المدة
  function _dp3Fingerprint(normalizedCode) { return sha256(normalizedCode).substr(0, 16); }
  function _dp3LoadUsed() {
    try { var raw = localStorage.getItem(USED_KEY); var arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
  }
  function _dp3MarkUsed(normalizedCode) {
    var list = _dp3LoadUsed(); var fp = _dp3Fingerprint(normalizedCode);
    if (list.indexOf(fp) === -1) { list.push(fp); try { localStorage.setItem(USED_KEY, JSON.stringify(list)); } catch (e) {} }
  }
  function _dp3WasUsed(normalizedCode) { return _dp3LoadUsed().indexOf(_dp3Fingerprint(normalizedCode)) !== -1; }
  // مقاومة تغيير ساعة الجهاز للخلف — نفس أسلوب Student تماماً
  var LSK = 'dentpilot_pro_lastseen_v1';
  function _dp3TouchLastSeen() {
    var now = Date.now(), last = 0;
    try { var v = localStorage.getItem(LSK); last = v ? (parseInt(v, 10) || 0) : 0; } catch (e) {}
    var eff = Math.max(now, last);
    try { localStorage.setItem(LSK, String(eff)); } catch (e) {}
    return eff;
  }
  function _dp3ReadState() {
    try {
      var raw = localStorage.getItem(LK); if (!raw || raw.charAt(0) !== '{') return null;
      var saved = JSON.parse(raw);
      if (saved.version !== 3) return null;
      var n = _nrm(deviceId()), normalizedCode = _nrm(saved.code || '');
      var expectSig = _dp3StateSig(n, normalizedCode, saved.startsAt || 0, saved.expiresAt || 0);
      if (expectSig !== saved.stateSig) return null;
      if (!dp3Verify(deviceId(), saved.code)) return null;
      return saved;
    } catch (e) { return null; }
  }
  function _dp3SaveState(code, planDays, startsAt, expiresAt, redeemedAt) {
    var n = _nrm(deviceId()), normalizedCode = _nrm(code), meta = _dp3PlanMeta(planDays);
    var state = {
      version: 3, code: String(code || '').toUpperCase().trim(), planDays: planDays, planKey: meta.key, planLabel: meta.label,
      redeemedAt: redeemedAt, startsAt: startsAt, expiresAt: expiresAt, lastSeenAt: Date.now(),
      stateSig: _dp3StateSig(n, normalizedCode, startsAt, expiresAt)
    };
    try { localStorage.setItem(LK, JSON.stringify(state)); } catch (e) {}
    _dp3MarkUsed(normalizedCode);
    return state;
  }
  function activationInfo() {
    try {
      var raw = localStorage.getItem(LK); if (!raw) return null;
      if (raw.charAt(0) === '{') {
        var savedRaw = JSON.parse(raw);
        if (savedRaw.version !== 3) return null;
        var state = _dp3ReadState();
        if (!state) return null;
        var effNow = _dp3TouchLastSeen();
        var active = !state.expiresAt || effNow < state.expiresAt;
        return {
          type: 'dp3', version: 3, plan: state.planKey, planLabel: state.planLabel, planDays: state.planDays,
          expiresAt: state.expiresAt, startsAt: state.startsAt, redeemedAt: state.redeemedAt,
          activatedAt: state.redeemedAt, active: active, code: state.code
        };
      }
      if (licenseValid(deviceId(), raw)) return { type: 'legacy', plan: 'lifetime', planLabel: 'دائم', expiresAt: 0, active: true };
    } catch (e) {}
    return null;
  }
  function isActivated() { var info = activationInfo(); return !!info && info.active; }
  function activate(code) {
    var trimmed = String(code || '').trim();
    var normalized = _nrm(trimmed);
    if (normalized.indexOf('DP3') === 0) {
      var verified = dp3Verify(deviceId(), trimmed);
      if (!verified) return false;                    // شكل خاطئ، توقيع باطل، أو APP_KEY يخص Student لا Pro
      if (_dp3WasUsed(normalized)) return false;       // مُستخدَم سابقاً — يُرفض لمنع تمديد المدة بإعادة إدخاله
      var days = verified.days;
      var current = activationInfo();
      var currentIsLifetime = !!current && !current.expiresAt;
      if (currentIsLifetime && days > 0) return false; // تفعيل دائم حالي لا يُستبدَل بخطة مؤقتة
      var now = Date.now(), startsAt, expiresAt;
      if (days === 0) {
        startsAt = now; expiresAt = 0;
      } else if (current && current.type === 'dp3' && current.active && current.expiresAt) {
        startsAt = current.startsAt || now;
        expiresAt = Math.max(now, current.expiresAt) + days * 86400000;
      } else {
        startsAt = now; expiresAt = now + days * 86400000;
      }
      _dp3SaveState(trimmed, days, startsAt, expiresAt, new Date(now).toISOString());
      return true;
    }
    // legacy — كما كان تماماً دون أي تعديل
    if (licenseValid(deviceId(), code)) { try { localStorage.setItem(LK, _nrm(code)); } catch (e) {} return true; }
    return false;
  }

  function trialInfo() { try { var s = localStorage.getItem(TKS), e = localStorage.getItem(TKE); if (s && e) return { start:+s, expires:+e }; } catch (x) {} return null; }
  function ensureTrial() { var t = trialInfo(); if (!t) { var s=_now(), e=s+TRIAL_MS; try { localStorage.setItem(TKS,String(s)); localStorage.setItem(TKE,String(e)); } catch (x) {} t={start:s,expires:e}; } return t; }
  function accessState() {
    if (isActivated()) return 'activated';        // المفعّلون: تجاوز التجربة كلياً، ولا تُنشأ لهم طوابع
    var t = ensureTrial();
    return _now() < t.expires ? 'trial' : 'expired';
  }
  function trialRemainingMs() { var t = trialInfo(); return t ? Math.max(0, t.expires - _now()) : 0; }
  function trialRemainingHours() { return Math.ceil(trialRemainingMs() / 3600000); }
  function trialRemainingDays() { return Math.ceil(trialRemainingMs() / 86400000); }

  window.DPLicense = {
    getDeviceId: deviceId, isActivated: isActivated,
    getActivationInfo: activationInfo,
    getAccessState: accessState, trialRemainingMs: trialRemainingMs,
    trialRemainingHours: trialRemainingHours, trialRemainingDays: trialRemainingDays,
    // يكشف دالة التحقق/الحفظ الحالية كما هي دون أي تعديل في منطقها — لاستخدامها من صفحة
    // «إكمال التفعيل» الجديدة (script.js) دون تكرار الخوارزمية أو إعادة كتابتها.
    activate: activate,
    onActivated: null
  };

  document.addEventListener('DOMContentLoaded', function () {
    var ov = document.getElementById('activationOverlay'); if (!ov) return;
    var idEl=document.getElementById('actDeviceId'), copyBtn=document.getElementById('actCopyBtn'),
        inp=document.getElementById('actCode'), btn=document.getElementById('actActivateBtn'),
        err=document.getElementById('actError'), hint=document.getElementById('actHint');
    idEl.textContent = deviceId();
    copyBtn.addEventListener('click', function () {
      var t = deviceId(); try { navigator.clipboard && navigator.clipboard.writeText(t); } catch (e) {}
      var o = copyBtn.textContent; copyBtn.textContent = '✓ نُسخ'; setTimeout(function(){copyBtn.textContent=o;},1500);
    });
    function attempt(){ if(activate(inp.value)){ err.hidden=true; ov.hidden=true; if(typeof window.DPLicense.onActivated==='function') window.DPLicense.onActivated(); } else { err.hidden=false; inp.classList.add('invalid'); } }
    btn.addEventListener('click', attempt);
    inp.addEventListener('keydown', function(e){ if(e.key==='Enter') attempt(); });
    inp.addEventListener('input', function(){ inp.classList.remove('invalid'); err.hidden=true; });

    var state = accessState();
    if (state === 'expired') {
      if (hint) hint.textContent = 'انتهت الفترة التجريبية المجانية. للاستمرار في استخدام DentPilot Pro، الرجاء إرسال معرّف الجهاز للمطور للحصول على كود التفعيل.';
      ov.hidden = false;     // حظر
    } else {
      ov.hidden = true;      // مُفعّل أو تجربة سارية
    }
  });
})();
