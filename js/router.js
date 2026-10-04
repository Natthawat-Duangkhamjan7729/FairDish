/* FairDish — เส้นทางหน้า (hash router) */
"use strict";

/* =========================================================
   9. เส้นทางหน้า
   ========================================================= */
var routes = {
  "/":       { title:"FairDish — จ่ายตามที่กินจริง จบทุกมื้ออย่างแฟร์", view:pageHome },
  "/split":  { title:"หารบิล · FairDish", view:pageSplit },
  "/bill":   { title:"ใบสรุปยอด · FairDish", view:pageBill },
  "/history":{ title:"ประวัติบิล · FairDish", view:pageHistory },
  "/groups": { title:"ประวัติบิล · FairDish", view:pageHistory },   // ลิงก์เก่าของหน้ากลุ่ม (v2.0–v3.1)
  "/h":      { title:"บิลในประวัติ · FairDish", view:pagePast },
  "/how":    { title:"วิธีใช้ · FairDish", view:pageHow },
  "/about":  { title:"เกี่ยวกับ · FairDish", view:pageAbout },
  "/more":   { title:"อื่น ๆ · FairDish", view:pageMore }
};
/** แท็บล่างที่ต้องสว่างของแต่ละหน้า (v3.2: หน้าหลัก / ประวัติ) */
function tabOf(path){
  if (path==="/") return "home";
  if (path==="/history" || path==="/groups" || path==="/h") return "history";
  return "";
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
    ctx.textContent = !show ? "" : (ui.ctx ? (Store.groupName || "กลุ่ม") : "บิลส่วนตัว");
    ctx.classList.toggle("group", !!(show && ui.ctx));
  }
}
function hashPath(){ return location.hash.replace(/^#/,""); }
/** หน้ากลุ่ม #/g/<id> ใช้หน้าหารบิล และ #/g/<id>/bill ใช้หน้าใบสรุปยอด */
function currentPath(){
  var h = hashPath();
  var g = parseGroupPath(h);
  if (g) return g.bill ? "/bill" : "/split";
  if (/^\/h\/[0-9a-z]+$/.test(h)) return "/h";
  return routes[h] && h !== "/h" ? h : "/";
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
  if ((path==="/split" || path==="/bill") && groupId !== ui.ctx) loadContext(groupId);
  document.title = groupId && Store.groupName ? Store.groupName + " · FairDish" : r.title;
  closeMeDialog(); closeInstall(); closeShareDialog();     // เปลี่ยนหน้าแล้วหน้าต่างที่ค้างอยู่ต้องปิดตาม
  closeGlobalSheet();
  if (path !== "/bill") ui.showDone = false;
  // v3.2: แท็บล่างมีเฉพาะหน้าหลัก/ประวัติ/ตั้งค่า หน้าหารบิลกับใบสรุปใช้แถบยอดรวม/ปุ่มย้อนกลับแทน
  document.body.classList.toggle("no-tabbar", path==="/split" || path==="/bill");
  document.body.classList.toggle("show-foot", path==="/more" || path==="/about");
  document.getElementById("view").innerHTML = r.view();
  var tab = tabOf(path);
  Array.prototype.forEach.call(document.querySelectorAll("[data-tab]"), function(a){
    var on = a.getAttribute("data-tab")===tab;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
  });
  document.body.classList.remove("has-total");
  updateChrome();
  if (path==="/split"){ render(); maybeAskWhoAmI(); }   // เข้ากลุ่มทางหน้าใบสรุปก่อน ก็ยังถาม "คุณคือใคร" ตอนมาหน้าหารบิล
  if (path==="/") fillHome();
  syncSheetLock();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange", route);
