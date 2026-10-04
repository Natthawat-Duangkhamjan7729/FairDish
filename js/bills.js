/* FairDish — v4.0: ประวัติบิล + เพื่อนยืนยันเมนูของตัวเอง
   ฟังก์ชันส่วนบน (billStats, itemsOf, confirmSig, applyConfirm) ไม่แตะ DOM — ทดสอบได้ใน tests/ */
"use strict";

var HISTORY_LIMIT = 50;

/* =========================================================
   ข้อมูลบิลแบบดิบ (รูปแบบเดียวกับที่ serialize() บันทึก)
   ========================================================= */
/** บิลมีอะไรให้เก็บไหม — มีชื่อคนหรือรายการอย่างใดอย่างหนึ่ง */
function billHasContent(d){
  return !!d && (((d.members || []).length) || ((d.menus || []).length) || ((d.shared || []).length));
}
/** ยอดรวม + จำนวนคน/รายการ ของบิลดิบ */
function billStats(d){
  var b = {
    members:d.members || [], menus:d.menus || [], shared:d.shared || [],
    charges:d.charges || [], kind:d.kind === "trip" ? "trip" : "meal"
  };
  var r = computeBill(b);
  return { n:b.members.length, items:b.menus.length, grand:r.grand, kind:b.kind };
}
/** ชื่อที่แสดงของบิลส่วนตัว — ไม่ได้ตั้งชื่อ = "มื้อ 4 ต.ค." ตามวันที่บันทึก */
function billTitle(d, at){
  if (d && d.title) return d.title;
  var when = (d && d.savedAt) ? new Date(d.savedAt) : (at ? new Date(at) : new Date());
  if (isNaN(when.getTime())) when = new Date();
  return defaultGroupName(when, d && d.kind);
}

/** รายการทั้งหมดที่คนในบิลติ๊กได้ (ทริป: รวมเมนูในมื้ออาหารข้างใน) — key ไม่ซ้ำกันทั้งบิล */
function itemsOf(d){
  var out = [];
  (d.menus || []).forEach(function(m){
    if (m.type === "meal"){
      ((m.meal && m.meal.menus) || []).forEach(function(x){
        out.push({ key:m.id+"/"+x.id, name:x.name, price:Number(x.price) || 0, eaters:x.eaters || [], group:m.name, ref:x });
      });
      return;
    }
    out.push({ key:String(m.id), name:m.name, price:Number(m.price) || 0, eaters:m.eaters || [], group:"", ref:m });
  });
  return out;
}
/** ลายเซ็นของสิ่งที่สมาชิกคนนี้มีส่วนอยู่ตอนนี้ — แก้รายการของเขาหลังยืนยันแล้ว ลายเซ็นจะไม่ตรง */
function confirmSig(d, memberId){
  return itemsOf(d).filter(function(it){ return it.eaters.indexOf(memberId) >= 0; })
    .map(function(it){ return it.key; }).sort().join(",");
}
/** "confirmed" | "changed" (ยืนยันแล้วแต่มีคนแก้ทีหลัง) | "pending" */
function confirmStatusOf(d, memberId){
  var c = d.confirms && d.confirms[memberId];
  if (!c) return "pending";
  return c.sig === confirmSig(d, memberId) ? "confirmed" : "changed";
}
/** ใส่การยืนยันลงบิลดิบ: ติ๊ก = มีชื่อในรายการนั้น ไม่ติ๊ก = เอาชื่อออก → false ถ้าไม่มีสมาชิกคนนี้แล้ว */
function applyConfirm(d, memberId, selected, at){
  if (!(d.members || []).some(function(p){ return p.id === memberId; })) return false;
  itemsOf(d).forEach(function(it){
    var list = it.ref.eaters = (it.ref.eaters || []).slice();
    var i = list.indexOf(memberId);
    if (selected[it.key] && i < 0) list.push(memberId);
    if (!selected[it.key] && i >= 0) list.splice(i, 1);
  });
  d.confirms = d.confirms && typeof d.confirms === "object" ? d.confirms : {};
  d.confirms[memberId] = { at:at || new Date().toISOString(), sig:confirmSig(d, memberId) };
  return true;
}
/** สรุปการยืนยันของบิลที่เปิดอยู่ { done, total, rows:[{ id, name, status }] } */
function confirmSummary(){
  var d = serialize();
  var rows = state.members.map(function(p){ return { id:p.id, name:p.name, status:confirmStatusOf(d, p.id) }; });
  return { done:rows.filter(function(x){ return x.status === "confirmed"; }).length, total:rows.length, rows:rows };
}

/* =========================================================
   ประวัติบิลส่วนตัว (เก็บในเครื่อง)
   ========================================================= */
async function loadHistory(){
  try { ui.history = await Store.loadHistory(); } catch(e){ ui.history = []; }
  return ui.history;
}
function saveHistory(){
  return Store.saveHistory(ui.history).catch(function(){});
}
function historyItem(id){
  for (var i=0;i<ui.history.length;i++) if (ui.history[i].id === id) return ui.history[i];
  return null;
}
/** อ่านบิลส่วนตัวที่ค้างอยู่ในเครื่อง (ไม่สนว่ากำลังเปิดกลุ่มอยู่) */
async function readLocalBill(){
  if (ui.ctx === null && !ui.loading) return serialize();
  try { var raw = await Store.readRaw(Store.key); return raw ? JSON.parse(raw) : null; } catch(e){ return null; }
}
/** เก็บบิลส่วนตัวที่ค้างอยู่เข้าประวัติ แล้วล้างบิลส่วนตัวให้ว่าง → true ถ้ามีบิลถูกเก็บ */
async function archiveLocalBill(){
  var d = await readLocalBill();
  if (!billHasContent(d)) return false;
  var at = Date.now();
  ui.history.unshift({ id:"h"+at.toString(36), at:at, data:d });
  if (ui.history.length > HISTORY_LIMIT) ui.history = ui.history.slice(0, HISTORY_LIMIT);
  await saveHistory();
  var empty = { members:[], menus:[], shared:[], charges:defaultCharges(), payers:[], kind:d.kind === "trip" ? "trip" : "meal" };
  await Store.writeRaw(Store.key, JSON.stringify(empty));
  if (ui.ctx === null) applyBill(empty);
  return true;
}
/** เปิดบิลจากประวัติกลับมาทำต่อ — บิลส่วนตัวที่ค้างอยู่ถูกเก็บเข้าประวัติแทน */
async function restoreHistory(id){
  var h = historyItem(id);
  if (!h) return;
  ui.history = ui.history.filter(function(x){ return x.id !== id; });
  await archiveLocalBill();
  await saveHistory();
  await Store.writeRaw(Store.key, JSON.stringify(h.data));
  if (ui.ctx === null){ applyBill(h.data); ui.ctx = undefined; }   // ให้ route() โหลดบิลส่วนตัวใหม่
  location.hash = "#/split";
  toast(L("เปิด {name} กลับมาทำต่อแล้ว", { name:billTitle(h.data, h.at) }), "ok");
}
async function deleteHistory(id){
  var i = -1;
  ui.history.forEach(function(x, k){ if (x.id === id) i = k; });
  if (i < 0) return;
  var h = ui.history.splice(i, 1)[0];
  await saveHistory();
  location.hash = "#/history";
  toast(L("ลบ {name} ออกจากประวัติแล้ว", { name:billTitle(h.data, h.at) }), "ok", { label:L("เลิกทำ"), action:async function(){
    ui.history.splice(Math.min(i, ui.history.length), 0, h);
    await saveHistory();
    if (currentPath() === "/history") document.getElementById("view").innerHTML = pageHistory();
  }});
}

/* =========================================================
   กลุ่ม: จำยอดล่าสุดไว้แสดงบนหน้าแรก/ประวัติ (ไม่ต้องโหลดทุกกลุ่ม)
   ========================================================= */
function noteGroupStats(){
  if (!ui.ctx || ui.loading || ui.groupError) return;
  var g = myGroup(ui.ctx);
  if (!g) return;
  var d = serialize(), st = billStats(d), c = confirmSummary();
  g.stats = { n:st.n, items:st.items, grand:Math.round(st.grand * 100) / 100, confirmed:c.done };
  g.kind = st.kind;
  saveMyGroups();
}

/* =========================================================
   บันทึกการยืนยันแบบรวมกับของเพื่อน — ชนกันก็ใส่ซ้ำบนข้อมูลล่าสุดให้เอง
   ========================================================= */
async function saveConfirm(memberId, selected){
  var id = ui.ctx;
  if (!id) return false;
  var data = JSON.parse(JSON.stringify(serialize())), version = Store.version;
  for (var tries = 0; tries < 4; tries++){
    if (!applyConfirm(data, memberId, selected)) return "missing";
    data.savedAt = new Date().toISOString();
    var res = await Cloud.save(id, data, version);
    if (ui.ctx !== id) return false;
    if (res && res.ok){
      Store.version = res.version;
      applyBill(data);
      noteGroupStats();
      return true;
    }
    if (!res || res.missing || !res.data) return false;
    data = res.data; version = res.version;          // เพื่อนบันทึกไปก่อน → ใส่การติ๊กของเราบนข้อมูลล่าสุดแล้วลองใหม่
    if (res.name) Store.groupName = res.name;
  }
  return false;
}
