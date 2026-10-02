/* FairDish — เริ่มทำงาน */
"use strict";

/* =========================================================
   11. เริ่มทำงาน
   ========================================================= */
async function boot(){
  MENU_LIBRARY = buildMenuLibrary();
  route();
  await Store.init();
  try {
    await loadBillBook();
    try { state.menuMemory = await Store.loadMenus(); } catch(e){ state.menuMemory = []; }
    ui.loading = false;
    setSave("saved");
  } catch(err){
    ui.loading = false;
    setSave("error");
    toast("โหลดข้อมูลเดิมไม่สำเร็จ เริ่มบิลใหม่ได้เลย","error");
  }
  // หน้าที่แสดงข้อมูลบิลต้องวาดใหม่หลังโหลดสมุดบิลเสร็จ
  var path = currentPath();
  if (path==="/split" || path==="/bill" || path==="/history") document.getElementById("view").innerHTML = routes[path].view();
  if (path==="/split") render();
}
boot();
