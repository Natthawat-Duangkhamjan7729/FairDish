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
  if (dup) return L("มีชื่อ {name} ในโต๊ะแล้ว ลองเติมนามสกุลหรือชื่อเล่นให้ต่างกัน", { name:name });
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
    await commit(L("คืนเมนู {name} กลับมาแล้ว", { name:u.menu.name }),"menu");
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
  // v4.15: alt = ชื่อไทยของรายการคลังตอนแสดงเป็นอังกฤษ — พิมพ์ไทยในโหมด EN ก็ยังเจอ
  function consider(name, norm, price, remembered, tierBase, alt){
    if (seen[norm]) return;
    var pos = q ? norm.indexOf(q) : 0;
    if (q && pos < 0 && alt) pos = alt.indexOf(q);
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
  var en = LANG === "en";
  MENU_LIBRARY.forEach(function(l){
    if (en && l.en) consider(l.en, l.enNorm, null, false, 2, l.norm);
    else consider(l.name, l.norm, null, false, 2);
  });
  hits.sort(function(a,b){
    return a.tier - b.tier || a.len - b.len || a.name.localeCompare(b.name, LANG);
  });
  return { items:hits.slice(0, SUGGEST_LIMIT), total:hits.length };
}

function highlight(name, query){
  var q = normText(query);
  if (!q) return esc(name);
  // v4.15: normText ตัดช่องว่าง แต่ชื่ออังกฤษมีช่องว่าง — จำตำแหน่งจริงของแต่ละตัวอักษรไว้ ตัวหนาจะได้ตรงคำที่พิมพ์
  var pos = [], flat = "";
  for (var k = 0; k < name.length; k++){
    if (!/\s/.test(name[k])){ pos.push(k); flat += name[k].toLowerCase(); }
  }
  var i = flat.indexOf(q);
  if (i < 0) return esc(name);
  var a = pos[i], b = pos[i + q.length - 1] + 1;
  return esc(name.slice(0,a))+"<b>"+esc(name.slice(a,b))+"</b>"+esc(name.slice(b));
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
  box.innerHTML = suggestBoxHTML(found, query, ui.suggest.active, "mSuggest", "data-suggest");
  input.setAttribute("aria-expanded","true");
  var active = items[ui.suggest.active];
  input.setAttribute("aria-activedescendant", active ? ("mSuggest"+ui.suggest.active) : "");
}

/** กล่องเมนูแนะนำ — ใช้ทั้งฟอร์มแผ่น (#mName → "mSuggest"/data-suggest) และช่องบรรทัดเดียวจอใหญ่ (#wsName → "wsSuggest"/data-ws-suggest) */
function suggestBoxHTML(found, query, active, prefix, attr){
  var items = found.items;
  var head = String(query||"").trim()
    ? (found.total > items.length
        ? L("{label} {n} จาก {total} รายการ — พิมพ์ต่อเพื่อกรองให้แคบลง", { label:kt("suggest"), n:items.length, total:found.total })
        : L("{label} {n} รายการ", { label:kt("suggest"), n:items.length }))
    : kt("suggestOften");
  return '<div class="suggest" id="'+prefix+'List" role="listbox" aria-label="'+kt("suggest")+'">'+
    '<div class="s-head">'+head+'</div>'+
    items.map(function(it,i){
      return '<button type="button" role="option" id="'+prefix+i+'" '+attr+'="'+i+'" aria-selected="'+(i===active)+'">'+
        '<span class="s-name">'+highlight(it.name, query)+'</span>'+
        (it.remembered ? '<span class="s-tag">'+L("เคยสั่ง")+'</span>' : '')+
        (it.price!=null ? '<span class="s-price">'+baht(it.price)+'</span>' : '')+
      '</button>';
    }).join("")+
  '</div>';
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
  var hits = TRIP_LIBRARY.filter(function(l){ return q ? libPos(l, q) >= 0 : l.popular; })
    .map(function(l){ var n = libName(l); return { name:n, price:null, remembered:false, tier:(q && libPos(l, q) === 0) ? 0 : 1, len:n.length }; });
  hits.sort(function(a,b){ return a.tier - b.tier || a.len - b.len; });
  return { items:hits.slice(0, SUGGEST_LIMIT), total:hits.length };
}
async function rememberMenu(name, price){
  if (ui.tour) return;                 // v4.5: เมนูจากบิลฝึกไม่ต้องจำ
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
  return L("หาร {n} คน · คนละ {amt} บาท", { n:f.eaters.length, amt:baht(price/f.eaters.length) });
}
function updateMenuPreview(){
  var el = document.getElementById("mPreview");
  if (!el || !state.menuForm) return;
  syncMenuForm();
  el.textContent = menuPreviewText(state.menuForm);
}
/** v4.15: ทริป — คนจ่ายของรายการ/ฟอร์มที่ยังอยู่ในบิล (จ่ายด้วยกันได้หลายคน) */
function knownPayers(m){ return payersOf(m).filter(function(id){ return !!nameOf(id); }); }
/** คนจ่ายตั้งต้นของรายการใหม่ = คนจ่ายครั้งก่อน หรือ "ฉัน" */
function defaultPayers(){
  var last = (ui.lastPayers || []).filter(function(id){ return !!nameOf(id); });
  if (last.length) return last;
  var me = myMemberId();
  return me ? [me] : [];
}
/** แตะชื่อคนจ่าย = เพิ่ม/เอาออก */
function togglePayerIn(list, id){
  return list.indexOf(id) >= 0 ? list.filter(function(x){ return x !== id; }) : list.concat([id]);
}
/** "มาร์ค จ่าย" / "มาร์ค, ไอซ์ จ่ายคนละเท่ากัน" (ใส่ esc ให้แล้ว) — ไม่มีคนจ่าย = "" */
function payerText(m){
  var names = knownPayers(m).map(function(id){ return esc(nameOf(id)); });
  if (!names.length) return "";
  return names.length > 1 ? L("{name} จ่ายคนละเท่ากัน", { name:names.join(", ") }) : L("{name} จ่าย", { name:names[0] });
}
function validateMenuForm(f){
  var errs = { name:"", price:"", eaters:"", payer:"" };
  var name = String(f.name||"").trim();
  if (!name) errs.name = kt("noName");
  else if (name.length > MAX_MENU_NAME) errs.name = L("ชื่อเมนูยาวเกิน {n} ตัวอักษร", { n:MAX_MENU_NAME });

  var raw = String(f.price===undefined?"":f.price).trim();
  var price = parseFloat(raw);
  if (raw === "") errs.price = L("ยังไม่ได้ใส่ราคา");
  else if (isNaN(price)) errs.price = L("ราคาต้องเป็นตัวเลข เช่น 60 หรือ 60.50");
  else if (price < 0) errs.price = L("ราคาต้องไม่ติดลบ");
  else if (price > MAX_PRICE) errs.price = L("ราคาสูงเกินจริง ลองตรวจจำนวนศูนย์อีกครั้ง");

  if (state.members.length === 0) errs.eaters = L("ยังไม่มีใครในโต๊ะ กลับไปเพิ่มชื่อในแท็บ \"คน\" ก่อน");
  else if (f.eaters.length === 0) errs.eaters = kt("noEater");
  if (state.kind === "trip" && state.members.length && !knownPayers(f).length) errs.payer = L("เลือกว่าใครจ่ายรายการนี้");
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
      if (x.id===f.id){ x.name=name; x.price=price; x.eaters=f.eaters.slice(); if (state.kind === "trip") setPayersOf(x, knownPayers(f)); }
    });
  } else {
    var item = { id:nid(), name:name, price:price, eaters:f.eaters.slice() };
    if (state.kind === "trip") setPayersOf(item, knownPayers(f));
    state.menus.push(item);
  }
  if (state.kind === "trip" && knownPayers(f).length) ui.lastPayers = knownPayers(f);
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
  setPayersOf(copy, payersOf(src));
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

/** ข้อความสรุปที่ส่งเข้าแชต — v2.4: เปิดด้วยคำขอบคุณให้อ่านเป็นเรื่องของเพื่อน ไม่ใช่ใบแจ้งหนี้ */
function summaryText(){
  var r = compute();
  var lines = [];
  lines.push(kt("icon")+" "+billName());
  lines.push(kt("thanks"));
  lines.push(L("ยอดของแต่ละคนตามนี้เลย 👇"));
  lines.push("");
  r.list.forEach(function(p){ lines.push("• "+L("{name}  {amt} บาท", { name:p.name, amt:baht(p.rounded) })); });
  lines.push("");
  lines.push(L("รวมทั้งหมด {amt} บาท", { amt:baht(r.grand) }));
  var s = settleBill(r);
  if (s.ok && s.transfers.length){
    lines.push("");
    lines.push(L("โอนเงินตามนี้นะ 🙏"));
    s.transfers.forEach(function(t){
      lines.push("• "+t.fromName+" → "+t.toName+"  "+L("{amt} บาท", { amt:baht(t.amount) })+(state.paid[transferKey(t)] ? " ✅ "+L("โอนแล้ว") : ""));
    });
  }
  if (ui.ctx) lines.push(L("กดดูได้ว่ายอดมาจาก{what}: {link}", { what:kt("fromWhat"), link:groupLink(ui.ctx)+"/bill" }));
  lines.push(state.kind === "trip" ? L("— หารตามที่ใช้จริงด้วย FairDish") : L("— หารตามที่กินจริงด้วย FairDish"));
  return lines.join("\n");
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
  if (currentPath() === "/split"){ renderSummary(); renderTotalBar(); return; }   // จอใหญ่: สรุปยอดสดในพื้นที่ทำงาน
  if (currentPath() !== "/bill") return;
  var y = window.scrollY;
  ui.noReveal = true;
  document.getElementById("view").innerHTML = pageBill();
  ui.noReveal = false;
  renderSideNav();                    // v4.4: ป้ายโอนแล้ว x/y ในแถบซ้าย
  jumpTo(y);
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

function joinGroup(){
  var input = document.getElementById("groupJoinInput");
  if (!input) return;
  var hash = groupHashFromInput(input.value);
  if (!hash){
    setFieldMsg("groupJoinMsg",L("ไม่ใช่ลิงก์กลุ่มของ FairDish ลองคัดลอกลิงก์จากเพื่อนมาใหม่ทั้งหมด"),true);
    return input.focus();
  }
  closeGlobalSheet();
  location.hash = hash;
}

async function forgetGroup(id){
  var g = myGroup(id);
  if (!g) return;
  ui.myGroups = ui.myGroups.filter(function(x){ return x.id !== id; });
  await saveMyGroups();
  // v4.15: เอากลุ่มที่เปิดอยู่ออก = เลิกเปิดด้วย ไม่งั้นลิงก์ "หารบิล" ในแถบซ้ายพากลับเข้ากลุ่ม แล้วกลุ่มกลับมาในรายการอีก
  if (ui.ctx === id){ ui.ctx = undefined; Store.groupId = null; Store.groupName = ""; updateChrome(); renderSideNav(); }
  refreshHistoryView();
  toast(L("เอา {name} ออกจากรายการแล้ว (กลุ่มยังอยู่ เปิดจากลิงก์ได้)", { name:g.name }),"ok");
}

/* ---- v2.4: ถาม "คุณคือใคร" ครั้งแรกที่เปิดกลุ่ม ---- */
function maybeAskWhoAmI(){
  if (!ui.ctx || ui.loading || ui.groupError) return;   // v4.9: กลุ่มว่างก็ถามเข้าร่วมได้
  var g = myGroup(ui.ctx);
  if (!g || g.me || g.asked) return;
  if (inAppPending()){ ui.meAfterInApp = true; return; }   // v4.14: หน้าต่างแนะนำเปิดในเบราว์เซอร์ขึ้นก่อน ปิดแล้วค่อยถาม
  g.asked = true;            // ถามครั้งเดียวต่อกลุ่มต่อเครื่อง กดข้ามก็ไม่ถามซ้ำ
  saveMyGroups();
  openMeDialog();             // v4.9: ชื่อตรงกับคนในกลุ่มก็ถามก่อน (ชื่อเล่นซ้ำกันได้) — ปุ่มหลักเป็น "ฉันคือ …"
}
function openMeDialog(){
  var box = document.getElementById("meDialog");
  if (!box || !ui.ctx) return;
  // v4.9: ถาม "เข้าร่วมกลุ่มไหม?" — ปุ่มหลักคือเข้าร่วมด้วยชื่อที่ให้เราเรียก (ยังไม่มีชื่อ = พิมพ์ตรงนี้) ชื่อที่มีอยู่แล้วเป็นทางเลือกรอง
  var trip = state.kind === "trip";
  if (myMemberId()){                   // เข้าร่วมแล้ว (กดเปลี่ยน "ฉันคือใคร" เอง) → เลือกชื่ออย่างเดียว
    box.innerHTML =
      '<div class="install-head"><div><h2 id="meTitle">'+(trip ? L("คุณคือใครในทริปนี้?") : L("คุณคือใครในโต๊ะนี้?"))+'</h2>'+
        '<p>'+L("เลือกชื่อตัวเอง แล้วยอดที่คุณต้องจ่ายจะแสดงตัวใหญ่ให้เห็นทันที (จำไว้ในเครื่องนี้)")+'</p></div>'+
        '<button class="icon-btn" data-me-close="1" aria-label="'+L("ปิด")+'">'+ICON_X+'</button></div>'+
      '<div class="pick me-pick">'+state.members.map(function(p){ return '<button data-me-pick="'+p.id+'">'+esc(p.name)+'</button>'; }).join("")+'</div>';
    if (typeof box.showModal === "function") box.showModal(); else box.setAttribute("open","");
    return;
  }
  box.innerHTML =
    '<div class="install-head"><div><h2 id="meTitle">'+L("เข้าร่วมกลุ่ม {name} ไหม?", { name:esc(Store.groupName || L("กลุ่ม")) })+'</h2>'+
      '<p>'+(trip ? L("เข้าร่วมแล้วใส่ค่าใช้จ่ายที่คุณจ่ายได้เลย และเห็นยอดของคุณตัวใหญ่ (จำไว้ในเครื่องนี้)")
                  : L("เข้าร่วมแล้วยอดที่คุณต้องจ่ายจะแสดงตัวใหญ่ให้เห็นทันที (จำไว้ในเครื่องนี้)"))+'</p></div>'+
      '<button class="icon-btn" data-me-close="1" aria-label="'+L("ปิด")+'">'+ICON_X+'</button></div>'+
    (ui.myName
      ? '<button class="btn-main btn-block" type="button" data-me-join="1">'+
          (myNameMemberId() ? L("ฉันคือ {name}", { name:esc(ui.myName) }) : L("เข้าร่วมในชื่อ {name}", { name:esc(ui.myName) }))+'</button>'
      : '<div class="form-box"><label class="sr-only" for="joinNameInput">'+L("ชื่อของคุณ")+'</label>'+
          '<input type="text" id="joinNameInput" maxlength="'+MAX_NAME+'" autocomplete="nickname" placeholder="'+L("เช่น มาร์ค")+'" aria-describedby="joinMsg">'+
          '<p class="field-msg muted" id="joinMsg" aria-live="polite"></p>'+
          '<button class="btn-main btn-block" type="button" data-me-join="1">'+L("เข้าร่วม")+'</button></div>')+
    (state.members.length
      ? '<p class="me-or">'+L("หรือคุณมีชื่ออยู่ในกลุ่มแล้ว")+'</p>'+
        '<div class="pick me-pick">'+state.members.map(function(p){
          return '<button data-me-pick="'+p.id+'">'+esc(p.name)+'</button>';
        }).join("")+'</div>'
      : '')+
    '<div class="me-other name-skip"><button class="me-skip" data-me-close="1">'+L("ไม่ใช่ตอนนี้")+'</button></div>';
  if (typeof box.showModal === "function") box.showModal(); else box.setAttribute("open","");
  var close = box.querySelector("[data-me-close]");    // v4.12: showModal โฟกัสช่องแรกเอง (แป้นพิมพ์เด้ง) — ย้ายไปปุ่มปิดแทน
  if (close) close.focus({ preventScroll:true });
}
/** v4.9: เข้าร่วมกลุ่ม (ชื่อเดิม joinGroup ชนกับฟังก์ชันวางลิงก์เข้ากลุ่ม — แก้ใน v4.11) = เพิ่มชื่อตัวเองเป็นสมาชิก + จำว่า "ฉันคือคนนี้" (ชื่อซ้ำกับที่มีอยู่ = เลือกคนนั้นแทน) */
async function joinAsMe(){
  var name = ui.myName;
  if (!name){
    var input = document.getElementById("joinNameInput");
    name = cleanMyName(input && input.value);
    var problem = myNameProblem(name);
    if (problem){
      var msg = document.getElementById("joinMsg");
      if (msg){ msg.className = "field-msg error"; msg.textContent = problem; }
      if (input){ input.setAttribute("aria-invalid","true"); input.focus(); }
      return;
    }
    await storeMyName(name);
  }
  var same = state.members.filter(function(p){ return normText(p.name) === normText(name); })[0];
  if (same) return chooseMe(same.id);
  closeMeDialog();
  var id = nid();
  state.members.push({ id:id, name:name });
  var g = myGroup(ui.ctx);
  if (g){ g.me = id; g.asked = true; saveMyGroups(); }
  render();
  await commit(L("เข้าร่วมกลุ่มแล้ว สวัสดี {name} 👋", { name:name }));
  render();
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
  if (input && !input.value && ui.myName) input.value = ui.myName;   // v4.6
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
/** QR + โลโก้เป็นรูป PNG (สีจากตัวแปร --qr-ink / --paper) */
async function qrImageBlob(){
  var link = inviteLink(ui.ctx), q = QR.encode(link);   // v4.11: ตรงกับ QR บนจอ (ทริป = ลิงก์บิลกลุ่ม ไม่ใช่ /me)
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

/* ---- v3.2: หน้าหลัก "บิลของฉัน" ---- */
/* ---- v4.10: การ์ดความคืบหน้าในหน้าหลัก = บิลในเครื่อง + บิลกลุ่มที่ยังไม่จบ
   บิลที่เสร็จแล้ว (โอนครบ) ขึ้นป้าย "เสร็จแล้ว" ให้เห็นครั้งเดียว — เปิดหน้าหลักครั้งต่อไป บิลในเครื่องเก็บเข้าประวัติ
   บิลกลุ่มลงไปอยู่ใน "บิลล่าสุด" (ui.doneShown กันไม่ให้หายไปตอนวาดซ้ำในการเปิดครั้งเดียวกัน) ---- */
var DONE_SEEN_KEY = "fairdish:done-seen:v1";   // savedAt ของบิลในเครื่องที่เห็นการ์ด "เสร็จแล้ว" ไปแล้ว
var HOME_GROUP_DAYS = 30, HOME_GROUP_MAX = 3;
function homeGroups(){
  var cut = Date.now() - HOME_GROUP_DAYS * 864e5;
  return ui.myGroups.filter(function(g){
    return g.snap && (g.at || 0) > cut && (!g.done || !g.doneSeen || ui.doneShown[g.id]);
  }).slice(0, HOME_GROUP_MAX);
}
/** ดึงข้อมูลล่าสุดของกลุ่มที่อาจขึ้นในหน้าหลัก แล้ววาดใหม่ถ้ามีอะไรเปลี่ยน */
async function refreshHomeGroups(){
  if (!Cloud.ready()) return;
  var cut = Date.now() - HOME_GROUP_DAYS * 864e5;
  var list = ui.myGroups.filter(function(g){ return (g.at || 0) > cut && !(g.done && g.doneSeen); }).slice(0, 5);
  var changed = false;
  await Promise.all(list.map(async function(g){
    try {
      var r = await Cloud.get(g.id);
      if (!r) return;
      var snap = r.data || {};
      if (JSON.stringify(snap) !== JSON.stringify(g.snap)){ g.snap = snap; changed = true; }
      if (r.name && r.name !== g.name){ g.name = r.name; changed = true; }
      var done = billDone(snap);
      if (done !== !!g.done){ g.done = done; changed = true; }
      if (!done) g.doneSeen = false;                 // มีคนเอาติ๊กออก = กลับมาเป็นกำลังหาร
    } catch(e){}
  }));
  if (!changed) return;
  await saveMyGroups();
  if (currentPath() === "/") fillHome(true);
}
/** again = วาดซ้ำในการเปิดหน้าหลักครั้งเดียวกัน (หลังดึงข้อมูลกลุ่ม) ไม่ดึงซ้ำ */
async function fillHome(again){
  if (!again) ui.doneShown = {};
  var saved = null;
  try { saved = await Store.loadLocalBill(); } catch(e){}
  if (currentPath() !== "/") return;
  var active = document.getElementById("homeActive");
  var recent = document.getElementById("homeRecent");
  var intro = document.getElementById("homeIntro");
  if (!active) return;
  var has = billHasData(saved);
  if (has && billDone(saved) && !ui.doneShown.local){
    var seen = null;
    try { seen = await Store.readRaw(DONE_SEEN_KEY); } catch(e){}
    if (seen && seen === saved.savedAt){
      try {                                                // เห็นครั้งที่สองแล้ว → เก็บเข้าประวัติ เริ่มบิลในเครื่องว่าง ๆ
        await archiveBill(saved);
        await Store.saveLocalBill(emptyBill(normalizeBill(saved).kind));
        if (ui.ctx === null) ui.ctx = undefined;          // ให้หน้าหารบิลโหลดบิลว่างใหม่ ไม่ใช้ของเก่าในหน่วยความจำ
        has = false; saved = null;
        renderSideNav();                                  // v4.15: แถบซ้ายไม่ค้างบิลที่เพิ่งเก็บเข้าประวัติ
      } catch(e){}
    } else {
      ui.doneShown.local = true;
      try { await Store.writeRaw(DONE_SEEN_KEY, saved.savedAt || "seen"); } catch(e){}
    }
  }
  if (currentPath() !== "/") return;
  var groups = homeGroups(), skip = {}, marked = false;
  if (has && groups.some(function(g){ return sameBillContent(saved, g.snap); })) has = false;   // v4.15: บิลเดียวกับบิลกลุ่ม ไม่ขึ้นซ้ำ
  // v4.15: การ์ดมากกว่าหนึ่งใบ = ป้าย "เปิดอยู่" บนบิลที่เปิดล่าสุด (ui.ctx: null = บิลในเครื่อง, id = กลุ่ม)
  var many = (has ? 1 : 0) + groups.length > 1;
  var openLocal = many && has && ui.ctx === null;
  function openGroup(g){ return many && ui.ctx === g.id; }
  groups.forEach(function(g){
    skip[g.id] = true;
    if (g.done && !g.doneSeen){ g.doneSeen = true; ui.doneShown[g.id] = true; marked = true; }
  });
  if (marked) saveMyGroups();
  if (!again) refreshHomeGroups();
  if (isWide()){                                        // v4.4: หน้าแรกจอใหญ่ (wide.js)
    active.innerHTML = (has ? activeCardWide(saved, null, openLocal) : "")+   // งาน 1.1: ไม่มีบิล = ไม่ใส่ emptyCardWide (ซ้ำกับ Hero)
      groups.map(function(g){ return activeCardWide(g.snap, { id:g.id, name:g.name }, openGroup(g)); }).join("");
    recent.innerHTML = recentCardsWide(skip);
    intro.innerHTML = "";
    return updateInstallButton();
  }
  active.innerHTML = (has ? activeBillHTML(saved, null, openLocal) : "")+
    groups.map(function(g){ return activeBillHTML(g.snap, { id:g.id, name:g.name }, openGroup(g)); }).join("");
  var items = recentItems(skip);
  recent.innerHTML = items.length
    ? '<div class="list-title"><h2>'+L("บิลล่าสุด")+'</h2><a class="link-btn" href="#/history">'+L("ดูทั้งหมด")+'</a></div>'+
      items.slice(0,3).map(function(x){ return x.html; }).join("")
    : "";
  intro.innerHTML = "";   // งาน 1.1: แนะนำแอปอยู่ในส่วน Hero ของหน้าแรกแล้ว (homeIntroHTML ไม่ใช้ที่หน้าหลัก)
  updateInstallButton();
}

/* ---- v4.1: ภาษา ---- */
async function setLang(lang){
  LANG = lang === "en" ? "en" : "th";
  try { await Store.writeRaw(LANG_KEY, LANG); } catch(e){}
  applyStaticText();
  var y = window.scrollY;
  route();
  jumpTo(y);
}

/* ---- v4.1: หน้าแนะนำ ---- */
/** tour = true: กด "เริ่มใช้งาน" → ต่อด้วยการสอนแบบกดจริง (v4.5) · "ข้าม" = ไม่สอน */
async function finishOnboard(tour){
  ui.showOnb = false; ui.onbStep = 0;
  try { await Store.writeRaw(ONBOARD_KEY, "done"); } catch(e){}
  // v4.6: ถามชื่อก่อน แล้วค่อยไปการสอน/หน้าที่ตั้งใจเปิด
  if (!ui.nameAsked) return askNameThen(function(){ afterOnboard(tour); });
  afterOnboard(tour);
}
/** tour: true = ไปการสอน, "demo" = เปิดบิลตัวอย่าง, อื่น ๆ = กลับหน้าที่ตั้งใจเปิด */
function afterOnboard(tour){
  if (tour === "demo") return startNewBill("meal", true);
  if (tour === true) return tourStart();
  var next = ui.onbNext;                 // v4.4.1: กลับไปหน้าที่ตั้งใจเปิดก่อนเห็นหน้าแนะนำ
  ui.onbNext = null;
  if (next && next !== "#/" && next !== location.hash){ location.hash = next; return; }
  if (currentPath() === "/") route(); else location.hash = "#/";
}
function onboardNext(){
  if ((ui.onbStep || 0) >= 2) return finishOnboard(true);
  ui.onbStep = (ui.onbStep || 0) + 1;
  document.getElementById("view").innerHTML = pageOnboard();
}
function onboardAgain(){
  ui.showOnb = true; ui.onbStep = 0;
  if (currentPath() === "/") route(); else location.hash = "#/";
}

/* ---- v3.2: เริ่มบิลใหม่ (เลือกประเภทครั้งเดียว) + ประวัติบิล ---- */
function emptyBill(kind){
  return { members:[], menus:[], shared:[], charges:defaultCharges(), payers:[], kind:kind, name:defaultBillName(kind), paid:{},
           savedAt:new Date().toISOString() };
}
/** v4.15: อ่านประวัติล่าสุดจากเครื่องก่อนแก้ — แอปที่เปิดไว้อีกแท็บอาจแก้ไปแล้ว (เดิมแท็บเก่าบันทึกทับ บิลที่ลบไปกลับมาอีก) */
async function reloadHistory(){
  try { ui.history = await Store.loadHistory(); } catch(e){}
}
/** เก็บบิลส่วนตัวเข้าประวัติ (ใหม่สุดก่อน) */
async function archiveBill(saved){
  await reloadHistory();
  var b = normalizeBill(saved);
  var entry = { id:"h"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), name:savedBillName(saved),
                kind:b.kind, at:Date.now(), data:saved };
  ui.history.unshift(entry);
  if (ui.history.length > HISTORY_LIMIT) ui.history = ui.history.slice(0, HISTORY_LIMIT);
  await Store.saveHistory(ui.history);
  return entry;
}
/** ใส่บิลนี้เป็นบิลส่วนตัวในเครื่อง แล้วเปิดหน้าหารบิล — บิลเดิมที่มีข้อมูลถูกเก็บเข้าประวัติก่อน */
async function replaceLocalBill(next, step){
  var saved = null;
  try { saved = await Store.loadLocalBill(); } catch(e){}
  var archived = billHasData(saved) ? await archiveBill(saved) : null;
  await Store.saveLocalBill(next);
  if (ui.tripStash) exitMeal();
  ui.step = step || "members";
  ui.showDone = false;
  state.menuForm = null; state.sharedForm = null; state.chargeForm = null;
  if (ui.ctx === null && !ui.loading) applyBill(next);   // บิลส่วนตัวเปิดอยู่แล้ว ใส่ข้อมูลใหม่ได้เลย
  else ui.ctx = undefined;                               // ให้ route() โหลดบิลส่วนตัวใหม่
  var dest = step === "summary" ? "#/bill" : "#/split";   // v4.12: เปิดบิลจากประวัติ = ดูใบสรุปยอด
  if (location.hash === dest) route(); else location.hash = dest;
  return archived;
}
/** v4.12: ทริป / ทริปแบบกลุ่ม — ตั้งชื่อได้ก่อนเริ่ม (ไม่บังคับ ว่างไว้ = ชื่อตั้งต้น "ทริป 5 ต.ค.") */
function openTripNameSheet(kind){
  if (ui.tour) return startNewBill(kind);
  ui.sheet = "tripname";
  var def = defaultBillName("trip");
  renderGlobalSheet('<h2 class="sheet-title" id="tripNameTitle">'+(kind === "trip-group" ? L("ตั้งชื่อทริปแบบกลุ่ม") : L("ตั้งชื่อทริป"))+'</h2>'+
    '<p class="sheet-sub">'+L("ไม่บังคับ — ไม่ตั้งก็ใช้ชื่อ {name}", { name:esc(def) })+'</p>'+
    '<div class="form-box">'+
      '<label class="sr-only" for="tripNameInput">'+L("ชื่อทริป")+'</label>'+
      '<input type="text" id="tripNameInput" maxlength="'+MAX_GROUP_NAME+'" autocomplete="off" placeholder="'+L("เช่น เชียงใหม่ 3 วัน 2 คืน")+'">'+
      '<div class="form-actions"><button class="btn-quiet" type="button" data-close-global="1">'+L("ยกเลิก")+'</button>'+
      '<button class="btn-sm" type="button" data-trip-go="'+kind+'">'+(kind === "trip-group" ? L("สร้างกลุ่มทริป") : L("เริ่มทริป"))+'</button></div>'+
    '</div>', "tripNameTitle");
}
function goTripFromSheet(kind){
  var input = document.getElementById("tripNameInput");
  var name = input ? input.value.trim().replace(/\s+/g, " ").slice(0, MAX_GROUP_NAME) : "";
  startNewBill(kind, false, name);
}
async function startNewBill(kind, demo, name){
  closeGlobalSheet();
  if (ui.tour) tourEnd(false);         // v4.5: เริ่มบิลจริงระหว่างสอน = จบการสอน (บิลฝึกทิ้งไป)
  var group = kind === "trip-group";    // v4.8: ทริปแบบกลุ่ม = เริ่มทริปว่างแล้วสร้างกลุ่มทันที
  kind = (kind === "trip" || group) ? "trip" : "meal";
  try {
    var fresh = emptyBill(kind);
    if (name) fresh.name = name;          // v4.12: ชื่อที่ตั้งตอนเริ่ม (บิลกลุ่มใช้เป็นชื่อกลุ่ม)
    var archived = await replaceLocalBill(fresh, "members");
    if (demo) return loadDemo();
    if (group){
      if (ui.ctx === null && !ui.loading) inviteFromBill(); else ui.inviteAfterLoad = true;   // ยังโหลดอยู่ → refreshView สร้างต่อ
      return;
    }
    toast(archived ? L("เก็บ {name} เข้าประวัติแล้ว เริ่ม{kind}ใหม่", { name:archived.name, kind:ktOf(kind,"name") }) : L("เริ่ม{kind}ใหม่แล้ว", { kind:ktOf(kind,"name") }),"ok");
  } catch(err){
    toast(L("เริ่มบิลใหม่ไม่สำเร็จ บิลเดิมยังอยู่ครบ"),"error");
  }
}
/** step: "summary" (ค่าเริ่มต้น) = เปิดที่ใบสรุปยอด · "members" = เปิดที่หน้าหารบิล (v4.15 แถบซ้าย) */
async function restoreHistory(id, step){
  if (ui.tour) tourEnd(false);
  await reloadHistory();
  var h = ui.history.filter(function(x){ return x.id === id; })[0];
  if (!h) return;
  try {
    ui.history = ui.history.filter(function(x){ return x.id !== id; });
    await Store.saveHistory(ui.history);
    var archived = await replaceLocalBill(h.data, step || "summary");
    toast(archived ? L("เปิด {name} แล้ว (บิลที่ทำค้างไว้ย้ายเข้าประวัติ)", { name:h.name }) : L("เปิด {name} แล้ว", { name:h.name }),"ok");
  } catch(err){
    toast(L("เปิดบิลไม่สำเร็จ ลองอีกครั้ง"),"error");
  }
}
/** v4.15: วาดหน้าประวัติใหม่หลังลบ/เอาคืน — จอใหญ่ต้องเติมรายการด้วย renderHistoryWide() ด้วย
 *  (เดิมใส่แค่โครงหน้า รายการจึงหายหมด และลบจากหน้า #/history ที่เปิดอยู่แล้วหน้าไม่เปลี่ยน รายการที่ลบยังค้างอยู่) */
function refreshHistoryView(){
  var path = currentPath();
  if (path !== "/history" && path !== "/groups" && path !== "/h") return;
  var y = window.scrollY;
  document.getElementById("view").innerHTML = path === "/h" ? pagePast() : pageHistory();
  if (isWide()) renderHistoryWide();
  jumpTo(y);
}
async function deleteHistory(id){
  await reloadHistory();
  var index = -1;
  ui.history.forEach(function(x,i){ if (x.id === id) index = i; });
  if (index < 0) return;
  var h = ui.history[index];
  ui.history.splice(index, 1);
  try { await Store.saveHistory(ui.history); } catch(e){}
  if (ui.histSel === id) ui.histSel = null;
  if (location.hash === "#/history") refreshHistoryView(); else location.hash = "#/history";
  // v4.15: ปุ่มในแจ้งเตือนเขียนว่า "เอาคืน" — คำว่า Undo ดูเหมือนปุ่มยกเลิกการลบ คนอ่านแล้วงง
  toast(L("ลบ {name} ออกจากประวัติแล้ว", { name:h.name }),"ok",{ label:L("เอาคืน"), action:async function(){
    await reloadHistory();
    if (ui.history.some(function(x){ return x.id === h.id; })) return;
    ui.history.splice(Math.min(index, ui.history.length), 0, h);
    try { await Store.saveHistory(ui.history); } catch(e){}
    ui.histSel = h.id;
    refreshHistoryView();
  }});
}

/* ---- v3.2: แผ่นล่างจอ เลือกประเภทบิล / ตั้งชื่อบิล ---- */
async function openKindSheet(){
  var saved = null;
  try { saved = await Store.loadLocalBill(); } catch(e){}
  var note = billHasData(saved)
    ? L("บิลที่ทำค้างไว้ {name} จะถูกเก็บในประวัติ ไม่หาย", { name:'<b>'+esc(savedBillName(saved))+'</b>' })
    : L("บันทึกในเครื่องให้อัตโนมัติ ไม่ต้องสมัครสมาชิก");
  function card(kind, cls){
    return '<button class="kind-card '+cls+'" type="button" data-new-kind="'+kind+'">'+
      '<span class="kind-ico" aria-hidden="true">'+ktOf(kind,"icon")+'</span>'+
      '<span class="kind-text"><b>'+ktOf(kind,"name")+'</b><span>'+ktOf(kind,"kindSub")+'</span></span></button>';
  }
  ui.sheet = "kind";
  renderGlobalSheet('<div class="sheet-head-row"><h2 class="sheet-title" id="kindTitle">'+L("วันนี้หารอะไร")+'</h2>'+
      // v4.11: เข้ากลุ่มของเพื่อนด้วย QR / ลิงก์ (ข้างหัวข้อ)
      (Cloud.ready() ? '<button class="link-btn scan-link" type="button" data-open-join="1">'+
        (canUseCamera() ? ICON_SCAN+' '+L("สแกนเข้ากลุ่ม") : ICON_USERS+' '+L("เข้ากลุ่มด้วยลิงก์"))+'</button>' : '')+'</div>'+
    '<p class="sheet-sub">'+L("เลือกครั้งเดียวตอนเริ่ม")+'</p>'+
    '<div class="kind-grid">'+card("meal","meal")+card("trip","trip")+tripGroupCard()+'</div>'+
    '<p class="sheet-note">'+note+'</p>', "kindTitle");
  var first = document.querySelector("[data-new-kind]");
  if (first) first.focus({ preventScroll:true });
}
/* ---- v4.15: ลบบิลที่กำลังหาร (บิลในเครื่อง) จากหน้าประวัติ — ถามยืนยันก่อน ลบแล้วกด "เอาคืน" ได้ ---- */
async function openDeleteLocalSheet(){
  var saved = null;
  try { saved = await Store.loadLocalBill(); } catch(e){}
  if (!billHasData(saved)) return;
  ui.sheet = "dellocal";
  renderGlobalSheet('<h2 class="sheet-title" id="delLocalTitle">'+L("ลบบิล {name} ไหม?", { name:esc(savedBillName(saved)) })+'</h2>'+
    '<p class="sheet-sub">'+L("บิลนี้กำลังหารอยู่และยังไม่ได้เก็บเข้าประวัติ ลบแล้วคนและรายการทั้งหมดในบิลนี้จะหายไป")+'</p>'+
    '<div class="form-actions"><button class="btn-quiet" type="button" data-close-global="1">'+L("ยกเลิก")+'</button>'+
    '<button class="btn-danger" type="button" data-del-local-ok="1">'+ICON_DEL+' '+L("ลบบิล")+'</button></div>', "delLocalTitle");
}
async function deleteLocalBill(){
  closeGlobalSheet();
  var saved = null;
  try { saved = await Store.loadLocalBill(); } catch(e){}
  if (!billHasData(saved)) return;
  var put = async function(data){
    await Store.saveLocalBill(data);
    if (ui.ctx === null && !ui.loading) applyBill(data);   // บิลในเครื่องเปิดอยู่ในหน่วยความจำ — ใส่ข้อมูลใหม่ด้วย
    refreshHistoryView();
    renderSideNav();
    if (currentPath() === "/") fillHome(true);
  };
  try { await put(emptyBill(normalizeBill(saved).kind)); }
  catch(e){ return toast(L("ลบบิลไม่สำเร็จ ลองอีกครั้ง"),"error"); }
  ui.histSel = null;
  refreshHistoryView();
  toast(L("ลบ {name} แล้ว", { name:savedBillName(saved) }),"ok",{ label:L("เอาคืน"), action:function(){ put(saved).catch(function(){}); } });
}

/* ---- v4.11: ยุบกลุ่ม (คนสร้างเท่านั้น) — เก็บสำเนาไว้ในประวัติของเราก่อน แล้วลบบนเซิร์ฟเวอร์ ---- */
function canDissolve(){ var g = ui.ctx && myGroup(ui.ctx); return !!(g && g.owner && Cloud.ready() && !ui.loading); }
function openDissolveSheet(){
  if (!canDissolve()) return;
  closeShareDialog();
  ui.sheet = "dissolve";
  renderGlobalSheet('<h2 class="sheet-title" id="dissolveTitle">'+L("ยุบกลุ่ม {name}?", { name:esc(Store.groupName) })+'</h2>'+
    '<p class="sheet-sub">'+L("บิลกลุ่มจะถูกลบออกจากเซิร์ฟเวอร์ถาวร เพื่อนที่มีลิงก์จะเปิดไม่ได้อีก — เราเก็บสำเนาไว้ในประวัติของคุณให้")+'</p>'+
    '<div class="form-actions"><button class="btn-quiet" type="button" data-close-global="1">'+L("ยกเลิก")+'</button>'+
    '<button class="btn-danger" type="button" data-dissolve-ok="1">'+L("ยุบกลุ่ม")+'</button></div>', "dissolveTitle");
}
async function dissolveGroup(){
  var id = ui.ctx, g = myGroup(id);
  if (!canDissolve() || ui.dissolving) return;
  ui.dissolving = true;
  try {
    var res = await Cloud.remove(id, g.owner);
    if (!res || !res.ok){ toast(L("ยุบกลุ่มไม่สำเร็จ (กลุ่มอาจถูกลบไปแล้ว)"),"error"); return; }
    var data = serialize(); data.name = Store.groupName;
    try { await archiveBill(data); } catch(e){}
    ui.myGroups = ui.myGroups.filter(function(x){ return x.id !== id; });
    await saveMyGroups();
    closeGlobalSheet();
    ui.ctx = undefined; Store.groupId = null;
    location.hash = "#/";
    toast(L("ยุบกลุ่มแล้ว เก็บสำเนาไว้ในประวัติของคุณ"),"ok");
  } catch(e){
    toast(L("ยุบกลุ่มไม่ได้ — ตรวจอินเทอร์เน็ต หรือเซิร์ฟเวอร์ยังไม่รองรับ"),"error");
  } finally {
    ui.dissolving = false;
  }
}

/* ---- v4.11: เข้ากลุ่มของเพื่อน — สแกน QR ในแอป (เบราว์เซอร์ที่มี BarcodeDetector) หรือวางลิงก์/รหัส ---- */
var ICON_SCAN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/></svg>';
var scanStream = null, scanTimer = null;
/** v4.12: เครื่องนี้มีกล้องไหม (PC ส่วนใหญ่ไม่มี → ไม่มีระบบสแกน มีแค่วางลิงก์) — ui.camera: null ยังไม่รู้ / true / false */
async function detectCamera(){
  try {
    if (!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)){ ui.camera = false; return; }
    var list = await navigator.mediaDevices.enumerateDevices();
    ui.camera = list.some(function(d){ return d.kind === "videoinput"; });
  } catch(e){ ui.camera = false; }
}
function canUseCamera(){ return ui.camera !== false && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
/** ปุ่ม "สแกนเข้ากลุ่ม": มีกล้อง = หน้าต่างสแกน · ไม่มีกล้อง (PC) = แผ่นวางลิงก์ */
function openJoin(){ return canUseCamera() ? openScanDialog() : openJoinSheet(); }
/** แผ่นวางลิงก์/รหัสกลุ่ม */
function openJoinSheet(){
  closeScanDialog();
  ui.sheet = "join";
  renderGlobalSheet('<h2 class="sheet-title" id="joinTitle">'+L("เข้ากลุ่มของเพื่อน")+'</h2>'+
    '<p class="sheet-sub">'+L("วางลิงก์ที่เพื่อนส่งมา")+'</p>'+
    '<div class="form-box">'+
      '<label class="sr-only" for="groupJoinInput">'+L("ลิงก์หรือรหัสกลุ่ม")+'</label>'+
      '<input type="text" id="groupJoinInput" placeholder="'+L("วางลิงก์หรือรหัสกลุ่ม")+'" autocomplete="off" aria-describedby="groupJoinMsg">'+
      '<p class="field-msg muted" id="groupJoinMsg" aria-live="polite"></p>'+
      '<div class="form-actions"><button class="btn-quiet" type="button" data-close-global="1">'+L("ยกเลิก")+'</button>'+
      '<button class="btn-sm" type="button" id="groupJoin">'+L("เข้ากลุ่ม")+'</button></div>'+
    '</div>', "joinTitle");
}

/* ---- v4.13: หน้าต่างสแกน QR — กล้องหลัง + กรอบสแกน ใช้ได้ทุกมือถือ
   ตัวอ่าน: BarcodeDetector ของเบราว์เซอร์ (ถ้ามี) ไม่งั้นโหลด jsQR (js/vendor/jsQR.js) ตอนเปิดกล้องครั้งแรก ---- */
function openScanDialog(){
  closeGlobalSheet();
  var box = document.getElementById("scanDialog");
  if (!box) return openJoinSheet();
  box.innerHTML =
    '<div class="install-head"><div><h2 id="scanTitle">'+L("สแกนเข้ากลุ่ม")+'</h2>'+
      '<p>'+L("ส่องกล้องไปที่ QR บนเครื่องเพื่อน แล้วรอสักครู่")+'</p></div>'+
      '<button class="icon-btn" type="button" data-scan-close="1" aria-label="'+L("ปิด")+'">'+ICON_X+'</button></div>'+
    '<div class="scan-view">'+
      '<video id="scanVideo" playsinline muted autoplay aria-label="'+L("กล้องสแกน QR")+'"></video>'+
      '<div class="scan-frame" aria-hidden="true"><i class="sc tl"></i><i class="sc tr"></i><i class="sc bl"></i><i class="sc br"></i><i class="scan-line"></i></div>'+
    '</div>'+
    '<p class="field-msg muted scan-msg" id="scanMsg" aria-live="polite">'+L("กำลังเปิดกล้อง…")+'</p>'+
    '<button class="link-btn center scan-paste" type="button" data-scan-paste="1">'+L("สแกนไม่ได้? วางลิงก์แทน")+'</button>';
  if (typeof box.showModal === "function") box.showModal(); else box.setAttribute("open","");
  startScan();
}
function closeScanDialog(){
  stopScan();
  var box = document.getElementById("scanDialog");
  if (!box || !box.open) return;
  if (typeof box.close === "function") box.close(); else box.removeAttribute("open");
}
function loadScriptOnce(src){
  return new Promise(function(ok, fail){
    if (document.querySelector('script[data-src="'+src+'"]')) return ok();
    var s = document.createElement("script");
    s.src = src; s.setAttribute("data-src", src);
    s.onload = function(){ ok(); }; s.onerror = function(){ s.remove(); fail(new Error("load " + src)); };
    document.head.appendChild(s);
  });
}
/** ฟังก์ชันอ่าน QR จากวิดีโอ → Promise<[ข้อความ]> */
async function qrReader(){
  if (typeof window.BarcodeDetector === "function"){
    try {
      var det = new window.BarcodeDetector({ formats:["qr_code"] });
      return function(v){ return det.detect(v).then(function(cs){ return cs.map(function(c){ return c.rawValue; }); }); };
    } catch(e){}
  }
  if (typeof window.jsQR !== "function") await loadScriptOnce("js/vendor/jsQR.js");
  var c = document.createElement("canvas"), ctx = c.getContext("2d", { willReadFrequently:true });
  return function(v){
    var w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return Promise.resolve([]);
    var k = Math.min(1, 640 / Math.max(w, h));            // ย่อภาพก่อนอ่าน เร็วขึ้นมากบนมือถือ
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    var r = window.jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts:"dontInvert" });
    return Promise.resolve(r && r.data ? [r.data] : []);
  };
}
async function startScan(){
  var msg = function(t, bad){ var el = document.getElementById("scanMsg"); if (el){ el.textContent = t; el.className = "field-msg scan-msg " + (bad ? "error" : "muted"); } };
  var open = function(){ var b = document.getElementById("scanDialog"); return !!(b && b.open && document.getElementById("scanVideo")); };
  stopScan();
  try {
    var stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:"environment" } }, audio:false });   // กล้องหลัง
    if (!open()){ stream.getTracks().forEach(function(t){ t.stop(); }); return; }        // ปิดหน้าต่างไปก่อนกล้องเปิดเสร็จ
    scanStream = stream;
    var v = document.getElementById("scanVideo");
    v.srcObject = stream;
    await v.play();
    var read = await qrReader();
    if (!scanStream) return;
    msg(L("ส่องกล้องไปที่ QR ของเพื่อน"));
    var tick = async function(){
      if (!scanStream || !open()) return stopScan();
      try {
        var texts = await read(document.getElementById("scanVideo"));
        for (var i = 0; i < texts.length; i++){
          var hash = groupHashFromInput(texts[i]);
          if (hash){
            if (navigator.vibrate) try { navigator.vibrate(60); } catch(e){}
            closeScanDialog(); location.hash = hash; return;
          }
        }
        if (texts.length) msg(L("QR นี้ไม่ใช่ลิงก์กลุ่มของ FairDish"), true);
      } catch(e){}
      scanTimer = setTimeout(tick, 200);
    };
    tick();
  } catch(e){
    stopScan();
    msg(e && e.name === "NotAllowedError" ? L("ไม่ได้รับอนุญาตให้ใช้กล้อง — เปิดสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์ หรือวางลิงก์แทน")
                                          : L("เปิดกล้องไม่ได้ — วางลิงก์ด้านล่างแทน หรือใช้แอปกล้องของมือถือสแกน"), true);
  }
}
function stopScan(){
  clearTimeout(scanTimer); scanTimer = null;
  if (scanStream){ scanStream.getTracks().forEach(function(t){ t.stop(); }); scanStream = null; }
}

/** v4.8: ทริปแบบกลุ่ม — สร้างกลุ่มก่อน ชวนเพื่อนเข้ามา แล้วทุกคนใส่ค่าใช้จ่ายเองได้ตลอดทริป */
function tripGroupCard(){
  if (!Cloud.ready()) return "";
  return '<button class="kind-card trip trip-group" type="button" data-new-kind="trip-group">'+
    '<span class="kind-ico" aria-hidden="true">👥</span>'+
    '<span class="kind-text"><b>'+L("ทริปแบบกลุ่ม")+'</b><span>'+L("สร้างกลุ่มก่อน ส่ง QR ให้เพื่อนเข้ามา ทุกคนใส่ค่าใช้จ่ายที่ตัวเองจ่ายได้ตลอดทริป")+'</span></span></button>';
}
function openRenameSheet(){
  if (ui.ctx || ui.loading) return;
  ui.sheet = "rename";
  renderGlobalSheet('<h2 class="sheet-title" id="renameTitle">'+L("ชื่อบิล")+'</h2>'+
    '<div class="form-box">'+
      '<label class="sr-only" for="billNameInput">'+L("ชื่อบิล")+'</label>'+
      '<input type="text" id="billNameInput" value="'+esc(billName())+'" maxlength="'+MAX_MENU_NAME+'" autocomplete="off" placeholder="'+L("เช่น ร้านส้มตำหน้ามอ")+'">'+
      '<div class="form-actions"><button class="btn-quiet" type="button" data-close-global="1">'+L("ยกเลิก")+'</button>'+
      '<button class="btn-sm" type="button" id="billNameSave">'+L("บันทึก")+'</button></div>'+
    '</div>', "renameTitle");
  var input = document.getElementById("billNameInput");
  if (input){ input.focus(); input.select(); }
}
function renderGlobalSheet(body, labelId){
  var slot = document.getElementById("globalSheet");
  slot.innerHTML = '<div class="sheet-wrap"><div class="sheet-backdrop" data-close-global="1"></div>'+
    '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="'+labelId+'"><i class="sheet-grip" aria-hidden="true"></i>'+body+'</div></div>';
  syncSheetLock();
}
function closeGlobalSheet(){
  stopScan();
  ui.sheet = null;
  var slot = document.getElementById("globalSheet");
  if (slot) slot.innerHTML = "";
  syncSheetLock();
}
async function saveBillName(){
  var input = document.getElementById("billNameInput");
  if (!input) return;
  var name = input.value.trim().replace(/\s+/g," ").slice(0, MAX_MENU_NAME);
  closeGlobalSheet();
  if (!name || name === billName()) return;
  state.name = name;
  renderAppBarSub();
  await commit(L("เปลี่ยนชื่อบิลเป็น {name} แล้ว", { name:name }));
}

/* ---- v3.2: ติ๊กว่าโอนแล้ว ---- */
async function togglePaid(key){
  var r = compute(), s = settleBill(r);
  if (!s.ok) return;
  var keys = s.transfers.map(transferKey);
  if (keys.indexOf(key) < 0) return;
  var next = {};
  keys.forEach(function(k){ if (state.paid[k] && k !== key) next[k] = true; });   // ล้างติ๊กของการโอนที่ไม่มีแล้ว
  if (!state.paid[key]) next[key] = true;
  state.paid = next;
  var prog = paidProgress(s.transfers, state.paid);
  if (prog.all && next[key]){
    ui.showDone = true;
    if (currentPath() !== "/bill") location.hash = billHref();
    else { document.getElementById("view").innerHTML = pageBill(); renderSideNav(); jumpTo(0); }   // v4.15: บิลจบแล้วออกจากแถบซ้ายทันที
  } else rerenderBill();
  await commit();
}

/** v4.15: ติ๊กว่าโอนครบทุกคนในครั้งเดียว (ติ๊กครบอยู่แล้ว = เอาติ๊กออกทั้งหมด) */
async function togglePaidAll(){
  var s = settleBill(compute());
  if (!s.ok || !s.transfers.length) return;
  var all = paidProgress(s.transfers, state.paid).all, next = {};
  if (!all) s.transfers.forEach(function(t){ next[transferKey(t)] = true; });
  state.paid = next;
  if (!all && (currentPath() === "/bill" || currentPath() === "/split")){
    ui.showDone = true;
    if (currentPath() !== "/bill") location.hash = billHref();
    else { document.getElementById("view").innerHTML = pageBill(); renderSideNav(); jumpTo(0); }
  } else if (currentPath() === "/history" || currentPath() === "/h"){ refreshHistoryView(); renderSideNav(); }
  else rerenderBill();
  await commit(all ? L("เอาติ๊กออกทั้งหมดแล้ว") : null);
}
/** v4.15: ติ๊กโอนครบ / เอาติ๊กออกทั้งหมด ของบิลในประวัติ (ไม่ต้องเปิดบิลกลับมาก่อน) */
async function togglePaidAllHistory(id){
  await reloadHistory();
  var h = ui.history.filter(function(x){ return x.id === id; })[0];
  if (!h) return;
  var b = normalizeBill(h.data), s = settleBill(computeBill(b), b);
  if (!s.ok || !s.transfers.length) return;
  var all = paidProgress(s.transfers, b.paid).all, next = {};
  if (!all) s.transfers.forEach(function(t){ next[transferKey(t)] = true; });
  var data = {};
  Object.keys(h.data).forEach(function(k){ data[k] = h.data[k]; });
  data.paid = next;
  h.data = data;
  try { await Store.saveHistory(ui.history); } catch(e){ return toast(L("บันทึกไม่สำเร็จ ข้อมูลบนหน้าจอยังอยู่ครบ"),"error"); }
  refreshHistoryView();
  renderSideNav();                                     // บิลที่โอนครบแล้วออกจากแถบซ้าย
  toast(all ? L("เอาติ๊กออกทั้งหมดแล้ว") : L("ติ๊ก {name} ว่าโอนครบทุกคนแล้ว 🎉", { name:h.name }),"ok");
}
/* ---- v3.2: ชวนเพื่อนเข้ากลุ่มจากบิลส่วนตัว = ย้ายบิลนี้ขึ้นกลุ่ม ---- */
/** hostName: ชื่อคนสร้างกลุ่ม ("" = ไม่ใส่) · ไม่ส่งมา = ใช้ชื่อที่ให้เราเรียก ยังไม่มีชื่อ = ถามก่อนสร้าง */
async function inviteFromBill(hostName){
  if (ui.tour) return toast(L("ตอนฝึกยังชวนเพื่อนไม่ได้ — จบการสอนแล้วลองกับบิลจริงได้เลย"),"error");
  if (ui.ctx || !Cloud.ready() || ui.creatingGroup) return;
  // v4.7: คนสร้างกลุ่ม = คนเปิด QR ให้เพื่อนสแกน → ใส่ชื่อตัวเองในบิลกลุ่มให้เลย และจำว่า "ฉันคือคนนี้"
  if (typeof hostName !== "string"){
    if (!ui.myName) return openHostSheet();
    hostName = ui.myName;
  }
  var btn = document.getElementById("inviteBtn");
  var label = btn ? btn.innerHTML : "";
  var data = serialize();
  var meId = null;
  if (hostName){
    var mine = data.members.filter(function(p){ return normText(p.name) === normText(hostName); })[0];
    if (mine) meId = mine.id;
    else { meId = nid(); data.members = [{ id:meId, name:hostName }].concat(data.members); }   // ไม่แตะ state จนกว่าจะสร้างกลุ่มสำเร็จ
  }
  var name = billName().slice(0, MAX_GROUP_NAME);
  ui.creatingGroup = true;
  if (btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>'+L("กำลังสร้างกลุ่ม"); }
  try {
    var g = await Cloud.create(name, data);
    await rememberGroup(g.id, g.name, data.kind);
    var mg = myGroup(g.id);                          // คนสร้างไม่ต้องถูกถาม "เข้าร่วมกลุ่มไหม?" (ไม่งั้นซ้อนกับหน้าต่างชวนเพื่อน)
    if (mg){ if (meId) mg.me = meId; mg.asked = true; if (g.owner) mg.owner = g.owner; await saveMyGroups(); }   // owner = กุญแจยุบกลุ่ม (v4.11)
    // บิลอยู่บนกลุ่มแล้ว บิลส่วนตัวในเครื่องเริ่มใหม่ว่าง ๆ (ไม่ให้มีสองที่ที่ต้องแก้)
    try { await Store.saveLocalBill(emptyBill(data.kind)); } catch(e){}
    ui.shareAfterLoad = true;
    // v4.11: อยู่หน้าเดิม (หารบิล / ใบสรุปยอด) ของกลุ่มใหม่ แล้วเปิดหน้าต่างชวนเพื่อน (refreshView)
    location.hash = "#/g/" + g.id + (currentPath() === "/bill" ? "/bill" : "");
  } catch(err){
    toast(L("สร้างกลุ่มไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"),"error");
    var again = document.getElementById("inviteBtn");
    if (again){ again.disabled = false; again.innerHTML = label || ICON_USERS+' '+inviteLabel(); }
  } finally {
    ui.creatingGroup = false;
  }
}

/** v4.7: ยังไม่มีชื่อที่ให้เราเรียก → ถามชื่อคนสร้างกลุ่มก่อน (ปุ่ม "สร้างกลุ่ม" อยู่ในแผ่นนี้) */
function openHostSheet(){
  ui.sheet = "host";
  renderGlobalSheet('<h2 class="sheet-title" id="hostTitle">'+L("คุณชื่ออะไรในกลุ่มนี้?")+'</h2>'+
    '<p class="hint">'+L("คนสร้างกลุ่มคือคนเปิด QR ให้เพื่อนสแกน เราจะใส่ชื่อคุณในบิลให้เลย และจำชื่อนี้ไว้ใช้ครั้งต่อไป")+'</p>'+
    '<div class="form-box">'+
      '<label class="sr-only" for="hostNameInput">'+L("ชื่อของคุณ")+'</label>'+
      '<input type="text" id="hostNameInput" maxlength="'+MAX_NAME+'" autocomplete="nickname" placeholder="'+L("เช่น มาร์ค")+'" aria-describedby="hostNameMsg">'+
      '<p class="field-msg muted" id="hostNameMsg" aria-live="polite"></p>'+
      '<div class="form-actions"><button class="btn-quiet" type="button" data-host-skip="1">'+L("ไม่ใส่ชื่อฉัน")+'</button>'+
      '<button class="btn-sm" type="button" data-host-save="1">'+L("สร้างกลุ่ม")+'</button></div>'+
    '</div>', "hostTitle");
  var input = document.getElementById("hostNameInput");
  if (input) input.focus();
}
async function saveHostSheet(){
  var input = document.getElementById("hostNameInput");
  if (!input) return;
  var name = cleanMyName(input.value), problem = myNameProblem(name);
  if (problem){
    var msg = document.getElementById("hostNameMsg");
    msg.className = "field-msg error"; msg.textContent = problem;
    input.setAttribute("aria-invalid","true"); input.focus();
    return;
  }
  closeGlobalSheet();
  await storeMyName(name);
  inviteFromBill(name);
}
function skipHostSheet(){
  closeGlobalSheet();
  inviteFromBill("");
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
  jumpTo(0);
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
  jumpTo(0);
}
async function addMeal(){
  var n = state.menus.filter(function(m){ return m.type === "meal"; }).length + 1;
  var item = { id:nid(), type:"meal", name:L("มื้อที่ {n}", { n:n }), price:0, eaters:[],
               meal:{ menus:[], shared:[], charges:defaultCharges() } };
  setPayersOf(item, defaultPayers());
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
/** v4.15: แตะชื่อ = เพิ่ม/เอาออกจากคนจ่ายมื้อนี้ (จ่ายด้วยกันหลายคนได้) */
async function setMealPayer(id){
  var item = currentMeal();
  if (!item || !nameOf(id)) return;
  setPayersOf(item, togglePayerIn(knownPayers(item), id));
  if (knownPayers(item).length) ui.lastPayers = knownPayers(item);
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

/* ---- v2.1: ธีม ---- */
/** v4.5.3: "system" | "dark" | "light" — ยังไม่เคยเลือก (ไม่มีค่า) = สว่าง */
function applyTheme(theme){
  ui.theme = (theme === "dark" || theme === "system") ? theme : "light";
  var root = document.documentElement;
  if (ui.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", ui.theme);
  var dark = ui.theme === "dark" || (ui.theme === "system" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  var meta = document.getElementById("themeColor");
  if (meta) meta.setAttribute("content", dark ? "#1A1426" : "#FFF6DF");
}
async function setTheme(theme){
  applyTheme(theme);
  try { await Store.writeRaw(Store.themeKey, ui.theme); } catch(e){}
  if (currentPath()==="/more") document.getElementById("view").innerHTML = pageMore();
}

async function loadDemo(){
  if (state.kind === "trip") return loadTripDemo();
  state.members=[]; state.menus=[]; state.shared=[];
  [L("มาร์ค"),L("พูม"),L("ไอซ์"),L("ชาเน่"),L("โม"),L("ยูกะ"),L("โฟรค์"),L("เจ้าสัว")].forEach(function(n){
    state.members.push({ id:nid(), name:n });
  });
  function ids(){
    return Array.prototype.slice.call(arguments).map(function(n){
      var f = state.members.filter(function(m){ return m.name===n; })[0];
      return f ? f.id : null;
    }).filter(Boolean);
  }
  // มื้ออีสานร้านหน้ามอ 8 คน — แต่ละคนกินไม่เท่ากันแบบที่เกิดจริง
  var all = [L("มาร์ค"),L("พูม"),L("ไอซ์"),L("ชาเน่"),L("โม"),L("ยูกะ"),L("โฟรค์"),L("เจ้าสัว")];
  state.menus = [
    { id:nid(), name:L("ตำไทย"), price:50, eaters:ids(L("ชาเน่"),L("ยูกะ"),L("โฟรค์")) },
    { id:nid(), name:L("ตำปูปลาร้า"), price:50, eaters:ids(L("มาร์ค"),L("พูม"),L("เจ้าสัว")) },
    { id:nid(), name:L("ตำซั่ว"), price:60, eaters:ids(L("ไอซ์"),L("มาร์ค")) },
    { id:nid(), name:L("ไก่ย่างเขาสวนกวาง"), price:180, eaters:ids.apply(null, all) },
    { id:nid(), name:L("คอหมูย่าง"), price:120, eaters:ids(L("มาร์ค"),L("ไอซ์"),L("เจ้าสัว")) },
    { id:nid(), name:L("ลาบหมู"), price:80, eaters:ids(L("มาร์ค"),L("พูม"),L("ไอซ์"),L("โม")) },
    { id:nid(), name:L("ต้มแซ่บกระดูกอ่อน"), price:120, eaters:ids(L("ไอซ์"),L("เจ้าสัว"),L("โม")) },
    { id:nid(), name:L("ไส้กรอกอีสาน"), price:60, eaters:ids(L("ชาเน่"),L("โม")) },
    { id:nid(), name:L("ไข่เจียวหมูสับ"), price:60, eaters:ids(L("ยูกะ")) },
    { id:nid(), name:L("ซอยจุ๊"), price:150, eaters:ids(L("ไอซ์"),L("เจ้าสัว")) }
  ];
  state.shared = [
    { id:nid(), name:L("ข้าวเหนียว 4 กระติ๊บ"), price:60 },
    { id:nid(), name:L("น้ำแข็ง"), price:20 },
    { id:nid(), name:L("โค้กขวดใหญ่ 2 ขวด"), price:70 },
    { id:nid(), name:L("น้ำเปล่าขวดใหญ่ 2 ขวด"), price:30 }
  ];
  state.charges.forEach(function(c){ c.on=false; });   // ร้านอีสานทั่วไปไม่คิดค่าบริการ / VAT
  state.payers = [];
  state.paid = {};
  if (!ui.ctx) state.name = L("ร้านส้มตำหน้ามอ");
  state.menuForm=null; state.sharedForm=null; state.chargeForm=null; state.open={};
  ui.confirmMember=null; ui.editingMember=null; ui.memberError=""; ui.undo=null;
  render();
  await commit(L("ใส่ข้อมูลตัวอย่างแล้ว"));
  render();
}
/** v3.2: ตัวอย่างทริปเชียงใหม่ 5 คน — แต่ละรายการมีคนจ่ายของตัวเอง */
async function loadTripDemo(){
  state.members = []; state.shared = []; state.payers = []; state.paid = {};
  var names = [L("มาร์ค"),L("พูม"),L("ไอซ์"),L("โม"),L("ยูกะ")];
  names.forEach(function(n){ state.members.push({ id:nid(), name:n }); });
  function id(n){ return state.members.filter(function(m){ return m.name === n; })[0].id; }
  function ids(list){ return list.map(id); }
  state.menus = [
    { id:nid(), name:L("ค่าที่พัก 2 คืน"), price:4800, eaters:ids(names), payer:id(L("มาร์ค")) },
    { id:nid(), name:L("ค่ารถตู้ไป-กลับ"), price:2500, eaters:ids(names), payer:id(L("ไอซ์")) },
    { id:nid(), name:L("ขันโตกมื้อเย็น"), price:1750, eaters:ids(names), payer:id(L("ยูกะ")) },
    { id:nid(), name:L("ตั๋วสวนพฤกษศาสตร์"), price:300, eaters:ids([L("พูม"),L("โม"),L("ยูกะ")]), payer:id(L("พูม")) },
    { id:nid(), name:L("คาเฟ่ดอยสุเทพ"), price:420, eaters:ids([L("โม"),L("ยูกะ"),L("พูม")]), payer:id(L("โม")) },
    { id:nid(), name:L("ค่าน้ำมันรถเช่า"), price:900, eaters:ids([L("มาร์ค"),L("ไอซ์"),L("โม")]), payer:id(L("มาร์ค")) }
  ];
  if (!ui.ctx) state.name = L("ทริปเชียงใหม่ 3 วัน 2 คืน");
  state.menuForm=null; state.sharedForm=null; state.chargeForm=null; state.open={};
  ui.confirmMember=null; ui.editingMember=null; ui.memberError=""; ui.undo=null;
  render();
  await commit(L("ใส่ข้อมูลตัวอย่างแล้ว"));
  render();
}
