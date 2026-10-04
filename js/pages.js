/* FairDish — หน้าเว็บแต่ละหน้า (v3.2: หน้าตาแบบแอปมือถือ ทุกหน้ามีแถบหัวของตัวเอง) */
"use strict";

/* =========================================================
   6. หน้าเว็บ
   ========================================================= */
function item(k,h,p){ return '<li><span class="k">'+k+'</span><div><h3>'+h+'</h3><p>'+p+'</p></div></li>'; }

var ICON_BACK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
var ICON_CHEVRON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
var ICON_PLUS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
var ICON_SETTINGS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>';
var ICON_INSTALL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/></svg>';
var ICON_USERS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.4.2 4 1.9 4.5 4.6"/></svg>';

/**
 * แถบหัวของหน้า — o: { back:"#/..." | null, backAttr:'data-…="1"' (ปุ่มย้อนที่ไม่ใช่ลิงก์),
 *   title, sub (HTML ที่ escape แล้ว), subAttr:'data-…' (แตะชื่อรองได้), right:HTML }
 */
function appBar(o){
  var back = o.back
    ? '<a class="appbar-back" href="'+o.back+'">'+ICON_BACK+'<span>ย้อนกลับ</span></a>'
    : (o.backAttr ? '<button class="appbar-back" type="button" '+o.backAttr+'>'+ICON_BACK+'<span>ย้อนกลับ</span></button>' : '');
  var sub = !o.sub ? '' : (o.subAttr
    ? '<button class="appbar-sub" type="button" '+o.subAttr+'>'+o.sub+' <span class="appbar-edit" aria-hidden="true">✎</span></button>'
    : '<p class="appbar-sub">'+o.sub+'</p>');
  return '<header class="appbar"><div class="appbar-side">'+back+'</div>'+
    '<div class="appbar-title"><h1>'+o.title+'</h1>'+sub+'</div>'+
    '<div class="appbar-side end">'+(o.right || '')+'</div></header>';
}
/** ชื่อของบิลที่เปิดอยู่ — กลุ่มใช้ชื่อกลุ่ม บิลส่วนตัวใช้ชื่อที่ตั้งไว้ */
function billName(){
  if (ui.ctx) return Store.groupName || "กลุ่ม";
  return state.name || defaultBillName(state.kind);
}
function savedBillName(saved){
  var b = saved || {};
  return b.name || defaultBillName(b.kind, b.savedAt ? new Date(b.savedAt) : null);
}
function billHasData(saved){
  return !!(saved && Array.isArray(saved.members) && saved.members.length &&
            ((saved.menus || []).length + (saved.shared || []).length) > 0);
}
function shortDate(ms){ return ms ? new Date(ms).toLocaleDateString("th-TH",{ day:"numeric", month:"short" }) : ""; }
function settingsLink(){
  return '<a class="icon-btn appbar-icon" href="#/more" aria-label="ตั้งค่าและเกี่ยวกับ">'+ICON_SETTINGS+'</a>';
}

/* ---------------- หน้าหลัก: บิลของฉัน ---------------- */
function pageHome(){
  return '<div class="page page-home">'+
    '<div class="home-top">'+
      '<img class="logo-mark" src="img/logo.png" alt="" width="40" height="40">'+
      '<b class="home-brand">FairDish</b>'+
      '<button class="install-btn" id="installBtn" type="button" aria-haspopup="dialog" hidden>'+ICON_INSTALL+'<span>ติดตั้งแอป</span></button>'+
      settingsLink()+
    '</div>'+
    '<h1 class="home-title">บิลของฉัน</h1>'+
    '<div id="homeActive"></div>'+
    '<button class="new-bill" type="button" data-open-kind="1" aria-haspopup="dialog">'+
      '<span class="new-bill-ico">'+ICON_PLUS+'</span>'+
      '<span class="new-bill-text"><b>เริ่มบิลใหม่</b><span>ใส่ชื่อ ใส่เมนู แล้วส่งยอดเข้ากลุ่ม</span></span>'+
    '</button>'+
    '<div id="homeRecent"></div>'+
    '<div id="homeIntro"></div>'+
  '</div>';
}
/** แนะนำแอปสำหรับคนที่เพิ่งเปิดครั้งแรก (ยังไม่มีบิลเลย) */
function homeIntroHTML(){
  return '<section class="intro" aria-labelledby="h-intro">'+
    '<div class="intro-art">'+
      '<span class="blob purple" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 3v6a3 3 0 0 0 6 0V3M10 12v9M17 3v18M17 3c-2 1-3 4-3 7h3"/></svg></span>'+
      '<span class="blob coral" aria-hidden="true">&#247;</span>'+
      '<span class="blob mint" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>'+
      demoReceiptHTML()+
    '</div>'+
    '<p class="eyebrow">หารบิลให้สนุกขึ้นอีกนิด</p>'+
    '<h2 id="h-intro" class="intro-title">จ่ายตามที่กินจริง จบทุกมื้ออย่างแฟร์</h2>'+
    '<p class="intro-body">FairDish คิดค่าอาหารจากเมนูที่แต่ละคนกินจริง บวกค่าส่วนกลางให้อัตโนมัติ แล้วสรุปว่าใครต้องโอนให้ใคร ส่งเข้ากลุ่มได้ทันที</p>'+
    '<div class="btn-stack">'+
      '<button class="btn-line btn-block" type="button" data-start-demo="1">ลองกับข้อมูลตัวอย่าง</button>'+
      '<a class="link-btn center" href="#/how">ดูวิธีใช้</a>'+
    '</div>'+
    '<p class="intro-note">ไม่ต้องสมัครสมาชิก · บันทึกบิลไว้ในเครื่องให้อัตโนมัติ</p>'+
  '</section>';
}
/** การ์ด "กำลังหาร" ของบิลส่วนตัวในเครื่อง */
function activeBillHTML(saved){
  var b = normalizeBill(saved);
  var r = computeBill(b);
  var s = settleBill(r, b);
  var prog = s.ok ? paidProgress(s.transfers, b.paid) : null;
  var meta = b.members.length+' คน · '+b.menus.length+' '+ktOf(b.kind,"items");
  var progress = (prog && prog.total)
    ? '<div class="progress-text">'+(prog.all ? 'โอนครบทุกคนแล้ว 🎉' : 'โอนแล้ว '+prog.done+'/'+prog.total)+'</div>'+
      '<div class="progress"><i style="width:'+Math.round(prog.done / prog.total * 100)+'%"></i></div>'
    : '';
  return '<section class="active-card" aria-labelledby="h-active">'+
    '<div class="active-top"><span class="badge warn">กำลังหาร</span><span class="active-meta">'+meta+'</span></div>'+
    '<h2 id="h-active" class="active-name">'+ktOf(b.kind,"icon")+' '+esc(savedBillName(saved))+'</h2>'+
    '<div class="active-sum">'+baht(r.grand)+' ฿</div>'+
    progress+
    '<div class="btn-pair">'+
      '<a class="btn-main" href="#/split">ทำต่อ</a>'+
      '<a class="btn-line" href="#/bill">ใบสรุปยอด</a>'+
    '</div>'+
  '</section>';
}
/** แถวบิลในรายการ (บิลล่าสุด / ประวัติ) */
function billRow(href, name, sub, amount){
  return '<a class="list-row" href="'+href+'">'+
    '<span class="list-body"><b>'+name+'</b><span>'+sub+'</span></span>'+
    (amount ? '<span class="list-amt">'+amount+'</span>' : '')+
    '<span class="list-go">'+ICON_CHEVRON+'</span></a>';
}
function historyRowHTML(h){
  var b = normalizeBill(h.data);
  return billRow('#/h/'+esc(h.id), ktOf(b.kind,"icon")+' '+esc(h.name),
    esc(shortDate(h.at))+' · '+b.members.length+' คน', baht(computeBill(b).grand));
}
function groupRowHTML(g){
  return billRow('#/g/'+esc(g.id), ktOf(g.kind,"icon")+' '+esc(g.name),
    '<span class="tag-group">'+ICON_USERS+' กลุ่ม</span>'+(g.at ? ' · เปิดล่าสุด '+esc(shortDate(g.at)) : ''), '');
}
/** บิลล่าสุด = กลุ่มที่เคยเปิด + บิลในประวัติ เรียงตามเวลา */
function recentItems(){
  var list = ui.myGroups.map(function(g){ return { at:g.at || 0, html:groupRowHTML(g) }; })
    .concat(ui.history.map(function(h){ return { at:h.at || 0, html:historyRowHTML(h) }; }));
  list.sort(function(a,b){ return b.at - a.at; });
  return list;
}

/* ---------------- หน้าหารบิล ---------------- */
/** แท็บของหน้าหารบิล — ทริปไม่มีแท็บส่วนกลาง (ไม่มีค่าบริการ/VAT และ "หารทุกคน" คือเลือกทุกคนอยู่แล้ว) */
function steps(){
  if (ui.tripStash) return [ { id:"menus", label:"เมนู" }, { id:"shared", label:"ส่วนกลาง" } ];   // v3.1: แก้มื้อในทริป
  var list = [ { id:"members", label:"คน" }, { id:"menus", label:kt("items") } ];
  if (state.kind !== "trip") list.push({ id:"shared", label:"ส่วนกลาง" });
  list.push({ id:"summary", label:"สรุป" });          // v3.2: สรุปยอด + ใครจ่าย + ใครโอนให้ใคร
  return list;
}
function stepTab(st){
  var on = ui.step === st.id;
  return '<button type="button" role="tab" id="tab-'+st.id+'" aria-controls="panel-'+st.id+'" aria-selected="'+on+'" tabindex="'+(on?0:-1)+'" data-step="'+st.id+'">'+
    st.label+' <span class="tab-count" id="count-'+st.id+'"></span></button>';
}
function stepPanel(id, title, aside, body){
  var i = 0;
  steps().forEach(function(st, k){ if (st.id === id) i = k + 1; });
  return '<section class="step-card step-panel" role="tabpanel" id="panel-'+id+'" aria-labelledby="h-'+id+'"'+(ui.step===id?'':' hidden')+'>'+
    '<div class="step-head"><span class="step-num" aria-hidden="true">'+i+'</span><h2 id="h-'+id+'">'+title+'</h2>'+
      (aside ? '<span class="aside" id="'+aside+'"></span>' : '')+'</div>'+
    body+'</section>';
}

function pageSplit(){
  if (ui.ctx && ui.groupError) return pageGroupError();
  var inGroup = !!ui.ctx;
  if (!steps().some(function(st){ return st.id === ui.step; })) ui.step = steps()[0].id;
  var inMeal = !!ui.tripStash;
  var bar = inMeal
    ? appBar({ backAttr:'data-back-trip="1"', title:"🍲 มื้ออาหารในทริป", sub:esc(billName()) })
    : appBar({ back:"#/", title:kt("title"), sub:kt("icon")+' '+esc(billName()),
               subAttr:(!inGroup && !ui.loading) ? 'data-rename="1" aria-label="เปลี่ยนชื่อบิล '+esc(billName())+'"' : '' });
  return bar+
  '<div class="page page-app">'+
    (inMeal ? '<div id="mealHead"></div>' : '<div id="groupBar"></div>')+
    '<div class="step-tabs" role="tablist" aria-label="ขั้นตอนการหารบิล">'+steps().map(stepTab).join("")+'</div>'+

    stepPanel("members", kt("people"), "memberCount",
      '<div class="field-row">'+
        '<div>'+
          '<label class="sr-only" for="memberInput">ชื่อคนในบิลนี้</label>'+
          '<input type="text" id="memberInput" placeholder="พิมพ์ชื่อ เช่น มาร์ค" autocomplete="off" maxlength="'+MAX_NAME+'" aria-describedby="memberMsg">'+
        '</div>'+
        '<button class="btn-sm" id="memberAdd">เพิ่ม</button>'+
      '</div>'+
      '<p class="field-msg muted" id="memberMsg" aria-live="polite"></p>'+
      '<div id="memberList"></div>'+
      '<div id="memberExtra"></div>'+
      '<div id="memberNext"></div>')+

    stepPanel("menus", kt("itemsTitle"), "menuMeta",
      '<div id="menuNoMembers"></div>'+
      '<div id="menuList"></div><div id="menuFormSlot"></div>')+

    (state.kind === "trip" ? '' : stepPanel("shared", "ค่าส่วนกลาง", "",
      '<p class="hint">คิดเป็น % จากยอดของแต่ละคน</p>'+
      '<div class="pick" id="chargeList"></div><div id="chargeFormSlot"></div>'+
      '<p class="sub-head">หารเท่ากันทุกคน</p>'+
      '<div id="sharedList"></div><div id="sharedFormSlot"></div>'))+

    (inMeal ? '' : stepPanel("summary", kt("summary"), "summaryAside",
      '<div id="summary" aria-live="polite"></div>'))+

    (ui.confirmReset ? '<div class="confirm" role="alertdialog" aria-label="ยืนยันการล้างข้อมูล">'+
      '<h3>ล้างข้อมูลทั้งหมดในบิลนี้?</h3>'+
      '<p>รายชื่อและรายการทั้งหมดจะถูกล้างออก'+(inGroup ? " <b>ทุกคนในกลุ่มจะเห็นบิลว่างด้วย</b>" : "")+'</p>'+
      (inGroup ? '<label class="confirm-type" for="resetConfirmName">พิมพ์ชื่อกลุ่ม <b>'+esc(Store.groupName)+'</b> เพื่อยืนยัน</label>'+
        '<input type="text" id="resetConfirmName" autocomplete="off" placeholder="'+esc(Store.groupName)+'">' : '')+
      '<div class="btn-row"><button class="btn-quiet" id="cancelReset">ยกเลิก</button>'+
      '<button class="btn-danger" id="confirmReset"'+(inGroup ? ' disabled' : '')+'>'+ICON_DEL+' ล้างข้อมูล</button></div></div>' : '')+
    (inMeal ? '<div class="app-foot"><button data-back-trip="1">← กลับไปที่ทริป</button>'+
        '<button class="danger-link" data-del-meal="1">'+ICON_DEL+' ลบมื้อนี้</button></div>' :
    '<div class="app-foot">'+
      (inGroup ? '' : '<button id="demoBtn">ใส่ข้อมูลตัวอย่าง</button>')+
      '<button id="resetBtn">'+ICON_DEL+' ล้างข้อมูลทั้งหมด</button>'+
    '</div>')+
  '</div>'+
  '<div class="total-bar" id="totalBar" hidden></div>';
}

/* ---------------- ใบสรุปยอด ---------------- */
function pageBill(){
  if (ui.ctx && ui.groupError) return pageGroupError();
  var bar = appBar({ back:splitHref(), title:"ใบสรุปยอด", sub:ui.loading ? "" : kt("icon")+' '+esc(billName()) });
  if (ui.loading) return bar + '<div class="page"><p class="empty">กำลังโหลดข้อมูลบิล…</p></div>';
  if (!hasData()){
    return bar + '<div class="page"><p class="empty">ยังไม่มีข้อมูลบิล เริ่มจากใส่ชื่อคนและรายการในหน้าหารบิลก่อน</p>'+
      '<a class="btn-main btn-block" style="margin-top:var(--s4)" href="'+splitHref()+'">ไปหน้าหารบิล</a></div>';
  }
  var r = compute();
  var s = settleBill(r);
  var prog = s.ok ? paidProgress(s.transfers, state.paid) : { done:0, total:0, all:false };
  if (ui.showDone && prog.all) return bar + pageDone(r, s);
  ui.showDone = false;
  var mine = myShare();
  return bar + '<div class="page">'+
      (r.orphan>0 ? '<div class="notice warn" style="margin:0 0 var(--s3)"><p>มี '+r.orphan+' '+kt("orphan")+' จึงยังไม่ถูกรวมในบิลนี้</p></div>' : '')+
      (prog.all ? '<button class="done-banner" type="button" data-show-done="1">🎉 <b>ทุกคนโอนครบแล้ว</b><span>ดูหน้าจบ'+(state.kind === "trip" ? "ทริป" : "มื้อ")+' ›</span></button>' : '')+
      (mine ? '<div class="my-total my-total-bill"><span class="my-label">ยอดของคุณ ('+esc(nameOf(mine.id))+')'+
        (myTransferText() ? '<span class="my-sub">'+esc(myTransferText())+'</span>' : '')+'</span>'+
        '<span class="my-amt">'+baht(mine.rounded)+' <small>บาท</small></span></div>' : '')+
      receiptHTML(r,{ interactive:true, reveal:!ui.noReveal })+
      billTransfersHTML(r, s)+
      '<div class="btn-stack">'+
        '<button class="btn-main btn-block" id="copyBtn">'+ICON_COPY+' คัดลอกสรุปยอด</button>'+
        '<button class="btn-line btn-block" id="shareImgBtn">'+ICON_SHARE+' แชร์รูปใบเสร็จ</button>'+
        (ui.ctx ? '<button class="btn-line btn-block" id="groupShare" aria-haspopup="dialog">'+ICON_USERS+' ชวนเพื่อนเข้ากลุ่ม</button>'
          : (Cloud.ready() ? '<button class="btn-line btn-block" id="inviteBtn">'+ICON_USERS+' ชวนเพื่อนเข้ากลุ่ม</button>' : ''))+
        '<a class="link-btn center" href="'+splitHref()+'">แก้ไขรายการ</a>'+
      '</div>'+
    '</div>';
}
/** ส่วน "ใครโอนให้ใคร" ในหน้าใบสรุป — ติ๊กว่าโอนแล้วได้ ยังไม่รู้คนจ่าย = ปุ่มพาไปแท็บสรุป */
function billTransfersHTML(r, s){
  if (!s.ok){
    var msg = s.reason === "unpaid"
      ? "ยังไม่ได้ใส่ว่าใครจ่าย "+s.count+" รายการ ใส่ให้ครบแล้วจะรู้ว่าใครต้องโอนให้ใคร"
      : (s.reason === "none" ? "เลือกคนจ่ายให้ร้านก่อน แล้วจะสรุปให้ว่าใครโอนให้ใคร" : "ยอดที่คนจ่ายใส่ไว้ยังไม่ตรงกับยอดบิล");
    return '<div class="notice warn settle-cta"><p>'+msg+'</p><button class="btn-quiet" data-goto-summary="1">'+(s.reason === "unpaid" ? "ไปใส่คนจ่าย" : "เลือกคนจ่าย")+'</button></div>';
  }
  return '<section class="bill-transfers" aria-labelledby="h-bill-tf">'+transfersBlock(s, true, "h-bill-tf")+'</section>';
}
/** จบมื้อ/จบทริป — ทุกคนติ๊กว่าโอนครบแล้ว */
function pageDone(r, s){
  return '<div class="page page-done">'+
    '<div class="done-head"><div class="done-pop" aria-hidden="true">🎉</div>'+
      '<h2>'+kt("done").replace(/!$/,"")+'</h2><p>ทุกคนโอนครบแล้ว</p></div>'+
    '<section class="done-card" aria-label="สรุปการโอน">'+
      '<div class="done-top"><b>'+esc(billName())+'</b><span class="mono">'+baht(r.grand)+' ฿</span></div>'+
      '<div class="done-meta">'+r.n+' คน · '+state.menus.length+' '+kt("items")+'</div>'+
      s.transfers.map(function(t){
        return '<div class="done-row"><span class="done-tick">'+ICON_CHECK+'</span>'+
          '<span class="done-who">'+esc(t.fromName)+' → '+esc(t.toName)+'</span><span class="mono">'+baht(t.amount)+'</span></div>';
      }).join("")+
    '</section>'+
    '<div class="btn-stack">'+
      '<button class="btn-main btn-block" id="shareImgBtn">'+ICON_SHARE+' แชร์รูปใบเสร็จ</button>'+
      '<a class="btn-line btn-block" href="#/">กลับหน้าหลัก</a>'+
      '<button class="link-btn center" type="button" data-show-receipt="1">ดูใบสรุปยอด</button>'+
    '</div>'+
    installNudgeHTML()+
  '</div>';
}

/* ---------------- ประวัติ ---------------- */
function pageHistory(){
  var on = Cloud.ready();
  var groups = ui.myGroups.map(function(g){
    return '<div class="list-wrap">'+groupRowHTML(g)+
      '<button class="icon-btn list-x" data-forget-group="'+esc(g.id)+'" aria-label="เอา '+esc(g.name)+' ออกจากรายการ">'+ICON_X+'</button></div>';
  }).join("");
  var join = !on ? '' :
    '<details class="join-fold"><summary>มีลิงก์กลุ่มจากเพื่อน? วางตรงนี้</summary>'+
      '<div class="field-row">'+
        '<div><label class="sr-only" for="groupJoinInput">ลิงก์หรือรหัสกลุ่ม</label>'+
        '<input type="text" id="groupJoinInput" placeholder="วางลิงก์หรือรหัสกลุ่ม" autocomplete="off" aria-describedby="groupJoinMsg"></div>'+
        '<button class="btn-quiet" id="groupJoin">เข้ากลุ่ม</button>'+
      '</div>'+
      '<p class="field-msg muted" id="groupJoinMsg" aria-live="polite"></p>'+
    '</details>';
  var months = [], byMonth = {};
  ui.history.forEach(function(h){
    var key = new Date(h.at || 0).toLocaleDateString("th-TH",{ month:"long", year:"numeric" });
    if (!byMonth[key]){ byMonth[key] = []; months.push(key); }
    byMonth[key].push(h);
  });
  var past = months.map(function(m){
    return '<h2 class="list-head">'+esc(m)+'</h2>'+byMonth[m].map(historyRowHTML).join("");
  }).join("");
  var empty = !ui.myGroups.length && !ui.history.length;
  return appBar({ title:"ประวัติบิล", right:settingsLink() })+
    '<div class="page">'+
      (empty ? '<p class="empty">ยังไม่มีบิลในประวัติ — กด "เริ่มบิลใหม่" แล้วบิลเดิมจะถูกเก็บไว้ตรงนี้</p>' : '')+
      (groups ? '<h2 class="list-head">กลุ่มของฉัน</h2>'+groups : '')+
      join+
      past+
    '</div>';
}
/** บิลเก่าในประวัติ (ดูอย่างเดียว เปิดกลับมาทำต่อได้) */
function pagePast(){
  var id = hashPath().replace(/^\/h\//,"");
  var h = ui.history.filter(function(x){ return x.id === id; })[0];
  if (!h){
    return appBar({ back:"#/history", title:"ใบสรุปยอด" })+
      '<div class="page"><p class="empty">ไม่พบบิลนี้ในประวัติ อาจถูกลบไปแล้ว</p></div>';
  }
  var b = normalizeBill(h.data);
  var r = computeBill(b), s = settleBill(r, b);
  return appBar({ back:"#/history", title:"ใบสรุปยอด", sub:ktOf(b.kind,"icon")+' '+esc(h.name) })+
    '<div class="page">'+
      '<p class="past-when">เก็บเข้าประวัติเมื่อ '+esc(new Date(h.at).toLocaleDateString("th-TH",{ day:"numeric", month:"long", year:"numeric" }))+'</p>'+
      receiptHTML(r, { kind:b.kind })+
      (s.ok && s.transfers.length ? '<section class="bill-transfers" aria-labelledby="h-past-tf">'+transfersBlock(s, false, "h-past-tf", b.paid)+'</section>' : '')+
      '<div class="btn-stack">'+
        '<button class="btn-main btn-block" data-restore-history="'+esc(h.id)+'">เปิดบิลนี้ทำต่อ</button>'+
        '<button class="btn-danger btn-block" data-del-history="'+esc(h.id)+'">'+ICON_DEL+' ลบออกจากประวัติ</button>'+
      '</div>'+
    '</div>';
}

function pageGroupError(){
  var msg = ({
    notfound:["ไม่พบกลุ่มนี้","ลิงก์อาจพิมพ์ผิดหรือคัดลอกมาไม่ครบ ลองขอลิงก์จากเพื่อนอีกครั้ง"],
    disabled:["ระบบกลุ่มยังไม่เปิดใช้","เว็บนี้ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์สำหรับกลุ่ม ยังหารบิลในเครื่องตัวเองได้ตามปกติ"],
    load:["โหลดกลุ่มไม่สำเร็จ","ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง"]
  })[ui.groupError] || ["โหลดกลุ่มไม่สำเร็จ",""];
  return appBar({ back:"#/history", title:"กลุ่ม" })+
    '<div class="page">'+
    '<div class="page-head"><h2>'+msg[0]+'</h2><p>'+msg[1]+'</p></div>'+
    '<div class="btn-stack">'+
      (ui.groupError==="load" ? '<button class="btn-main btn-block" id="groupRetry">ลองอีกครั้ง</button>' : '')+
      '<a class="btn-line btn-block" href="#/history">ไปหน้าประวัติ</a>'+
      '<a class="btn-line btn-block" href="#/">กลับหน้าหลัก</a>'+
    '</div></div>';
}

var THEMES = [ { id:"system", label:"ตามเครื่อง" }, { id:"light", label:"สว่าง" }, { id:"dark", label:"มืด" } ];
function pageMore(){
  function link(href, name, sub){
    return billRow(href, name, sub, "");
  }
  return appBar({ back:"#/", title:"ตั้งค่า" })+
    '<div class="page">'+
    '<section class="step-card" aria-labelledby="h-theme">'+
      '<div class="step-head"><h2 id="h-theme">ธีม</h2></div>'+
      '<div class="pick" role="group" aria-labelledby="h-theme">'+THEMES.map(function(t){
        return '<button data-theme-pick="'+t.id+'" aria-pressed="'+(ui.theme===t.id)+'">'+t.label+'</button>';
      }).join("")+'</div>'+
    '</section>'+
    '<h2 class="list-head">เกี่ยวกับ FairDish</h2>'+
    link("#/how","วิธีใช้","ทีละขั้น + คำถามที่ถูกถามบ่อย")+
    link("#/about","เกี่ยวกับ","ทีมผู้จัดทำและขอบเขตของเวอร์ชันนี้")+
    '<p class="hint" style="text-align:center;margin-top:var(--s5)">FairDish v'+APP_VERSION+'</p>'+
  '</div>';
}

function pageHow(){
  return appBar({ back:"#/more", title:"วิธีใช้" })+
    '<div class="page">'+
    '<div class="page-head"><h2>วิธีใช้ 4 ขั้น</h2>'+
    '<p>ออกแบบให้ทำเสร็จภายในเวลาที่พนักงานเดินไปเก็บเงินอีกโต๊ะ</p></div>'+
    '<div class="steps">'+
      '<div class="stp"><b>1</b><h3>ใครกินบ้าง</h3><p>พิมพ์ชื่อทุกคนที่ร่วมโต๊ะ กดเพิ่มทีละคน ชื่อเล่นสั้น ๆ อ่านง่ายที่สุดตอนดูบิล</p></div>'+
      '<div class="stp"><b>2</b><h3>รายการอาหาร</h3><p>ใส่ชื่อเมนูกับราคาต่อจาน แล้วแตะเลือกคนที่กินจานนั้น ถ้าทั้งโต๊ะกินกดปุ่มทุกคนได้เลย</p></div>'+
      '<div class="stp"><b>3</b><h3>ค่าส่วนกลาง</h3><p>เปิดค่าบริการหรือ VAT ตามที่ร้านคิด ส่วนน้ำเปล่า น้ำแข็ง ข้าวเหนียว ใส่เป็นรายการหารเท่ากัน</p></div>'+
      '<div class="stp"><b>4</b><h3>สรุปยอด</h3><p>เลือกว่าใครจ่ายให้ร้าน แล้วรู้เลยว่าใครต้องโอนให้ใคร ติ๊กเมื่อโอนแล้ว ไม่มีใครต้องตามทวง</p></div>'+
    '</div>'+
    '<section><div class="sec-head"><h2>บิลใบเดียวกัน สองวิธีคิด</h2>'+
      '<p>มื้ออีสานร้านหน้ามอ: 8 คน 10 เมนู รวมข้าวเหนียวกับน้ำ 1,110 บาท</p></div>'+
      '<div class="compare">'+
        '<div class="cmp bad"><h3>หารเท่ากันทั้งโต๊ะ</h3><div class="tag">1,110 ÷ 8 = ทุกคนจ่ายเท่ากัน</div>'+
          '<ul><li><span>โฟรค์ — กิน 2 เมนู</span><span>138.75</span></li>'+
          '<li><span>ยูกะ — ไม่กินเผ็ด 3 เมนู</span><span>138.75</span></li>'+
          '<li><span>ไอซ์ — กิน 6 เมนู มีซอยจุ๊</span><span>138.75</span></li></ul>'+
          '<p class="foot">โฟรค์จ่ายเกินไป 77.09 บาท ส่วนไอซ์จ่ายขาดไป 111.25 บาท ทั้งที่ไม่มีใครตั้งใจเอาเปรียบกัน</p></div>'+
        '<div class="cmp good"><h3>หารด้วย FairDish</h3><div class="tag">คิดจากเมนูที่แต่ละคนกินจริง</div>'+
          '<ul><li><span>โฟรค์ — กิน 2 เมนู</span><span>61.66</span></li>'+
          '<li><span>ยูกะ — ไม่กินเผ็ด 3 เมนู</span><span>121.67</span></li>'+
          '<li><span>ไอซ์ — กิน 6 เมนู มีซอยจุ๊</span><span>250.00</span></li></ul>'+
          '<p class="foot">ยอดรายคนรวมกันได้ 1,110.00 บาทพอดี ไม่มีเศษสตางค์หาย และทุกคนกดดูได้ว่ายอดของตัวเองมาจากเมนูไหน</p></div>'+
      '</div>'+
    '</section>'+
    '<section><div class="sec-head"><h2>สามคำถามที่ถูกถามบ่อย</h2></div>'+
      '<div class="split2">'+
        '<div class="panel"><h3>เศษสตางค์หายไปไหน</h3><p>ไม่หาย FairDish กระจายเศษสตางค์ให้ยอดรายคนรวมกันเท่ากับยอดบิลเป๊ะเสมอ ไม่ต้องมีใครควักเพิ่มทีหลัง</p></div>'+
        '<div class="panel"><h3>ค่าบริการคิดยังไง</h3><p>คิดเป็นเปอร์เซ็นต์จากยอดของแต่ละคนหลังรวมส่วนแบ่งค่าส่วนกลางแล้ว เหมือนที่ร้านคิดจากยอดบิลรวม</p></div>'+
        '<div class="panel"><h3>ปิดหน้าเว็บแล้วข้อมูลหายไหม</h3><p>ไม่หาย ระบบบันทึกบิลไว้ในเครื่องให้อัตโนมัติทุกครั้งที่แก้ข้อมูล เริ่มบิลใหม่แล้วบิลเดิมก็ยังอยู่ในหน้าประวัติ</p></div>'+
      '</div>'+
    '</section>'+
    '<section><div class="cta-box"><h2>พร้อมลองแล้ว</h2>'+
      '<p>มีข้อมูลตัวอย่างให้กดใส่ในหน้าหารบิล ลองดูผลก่อนใช้จริงได้</p>'+
      '<div class="btn-row"><button class="btn btn-main" type="button" data-open-kind="1">เริ่มบิลใหม่</button></div></div></section>'+
  '</div>';
}

function pageAbout(){
  return appBar({ back:"#/more", title:"เกี่ยวกับ" })+
    '<div class="page">'+
    '<div class="page-head"><h2>เกี่ยวกับ FairDish</h2>'+
    '<p>โปรเจกต์ที่เริ่มจากคำถามง่าย ๆ ว่าทำไมคนสั่งน้ำเปล่าแก้วเดียวต้องจ่ายเท่าคนสั่งสเต๊ก</p></div>'+
    '<div class="split2">'+
      '<div class="panel"><h3>ปัญหาที่ต้องการแก้</h3>'+
        '<p>การกินข้าวเป็นกลุ่มมักจบด้วยการหารเท่ากันทั้งโต๊ะ เพราะเร็วและไม่ต้องคิดมาก แต่คนที่กินน้อยหรือไม่ได้กินบางเมนูก็ต้องจ่ายมากกว่าที่ควร ความรู้สึกไม่เป็นธรรมสะสมจนกลายเป็นความขัดแย้งในกลุ่ม และการคิดเองก็ผิดพลาดง่ายเมื่อมีค่าบริการกับ VAT เข้ามา</p></div>'+
      '<div class="panel"><h3>ผู้ใช้ที่เราออกแบบให้</h3><dl class="dl">'+
          '<div><dt>ตัวแทนผู้ใช้</dt><dd>นายสมภูมิ อายุ 22 ปี นักศึกษา</dd></div>'+
          '<div><dt>สถานการณ์</dt><dd>กินข้าวกับเพื่อนเป็นกลุ่ม แต่ละคนสั่งไม่เท่ากัน</dd></div>'+
          '<div><dt>สิ่งที่ต้องการ</dt><dd>หารค่าอาหารให้ลงตัวโดยไม่ต้องเถียงกัน</dd></div>'+
          '<div><dt>สิ่งที่คาดหวัง</dt><dd>คำนวณถูกต้อง ครบถ้วน และอธิบายที่มาของยอดได้</dd></div>'+
      '</dl></div>'+
    '</div>'+
    '<section><div class="sec-head"><h2>ขอบเขตของเวอร์ชันนี้</h2>'+
      '<p>FairDish มีผู้ใช้ประเภทเดียว ทุกคนที่เปิดแอปทำสิ่งเดียวกันได้ทั้งหมด จึงไม่มีระบบสมาชิกหรือสิทธิ์แอดมินให้ต้องจำรหัสผ่าน</p></div>'+
      '<ul class="bill-list">'+
        item("✓","ใช้ได้ทันทีโดยไม่ต้องล็อกอิน","เปิดแล้วใช้เลย ไม่เก็บข้อมูลส่วนตัว ไม่ต้องรอโหลดบัญชี")+
        item("✓","บันทึกบิลไว้ในเครื่องให้อัตโนมัติ","แก้อะไรก็บันทึกทันที เริ่มบิลใหม่แล้วบิลเดิมเก็บไว้ในหน้าประวัติ เปิดกลับมาทำต่อได้")+
        item("—","ยังไม่มีลิงก์ให้เพื่อนกดยืนยันเมนูของตัวเอง","ตอนนี้เพื่อนในกลุ่มแก้บิลเดียวกันได้ทั้งหมด การยืนยันรายคนและ QR พร้อมเพย์เป็นสิ่งที่จะต่อยอดในเวอร์ชันถัดไป")+
      '</ul>'+
    '</section>'+
  '</div>';
}
