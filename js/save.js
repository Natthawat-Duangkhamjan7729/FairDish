/* FairDish — บันทึกข้อมูล + สถานะการบันทึก */
"use strict";

/* =========================================================
   3. บันทึกข้อมูล + สถานะ
   ========================================================= */
function serialize(){
  return { members:state.members, menus:state.menus, shared:state.shared,
           charges:state.charges, payers:state.payers, kind:state.kind, savedAt:new Date().toISOString() };
}
/** ใส่ข้อมูลบิลที่โหลดมา (จากเครื่องหรือจากกลุ่ม) ลงใน state — ไม่มีข้อมูล = บิลว่าง */
function applyBill(saved){
  saved = saved || {};
  state.members = Array.isArray(saved.members) ? saved.members : [];
  state.menus = (Array.isArray(saved.menus) ? saved.menus : []).map(function(m){
    var item = { id:m.id, name:m.name, price:Number(m.price)||0, eaters:m.eaters||[] };
    if (m.payer) item.payer = String(m.payer);
    return item;
  });
  state.shared = Array.isArray(saved.shared) ? saved.shared : [];
  state.charges = (saved.charges && saved.charges.length) ? saved.charges : defaultCharges();
  state.kind = saved.kind === "trip" ? "trip" : "meal";
  state.payers = (Array.isArray(saved.payers) ? saved.payers : []).filter(function(p){ return p && p.id; }).map(function(p){
    var n = Number(p.amount);
    return { id:String(p.id), amount:(p.amount == null || !isFinite(n) || n < 0) ? null : n };
  });
  state.open = {};
  var maxId = 0;
  state.members.concat(state.menus, state.shared, state.charges).forEach(function(x){
    var num = parseInt(String(x.id).replace(/^i/,""),10);
    if (!isNaN(num) && num > maxId) maxId = num;
  });
  uid = maxId;
}
function setSave(next){
  ui.save = next;
  var chip = document.getElementById("saveChip");
  var text = document.getElementById("saveChipText");
  if (!chip || !text) return;
  chip.dataset.state = next;
  text.textContent = ({ loading:"กำลังโหลดข้อมูล", saving:"กำลังบันทึก",
                        saved:"บันทึกแล้ว", error:"ยังไม่ได้บันทึก" })[next] || "";
}
async function commit(successMessage, source){
  setSave("saving");
  try {
    await Store.save(serialize());
    setSave("saved");
    ui.saveFailedIn = null;
    if (successMessage) toast(successMessage,"ok");
    return true;
  } catch(err){
    if (err && err.conflict){
      // เพื่อนในกลุ่มบันทึกไปก่อน — ใช้ข้อมูลล่าสุดของกลุ่ม แล้วให้ผู้ใช้ทำรายการนี้ใหม่
      applyBill(err.latest.data);
      Store.version = err.latest.version;
      setSave("saved");
      ui.saveFailedIn = null;
      toast("มีเพื่อนแก้บิลนี้ไปก่อน โหลดข้อมูลล่าสุดแล้ว ลองทำรายการเมื่อกี้อีกครั้ง","error");
      render();
      rerenderBill();
      return false;
    }
    setSave("error");
    ui.saveFailedIn = source || "member";
    toast("บันทึกไม่สำเร็จ ข้อมูลบนหน้าจอยังอยู่ครบ","error",{ label:"ลองอีกครั้ง", action:retrySave });
    render();
    return false;
  }
}
function saveErrorNotice(){
  return '<div class="notice error"><p>บันทึกลงเครื่องไม่สำเร็จ ข้อมูลที่เห็นยังอยู่ครบ แต่ถ้าปิดหน้านี้จะหาย</p>'+
    '<button class="btn-quiet" id="retrySave">ลองบันทึกอีกครั้ง</button></div>';
}
async function retrySave(){
  var ok = await commit();
  if (ok) toast("บันทึกเรียบร้อยแล้ว","ok");
  render();
}
