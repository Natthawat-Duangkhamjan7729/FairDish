/* FairDish — v4.1: เพื่อนยืนยันเมนูของตัวเอง + หน้าชวนเพื่อนเข้ากลุ่ม
   ส่วนบน (itemsOf, confirmSig, confirmStatusOf, applyConfirm) ไม่แตะ DOM — ทดสอบได้ใน tests/confirm.test.js
   ตรรกะการยืนยันมาจาก v4.0 (session อื่น) แล้วจัดหน้าตาใหม่ตามดีไซน์ FairDish App v2 */
"use strict";

/* =========================================================
   การยืนยัน (ข้อมูลบิลแบบดิบ = รูปแบบเดียวกับที่ serialize() บันทึก)
   ========================================================= */
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
/** การยืนยันที่โหลดมา — เก็บเฉพาะรูปแบบที่ถูกต้อง */
function cleanConfirms(c){
  var out = {};
  if (!c || typeof c !== "object" || Array.isArray(c)) return out;
  Object.keys(c).forEach(function(id){
    var v = c[id];
    if (v && typeof v.sig === "string") out[String(id)] = { at:String(v.at || ""), sig:v.sig };
  });
  return out;
}

/* ---- งาน 4.3: ประวัติการเปลี่ยนสถานะของบิลกลุ่ม (log) — ใคร ทำอะไร เมื่อไร
   เก็บเฉพาะรหัสสมาชิกที่อยู่ในบิลอยู่แล้ว ไม่เก็บชื่อที่ให้เราเรียกหรือข้อมูลส่วนตัวอื่น (v4.2, v4.6) ---- */
var LOG_MAX = 100;
var LOG_EVENTS = ["create", "join", "confirm", "paid", "unpaid", "paidAll", "unpaidAll", "done"];
/** log ที่โหลดมา — เก็บเฉพาะรูปแบบที่ถูกต้อง เรียงตามเวลา ไม่เกิน LOG_MAX รายการล่าสุด */
function cleanLog(list){
  if (!Array.isArray(list)) return [];
  return list.filter(function(e){ return e && typeof e.id === "string" && typeof e.at === "string" && LOG_EVENTS.indexOf(e.ev) >= 0; })
    .map(function(e){
      var o = { id:e.id, at:e.at, ev:e.ev };
      ["by", "who", "to"].forEach(function(k){ if (e[k] != null && e[k] !== "") o[k] = String(e[k]); });
      if (e.amt != null && isFinite(Number(e.amt))) o.amt = Number(e.amt);
      return o;
    })
    .sort(function(a, b){ return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; })
    .slice(-LOG_MAX);
}
/** เพิ่มเหตุการณ์ลงบิลดิบ d (d.log) → รายการที่เพิ่ม */
function addLog(d, ev, extra){
  var e = { id:nid(), at:new Date().toISOString(), ev:ev };
  Object.keys(extra || {}).forEach(function(k){ if (extra[k] != null) e[k] = extra[k]; });
  d.log = cleanLog((d.log || []).concat([e]));
  return e;
}
/** รวม log สองเครื่องตอนบันทึกชนกัน (รายการเดียวกัน = id เดียวกัน) */
function mergeLogs(a, b){
  var seen = {}, all = [];
  cleanLog(a).concat(cleanLog(b)).forEach(function(e){ if (!seen[e.id]){ seen[e.id] = true; all.push(e); } });
  return cleanLog(all);
}

/* ---- ใช้กับบิลที่เปิดอยู่ ---- */
/** { done, total, rows:[{ id, name, status }] } */
function confirmSummary(){
  var d = serialize();
  var rows = state.members.map(function(p){ return { id:p.id, name:p.name, status:confirmStatusOf(d, p.id) }; });
  return { done:rows.filter(function(x){ return x.status === "confirmed"; }).length, total:rows.length, rows:rows };
}
/** บันทึกการยืนยันแบบรวมกับของเพื่อน — ชนกันก็ใส่ซ้ำบนข้อมูลล่าสุดให้เอง */
async function saveConfirm(memberId, selected){
  var id = ui.ctx;
  if (!id) return false;
  var data = JSON.parse(JSON.stringify(serialize())), version = Store.version;
  for (var tries = 0; tries < 4; tries++){
    if (!applyConfirm(data, memberId, selected)) return "missing";
    addLog(data, "confirm", { who:memberId, by:memberId });   // งาน 4.3
    data.savedAt = new Date().toISOString();
    var res = await Cloud.save(id, data, version);
    if (ui.ctx !== id) return false;
    if (res && res.ok){
      Store.version = res.version;
      Store.base = copyBill(data);
      applyBill(data);
      return true;
    }
    if (!res || res.missing || !res.data) return false;
    data = res.data; version = res.version;          // เพื่อนบันทึกไปก่อน → ใส่การติ๊กของเราบนข้อมูลล่าสุดแล้วลองใหม่
    if (res.name) Store.groupName = res.name;
  }
  return false;
}

/* =========================================================
   ลิงก์ที่ส่งให้เพื่อน = หน้ายืนยันเมนู #/g/<id>/me
   ========================================================= */
function confirmLink(id){ return groupLink(id) + "/me"; }
/** v4.8: ลิงก์ที่ส่งให้เพื่อน — มื้ออาหาร = หน้ายืนยันเมนู · ทริป = บิลทริปเดียวกัน (ทุกคนใส่ค่าใช้จ่ายเองได้) */
function inviteLink(id){ return state.kind === "trip" ? groupLink(id) : confirmLink(id); }
/** v4.8: ปุ่มชวนเพื่อนในบิลส่วนตัว — มื้ออาหารอยู่ท้ายบิล (ชวนมาตรวจยอด) · ทริปสร้างกลุ่มก่อนได้ */
function inviteLabel(){ return state.kind === "trip" ? L("สร้างกลุ่มทริป · ชวนเพื่อน") : L("ชวนเพื่อนตรวจยอด · ยืนยันเมนู"); }
function confirmHref(){ return ui.ctx ? "#/g/"+ui.ctx+"/me" : "#/split"; }
function shareHref(){ return ui.ctx ? "#/g/"+ui.ctx+"/share" : billHref(); }
/** v4.8.1: ย้อนกลับจากหน้าชวนเพื่อน = หน้าที่กดแชร์มา (หารบิล / ใบสรุปยอด — route() จำไว้ใน ui.shareBack)
    เปิดตรง ๆ หรือมาจากหน้าอื่น: ทริปกลับหน้าหารบิล (ไปใส่ค่าใช้จ่ายต่อ) มื้ออาหารกลับใบสรุปยอด */
function shareBackHref(){
  var p = ui.shareBack || (state.kind === "trip" ? "/split" : "/bill");
  return p === "/split" ? splitHref() : billHref();
}

/* =========================================================
   หน้าชวนเพื่อนเข้ากลุ่ม #/g/<id>/share (ดีไซน์ 2f)
   ========================================================= */
var CONFIRM_BADGE = {
  confirmed:["ok", "ยืนยันแล้ว"], pending:["warn", "รอยืนยัน"], changed:["changed", "แก้หลังยืนยัน"]
};
function pageShare(){
  if (!ui.ctx) return appBar({ back:"#/", title:L("ชวนเพื่อนเข้ากลุ่ม") })+
    '<div class="page"><p class="empty">'+L("เปิดจากบิลกลุ่มเท่านั้น")+'</p></div>';
  if (ui.groupError) return pageGroupError();
  var bar = appBar({ back:shareBackHref(), title:L("ชวนเพื่อนเข้ากลุ่ม"), sub:ui.loading ? "" : esc(Store.groupName) });
  if (ui.loading) return bar + '<div class="page"><p class="empty">'+L("กำลังโหลดข้อมูลกลุ่ม…")+'</p></div>';
  if (isWide()) return pageShareWide();                 // v4.4: QR | สถานะ | หน้าที่เพื่อนเห็น (wide.js)
  var link = inviteLink(ui.ctx), q = QR.encode(link);
  var c = confirmSummary();
  var amounts = {};
  if (hasData()) compute().list.forEach(function(p){ amounts[p.id] = p.rounded; });
  var me = myMemberId();
  var trip = state.kind === "trip";
  return bar + '<div class="page">'+
    '<p class="share-intro">'+shareIntro()+'</p>'+
    '<section class="share-card" aria-label="'+L("QR และลิงก์ของกลุ่ม")+'">'+
      (q ? '<div class="qr-card share-qr"><div class="qr-code">'+QR.svg(link, L("QR code ลิงก์กลุ่ม {name}", { name:esc(Store.groupName) }))+
        (q.version >= 4 ? '<span class="qr-logo"><img src="img/icon-192.png" alt=""></span>' : '')+'</div></div>' : '')+
      '<div class="share-info"><span class="share-name">'+esc(Store.groupName)+'</span>'+
        '<span class="share-url mono">'+esc(link.replace(/^https?:\/\//,""))+'</span>'+
        '<button class="btn-sm btn-xs" type="button" id="shareCopy">'+ICON_COPY+' '+L("คัดลอกลิงก์")+'</button></div>'+
    '</section>'+
    '<div class="btn-pair">'+
      '<button class="btn-line" type="button" id="shareNative">'+ICON_SHARE+' '+L("แชร์ทางอื่น")+'</button>'+
      '<button class="btn-line" type="button" id="shareSaveQr">'+ICON_SAVE_IMG+' '+L("บันทึกรูป QR")+'</button>'+
    '</div>'+
    (c.total && trip ? tripPeopleHTML(amounts, me) : c.total
      ? '<div class="list-title"><h2>'+L("ยืนยันแล้ว {done} จาก {total} คน", { done:c.done, total:c.total })+'</h2></div>'+
        '<div class="progress share-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+c.total+'" aria-valuenow="'+c.done+'"><i style="width:'+Math.round(c.done * 100 / c.total)+'%"></i></div>'+
        c.rows.map(function(x){
          var b = CONFIRM_BADGE[x.status];
          return '<div class="status-row'+(x.id === me ? ' me' : '')+'"><b>'+esc(x.name)+'</b>'+
            '<span class="mono">'+baht(amounts[x.id] || 0)+'</span><span class="badge '+b[0]+'">'+L(b[1])+'</span></div>';
        }).join("")
      : '<p class="empty" style="margin-top:var(--s5)">'+L("ยังไม่มีใครในบิลนี้ ใส่ชื่อในหน้าหารบิล หรือให้เพื่อนเพิ่มชื่อตัวเองตอนเปิดลิงก์")+'</p>')+
    '<div class="btn-stack">'+(trip
      ? '<a class="btn-main btn-block" href="'+splitHref()+'">'+L("ไปใส่ค่าใช้จ่าย")+'</a>'
      : '<a class="btn-line btn-block" href="'+confirmHref()+'">'+L("ยืนยันเมนูของฉัน · ดูหน้าที่เพื่อนเห็น")+'</a>')+'</div>'+
  '</div>';
}
function shareIntro(){
  return state.kind === "trip"
    ? L("ส่งลิงก์นี้ให้เพื่อนในทริป เปิดแล้วเลือกชื่อตัวเอง (หรือเพิ่มชื่อ) ทุกคนใส่ค่าใช้จ่ายที่ตัวเองจ่ายในบิลเดียวกันได้ตลอดทริป")
    : L("ส่งลิงก์นี้เข้ากลุ่ม เพื่อนสแกนหรือเปิดลิงก์ได้เลย ไม่ต้องสมัคร แต่ละคนเลือกชื่อตัวเองแล้วติ๊กเมนูที่กิน ยอดในบิลอัปเดตให้ทันที");
}
/* ---- v4.11: หน้าต่างชวนเพื่อน — ใช้แทนการเปิดหน้า #/g/<id>/share (หน้านั้นยังเปิดจากลิงก์ได้) ---- */
function shareDialogHTML(fresh){
  var link = inviteLink(ui.ctx), q = QR.encode(link), trip = state.kind === "trip";
  var c = confirmSummary(), me = myMemberId(), amounts = {};
  if (hasData()) compute().list.forEach(function(p){ amounts[p.id] = p.rounded; });
  return '<div class="install-head"><div><h2 id="shareTitle">'+(trip ? L("ชวนเพื่อนเข้ากลุ่มทริป") : L("ชวนเพื่อนเข้ากลุ่ม"))+'</h2>'+
      '<p>'+shareIntro()+'</p></div>'+
      '<button class="icon-btn" type="button" data-share-close="1" aria-label="'+L("ปิด")+'">'+ICON_X+'</button></div>'+
    '<section class="share-card" aria-label="'+L("QR และลิงก์ของกลุ่ม")+'">'+
      (q ? '<div class="qr-card share-qr"><div class="qr-code">'+QR.svg(link, L("QR code ลิงก์กลุ่ม {name}", { name:esc(Store.groupName) }))+
        (q.version >= 4 ? '<span class="qr-logo"><img src="img/icon-192.png" alt=""></span>' : '')+'</div></div>' : '')+
      '<div class="share-info"><span class="share-name">'+esc(Store.groupName)+'</span>'+
        '<span class="share-url mono">'+esc(link.replace(/^https?:\/\//,""))+'</span>'+
        '<button class="btn-sm btn-xs" type="button" id="shareCopy">'+ICON_COPY+' '+L("คัดลอกลิงก์")+'</button></div>'+
    '</section>'+
    '<div class="btn-pair">'+
      '<button class="btn-line" type="button" id="shareNative">'+ICON_SHARE+' '+L("แชร์ทางอื่น")+'</button>'+
      '<button class="btn-line" type="button" id="shareSaveQr">'+ICON_SAVE_IMG+' '+L("บันทึกรูป QR")+'</button>'+
    '</div>'+
    (!c.total ? '<p class="empty">'+L("ยังไม่มีใครในบิลนี้ ใส่ชื่อในหน้าหารบิล หรือให้เพื่อนเพิ่มชื่อตัวเองตอนเปิดลิงก์")+'</p>'
      : trip ? tripPeopleHTML(amounts, me)
      : '<div class="list-title"><h2>'+L("ยืนยันแล้ว {done} จาก {total} คน", { done:c.done, total:c.total })+'</h2></div>'+
        c.rows.map(function(x){
          var b = CONFIRM_BADGE[x.status];
          return '<div class="status-row'+(x.id === me ? ' me' : '')+'"><b>'+esc(x.name)+'</b>'+
            '<span class="mono">'+baht(amounts[x.id] || 0)+'</span><span class="badge '+b[0]+'">'+L(b[1])+'</span></div>';
        }).join(""))+
    logSectionHTML(fresh)+
    (trip ? '' : '<div class="btn-stack"><a class="btn-line btn-block" href="'+confirmHref()+'">'+L("ยืนยันเมนูของฉัน · ดูหน้าที่เพื่อนเห็น")+'</a></div>')+
    (canDissolve() ? '<button class="link-btn danger center dissolve-btn" type="button" data-dissolve="1">'+ICON_DEL+' '+L("ยุบกลุ่ม (คุณเป็นคนสร้าง)")+'</button>' : '');
}
function openShareDialog(){
  var box = document.getElementById("shareDialog");
  if (!box || !ui.ctx || ui.loading) return;
  var fresh = newLogIds();                          // งาน 4.3: ไฮไลต์รายการใหม่ครั้งนี้ แล้วนับว่าเห็นแล้ว
  box.innerHTML = shareDialogHTML(fresh);
  markLogSeen();
  if (!box.open){ if (typeof box.showModal === "function") box.showModal(); else box.setAttribute("open",""); }
  fitShareQr();
}
function closeShareDialog(){
  var box = document.getElementById("shareDialog");
  if (!box || !box.open) return;
  if (typeof box.close === "function") box.close(); else box.removeAttribute("open");
}
/** อัปเดตสด: เปิดหน้าต่างชวนเพื่อนค้างไว้ → รายชื่อ/สถานะเปลี่ยนตาม */
function refreshShareDialog(){
  var box = document.getElementById("shareDialog");
  if (box && box.open && ui.ctx) openShareDialog();
}
/* ---- งาน 4.3: ประวัติการเปลี่ยนสถานะ + จำนวนรายการใหม่ ---- */
/** บันทึกเหตุการณ์ของบิลกลุ่มที่เปิดอยู่ (บิลในเครื่อง/บิลฝึกไม่บันทึก) — by = คนที่เครื่องนี้เลือกว่าเป็นตัวเอง */
function logEvent(ev, extra){
  if (!ui.ctx || ui.tour) return;
  addLog(state, ev, Object.assign({ by:myMemberId() }, extra || {}));
}
/** ป้ายสถานะ + ข้อความของแต่ละเหตุการณ์ */
function logRowParts(e){
  var by = e.by && nameOf(e.by) ? esc(nameOf(e.by)) : "";
  var who = e.who ? (nameOf(e.who) ? esc(nameOf(e.who)) : L("คนที่ออกจากบิลแล้ว")) : "";
  var to = e.to ? (nameOf(e.to) ? esc(nameOf(e.to)) : L("คนที่ออกจากบิลแล้ว")) : "";
  var amt = baht(e.amt || 0);
  switch (e.ev){
    case "create":    return ["open", L("เริ่มกลุ่ม"), by ? L("{by} สร้างกลุ่มนี้", { by:by }) : L("สร้างกลุ่มนี้แล้ว")];
    case "join":      return ["open", L("คนใหม่"), L("{name} เข้ากลุ่ม", { name:who })];
    case "confirm":   return ["ok", L("ยืนยันแล้ว"), L("{name} ยืนยันเมนู", { name:who })];
    case "paid":      return ["ok", L("โอนแล้ว"), by ? L("{by} ติ๊กว่า {from} โอนให้ {to} {amt} บาทแล้ว", { by:by, from:who, to:to, amt:amt })
                                                     : L("มีคนติ๊กว่า {from} โอนให้ {to} {amt} บาทแล้ว", { from:who, to:to, amt:amt })];
    case "unpaid":    return ["warn", L("เอาติ๊กออก"), by ? L("{by} เอาติ๊ก {from} โอนให้ {to} ออก", { by:by, from:who, to:to })
                                                         : L("มีคนเอาติ๊ก {from} โอนให้ {to} ออก", { from:who, to:to })];
    case "paidAll":   return ["ok", L("โอนแล้ว"), by ? L("{by} ติ๊กว่าโอนครบทุกคน", { by:by }) : L("มีคนติ๊กว่าโอนครบทุกคน")];
    case "unpaidAll": return ["warn", L("เอาติ๊กออก"), by ? L("{by} เอาติ๊กโอนออกทั้งหมด", { by:by }) : L("มีคนเอาติ๊กโอนออกทั้งหมด")];
    case "done":      return ["ok", L("เสร็จแล้ว"), L("โอนครบทุกคน บิลนี้เสร็จแล้ว")];
  }
  return ["open", "", ""];
}
function logTime(at){
  var d = new Date(at);
  if (isNaN(d)) return "";
  var hm = d.toLocaleTimeString(dateLocale(), { hour:"2-digit", minute:"2-digit" });
  return d.toDateString() === new Date().toDateString() ? hm : shortDate(d) + " " + hm;
}
/** ส่วน "ความเคลื่อนไหว" ในหน้าต่างชวนเพื่อน — ใหม่ไปเก่า, fresh = id ที่เครื่องนี้ยังไม่เคยเห็น */
function logSectionHTML(fresh){
  var list = (state.log || []).slice().reverse();
  fresh = fresh || [];
  return '<div class="list-title log-title"><h2>'+L("ความเคลื่อนไหว")+'</h2>'+
      (fresh.length ? '<span class="badge changed">'+L("ใหม่ {n}", { n:fresh.length })+'</span>' : '')+'</div>'+
    (list.length
      ? '<ol class="log-list">'+list.map(function(e){
          var p = logRowParts(e);
          return '<li class="log-row'+(fresh.indexOf(e.id) >= 0 ? ' new' : '')+'"><time class="log-time mono" datetime="'+esc(e.at)+'">'+logTime(e.at)+'</time>'+
            '<span class="badge '+p[0]+'">'+p[1]+'</span><span class="log-text">'+p[2]+'</span></li>';
        }).join("")+'</ol>'
      : '<p class="empty">'+L("ยังไม่มีความเคลื่อนไหว เพื่อนเข้ากลุ่ม ยืนยันเมนู หรือติ๊กโอนแล้วจะขึ้นตรงนี้")+'</p>');
}
/** id ของเหตุการณ์ที่คนอื่นทำ และเครื่องนี้ยังไม่ได้เปิดดู (จำไว้ในเครื่องที่ myGroups[].seenLog) */
function newLogIds(){
  var g = ui.ctx && myGroup(ui.ctx);
  if (!g || ui.loading || ui.groupError) return [];
  var log = state.log || [];
  if (!Array.isArray(g.seenLog)){ g.seenLog = log.map(function(e){ return e.id; }); saveMyGroups(); return []; }   // เปิดกลุ่มครั้งแรก = เริ่มนับจากตอนนี้
  var me = myMemberId();
  return log.filter(function(e){ return g.seenLog.indexOf(e.id) < 0 && !(me && e.by === me); }).map(function(e){ return e.id; });
}
function markLogSeen(){
  var g = ui.ctx && myGroup(ui.ctx);
  if (!g || ui.loading || ui.groupError) return;
  var ids = (state.log || []).map(function(e){ return e.id; });
  if (JSON.stringify(ids) === JSON.stringify(g.seenLog)) return;
  g.seenLog = ids; saveMyGroups();
  paintNewCounts();
}
/** ตัวเลขรายการใหม่บนปุ่มที่เปิดหน้าต่างชวนเพื่อน (มือถือ #groupShare · จอใหญ่ ปุ่มชวนเพื่อนในพื้นที่ทำงาน) */
function paintNewCounts(){
  var n = newLogIds().length;
  Array.prototype.forEach.call(document.querySelectorAll("#groupShare, [data-side-invite]"), function(btn){
    var old = btn.querySelector(".new-count");
    if (old) btn.removeChild(old);
    if (n) btn.insertAdjacentHTML("beforeend", '<span class="new-count" aria-label="'+L("{n} รายการใหม่", { n:n })+'">'+n+'</span>');
  });
}

/** v4.8: ทริปไม่มีการยืนยันเมนู — แสดงคนในทริปกับยอดของแต่ละคนแทน */
function tripPeopleHTML(amounts, me){
  return '<div class="list-title"><h2>'+L("คนในทริป {n} คน", { n:state.members.length })+'</h2></div>'+
    state.members.map(function(p){
      return '<div class="status-row'+(p.id === me ? ' me' : '')+'"><b>'+esc(p.name)+(p.id === me ? ' <span class="me-tag">'+L("ฉัน")+'</span>' : '')+'</b>'+
        '<span class="mono">'+baht(amounts[p.id] || 0)+'</span></div>';
    }).join("");
}
function inviteText(){
  if (state.kind === "trip")
    return L("มาเข้ากลุ่มทริป \"{name}\" ใน FairDish กัน ✈️", { name:Store.groupName })+"\n"+
      L("กดลิงก์ เลือกชื่อตัวเอง แล้วใส่ค่าใช้จ่ายที่คุณจ่ายได้เลย ไม่ต้องสมัคร")+"\n"+inviteLink(ui.ctx);
  return L("มาช่วยกันหารบิล \"{name}\" ใน FairDish กัน 🍲", { name:Store.groupName })+"\n"+
    L("กดลิงก์ เลือกชื่อตัวเอง แล้วติ๊กเมนูที่กิน ไม่ต้องสมัคร")+"\n"+inviteLink(ui.ctx);
}
function shareGroupLink(){
  if (!ui.ctx) return;
  if (!navigator.share) return copyText(inviteText(), L("คัดลอกลิงก์พร้อมคำชวนแล้ว วางในแชตได้เลย"));
  navigator.share({ title:Store.groupName+" · FairDish", text:inviteText() }).catch(function(){});   // ผู้ใช้กดยกเลิก = ไม่ใช่ข้อผิดพลาด
}
function fitShareQr(){
  var card = document.querySelector(".share-qr");
  if (card) fitQr(card.parentNode, QR.encode(inviteLink(ui.ctx)));
}

/* =========================================================
   หน้าที่เพื่อนเห็น #/g/<id>/me (ดีไซน์ 1i): เลือกชื่อ → ติ๊กเมนู → ยืนยัน
   ========================================================= */
/** สมาชิกที่กำลังยืนยัน: เลือกในหน้านี้ หรือ "ฉันคือใคร" ที่จำไว้ */
function guestMember(){
  var id = ui.guestFor || myMemberId();
  return nameOf(id) ? id : null;
}
function guestSelection(me){
  if (!ui.guestSel || ui.guestSel.__for !== me){
    var sel = { __for:me };
    itemsOf(serialize()).forEach(function(it){ if (it.eaters.indexOf(me) >= 0) sel[it.key] = true; });
    ui.guestSel = sel;
  }
  return ui.guestSel;
}
/** ยอดของฉันถ้ายืนยันตามที่ติ๊กไว้ตอนนี้ (คิดจากบิลจริงทั้งใบ จึงตรงกับยอดหลังยืนยันพอดี) */
function guestPreview(me, sel){
  var d = JSON.parse(JSON.stringify(serialize()));
  applyConfirm(d, me, sel);
  var b = normalizeBill(d), r = computeBill(b);
  var mine = r.list.filter(function(p){ return p.id === me; })[0];
  return { total:mine ? mine.rounded : 0, items:itemsOf(d), shared:r.sharedTotal > 0, n:r.n };
}
function guestHead(){
  var host = state.members[0] ? state.members[0].name : L("เพื่อน");
  return '<div class="guest-top">'+
      '<img class="logo-mark" src="img/logo.png" alt="" width="32" height="32"><b class="home-brand">FairDish</b>'+
      '<a class="icon-btn guest-close" href="'+billHref()+'" aria-label="'+L("ปิด ไปใบสรุปยอด")+'">'+ICON_X+'</a></div>'+
    '<p class="eyebrow guest-invite">'+L("{name} ชวนคุณหารบิล", { name:esc(host) })+'</p>'+
    '<h1 class="guest-title">'+kt("icon")+' '+esc(Store.groupName)+'</h1>'+
    '<p class="guest-meta">'+L("{n} คน · {k} {items}", { n:state.members.length, k:itemsOf(serialize()).length, items:kt("items") })+'</p>';
}
function pageGuest(){
  if (!ui.ctx) return appBar({ back:"#/", title:L("ยืนยันเมนู") })+'<div class="page"><p class="empty">'+L("เปิดจากลิงก์กลุ่มเท่านั้น")+'</p></div>';
  if (ui.groupError) return pageGroupError();
  if (ui.loading) return '<div class="page page-guest"><p class="empty" style="margin-top:var(--s7)">'+L("กำลังโหลดบิล…")+'</p></div>';
  var me = guestMember();
  var html = '<div class="page page-guest">'+guestHead();

  // งาน 4.2: คนอื่นแก้รายการของเราหลังยืนยัน (อัปเดตสด) → กลับไปหน้าติ๊กพร้อมคำเตือน ไม่ค้างที่ "ยืนยันแล้ว"
  if (ui.guestDone && me && confirmStatusOf(serialize(), me) === "changed"){ ui.guestDone = false; ui.guestSel = null; }
  if (ui.guestDone && me){
    var mine = compute().list.filter(function(p){ return p.id === me; })[0];
    return html + '<section class="guest-done">'+
      '<span class="guest-done-ico">'+ICON_CHECK+'</span>'+
      '<h2>'+L("ยืนยันแล้ว")+'</h2>'+
      '<div class="guest-done-amt">'+baht(mine ? mine.rounded : 0)+' ฿</div>'+
      '<p>'+L("ยอดของคุณถูกส่งให้ทั้งโต๊ะแล้ว")+'</p>'+
      '<div class="btn-stack"><a class="btn-main btn-block" href="'+billHref()+'">'+L("ดูใบสรุปยอด")+'</a>'+
      '<button class="btn-line btn-block" type="button" data-guest-again="1">'+L("แก้เมนูที่ติ๊ก")+'</button></div>'+
    '</section></div>';
  }

  if (!me){
    var d = serialize();
    return html + '<section class="guest-card" aria-labelledby="h-guest-who">'+
      '<h2 id="h-guest-who">'+L("คุณคือใคร")+'</h2><p>'+L("เลือกชื่อของคุณในโต๊ะนี้")+'</p>'+
      // v4.9: มีชื่อที่ให้เราเรียกแล้ว → ปุ่มเดียวจบ (ชื่อตรงกับในบิล = เลือกคนนั้น ไม่ตรง = เพิ่มชื่อตัวเอง)
      (ui.myName ? '<button class="btn-main btn-block guest-join" type="button" data-guest-join="1">'+
        (myNameMemberId() ? L("ฉันคือ {name}", { name:esc(ui.myName) }) : L("เข้าร่วมในชื่อ {name}", { name:esc(ui.myName) }))+'</button>' : '')+
      (state.members.length
        ? '<div class="guest-who">'+state.members.map(function(p){
            var b = CONFIRM_BADGE[confirmStatusOf(d, p.id)];   // งาน 4.3: ทุกชื่อมีป้ายสถานะ
            return '<button type="button" data-guest-who="'+p.id+'">'+esc(p.name)+' <span class="badge '+b[0]+'">'+L(b[1])+'</span></button>';
          }).join("")+'</div>'
        : '<p class="empty">'+L("ยังไม่มีใครในบิลนี้")+'</p>')+
      '<div class="guest-add"><label class="label" for="guestName">'+L("ไม่มีชื่อคุณ? เพิ่มชื่อตัวเอง")+'</label>'+
        '<div class="field-row"><div><input type="text" id="guestName" maxlength="'+MAX_NAME+'" autocomplete="off" placeholder="'+L("พิมพ์ชื่อ เช่น มาร์ค")+'" aria-describedby="guestMsg"></div>'+
        '<button class="btn-quiet" type="button" data-guest-add="1">'+L("เพิ่ม")+'</button></div>'+
        '<p class="field-msg muted" id="guestMsg" aria-live="polite"></p></div>'+
    '</section></div>';
  }

  var sel = guestSelection(me);
  var pv = guestPreview(me, sel);
  var group = null, list = "";
  pv.items.forEach(function(it){
    if (it.group !== (group || "")){
      group = it.group;
      if (group) list += '<p class="list-head">🍲 '+esc(group)+'</p>';
    }
    var on = !!sel[it.key];
    var others = it.eaters.filter(function(e){ return e !== me && nameOf(e); });
    var k = others.length + (on ? 1 : 0) || 1;
    var sub = others.length
      ? others.slice(0,3).map(function(e){ return esc(nameOf(e)); }).join(" · ")+(others.length > 3 ? " +"+(others.length-3) : "")
      : (on ? L("คุณคนเดียว") : L("ยังไม่มีใครเลือก"));
    list += '<button type="button" class="guest-item'+(on ? ' on' : '')+'" data-guest-item="'+esc(it.key)+'" role="checkbox" aria-checked="'+on+'">'+
      '<span class="tf-box" aria-hidden="true">'+(on ? ICON_CHECK : '')+'</span>'+
      '<span class="guest-body"><b>'+esc(it.name)+'</b><span>'+sub+'</span></span>'+
      '<span class="guest-each mono">'+L("คนละ {amt}", { amt:baht(it.price / k) })+'</span></button>';
  });
  var st = confirmStatusOf(serialize(), me);
  return html +
    '<div class="guest-hello"><h2>'+L("สวัสดี {name}", { name:esc(nameOf(me)) })+'</h2><button class="link-btn" type="button" data-guest-change="1">'+L("ไม่ใช่ฉัน")+'</button></div>'+
    (st === "changed" ? '<div class="notice warn" style="margin:0 0 var(--s3)"><p>'+L("มีคนแก้รายการหลังคุณยืนยัน ลองตรวจอีกครั้งแล้วกดยืนยันใหม่")+'</p></div>' : '')+
    '<p class="list-head">'+L("ติ๊ก{items}ที่คุณมีส่วน", { items:kt("items") })+'</p>'+
    (list || '<p class="empty">'+L("บิลนี้ยังไม่มีรายการ")+'</p>')+
  '</div>'+
  '<div class="total-bar guest-bar">'+
    '<div class="t-sum"><span class="t-label">'+L("ยอดของคุณ")+'</span><span class="t-amt">'+baht(pv.total)+' ฿</span>'+
      (pv.shared ? '<span class="t-note">'+L("รวมค่าส่วนกลาง ÷ {n} แล้ว", { n:pv.n })+'</span>' : '')+'</div>'+
    '<button class="btn-main" type="button" data-guest-save="1"'+(ui.guestSaving ? ' disabled' : '')+'>'+
      (ui.guestSaving ? '<span class="spinner" aria-hidden="true"></span>'+L("กำลังบันทึก") : L("ยืนยันเมนู"))+'</button>'+
  '</div>';
}
function rerenderGuest(keepScroll){
  if (currentPath() !== "/me") return;
  var y = window.scrollY;
  document.getElementById("view").innerHTML = pageGuest();
  jumpTo(keepScroll ? y : 0);
  document.body.classList.toggle("has-total", !!document.querySelector(".guest-bar"));
}
function pickGuest(id){
  if (!nameOf(id)) return;
  ui.guestFor = id; ui.guestSel = null; ui.guestDone = false;
  var g = myGroup(ui.ctx);
  if (g){ g.me = id; g.asked = true; saveMyGroups(); }     // จำไว้ว่าเครื่องนี้คือใคร (ยอดของคุณในหน้าหารบิล)
  rerenderGuest();
}
async function addGuest(){
  var input = document.getElementById("guestName");
  if (!input) return;
  var name = input.value.trim().replace(/\s+/g," ");
  var problem = validateName(name, null);
  if (problem){ setFieldMsg("guestMsg", problem, true); return input.focus(); }
  var id = nid();
  state.members.push({ id:id, name:name });
  logEvent("join", { who:id, by:id });             // งาน 4.3
  var ok = await commit(L("เพิ่ม {name} แล้ว", { name:name }));
  if (!ok) return rerenderGuest();
  pickGuest(id);
}
function guestJoin(){
  var id = myNameMemberId();
  if (id) return pickGuest(id);
  var input = document.getElementById("guestName");
  if (!input || !ui.myName) return;
  input.value = ui.myName;
  addGuest();
}
function toggleGuestItem(key){
  var me = guestMember();
  if (!me) return;
  var sel = guestSelection(me);
  if (sel[key]) delete sel[key]; else sel[key] = true;
  rerenderGuest(true);
}
async function submitGuest(){
  var me = guestMember();
  if (!me || ui.guestSaving) return;
  ui.guestSaving = true;
  rerenderGuest(true);
  var sel = {};
  Object.keys(guestSelection(me)).forEach(function(k){ if (k !== "__for") sel[k] = true; });
  var res;
  try { res = await saveConfirm(me, sel); } catch(e){ res = false; }
  ui.guestSaving = false;
  if (res === true){
    ui.guestDone = true; ui.guestSel = null;
    rerenderGuest();
    toast(L("ยืนยันเมนูแล้ว ขอบคุณนะ 🙏"), "ok");
  } else {
    if (res === "missing"){ ui.guestFor = null; ui.guestSel = null; }
    rerenderGuest(true);
    toast(res === "missing" ? L("ไม่พบชื่อคุณในบิลแล้ว ลองเลือกชื่ออีกครั้ง") : L("ยืนยันไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"), "error");
  }
}
