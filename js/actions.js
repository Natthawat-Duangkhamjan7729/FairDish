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
  if (!name) return "ยังไม่ได้พิมพ์ชื่อ";
  if (name.length > MAX_NAME) return "ชื่อยาวเกิน "+MAX_NAME+" ตัวอักษร";
  var dup = state.members.some(function(p){
    return p.id !== ignoreId && p.name.toLowerCase() === name.toLowerCase();
  });
  if (dup) return "มีชื่อ " + name + " ในโต๊ะแล้ว ลองเติมนามสกุลหรือชื่อเล่นให้ต่างกัน";
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
  var ok = await commit("เพิ่ม "+name+" แล้ว");

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
  await commit("เปลี่ยนชื่อเป็น "+name+" แล้ว");
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
  toast("ลบ "+member.name+" แล้ว","ok",{ label:"เลิกทำ", action:undoRemove });
}
async function undoRemove(){
  if (!ui.undo) return;
  var u = ui.undo;
  ui.undo = null;
  clearTimeout(ui.undoTimer);

  if (u.kind === "menu"){
    state.menus.splice(Math.min(u.index, state.menus.length), 0, u.menu);
    render();
    await commit("คืนเมนู "+u.menu.name+" กลับมาแล้ว","menu");
    return render();
  }

  state.members.splice(Math.min(u.index, state.members.length), 0, u.member);
  state.menus.forEach(function(m){
    if (u.menuIds.indexOf(m.id) >= 0 && m.eaters.indexOf(u.member.id) < 0) m.eaters.push(u.member.id);
  });
  render();
  await commit("คืนชื่อ "+u.member.name+" กลับมาแล้ว","member");
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
        ? kt("suggest")+" "+items.length+" จาก "+found.total+" รายการ — พิมพ์ต่อเพื่อกรองให้แคบลง"
        : kt("suggest")+" "+items.length+" รายการ")
    : kt("suggestOften");
  box.innerHTML = '<div class="suggest" id="mSuggestList" role="listbox" aria-label="'+kt("suggest")+'">'+
    '<div class="s-head">'+head+'</div>'+
    items.map(function(it,i){
      return '<button type="button" role="option" id="mSuggest'+i+'" data-suggest="'+i+'" aria-selected="'+(i===ui.suggest.active)+'">'+
        '<span class="s-name">'+highlight(it.name, query)+'</span>'+
        (it.remembered ? '<span class="s-tag">เคยสั่ง</span>' : '')+
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
  if (isNaN(price) || price < 0) return "หาร "+f.eaters.length+" คน · ใส่ราคาแล้วจะคิดให้ทันที";
  return "หาร "+f.eaters.length+" คน · คนละ "+baht(price/f.eaters.length)+" บาท";
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
  else if (name.length > MAX_MENU_NAME) errs.name = "ชื่อเมนูยาวเกิน "+MAX_MENU_NAME+" ตัวอักษร";

  var raw = String(f.price===undefined?"":f.price).trim();
  var price = parseFloat(raw);
  if (raw === "") errs.price = "ยังไม่ได้ใส่ราคา";
  else if (isNaN(price)) errs.price = "ราคาต้องเป็นตัวเลข เช่น 60 หรือ 60.50";
  else if (price < 0) errs.price = "ราคาต้องไม่ติดลบ";
  else if (price > MAX_PRICE) errs.price = "ราคาสูงเกินจริง ลองตรวจจำนวนศูนย์อีกครั้ง";

  if (state.members.length === 0) errs.eaters = "ยังไม่มีใครในโต๊ะ กลับไปเพิ่มชื่อในแท็บ \"คน\" ก่อน";
  else if (f.eaters.length === 0) errs.eaters = kt("noEater");
  if (state.kind === "trip" && state.members.length && !nameOf(f.payer)) errs.payer = "เลือกว่าใครจ่ายรายการนี้";
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
  await commit(editing ? "บันทึก "+name+" แล้ว" : "เพิ่ม "+name+" "+baht(price)+" บาท แล้ว", "menu");
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
  await commit((state.kind === "trip" ? "ทำซ้ำ " : "เพิ่ม ")+src.name+(state.kind === "trip" ? " แล้ว" : " อีกจานแล้ว"),"menu");
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
  toast("ลบ "+menu.name+" แล้ว","ok",{ label:"เลิกทำ", action:undoRemove });
}

/** ข้อความสรุปที่ส่งเข้าแชต — v2.4: เปิดด้วยคำขอบคุณให้อ่านเป็นเรื่องของเพื่อน ไม่ใช่ใบแจ้งหนี้ */
function summaryText(){
  var r = compute();
  var lines = [];
  lines.push(kt("icon")+" "+billName());
  lines.push(kt("thanks"));
  lines.push("ยอดของแต่ละคนตามนี้เลย 👇");
  lines.push("");
  r.list.forEach(function(p){ lines.push("• "+p.name+"  "+baht(p.rounded)+" บาท"); });
  lines.push("");
  lines.push("รวมทั้งหมด "+baht(r.grand)+" บาท");
  var s = settleBill(r);
  if (s.ok && s.transfers.length){
    lines.push("");
    lines.push("โอนเงินตามนี้นะ 🙏");
    s.transfers.forEach(function(t){
      lines.push("• "+t.fromName+" → "+t.toName+"  "+baht(t.amount)+" บาท"+(state.paid[transferKey(t)] ? " ✅ โอนแล้ว" : ""));
    });
  }
  if (ui.ctx) lines.push("กดดูได้ว่ายอดมาจาก"+(state.kind === "trip" ? "รายการไหน: " : "เมนูไหน: ")+groupLink(ui.ctx)+"/bill");
  lines.push(state.kind === "trip" ? "— หารตามที่ใช้จริงด้วย FairDish" : "— หารตามที่กินจริงด้วย FairDish");
  return lines.join("\n");
}
function copyText(text, okMessage){
  function fallback(){
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast(okMessage,"ok"); }
    catch(e){ toast("คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วคัดลอกเอง","error"); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ toast(okMessage,"ok"); }, fallback);
  } else fallback();
}
function copySummary(){ copyText(summaryText(), "คัดลอกสรุปยอดแล้ว"); }

/* ---- v2.5: ใครจ่ายให้ร้าน → ใครโอนให้ใคร ---- */
/** วาดหน้าใบสรุปใหม่โดยไม่เล่นแอนิเมชันซ้ำและไม่เลื่อนจอ */
function rerenderBill(){
  if (currentPath() === "/split"){ renderSummary(); renderTotalBar(); return; }   // v3.2: ใครจ่ายอยู่ในแท็บสรุป
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
  if (text !== "" && (isNaN(n) || n < 0 || n > MAX_PRICE * 10)){ toast("ใส่ยอดเป็นตัวเลข เช่น 500 หรือ 500.50","error"); return rerenderBill(); }
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
  if (out.length) return out.map(function(t){ return "โอนให้ "+t.toName+" "+baht(t.amount); }).join(" · ");
  if (inn.length) return "รอรับคืน "+baht(inn.reduce(function(a,t){ return a+t.amount; },0))+" บาท";
  return "ไม่ต้องโอนให้ใคร";
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
  await commit("คืนข้อมูลกลับมาแล้ว");
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
  var id = groupIdFromInput(input.value);
  if (!id){
    setFieldMsg("groupJoinMsg","ไม่ใช่ลิงก์กลุ่มของ FairDish ลองคัดลอกลิงก์จากเพื่อนมาใหม่ทั้งหมด",true);
    return input.focus();
  }
  location.hash = "#/g/" + id;
}

async function forgetGroup(id){
  var g = myGroup(id);
  if (!g) return;
  ui.myGroups = ui.myGroups.filter(function(x){ return x.id !== id; });
  await saveMyGroups();
  if (currentPath() === "/history") document.getElementById("view").innerHTML = pageHistory();
  toast("เอา "+g.name+" ออกจากรายการแล้ว (กลุ่มยังอยู่ เปิดจากลิงก์ได้)","ok");
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
    '<div class="install-head"><div><h2 id="meTitle">คุณคือใครในโต๊ะนี้?</h2>'+
      '<p>เลือกชื่อตัวเอง แล้วยอดที่คุณต้องจ่ายจะแสดงตัวใหญ่ให้เห็นทันที (จำไว้ในเครื่องนี้)</p></div>'+
      '<button class="icon-btn" data-me-close="1" aria-label="ปิด">'+ICON_X+'</button></div>'+
    '<div class="pick me-pick">'+state.members.map(function(p){
      return '<button data-me-pick="'+p.id+'">'+esc(p.name)+'</button>';
    }).join("")+'</div>'+
    '<div class="me-other">'+
      '<button class="btn-quiet" data-me-add="1">ยังไม่มีชื่อฉัน — เพิ่มชื่อตัวเอง</button>'+
      '<button class="me-skip" data-me-close="1">ข้ามไปก่อน</button>'+
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
  toast("สวัสดี "+nameOf(memberId)+" 👋 ยอดของคุณอยู่ด้านบนแล้ว","ok");
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
  var link = confirmLink(ui.ctx), q = QR.encode(link);
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
    toast("บันทึกรูป QR แล้ว","ok");
  } catch(err){ toast("บันทึกรูปไม่สำเร็จ ลองคัดลอกลิงก์แทน","error"); }
}

/* ---- v3.2: หน้าหลัก "บิลของฉัน" ---- */
async function fillHome(){
  var saved = null;
  try { saved = await Store.loadLocalBill(); } catch(e){}
  if (currentPath() !== "/") return;
  var active = document.getElementById("homeActive");
  var recent = document.getElementById("homeRecent");
  var intro = document.getElementById("homeIntro");
  if (!active) return;
  var has = billHasData(saved);
  active.innerHTML = has ? activeBillHTML(saved) : "";
  var items = recentItems();
  recent.innerHTML = items.length
    ? '<div class="list-title"><h2>บิลล่าสุด</h2><a class="link-btn" href="#/history">ดูทั้งหมด</a></div>'+
      items.slice(0,3).map(function(x){ return x.html; }).join("")
    : "";
  intro.innerHTML = (!has && !items.length) ? homeIntroHTML() : "";
  updateInstallButton();
}

/* ---- v4.1: หน้าแนะนำ ---- */
async function finishOnboard(){
  ui.showOnb = false; ui.onbStep = 0;
  try { await Store.writeRaw(ONBOARD_KEY, "done"); } catch(e){}
  if (currentPath() === "/") route(); else location.hash = "#/";
}
function onboardNext(){
  if ((ui.onbStep || 0) >= 2) return finishOnboard();
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
/** เก็บบิลส่วนตัวเข้าประวัติ (ใหม่สุดก่อน) */
async function archiveBill(saved){
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
  if (location.hash === "#/split") route(); else location.hash = "#/split";
  return archived;
}
async function startNewBill(kind, demo){
  closeGlobalSheet();
  kind = kind === "trip" ? "trip" : "meal";
  try {
    var archived = await replaceLocalBill(emptyBill(kind), "members");
    if (demo) return loadDemo();
    toast(archived ? "เก็บ "+archived.name+" เข้าประวัติแล้ว เริ่ม"+ktOf(kind,"name")+"ใหม่" : "เริ่ม"+ktOf(kind,"name")+"ใหม่แล้ว","ok");
  } catch(err){
    toast("เริ่มบิลใหม่ไม่สำเร็จ บิลเดิมยังอยู่ครบ","error");
  }
}
async function restoreHistory(id){
  var h = ui.history.filter(function(x){ return x.id === id; })[0];
  if (!h) return;
  try {
    ui.history = ui.history.filter(function(x){ return x.id !== id; });
    await Store.saveHistory(ui.history);
    var archived = await replaceLocalBill(h.data, "summary");
    toast("เปิด "+h.name+" แล้ว"+(archived ? " (บิลที่ทำค้างไว้ย้ายเข้าประวัติ)" : ""),"ok");
  } catch(err){
    toast("เปิดบิลไม่สำเร็จ ลองอีกครั้ง","error");
  }
}
async function deleteHistory(id){
  var index = -1;
  ui.history.forEach(function(x,i){ if (x.id === id) index = i; });
  if (index < 0) return;
  var h = ui.history[index];
  ui.history.splice(index, 1);
  try { await Store.saveHistory(ui.history); } catch(e){}
  location.hash = "#/history";
  toast("ลบ "+h.name+" ออกจากประวัติแล้ว","ok",{ label:"เลิกทำ", action:async function(){
    ui.history.splice(Math.min(index, ui.history.length), 0, h);
    try { await Store.saveHistory(ui.history); } catch(e){}
    if (currentPath() === "/history") document.getElementById("view").innerHTML = pageHistory();
  }});
}

/* ---- v3.2: แผ่นล่างจอ เลือกประเภทบิล / ตั้งชื่อบิล ---- */
async function openKindSheet(){
  var saved = null;
  try { saved = await Store.loadLocalBill(); } catch(e){}
  var note = billHasData(saved)
    ? 'บิลที่ทำค้างไว้ <b>'+esc(savedBillName(saved))+'</b> จะถูกเก็บในประวัติ ไม่หาย'
    : 'บันทึกในเครื่องให้อัตโนมัติ ไม่ต้องสมัครสมาชิก';
  function card(kind, cls){
    return '<button class="kind-card '+cls+'" type="button" data-new-kind="'+kind+'">'+
      '<span class="kind-ico" aria-hidden="true">'+ktOf(kind,"icon")+'</span>'+
      '<span class="kind-text"><b>'+ktOf(kind,"name")+'</b><span>'+ktOf(kind,"kindSub")+'</span></span></button>';
  }
  ui.sheet = "kind";
  renderGlobalSheet('<h2 class="sheet-title" id="kindTitle">วันนี้หารอะไร</h2>'+
    '<p class="sheet-sub">เลือกครั้งเดียวตอนเริ่ม</p>'+
    '<div class="kind-grid">'+card("meal","meal")+card("trip","trip")+'</div>'+
    '<p class="sheet-note">'+note+'</p>', "kindTitle");
  var first = document.querySelector("[data-new-kind]");
  if (first) first.focus({ preventScroll:true });
}
function openRenameSheet(){
  if (ui.ctx || ui.loading) return;
  ui.sheet = "rename";
  renderGlobalSheet('<h2 class="sheet-title" id="renameTitle">ชื่อบิล</h2>'+
    '<div class="form-box">'+
      '<label class="sr-only" for="billNameInput">ชื่อบิล</label>'+
      '<input type="text" id="billNameInput" value="'+esc(billName())+'" maxlength="'+MAX_MENU_NAME+'" autocomplete="off" placeholder="เช่น ร้านส้มตำหน้ามอ">'+
      '<div class="form-actions"><button class="btn-quiet" type="button" data-close-global="1">ยกเลิก</button>'+
      '<button class="btn-sm" type="button" id="billNameSave">บันทึก</button></div>'+
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
  await commit("เปลี่ยนชื่อบิลเป็น "+name+" แล้ว");
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
    else { document.getElementById("view").innerHTML = pageBill(); window.scrollTo(0,0); }
  } else rerenderBill();
  await commit();
}

/* ---- v4.1: QR พร้อมเพย์พร้อมยอดของแต่ละการโอน (เบอร์พร้อมเพย์เก็บที่ members[i].pp) ---- */
function transferByKey(key){
  var s = settleBill(compute());
  if (!s.ok) return null;
  return s.transfers.filter(function(t){ return transferKey(t) === key; })[0] || null;
}
function memberById(id){ return state.members.filter(function(p){ return p.id === id; })[0] || null; }
function openPromptPay(key, editing){
  var t = transferByKey(key);
  if (!t) return closeGlobalSheet();
  var to = memberById(t.to);
  var pp = to && cleanPromptPay(to.pp);
  var done = !!state.paid[key];
  var body;
  if (pp && !editing){
    var payload = promptPayPayload(pp, t.amount), q = QR.encode(payload);
    body = '<div class="qr-card pp-qr"><div class="qr-code">'+QR.svg(payload, "QR พร้อมเพย์ "+esc(t.toName)+" "+baht(t.amount)+" บาท")+
        (q && q.version >= 4 ? '<span class="qr-logo"><img src="img/icon-192.png" alt=""></span>' : '')+'</div></div>'+
      '<p class="pp-who">พร้อมเพย์ของ '+esc(t.toName)+' · <span class="mono">'+esc(maskPromptPay(pp))+'</span> '+
        '<button class="link-btn" type="button" data-pp-edit="'+esc(key)+'">เปลี่ยน</button></p>'+
      '<p class="pp-hint">สแกนด้วยแอปธนาคาร ยอดใส่ไว้ให้แล้ว</p>';
  } else {
    body = '<div class="form-box pp-form">'+
      '<label class="label" for="ppInput">เบอร์พร้อมเพย์ของ '+esc(t.toName)+'</label>'+
      '<input type="text" id="ppInput" inputmode="numeric" autocomplete="off" maxlength="20" value="'+esc(pp || "")+'" placeholder="เบอร์มือถือ หรือเลขบัตรประชาชน 13 หลัก" aria-describedby="ppMsg">'+
      '<p class="field-msg muted" id="ppMsg">'+(ui.ctx ? 'บันทึกไว้ในบิลกลุ่มนี้ ทุกคนที่มีลิงก์กลุ่มเห็นเบอร์นี้' : 'บันทึกไว้ในบิลนี้ในเครื่องของคุณ')+'</p>'+
      '<button class="btn-sm btn-block" type="button" id="ppSave" data-pp-key="'+esc(key)+'">สร้าง QR</button>'+
    '</div>';
  }
  ui.sheet = "pp";
  renderGlobalSheet(
    '<div class="pp-sheet"><span class="pp-badge" id="ppTitle">QR พร้อมเพย์</span>'+
    '<p class="pp-line">'+esc(t.fromName)+' โอนให้ '+esc(t.toName)+'</p>'+
    '<div class="pp-amt">'+baht(t.amount)+' ฿</div>'+body+
    '<div class="form-actions"><button class="btn-quiet" type="button" data-close-global="1">ปิด</button>'+
      '<button class="btn-sm" type="button" data-pp-paid="'+esc(key)+'">'+(done ? "ยังไม่ได้โอน" : "โอนแล้ว")+'</button></div></div>', "ppTitle");
  var sheet = document.querySelector("#globalSheet .sheet");
  if (sheet && pp && !editing) fitQr(sheet, QR.encode(promptPayPayload(pp, t.amount)));
  var input = document.getElementById("ppInput");
  if (input) input.focus();
}
async function savePromptPay(key){
  var t = transferByKey(key), input = document.getElementById("ppInput");
  if (!t || !input) return;
  var pp = cleanPromptPay(input.value);
  if (!pp){
    var msg = document.getElementById("ppMsg");
    if (msg){ msg.className = "field-msg error"; msg.textContent = "ใส่เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก"; }
    input.setAttribute("aria-invalid","true");
    return input.focus();
  }
  var to = memberById(t.to);
  if (!to) return;
  to.pp = pp;
  openPromptPay(key);
  await commit();
}
async function paidFromSheet(key){
  closeGlobalSheet();
  await togglePaid(key);
}

/* ---- v3.2: ชวนเพื่อนเข้ากลุ่มจากบิลส่วนตัว = ย้ายบิลนี้ขึ้นกลุ่ม ---- */
async function inviteFromBill(){
  if (ui.ctx || !Cloud.ready() || ui.creatingGroup) return;
  var btn = document.getElementById("inviteBtn");
  var data = serialize();
  var name = billName().slice(0, MAX_GROUP_NAME);
  ui.creatingGroup = true;
  if (btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>กำลังสร้างกลุ่ม'; }
  try {
    var g = await Cloud.create(name, data);
    await rememberGroup(g.id, g.name, data.kind);
    // บิลอยู่บนกลุ่มแล้ว บิลส่วนตัวในเครื่องเริ่มใหม่ว่าง ๆ (ไม่ให้มีสองที่ที่ต้องแก้)
    try { await Store.saveLocalBill(emptyBill(data.kind)); } catch(e){}
    ui.shareAfterLoad = true;
    location.hash = "#/g/" + g.id + "/share";
  } catch(err){
    toast("สร้างกลุ่มไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง","error");
    var again = document.getElementById("inviteBtn");
    if (again){ again.disabled = false; again.innerHTML = ICON_USERS+' ชวนเพื่อนเข้ากลุ่ม'; }
  } finally {
    ui.creatingGroup = false;
  }
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
  var item = { id:nid(), type:"meal", name:"มื้อที่ "+n, price:0, eaters:[],
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
  await commit("เปลี่ยนชื่อมื้อเป็น "+name+" แล้ว");
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

async function loadDemo(){
  if (state.kind === "trip") return loadTripDemo();
  state.members=[]; state.menus=[]; state.shared=[];
  ["มาร์ค","พูม","ไอซ์","ชาเน่","โม","ยูกะ","โฟรค์","เจ้าสัว"].forEach(function(n){
    state.members.push({ id:nid(), name:n });
  });
  function ids(){
    return Array.prototype.slice.call(arguments).map(function(n){
      var f = state.members.filter(function(m){ return m.name===n; })[0];
      return f ? f.id : null;
    }).filter(Boolean);
  }
  // มื้ออีสานร้านหน้ามอ 8 คน — แต่ละคนกินไม่เท่ากันแบบที่เกิดจริง
  var all = ["มาร์ค","พูม","ไอซ์","ชาเน่","โม","ยูกะ","โฟรค์","เจ้าสัว"];
  state.menus = [
    { id:nid(), name:"ตำไทย", price:50, eaters:ids("ชาเน่","ยูกะ","โฟรค์") },
    { id:nid(), name:"ตำปูปลาร้า", price:50, eaters:ids("มาร์ค","พูม","เจ้าสัว") },
    { id:nid(), name:"ตำซั่ว", price:60, eaters:ids("ไอซ์","มาร์ค") },
    { id:nid(), name:"ไก่ย่างเขาสวนกวาง", price:180, eaters:ids.apply(null, all) },
    { id:nid(), name:"คอหมูย่าง", price:120, eaters:ids("มาร์ค","ไอซ์","เจ้าสัว") },
    { id:nid(), name:"ลาบหมู", price:80, eaters:ids("มาร์ค","พูม","ไอซ์","โม") },
    { id:nid(), name:"ต้มแซ่บกระดูกอ่อน", price:120, eaters:ids("ไอซ์","เจ้าสัว","โม") },
    { id:nid(), name:"ไส้กรอกอีสาน", price:60, eaters:ids("ชาเน่","โม") },
    { id:nid(), name:"ไข่เจียวหมูสับ", price:60, eaters:ids("ยูกะ") },
    { id:nid(), name:"ซอยจุ๊", price:150, eaters:ids("ไอซ์","เจ้าสัว") }
  ];
  state.shared = [
    { id:nid(), name:"ข้าวเหนียว 4 กระติ๊บ", price:60 },
    { id:nid(), name:"น้ำแข็ง", price:20 },
    { id:nid(), name:"โค้กขวดใหญ่ 2 ขวด", price:70 },
    { id:nid(), name:"น้ำเปล่าขวดใหญ่ 2 ขวด", price:30 }
  ];
  state.charges.forEach(function(c){ c.on=false; });   // ร้านอีสานทั่วไปไม่คิดค่าบริการ / VAT
  state.payers = [];
  state.paid = {};
  if (!ui.ctx) state.name = "ร้านส้มตำหน้ามอ";
  state.menuForm=null; state.sharedForm=null; state.chargeForm=null; state.open={};
  ui.confirmMember=null; ui.editingMember=null; ui.memberError=""; ui.undo=null;
  render();
  await commit("ใส่ข้อมูลตัวอย่างแล้ว");
  render();
}
/** v3.2: ตัวอย่างทริปเชียงใหม่ 5 คน — แต่ละรายการมีคนจ่ายของตัวเอง */
async function loadTripDemo(){
  state.members = []; state.shared = []; state.payers = []; state.paid = {};
  var names = ["มาร์ค","พูม","ไอซ์","โม","ยูกะ"];
  names.forEach(function(n){ state.members.push({ id:nid(), name:n }); });
  function id(n){ return state.members.filter(function(m){ return m.name === n; })[0].id; }
  function ids(list){ return list.map(id); }
  state.menus = [
    { id:nid(), name:"ค่าที่พัก 2 คืน", price:4800, eaters:ids(names), payer:id("มาร์ค") },
    { id:nid(), name:"ค่ารถตู้ไป-กลับ", price:2500, eaters:ids(names), payer:id("ไอซ์") },
    { id:nid(), name:"ขันโตกมื้อเย็น", price:1750, eaters:ids(names), payer:id("ยูกะ") },
    { id:nid(), name:"ตั๋วสวนพฤกษศาสตร์", price:300, eaters:ids(["พูม","โม","ยูกะ"]), payer:id("พูม") },
    { id:nid(), name:"คาเฟ่ดอยสุเทพ", price:420, eaters:ids(["โม","ยูกะ","พูม"]), payer:id("โม") },
    { id:nid(), name:"ค่าน้ำมันรถเช่า", price:900, eaters:ids(["มาร์ค","ไอซ์","โม"]), payer:id("มาร์ค") }
  ];
  if (!ui.ctx) state.name = "ทริปเชียงใหม่ 3 วัน 2 คืน";
  state.menuForm=null; state.sharedForm=null; state.chargeForm=null; state.open={};
  ui.confirmMember=null; ui.editingMember=null; ui.memberError=""; ui.undo=null;
  render();
  await commit("ใส่ข้อมูลตัวอย่างแล้ว");
  render();
}
