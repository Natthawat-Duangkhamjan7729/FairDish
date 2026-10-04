/* FairDish — ปุ่ม "ติดตั้งแอป" + หน้าต่างวิธีติดตั้ง (ตรวจระบบให้อัตโนมัติ) */
"use strict";

/* =========================================================
   8.5 ติดตั้งแอป (v2.3)
   ========================================================= */

/** ระบบของเครื่อง → "ios" | "android" | "desktop" (คอมไม่มีปุ่มติดตั้ง) (iPadOS รุ่นใหม่แสร้งเป็น Mac จึงดูจากจอสัมผัสด้วย) */
function detectPlatform(ua, platform, touchPoints){
  ua = String(ua || "");
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Macintosh/i.test(ua) && (touchPoints || 0) > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/^(iPhone|iPad|iPod)/.test(String(platform || ""))) return "ios";
  return "desktop";
}
/** เปิดผ่านเบราว์เซอร์ในแอปแชตอยู่ไหม (ติดตั้งจากในนั้นไม่ได้) → "line" | "facebook" | "instagram" | "" */
function detectInApp(ua){
  ua = String(ua || "");
  if (/\bLine\//i.test(ua)) return "line";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/Instagram/i.test(ua)) return "instagram";
  return "";
}

var Install = {
  prompt: null,       // beforeinstallprompt ที่เก็บไว้ (Chrome บน Android)
  platform(){ return detectPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints); },
  /** ปุ่มติดตั้งมีเฉพาะมือถือ (iOS / Android) ที่ยังไม่ได้เปิดจากแอปที่ติดตั้งแล้ว */
  available(){ return this.platform() !== "desktop" && !this.standalone(); },
  standalone(){
    try {
      return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    } catch(e){ return false; }
  }
};

var INSTALL_APPS = { line:"LINE", facebook:"Facebook", instagram:"Instagram" };
var ICON_IOS_SHARE='<svg class="i-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
var ICON_ADD_SQUARE='<svg class="i-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
var ICON_KEBAB='<svg class="i-inline" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
var ICON_APP='<img class="i-inline i-app" src="img/icon-192.png" alt="">';

function installSteps(list){
  return '<ol class="install-steps">'+list.map(function(s, i){
    return '<li><span class="install-ico">'+s[0]+'</span><span><b>ขั้นตอนที่ '+(i+1)+':</b> '+s[1]+'</span></li>';
  }).join("")+'</ol>';
}

function installBody(platform){
  if (platform === "ios") return installSteps([
      [ICON_IOS_SHARE, L('แตะปุ่ม <b>"แชร์"</b> บนแถบเครื่องมือของ Safari (ถ้าไม่เห็น ให้แตะ <b>•••</b> ก่อน)')],
      [ICON_ADD_SQUARE, L('เลื่อนลงแล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b> (บางรุ่นต้องแตะ "ดูเพิ่มเติม" ก่อน) แล้วแตะ <b>"เพิ่ม"</b>')],
      [ICON_APP, L("เปิด FairDish จากหน้าจอโฮมของคุณ")]
    ])+
    '<p class="install-note">'+L("ใช้ Safari หรือ Chrome ก็ได้ แอปที่ติดตั้งจะเก็บบิลส่วนตัวแยกจากในเบราว์เซอร์ ส่วนบิลกลุ่มเปิดจากลิงก์กลุ่มได้เหมือนเดิม")+'</p>';
  var directBtn = Install.prompt
    ? '<button class="btn-sm btn-block install-now" id="installNow">'+L("ติดตั้ง FairDish เลย")+'</button>'+
      '<p class="install-or">'+L("หรือทำเองตามนี้")+'</p>'
    : '';
  return directBtn + installSteps([
      [ICON_KEBAB, 'แตะเมนู <b>⋮</b> มุมขวาบนของ Chrome'],
      [ICON_ADD_SQUARE, L('เลือก <b>"ติดตั้งแอป"</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก"</b> แล้วแตะ <b>"ติดตั้ง"</b>')],
      [ICON_APP, L("เปิด FairDish จากหน้าจอหลักหรือลิ้นชักแอป")]
    ]);
}

function renderInstall(){
  var box = document.getElementById("installDialog");
  if (!box) return;
  var inApp = detectInApp(navigator.userAgent);
  var platform = Install.platform();
  var external = location.origin + location.pathname + "?openExternalBrowser=1" + location.hash;
  box.innerHTML =
    '<div class="install-head">'+
      '<img src="img/icon-192.png" alt="" width="48" height="48">'+
      '<div><h2 id="installTitle">'+L("ติดตั้ง FairDish")+'</h2><p>'+L("เปิดจากหน้าจอโฮมได้เหมือนแอป ไม่ต้องโหลดจาก Store")+'</p></div>'+
      '<button class="icon-btn" id="installClose" aria-label="'+L("ปิด")+'">'+ICON_X+'</button>'+
    '</div>'+
    (inApp ? '<div class="notice warn install-inapp"><p>ตอนนี้เปิดอยู่ในแอป '+INSTALL_APPS[inApp]+' ซึ่งติดตั้งไม่ได้ '+
        'เปิดหน้านี้ใน Safari หรือ Chrome ก่อน แล้วทำตามขั้นตอนด้านล่าง</p>'+
        (inApp === "line"
          ? '<a class="btn-quiet" href="'+esc(external)+'">'+L("เปิดในเบราว์เซอร์")+'</a>'
          : '<button class="btn-quiet" id="installCopyLink">'+L("คัดลอกลิงก์")+'</button>')+
      '</div>' : '')+
    '<div class="install-body">'+installBody(platform)+'</div>';
}

function openInstall(){
  var box = document.getElementById("installDialog");
  if (!box || !Install.available()) return;
  renderInstall();
  if (typeof box.showModal === "function") box.showModal(); else box.setAttribute("open","");
}
function closeInstall(){
  var box = document.getElementById("installDialog");
  if (!box) return;
  if (typeof box.close === "function") box.close(); else box.removeAttribute("open");
}
async function installNow(){
  var p = Install.prompt;
  if (!p) return;
  Install.prompt = null;
  try {
    await p.prompt();
    var choice = await p.userChoice;
    if (choice && choice.outcome === "accepted") closeInstall();
  } catch(e){}
  renderInstall();
}
/* ---- v2.4: ชวนติดตั้งตอนหารบิลเสร็จ (ช่วงที่รู้สึกดีกับแอป) แทนการเร่งตั้งแต่แรก ---- */
var INSTALL_NUDGE_KEY = "fairdish:install-nudge:v1";
function installNudgeHTML(){
  if (!Install.available() || ui.installNudgeOff) return "";
  return '<div class="notice info install-nudge" id="installNudge">'+
    '<img src="img/icon-192.png" alt="" width="40" height="40">'+
    '<p><b>'+L("มื้อหน้าเปิดได้เร็วกว่านี้")+'</b><br>'+L("ติดตั้ง FairDish ไว้บนหน้าจอโฮม ไม่ต้องหาลิงก์อีก")+'</p>'+
    '<div class="nudge-actions"><button class="btn-sm btn-xs" id="nudgeInstall">'+L("ติดตั้งแอป")+'</button>'+
    '<button class="icon-btn" id="nudgeClose" aria-label="'+L("ไม่ต้องชวนอีก")+'">'+ICON_X+'</button></div></div>';
}
async function dismissInstallNudge(){
  ui.installNudgeOff = true;
  var el = document.getElementById("installNudge");
  if (el) el.parentNode.removeChild(el);
  try { await Store.writeRaw(INSTALL_NUDGE_KEY, "off"); } catch(e){}
}

function updateInstallButton(){
  var btn = document.getElementById("installBtn");
  if (btn) btn.hidden = !Install.available();
}

window.addEventListener("beforeinstallprompt", function(e){
  if (Install.platform() !== "android") return;   // คอมใช้ปุ่มติดตั้งของเบราว์เซอร์เองตามปกติ
  e.preventDefault();             // ไม่ให้เบราว์เซอร์เด้งเอง เก็บไว้ใช้ตอนผู้ใช้กด "ติดตั้งเลย"
  Install.prompt = e;
  var box = document.getElementById("installDialog");
  if (box && box.open) renderInstall();
});
window.addEventListener("appinstalled", function(){
  Install.prompt = null;
  closeInstall();
  updateInstallButton();
  toast(L("ติดตั้ง FairDish แล้ว เปิดได้จากหน้าจอโฮม"),"ok");
});
