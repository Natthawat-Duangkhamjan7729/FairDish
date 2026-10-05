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
  "/me":     { title:"ยืนยันเมนู · FairDish", view:pageGuest },        // v4.1: #/g/<id>/me เท่านั้น
  "/share":  { title:"ชวนเพื่อนเข้ากลุ่ม · FairDish", view:pageShare }, // v4.1: #/g/<id>/share เท่านั้น
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
    ctx.textContent = !show ? "" : (ui.ctx ? (Store.groupName || L("กลุ่ม")) : L("บิลส่วนตัว"));
    ctx.classList.toggle("group", !!(show && ui.ctx));
  }
}
var GROUP_ONLY = ["/h", "/me", "/share"];   // เปิดตรง ๆ ไม่ได้ ต้องมีรหัสบิล/กลุ่มนำหน้า
/** หน้าที่ต้องโหลดบิล (ส่วนตัวหรือกลุ่ม) ก่อนแสดง */
function needsBill(path){ return path==="/split" || path==="/bill" || path==="/me" || path==="/share"; }
function hashPath(){ return location.hash.replace(/^#/,""); }
/** หน้ากลุ่ม #/g/<id> ใช้หน้าหารบิล และ #/g/<id>/bill ใช้หน้าใบสรุปยอด */
function currentPath(){
  var h = hashPath();
  var g = parseGroupPath(h);
  if (g) return g.bill ? "/bill" : g.me ? "/me" : g.share ? "/share" : "/split";
  if (/^\/h\/[0-9a-z]+$/.test(h)) return "/h";
  return routes[h] && GROUP_ONLY.indexOf(h) < 0 ? h : "/";
}
function currentGroupId(){
  var g = parseGroupPath(hashPath());
  return g ? g.id : null;
}
var lastRoutePath = null;
function route(){
  if (ui.tripStash) exitMeal();          // v3.1: เปลี่ยนหน้า = ออกจากมื้อกลับไปที่ทริป (ข้อมูล commit ไปแล้ว)
  var path = currentPath();
  var groupId = currentGroupId();
  var gp = parseGroupPath(hashPath());
  if (gp && gp.key && isGroupId(gp.id)) rememberKey(gp.id, gp.key);   // v4.11: กุญแจเข้ารหัสจากลิงก์ที่เพื่อนส่งมา
  var r = routes[path];
  // v4.4.1: เปิดเว็บครั้งแรกจากลิงก์หน้าอื่น → แสดงหน้าแนะนำก่อน แล้วพากลับมาหน้านั้น (ลิงก์กลุ่มที่เพื่อนส่งมาไม่ต้องผ่านหน้าแนะนำ)
  if (ui.showOnb && path !== "/" && !groupId){ ui.onbNext = location.hash; location.hash = "#/"; return; }
  // v4.10.1: เข้าแอปครั้งแรกจากลิงก์/QR กลุ่ม = ต้อนรับแบบกลุ่มแล้ว (ถามชื่อ + ถามเข้าร่วม) ไม่ต้องเจอหน้าแนะนำแอปตอนกดกลับ
  if (groupId && ui.showOnb && !ui.tour){ ui.showOnb = false; Store.writeRaw(ONBOARD_KEY, "done").catch(function(){}); }
  if (groupId && !ui.nameAsked && !ui.tour){ askNameForLink(location.hash); return; }   // v4.9: สแกนเข้ากลุ่มครั้งแรก = ถามชื่อก่อน
  // v4.8.1: จำว่าเข้าหน้าชวนเพื่อนมาจากหน้าไหน ปุ่มย้อนกลับจะได้กลับไปที่เดิม (สร้างกลุ่มจากบิลส่วนตัวก็นับ)
  if (path === "/share" && lastRoutePath !== "/share") ui.shareBack = (lastRoutePath === "/split" || lastRoutePath === "/bill") ? lastRoutePath : null;
  lastRoutePath = path;
  if (ui.tour && (TOUR_ROUTES.indexOf(path) < 0 || groupId)) tourEnd(false);   // v4.5: ออกนอกหน้าที่สอน = จบการสอน
  if (needsBill(path) && groupId !== ui.ctx) loadContext(groupId);
  else if ((path==="/share" || path==="/bill") && groupId) refreshGroup(false);   // สถานะยืนยัน/ติ๊กโอนของเพื่อนต้องเป็นล่าสุด
  if (path !== "/me"){ ui.guestFor = null; ui.guestSel = null; ui.guestDone = false; }
  document.title = groupId && Store.groupName ? Store.groupName + " · FairDish" : L(r.title);
  closeMeDialog(); closeInstall(); closeShareDialog();   // เปลี่ยนหน้าแล้วหน้าต่างที่ค้างอยู่ต้องปิดตาม
  closeGlobalSheet();
  if (path !== "/bill") ui.showDone = false;
  // v3.2: แท็บล่างมีเฉพาะหน้าหลัก/ประวัติ/ตั้งค่า หน้าหารบิลกับใบสรุปใช้แถบยอดรวม/ปุ่มย้อนกลับแทน
  document.body.classList.toggle("no-tabbar", needsBill(path) || (path==="/" && (ui.showOnb || needName())));
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
  if (path==="/") fillHome();   // v4.12: หน้าถามชื่อไม่โฟกัสช่องเอง — แป้นพิมพ์บนมือถือเด้งบังหน้า ให้ผู้ใช้แตะเอง
  if (path==="/me") document.body.classList.toggle("has-total", !!document.querySelector(".guest-bar"));
  if (path==="/share") fitShareQr();
  if ((path==="/history" || path==="/groups" || path==="/h") && isWide()) renderHistoryWide();
  renderSideNav();
  renderInAppBar();                    // v4.12: ลิงก์ "เปิดในเบราว์เซอร์" ต้องพาไปหน้าปัจจุบัน
  syncSheetLock();
  jumpTo(0);
}
window.addEventListener("hashchange", route);
