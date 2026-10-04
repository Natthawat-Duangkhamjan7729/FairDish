/* FairDish — เส้นทางหน้า (hash router) */
"use strict";

/* =========================================================
   9. เส้นทางหน้า
   ========================================================= */
var routes = {
  "/":       { title:"FairDish — จ่ายตามที่กินจริง จบทุกมื้ออย่างแฟร์", view:pageHome },
  "/split":  { title:"หารบิล · FairDish", view:pageSplit },
  "/bill":   { title:"ใบสรุปยอด · FairDish", view:pageBill },
  "/groups": { title:"กลุ่ม · FairDish", view:pageGroups },
  "/how":    { title:"วิธีใช้ · FairDish", view:pageHow },
  "/about":  { title:"เกี่ยวกับ · FairDish", view:pageAbout },
  "/more":   { title:"อื่น ๆ · FairDish", view:pageMore }
};
/** แท็บล่างที่ต้องสว่างของแต่ละหน้า */
function tabOf(path){
  if (path==="/") return "home";
  if (path==="/split" || path==="/bill" || path==="/groups") return path.slice(1);
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
  return routes[h] ? h : "/";
}
function currentGroupId(){
  var g = parseGroupPath(hashPath());
  return g ? g.id : null;
}
function route(){
  var path = currentPath();
  var groupId = currentGroupId();
  var r = routes[path];
  if ((path==="/split" || path==="/bill") && groupId !== ui.ctx) loadContext(groupId);
  document.title = groupId && Store.groupName ? Store.groupName + " · FairDish" : r.title;
  closeMeDialog(); closeInstall(); closeShareDialog();     // เปลี่ยนหน้าแล้วหน้าต่างที่ค้างอยู่ต้องปิดตาม
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
  updateChrome();
  if (path==="/split"){ render(); applyPendingKind(); }
  if (path==="/groups") checkLocalBill();
  if (path==="/") fillHomeResume();
  window.scrollTo(0,0);
  if (path==="/groups" && ui.focusGroupName){
    ui.focusGroupName = false;
    var input = document.getElementById("groupName");
    if (input){ input.focus(); input.select(); input.scrollIntoView({ block:"center" }); }
  }
}
window.addEventListener("hashchange", route);
