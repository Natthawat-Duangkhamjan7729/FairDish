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
  "/about":  { title:"เกี่ยวกับ · FairDish", view:pageAbout }
};
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
  document.getElementById("view").innerHTML = r.view();
  var nav = groupId ? "/groups" : path;
  Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), function(a){
    a.classList.toggle("on", a.getAttribute("data-nav")===nav);
  });
  document.getElementById("sheet").classList.remove("open");
  document.getElementById("burger").setAttribute("aria-expanded","false");
  if (path==="/split") render();
  if (path==="/groups") checkLocalBill();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange", route);
