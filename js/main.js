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
    var saved = await Store.load();
    if (saved && saved.members){
      state.members = saved.members || [];
      state.menus = (saved.menus || []).map(function(m){
        return { id:m.id, name:m.name, price:Number(m.price)||0, eaters:m.eaters||[] };
      });
      state.shared = saved.shared || [];
      if (saved.charges && saved.charges.length) state.charges = saved.charges;
      var maxId = 0;
      state.members.concat(state.menus, state.shared).forEach(function(x){
        var num = parseInt(String(x.id).replace(/^i/,""),10);
        if (!isNaN(num) && num > maxId) maxId = num;
      });
      uid = maxId;
    }
    try { state.menuMemory = await Store.loadMenus(); } catch(e){ state.menuMemory = []; }
    ui.loading = false;
    setSave("saved");
  } catch(err){
    ui.loading = false;
    setSave("error");
    toast("โหลดข้อมูลเดิมไม่สำเร็จ เริ่มบิลใหม่ได้เลย","error");
  }
  if (currentPath()==="/split") render();
  if (currentPath()==="/bill") document.getElementById("view").innerHTML = pageBill();
}
boot();
