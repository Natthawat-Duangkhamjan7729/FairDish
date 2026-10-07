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
  // v4.2: เก็บแค่ id กับชื่อ — ข้อมูลอื่นของคน (เช่นเบอร์พร้อมเพย์ pp จาก v4.1) ถูกทิ้ง บันทึกครั้งถัดไปจึงไม่มีอีก
  b.members = (Array.isArray(saved.members) ? saved.members : []).filter(function(p){ return p && p.id; })
    .map(function(p){ return { id:String(p.id), name:String(p.name || "") }; });
  b.menus = (Array.isArray(saved.menus) ? saved.menus : []).map(function(m){
    var item = { id:m.id, name:m.name, price:Number(m.price)||0, eaters:m.eaters||[] };
    if (m.payer) item.payer = String(m.payer);
    if (Array.isArray(m.payers) && m.payers.length > 1) setPayersOf(item, m.payers.map(String));   // v4.15: จ่ายด้วยกันหลายคน
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
  ui.wsPast = [];                      // v4.4: ข้อมูลเปลี่ยนจากที่อื่น — เลิกทำย้อนไปทับไม่ได้
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
  if (ui.tour){                        // v4.5: บิลฝึกของการสอน — ไม่บันทึกลงเครื่อง บิลจริงไม่ถูกแตะ
    setSave("saved");
    if (successMessage) toast(successMessage,"ok");
    return true;
  }
  setSave("saving");
  try {
    var data = serialize();
    await Store.save(data);
    if (Store.groupId) snapGroup(Store.groupId, data);   // v4.10: การ์ดในหน้าหลักเห็นยอดล่าสุด
    setSave("saved");
    ui.saveFailedIn = null;
    if (successMessage) toast(successMessage,"ok");
    return true;
  } catch(err){
    if (err && err.conflict){
      // v4.13.1: เพื่อนในกลุ่มบันทึกไปก่อน — รวมสิ่งที่เราเพิ่งแก้เข้ากับข้อมูลล่าสุดของกลุ่มแล้วบันทึกใหม่ (เดิมทิ้งของเราไป)
      var res = await saveMerged(err.latest);
      if (res.data) applyMerged(res.data);             // ไม่ว่าจะบันทึกได้ไหม หน้าจอเป็นบิลที่รวมแล้ว (ลองอีกครั้ง = บันทึกตัวที่รวมแล้ว)
      if (res.ok){
        setSave("saved");
        ui.saveFailedIn = null;
        if (successMessage) toast(successMessage,"ok");
        return true;
      }
      if (!res.net){
        setSave("saved");
        ui.saveFailedIn = null;
        toast(L("มีเพื่อนแก้บิลนี้ไปก่อน โหลดข้อมูลล่าสุดแล้ว ลองทำรายการเมื่อกี้อีกครั้ง"),"error");
        return false;
      }
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

/* =========================================================
   v4.13.1: รวมข้อมูลตอนบันทึกชนกับเพื่อน (three-way merge) — ไม่แตะ DOM ทดสอบใน tests/merge.test.js
   base = บิลกลุ่มตอนที่เราโหลด/บันทึกล่าสุด, mine = บิลบนเครื่องเรา, theirs = บิลล่าสุดบนเซิร์ฟเวอร์
   ของที่เราไม่ได้แตะ = ใช้ของเพื่อน · ของที่เราแก้ = ใช้ของเรา · เพิ่มทั้งสองฝั่ง = ได้ทั้งคู่ (รหัสรายการไม่ซ้ำข้ามเครื่องจาก nid())
   ========================================================= */
function copyBill(d){ return d ? JSON.parse(JSON.stringify(d)) : null; }
function sameJSON(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
function mergeList(base, mine, theirs){
  function byId(list){ var o = {}; (list || []).forEach(function(x){ if (x && x.id != null) o[x.id] = x; }); return o; }
  var b = byId(base), m = byId(mine), out = [], seen = {};
  (theirs || []).forEach(function(t){
    var id = t.id; seen[id] = true;
    if (!(id in m)){
      if (id in b && sameJSON(t, b[id])) return;      // เราลบไป และเพื่อนไม่ได้แก้ = ลบ
      out.push(t); return;                             // ของเพื่อนเพิ่มใหม่ หรือเพื่อนแก้ของที่เราลบ = เก็บไว้
    }
    out.push(mergeItem(b[id], m[id], t));
  });
  (mine || []).forEach(function(x){
    if (seen[x.id]) return;
    if (x.id in b) return;                             // เพื่อนลบไปแล้ว (เราไม่ได้เพิ่มใหม่)
    out.push(x);                                       // ของที่เราเพิ่มใหม่
  });
  return out;
}
function mergeItem(base, mine, theirs){
  if (!base) return mine;
  var mineChanged = !sameJSON(mine, base), theirsChanged = !sameJSON(theirs, base);
  if (!mineChanged) return theirs;
  if (!theirsChanged) return mine;
  if (mine.type === "meal" && theirs.type === "meal" && base.type === "meal"){   // มื้อในทริป: รวมข้างในมื้อด้วย
    var out = mergeItem(Object.assign({}, base, { meal:null }), Object.assign({}, mine, { meal:null }), Object.assign({}, theirs, { meal:null }));
    out = Object.assign({}, out);
    out.meal = mergeParts(base.meal || {}, mine.meal || {}, theirs.meal || {});
    return out;
  }
  return mine;
}
function mergeParts(b, m, t){
  return { menus:mergeList(b.menus, m.menus, t.menus), shared:mergeList(b.shared, m.shared, t.shared), charges:mergeList(b.charges, m.charges, t.charges) };
}
function mergeKeys(base, mine, theirs){
  base = base || {}; mine = mine || {}; theirs = theirs || {};
  var out = {}, keys = {};
  [base, mine, theirs].forEach(function(o){ Object.keys(o).forEach(function(k){ keys[k] = true; }); });
  Object.keys(keys).forEach(function(k){
    var v = sameJSON(mine[k], base[k]) ? theirs[k] : mine[k];
    if (v !== undefined) out[k] = v;
  });
  return out;
}
function mergeBills(base, mine, theirs){
  var b = normalizeBill(base || {}), m = normalizeBill(mine), t = normalizeBill(theirs);
  if (!base) b = { members:[], menus:[], shared:[], charges:[], payers:[], paid:{}, confirms:{} };
  var out = mergeParts(b, m, t);
  out.members = mergeList(b.members, m.members, t.members);
  out.payers = mergeList(b.payers, m.payers, t.payers);
  ["kind", "name"].forEach(function(k){ out[k] = (base && sameJSON(m[k], b[k])) ? t[k] : m[k]; });
  out.paid = mergeKeys(b.paid, m.paid, t.paid);
  out.confirms = mergeKeys(b.confirms, m.confirms, t.confirms);
  if (!out.charges.length) out.charges = defaultCharges();
  out.savedAt = new Date().toISOString();
  return out;
}
/** รวมกับข้อมูลล่าสุดแล้วบันทึก (ชนซ้ำก็รวมใหม่ ไม่เกิน 3 รอบ) → { ok, data: บิลที่รวมแล้ว, net: บันทึกไม่ได้เพราะเน็ต } */
async function saveMerged(latest){
  var mine = copyBill(serialize()), merged = null;
  for (var tries = 0; tries < 3 && latest && latest.data; tries++){
    merged = mergeBills(Store.base, mine, latest.data);
    Store.version = latest.version;
    Store.base = copyBill(latest.data);
    if (latest.name) Store.groupName = latest.name;
    try { await Store.save(merged); return { ok:true, data:merged }; }
    catch(e){ if (!(e && e.conflict)) return { ok:false, data:merged, net:true }; latest = e.latest; }
  }
  if (!latest || !latest.data) return { ok:false, data:merged };
  Store.version = latest.version; Store.base = copyBill(latest.data);   // ชนเกิน 3 รอบ — ใช้ข้อมูลล่าสุดของกลุ่ม
  return { ok:false, data:latest.data };
}
/** ใส่บิลที่รวมแล้วลงหน้าจอ — ถ้ากำลังแก้มื้อในทริปอยู่ ให้อยู่ในมื้อเดิมต่อ */
function applyMerged(data){
  var mealId = ui.tripStash && ui.tripStash.mealId, step = ui.step;
  applyBill(data);
  var item = mealId && state.menus.filter(function(m){ return m.id === mealId && m.type === "meal"; })[0];
  if (item){
    var md = mealOf(item);
    ui.tripStash = { mealId:mealId, menus:state.menus, shared:state.shared, charges:state.charges, payers:state.payers };
    state.kind = "meal";
    state.menus = md.menus; state.shared = md.shared; state.charges = md.charges.length ? md.charges : defaultCharges();
    state.payers = [];
  }
  ui.step = (mealId && !item) ? "menus" : step;
  if (Store.groupId) snapGroup(Store.groupId, data);
  if (currentPath() === "/split") document.getElementById("view").innerHTML = pageSplit();
  render();
  rerenderBill();
}
