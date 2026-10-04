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
  state.menuForm = null; state.sharedForm = null; state.chargeForm = null;
  ui.confirmMember = null; ui.editingMember = null; ui.memberError = ""; ui.undo = null;
  Store.groupId = groupId;
  Store.version = 0;
  Store.groupName = "";
  applyBill(null);
  setSave("loading");

  if (groupId && !Cloud.ready()) ui.groupError = "disabled";
  else if (groupId && !isGroupId(groupId)) ui.groupError = "notfound";
  if (ui.groupError){ ui.loading = false; return refreshView(); }

  try {
    var saved = await Store.load();
    if (token !== loadToken) return;
    if (groupId && !saved) ui.groupError = "notfound";
    else {
      applyBill(saved);
      if (groupId) rememberGroup(groupId, Store.groupName);
    }
    ui.loading = false;
    setSave("saved");
  } catch(err){
    if (token !== loadToken) return;
    ui.loading = false;
    if (groupId) ui.groupError = "load";
    else {
      setSave("error");
      toast("โหลดข้อมูลเดิมไม่สำเร็จ เริ่มบิลใหม่ได้เลย","error");
    }
  }
  refreshView();
}

/** วาดหน้าที่เปิดอยู่ใหม่หลังข้อมูลบิลเปลี่ยน */
function refreshView(){
  var path = currentPath();
  if (ui.ctx && Store.groupName) document.title = Store.groupName + " · FairDish";
  if (path==="/split"){
    if (ui.ctx) document.getElementById("view").innerHTML = pageSplit();
    render();
  }
  if (path==="/bill") document.getElementById("view").innerHTML = pageBill();
}

/** ดึงบิลกลุ่มล่าสุด — manual = ผู้ใช้กดปุ่มเอง (ไม่ใช่ตอนกลับมาที่แท็บ) */
async function refreshGroup(manual){
  var id = ui.ctx;
  if (!id || ui.loading || ui.groupError || ui.syncing || ui.save==="saving") return;
  var busy = state.menuForm || state.sharedForm || state.chargeForm || ui.editingMember ||
             ui.savingMember || ui.savingMenu || ui.confirmMember || ui.confirmReset;
  if (!manual && busy) return;   // กำลังกรอกอะไรอยู่ อย่าวาดทับ
  ui.syncing = true;
  try {
    var g = await Cloud.get(id);
    if (ui.ctx !== id) return;
    if (!g){ ui.groupError = "notfound"; return refreshView(); }
    if (g.version !== Store.version){
      applyBill(g.data);
      Store.version = g.version;
      Store.groupName = g.name;
      refreshView();
      toast("อัปเดตบิลล่าสุดจากกลุ่มแล้ว","ok");
    } else if (manual) toast("บิลนี้เป็นข้อมูลล่าสุดแล้ว","ok");
  } catch(err){
    if (manual) toast("โหลดข้อมูลล่าสุดไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง","error");
  } finally {
    ui.syncing = false;
  }
}

async function boot(){
  MENU_LIBRARY = buildMenuLibrary();
  await Store.init();
  try { state.menuMemory = await Store.loadMenus(); } catch(e){ state.menuMemory = []; }
  try { ui.myGroups = await Store.loadGroups(); } catch(e){ ui.myGroups = []; }
  route();
}
boot();
