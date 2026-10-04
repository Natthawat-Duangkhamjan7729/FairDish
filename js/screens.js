/* FairDish — v4.0 หน้าจอตามดีไซน์ Claude Design:
   หน้าแรก "บิลของฉัน", ประวัติบิล, หน้าเพื่อนยืนยันเมนู, หน้าแนะนำ 3 หน้า */
"use strict";

var ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
var ICON_PLUS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var ICON_CHEVRON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

function langSwitch(){
  return '<div class="lang-switch" role="group" aria-label="'+L("ภาษา")+'">'+
    ["th","en"].map(function(l){
      return '<button type="button" data-lang="'+l+'" aria-pressed="'+(LANG===l)+'" lang="'+l+'">'+l.toUpperCase()+'</button>';
    }).join("")+'</div>';
}
function peopleItems(n, items, kind){
  return L("{n} คน", { n:n })+" · "+L("{n} "+((KIND_TEXT[kind] || KIND_TEXT.meal).items), { n:items });
}

/* =========================================================
   หน้าแรก: บิลของฉัน
   ========================================================= */
function startCard(tag, attrs, kind, icon, title, sub){
  return '<'+tag+' class="start-card '+kind+'" '+attrs+'>'+
    '<span class="start-icon">'+icon+'</span>'+
    '<span class="start-text"><b>'+title+'</b><span>'+sub+'</span></span>'+
    '<span class="start-go" aria-hidden="true">›</span></'+tag+'>';
}
function startGrid(){
  return '<div class="start-grid" id="homeStartGrid">'+
    startCard("button", 'type="button" data-start-kind="meal"', "coral", '<span class="start-emoji" aria-hidden="true">🍲</span>', ktOf("meal","start"), ktOf("meal","startSub"))+
    startCard("button", 'type="button" data-start-kind="trip"', "mint", '<span class="start-emoji" aria-hidden="true">✈️</span>', ktOf("trip","start"), ktOf("trip","startSub"))+
    (Cloud.ready()
      ? startCard("button", 'type="button" data-start-group="1"', "purple", ICON_START_GROUP, L("สร้างกลุ่มก่อน"), L("ส่งลิงก์ให้เพื่อนช่วยกันกรอก ใช้ได้ทั้งมื้ออาหารและทริป"))
      : '')+
  '</div>';
}
function pageHome(){
  return '<div class="page page-home"><div class="wrap home-col">'+
    '<div class="home-top"><h1>'+L("บิลของฉัน")+'</h1>'+langSwitch()+'</div>'+
    '<div id="homeCurrent"><div class="skeleton" aria-hidden="true"><i style="width:100%;height:180px"></i></div></div>'+
    '<button type="button" class="new-bill" data-home-new="1" aria-expanded="'+ui.homeNew+'" aria-controls="homeNewBox">'+
      '<span class="nb-icon">'+ICON_PLUS+'</span>'+
      '<span class="nb-text"><b>'+L("เริ่มบิลใหม่")+'</b><span>'+L("ใส่ชื่อ ใส่เมนู แล้วส่งยอดเข้ากลุ่ม")+'</span></span></button>'+
    '<div id="homeNewBox"'+(ui.homeNew ? '' : ' hidden')+'>'+startGrid()+'</div>'+
    '<div id="homeRecent"></div>'+
    '<a class="home-why" href="#/how">'+L("ทำไมต้องหารตามที่กินจริง?")+' ›</a>'+
  '</div></div>';
}
/** บิลทั้งหมดที่เครื่องนี้รู้จัก (บิลส่วนตัวค้าง + ประวัติ + กลุ่ม) ใหม่สุดก่อน */
async function knownBills(){
  var out = [];
  var local = await readLocalBill();
  if (billHasContent(local)){
    var ls = billStats(local);
    var at = local.savedAt ? Date.parse(local.savedAt) || Date.now() : Date.now();
    out.push({ type:"local", href:"#/split", bill:"#/bill", name:billTitle(local, at), kind:ls.kind, n:ls.n, items:ls.items, grand:ls.grand, at:at });
  }
  ui.myGroups.forEach(function(g){
    var s = g.stats || null;
    out.push({ type:"group", id:g.id, href:"#/g/"+g.id, bill:"#/g/"+g.id+"/bill", name:g.name, kind:g.kind || "meal",
               n:s ? s.n : null, items:s ? s.items : null, grand:s ? s.grand : null, confirmed:s ? s.confirmed : null, at:g.at || 0 });
  });
  ui.history.forEach(function(h){
    var st = billStats(h.data);
    out.push({ type:"history", id:h.id, href:"#/h/"+h.id, bill:"#/h/"+h.id, name:billTitle(h.data, h.at), kind:st.kind, n:st.n, items:st.items, grand:st.grand, at:h.at });
  });
  out.sort(function(a,b){ return b.at - a.at; });
  return out;
}
function billRow(b){
  var sub = [shortDate(b.at)];
  if (b.n != null) sub.push(L("{n} คน", { n:b.n }));
  if (b.type === "group") sub.push(L("บิลกลุ่ม"));
  if (b.type === "local") sub.push(L("กำลังหาร"));
  return '<a class="bill-row" href="'+esc(b.href)+'">'+
    '<span class="br-body"><b>'+ktOf(b.kind,"icon")+' '+esc(b.name)+'</b><span>'+esc(sub.join(" · "))+'</span></span>'+
    (b.grand != null ? '<span class="br-amt">'+baht(b.grand)+'</span>' : '')+
    '<span class="br-go">'+ICON_CHEVRON+'</span></a>';
}
function currentCard(b){
  var progress = '';
  if (b.type === "group" && b.n){
    var c = b.confirmed || 0, pct = Math.round(c * 100 / b.n);
    progress = '<div class="cur-progress"><span>'+L("เพื่อนยืนยันแล้ว {done}/{total}", { done:c, total:b.n })+'</span>'+
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+b.n+'" aria-valuenow="'+c+'"><i style="width:'+pct+'%"></i></div></div>';
  }
  return '<section class="cur-card" aria-labelledby="h-cur">'+
    '<div class="cur-top"><span class="badge wait">'+L("กำลังหาร")+'</span>'+
      (b.n != null ? '<span class="cur-meta">'+esc(peopleItems(b.n, b.items, b.kind))+'</span>' : '')+'</div>'+
    '<h2 id="h-cur" class="cur-name">'+ktOf(b.kind,"icon")+' '+esc(b.name)+'</h2>'+
    '<div class="cur-amt">'+(b.grand != null ? baht(b.grand) : '—')+' <small>฿</small></div>'+
    progress+
    '<div class="cur-actions"><a class="btn-sm" href="'+esc(b.href)+'">'+L("ทำต่อ")+'</a>'+
      '<a class="btn-quiet" href="'+esc(b.bill)+'">'+L("ใบสรุปยอด")+'</a></div>'+
  '</section>';
}
async function fillHome(){
  var bills = await knownBills();
  var cur = document.getElementById("homeCurrent");
  var recent = document.getElementById("homeRecent");
  if (!cur || !recent) return;
  var active = bills.filter(function(b){ return b.type !== "history"; })[0];
  cur.innerHTML = active ? currentCard(active) : '';
  var box = document.getElementById("homeNewBox");
  // ยังไม่มีบิลเลย = กางตัวเลือกเริ่มบิลไว้ให้เลย
  if (!active && box){ box.hidden = false; var nb = document.querySelector("[data-home-new]"); if (nb) nb.setAttribute("aria-expanded","true"); }
  var rest = bills.filter(function(b){ return b !== active; });
  recent.innerHTML = !rest.length ? '' :
    '<div class="sec-row"><h2>'+L("บิลล่าสุด")+'</h2><a href="#/history">'+L("ดูทั้งหมด")+'</a></div>'+
    rest.slice(0,3).map(billRow).join("");
}
function toggleHomeNew(){
  ui.homeNew = !ui.homeNew;
  var box = document.getElementById("homeNewBox");
  var btn = document.querySelector("[data-home-new]");
  if (box) box.hidden = !ui.homeNew;
  if (btn) btn.setAttribute("aria-expanded", String(ui.homeNew));
  if (ui.homeNew && box) box.scrollIntoView({ block:"nearest", behavior:"smooth" });
}

/* =========================================================
   ประวัติบิล
   ========================================================= */
function pageHistory(){
  return '<div class="page"><div class="wrap app-col">'+
    '<div class="page-head" style="max-width:none"><h1>'+L("ประวัติบิล")+'</h1>'+
      '<p>'+L("บิลที่เก็บไว้ในเครื่องนี้ และกลุ่มที่คุณเคยเปิด")+'</p></div>'+
    '<div id="historyList"><div class="skeleton" aria-hidden="true"><i style="width:100%"></i><i style="width:100%"></i></div></div>'+
  '</div></div>';
}
async function fillHistory(){
  var bills = await knownBills();
  var box = document.getElementById("historyList");
  if (!box) return;
  if (!bills.length){
    box.innerHTML = '<p class="empty">'+L("ยังไม่มีบิล — เริ่มบิลใหม่จากหน้าแรก บิลเก่าจะถูกเก็บไว้ที่นี่ให้อัตโนมัติ")+'</p>'+
      '<a class="btn btn-main" href="#/" style="margin-top:var(--s4)">'+L("ไปหน้าแรก")+'</a>';
    return;
  }
  var html = "", month = "";
  bills.forEach(function(b){
    var m = monthLabel(b.at);
    if (m !== month){ html += '<h2 class="month-head">'+esc(m)+'</h2>'; month = m; }
    html += billRow(b);
  });
  box.innerHTML = html;
}

/** #/h/<id> — ดูบิลเก่าแบบอ่านอย่างเดียว */
function pageHistoryItem(){
  var id = historyIdFromPath();
  var h = historyItem(id);
  if (!h){
    return '<div class="page"><div class="wrap app-col">'+
      '<a class="crumb" href="#/history">← '+L("ประวัติบิล")+'</a>'+
      '<div class="page-head"><h1>'+L("ไม่พบบิลนี้")+'</h1><p>'+L("อาจถูกลบออกจากประวัติไปแล้ว")+'</p></div></div></div>';
  }
  var b = billOf(h.data), r = computeBill(b), name = billTitle(h.data, h.at);
  return '<div class="page"><div class="wrap app-col">'+
    '<a class="crumb" href="#/history">← '+L("ประวัติบิล")+'</a>'+
    '<div class="page-head"><p class="eyebrow">'+ktOf(b.kind,"icon")+' '+esc(shortDate(h.at))+'</p><h1>'+esc(name)+'</h1></div>'+
    (b.members.length ? receiptHTML(r, { interactive:true, open:ui.histOpen, toggleAttr:"data-hist-toggle", kind:b.kind, me:null })
                      : '<p class="empty">'+L("บิลนี้ยังไม่มีชื่อคน")+'</p>')+
    '<div class="finish-actions">'+
      '<button class="btn-sm btn-block" data-hist-restore="'+esc(h.id)+'">'+L("เปิดบิลนี้ทำต่อ")+'</button>'+
      (b.members.length ? '<button class="btn-quiet btn-block" data-hist-copy="'+esc(h.id)+'">'+ICON_COPY+' '+L("คัดลอกสรุปยอด")+'</button>' : '')+
      '<button class="link-btn danger" data-hist-del="'+esc(h.id)+'">'+ICON_DEL+' '+L("ลบออกจากประวัติ")+'</button>'+
    '</div>'+
  '</div></div>';
}
/** บิลดิบ → รูปที่ computeBill ใช้ */
function billOf(d){
  return { members:d.members || [], menus:d.menus || [], shared:d.shared || [],
           charges:(d.charges && d.charges.length) ? d.charges : defaultCharges(), kind:d.kind === "trip" ? "trip" : "meal" };
}
function copyHistory(id){
  var h = historyItem(id);
  if (!h) return;
  var b = billOf(h.data), r = computeBill(b);
  copyText(summaryLines(r, billTitle(h.data, h.at), b.kind, null).join("\n"), L("คัดลอกสรุปยอดแล้ว"));
}

/* =========================================================
   #/g/<id>/me — เพื่อนเลือกชื่อ ติ๊กเมนูที่กิน แล้วยืนยัน
   ========================================================= */
function confirmLink(id){ return groupLink(id) + "/me"; }
function confirmInviteText(){
  return L("ช่วยติ๊กเมนูที่คุณกินในบิล \"{name}\" หน่อยนะ 🙏", { name:Store.groupName })+"\n"+
    L("กดลิงก์ เลือกชื่อตัวเอง แล้วกดยืนยัน ไม่ต้องสมัคร")+"\n"+confirmLink(ui.ctx);
}
function shareConfirmLink(){
  if (!ui.ctx) return;
  var text = confirmInviteText();
  if (!navigator.share) return copyText(text, L("คัดลอกลิงก์ยืนยันเมนูแล้ว ส่งเข้าแชตได้เลย"));
  navigator.share({ title:Store.groupName+" · FairDish", text:text }).catch(function(){});
}
/** สมาชิกที่กำลังยืนยัน: เลือกในหน้านี้ หรือ "ฉันคือใคร" ที่จำไว้ */
function confirmMember(){
  var id = ui.confirmFor || myMemberId();
  return nameOf(id) ? id : null;
}
function confirmSelection(me){
  if (!ui.confirmSel || ui.confirmSel.__for !== me){
    var sel = { __for:me };
    itemsOf(serialize()).forEach(function(it){ if (it.eaters.indexOf(me) >= 0) sel[it.key] = true; });
    ui.confirmSel = sel;
  }
  return ui.confirmSel;
}
/** ยอดของฉันถ้ายืนยันตามที่ติ๊กไว้ตอนนี้ */
function confirmPreview(me, sel){
  var d = JSON.parse(JSON.stringify(serialize()));
  applyConfirm(d, me, sel);
  var b = billOf(d), r = computeBill(b);
  var mine = r.list.filter(function(p){ return p.id === me; })[0];
  return { total:mine ? mine.rounded : 0, items:itemsOf(d), shared:r.sharedTotal > 0 || r.rate > 0 };
}
function pageConfirm(){
  if (ui.ctx && ui.groupError) return pageGroupError();
  var head = '<div class="page page-confirm"><div class="wrap app-col">'+
    '<div class="cf-top"><p class="eyebrow">'+L("บิลกลุ่ม · เพื่อนชวนคุณมาหาร")+'</p>'+
      '<a class="icon-btn cf-close" href="'+billHref()+'" aria-label="'+L("ปิด")+'">'+ICON_X+'</a></div>';
  if (ui.loading) return head + '<div class="skeleton" aria-hidden="true"><i style="width:100%;height:160px"></i></div></div></div>';
  var d = serialize(), items = itemsOf(d);
  head += '<h1 class="cf-title">'+esc(Store.groupName)+'</h1>'+
    '<p class="cf-meta">'+esc(peopleItems(state.members.length, items.length, state.kind))+'</p>';
  var me = confirmMember();

  if (ui.confirmDone && me){
    var mine = myShareOf(me);
    return head + '<section class="cf-done">'+
      '<span class="cf-done-icon">'+ICON_CHECK+'</span>'+
      '<h2>'+L("ยืนยันแล้ว")+'</h2>'+
      '<div class="cf-done-amt">'+baht(mine)+' ฿</div>'+
      '<p>'+L("ยอดของคุณถูกส่งให้ทั้งโต๊ะแล้ว")+'</p>'+
      '<div class="cf-done-actions"><a class="btn-sm btn-block" href="'+billHref()+'">'+L("ดูใบสรุปยอด")+'</a>'+
      '<button class="btn-quiet btn-block" data-cf-again="1">'+L("แก้เมนูที่ติ๊ก")+'</button></div>'+
    '</section></div></div>';
  }

  if (!me){
    return head + '<section class="cf-card" aria-labelledby="h-cf-who">'+
      '<h2 id="h-cf-who">'+L("คุณคือใคร")+'</h2>'+
      '<p>'+L("เลือกชื่อของคุณในโต๊ะนี้")+'</p>'+
      (state.members.length
        ? '<div class="cf-who">'+state.members.map(function(p){
            var st = confirmStatusOf(d, p.id);
            return '<button type="button" data-cf-who="'+p.id+'">'+esc(p.name)+(st === "confirmed" ? ' <span class="cf-tick" aria-label="'+L("ยืนยันแล้ว")+'">✓</span>' : '')+'</button>';
          }).join("")+'</div>'
        : '<p class="empty">'+L("ยังไม่มีใครในบิลนี้")+'</p>')+
      '<div class="cf-add"><label class="label" for="cfName">'+L("ไม่มีชื่อคุณ? เพิ่มชื่อตัวเอง")+'</label>'+
        '<div class="field-row"><div><input type="text" id="cfName" maxlength="'+MAX_NAME+'" autocomplete="off" placeholder="'+L("พิมพ์ชื่อ เช่น มาร์ค")+'"></div>'+
        '<button class="btn-quiet" data-cf-add="1">'+L("เพิ่ม")+'</button></div>'+
        '<p class="field-msg muted" id="cfMsg" aria-live="polite"></p></div>'+
    '</section></div></div>';
  }

  var sel = confirmSelection(me);
  var pv = confirmPreview(me, sel);
  var group = null, list = "";
  pv.items.forEach(function(it){
    if (it.group !== (group || "")){
      group = it.group;
      if (group) list += '<p class="cf-group">🍲 '+esc(group)+'</p>';
    }
    var on = !!sel[it.key];
    var n = it.eaters.length;
    list += '<button type="button" class="cf-item" data-cf-item="'+esc(it.key)+'" role="checkbox" aria-checked="'+on+'">'+
      '<span class="cf-box" aria-hidden="true">'+(on ? ICON_CHECK : '')+'</span>'+
      '<span class="cf-body"><b>'+esc(it.name)+'</b><span>'+
        (n ? L("หาร {n} คน", { n:n }) : L("ยังไม่มีใครเลือก"))+'</span></span>'+
      '<span class="cf-amt">'+(on && n ? baht(it.price / n) : baht(it.price))+'</span></button>';
  });
  var st = confirmStatusOf(d, me);
  return head +
    '<div class="cf-hello"><h2>'+L("สวัสดี {name} 👋", { name:esc(nameOf(me)) })+'</h2>'+
      '<button class="link-btn" data-cf-change="1">'+L("ไม่ใช่ฉัน")+'</button></div>'+
    (st === "changed" ? '<div class="notice warn"><p>'+L("มีคนแก้รายการหลังคุณยืนยัน ลองตรวจอีกครั้งแล้วกดยืนยันใหม่")+'</p></div>' : '')+
    '<p class="sub-head">'+L("ติ๊กเมนูที่คุณกิน")+'</p>'+
    (list || '<p class="empty">'+L("บิลนี้ยังไม่มีรายการ")+'</p>')+
  '</div></div>'+
  '<div class="cf-bar"><div class="cf-bar-in">'+
    '<div class="cf-bar-sum"><span>'+L("ยอดของคุณ")+'</span><b>'+baht(pv.total)+' ฿</b>'+
      (pv.shared ? '<small>'+L("รวมค่าส่วนกลางแล้ว")+'</small>' : '')+'</div>'+
    '<button class="btn-sm" data-cf-save="1"'+(ui.confirming ? ' disabled' : '')+'>'+
      (ui.confirming ? '<span class="spinner" aria-hidden="true"></span>'+L("กำลังบันทึก") : L("ยืนยันเมนู"))+'</button>'+
  '</div></div>';
}
function myShareOf(id){
  var r = compute();
  var p = r.list.filter(function(x){ return x.id === id; })[0];
  return p ? p.rounded : 0;
}
function rerenderConfirm(){
  if (currentPath() !== "/confirm") return;
  var y = window.scrollY;
  document.getElementById("view").innerHTML = pageConfirm();
  window.scrollTo(0, y);
  document.body.classList.toggle("has-cf-bar", !!document.querySelector(".cf-bar"));
}
async function pickConfirmMember(id){
  if (!nameOf(id)) return;
  ui.confirmFor = id; ui.confirmSel = null; ui.confirmDone = false;
  var g = myGroup(ui.ctx);
  if (g){ g.me = id; g.asked = true; saveMyGroups(); }
  rerenderConfirm();
  window.scrollTo(0, 0);
}
async function addConfirmMember(){
  var input = document.getElementById("cfName");
  if (!input) return;
  var name = input.value.trim().replace(/\s+/g," ");
  var problem = validateName(name, null);
  if (problem){ setFieldMsg("cfMsg", problem, true); return input.focus(); }
  var id = nid();
  state.members.push({ id:id, name:name });
  var ok = await commit(L("เพิ่ม {name} แล้ว", { name:name }));
  if (!ok) return rerenderConfirm();
  pickConfirmMember(id);
}
function toggleConfirmItem(key){
  var me = confirmMember();
  if (!me) return;
  var sel = confirmSelection(me);
  if (sel[key]) delete sel[key]; else sel[key] = true;
  rerenderConfirm();
}
async function submitConfirm(){
  var me = confirmMember();
  if (!me || ui.confirming) return;
  ui.confirming = true;
  rerenderConfirm();
  var sel = {};
  Object.keys(confirmSelection(me)).forEach(function(k){ if (k !== "__for") sel[k] = true; });
  var res;
  try { res = await saveConfirm(me, sel); } catch(e){ res = false; }
  ui.confirming = false;
  if (res === true){
    ui.confirmDone = true; ui.confirmSel = null;
    rerenderConfirm();
    window.scrollTo(0, 0);
    toast(L("ยืนยันเมนูแล้ว ขอบคุณนะ 🙏"), "ok");
  } else {
    if (res === "missing"){ ui.confirmFor = null; ui.confirmSel = null; }
    rerenderConfirm();
    toast(res === "missing" ? L("ไม่พบชื่อคุณในบิลแล้ว ลองเลือกชื่ออีกครั้ง") : L("ยืนยันไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"), "error");
  }
}

/** ส่วน "เพื่อนยืนยันเมนู" บนหน้าใบสรุปยอดของกลุ่ม */
function confirmSection(r){
  if (!ui.ctx){
    if (!Cloud.ready()) return "";
    return '<a class="payer-toggle cf-promo" href="#/groups" data-to-group="1">'+
      '<span><b>'+L("อยากให้เพื่อนติ๊กเมนูเอง?")+'</b><span>'+L("สร้างกลุ่มจากบิลนี้ แล้วส่งลิงก์ให้เพื่อนยืนยัน")+'</span></span><span aria-hidden="true">›</span></a>';
  }
  var c = confirmSummary();
  if (!c.total) return "";
  var amounts = {};
  r.list.forEach(function(p){ amounts[p.id] = p.rounded; });
  var pct = Math.round(c.done * 100 / c.total);
  var badge = {
    confirmed:['ok', L("ยืนยันแล้ว")], pending:['wait', L("รอยืนยัน")], changed:['changed', L("แก้หลังยืนยัน")]
  };
  var me = myMemberId();
  return '<section class="step-card cf-status" aria-labelledby="h-cf-status">'+
    '<div class="step-head"><h2 id="h-cf-status">'+L("เพื่อนยืนยันเมนู")+'</h2>'+
      '<span class="aside">'+L("ยืนยันแล้ว {done} จาก {total} คน", { done:c.done, total:c.total })+'</span></div>'+
    '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+c.total+'" aria-valuenow="'+c.done+'"><i style="width:'+pct+'%"></i></div>'+
    c.rows.map(function(x){
      var b = badge[x.status];
      return '<div class="cf-row'+(x.id === me ? ' me' : '')+'"><b>'+esc(x.name)+'</b>'+
        '<span class="cf-val">'+baht(amounts[x.id] || 0)+'</span><span class="badge '+b[0]+'">'+b[1]+'</span></div>';
    }).join("")+
    '<div class="cf-actions">'+
      '<button class="btn-sm" id="cfShare">'+ICON_SHARE+' '+L("ส่งลิงก์ให้เพื่อนยืนยัน")+'</button>'+
      '<a class="btn-quiet" href="#/g/'+esc(ui.ctx)+'/me">'+L("ยืนยันเมนูของฉัน")+'</a>'+
    '</div>'+
  '</section>';
}

/* =========================================================
   หน้าแนะนำ 3 หน้า (เปิดครั้งแรกที่หน้าแรก)
   ========================================================= */
var onboardStep = 0;
function onboardSlides(){
  return [
    { eyebrow:L("หารบิลให้สนุกขึ้นอีกนิด"), title:L("จ่ายตามที่กินจริง จบทุกมื้ออย่างแฟร์"),
      body:L("FairDish คิดค่าอาหารจากเมนูที่แต่ละคนกินจริง บวกค่าส่วนกลางให้อัตโนมัติ แล้วสรุปออกมาเป็นบิลรายคนที่ส่งเข้ากลุ่มได้ทันที"),
      art:'<div class="ob-art ob-receipt"><span class="ob-sun"></span>'+
        '<span class="blob purple" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 3v6a3 3 0 0 0 6 0V3M10 12v9M17 3v18M17 3c-2 1-3 4-3 7h3"/></svg></span>'+
        '<span class="blob coral" aria-hidden="true">&#247;</span>'+
        '<span class="blob mint" aria-hidden="true">'+ICON_CHECK+'</span>'+
        '<div class="receipt-wrap"><div class="receipt"><div class="r-title">'+L("ใบสรุปยอด")+'</div>'+
        '<div class="r-meta">'+L("8 คน · ร้านส้มตำหน้ามอ")+'</div>'+
        [["มาร์ค",151.67],["ไอซ์",250],["โฟรค์",61.66]].map(function(p){
          return '<div class="r-line"><span class="who">'+L(p[0])+'</span><span class="val">'+baht(p[1])+'</span></div>';
        }).join("")+
        '<div class="r-total"><span>'+L("รวมทั้งหมด")+'</span><span>1,110.00 ฿</span></div></div><div class="receipt-edge"></div></div></div>' },
    { eyebrow:L("เลือกคนที่กินแต่ละเมนู"), title:L("หารเฉพาะคนที่กินจานนั้น"),
      body:L("แตะชื่อคนที่กินจานนั้น ระบบหารเฉพาะคนที่แตะไว้ ไม่ใช่ทั้งโต๊ะ ส่วนน้ำแข็ง น้ำเปล่า ข้าวเหนียว หารเท่ากันทุกคน"),
      art:'<div class="ob-art"><span class="ob-sun mint"></span><div class="ob-card">'+
        '<div class="ob-dish"><b>'+L("ลาบหมู")+'</b><span>80.00</span></div>'+
        '<div class="pick"><button class="all" tabindex="-1">'+L("ทุกคน")+'</button>'+
        [["มาร์ค",1],["พูม",1],["ยูกะ",0],["ไอซ์",1],["โม",1]].map(function(p){
          return '<button tabindex="-1" aria-pressed="'+(!!p[1])+'">'+L(p[0])+'</button>';
        }).join("")+'</div>'+
        '<p class="ob-note">'+L("หาร {n} คน · คนละ {each} บาท", { n:4, each:baht(20) })+'</p></div></div>' },
    { eyebrow:L("ใหม่ในแอป"), title:L("ส่งลิงก์ให้เพื่อนยืนยันเมนูเอง"),
      body:L("เพื่อนเปิดลิงก์ เลือกชื่อตัวเอง แล้วติ๊กเมนูที่กิน ยอดของทุกคนอัปเดตให้ทันที"),
      art:'<div class="ob-art ob-list"><span class="ob-sun lilac"></span>'+
        '<div class="ob-link">fairdish.vercel.app/#/g/…/me</div>'+
        [["ยูกะ","ok"],["โฟรค์","ok"],["ชาเน่","wait"]].map(function(p){
          return '<div class="cf-row"><b>'+L(p[0])+'</b><span class="badge '+p[1]+'">'+(p[1]==="ok" ? L("ยืนยันแล้ว") : L("รอยืนยัน"))+'</span></div>';
        }).join("")+'</div>' }
  ];
}
function onboardHTML(){
  var s = onboardSlides(), cur = s[onboardStep], last = onboardStep === s.length - 1;
  return '<div class="ob-in">'+
    '<div class="ob-top"><span class="ob-logo"><img src="img/logo.png" alt="" width="32" height="32"><b>FairDish</b></span>'+
      langSwitch()+
      '<button type="button" class="ob-skip" data-ob-skip="1">'+L("ข้าม")+'</button></div>'+
    '<div class="ob-stage" aria-hidden="true">'+cur.art+'</div>'+
    '<p class="eyebrow">'+cur.eyebrow+'</p>'+
    '<h1 id="obTitle" tabindex="-1">'+cur.title+'</h1>'+
    '<p class="ob-body">'+cur.body+'</p>'+
    '<div class="ob-dots" aria-label="'+L("หน้า {n} จาก {total}", { n:onboardStep+1, total:s.length })+'">'+s.map(function(_, i){
      return '<i class="'+(i === onboardStep ? 'on' : '')+'"></i>'; }).join("")+'</div>'+
    '<button type="button" class="btn-main btn-block" data-ob-next="1">'+(last ? L("เริ่มใช้งาน") : L("ถัดไป"))+'</button>'+
    '<p class="ob-foot">'+L("ไม่ต้องสมัครสมาชิก · บันทึกบิลไว้ในเครื่องให้อัตโนมัติ")+'</p>'+
  '</div>';
}
async function maybeOnboard(){
  if (document.getElementById("onboard")) return;
  var seen = null;
  try { seen = await Store.readRaw(Store.onboardKey); } catch(e){ seen = "1"; }
  if (seen || currentPath() !== "/") return;
  showOnboard();
}
function showOnboard(){
  onboardStep = 0;
  var box = document.getElementById("onboard");
  if (!box){
    box = document.createElement("div");
    box.id = "onboard"; box.className = "onboard";
    box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true"); box.setAttribute("aria-labelledby","obTitle");
    document.body.appendChild(box);
  }
  box.innerHTML = onboardHTML();
  document.body.classList.add("ob-open");
}
function onboardNext(){
  if (onboardStep >= onboardSlides().length - 1) return closeOnboard();
  onboardStep++;
  var box = document.getElementById("onboard");
  if (box){ box.innerHTML = onboardHTML(); var t = document.getElementById("obTitle"); if (t) t.focus({ preventScroll:true }); }
}
function closeOnboard(){
  var box = document.getElementById("onboard");
  if (box) box.parentNode.removeChild(box);
  document.body.classList.remove("ob-open");
  Store.writeRaw(Store.onboardKey, "1").catch(function(){});
}
