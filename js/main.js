/* FairDish — เริ่มทำงาน + สลับระหว่างบิลส่วนตัวกับบิลกลุ่ม */
"use strict";

/* =========================================================
   11. เริ่มทำงาน
   ========================================================= */
var loadToken = 0;

/** โหลดบิลของบริบทใหม่: groupId = null คือบิลส่วนตัวในเครื่อง */
async function loadContext(groupId){
  var token = ++loadToken;
  ui.ctx = groupId;
  ui.loading = true;
  ui.groupError = "";
  ui.confirmReset = false;
  ui.groupPanel = false;
  state.menuForm = null; state.sharedForm = null; state.chargeForm = null;
  ui.confirmMember = null; ui.editingMember = null; ui.memberError = ""; ui.undo = null;
  Store.groupId = groupId;
  Store.version = 0; Store.base = null;
  Store.groupName = "";
  applyBill(null);
  setSave("loading");

  if (groupId && !Cloud.ready()) ui.groupError = "disabled";
  else if (groupId && !isGroupId(groupId)) ui.groupError = "notfound";
  if (ui.groupError){ ui.loading = false; return refreshView(); }

  try {
    // v4.5: ระหว่างสอนใช้ = บิลฝึกว่าง ๆ แทนบิลในเครื่อง (ไม่อ่าน ไม่เขียนบิลจริง)
    var saved = (ui.tour && !groupId) ? practiceBill() : await Store.load();
    if (token !== loadToken) return;
    if (groupId && !saved) ui.groupError = "notfound";
    else {
      applyBill(saved);
      if (groupId){ rememberGroup(groupId, Store.groupName, state.kind); snapGroup(groupId, saved); }
    }
    ui.loading = false;
    setSave("saved");
  } catch(err){
    if (token !== loadToken) return;
    ui.loading = false;
    if (groupId) ui.groupError = err && err.nokey ? "nokey" : "load";   // v4.11: ลิงก์ไม่มีกุญแจ/กุญแจผิด
    else {
      setSave("error");
      toast(L("โหลดข้อมูลเดิมไม่สำเร็จ เริ่มบิลใหม่ได้เลย"),"error");
    }
  }
  refreshView();
}

/** วาดหน้าที่เปิดอยู่ใหม่หลังข้อมูลบิลเปลี่ยน */
function refreshView(){
  var path = currentPath();
  if (ui.ctx && Store.groupName) document.title = Store.groupName + " · FairDish";
  updateChrome();
  if (path==="/split"){
    // โครงหน้า (หัว, แท็บ, แผง) ถูกวาดตอนกำลังโหลดด้วยประเภทบิลเดิม — บิลที่โหลดมาอาจเป็นทริป จึงต้องวาดใหม่เสมอ
    // (บิลส่วนตัวเรียกที่นี่แค่ตอนโหลดเสร็จใน loadContext ไม่มีฟอร์มค้างให้ทับ)
    document.getElementById("view").innerHTML = pageSplit();
    render();
    maybeAskWhoAmI();
  }
  if (path==="/bill") document.getElementById("view").innerHTML = pageBill();
  renderSideNav();                    // v4.4: ลิงก์บิลที่เปิดอยู่ + ป้ายโอนแล้ว ในแถบซ้าย
  refreshShareDialog();               // v4.11
  if (path==="/me") rerenderGuest(true);
  if (path==="/share"){ document.getElementById("view").innerHTML = pageShare(); fitShareQr(); }
  if (ui.inviteAfterLoad && ui.ctx === null && !ui.loading){ ui.inviteAfterLoad = false; inviteFromBill(); }   // v4.5.3: กดชวนเพื่อนตอนยังไม่ได้โหลดบิล
  // v3.2: เพิ่งย้ายบิลส่วนตัวขึ้นกลุ่ม (เปิดหน้าชวนเพื่อนอยู่แล้ว)
  if (ui.shareAfterLoad && ui.ctx && !ui.loading){
    ui.shareAfterLoad = false;
    if (!ui.groupError){
      toast(hasData() ? L("ย้ายบิลขึ้นกลุ่มแล้ว ส่ง QR หรือลิงก์ให้เพื่อนได้เลย") : L("สร้างกลุ่มแล้ว ส่ง QR หรือลิงก์ให้เพื่อนได้เลย"),"ok");
      openShareDialog();
    }
  }
}

/** v4.7: กำลังพิมพ์อะไรค้างอยู่ — อัปเดตอัตโนมัติต้องไม่วาดทับ */
function typingInView(){
  var a = document.activeElement;
  if (a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /^(text|number|search)$/.test(a.type)))) return true;
  return Array.prototype.some.call(document.querySelectorAll("#view input[type=text], #view input[type=number], #view textarea"), function(el){ return !!el.value; });
}
/** v4.7: ใครเพิ่งเข้ากลุ่ม / ยืนยันเมนู — เทียบก่อนกับหลังอัปเดต */
function groupSnapshot(){
  return { ids:state.members.map(function(p){ return p.id; }), confirmed:Object.keys(state.confirms || {}) };
}
function groupNews(before){
  var joined = state.members.filter(function(p){ return before.ids.indexOf(p.id) < 0; }).map(function(p){ return p.name; });
  if (joined.length) return L("{name} เข้ากลุ่มแล้ว", { name:joined.join(", ") });
  var done = Object.keys(state.confirms || {}).filter(function(id){ return before.confirmed.indexOf(id) < 0 && nameOf(id); }).map(nameOf);
  if (done.length) return L("{name} ยืนยันเมนูแล้ว", { name:done.join(", ") });
  return "";
}
/** ดึงบิลกลุ่มล่าสุด — manual = ผู้ใช้กดปุ่มเอง · live = ดึงอัตโนมัติทุก LIVE_MS (ไม่มีอะไรใหม่ที่บอกได้ = เงียบ) */
async function refreshGroup(manual, live){
  var id = ui.ctx;
  if (!id || ui.loading || ui.groupError || ui.syncing || ui.save==="saving") return;
  var busy = ui.tripStash || state.menuForm || state.sharedForm || state.chargeForm || ui.editingMember ||
             ui.savingMember || ui.savingMenu || ui.confirmMember || ui.confirmReset || ui.sheet || typingInView();
  if (currentPath() === "/me" && ui.guestFor && !ui.guestDone) busy = true;   // กำลังติ๊กเมนูอยู่ อย่าล้างที่ติ๊กไว้
  if (!manual && busy) return;   // กำลังกรอกอะไรอยู่ อย่าวาดทับ
  ui.syncing = true;
  try {
    var g = await Cloud.get(id);
    if (ui.ctx !== id) return;
    if (!g){ ui.groupError = "notfound"; return refreshView(); }
    if (g.version !== Store.version){
      var before = groupSnapshot(), wasDone = billDone(serialize());
      applyBill(g.data);
      Store.version = g.version;
      Store.base = copyBill(g.data);
      Store.groupName = g.name;
      snapGroup(id, g.data);
      // v4.12: เพื่อนติ๊กโอนคนสุดท้าย → ทุกเครื่องในกลุ่มขึ้นหน้า "จบทริป/จบมื้อ" เอง (ไม่รบกวนคนที่กำลังยืนยันเมนูในหน้า /me)
      var path = currentPath();
      if (!wasDone && billDone(g.data) && (path === "/split" || path === "/bill" || path === "/share")){
        ui.showDone = true;
        closeShareDialog();
        if (path !== "/bill"){ location.hash = billHref(); return; }
      }
      ui.noReveal = !manual;            // อัปเดตอัตโนมัติไม่เล่นแอนิเมชันใบเสร็จซ้ำ
      refreshView();
      ui.noReveal = false;
      var news = groupNews(before);
      if (news) toast(news,"ok");
      else if (!live) toast(L("อัปเดตบิลล่าสุดจากกลุ่มแล้ว"),"ok");
    } else if (manual) toast(L("บิลนี้เป็นข้อมูลล่าสุดแล้ว"),"ok");
  } catch(err){
    if (manual) toast(L("โหลดข้อมูลล่าสุดไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"),"error");
  } finally {
    ui.syncing = false;
  }
}

/* v4.7: เปิดบิลกลุ่มอยู่และแท็บอยู่หน้าจอ → ดึงข้อมูลล่าสุดทุก 3 วิ เพื่อนเข้ากลุ่ม/ยืนยันเมนูแล้วขึ้นเกือบทันที
   (ใช้ RPC get_group เดิมผ่าน fetch — ไม่ต้องเปิด Realtime ใน Supabase หรือเพิ่มไลบรารี) */
var LIVE_MS = 3000;
setInterval(function(){
  if (ui.ctx && document.visibilityState === "visible" && !ui.tour) refreshGroup(false, true);
}, LIVE_MS);

/* v4.15: เปิด FairDish ไว้หลายแท็บ — แท็บอื่นแก้ประวัติ / กลุ่มของฉัน / บิลในเครื่อง ให้แท็บนี้ใช้ข้อมูลใหม่ด้วย
   (เดิมแท็บเก่าบันทึกข้อมูลเก่าทับ: บิลที่ลบจากประวัติกลับมาอีก บิลที่ย้ายขึ้นกลุ่มแล้วกลับมาเป็นบิลในเครื่องซ้ำ) */
window.addEventListener("storage", async function(e){
  if (!e.key || Store.mode !== "local") return;
  var path = currentPath();
  if (e.key === Store.historyKey){
    try { ui.history = await Store.loadHistory(); } catch(err){ return; }
    if (path === "/history" || path === "/groups") refreshHistoryView();
  } else if (e.key === Store.groupsKey){
    try { ui.myGroups = await Store.loadGroups(); } catch(err){ return; }
    if (path === "/history" || path === "/groups") refreshHistoryView();
  } else if (e.key === Store.key){
    ui.navLocal = undefined;
    if (ui.ctx !== null || ui.tour) return;           // แท็บนี้ไม่ได้เปิดบิลในเครื่องอยู่ — ตอนเปิดจะโหลดใหม่เองอยู่แล้ว
    var busy = state.menuForm || state.sharedForm || state.chargeForm || ui.editingMember || ui.sheet || ui.save === "saving" || typingInView();
    if ((path === "/split" || path === "/bill") && !busy) loadContext(null);
    else ui.ctx = undefined;                          // กำลังกรอกอยู่ — ไม่วาดทับ เปิดหน้าหารบิลครั้งหน้าค่อยโหลดใหม่
  } else return;
  if (path === "/") fillHome(true);
  renderSideNav();
});

async function boot(){
  MENU_LIBRARY = buildMenuLibrary();
  await Store.init();
  try { applyTheme(await Store.readRaw(Store.themeKey)); } catch(e){}
  try { LANG = (await Store.readRaw(LANG_KEY)) === "en" ? "en" : "th"; } catch(e){}
  applyStaticText();
  try { state.menuMemory = await Store.loadMenus(); } catch(e){ state.menuMemory = []; }
  try { ui.myGroups = await Store.loadGroups(); } catch(e){ ui.myGroups = []; }
  try { ui.history = await Store.loadHistory(); } catch(e){ ui.history = []; }
  try { ui.showOnb = (await Store.readRaw(ONBOARD_KEY)) !== "done"; } catch(e){ ui.showOnb = false; }
  try {
    var prof = await Store.loadProfile();
    if (prof){ ui.myName = cleanMyName(prof.name).slice(0, MAX_NAME); ui.nameAsked = !!prof.asked; }
  } catch(e){}
  try { ui.installNudgeOff = (await Store.readRaw(INSTALL_NUDGE_KEY)) === "off"; } catch(e){}
  updateInstallButton();
  detectCamera();                     // v4.12: ไม่รอ — แผ่นเลือกประเภทบิลใช้ตอนผู้ใช้กดเปิด
  route();
}
boot();
