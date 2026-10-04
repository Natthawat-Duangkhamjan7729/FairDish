/* FairDish — บันทึกข้อมูล + สถานะการบันทึก */
"use strict";

/* =========================================================
   3. บันทึกข้อมูล + สถานะ
   ========================================================= */
function serialize(){
  var t = ui.tripStash;
  if (t){
    // v3.1: กำลังแก้มื้ออาหารข้างในทริป — state ตอนนี้คือข้อมูลของมื้อ ประกอบกลับเป็นทริปก่อนบันทึก
    return { members:state.members, menus:t.menus.map(function(m){ return m.id === t.mealId ? mealWithScope(m) : m; }),
             shared:t.shared, charges:t.charges, payers:t.payers, kind:"trip", name:state.name, paid:state.paid, confirms:state.confirms, savedAt:new Date().toISOString() };
  }
  return { members:state.members, menus:state.menus, shared:state.shared,
           charges:state.charges, payers:state.payers, kind:state.kind, name:state.name, paid:state.paid, confirms:state.confirms, savedAt:new Date().toISOString() };
}
/** รายการมื้อในทริป + ข้อมูลมื้อที่กำลังแก้อยู่ (state.menus/shared/charges) */
function mealWithScope(m){
  var copy = {};
  Object.keys(m).forEach(function(k){ copy[k] = m[k]; });
  copy.meal = { menus:state.menus, shared:state.shared, charges:state.charges };
  return copy;
}
/** v3.2: ข้อมูลบิลที่บันทึกไว้ (จากเครื่อง กลุ่ม หรือประวัติ) → บิลที่ใช้คำนวณได้ทันที ไม่แตะ state */
function normalizeBill(saved){
  saved = saved || {};
  var b = {};
  b.members = Array.isArray(saved.members) ? saved.members : [];
  b.menus = (Array.isArray(saved.menus) ? saved.menus : []).map(function(m){
    var item = { id:m.id, name:m.name, price:Number(m.price)||0, eaters:m.eaters||[] };
    if (m.payer) item.payer = String(m.payer);
    if (m.type === "meal"){
      var md = m.meal || {};
      item.type = "meal";
      item.meal = {
        menus:(md.menus || []).map(function(x){ return { id:x.id, name:x.name, price:Number(x.price)||0, eaters:x.eaters||[] }; }),
        shared:Array.isArray(md.shared) ? md.shared : [],
        charges:(md.charges && md.charges.length) ? md.charges : defaultCharges()
      };
    }
    return item;
  });
  b.shared = Array.isArray(saved.shared) ? saved.shared : [];
  b.charges = (saved.charges && saved.charges.length) ? saved.charges : defaultCharges();
  b.kind = saved.kind === "trip" ? "trip" : "meal";
  b.payers = (Array.isArray(saved.payers) ? saved.payers : []).filter(function(p){ return p && p.id; }).map(function(p){
    var n = Number(p.amount);
    return { id:String(p.id), amount:(p.amount == null || !isFinite(n) || n < 0) ? null : n };
  });
  // บิลก่อน v3.2 ไม่มีชื่อ — ตั้งจากวันที่บันทึก ชื่อจะได้ไม่เปลี่ยนไปตามวันที่เปิดดู
  b.name = (typeof saved.name === "string" && saved.name) ? saved.name
    : (saved.savedAt && !isNaN(new Date(saved.savedAt)) ? defaultBillName(b.kind, new Date(saved.savedAt)) : "");
  b.paid = {};
  if (saved.paid && typeof saved.paid === "object") Object.keys(saved.paid).forEach(function(k){ if (saved.paid[k]) b.paid[k] = true; });
  b.confirms = cleanConfirms(saved.confirms);         // v4.1: เพื่อนยืนยันเมนู (ฟังก์ชันอยู่ใน confirm.js)
  b.savedAt = saved.savedAt || "";
  return b;
}
/** ใส่ข้อมูลบิลที่โหลดมา (จากเครื่องหรือจากกลุ่ม) ลงใน state — ไม่มีข้อมูล = บิลว่าง */
function applyBill(saved){
  var b = normalizeBill(saved);
  ui.tripStash = null;                 // ข้อมูลใหม่มา = ออกจากโหมดแก้มื้อในทริป
  state.members = b.members;
  state.menus = b.menus;
  state.shared = b.shared;
  state.charges = b.charges;
  state.kind = b.kind;
  state.payers = b.payers;
  state.name = b.name;
  state.paid = b.paid;
  state.confirms = b.confirms;
  state.open = {};
  var maxId = 0, all = state.members.concat(state.menus, state.shared, state.charges);
  state.menus.forEach(function(m){ if (m.meal) all = all.concat(m.meal.menus, m.meal.shared, m.meal.charges); });
  all.forEach(function(x){
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
  text.textContent = ({ loading:L("กำลังโหลดข้อมูล"), saving:L("กำลังบันทึก"),
                        saved:L("บันทึกแล้ว"), error:L("ยังไม่ได้บันทึก") })[next] || "";
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
      if (currentPath() === "/split") document.getElementById("view").innerHTML = pageSplit();
      setSave("saved");
      ui.saveFailedIn = null;
      toast(L("มีเพื่อนแก้บิลนี้ไปก่อน โหลดข้อมูลล่าสุดแล้ว ลองทำรายการเมื่อกี้อีกครั้ง"),"error");
      render();
      rerenderBill();
      return false;
    }
    setSave("error");
    ui.saveFailedIn = source || "member";
    toast(L("บันทึกไม่สำเร็จ ข้อมูลบนหน้าจอยังอยู่ครบ"),"error",{ label:L("ลองอีกครั้ง"), action:retrySave });
    render();
    return false;
  }
}
function saveErrorNotice(){
  return '<div class="notice error"><p>'+L("บันทึกลงเครื่องไม่สำเร็จ ข้อมูลที่เห็นยังอยู่ครบ แต่ถ้าปิดหน้านี้จะหาย")+'</p>'+
    '<button class="btn-quiet" id="retrySave">'+L("ลองบันทึกอีกครั้ง")+'</button></div>';
}
async function retrySave(){
  var ok = await commit();
  if (ok) toast(L("บันทึกเรียบร้อยแล้ว"),"ok");
  render();
}
