/* FairDish — เส้นทางหน้า (hash router) */
"use strict";

/* =========================================================
   9. เส้นทางหน้า
   ========================================================= */
var routes = {
  "/":      { title:"FairDish — จ่ายตามที่กินจริง จบทุกมื้ออย่างแฟร์", view:pageHome },
  "/split": { title:"หารบิล · FairDish", view:pageSplit },
  "/bill":  { title:"ใบสรุปยอด · FairDish", view:pageBill },
  "/history": { title:"ประวัติบิล · FairDish", view:pageHistory },
  "/how":   { title:"วิธีใช้ · FairDish", view:pageHow },
  "/about": { title:"เกี่ยวกับ · FairDish", view:pageAbout }
};
function currentPath(){
  var h = location.hash.replace(/^#/,"");
  return routes[h] ? h : "/";
}
function route(){
  var path = currentPath();
  var r = routes[path];
  document.title = r.title;
  document.getElementById("view").innerHTML = r.view();
  Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), function(a){
    a.classList.toggle("on", a.getAttribute("data-nav")===path);
  });
  document.getElementById("sheet").classList.remove("open");
  document.getElementById("burger").setAttribute("aria-expanded","false");
  if (path==="/split") render();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange", route);
