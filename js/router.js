/* FairDish — เส้นทางหน้า (hash router) */
"use strict";

/* =========================================================
   9. เส้นทางหน้า
   ========================================================= */
var routes = {
  "/":        { title:"FairDish — จ่ายตามที่กินจริง จบทุกมื้ออย่างแฟร์", view:function(){ return pageHome(); } },
  "/split":   { title:"หารบิล · FairDish", view:function(){ return pageSplit(); } },
  "/bill":    { title:"ใบสรุปยอด · FairDish", view:function(){ return pageBill(); } },
  "/groups":  { title:"กลุ่ม · FairDish", view:function(){ return pageGroups(); } },
  "/history": { title:"ประวัติบิล · FairDish", view:function(){ return pageHistory(); } },
  "/hist":    { title:"ประวัติบิล · FairDish", view:function(){ return pageHistoryItem(); } },   // #/h/<id>
  "/confirm": { title:"ยืนยันเมนู · FairDish", view:function(){ return pageConfirm(); } },       // #/g/<id>/me
  "/how":     { title:"วิธีใช้ · FairDish", view:function(){ return pageHow(); } },
  "/about":   { title:"เกี่ยวกับ · FairDish", view:function(){ return pageAbout(); } },
  "/more":    { title:"อื่น ๆ · FairDish", view:function(){ return pageMore(); } }
};
/** แท็บล่างที่ต้องสว่างของแต่ละหน้า */
function tabOf(path){
  if (path==="/") return "home";
  if (path==="/split" || path==="/bill") return "split";
  if (path==="/history" || path==="/hist") return "history";
  if (path==="/groups" || path==="/confirm") return "groups";
  return "more";
}
/** ชี้ลิงก์หารบิล/สรุปไปบิลที่เปิดอยู่ (กลุ่มหรือส่วนตัว) + ป้ายบอกบริบทบน header มือถือ */
function updateChrome(){
  var path = currentPath();
  Array.prototype.forEach.call(document.querySelectorAll("[data-link]"), function(a){
    a.setAttribute("href", a.getAttribute("data-link")==="bill" ? billHref() : splitHref());
  });
  var ctx = document.getElementById("navCtx");
  if (ctx){
    var show = (path==="/split" || path==="/bill") && ui.ctx !== undefined;
    ctx.textContent = !show ? "" : (ui.ctx ? (Store.groupName || L("กลุ่ม")) : L("บิลส่วนตัว"));
    ctx.classList.toggle("group", !!(show && ui.ctx));
  }
}
function hashPath(){ return location.hash.replace(/^#/,""); }
/** v4.0: #/h/<id> = บิลหนึ่งใบในประวัติ */
function historyIdFromPath(){
  var m = /^\/h\/([a-z0-9]+)$/.exec(hashPath());
  return m ? m[1] : null;
}
/** หน้ากลุ่ม #/g/<id> ใช้หน้าหารบิล, #/g/<id>/bill ใช้หน้าใบสรุปยอด, #/g/<id>/me ใช้หน้ายืนยันเมนู */
function currentPath(){
  var h = hashPath();
  var g = parseGroupPath(h);
  if (g) return g.me ? "/confirm" : (g.bill ? "/bill" : "/split");
  if (historyIdFromPath()) return "/hist";
  return routes[h] && h !== "/hist" && h !== "/confirm" ? h : "/";
}
function currentGroupId(){
  var g = parseGroupPath(hashPath());
  return g ? g.id : null;
}
function route(){
  if (ui.tripStash) exitMeal();          // v3.1: เปลี่ยนหน้า = ออกจากมื้อกลับไปที่ทริป (ข้อมูล commit ไปแล้ว)
  var path = currentPath();
  var groupId = currentGroupId();
  var r = routes[path];
  if (path === "/confirm"){
    // เข้าหน้ายืนยันใหม่ = เริ่มจากสิ่งที่บันทึกไว้ ไม่ใช้การติ๊กที่ค้างจากรอบก่อน
    ui.confirmSel = null; ui.confirmDone = false; ui.confirmFor = null;
  }
  if ((path==="/split" || path==="/bill" || path==="/confirm") && groupId !== ui.ctx) loadContext(groupId);
  document.title = groupId && Store.groupName ? Store.groupName + " · FairDish" : L(r.title);
  closeMeDialog(); closeInstall(); closeShareDialog();     // เปลี่ยนหน้าแล้วหน้าต่างที่ค้างอยู่ต้องปิดตาม
  if (path !== "/split"){ state.menuForm = null; state.sharedForm = null; state.chargeForm = null; }
  document.body.classList.remove("sheet-open");
  document.getElementById("view").innerHTML = r.view();
  var nav = groupId ? "/groups" : path;
  Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), function(a){
    a.classList.toggle("on", a.getAttribute("data-nav")===nav);
  });
  var tab = tabOf(path);
  Array.prototype.forEach.call(document.querySelectorAll("[data-tab]"), function(a){
    var on = a.getAttribute("data-tab")===tab;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
  });
  document.body.classList.remove("has-total");
  document.body.classList.toggle("has-cf-bar", !!document.querySelector(".cf-bar"));
  updateChrome();
  if (path==="/split"){ render(); applyPendingKind(); }
  if (path==="/groups") checkLocalBill();
  if (path==="/"){ fillHome(); maybeOnboard(); }
  if (path==="/history") fillHistory();
  window.scrollTo(0,0);
  if (path==="/groups" && ui.focusGroupName){
    ui.focusGroupName = false;
    var input = document.getElementById("groupName");
    if (input){ input.focus(); input.select(); input.scrollIntoView({ block:"center" }); }
  }
}
window.addEventListener("hashchange", route);
