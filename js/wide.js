/* FairDish — v4.4: หน้าจอใหญ่ (แท็บเล็ต/คอม ≥600px) ตามดีไซน์ "FairDish Wide"
   มือถือ (<600px) ใช้หน้าเดิมใน pages.js ทั้งหมด — ฟังก์ชันในไฟล์นี้ถูกเรียกเมื่อ isWide() เท่านั้น
   แถบนำทาง: แท็บเล็ต = แถบไอคอนซ้าย (rail) · คอม ≥1280px = แถบเมนูเต็ม (CSS ตัวเดียวกัน ต่างกันที่ media query) */
"use strict";

var ICON_FORK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 3v6a3 3 0 0 0 6 0V3M10 12v9M17 3v18M17 3c-2 1-3 4-3 7h3"/></svg>';
var ICON_HOME='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';
var ICON_CLOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
var ICON_UNDO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';

/** ตัวอักษรแรกของชื่อ (ไม่เอาสระหน้าของไทย เ แ โ ใ ไ) สำหรับวงกลมชื่อ */
function initialOf(name){
  var chars = Array.from ? Array.from(String(name || "")) : String(name || "").split("");
  for (var i = 0; i < chars.length; i++) if (!/[เแโใไ\s]/.test(chars[i])) return chars[i];
  return chars[0] || "?";
}
function avatarHTML(name, k){
  return '<span class="av av'+(k % 3)+'" aria-hidden="true">'+esc(initialOf(name))+'</span>';
}
function memberIndex(id){
  var k = 0;
  state.members.forEach(function(p, i){ if (p.id === id) k = i; });
  return k;
}
function kbd(key){ return '<kbd class="kbd">'+key+'</kbd>'; }

/* =========================================================
   แถบนำทางด้านซ้าย
   ========================================================= */
/** สถานะการโอนของบิลที่เปิดอยู่ "x/y" (ไม่รู้คนจ่าย/ยังไม่โหลด = "") */
function openBillPaidText(){
  if (ui.ctx === undefined || ui.loading || !state.members.length) return "";
  var b = normalizeBill(serialize());
  var r = computeBill(b), s = settleBill(r, b);
  if (!s.ok || !s.transfers.length) return "";
  var p = paidProgress(s.transfers, b.paid);
  return p.done + "/" + p.total;
}
function sideNavHTML(){
  var path = currentPath();
  var on = function(k){ return ({ home:path === "/", split:path === "/split", bill:path === "/bill", share:path === "/share",
    history:path === "/history" || path === "/groups" || path === "/h", more:path === "/more" || path === "/how" || path === "/about" })[k]; };
  var item = function(k, href, icon, label, extra){
    return '<a class="sn-item'+(on(k) ? ' on' : '')+'" href="'+href+'"'+(on(k) ? ' aria-current="page"' : '')+'>'+icon+
      '<span class="sn-text">'+label+'</span>'+(extra || '')+'</a>';
  };
  var paid = openBillPaidText();
  var share = "";   // v4.11: ชวนเพื่อนอยู่ที่ปุ่มขวาบนของหน้าหารบิล/ท้ายใบสรุปยอดอย่างเดียว (เปิดเป็นหน้าต่าง)
  // v4.15: บิลที่ยังไม่จบทุกใบเป็นหัวข้อ (ชื่อบิลจริง) มีลิงก์หารบิล / ใบสรุปยอดตัวเล็กข้างใต้ (เดิมเป็นลิงก์ "บิลที่เปิดอยู่" ใบเดียว)
  var openPart = navBillsHTML(path);
  return '<a class="sn-brand" href="#/"><img src="img/logo.png" alt="" width="36" height="36"><b>FairDish</b></a>'+
    '<button class="sn-new" type="button" data-open-kind="1" aria-haspopup="dialog" aria-label="'+L("เริ่มบิลใหม่")+'">'+ICON_PLUS+'<span class="sn-text">'+L("เริ่มบิลใหม่")+'</span></button>'+
    item("home", "#/", ICON_HOME, L("หน้าหลัก"))+
    openPart+
    share+
    '<div class="sn-sep" aria-hidden="true"></div>'+
    item("history", "#/history", ICON_CLOCK, L("ประวัติ"))+
    '<div class="sn-tip"><img src="img/mascot.png" alt="" width="62" height="62"><b>'+L("เคล็ดลับ")+'</b>'+
      '<span>'+L("กด {key} ในหน้าหารบิลเพื่อเพิ่มเมนูได้ทันที", { key:kbd("M") })+'</span></div>'+
    item("more", "#/more", ICON_SETTINGS, L("ตั้งค่า"));
}
/** "โอนแล้ว x/y" ของบิลใดก็ได้ (ไม่รู้คนจ่าย = "") */
function paidTextOf(data){
  var b = normalizeBill(data);
  if (!b.members.length) return "";
  var s = settleBill(computeBill(b), b);
  if (!s.ok || !s.transfers.length) return "";
  var p = paidProgress(s.transfers, b.paid);
  return p.done + "/" + p.total;
}
/** v4.15: บิลที่เปิดค้างอยู่ทุกใบ = บิลในเครื่อง (ถ้ามีข้อมูล) + บิลกลุ่มที่ขึ้นการ์ดในหน้าหลัก
 *  [{ key, name, icon, split, bill, paid, current }] — บิลที่เปิดอยู่ตอนนี้ใช้ข้อมูลสดจาก state */
function navOpenBills(){
  var live = ui.ctx !== undefined && !ui.loading && !ui.groupError;
  var list = [];
  var local = localBillNow();
  var groups = homeGroups().slice();
  if (live && ui.ctx && !groups.some(function(g){ return g.id === ui.ctx; })){
    var cur = myGroup(ui.ctx);
    if (cur) groups.unshift(cur);                     // กลุ่มที่เปิดอยู่แต่ไม่ได้ขึ้นการ์ดในหน้าหลัก (เก่าเกิน 30 วัน) ก็ยังต้องกลับไปได้
  }
  var snapOf = function(g){ return (live && ui.ctx === g.id) ? serialize() : g.snap; };
  // v4.15: บิลที่ติ๊กโอนครบแล้ว (จบแล้ว) ไม่อยู่ในแถบซ้าย
  if (billHasData(local) && !billDone(local) && !groups.some(function(g){ return sameBillContent(local, snapOf(g)); })){
    var lb = normalizeBill(local);
    list.push({ key:"local", name:savedBillName(local), icon:kindIconHTML(lb.kind), split:"#/split", bill:"#/bill",
      paid:paidTextOf(local), current:ui.ctx === null });
  }
  groups.forEach(function(g){
    var data = snapOf(g);
    if (!billHasData(data) || billDone(data)) return;
    list.push({ key:g.id, name:(live && ui.ctx === g.id && Store.groupName) || g.name, icon:kindIconHTML(normalizeBill(data).kind),
      split:"#/g/"+g.id, bill:"#/g/"+g.id+"/bill", paid:paidTextOf(data), current:ui.ctx === g.id, group:true });
  });
  // v4.15: บิลในประวัติที่ยังไม่จบ (ยังโอนไม่ครบ) ก็นับว่าเปิดค้างอยู่ — กดแล้วสลับมาเป็นบิลที่ทำอยู่ (บิลเดิมเข้าประวัติแทน)
  ui.history.filter(function(h){ return !billDone(h.data); }).slice(0, NAV_HIST_MAX).forEach(function(h){
    list.push({ key:h.id, name:h.name, icon:kindIconHTML(normalizeBill(h.data).kind), hist:true, paid:paidTextOf(h.data) });
  });
  return list;
}
var NAV_HIST_MAX = 6;

function navBillsHTML(path){
  var bills = navOpenBills();
  if (!bills.length) return '';
  return '<div class="sn-label">'+L("บิลที่เปิดอยู่")+'</div>'+bills.map(function(b){
    var here = b.current && (path === "/split" || path === "/bill");
    // บิลในประวัติเป็นปุ่ม (ต้องสลับเป็นบิลที่ทำอยู่ก่อน) บิลอื่นเป็นลิงก์ปกติ
    var go = function(where, cls, on, inner, title){
      var attrs = ' class="'+cls+(on ? ' on' : '')+'"'+(title ? ' title="'+esc(title)+'"' : '')+(on ? ' aria-current="page"' : '');
      return b.hist ? '<button type="button"'+attrs+' data-nav-open="'+esc(b.key)+':'+where+'">'+inner+'</button>'
                    : '<a'+attrs+' href="'+(where === "bill" ? b.bill : b.split)+'">'+inner+'</a>';
    };
    // v4.15: แต่ละบิลเป็น dropdown — แตะ/คลิกชื่อบิลครั้งแรก = กาง (ตัวรับใน events.js) กางอยู่แล้วแตะอีกครั้ง = เปิดหน้าหารบิล · บิลที่อยู่ตอนนี้กางไว้เสมอ
    var open = here || ui.navOpenKey === b.key;
    return '<div class="sn-bill'+(here ? ' here' : '')+(open ? ' open' : '')+'" data-nav-key="'+esc(b.key)+'">'+
      go("split", "sn-bhead", false, '<span class="sn-bico" aria-hidden="true">'+b.icon+'</span><span class="sn-bname">'+esc(b.name)+'</span>'+
        (b.group ? '<span class="sn-bgroup" title="'+L("บิลกลุ่ม")+'">'+ICON_USERS+'</span>' : '')+
        '<span class="sn-caret" aria-hidden="true">'+ICON_CHEVRON+'</span>', b.name)+
      '<div class="sn-subs">'+
        go("split", "sn-sub", here && path === "/split", ICON_FORK+'<span>'+L("หารบิล")+'</span>')+
        go("bill", "sn-sub", here && path === "/bill", ICON_COPY+'<span class="sn-long">'+L("ใบสรุปยอด")+'</span><span class="sn-short">'+L("สรุปยอด")+'</span>'+(b.paid ? ' <span class="sn-badge mono">'+b.paid+'</span>' : ''))+
      '</div></div>';
  }).join("");
}
/** วาดแถบซ้าย — ซ่อนบนมือถือ ตอนหน้าแนะนำ และหน้าที่เพื่อนเปิดมายืนยันเมนู (#/g/<id>/me) */
function renderSideNav(){
  var nav = document.getElementById("sidenav");
  if (!nav) return;
  var show = isWide() && !(currentPath() === "/" && (ui.showOnb || needName())) && currentPath() !== "/me";
  document.body.classList.toggle("has-side", show);
  nav.hidden = !show;
  nav.innerHTML = show ? sideNavHTML() : "";
}
/** ชวนเพื่อน: บิลกลุ่ม → หน้าชวนเพื่อน · บิลส่วนตัว → สร้างกลุ่มทันที (บิลว่างก็ได้ เพื่อนเพิ่มชื่อตัวเองตอนเปิดลิงก์)
    v4.5.3: เดิมบิลว่าง/ยังไม่โหลดจะพาไปใบสรุปยอดซึ่งไม่มีปุ่มชวน — ถ้าอยู่หน้านั้นอยู่แล้วกดแล้วไม่เกิดอะไรเลย */
async function sideInvite(){
  if (ui.tour) return inviteFromBill();                 // แจ้งว่าตอนฝึกยังชวนไม่ได้
  if (!Cloud.ready()) return toast(L("ระบบกลุ่มยังไม่เปิดใช้ในเว็บนี้ (ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์) ยังหารบิลในเครื่องได้ตามปกติ"),"error");
  if (ui.ctx) return openShareDialog();   // v4.11: หน้าต่างชวนเพื่อน ไม่เปลี่ยนหน้า
  if (ui.ctx === null && !ui.loading) return inviteFromBill();
  ui.inviteAfterLoad = true;                            // ยังไม่ได้โหลดบิลส่วนตัว → โหลดก่อนแล้วสร้างกลุ่มต่อ (refreshView)
  if (currentPath() === "/split" || currentPath() === "/bill") return;
  location.hash = "#/split";
}

/* =========================================================
   หน้าแนะนำ (หน้าเดียว)
   ========================================================= */
function pageOnboardWide(){
  var d = demoSummary(), dish = d.menu("ลาบหมู");   // งาน 3.1: ตัวเลขในภาพคำนวณจากบิลตัวอย่าง
  function who(n){ return d.bill.members.filter(function(x){ return x.name === L(n); })[0]; }
  return '<div class="w-onb">'+
    '<div class="w-onb-art" aria-hidden="true">'+
      '<i class="w-onb-sun"></i><i class="w-onb-ring"></i>'+
      '<span class="w-onb-brand"><img src="img/logo.png" alt="" width="40" height="40"><b>FairDish</b></span>'+
      '<img class="w-onb-mascot" src="img/mascot.png" alt="" width="480" height="480">'+
      '<div class="w-onb-receipt"><span class="w-onb-tag">'+L("ใบสรุปยอด")+'</span>'+
        ["มาร์ค","ไอซ์"].map(function(n){ return '<div><span>'+esc(L(n))+'</span><span class="mono">'+baht(d.by[L(n)].rounded)+'</span></div>'; }).join("")+
        '<div class="tot"><span>'+L("รวมทั้งหมด")+'</span><span class="mono">'+baht(d.r.grand)+' ฿</span></div></div>'+
      '<div class="w-onb-dish"><div class="top"><b>'+esc(dish.name)+'</b><span class="mono">'+baht(dish.price)+'</span></div>'+
        '<div class="chips">'+["มาร์ค","พูม","ยูกะ","ไอซ์","โม"].map(function(n){ var p = who(n);
          return '<span'+(dish.eaters.indexOf(p.id) >= 0 ? ' class="on"' : '')+'>'+esc(p.name)+'</span>'; }).join("")+'</div>'+
        '<p>'+L("หาร {n} คน · คนละ {amt} บาท", { n:dish.eaters.length, amt:baht(dish.price / dish.eaters.length) })+'</p></div>'+
    '</div>'+
    '<div class="w-onb-text">'+
      '<div class="w-onb-top">'+langSwitch()+'<button class="link-btn" type="button" data-onb-skip="1">'+L("ข้าม")+'</button></div>'+
      '<div class="w-onb-main">'+
        '<p class="eyebrow">'+L("หารค่าอาหารและค่าทริปกับเพื่อน")+'</p>'+
        '<h1>'+L("จ่ายเฉพาะเมนูที่คุณกิน")+'</h1>'+
        '<p class="w-onb-lead">'+L("สำหรับเพื่อนที่กินข้าวหรือเที่ยวด้วยกัน ใส่ว่าใครกินอะไร แล้วรู้ทันทีว่าใครต้องโอนให้ใคร")+'</p>'+
        '<div class="w-onb-steps">'+
          '<div class="w-onb-step"><span class="num">1</span><div><b>'+L("หารเฉพาะคนที่กินจานนั้น")+'</b>'+
            '<p>'+L("แตะชื่อคนที่กินแต่ละจาน ส่วนน้ำแข็ง น้ำเปล่า ข้าวเหนียว หารเท่ากันทุกคน")+'</p></div></div>'+
          '<div class="w-onb-step"><span class="num">2</span><div><b>'+L("ให้เพื่อนยืนยันเมนูเอง")+'</b>'+
            '<p>'+L("เพื่อนเปิดลิงก์หรือสแกน QR แล้วติ๊กเมนูที่กิน ยอดของทุกคนอัปเดตภายใน 3 วินาที")+'</p></div></div>'+
        '</div>'+
      '</div>'+
      '<div class="w-onb-actions">'+
        '<div class="w-onb-btns"><button class="btn-main" type="button" data-onb-start="1">'+L("เริ่มใช้งาน")+'</button>'+
          '<button class="btn-line" type="button" data-onb-demo="1">'+L("ดูบิลตัวอย่าง 8 คน")+'</button></div>'+
        '<p class="intro-note">'+L("ไม่ต้องสมัครสมาชิก · บันทึกบิลไว้ในเครื่องให้อัตโนมัติ")+'</p>'+
      '</div>'+
    '</div>'+
  '</div>';
}

/* =========================================================
   หน้าหลัก: บิลของฉัน
   ========================================================= */
function pageHomeWide(){
  return '<div class="wpage w-home">'+
    helloHTML()+
    '<div class="w-head"><h1>'+L("บิลของฉัน")+'</h1>'+langSwitch()+
      '<button class="install-btn" id="installBtn" type="button" aria-haspopup="dialog" hidden>'+ICON_INSTALL+'<span>'+L("ติดตั้งแอป")+'</span></button></div>'+
    '<div class="w-home-grid">'+
      '<div id="homeActive"></div>'+
      '<section class="w-start" aria-labelledby="h-w-start">'+
        '<div class="w-mascot-card"><img src="img/mascot.png" alt="" width="88" height="88">'+
          '<div><b id="h-w-start">'+L("เริ่มบิลใหม่")+'</b><span>'+L("ใส่ชื่อ ใส่เมนู แล้วส่งยอดเข้ากลุ่ม")+'</span></div></div>'+
        '<button class="kind-card meal" type="button" data-new-kind="meal"><span class="kind-ico" aria-hidden="true">'+kindIconHTML("meal")+'</span>'+
          '<span class="kind-text"><b>'+L("มื้ออาหาร")+'</b><span>'+L("หารตามเมนูที่กิน มีค่าบริการ/VAT")+'</span></span>'+kbd("M")+'</button>'+
        '<button class="kind-card trip" type="button" data-new-kind="trip"><span class="kind-ico" aria-hidden="true">'+kindIconHTML("trip")+'</span>'+
          '<span class="kind-text"><b>'+L("ทริป")+'</b><span>'+L("ระบุคนจ่ายแต่ละรายการ แล้วสรุปว่าใครโอนให้ใคร")+'</span></span>'+kbd("T")+'</button>'+
        tripGroupCard()+
      '</section>'+
    '</div>'+
    '<div id="homeRecent"></div>'+
    '<div id="homeIntro"></div>'+
  '</div>';
}
/** การ์ดบิลที่กำลังหาร (จอใหญ่) — มีวงกลมชื่อคน และบอกว่าใครจ่ายให้ร้าน */
function activeCardWide(saved, o, open){
  var c = cardLinks(saved, o);
  var b = normalizeBill(saved);
  var r = computeBill(b), s = settleBill(r, b);
  var prog = s.ok ? paidProgress(s.transfers, b.paid) : null;
  var payerNames = b.kind === "meal" ? b.payers.map(function(p){
    var m = b.members.filter(function(x){ return x.id === p.id; })[0];
    return m ? m.name : "";
  }).filter(Boolean) : [];
  var avs = b.members.slice(0, 6).map(function(p, k){ return '<span title="'+esc(p.name)+'">'+avatarHTML(p.name, k)+'</span>'; }).join("")+
    (b.members.length > 6 ? '<span class="av av-more" aria-hidden="true">+'+(b.members.length - 6)+'</span>' : '');
  return '<section class="w-active'+(prog && prog.all ? ' done' : '')+'" aria-labelledby="'+c.hid+'">'+
    '<div class="active-top">'+statusBadge(prog && prog.all, open)+
      '<span class="active-meta">'+(c.group ? L("บิลกลุ่ม")+' · ' : '')+L("{n} คน · {k} {items}", { n:b.members.length, k:b.menus.length, items:ktOf(b.kind,"items") })+'</span></div>'+
    '<div class="w-active-mid"><div class="w-active-sum"><h2 id="'+c.hid+'">'+kindIconHTML(b.kind)+' '+esc(c.name)+'</h2>'+
      '<div class="w-active-amt mono">'+baht(r.grand)+' <span>฿</span></div></div>'+
      '<div class="w-avs" aria-label="'+L("{n} คน", { n:b.members.length })+'">'+avs+'</div></div>'+
    (prog && prog.total
      ? '<div class="w-active-prog"><span>'+(prog.all ? L("โอนครบทุกคนแล้ว 🎉") : L("โอนแล้ว {done}/{total}", { done:prog.done, total:prog.total }))+'</span>'+
          (payerNames.length ? '<span class="muted">'+L("{name} จ่ายให้ร้านไปก่อน", { name:esc(payerNames.join(", ")) })+'</span>' : '')+'</div>'+
        '<div class="progress"><i style="width:'+Math.round(prog.done / prog.total * 100)+'%"></i></div>'
      : '<div class="w-active-prog"><span class="muted">'+(b.kind === "trip" ? L("ใส่คนจ่ายของแต่ละรายการ แล้วจะสรุปว่าใครโอนให้ใคร") : L("เลือกคนจ่ายให้ร้านในใบสรุปยอด แล้วจะสรุปว่าใครโอนให้ใคร"))+'</span></div>')+
    '<div class="btn-pair"><a class="btn-main" href="'+c.split+'">'+L("หารบิลต่อ")+'</a><a class="btn-line" href="'+c.bill+'">'+L("ดูใบสรุปยอด")+'</a></div>'+
  '</section>';
}
/** ยังไม่มีบิลที่กำลังหาร — แนะนำแอปแทน */
function emptyCardWide(){
  // งาน 1.5: ข้อความชิดซ้ายคู่กับใบสรุปยอดจริงของระบบ (demoReceiptHTML ตรงกับบิลตัวอย่าง)
  return '<section class="w-active w-welcome" aria-labelledby="h-welcome"><div class="w-welcome-text">'+
    '<p class="eyebrow">'+L("หารค่าอาหารและค่าทริปกับเพื่อน")+'</p>'+
    '<h2 id="h-welcome">'+L("จ่ายเฉพาะเมนูที่คุณกิน")+'</h2>'+
    '<p class="muted">'+L("สำหรับเพื่อนที่กินข้าวหรือเที่ยวด้วยกัน ใส่ว่าใครกินอะไร แล้วรู้ทันทีว่าใครต้องโอนให้ใคร")+'</p>'+
    '<div class="btn-pair"><button class="btn-line" type="button" data-start-demo="1">'+L("ดูบิลตัวอย่าง 8 คน")+'</button>'+
      '<a class="btn-line" href="#/how">'+L("ดูวิธีใช้")+'</a></div>'+
    '<p class="intro-note">'+L("ไม่ต้องสมัครสมาชิก · บันทึกบิลไว้ในเครื่องให้อัตโนมัติ")+'</p></div>'+
    '<div class="w-welcome-shot" aria-hidden="true">'+demoReceiptHTML()+'</div>'+
  '</section>';
}
/** บิลล่าสุด/ประวัติ เป็นข้อมูล (ใช้ทำการ์ดในหน้าแรกและรายการในหน้าประวัติ) */
function billEntries(){
  var groups = ui.myGroups.map(function(g){
    return { id:"g:"+g.id, group:g, kind:"group", icon:ktOf(g.kind,"icon"), name:g.name, at:g.at || 0,
      tag:g.done ? L("เสร็จแล้ว") : L("บิลกลุ่ม"), sub:g.at ? L("เปิดล่าสุด {date}", { date:shortDate(g.at) }) : "", amt:"", href:"#/g/"+g.id };
  });
  var hist = ui.history.map(function(h){
    var b = normalizeBill(h.data);
    return { id:h.id, hist:h, kind:b.kind, icon:ktOf(b.kind,"icon"), name:h.name, at:h.at || 0,
      tag:ktOf(b.kind,"name"), sub:L("{date} · {n} คน", { date:shortDate(h.at), n:b.members.length }),
      amt:baht(computeBill(b).grand), href:"#/h/"+h.id };
  });
  return { groups:groups, hist:hist };
}
function recentCardsWide(skip){
  var e = billEntries();
  var list = e.groups.filter(function(x){ return !(skip && skip[x.group.id]); }).concat(e.hist).sort(function(a, b){ return b.at - a.at; }).slice(0, 6);
  if (!list.length) return "";
  return '<div class="list-title"><h2>'+L("บิลล่าสุด")+'</h2><a class="link-btn" href="#/history">'+L("ดูทั้งหมด ›")+'</a></div>'+
    '<div class="w-recent">'+list.map(function(x){
      return '<a class="w-recent-card" href="'+x.href+'">'+
        '<span class="top"><span class="ico" aria-hidden="true">'+kindIconHTML(x.group ? x.group.kind : x.kind)+'</span><span class="tag tag-'+x.kind+'">'+esc(x.tag)+'</span></span>'+
        '<b>'+esc(x.name)+'</b>'+
        '<span class="bottom"><span>'+esc(x.sub)+'</span><span class="mono">'+x.amt+'</span></span></a>';
    }).join("")+'</div>';
}

/* =========================================================
   หน้าหารบิล: พื้นที่ทำงานสามคอลัมน์ (คน | รายการ | สรุปยอดสด)
   ========================================================= */
function wsActive(){ return !!document.getElementById("wsGrid"); }
function pageWorkspace(){
  var inMeal = !!ui.tripStash, inGroup = !!ui.ctx;
  var trip = state.kind === "trip" && !inMeal;
  var showShared = !trip;
  var title = inMeal ? '🍲 '+L("มื้ออาหารในทริป")
    : ((!inGroup && !ui.loading)
      ? '<button class="ws-name" type="button" data-rename="1" aria-label="'+L("เปลี่ยนชื่อบิล {name}", { name:esc(billName()) })+'">'+kt("icon")+' '+esc(billName())+' <span class="appbar-edit" aria-hidden="true">✎</span></button>'
      : kt("icon")+' '+esc(billName()));
  return '<div class="wpage w-ws">'+
    '<header class="ws-head">'+
      (inMeal ? '<button class="w-back" type="button" data-back-trip="1">'+ICON_BACK+'<span>'+L("กลับไปที่ทริป")+'</span></button>' : '')+
      '<div class="ws-title"><div class="ws-title-row"><h1>'+title+'</h1><span class="ws-badge" id="wsBadge"></span></div>'+
        '<div class="ws-sub" id="wsSub"></div></div>'+
      '<button class="ws-btn" type="button" id="wsUndo" aria-keyshortcuts="Control+Z">'+ICON_UNDO+'<span>'+L("เลิกทำ")+'</span></button>'+
      // v4.8: บิลมื้ออาหารส่วนตัวชวนเพื่อนท้ายใบสรุปยอด — ปุ่มบนพื้นที่ทำงานมีเฉพาะบิลกลุ่มกับทริป
      (inMeal || (!ui.ctx && state.kind !== "trip") ? '' : '<button class="ws-btn strong" type="button" data-side-invite="1">'+ICON_USERS+'<span>'+L("ชวนเพื่อน")+'</span></button>')+
    '</header>'+
    '<div class="ws-grid'+(inMeal ? ' in-meal' : '')+'" id="wsGrid">'+
      '<section class="ws-col ws-ppl" aria-labelledby="h-ws-ppl">'+
        '<div class="ws-col-head"><h2 id="h-ws-ppl">'+L("คนในบิล")+'</h2><span id="wsPplCount"></span></div>'+
        (inMeal ? '' :
          '<div class="field-row">'+
            '<div><label class="sr-only" for="memberInput">'+L("ชื่อคนในบิลนี้")+'</label>'+
            '<input type="text" id="memberInput" placeholder="'+L("พิมพ์ชื่อ เช่น มาร์ค")+'" autocomplete="off" maxlength="'+MAX_NAME+'" aria-describedby="memberMsg"></div>'+
            '<button class="btn-sm" id="memberAdd">'+L("เพิ่ม")+'</button>'+
          '</div>'+
          '<p class="field-msg muted" id="memberMsg" aria-live="polite"></p>')+
        '<div class="ws-people" id="wsPeople"></div>'+
        '<div id="memberExtra"></div>'+
        '<div class="ws-tip" id="wsTip"></div>'+
      '</section>'+
      '<section class="ws-col ws-menu" aria-labelledby="h-ws-menu">'+
        (inMeal ? '<div id="mealHead"></div>' : '')+
        '<div class="ws-col-head"><h2 id="h-ws-menu">'+(trip ? kt("itemsTitle") : L("เมนู"))+'</h2><span id="wsMenuMeta"></span></div>'+
        '<div class="ws-add" role="group" aria-label="'+kt("add")+'">'+
          '<div class="ws-name-wrap"><label class="sr-only" for="wsName">'+kt("nameLabel")+'</label>'+
          '<input type="text" id="wsName" placeholder="'+(trip ? kt("namePh") : L("ชื่อเมนู เช่น ส้มตำปู"))+'" autocomplete="off" maxlength="'+MAX_MENU_NAME+'" aria-keyshortcuts="M" '+
            'role="combobox" aria-expanded="false" aria-controls="wsSuggestList" aria-autocomplete="list">'+
          '<div id="wsSuggest"></div></div>'+
          '<label class="sr-only" for="wsPrice">'+kt("pricePh")+'</label>'+
          '<input type="number" id="wsPrice" inputmode="decimal" step="0.01" min="0" placeholder="'+L("ราคา")+'" class="mono">'+
          '<button class="btn-sm" type="button" id="wsAdd">'+L("+ เพิ่ม")+' '+kbd("M")+'</button>'+
          (trip ? '<button class="btn-line btn-xs" type="button" data-add-meal="1">'+L("+ มื้ออาหาร 🍲")+'</button>' : '')+
        '</div>'+
        '<p class="field-msg muted" id="wsAddMsg" aria-live="polite"></p>'+
        '<div class="ws-cards" id="wsMenus"></div><div id="menuFormSlot"></div>'+
        (showShared ? '<section class="ws-shared" aria-labelledby="h-ws-shared">'+
          '<h3 id="h-ws-shared">'+L("ค่าส่วนกลาง")+'</h3><p class="hint">'+L("คิดเป็น % จากยอดของแต่ละคน")+'</p>'+
          '<div class="pick" id="chargeList"></div><div id="chargeFormSlot"></div>'+
          '<p class="sub-head">'+L("หารเท่ากันทุกคน")+'</p>'+
          '<div id="sharedList"></div><div id="sharedFormSlot"></div></section>' : '')+
        resetConfirmHTML()+
        (inMeal ? '<div class="app-foot"><button class="danger-link" data-del-meal="1">'+ICON_DEL+' '+L("ลบมื้อนี้")+'</button></div>'
          : '<div class="app-foot">'+(inGroup ? '' : '<button id="demoBtn">'+L("ใส่ข้อมูลตัวอย่าง")+'</button>')+
              '<button id="resetBtn">'+ICON_DEL+' '+L("ล้างข้อมูลทั้งหมด")+'</button></div>')+
      '</section>'+
      '<aside class="ws-col ws-sum" aria-label="'+L("สรุปยอดสด")+'"><div id="wsSum"></div></aside>'+
    '</div>'+
  '</div>';
}
/** กล่องยืนยันการล้างข้อมูล (ใช้ทั้งหน้ามือถือและจอใหญ่) */
function resetConfirmHTML(){
  if (!ui.confirmReset) return "";
  var inGroup = !!ui.ctx;
  return '<div class="confirm" role="alertdialog" aria-label="'+L("ยืนยันการล้างข้อมูล")+'">'+
    '<h3>'+L("ล้างข้อมูลทั้งหมดในบิลนี้?")+'</h3>'+
    '<p>'+L("รายชื่อและรายการทั้งหมดจะถูกล้างออก")+(inGroup ? " <b>"+L("ทุกคนในกลุ่มจะเห็นบิลว่างด้วย")+"</b>" : "")+'</p>'+
    (inGroup ? '<label class="confirm-type" for="resetConfirmName">'+L("พิมพ์ชื่อกลุ่ม")+' <b>'+esc(Store.groupName)+'</b> '+L("เพื่อยืนยัน")+'</label>'+
      '<input type="text" id="resetConfirmName" autocomplete="off" placeholder="'+esc(Store.groupName)+'">' : '')+
    '<div class="btn-row"><button class="btn-quiet" id="cancelReset">'+L("ยกเลิก")+'</button>'+
    '<button class="btn-danger" id="confirmReset"'+(inGroup ? ' disabled' : '')+'>'+ICON_DEL+' '+L("ล้างข้อมูล")+'</button></div></div>';
}
function renderWorkspace(){
  if (!wsActive()) return;
  renderWsHead(); renderWsPeople(); renderWsMenus(); renderWsSum();
}
function renderWsHead(){
  var badge = document.getElementById("wsBadge"), sub = document.getElementById("wsSub"), undo = document.getElementById("wsUndo");
  if (undo) undo.disabled = !wsUndoReady();
  if (!badge || !sub) return;
  var status = ({ saving:L("กำลังบันทึก…"), error:L("บันทึกไม่สำเร็จ"), loading:L("กำลังโหลด…") })[ui.save] || (ui.ctx ? L("ซิงก์แล้ว") : L("บันทึกแล้ว"));
  badge.textContent = (ui.ctx ? L("บิลกลุ่ม") : L("บิลส่วนตัว")) + " · " + status;
  badge.className = "ws-badge" + (ui.save === "error" ? " error" : "");
  if (ui.loading){ sub.textContent = L("กำลังโหลดข้อมูลบิล…"); return; }
  var me = ui.ctx ? myMemberId() : null;
  sub.innerHTML = esc(L("{n} คน · {k} {items}", { n:state.members.length, k:state.menus.length, items:kt("items") }))+' · '+
    esc(L("ลากชื่อไปวางบนรายการ หรือแตะชื่อในการ์ด"))+
    (ui.ctx ? ' · <button class="link-btn ws-me" type="button" data-ws-me="1">'+(me ? L("คุณคือ {name}", { name:esc(nameOf(me)) }) : L("เลือกว่าคุณคือใคร ›"))+'</button>' : '');
}
function renderWsPeople(){
  var box = document.getElementById("wsPeople");
  if (!box) return;
  var inMeal = !!ui.tripStash;
  var addBtn = document.getElementById("memberAdd"), input = document.getElementById("memberInput"), msg = document.getElementById("memberMsg");
  if (addBtn){
    addBtn.disabled = ui.savingMember;
    addBtn.innerHTML = ui.savingMember ? '<span class="spinner" aria-hidden="true"></span>'+L("กำลังบันทึก") : L("เพิ่ม");
  }
  if (input) input.setAttribute("aria-invalid", ui.memberError ? "true" : "false");
  if (msg){
    msg.className = "field-msg " + (ui.memberError ? "error" : "muted");
    msg.textContent = ui.memberError || (state.members.length ? L("แตะชื่อเพื่อดูเฉพาะรายการของคนนั้น") : L("ใส่ได้ทั้งชื่อจริงและชื่อเล่น สั้น ๆ อ่านง่ายที่สุด"));
  }
  var count = document.getElementById("wsPplCount");
  if (count) count.textContent = (!ui.loading && state.members.length) ? L("{n} คน", { n:state.members.length }) : "";
  if (ui.loading){ box.innerHTML = '<div class="skeleton" aria-hidden="true"><i></i><i></i><i></i></div>'; return; }
  if (ui.wsFocus && !nameOf(ui.wsFocus)) ui.wsFocus = null;
  var r = hasData() ? compute() : null;
  var tot = {};
  if (r) r.list.forEach(function(p){ tot[p.id] = p.rounded; });
  box.innerHTML = state.members.length ? state.members.map(function(p, k){
    if (ui.editingMember === p.id){
      return '<div class="ws-person editing">'+avatarHTML(p.name, k)+
        '<label class="sr-only" for="editMemberInput">'+L("แก้ชื่อ {name}", { name:esc(p.name) })+'</label>'+
        '<input type="text" id="editMemberInput" value="'+esc(p.name)+'" maxlength="'+MAX_NAME+'" autocomplete="off">'+
        '<div class="ws-person-acts">'+
          '<button class="btn-sm btn-xs" data-save-member="'+p.id+'">'+L("บันทึก")+'</button>'+
          '<button class="btn-quiet btn-xs" data-cancel-edit="1">'+L("ยกเลิก")+'</button>'+
          '<button class="link-btn danger" data-del-member="'+p.id+'">'+ICON_DEL+' '+L("ลบ")+'</button></div></div>';
    }
    var on = ui.wsFocus === p.id;
    var n = menusOf(p.id).length;
    return '<div class="ws-person'+(on ? ' on' : '')+'" draggable="true" data-ws-drag="'+p.id+'">'+
      '<button class="ws-person-tap" type="button" data-ws-focus="'+p.id+'" aria-pressed="'+on+'" aria-label="'+L("ดูเฉพาะรายการของ {name}", { name:esc(p.name) })+'">'+
        avatarHTML(p.name, k)+
        '<span class="ws-pname"><b>'+esc(p.name)+'</b><span>'+L("{n} รายการ", { n:n })+'</span></span>'+
        '<span class="mono ws-pamt">'+baht(tot[p.id] || 0)+'</span></button>'+
      '<span class="ws-grip" aria-hidden="true" title="'+L("ลากไปวางบนรายการ")+'">⋮⋮</span>'+
      (on && !inMeal ? '<div class="ws-person-acts"><button class="link-btn" data-edit-member="'+p.id+'">'+L("แก้ชื่อ")+'</button>'+
        '<button class="link-btn danger" data-del-member="'+p.id+'">'+ICON_DEL+' '+L("ลบ")+'</button></div>' : '')+
    '</div>';
  }).join("") : '<p class="empty">'+kt("noPeople")+'</p>';

  var extra = document.getElementById("memberExtra");
  if (extra) extra.innerHTML = memberExtraHTML();
  var tip = document.getElementById("wsTip");
  if (tip){
    var f = ui.wsFocus;
    tip.innerHTML = state.members.length ? '<img src="img/mascot.png" alt="" width="58" height="58"><div>'+
      (f ? '<b>'+L("กำลังดูเฉพาะของ {name}", { name:esc(nameOf(f)) })+'</b><br>'+L("รายการที่ไม่ได้มีส่วนจะจางลง แตะชื่ออีกครั้งหรือกด Esc เพื่อดูทั้งหมด")
         : '<b>'+L("ลากชื่อไปวางบนรายการ")+'</b><br>'+L("หรือแตะชื่อเพื่อดูเฉพาะรายการที่คนนั้นมีส่วน"))+'</div>' : "";
  }
  if (ui.editingMember){
    var ed = document.getElementById("editMemberInput");
    if (ed && document.activeElement !== ed){ ed.focus(); ed.select(); }
  }
}
function renderWsMenus(){
  var box = document.getElementById("wsMenus");
  if (!box) return;
  var meta = document.getElementById("wsMenuMeta");
  if (ui.loading){
    if (meta) meta.textContent = "";
    box.innerHTML = '<div class="skeleton" aria-hidden="true"><i style="width:100%"></i></div>';
    return;
  }
  var r = compute();
  if (meta) meta.textContent = state.menus.length ? L("{k} รายการ · {amt} ฿", { k:state.menus.length, amt:baht(r.foodTotal) }) : "";
  var trip = state.kind === "trip" && !ui.tripStash;
  var hint = state.members.length ? '' :
    '<div class="notice info"><p>'+L("ยังไม่มีใครในบิลนี้ ใส่ชื่อก่อน แล้วค่อยเลือกว่าใครมีส่วนในรายการไหน")+'</p></div>';
  box.innerHTML = hint + (state.menus.length ? state.menus.map(function(m){
    return m.type === "meal" ? wsMealCard(m) : wsMenuCard(m, trip);
  }).join("") : '<p class="empty">'+kt("empty")+'</p>');
}
function wsMenuCard(m, trip){
  var known = m.eaters.filter(function(id){ return !!nameOf(id); });
  var all = state.members.length > 0 && known.length === state.members.length;
  var dim = ui.wsFocus && known.indexOf(ui.wsFocus) < 0;
  var unpaid = trip && !knownPayers(m).length;
  var note = !known.length ? ['warn', L("ยังไม่มีใครมีส่วน ลากชื่อมาวางหรือแตะชื่อด้านล่าง")]
    : (unpaid ? ['warn', L("ยังไม่เลือกคนจ่าย")]
    : ['ok', all ? L("หารทุกคน · คนละ {amt} บาท", { amt:baht(m.price / known.length) })
                 : L("หาร {n} คน · คนละ {amt} บาท", { n:known.length, amt:baht(m.price / known.length) })]);
  return '<article class="ws-card'+(dim ? ' dim' : '')+(note[0] === 'warn' ? ' warn' : '')+'" data-ws-drop="'+m.id+'" aria-label="'+esc(m.name)+'">'+
    '<button class="ws-card-head" type="button" data-edit-menu="'+m.id+'" aria-label="'+L("แก้ไข {name}", { name:esc(m.name) })+'">'+
      '<b>'+esc(m.name)+'</b><span class="mono">'+baht(m.price)+'</span></button>'+
    (trip ? '<div class="ws-payrow"><span class="label">'+L("ใครจ่าย")+'</span>'+
      payerPickHTML(knownPayers(m), "data-ws-pay", L("ใครจ่ายรายการนี้"), m.id+":")+'</div>' : '')+
    (state.members.length ? '<div class="pick ws-picks" role="group" aria-label="'+L("ใครมีส่วนใน {name}", { name:esc(m.name) })+'">'+
      '<button class="all" data-ws-all="'+m.id+'" aria-pressed="'+all+'">'+L("ทุกคน")+'</button>'+
      state.members.map(function(p){
        return '<button data-ws-eat="'+m.id+':'+p.id+'" aria-pressed="'+(known.indexOf(p.id) >= 0)+'">'+esc(p.name)+'</button>';
      }).join("")+'</div>' : '')+
    '<p class="ws-note '+note[0]+'">'+note[1]+'</p>'+
  '</article>';
}
function wsMealCard(m){
  var sub = mealTotalOf(m), n = mealOf(m).menus.length;
  var paidBy = payerText(m), unpaid = sub.grand > 0 && !paidBy;
  return '<article class="ws-card ws-meal'+(unpaid ? ' warn' : '')+'">'+
    '<button class="ws-card-head" type="button" data-open-meal="'+m.id+'" aria-label="'+L("เปิดมื้อ {name}", { name:esc(m.name) })+'">'+
      '<b>🍲 '+esc(m.name)+'</b><span class="mono">'+baht(sub.grand)+'</span></button>'+
    '<p class="ws-note '+(unpaid ? 'warn' : 'ok')+'">'+
      (unpaid ? L("ยังไม่เลือกคนจ่าย") : paidBy)+
      ((unpaid || paidBy) ? ' · ' : '')+(n ? L("{n} เมนู", { n:n }) : L("ยังไม่มีเมนู"))+'</p>'+
    '<button class="btn-line btn-xs" type="button" data-open-meal="'+m.id+'">'+L("เปิดมื้อนี้ ›")+'</button>'+
  '</article>';
}
function renderWsSum(){
  var box = document.getElementById("wsSum");
  if (!box) return;
  var inMeal = !!ui.tripStash;
  if (ui.loading){ box.innerHTML = '<p class="empty">'+L("กำลังโหลดข้อมูล…")+'</p>'; return; }
  if (!state.members.length){ box.innerHTML = '<p class="empty">'+kt("emptySummary")+'</p>'; return; }
  var r = compute();
  var me = myMemberId();
  var lines = r.list.map(function(p){
    var on = ui.wsFocus === p.id;
    return '<button class="r-line'+(on ? ' on' : '')+(p.id === me ? ' me' : '')+'" type="button" data-ws-focus="'+p.id+'" aria-pressed="'+on+'">'+
      '<span class="who">'+esc(p.name)+(p.id === me ? ' <span class="me-tag">'+L("ฉัน")+'</span>' : '')+'</span><span class="val">'+baht(p.rounded)+'</span></button>';
  }).join("");
  var sums = '<div><span>'+kt("sumLabel")+'</span><span>'+baht(r.foodTotal)+'</span></div>';
  if (state.kind !== "trip" || inMeal){
    sums += '<div><span>'+L("หารเท่ากัน")+'</span><span>'+baht(r.sharedTotal)+'</span></div>';
    var on = state.charges.filter(function(c){ return c.on; });
    sums += '<div><span>'+(on.length ? on.map(function(c){ return (c.fixed ? L(c.label) : esc(c.label))+' '+c.rate+'%'; }).join(" + ") : L("ค่าบริการ / VAT"))+'</span><span>'+baht(r.chargeTotal)+'</span></div>';
  }
  box.innerHTML = (r.orphan > 0 ? '<div class="notice warn"><p>'+L("มี {n} {what} จึงยังไม่ถูกรวมในบิลนี้", { n:r.orphan, what:kt("orphan") })+'</p></div>' : '')+
    '<div class="receipt-wrap ws-receipt"><div class="receipt">'+
      '<div class="r-title">'+L("สรุปยอดสด")+'</div>'+
      '<div class="r-meta">'+L("{n} คน · {k} {items}", { n:r.n, k:state.menus.length, items:kt("items") })+'</div>'+
      lines+
      '<div class="r-sum">'+sums+'</div>'+
      '<div class="r-total"><span>'+L("รวมทั้งหมด")+'</span><span>'+baht(r.grand)+' ฿</span></div>'+
    '</div><div class="receipt-edge"></div></div>'+
    (inMeal ? '<button class="btn-main btn-block" type="button" data-back-trip="1">'+L("กลับไปที่ทริป")+'</button>'
            : '<a class="btn-main btn-block" href="'+billHref()+'">'+L("ดูใบสรุปยอด · ใครโอนให้ใคร")+'</a>');
}

/* ---- การกระทำในพื้นที่ทำงาน ---- */
/** เลิกทำ: เก็บสำเนาข้อมูลก่อนแก้ (สูงสุด 20 ครั้ง) — ผูกกับบิล/มื้อที่เปิดอยู่ เปลี่ยนบิลแล้วล้าง */
function wsScope(){ return (ui.ctx || "local") + "|" + (ui.tripStash ? ui.tripStash.mealId : ""); }
function wsUndoReady(){ return !!(ui.wsPast && ui.wsPast.length && ui.wsPast[ui.wsPast.length - 1].scope === wsScope()); }
function pushUndo(){
  if (!ui.wsPast || (ui.wsPast.length && ui.wsPast[ui.wsPast.length - 1].scope !== wsScope())) ui.wsPast = [];
  ui.wsPast.push({ scope:wsScope(), data:JSON.stringify({ members:state.members, menus:state.menus, shared:state.shared,
    charges:state.charges, payers:state.payers, paid:state.paid }) });
  if (ui.wsPast.length > 20) ui.wsPast.shift();
}
async function wsUndo(){
  if (!wsUndoReady()) return;
  var d = JSON.parse(ui.wsPast.pop().data);
  state.members = d.members; state.menus = d.menus; state.shared = d.shared;
  state.charges = d.charges; state.payers = d.payers; state.paid = d.paid;
  render();
  await commit(L("เลิกทำแล้ว"));
  render();
}
function wsMenu(id){ return state.menus.filter(function(m){ return m.id === id; })[0]; }
async function wsToggleEater(menuId, pid, forceOn){
  var m = wsMenu(menuId);
  if (!m || !nameOf(pid)) return;
  var has = m.eaters.indexOf(pid) >= 0;
  if (forceOn && has) return;
  pushUndo();
  m.eaters = has ? m.eaters.filter(function(x){ return x !== pid; }) : m.eaters.concat([pid]);
  render();
  await commit(null, "menu");
  render();
}
async function wsToggleAll(menuId){
  var m = wsMenu(menuId);
  if (!m) return;
  var ids = state.members.map(function(p){ return p.id; });
  var all = ids.length && ids.every(function(id){ return m.eaters.indexOf(id) >= 0; });
  pushUndo();
  m.eaters = all ? [] : ids;
  render();
  await commit(null, "menu");
  render();
}
/** v4.15: แตะชื่อ = เพิ่ม/เอาออกจากคนจ่ายรายการนี้ (จ่ายด้วยกันหลายคนได้) */
async function wsSetPayer(menuId, pid){
  var m = wsMenu(menuId);
  if (!m || !nameOf(pid)) return;
  pushUndo();
  setPayersOf(m, togglePayerIn(knownPayers(m), pid));
  if (knownPayers(m).length) ui.lastPayers = knownPayers(m);
  render();
  await commit(null, "menu");
  render();
}
/** เพิ่มรายการจากช่องบรรทัดเดียว — v4.15: ยังไม่มีใครมีส่วน ให้แตะ/ลากชื่อคนที่กินเอง (ไม่เลือกทุกคนให้) */
async function wsAddMenu(){
  var nameEl = document.getElementById("wsName"), priceEl = document.getElementById("wsPrice"), msg = document.getElementById("wsAddMsg");
  if (!nameEl || !priceEl || ui.savingMenu) return;
  var ids = state.members.map(function(p){ return p.id; });
  var f = { name:nameEl.value, price:priceEl.value, eaters:ids };   // ตรวจแค่ชื่อ/ราคา/มีคนในบิล — คนกินและคนจ่ายเลือกบนการ์ด
  var e = validateMenuForm(f);
  var problem = e.name || e.price || e.eaters;
  if (problem){
    if (msg){ msg.className = "field-msg error"; msg.textContent = problem; }
    (e.name ? nameEl : (e.price ? priceEl : (document.getElementById("memberInput") || nameEl))).focus();
    return;
  }
  var name = String(f.name).trim().replace(/\s+/g, " ");
  var price = parseFloat(String(f.price));
  var item = { id:nid(), name:name, price:price, eaters:[] };
  if (state.kind === "trip" && !ui.tripStash) setPayersOf(item, defaultPayers());
  pushUndo();
  state.menus.unshift(item);
  closeWsSuggest();
  nameEl.value = ""; priceEl.value = "";
  if (msg){ msg.className = "field-msg muted"; msg.textContent = ""; }
  ui.savingMenu = true;
  render();
  nameEl.focus();
  await commit(L("เพิ่ม {name} {amt} บาท แล้ว", { name:name, amt:baht(price) }), "menu");
  await rememberMenu(name, price);
  ui.savingMenu = false;
  render();
}
/* ---- เมนูแนะนำในช่องบรรทัดเดียว (ใช้ menuSuggestions() / suggestBoxHTML() เดียวกับฟอร์มแผ่น) ---- */
function renderWsSuggest(){
  var box = document.getElementById("wsSuggest"), input = document.getElementById("wsName");
  if (!box || !input) return;
  var st = ui.wsSuggest || (ui.wsSuggest = { open:false, items:[], active:-1 });
  var query = input.value;
  var found = st.open ? menuSuggestions(query) : { items:[], total:0 };
  st.items = found.items;
  if (st.active >= st.items.length) st.active = -1;
  if (!st.items.length){
    box.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-activedescendant", "");
    return;
  }
  box.innerHTML = suggestBoxHTML(found, query, st.active, "wsSuggest", "data-ws-suggest");
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("aria-activedescendant", st.active >= 0 ? "wsSuggest" + st.active : "");
}
function openWsSuggest(){
  ui.wsSuggest = { open:true, items:[], active:-1 };
  renderWsSuggest();
}
function closeWsSuggest(){
  ui.wsSuggest = { open:false, items:[], active:-1 };
  renderWsSuggest();
}
function moveWsSuggest(step){
  var st = ui.wsSuggest, n = st && st.items.length;
  if (!n) return;
  var next = st.active + step;
  st.active = next < 0 ? n - 1 : (next >= n ? 0 : next);
  renderWsSuggest();
}
/** เลือกเมนูแนะนำ: ใส่ชื่อ, ใส่ราคาที่เคยสั่งถ้าช่องราคายังว่าง แล้วไปช่องราคา */
function pickWsSuggest(i){
  var it = ui.wsSuggest && ui.wsSuggest.items[i];
  var nameEl = document.getElementById("wsName"), priceEl = document.getElementById("wsPrice");
  if (!it || !nameEl) return;
  nameEl.value = it.name;
  if (priceEl && it.price != null && !String(priceEl.value).trim()) priceEl.value = it.price;
  closeWsSuggest();
  var msg = document.getElementById("wsAddMsg");
  if (msg){ msg.className = "field-msg muted"; msg.textContent = ""; }
  if (priceEl){ priceEl.focus(); priceEl.select(); }
}
function wsFocusPerson(id){
  ui.wsFocus = ui.wsFocus === id ? null : id;
  if (ui.editingMember && ui.editingMember !== id) ui.editingMember = null;
  renderWorkspace();
}

/* =========================================================
   ใบสรุปยอด (จอใหญ่)
   ========================================================= */
function pageBillWide(r, s, prog){
  var mine = myShare();
  var kindDone = state.kind === "trip" ? L("จบทริปแล้ว 🎉") : L("จบมื้อแล้ว 🎉");
  return '<div class="wpage w-bill">'+
    '<div class="w-head"><a class="w-back" href="'+splitHref()+'">'+ICON_BACK+'<span>'+L("แก้ไขรายการ")+'</span></a>'+
      '<h1>'+L("ใบสรุปยอด")+'</h1><span class="w-head-sub">'+kt("icon")+' '+esc(billName())+'</span></div>'+
    '<div class="w-bill-grid">'+
      '<div class="w-bill-receipt">'+receiptHTML(r, { interactive:true, reveal:!ui.noReveal })+'</div>'+
      '<div class="w-bill-side">'+
        (prog.all ? '<button class="w-done" type="button" data-show-done="1"><img src="img/mascot.png" alt="" width="112" height="112">'+
          '<span><b>'+kindDone+'</b><span>'+L("ทุกคนโอนครบแล้ว")+' · '+(state.kind === "trip" ? L("ดูหน้าจบทริป ›") : L("ดูหน้าจบมื้อ ›"))+'</span></span></button>' : '')+
        (r.orphan > 0 ? '<div class="notice warn"><p>'+L("มี {n} {what} จึงยังไม่ถูกรวมในบิลนี้", { n:r.orphan, what:kt("orphan") })+'</p></div>' : '')+
        (mine ? '<div class="my-total my-total-bill"><span class="my-label">'+L("ยอดของคุณ ({name})", { name:esc(nameOf(mine.id)) })+
          (myTransferText() ? '<span class="my-sub">'+esc(myTransferText())+'</span>' : '')+'</span>'+
          '<span class="my-amt">'+baht(mine.rounded)+' <small>'+L("บาท")+'</small></span></div>' : '')+
        '<section class="w-card w-settle" aria-label="'+L("ใครจ่ายและใครโอนให้ใคร")+'">'+settleHTML(r)+'</section>'+
        '<div class="w-actions">'+
          '<button class="btn-main" id="copyBtn">'+ICON_COPY+' '+L("คัดลอกสรุปยอด")+'</button>'+
          '<button class="btn-line" id="shareImgBtn">'+ICON_SHARE+' '+L("แชร์รูปใบเสร็จ")+'</button>'+
          (ui.ctx ? '<button class="btn-line" type="button" id="groupShare">'+ICON_USERS+' '+L("ชวนเพื่อนเข้ากลุ่ม · ยืนยันเมนู")+'</button>'
            : (Cloud.ready() ? '<button class="btn-line" id="inviteBtn">'+ICON_USERS+' '+inviteLabel()+'</button>' : ''))+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

/* =========================================================
   ชวนเพื่อน (จอใหญ่): QR | สถานะของทุกคน | หน้าที่เพื่อนเห็น
   ========================================================= */
function pageShareWide(){
  var link = inviteLink(ui.ctx), q = QR.encode(link);
  var trip = state.kind === "trip";
  var c = confirmSummary();
  var amounts = {};
  if (hasData()) compute().list.forEach(function(p){ amounts[p.id] = p.rounded; });
  var me = myMemberId();
  if (!nameOf(ui.sharePick)) ui.sharePick = (state.members.filter(function(p){ return p.id !== me; })[0] || state.members[0] || {}).id || null;
  var pick = ui.sharePick;
  return '<div class="wpage w-share">'+
    '<div class="w-head-block"><p class="eyebrow">'+L("ชวนเพื่อนเข้ากลุ่ม")+' · '+esc(Store.groupName)+'</p>'+
      '<h1>'+(trip ? L("ชวนเพื่อนเข้ากลุ่มทริป") : L("ส่งลิงก์ให้เพื่อนกดยืนยันเมนูเอง"))+'</h1>'+
      '<p class="muted">'+shareIntro()+'</p></div>'+
    '<div class="w-share-grid">'+
      '<section class="w-card w-qr" aria-label="'+L("QR และลิงก์ของกลุ่ม")+'">'+
        (q ? '<div class="qr-card share-qr"><div class="qr-code">'+QR.svg(link, L("QR code ลิงก์กลุ่ม {name}", { name:esc(Store.groupName) }))+
          (q.version >= 4 ? '<span class="qr-logo"><img src="img/icon-192.png" alt=""></span>' : '')+'</div></div>' : '')+
        '<div class="w-qr-info"><span class="share-name">'+kt("icon")+' '+esc(Store.groupName)+'</span>'+
          '<span class="share-url mono">'+esc(link.replace(/^https?:\/\//, ""))+'</span></div>'+
        '<div class="w-2btn"><button class="btn-sm" type="button" id="shareCopy">'+L("คัดลอกลิงก์")+'</button>'+
          '<button class="btn-line btn-xs" type="button" id="shareSaveQr">'+L("บันทึกรูป QR")+'</button></div>'+
        '<button class="link-btn center" type="button" id="shareNative">'+ICON_SHARE+' '+L("แชร์ทางอื่น")+'</button>'+
      '</section>'+
      '<section class="w-card w-status" aria-labelledby="h-w-status">'+
        '<div class="w-card-head"><h2 id="h-w-status">'+(trip ? L("คนในทริป") : L("สถานะของทุกคน"))+'</h2>'+
          (c.total ? '<span class="tf-count">'+(trip ? L("{n} คน", { n:c.total }) : L("ยืนยันแล้ว {done}/{total}", { done:c.done, total:c.total }))+'</span>' : '')+'</div>'+
        (c.total && trip
          ? state.members.map(function(p){
              return '<div class="status-row w-status-row'+(p.id === me ? ' me' : '')+'">'+avatarHTML(p.name, memberIndex(p.id))+
                '<b>'+esc(p.name)+(p.id === me ? ' <span class="me-tag">'+L("ฉัน")+'</span>' : '')+'</b><span class="mono">'+baht(amounts[p.id] || 0)+'</span></div>';
            }).join("")
          : c.total
          ? '<div class="progress share-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+c.total+'" aria-valuenow="'+c.done+'"><i style="width:'+Math.round(c.done * 100 / c.total)+'%"></i></div>'+
            c.rows.map(function(x){
              var b = CONFIRM_BADGE[x.status];
              return '<button class="status-row w-status-row'+(x.id === pick ? ' sel' : '')+(x.id === me ? ' me' : '')+'" type="button" data-share-pick="'+x.id+'" aria-pressed="'+(x.id === pick)+'">'+
                avatarHTML(x.name, memberIndex(x.id))+'<b>'+esc(x.name)+(x.id === me ? ' <span class="me-tag">'+L("ฉัน")+'</span>' : '')+'</b>'+
                '<span class="mono">'+baht(amounts[x.id] || 0)+'</span><span class="badge '+b[0]+'">'+L(b[1])+'</span></button>';
            }).join("")
          : '<p class="empty">'+L("ยังไม่มีใครในบิลนี้ ใส่ชื่อในหน้าหารบิล หรือให้เพื่อนเพิ่มชื่อตัวเองตอนเปิดลิงก์")+'</p>')+
      '</section>'+
      '<section class="w-preview" aria-labelledby="h-w-prev">'+(trip ? tripSharePreviewHTML() : sharePreviewHTML(pick))+'</section>'+
    '</div>'+
  '</div>';
}
/** v4.8: ทริปแบบกลุ่ม — เพื่อนเปิดบิลทริปเดียวกัน ไม่มีหน้าติ๊กเมนู */
function tripSharePreviewHTML(){
  return '<p class="w-prev-label" id="h-w-prev">'+L("เพื่อนจะเห็นอะไร")+'</p>'+
    '<div class="w-card"><h2>'+L("บิลทริปเดียวกับคุณ")+'</h2>'+
      '<p class="muted">'+L("เปิดลิงก์แล้วเลือกชื่อตัวเอง (หรือเพิ่มชื่อ) จากนั้นใส่ค่าใช้จ่ายที่ตัวเองจ่ายได้เลย ทุกคนเห็นยอดล่าสุดตรงกัน")+'</p></div>'+
    '<a class="btn-main btn-block" href="'+splitHref()+'">'+L("ไปใส่ค่าใช้จ่าย")+'</a>';
}
/** ตัวอย่างหน้าที่เพื่อนคนนี้จะเห็น (ติ๊กตามข้อมูลตอนนี้) */
function sharePreviewHTML(id){
  if (!nameOf(id)) return '<p class="w-prev-label" id="h-w-prev">'+L("เพื่อนจะเห็นแบบนี้")+'</p><p class="empty">'+L("ยังไม่มีใครในบิลนี้")+'</p>';
  var items = itemsOf(serialize());
  var total = 0;
  if (hasData()) compute().list.forEach(function(p){ if (p.id === id) total = p.rounded; });
  return '<p class="w-prev-label" id="h-w-prev">'+L("เพื่อนจะเห็นแบบนี้ · {name}", { name:esc(nameOf(id)) })+'</p>'+
    '<div class="w-card">'+
      '<h2>'+L("สวัสดี {name}", { name:esc(nameOf(id)) })+'</h2><p class="muted">'+L("ติ๊กเมนูที่คุณมีส่วน")+'</p>'+
      items.map(function(it){
        var on = it.eaters.indexOf(id) >= 0;
        var n = it.eaters.filter(function(x){ return !!nameOf(x); }).length;
        return '<div class="guest-item'+(on ? ' on' : '')+'" aria-hidden="true"><span class="tf-box">'+(on ? ICON_CHECK : '')+'</span>'+
          '<span class="guest-body"><b>'+esc(it.name)+'</b>'+(it.group ? '<span>'+esc(it.group)+'</span>' : '')+'</span>'+
          '<span class="guest-each mono">'+(on && n ? baht(it.price / n) : '—')+'</span></div>';
      }).join("")+
      '<div class="w-prev-total"><span>'+L("ยอดของคุณ")+'</span><span class="mono">'+baht(total)+' ฿</span></div>'+
    '</div>'+
    '<a class="btn-line btn-block" href="'+confirmHref()+'">'+L("ยืนยันเมนูของฉัน · ดูหน้าที่เพื่อนเห็น")+'</a>';
}
function pickShareMember(id){
  ui.sharePick = id;
  var y = window.scrollY;
  document.getElementById("view").innerHTML = pageShare();
  fitShareQr();
  jumpTo(y);
}

/* =========================================================
   ประวัติ (จอใหญ่): รายการ + ค้นหา/กรอง | รายละเอียดบิลที่เลือก
   ========================================================= */
var HIST_FILTERS = [ ["all","ทั้งหมด"], ["meal","มื้ออาหาร"], ["trip","ทริป"], ["group","กลุ่ม"] ];
function histFiltered(){
  var e = billEntries();
  var q = normText(ui.histQ || ""), f = ui.histFilter || "all";
  var ok = function(x){ return (!q || normText(x.name).indexOf(q) >= 0) && (f === "all" || x.kind === f); };
  // v4.15: บิลที่กำลังทำอยู่ขึ้นบนสุด (เดิมหน้าประวัติไม่มีบิลล่าสุด)
  var cur = localBillNow(), open = [];
  if (cur){
    var cb = normalizeBill(cur);
    open.push({ id:"local", local:cur, kind:cb.kind, icon:ktOf(cb.kind,"icon"), name:savedBillName(cur), at:Date.now(),
      sub:L("กำลังหาร · {n} คน", { n:cb.members.length }), amt:baht(computeBill(cb).grand), href:"#/bill" });
  }
  return { open:open.filter(ok), groups:e.groups.filter(ok), hist:e.hist.filter(ok), any:open.length + e.groups.length + e.hist.length > 0 };
}
function pageHistoryWide(selId){
  if (selId) ui.histSel = selId;
  return '<div class="w-hist">'+
    '<section class="w-hist-list" aria-labelledby="h-w-hist">'+
      '<h1 id="h-w-hist">'+L("ประวัติบิล")+'</h1>'+
      '<label class="sr-only" for="histQ">'+L("ค้นหาชื่อบิล")+'</label>'+
      '<input type="text" role="searchbox" enterkeyhint="search" id="histQ" placeholder="'+L("ค้นหาชื่อบิล")+'" value="'+esc(ui.histQ || "")+'" autocomplete="off">'+
      '<div class="w-filters" role="group" aria-label="'+L("กรองตามประเภท")+'">'+HIST_FILTERS.map(function(f){
        var on = (ui.histFilter || "all") === f[0];
        return '<button type="button" data-hist-filter="'+f[0]+'" aria-pressed="'+on+'">'+L(f[1])+'</button>';
      }).join("")+'</div>'+
      '<div id="histList"></div>'+
      (Cloud.ready() ? '<details class="join-fold"><summary>'+L("มีลิงก์กลุ่มจากเพื่อน? วางตรงนี้")+'</summary>'+
        '<div class="field-row"><div><label class="sr-only" for="groupJoinInput">'+L("ลิงก์หรือรหัสกลุ่ม")+'</label>'+
        '<input type="text" id="groupJoinInput" placeholder="'+L("วางลิงก์หรือรหัสกลุ่ม")+'" autocomplete="off" aria-describedby="groupJoinMsg"></div>'+
        '<button class="btn-quiet" id="groupJoin">'+L("เข้ากลุ่ม")+'</button></div>'+
        '<p class="field-msg muted" id="groupJoinMsg" aria-live="polite"></p></details>' : '')+
    '</section>'+
    '<section class="w-hist-detail" id="histDetail" aria-live="polite"></section>'+
  '</div>';
}
function histRowHTML(x){
  var sel = ui.histSel === x.id;
  return '<button class="w-hist-row'+(sel ? ' sel' : '')+'" type="button" data-hist-sel="'+esc(x.id)+'" aria-pressed="'+sel+'">'+
    '<span class="ico" aria-hidden="true">'+x.icon+'</span>'+
    '<span class="body"><b>'+esc(x.name)+'</b><span>'+(x.kind === "group" ? '<span class="tag-group">'+ICON_USERS+' '+L("บิลกลุ่ม")+'</span>'+(x.sub ? ' · ' : '') : '')+esc(x.sub)+'</span></span>'+
    '<span class="mono">'+x.amt+'</span></button>';
}
function renderHistoryWide(){
  var list = document.getElementById("histList"), detail = document.getElementById("histDetail");
  if (!list || !detail) return;
  var d = histFiltered();
  var all = d.open.concat(d.groups, d.hist);
  if (!all.some(function(x){ return x.id === ui.histSel; })) ui.histSel = all.length ? all[0].id : null;
  var months = [], byMonth = {};
  d.hist.forEach(function(x){
    var key = monthLabel(x.at);
    if (!byMonth[key]){ byMonth[key] = []; months.push(key); }
    byMonth[key].push(x);
  });
  list.innerHTML = !d.any
    ? '<p class="empty">'+L("ยังไม่มีบิลในประวัติ กด \"เริ่มบิลใหม่\" แล้วบิลเดิมจะถูกเก็บไว้ตรงนี้")+'</p>'+'<div class="btn-row" style="margin-top:var(--s3)"><button class="btn-main" type="button" data-open-kind="1" aria-haspopup="dialog">'+L("เริ่มบิลใหม่")+'</button></div>'   // งาน 3.3: ปุ่มพาไปทำสิ่งแรก
    : (!all.length ? '<p class="w-empty-search">'+L("ไม่พบบิลที่ค้นหา")+'</p>'
      : (d.open.length ? '<h2 class="list-head">'+L("บิลที่เปิดอยู่")+'</h2>'+d.open.map(histRowHTML).join("") : '')+
        (d.groups.length ? '<h2 class="list-head">'+L("กลุ่มของฉัน")+'</h2>'+d.groups.map(histRowHTML).join("") : '')+
        months.map(function(m){ return '<h2 class="list-head">'+esc(m)+'</h2>'+byMonth[m].map(histRowHTML).join(""); }).join(""));
  Array.prototype.forEach.call(document.querySelectorAll("[data-hist-filter]"), function(b){
    b.setAttribute("aria-pressed", String(b.getAttribute("data-hist-filter") === (ui.histFilter || "all")));
  });
  var x = all.filter(function(it){ return it.id === ui.histSel; })[0];
  // งาน 3.3: ยังไม่มีบิลเลย = บอกว่าแผงนี้จะแสดงอะไร (เดิมบอกให้เลือกบิลทั้งที่ทางซ้ายว่าง)
  if (!x){ detail.innerHTML = '<div class="w-hist-none"><img src="img/mascot.png" alt="" width="120" height="120"><p>'+(d.any ? L("เลือกบิลทางซ้ายเพื่อดูใบสรุปยอด") : L("บิลที่เก็บไว้จะแสดงใบสรุปยอดตรงนี้"))+'</p></div>'; return; }
  if (x.group){
    detail.innerHTML = '<div class="w-hist-inner"><div class="w-card w-group-card"><span class="ico" aria-hidden="true">'+x.icon+'</span>'+
      '<h2>'+esc(x.name)+'</h2><p class="muted"><span class="tag-group">'+ICON_USERS+' '+L("บิลกลุ่ม")+'</span>'+(x.sub ? ' · '+esc(x.sub) : '')+'</p>'+
      '<p class="muted">'+L("บิลกลุ่มอยู่บนเซิร์ฟเวอร์ เปิดเพื่อดูยอดล่าสุดที่เพื่อนแก้")+'</p></div>'+
      '<div class="btn-stack"><a class="btn-main btn-block" href="'+x.href+'">'+L("เปิดบิลกลุ่ม")+'</a>'+
      '<button class="btn-line btn-block" data-forget-group="'+esc(x.group.id)+'">'+L("เอาออกจากรายการ")+'</button></div></div>';
    return;
  }
  if (x.local){
    var lb = normalizeBill(x.local), lr = computeBill(lb), ls = settleBill(lr, lb);
    detail.innerHTML = '<div class="w-hist-inner">'+
      '<p class="past-when"><span class="badge warn">'+L("กำลังหาร")+'</span> '+L("บิลที่ทำอยู่ตอนนี้ ยังไม่ได้เก็บเข้าประวัติ")+'</p>'+
      receiptHTML(lr, { kind:lb.kind })+
      (ls.ok && ls.transfers.length ? '<section class="bill-transfers" aria-labelledby="h-past-tf">'+transfersBlock(ls, false, "h-past-tf", lb.paid, (ui.ctx === null && !ui.loading) ? 'data-paid-all="1"' : '')+'</section>' : '')+
      '<div class="btn-stack"><a class="btn-main btn-block" href="#/split">'+L("ทำต่อ")+'</a>'+
        '<a class="btn-line btn-block" href="#/bill">'+L("ใบสรุปยอด")+'</a>'+
        '<button class="btn-danger btn-block" type="button" data-del-local="1">'+ICON_DEL+' '+L("ลบบิลนี้")+'</button></div></div>';
    return;
  }
  var h = x.hist, b = normalizeBill(h.data);
  var r = computeBill(b), s = settleBill(r, b);
  detail.innerHTML = '<div class="w-hist-inner">'+
    '<p class="past-when">'+L("เก็บเข้าประวัติเมื่อ {date}", { date:esc(longDate(h.at)) })+'</p>'+
    receiptHTML(r, { kind:b.kind })+
    (s.ok && s.transfers.length ? '<section class="bill-transfers" aria-labelledby="h-past-tf">'+transfersBlock(s, false, "h-past-tf", b.paid, 'data-hist-paid-all="'+esc(h.id)+'"')+'</section>' : '')+
    '<div class="btn-stack">'+
      '<button class="btn-main btn-block" data-restore-history="'+esc(h.id)+'">'+L("เปิดบิลนี้ทำต่อ")+'</button>'+
      '<button class="btn-danger btn-block" data-del-history="'+esc(h.id)+'">'+ICON_DEL+' '+L("ลบออกจากประวัติ")+'</button>'+
    '</div></div>';
}

/* =========================================================
   เปลี่ยนขนาดจอข้ามเส้น 600px — วาดหน้าใหม่ด้วยหน้าตาของขนาดนั้น
   ========================================================= */
function onWideChange(){
  var path = currentPath();
  if (path !== "/split"){ var y0 = window.scrollY; route(); jumpTo(y0); return; }
  var view = document.getElementById("view");
  var y = window.scrollY;
  // ข้อความที่พิมพ์ค้างอยู่ในช่องกรอก (ยังไม่กดบันทึก) อยู่แค่ใน DOM — จำไว้แล้วใส่คืนหลังวาดใหม่
  syncMenuForm();
  var drafts = {};
  Array.prototype.forEach.call(view.querySelectorAll("input[id],textarea[id]"), function(el){ drafts[el.id] = el.value; });
  var active = document.activeElement && view.contains(document.activeElement) ? document.activeElement.id : "";
  view.innerHTML = pageSplit();
  render();
  Object.keys(drafts).forEach(function(id){
    var el = document.getElementById(id);
    if (el && view.contains(el)) el.value = drafts[id];
  });
  var ok = document.getElementById("confirmReset");
  if (ok && ui.ctx) ok.disabled = !resetNameMatches();
  var focus = active && document.getElementById(active);
  if (focus) focus.focus({ preventScroll:true });
  renderSideNav();
  syncSheetLock();
  jumpTo(y);
}
if (WIDE_MQ){
  if (WIDE_MQ.addEventListener) WIDE_MQ.addEventListener("change", onWideChange);
  else if (WIDE_MQ.addListener) WIDE_MQ.addListener(onWideChange);
}
