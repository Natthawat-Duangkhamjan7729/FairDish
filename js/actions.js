/* FairDish — การกระทำของผู้ใช้ */
"use strict";

/* =========================================================
   8. การกระทำ
   ========================================================= */
function toast(message, kind, action){
  var t = document.getElementById("toast");
  t.dataset.kind = kind === "error" ? "error" : "ok";
  t.innerHTML = '<span class="msg">'+esc(message)+'</span>';
  if (action){
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = action.label;
    b.addEventListener("click", function(){ hideToast(); action.action(); });
    t.appendChild(b);
  }
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(hideToast, action ? 7000 : 2600);
}
function hideToast(){
  var t = document.getElementById("toast");
  t.classList.remove("show");
  clearTimeout(t._timer);
}

function validateName(name, ignoreId){
  if (!name) return L("ยังไม่ได้พิมพ์ชื่อ");
  if (name.length > MAX_NAME) return L("ชื่อยาวเกิน {n} ตัวอักษร", { n:MAX_NAME });
  var dup = state.members.some(function(p){
    return p.id !== ignoreId && p.name.toLowerCase() === name.toLowerCase();
  });
  if (dup) return L("มีชื่อ {name} อยู่แล้ว ลองเติมนามสกุลหรือชื่อเล่นให้ต่างกัน", { name:name });
  return "";
}

async function addMember(){
  var input = document.getElementById("memberInput");
  if (!input || ui.savingMember) return;
  var name = input.value.trim().replace(/\s+/g," ");
  var problem = validateName(name, null);
  if (problem){
    ui.memberError = problem;
    renderMembers();
    input.focus();
    return;
  }
  ui.memberError = "";
  ui.savingMember = true;
  renderMembers();

  state.members.push({ id:nid(), name:name });
  var ok = await commit(L("เพิ่ม {name} แล้ว", { name:name }));

  ui.savingMember = false;
  if (ok) input.value = "";
  render();
  var again = document.getElementById("memberInput");
  if (again) again.focus();
}

function startEdit(id){
  ui.editingMember = id;
  ui.editError = "";
  ui.memberError = "";
  renderMembers();
  var el = document.getElementById("editMemberInput");
  if (el){ el.focus(); el.select(); }
}
async function saveEdit(id){
  var el = document.getElementById("editMemberInput");
  if (!el) return;
  var name = el.value.trim().replace(/\s+/g," ");
  var problem = validateName(name, id);
  if (problem){ ui.editError = problem; renderMembers(); return; }
  if (name === nameOf(id)){ ui.editingMember=null; ui.editError=""; return renderMembers(); }
  state.members.forEach(function(p){ if (p.id === id) p.name = name; });
  ui.editingMember = null;
  ui.editError = "";
  render();
  await commit(L("เปลี่ยนชื่อเป็น {name} แล้ว", { name:name }));
  render();
}

function askDelete(id){
  if (menusOf(id).length > 0){ ui.confirmMember = id; return renderMembers(); }
  removeMember(id);
}
async function removeMember(id){
  var index = -1;
  state.members.forEach(function(p,i){ if (p.id===id) index = i; });
  if (index < 0) return;
  var member = state.members[index];
  var affected = menusOf(id).map(function(m){ return m.id; });

  ui.undo = { kind:"member", member:member, index:index, menuIds:affected };
  state.members.splice(index,1);
  state.menus.forEach(function(m){
    m.eaters = m.eaters.filter(function(e){ return e !== id; });
  });
  delete state.open[id];
  ui.confirmMember = null;
  render();
  var ok = await commit(null,"member");
  render();
  if (!ok){ ui.undo = null; return; }   // บันทึกไม่ได้/ชนกับเพื่อน อย่าให้ toast เลิกทำทับข้อความแจ้งปัญหา

  clearTimeout(ui.undoTimer);
  ui.undoTimer = setTimeout(function(){ ui.undo = null; }, 8000);
  toast(L("ลบ {name} แล้ว", { name:member.name }),"ok",{ label:L("เลิกทำ"), action:undoRemove });
}
async function undoRemove(){
  if (!ui.undo) return;
  var u = ui.undo;
  ui.undo = null;
  clearTimeout(ui.undoTimer);

  if (u.kind === "menu"){
    state.menus.splice(Math.min(u.index, state.menus.length), 0, u.menu);
    render();
    await commit(L("คืน {name} กลับมาแล้ว", { name:u.menu.name }),"menu");
    return render();
  }

  state.members.splice(Math.min(u.index, state.members.length), 0, u.member);
  state.menus.forEach(function(m){
    if (u.menuIds.indexOf(m.id) >= 0 && m.eaters.indexOf(u.member.id) < 0) m.eaters.push(u.member.id);
  });
  render();
  await commit(L("คืนชื่อ {name} กลับมาแล้ว", { name:u.member.name }),"member");
  render();
}

/* ---- v1.4: เมนูแนะนำระหว่างพิมพ์ + จำเมนูที่เคยสั่งให้เอง ---- */
var SUGGEST_LIMIT = 8;

function menuSuggestions(query){
  var q = normText(query);
  var seen = {}, hits = [];
  if (state.kind === "trip") return tripSuggestions(q);
  function consider(name, norm, price, remembered, tierBase){
    if (seen[norm]) return;
    var pos = q ? norm.indexOf(q) : 0;
    if (q && pos < 0) return;
    seen[norm] = true;
    hits.push({
      name:name, price:(price===undefined?null:price), remembered:!!remembered,
      tier:tierBase + (pos===0 ? 0 : 1), len:name.length
    });
  }
  var mem = state.menuMemory.slice().sort(function(a,b){
    return (b.count||0)-(a.count||0) || (b.at||0)-(a.at||0);
  });

  if (!q){
    // ยังไม่พิมพ์อะไร = เสนอเมนูที่ผู้ใช้สั่งบ่อยก่อน
    mem.slice(0,6).forEach(function(m){
      consider(m.name, normText(m.name), m.price, true, 0);
    });
    return { items:hits, total:mem.length };
  }

  mem.forEach(function(m){
    consider(m.name, normText(m.name), m.price, true, 0);
  });
  MENU_LIBRARY.forEach(function(l){
    consider(l.name, l.norm, null, false, 2);
  });
  hits.sort(function(a,b){
    return a.tier - b.tier || a.len - b.len || a.name.localeCompare(b.name, "th");
  });
  return { items:hits.slice(0, SUGGEST_LIMIT), total:hits.length };
}

function highlight(name, query){
  var q = String(query||"").trim();
  if (!q) return esc(name);
  var i = normText(name).indexOf(normText(q));
  if (i < 0) return esc(name);
  return esc(name.slice(0,i))+"<b>"+esc(name.slice(i,i+q.length))+"</b>"+esc(name.slice(i+q.length));
}

function renderSuggestions(){
  var box = document.getElementById("mSuggest");
  var input = document.getElementById("mName");
  if (!box || !input) return;
  var query = input.value;
  var found = ui.suggest.open ? menuSuggestions(query) : { items:[], total:0 };
  var items = found.items;
  ui.suggest.items = items;
  ui.suggest.total = found.total;
  if (ui.suggest.active >= items.length) ui.suggest.active = -1;

  if (!items.length){
    box.innerHTML = "";
    input.setAttribute("aria-expanded","false");
    return;
  }
  var head = String(query||"").trim()
    ? (found.total > items.length
        ? kt("suggest")+" "+L("{n} จาก {total} รายการ — พิมพ์ต่อเพื่อกรองให้แคบลง", { n:items.length, total:found.total })
        : kt("suggest")+" "+L("{n} รายการ", { n:items.length }))
    : kt("suggestOften");
  box.innerHTML = '<div class="suggest" id="mSuggestList" role="listbox" aria-label="'+kt("suggest")+'">'+
    '<div class="s-head">'+head+'</div>'+
    items.map(function(it,i){
      return '<button type="button" role="option" id="mSuggest'+i+'" data-suggest="'+i+'" aria-selected="'+(i===ui.suggest.active)+'">'+
        '<span class="s-name">'+highlight(it.name, query)+'</span>'+
        (it.remembered ? '<span class="s-tag">'+L("เคยสั่ง")+'</span>' : '')+
        (it.price!=null ? '<span class="s-price">'+baht(it.price)+'</span>' : '')+
      '</button>';
    }).join("")+
  '</div>';
  input.setAttribute("aria-expanded","true");
  var active = items[ui.suggest.active];
  input.setAttribute("aria-activedescendant", active ? ("mSuggest"+ui.suggest.active) : "");
}

function moveSuggestion(step){
  var n = ui.suggest.items.length;
  if (!n) return;
  var next = ui.suggest.active + step;
  if (next < 0) next = n - 1;
  if (next >= n) next = 0;
  ui.suggest.active = next;
  renderSuggestions();
}

function closeSuggestions(){
  ui.suggest = { open:false, items:[], active:-1, total:0 };
  var box = document.getElementById("mSuggest");
  if (box) box.innerHTML = "";
  var input = document.getElementById("mName");
  if (input){ input.setAttribute("aria-expanded","false"); input.setAttribute("aria-activedescendant",""); }
}

function pickSuggestion(i){
  var it = ui.suggest.items[i];
  if (!it || !state.menuForm) return;
  var nameEl = document.getElementById("mName");
  var priceEl = document.getElementById("mPrice");
  if (nameEl) nameEl.value = it.name;
  if (priceEl && it.price!=null && !String(priceEl.value).trim()) priceEl.value = it.price;
  syncMenuForm();
  ui.menuErr.name = "";
  if (priceEl && String(priceEl.value).trim()) ui.menuErr.price = "";
  closeSuggestions();
  ui.focusMenuField = "mPrice";
  renderMenus();
}

/** จำเมนูที่เพิ่งบันทึกไว้ใช้ครั้งต่อไป — ล้มเหลวก็ไม่กระทบบิลที่บันทึกแล้ว */
/** v3.0: ทริปใช้คลังค่าใช้จ่ายทริป (ไม่มีราคาจำ) — ยังไม่พิมพ์ = รายการยอดนิยม */
function tripSuggestions(q){
  var hits = TRIP_LIBRARY.filter(function(l){ return q ? l.norm.indexOf(q) >= 0 : l.popular; })
    .map(function(l){ return { name:l.name, price:null, remembered:false, tier:(q && l.norm.indexOf(q) === 0) ? 0 : 1, len:l.name.length }; });
  hits.sort(function(a,b){ return a.tier - b.tier || a.len - b.len; });
  return { items:hits.slice(0, SUGGEST_LIMIT), total:hits.length };
}
async function rememberMenu(name, price){
  if (state.kind === "trip") return;   // จำราคาเฉพาะเมนูอาหาร
  var key = normText(name);
  var found = null;
  state.menuMemory.forEach(function(m){ if (normText(m.name)===key) found = m; });
  if (found){
    found.name = name;
    found.price = price;
    found.count = (found.count||1) + 1;
    found.at = Date.now();
  } else {
    state.menuMemory.push({ name:name, price:price, count:1, at:Date.now() });
  }
  state.menuMemory.sort(function(a,b){
    return (b.count||0)-(a.count||0) || (b.at||0)-(a.at||0);
  });
  if (state.menuMemory.length > MENU_MEMORY_LIMIT) state.menuMemory = state.menuMemory.slice(0, MENU_MEMORY_LIMIT);
  try { await Store.saveMenus(state.menuMemory); } catch(e){}
}

/* ---- ฟีเจอร์ที่ 2: รายการอาหารและราคา ---- */
function syncMenuForm(){
  var f = state.menuForm;
  if (!f) return;
  var n = document.getElementById("mName");
  var p = document.getElementById("mPrice");
  if (n) f.name = n.value;
  if (p) f.price = p.value;
}
function menuPreviewText(f){
  if (!f || !f.eaters.length) return "";
  var price = parseFloat(String(f.price));
  if (isNaN(price) || price < 0) return L("หาร {n} คน · ใส่ราคาแล้วจะคิดให้ทันที", { n:f.eaters.length });
  return L("หาร {n} คน · คนละ {each} บาท", { n:f.eaters.length, each:baht(price/f.eaters.length) });
}
function updateMenuPreview(){
  var el = document.getElementById("mPreview");
  if (!el || !state.menuForm) return;
  syncMenuForm();
  el.textContent = menuPreviewText(state.menuForm);
}
function validateMenuForm(f){
  var errs = { name:"", price:"", eaters:"", payer:"" };
  var name = String(f.name||"").trim();
  if (!name) errs.name = kt("noName");
  else if (name.length > MAX_MENU_NAME) errs.name = L("ชื่อยาวเกิน {n} ตัวอักษร", { n:MAX_MENU_NAME });

  var raw = String(f.price===undefined?"":f.price).trim();
  var price = parseFloat(raw);
  if (raw === "") errs.price = L("ยังไม่ได้ใส่ราคา");
  else if (isNaN(price)) errs.price = L("ราคาต้องเป็นตัวเลข เช่น 60 หรือ 60.50");
  else if (price < 0) errs.price = L("ราคาต้องไม่ติดลบ");
  else if (price > MAX_PRICE) errs.price = L("ราคาสูงเกินจริง ลองตรวจจำนวนศูนย์อีกครั้ง");

  if (state.members.length === 0) errs.eaters = L("ยังไม่มีใครในบิลนี้ กลับไปเพิ่มชื่อในแท็บ \"คน\" ก่อน");
  else if (f.eaters.length === 0) errs.eaters = kt("noEater");
  if (state.kind === "trip" && state.members.length && !nameOf(f.payer)) errs.payer = L("เลือกว่าใครจ่ายรายการนี้");
  return errs;
}
async function saveMenuForm(){
  var f = state.menuForm;
  if (!f || ui.savingMenu) return;
  syncMenuForm();
  ui.menuErr = validateMenuForm(f);
  if (ui.menuErr.name || ui.menuErr.price || ui.menuErr.eaters || ui.menuErr.payer){
    ui.focusMenuField = ui.menuErr.name ? "mName" : (ui.menuErr.price ? "mPrice" : null);
    return renderMenus();
  }
  var name = String(f.name).trim().replace(/\s+/g," ");
  var price = parseFloat(String(f.price));
  var editing = !!f.id;

  ui.savingMenu = true;
  renderMenus();

  if (editing){
    state.menus.forEach(function(x){
      if (x.id===f.id){ x.name=name; x.price=price; x.eaters=f.eaters.slice(); if (f.payer) x.payer=f.payer; }
    });
  } else {
    var item = { id:nid(), name:name, price:price, eaters:f.eaters.slice() };
    if (state.kind === "trip" && f.payer) item.payer = f.payer;
    state.menus.push(item);
  }
  if (f.payer) ui.lastPayer = f.payer;
  state.menuForm = null;
  ui.menuErr = {};

  closeSuggestions();
  await commit(editing ? L("บันทึก {name} แล้ว", { name:name }) : L("เพิ่ม {name} {amt} บาท แล้ว", { name:name, amt:baht(price) }), "menu");
  await rememberMenu(name, price);
  ui.savingMenu = false;
  render();
}
async function duplicateMenu(id){
  var index = -1;
  state.menus.forEach(function(m,i){ if (m.id===id) index = i; });
  if (index < 0) return;
  var src = state.menus[index];
  var copy = { id:nid(), name:src.name, price:src.price, eaters:src.eaters.slice() };
  if (src.payer) copy.payer = src.payer;
  state.menus.splice(index+1, 0, copy);
  render();
  await commit(state.kind === "trip" ? L("ทำซ้ำ {name} แล้ว", { name:src.name }) : L("เพิ่ม {name} อีกจานแล้ว", { name:src.name }),"menu");
  render();
}
async function removeMenu(id){
  var index = -1;
  state.menus.forEach(function(m,i){ if (m.id===id) index = i; });
  if (index < 0) return;
  var menu = state.menus[index];
  ui.undo = { kind:"menu", menu:menu, index:index };
  state.menus.splice(index,1);
  if (state.menuForm && state.menuForm.id===id){ state.menuForm=null; ui.menuErr={}; }
  render();
  var ok = await commit(null,"menu");
  render();
  if (!ok){ ui.undo = null; return; }   // บันทึกไม่ได้/ชนกับเพื่อน อย่าให้ toast เลิกทำทับข้อความแจ้งปัญหา
  clearTimeout(ui.undoTimer);
  ui.undoTimer = setTimeout(function(){ ui.undo = null; }, 8000);
  toast(L("ลบ {name} แล้ว", { name:menu.name }),"ok",{ label:L("เลิกทำ"), action:undoRemove });
}

/** ข้อความสรุปที่ส่งเข้าแชต — v2.4: เปิดด้วยคำขอบคุณให้อ่านเป็นเรื่องของเพื่อน ไม่ใช่ใบแจ้งหนี้
 *  v4.0: ใช้ได้กับบิลใดก็ได้ (ประวัติบิลส่ง s = null เพราะไม่มีข้อมูลคนจ่ายของบิลที่เปิดอยู่) */
function summaryLines(r, title, kind, s, link){
  var lines = [];
  lines.push(ktOf(kind,"icon")+" "+title);
  lines.push(ktOf(kind,"thanks"));
  lines.push(L("ยอดของแต่ละคนตามนี้เลย 👇"));
  lines.push("");
  r.list.forEach(function(p){ lines.push("• "+p.name+"  "+L("{amt} บาท", { amt:baht(p.rounded) })); });
  lines.push("");
  lines.push(L("รวมทั้งหมด {amt} บาท", { amt:baht(r.grand) }));
  if (s && s.ok && s.transfers.length){
    lines.push("");
    lines.push(L("โอนเงินตามนี้นะ 🙏"));
    s.transfers.forEach(function(t){ lines.push("• "+t.fromName+" → "+t.toName+"  "+L("{amt} บาท", { amt:baht(t.amount) })); });
  }
  if (link) lines.push(L("กดดูได้ว่ายอดมาจาก{what}: {link}", { what:ktOf(kind,"fromWhat"), link:link }));
  lines.push(kind === "trip" ? L("— หารตามที่ใช้จริงด้วย FairDish") : L("— หารตามที่กินจริงด้วย FairDish"));
  return lines;
}
function summaryText(){
  var r = compute();
  return summaryLines(r, ui.ctx && Store.groupName ? Store.groupName : currentBillName(), state.kind, settleBill(r),
    ui.ctx ? groupLink(ui.ctx)+"/bill" : null).join("\n");
}
function copyText(text, okMessage){
  function fallback(){
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast(okMessage,"ok"); }
    catch(e){ toast(L("คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วคัดลอกเอง"),"error"); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ toast(okMessage,"ok"); }, fallback);
  } else fallback();
}
function copySummary(){ copyText(summaryText(), L("คัดลอกสรุปยอดแล้ว")); }

/* ---- v2.5: ใครจ่ายให้ร้าน → ใครโอนให้ใคร ---- */
/** วาดหน้าใบสรุปใหม่โดยไม่เล่นแอนิเมชันซ้ำและไม่เลื่อนจอ */
function rerenderBill(){
  if (currentPath() !== "/bill") return;
  var y = window.scrollY;
  ui.noReveal = true;
  document.getElementById("view").innerHTML = pageBill();
  ui.noReveal = false;
  window.scrollTo(0, y);
}
async function togglePayer(id){
  if (!nameOf(id)) return;
  var i = -1;
  state.payers.forEach(function(p, k){ if (p.id === id) i = k; });
  if (i >= 0) state.payers.splice(i, 1);
  else state.payers.push({ id:id, amount:null });
  rerenderBill();
  await commit();
  rerenderBill();
}
async function setPayerAmount(id, raw){
  var text = String(raw || "").trim();
  var n = parseFloat(text);
  if (text !== "" && (isNaN(n) || n < 0 || n > MAX_PRICE * 10)){ toast(L("ใส่ยอดเป็นตัวเลข เช่น 500 หรือ 500.50"),"error"); return rerenderBill(); }
  state.payers.forEach(function(p){ if (p.id === id) p.amount = text === "" ? null : Math.round(n * 100) / 100; });
  rerenderBill();
  await commit();
  rerenderBill();
}
/** ข้อความสั้น ๆ ว่า "ฉัน" ต้องโอนให้ใคร / รอรับจากใคร (ใช้ใต้ยอดของคุณ) */
function myTransferText(){
  var me = myMemberId();
  if (!me || !hasData()) return "";
  var s = settleBill(compute());
  if (!s.ok) return "";
  var out = s.transfers.filter(function(t){ return t.from === me; });
  var inn = s.transfers.filter(function(t){ return t.to === me; });
  if (out.length) return out.map(function(t){ return L("โอนให้ {name} {amt}", { name:t.toName, amt:baht(t.amount) }); }).join(" · ");
  if (inn.length) return L("รอรับคืน {amt} บาท", { amt:baht(inn.reduce(function(a,t){ return a+t.amount; },0)) });
  return L("ไม่ต้องโอนให้ใคร");
}

/* ---- v2.4: ล้างข้อมูลแบบปลอดภัย ---- */
/** ในกลุ่มต้องพิมพ์ชื่อกลุ่มให้ตรงก่อนถึงจะล้างได้ */
function resetNameMatches(){
  var el = document.getElementById("resetConfirmName");
  return !!el && el.value.trim().replace(/\s+/g," ") === Store.groupName;
}
async function undoReset(before){
  applyBill(before);
  render();
  await commit(L("คืนข้อมูลกลับมาแล้ว"));
  render();
}

/* ---- v2.0: กลุ่มผ่านลิงก์ ---- */
function setFieldMsg(id, text, isError){
  var el = document.getElementById(id);
  if (!el) return;
  el.className = "field-msg " + (isError ? "error" : "muted");
  el.textContent = text;
}

/** หน้า #/groups: ถ้าในเครื่องมีบิลค้างอยู่ ให้เลือกย้ายเข้ากลุ่มใหม่ได้ */
async function checkLocalBill(){
  var saved = null;
  try { var raw = await Store.readRaw(Store.key); saved = raw ? JSON.parse(raw) : null; } catch(e){}
  var slot = document.getElementById("groupFromSlot");
  if (!slot || !saved || !saved.members || !saved.members.length) return;
  slot.innerHTML = '<label class="check"><input type="checkbox" id="groupFromLocal" checked> '+
    L("ใช้บิลที่ทำค้างไว้ในเครื่อง ({n} คน) เป็นบิลเริ่มต้นของกลุ่ม", { n:saved.members.length })+'</label>';
}

async function createGroup(){
  var input = document.getElementById("groupName");
  var btn = document.getElementById("groupCreate");
  if (!input || ui.creatingGroup) return;
  var name = input.value.trim().replace(/\s+/g," ");
  if (!name){ setFieldMsg("groupMsg",L("ตั้งชื่อกลุ่มก่อน เช่น ส้มตำหน้ามอ"),true); return input.focus(); }
  if (name.length > MAX_GROUP_NAME){ setFieldMsg("groupMsg",L("ชื่อยาวเกิน {n} ตัวอักษร", { n:MAX_GROUP_NAME }),true); return input.focus(); }

  var data = { members:[], menus:[], shared:[], charges:defaultCharges(), kind:ui.newGroupKind };
  var from = document.getElementById("groupFromLocal");
  var moved = false;
  if (from && from.checked){
    moved = true;
    try { var raw = await Store.readRaw(Store.key); if (raw) data = JSON.parse(raw); } catch(e){}
    // บิลในเครื่องยังไม่มีรายการ = ใช้ประเภทที่เลือกในฟอร์ม, มีรายการแล้ว = ใช้ประเภทของบิลนั้น
    if (!((data.menus || []).length || (data.shared || []).length)) data.kind = ui.newGroupKind;
    else data.kind = data.kind === "trip" ? "trip" : "meal";
  }
  ui.creatingGroup = true;
  if (btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>'+L("กำลังสร้าง"); }
  try {
    var g = await Cloud.create(name, data);
    await rememberGroup(g.id, g.name, data.kind);
    // v4.0: บิลในเครื่องย้ายเข้ากลุ่มแล้ว ล้างบิลส่วนตัวไม่ให้ขึ้นซ้ำบนหน้าแรก/ประวัติ
    if (moved){
      try { await Store.writeRaw(Store.key, JSON.stringify({ members:[], menus:[], shared:[], charges:defaultCharges(), payers:[], kind:data.kind })); } catch(e){}
      if (ui.ctx === null) ui.ctx = undefined;          // กลับมาบิลส่วนตัวเมื่อไหร่ให้โหลดใหม่
    }
    location.hash = "#/g/" + g.id;
    toast(L("สร้างกลุ่มแล้ว คัดลอกลิงก์ส่งให้เพื่อนได้เลย"),"ok");
  } catch(err){
    setFieldMsg("groupMsg",L("สร้างกลุ่มไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"),true);
  } finally {
    ui.creatingGroup = false;
    var again = document.getElementById("groupCreate");
    if (again){ again.disabled = false; again.textContent = L("สร้างกลุ่ม"); }
  }
}

function joinGroup(){
  var input = document.getElementById("groupJoinInput");
  if (!input) return;
  var id = groupIdFromInput(input.value);
  if (!id){
    setFieldMsg("groupJoinMsg",L("ไม่ใช่ลิงก์กลุ่มของ FairDish ลองคัดลอกลิงก์จากเพื่อนมาใหม่ทั้งหมด"),true);
    return input.focus();
  }
  location.hash = "#/g/" + id;
}

async function forgetGroup(id){
  var g = myGroup(id);
  if (!g) return;
  ui.myGroups = ui.myGroups.filter(function(x){ return x.id !== id; });
  await saveMyGroups();
  document.getElementById("view").innerHTML = pageGroups();
  checkLocalBill();
  toast(L("เอา {name} ออกจากรายการแล้ว (กลุ่มยังอยู่ เปิดจากลิงก์ได้)", { name:g.name }),"ok");
}

/* ---- v2.4: ถาม "คุณคือใคร" ครั้งแรกที่เปิดกลุ่ม ---- */
function maybeAskWhoAmI(){
  if (!ui.ctx || ui.loading || ui.groupError || !state.members.length) return;
  var g = myGroup(ui.ctx);
  if (!g || g.me || g.asked) return;
  g.asked = true;            // ถามครั้งเดียวต่อกลุ่มต่อเครื่อง กดข้ามก็ไม่ถามซ้ำ
  saveMyGroups();
  openMeDialog();
}
function openMeDialog(){
  var box = document.getElementById("meDialog");
  if (!box || !ui.ctx) return;
  box.innerHTML =
    '<div class="install-head"><div><h2 id="meTitle">'+L("คุณคือใครในบิลนี้?")+'</h2>'+
      '<p>'+L("เลือกชื่อตัวเอง แล้วยอดที่คุณต้องจ่ายจะแสดงตัวใหญ่ให้เห็นทันที (จำไว้ในเครื่องนี้)")+'</p></div>'+
      '<button class="icon-btn" data-me-close="1" aria-label="'+L("ปิด")+'">'+ICON_X+'</button></div>'+
    '<div class="pick me-pick">'+state.members.map(function(p){
      return '<button data-me-pick="'+p.id+'">'+esc(p.name)+'</button>';
    }).join("")+'</div>'+
    '<div class="me-other">'+
      '<button class="btn-quiet" data-me-add="1">'+L("ยังไม่มีชื่อฉัน — เพิ่มชื่อตัวเอง")+'</button>'+
      '<button class="me-skip" data-me-close="1">'+L("ข้ามไปก่อน")+'</button>'+
    '</div>';
  if (typeof box.showModal === "function") box.showModal(); else box.setAttribute("open","");
}
function closeMeDialog(){
  var box = document.getElementById("meDialog");
  if (!box) return;
  if (typeof box.close === "function") box.close(); else box.removeAttribute("open");
}
async function chooseMe(memberId){
  var g = myGroup(ui.ctx);
  closeMeDialog();
  if (!g || !nameOf(memberId)) return;
  g.me = memberId;
  await saveMyGroups();
  render();
  toast(L("สวัสดี {name} 👋 ยอดของคุณอยู่ด้านบนแล้ว", { name:nameOf(memberId) }),"ok");
}
function addMyselfFromDialog(){
  closeMeDialog();
  setStep("members");
  var input = document.getElementById("memberInput");
  if (input){ input.focus(); input.scrollIntoView({ block:"center" }); }
}
/** ยอดของ "ฉัน" ในบิลนี้ หรือ null */
function myShare(){
  var me = myMemberId();
  if (!me || !hasData()) return null;
  var r = compute();
  return r.list.filter(function(p){ return p.id===me; })[0] || null;
}

async function setMe(memberId){
  var g = myGroup(ui.ctx);
  if (!g) return;
  g.me = g.me === memberId ? null : memberId;
  await saveMyGroups();
  render();
}

/* ---- v2.7: หน้าต่างชวนเพื่อน (QR + ช่องทางแชร์) ---- */
var ICON_SAVE_IMG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12l4 4 4-4"/></svg>';
/** ข้อความชวนที่ส่งเข้าแชตพร้อมลิงก์ */
function inviteText(){
  return L("มาช่วยกันกรอกบิล \"{name}\" ใน FairDish กัน 🍲", { name:Store.groupName })+"\n"+
    L("กดลิงก์แล้วแก้บิลเดียวกันได้เลย ไม่ต้องสมัคร")+"\n"+groupLink(ui.ctx);
}
function openShareDialog(){
  var box = document.getElementById("shareDialog");
  if (!box || !ui.ctx) return;
  var link = groupLink(ui.ctx);
  var q = QR.encode(link);
  var qr = q
    ? '<div class="qr-code">'+QR.svg(link, L("QR code ลิงก์กลุ่ม {name}", { name:esc(Store.groupName) }))+
        (q.version >= 4 ? '<span class="qr-logo"><img src="img/icon-192.png" alt=""></span>' : '')+'</div>'
    : '';
  box.innerHTML =
    '<div class="install-head"><div><h2 id="shareTitle" tabindex="-1" autofocus>'+L("ชวนเพื่อนมาหารด้วยกัน")+'</h2>'+
      '<p>'+L("สแกนหรือกดลิงก์ แล้วช่วยกันกรอกบิลนี้ได้เลย ไม่ต้องสมัคร")+'</p></div>'+
      '<button class="icon-btn" data-share-close="1" aria-label="'+L("ปิด")+'">'+ICON_X+'</button></div>'+
    (qr ? '<div class="qr-card">'+qr+
      '<b class="qr-name">'+esc(Store.groupName)+'</b>'+
      '<span class="qr-hint">'+L("เปิดกล้องมือถือแล้วสแกนได้เลย")+'</span></div>' : '')+
    '<div class="share-grid">'+
      (navigator.share ? '<button class="share-opt" id="shareNative">'+ICON_SHARE+'<span>'+L("แชร์ทางอื่น")+'</span></button>' : '')+
      '<button class="share-opt" id="shareCopy">'+ICON_COPY+'<span>'+L("คัดลอกลิงก์")+'</span></button>'+
      (qr ? '<button class="share-opt" id="shareSaveQr">'+ICON_SAVE_IMG+'<span>'+L("บันทึกรูป QR")+'</span></button>' : '')+
      '<button class="share-opt" id="shareConfirm">'+ICON_CHECK+'<span>'+L("ลิงก์ให้เพื่อนยืนยันเมนู")+'</span></button>'+
    '</div>'+
    '<p class="share-link" title="'+esc(link)+'">'+esc(link)+'</p>';
  if (typeof box.showModal === "function") box.showModal(); else box.setAttribute("open","");
  fitQr(box, q);
  var title = document.getElementById("shareTitle");
  if (title) title.focus({ preventScroll:true });     // ไม่ให้วงโฟกัสไปอยู่ที่ปุ่ม × ตอนเปิด
}
/** ขยาย QR ให้แต่ละโมดูลกว้างเป็นพิกเซลจอเต็มจำนวน — ไม่งั้นบางช่องหนาบางช่องบาง ดูเบี้ยวและสแกนยาก */
function fitQr(box, q){
  var code = box.querySelector(".qr-code"), card = box.querySelector(".qr-card");
  if (!code || !card || !q) return;
  var n = q.size + 8, dpr = window.devicePixelRatio || 1;
  var cs = getComputedStyle(card);
  var room = Math.min(card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), 300);
  var perModule = Math.max(1, Math.floor(room * dpr / n));     // พิกเซลจอจริงต่อโมดูล
  code.style.width = (n * perModule / dpr) + "px";
}
function closeShareDialog(){
  var box = document.getElementById("shareDialog");
  if (!box) return;
  if (typeof box.close === "function") box.close(); else box.removeAttribute("open");
}
/** QR + โลโก้เป็นรูป PNG (สีจากตัวแปร --qr-ink / --paper) */
async function qrImageBlob(){
  var link = groupLink(ui.ctx), q = QR.encode(link);
  if (!q) throw new Error("link too long");
  var cs = getComputedStyle(document.documentElement);
  var ink = cs.getPropertyValue("--qr-ink").trim(), paper = cs.getPropertyValue("--qr-paper").trim();
  var scale = 16, n = (q.size + 8) * scale;
  var c = document.createElement("canvas");
  c.width = n; c.height = n;
  var ctx = c.getContext("2d");
  ctx.fillStyle = paper; ctx.fillRect(0, 0, n, n);
  ctx.fillStyle = ink;
  for (var y=0;y<q.size;y++) for (var x=0;x<q.size;x++) if (q.dark(x, y)) ctx.fillRect((x+4)*scale, (y+4)*scale, scale, scale);
  if (q.version >= 4){
    var logo = await loadImage("img/icon-192.png");
    var w = Math.round(n * 0.22), o = Math.round((n - w) / 2), pad = Math.round(scale * 0.6);
    ctx.fillStyle = paper; roundRect(ctx, o - pad, o - pad, w + 2*pad, w + 2*pad, pad*2); ctx.fill();
    if (logo){ ctx.save(); roundRect(ctx, o, o, w, w, Math.round(w*0.22)); ctx.clip(); ctx.drawImage(logo, o, o, w, w); ctx.restore(); }
  }
  return new Promise(function(ok, fail){ c.toBlob(function(b){ b ? ok(b) : fail(new Error("toBlob")); }, "image/png"); });
}
async function saveQrImage(){
  try {
    var blob = await qrImageBlob();
    var name = "FairDish-QR-" + Store.groupName.replace(/[\\/:*?"<>|\s]+/g,"-") + ".png";
    var file = typeof File === "function" ? new File([blob], name, { type:"image/png" }) : null;
    if (file && navigator.canShare && navigator.canShare({ files:[file] })){
      try { await navigator.share({ files:[file], text:inviteText() }); } catch(e){ if (e && e.name !== "AbortError") throw e; }
      return;
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
    toast(L("บันทึกรูป QR แล้ว"),"ok");
  } catch(err){ toast(L("บันทึกรูปไม่สำเร็จ ลองคัดลอกลิงก์แทน"),"error"); }
}

function shareGroupLink(){
  if (!ui.ctx) return;
  var link = groupLink(ui.ctx);
  if (!navigator.share) return copyText(link, L("คัดลอกลิงก์กลุ่มแล้ว ส่งเข้าแชตได้เลย"));
  navigator.share({ title:Store.groupName+" · FairDish", text:L("มาช่วยกันกรอกบิล \"{name}\" ใน FairDish กัน 🍲", { name:Store.groupName }), url:link })
    .catch(function(){});   // ผู้ใช้กดยกเลิก = ไม่ใช่ข้อผิดพลาด
}

/* ---- v3.1: มื้ออาหารข้างในทริป ----
   ตอนแก้มื้อ เราสลับ state.menus/shared/charges เป็นของมื้อนั้นชั่วคราว (ui.tripStash เก็บของทริปไว้)
   ตัวแก้เมนู/ส่วนกลาง/VAT เดิมจึงใช้ได้ทั้งหมด — serialize() ประกอบกลับเป็นทริปให้ตอนบันทึก */
function currentMeal(){
  var t = ui.tripStash;
  if (!t) return null;
  for (var i=0;i<t.menus.length;i++) if (t.menus[i].id === t.mealId) return t.menus[i];
  return null;
}
function mealTotalOf(m){
  var md = mealOf(m);
  return computeBill({ members:state.members, menus:md.menus, shared:md.shared, charges:md.charges, kind:"meal" });
}
function enterMeal(id){
  if (ui.tripStash) exitMeal();
  var item = state.menus.filter(function(m){ return m.id === id && m.type === "meal"; })[0];
  if (!item) return;
  var md = mealOf(item);
  ui.tripStash = { mealId:id, menus:state.menus, shared:state.shared, charges:state.charges, payers:state.payers };
  state.kind = "meal";
  state.menus = md.menus; state.shared = md.shared; state.charges = md.charges.length ? md.charges : defaultCharges();
  state.payers = [];
  state.menuForm = null; state.sharedForm = null; state.chargeForm = null; closeSuggestions();
  ui.step = "menus";
  document.getElementById("view").innerHTML = pageSplit();
  render();
  window.scrollTo(0, 0);
}
/** เก็บมื้อที่แก้อยู่กลับเข้าทริป (ไม่บันทึกเอง — ทุกการแก้ในมื้อ commit ไปแล้ว) */
function exitMeal(){
  var t = ui.tripStash;
  if (!t) return;
  var item = currentMeal();
  if (item) item.meal = { menus:state.menus, shared:state.shared, charges:state.charges };
  state.menus = t.menus; state.shared = t.shared; state.charges = t.charges; state.payers = t.payers;
  state.kind = "trip";
  ui.tripStash = null;
  state.menuForm = null; state.sharedForm = null; state.chargeForm = null; closeSuggestions();
  ui.step = "menus";
}
function backToTrip(){
  exitMeal();
  document.getElementById("view").innerHTML = pageSplit();
  render();
  window.scrollTo(0, 0);
}
async function addMeal(){
  var n = state.menus.filter(function(m){ return m.type === "meal"; }).length + 1;
  var payer = nameOf(ui.lastPayer) ? ui.lastPayer : (myMemberId() || null);
  var item = { id:nid(), type:"meal", name:L("มื้อที่ {n}", { n:n }), price:0, eaters:[],
               meal:{ menus:[], shared:[], charges:defaultCharges() } };
  if (payer) item.payer = payer;
  state.menus.push(item);
  await commit(null, "menu");
  enterMeal(item.id);
  var name = document.getElementById("mealName");
  if (name){ name.focus(); name.select(); }
}
async function renameMeal(value){
  var item = currentMeal();
  var name = String(value || "").trim().replace(/\s+/g," ").slice(0, MAX_MENU_NAME);
  if (!item || !name || name === item.name) return renderMealHead();
  item.name = name;
  renderMealHead();
  await commit(L("เปลี่ยนชื่อมื้อเป็น {name} แล้ว", { name:name }));
}
async function setMealPayer(id){
  var item = currentMeal();
  if (!item || !nameOf(id)) return;
  item.payer = id;
  ui.lastPayer = id;
  renderMealHead();
  await commit();
}
async function deleteMeal(){
  var item = currentMeal();
  if (!item) return;
  var id = item.id;
  exitMeal();
  document.getElementById("view").innerHTML = pageSplit();
  render();
  await removeMenu(id);                 // มีปุ่มเลิกทำเหมือนลบรายการปกติ
}

/* ---- v3.0: ประเภทบิล ---- */
function billIsEmpty(){ return !state.menus.length && !state.shared.length; }
/** สลับประเภทบิลที่เปิดอยู่ — ทำได้เมื่อยังไม่มีรายการ (กันข้อมูลค่าส่วนกลาง/VAT ค้างแบบมองไม่เห็น) */
async function setKind(kind){
  if (kind !== "meal" && kind !== "trip") return;
  if (kind === state.kind) return;
  if (!billIsEmpty()){
    toast(L("มีรายการอยู่แล้ว ล้างข้อมูลก่อนถึงจะเปลี่ยนเป็น{kind}ได้", { kind:ktOf(kind,"name") }),"error");
    return renderKindSlot();
  }
  state.kind = kind;
  ui.step = "members";
  state.menuForm = null;
  document.getElementById("view").innerHTML = pageSplit();
  render();
  await commit(L("เปลี่ยนเป็น{kind}แล้ว", { kind:kt("name") }));
  updateChrome();
}
/** หน้าแรก: เริ่มบิลใหม่ (มื้ออาหาร/ทริป) — v4.0: บิลส่วนตัวที่ค้างอยู่ถูกเก็บเข้าประวัติก่อน ไม่ต้องล้างเอง */
async function startKind(kind){
  var archived = await archiveLocalBill();
  if (archived) toast(L("เก็บบิลเดิมไว้ในประวัติแล้ว เริ่มบิลใหม่ได้เลย"),"ok");
  ui.pendingKind = kind;
  ui.homeNew = false;
  ui.step = "members";
  if (currentPath() === "/split" && ui.ctx === null && !ui.loading) return applyPendingKind();
  location.hash = "#/split";
}
function applyPendingKind(){
  var kind = ui.pendingKind;
  if (!kind || ui.loading || ui.ctx !== null || currentPath() !== "/split") return;
  ui.pendingKind = null;
  if (kind === state.kind) return;
  if (billIsEmpty()) return setKind(kind);
  toast(L("บิลส่วนตัวมี{kind}ค้างอยู่ ล้างข้อมูลก่อนถึงจะเริ่ม{other}ใหม่ได้", { kind:kt("name"), other:ktOf(kind,"name") }),"error");
}
/** ฟอร์มสร้างกลุ่ม: เปลี่ยนประเภท และเปลี่ยนชื่อตั้งต้นตาม ถ้ายังไม่ได้แก้ชื่อเอง */
function setNewGroupKind(kind){
  var input = document.getElementById("groupName");
  var wasDefault = input && input.value === defaultGroupName(null, ui.newGroupKind);
  ui.newGroupKind = kind === "trip" ? "trip" : "meal";
  Array.prototype.forEach.call(document.querySelectorAll("[data-group-kind]"), function(b){
    b.setAttribute("aria-pressed", b.getAttribute("data-group-kind") === ui.newGroupKind ? "true" : "false");
  });
  if (wasDefault) input.value = defaultGroupName(null, ui.newGroupKind);
}

/* ---- v2.1: ธีม ---- */
function applyTheme(theme){
  ui.theme = (theme==="light" || theme==="dark") ? theme : "system";
  var root = document.documentElement;
  if (ui.theme==="system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", ui.theme);
}
async function setTheme(theme){
  applyTheme(theme);
  try { await Store.writeRaw(Store.themeKey, ui.theme); } catch(e){}
  if (currentPath()==="/more") document.getElementById("view").innerHTML = pageMore();
}

/* ---- v4.0: ภาษา ---- */
function applyLang(lang){
  LANG = lang === "en" ? "en" : "th";
  applyStaticText();
}
async function setLang(lang){
  applyLang(lang);
  try { await Store.writeRaw(LANG_KEY, LANG); } catch(e){}
  if (document.getElementById("onboard")){ document.getElementById("onboard").innerHTML = onboardHTML(); return; }
  var y = window.scrollY;
  route();                              // วาดหน้าปัจจุบันใหม่ทั้งหน้าด้วยภาษาใหม่
  window.scrollTo(0, y);
}

async function loadDemo(){
  state.members=[]; state.menus=[]; state.shared=[];
  ["มาร์ค","พูม","ไอซ์","ชาเน่","โม","ยูกะ","โฟรค์","เจ้าสัว"].forEach(function(n){
    state.members.push({ id:nid(), name:L(n) });
  });
  function ids(){
    return Array.prototype.slice.call(arguments).map(function(n){
      var f = state.members.filter(function(m){ return m.name===L(n); })[0];
      return f ? f.id : null;
    }).filter(Boolean);
  }
  // มื้ออีสานร้านหน้ามอ 8 คน — แต่ละคนกินไม่เท่ากันแบบที่เกิดจริง
  var all = ["มาร์ค","พูม","ไอซ์","ชาเน่","โม","ยูกะ","โฟรค์","เจ้าสัว"];
  state.menus = [
    { id:nid(), name:L("ตำไทย"), price:50, eaters:ids("ชาเน่","ยูกะ","โฟรค์") },
    { id:nid(), name:L("ตำปูปลาร้า"), price:50, eaters:ids("มาร์ค","พูม","เจ้าสัว") },
    { id:nid(), name:L("ตำซั่ว"), price:60, eaters:ids("ไอซ์","มาร์ค") },
    { id:nid(), name:L("ไก่ย่างเขาสวนกวาง"), price:180, eaters:ids.apply(null, all) },
    { id:nid(), name:L("คอหมูย่าง"), price:120, eaters:ids("มาร์ค","ไอซ์","เจ้าสัว") },
    { id:nid(), name:L("ลาบหมู"), price:80, eaters:ids("มาร์ค","พูม","ไอซ์","โม") },
    { id:nid(), name:L("ต้มแซ่บกระดูกอ่อน"), price:120, eaters:ids("ไอซ์","เจ้าสัว","โม") },
    { id:nid(), name:L("ไส้กรอกอีสาน"), price:60, eaters:ids("ชาเน่","โม") },
    { id:nid(), name:L("ไข่เจียวหมูสับ"), price:60, eaters:ids("ยูกะ") },
    { id:nid(), name:L("ซอยจุ๊"), price:150, eaters:ids("ไอซ์","เจ้าสัว") }
  ];
  state.shared = [
    { id:nid(), name:L("ข้าวเหนียว 4 กระติ๊บ"), price:60 },
    { id:nid(), name:L("น้ำแข็ง"), price:20 },
    { id:nid(), name:L("โค้กขวดใหญ่ 2 ขวด"), price:70 },
    { id:nid(), name:L("น้ำเปล่าขวดใหญ่ 2 ขวด"), price:30 }
  ];
  state.charges.forEach(function(c){ c.on=false; });   // ร้านอีสานทั่วไปไม่คิดค่าบริการ / VAT
  state.payers = [];
  state.confirms = {};
  if (!ui.ctx) state.title = L("ร้านส้มตำหน้ามอ");
  state.menuForm=null; state.sharedForm=null; state.chargeForm=null; state.open={};
  ui.confirmMember=null; ui.editingMember=null; ui.memberError=""; ui.undo=null;
  render();
  await commit(L("ใส่ข้อมูลตัวอย่างแล้ว"));
  render();
}
