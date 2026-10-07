/* FairDish — แสดงผลหน้าแอปหารบิล */
"use strict";

/* =========================================================
   7. แสดงผลหน้าแอป
   ========================================================= */
/** v4.4: จอใหญ่ (≥600px — แท็บเล็ตและคอม) ใช้หน้าใน wide.js · ค่าเดียวกับ media query ใน css/style.css
    เปลี่ยนขนาดข้ามเส้นนี้ → onWideChange() ใน wide.js วาดหน้าใหม่ */
var WIDE_MQ = window.matchMedia ? window.matchMedia("(min-width:600px)") : null;
function isWide(){ return !!(WIDE_MQ && WIDE_MQ.matches); }

function render(){
  renderMealHead(); renderGroupBar(); renderMembers(); renderMenus(); renderCharges(); renderShared(); renderSummary();
  renderStepTabs(); renderTotalBar(); renderAppBarSub();
  if (wsActive()) renderWsHead();
  renderSideNav();                    // v4.4: ป้ายโอนแล้ว x/y ในแถบซ้าย
}

/* ---- v3.2: แผ่นล่างจอ (เพิ่ม/แก้เมนู, ค่าส่วนกลาง, ค่าบริการ, เลือกประเภทบิล) ---- */
/** ห่อฟอร์มเป็นแผ่นล่างจอ — slot ที่มีแผ่นเปิดอยู่แล้วจะไม่เล่นแอนิเมชันเปิดซ้ำ และคงตำแหน่งเลื่อนเดิม */
function sheetHTML(slot, label, body, closeAttr){
  var old = slot && slot.querySelector(".sheet");
  ui.sheetScroll = old ? old.scrollTop : 0;
  return '<div class="sheet-wrap'+(old ? ' still' : '')+'"><div class="sheet-backdrop" '+closeAttr+'></div>'+
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="'+label+'"><i class="sheet-grip" aria-hidden="true"></i>'+body+'</div></div>';
}
function restoreSheetScroll(slot){
  var sh = slot && slot.querySelector(".sheet");
  if (sh && ui.sheetScroll) sh.scrollTop = ui.sheetScroll;
  syncSheetLock();
}
/** ล็อกการเลื่อนหน้าหลังแผ่นล่างจอ */
function syncSheetLock(){
  document.body.classList.toggle("sheet-open", !!document.querySelector(".sheet-wrap"));
}
/** ชื่อบิลใต้หัวหน้าหารบิล (เปลี่ยนชื่อ/โหลดเสร็จแล้วอัปเดตโดยไม่วาดทั้งหน้า) */
function renderAppBarSub(){
  var wsName = document.querySelector(".ws-name");       // v4.4: ชื่อบิลบนหัวพื้นที่ทำงาน (จอใหญ่)
  if (wsName && !ui.tripStash){
    wsName.innerHTML = kt("icon")+' '+esc(billName())+' <span class="appbar-edit" aria-hidden="true">✎</span>';
    wsName.setAttribute("aria-label", L("เปลี่ยนชื่อบิล {name}", { name:billName() }));
  }
  var sub = document.querySelector(".appbar-sub");
  if (!sub || currentPath() !== "/split" || ui.tripStash) return;
  var html = kt("icon")+' '+esc(billName());
  if (!ui.ctx && !ui.loading){
    if (sub.tagName !== "BUTTON"){ sub.outerHTML = '<button class="appbar-sub" type="button" data-rename="1">'+html+' <span class="appbar-edit" aria-hidden="true">✎</span></button>'; return; }
    sub.innerHTML = html+' <span class="appbar-edit" aria-hidden="true">✎</span>';
    sub.setAttribute("aria-label", L("เปลี่ยนชื่อบิล {name}", { name:billName() }));
  } else sub.innerHTML = html;
  var title = document.querySelector(".appbar-title h1");
  if (title) title.textContent = kt("title");
}

/** v4.15: ปุ่มเลือกคนจ่าย (แตะเพื่อเพิ่ม/เอาออก จ่ายด้วยกันหลายคน = คนละเท่ากัน) attr="data-pay" → data-pay="<id>" */
function payerPickHTML(chosen, attr, label, prefix){
  return '<div class="pick payer-pick" role="group" aria-label="'+label+'">'+state.members.map(function(p){
    return '<button '+attr+'="'+(prefix || "")+p.id+'" aria-pressed="'+(chosen.indexOf(p.id) >= 0)+'">'+esc(p.name)+'</button>';
  }).join("")+'</div>';
}

/* ---- v3.1: หัวของมื้ออาหารในทริป (ชื่อมื้อ, ใครจ่าย, ยอดมื้อ) ---- */
function renderMealHead(){
  var box = document.getElementById("mealHead");
  if (!box) return;
  var item = currentMeal();
  if (!item || ui.loading){ box.innerHTML = ""; return; }
  var typing = document.activeElement && document.activeElement.id === "mealName";
  if (typing) return;                                   // อย่าวาดทับตอนกำลังพิมพ์ชื่อ
  var r = compute();
  box.innerHTML = '<section class="step-card meal-head" aria-label="'+L("ข้อมูลมื้อนี้")+'">'+
    '<label class="label" for="mealName">'+L("ชื่อมื้อ")+'</label>'+
    '<input type="text" id="mealName" value="'+esc(item.name)+'" maxlength="'+MAX_MENU_NAME+'" autocomplete="off" placeholder="'+L("เช่น มื้อเย็น ร้านส้มตำ")+'">'+
    '<div class="label" style="margin-top:var(--s4)">'+L("ใครจ่ายมื้อนี้")+' <span class="label-hint">'+L("เลือกได้หลายคน")+'</span></div>'+
    payerPickHTML(knownPayers(item), "data-meal-pay", L("ใครจ่ายมื้อนี้"))+
    (knownPayers(item).length ? '' : '<p class="field-msg error">'+L("เลือกว่าใครจ่ายมื้อนี้ จะได้รวมในการโอนของทริป")+'</p>')+
    '<p class="meal-total">'+L("ยอดมื้อนี้")+' <b>'+baht(r.grand)+' ฿</b> <span>'+L("หารตามที่แต่ละคนกินจริง")+'</span></p>'+
  '</section>';
}

/* ---- v2.1: แท็บขั้นตอน + แถบยอดรวมล่างจอ ---- */
function renderStepTabs(){
  if (!document.querySelector(".step-tabs")) return;
  var counts = {
    members: state.members.length,
    menus: state.menus.length,
    shared: state.shared.length + state.charges.filter(function(c){ return c.on; }).length,
    summary: 0
  };
  steps().forEach(function(st){
    var tab = document.getElementById("tab-"+st.id);
    var panel = document.getElementById("panel-"+st.id);
    if (!tab || !panel) return;
    var on = ui.step === st.id;
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
    var c = document.getElementById("count-"+st.id);
    if (c) c.textContent = (!ui.loading && counts[st.id]) ? counts[st.id] : "";
  });
  var next = document.getElementById("memberNext");
  if (next) next.innerHTML = (!ui.loading && state.members.length && !state.menus.length)
    ? '<button class="add-slot" data-step="menus" style="margin-top:var(--s4)">'+kt("next")+'</button>' : "";
  var hint = document.getElementById("menuNoMembers");
  if (hint) hint.innerHTML = (!ui.loading && !state.members.length)
    ? '<div class="notice info" style="margin:0 0 var(--s3)"><p>'+L("ยังไม่มีใครในบิลนี้ ใส่ชื่อก่อน แล้วค่อยเลือกว่าใครมีส่วนในรายการไหน")+'</p>'+
      '<button class="btn-quiet" data-step="members">'+L("ไปใส่ชื่อ")+'</button></div>' : "";
}
function setStep(step, focusTab){
  if (!steps().some(function(st){ return st.id===step; })) return;
  ui.step = step;
  renderStepTabs();
  var tab = document.getElementById("tab-"+step);
  if (focusTab && tab) tab.focus();
  jumpTo(0);
}
function renderTotalBar(){
  var bar = document.getElementById("totalBar");
  var side = document.getElementById("sideTotal");    // v4.3: จอคอม — ยอดมื้อในทริปอยู่ในแผงขวา
  if (!bar) return;
  var html = (ui.loading || !hasData()) ? "" : totalBarHTML();
  if (side) side.innerHTML = html ? '<div class="side-total">'+html+'</div>' : "";
  if (!html || isWide()){
    bar.hidden = true; bar.innerHTML = "";
    document.body.classList.remove("has-total");
    return;
  }
  bar.hidden = false;
  document.body.classList.add("has-total");
  bar.innerHTML = html;
}
/** ยอดรวม + ปุ่มไปต่อ (แถบล่างจอบนมือถือ / แผงขวาของมื้อในทริปบนคอม) */
function totalBarHTML(){
  var r = compute();
  var me = myMemberId();
  var mine = me ? r.list.filter(function(p){ return p.id===me; })[0] : null;
  var inMeal = !!ui.tripStash;
  return '<div class="t-sum"><span class="t-label">'+(inMeal ? L("ยอดมื้อนี้") : L("รวมทั้งหมด"))+(mine ? ' · '+L("ฉัน {amt}", { amt:baht(mine.rounded) }) : '')+'</span>'+
      '<span class="t-amt">'+baht(r.grand)+' ฿</span></div>'+
    (inMeal ? '<button class="btn-main" type="button" data-back-trip="1">'+L("กลับไปที่ทริป")+'</button>'
            : '<a class="btn-main" href="'+billHref()+'">'+L("ดูใบสรุปยอด")+'</a>');
}

/* ---- v2.0: แถบกลุ่ม (ลิงก์แชร์ + ฉันคือใคร) ---- */
function renderGroupBar(){
  var box = document.getElementById("groupBar");
  if (!box) return;
  if (ui.loading){ box.innerHTML = ""; return; }
  if (!ui.ctx){ box.innerHTML = ""; return; }   // v2.6: คำชวนสร้างกลุ่มย้ายไปเป็นลิงก์ท้ายหน้า
  var me = myMemberId();
  var sub = me
    ? '<button class="group-sub" data-group-panel="1">'+L("คุณคือ")+' <b>'+esc(nameOf(me))+'</b></button>'
    : (state.members.length ? '<button class="group-sub prompt" data-group-panel="1">'+L("เลือกว่าคุณคือใคร ›")+'</button>' : '');
  var panel = !ui.groupPanel ? '' :
    '<div class="group-panel" id="groupPanel">'+
      '<div class="group-link">'+
        '<label class="sr-only" for="groupLinkInput">'+L("ลิงก์กลุ่ม")+'</label>'+
        '<input type="text" id="groupLinkInput" readonly value="'+esc(groupLink(ui.ctx))+'">'+
        '<button class="btn-quiet" id="groupCopy">'+L("คัดลอก")+'</button>'+
      '</div>'+
      '<p class="sub-head">'+L("ฉันคือใคร")+' <span class="muted">'+L("(จำไว้ในเครื่องนี้ ยอดของคุณจะถูกไฮไลต์)")+'</span></p>'+
      (state.members.length
        ? '<div class="pick" role="group" aria-label="'+L("ฉันคือใคร")+'">'+state.members.map(function(p){
            return '<button data-me="'+p.id+'" aria-pressed="'+(p.id===me)+'">'+esc(p.name)+'</button>';
          }).join("")+'</div>'
        : '<p class="hint" style="margin:0">'+L("เพิ่มชื่อในแท็บ \"คน\" ก่อน แล้วเลือกว่าคุณคือใคร")+'</p>')+
      '<div class="group-actions">'+
        '<button class="btn-quiet btn-xs" id="groupRefresh">'+L("โหลดข้อมูลล่าสุด")+'</button>'+
        '<a class="group-leave" href="#/split">'+L("← กลับไปบิลส่วนตัว")+'</a>'+
        (canDissolve() ? '<button class="link-btn danger" type="button" data-dissolve="1">'+L("ยุบกลุ่ม")+'</button>' : '')+
      '</div>'+
    '</div>';
  box.innerHTML =
    '<section class="group-bar" aria-labelledby="h-group">'+
      '<div class="group-top">'+
        '<div class="group-title"><span class="eyebrow">'+L("กลุ่ม")+'</span><h2 id="h-group">'+esc(Store.groupName)+'</h2>'+sub+'</div>'+
        '<button class="btn-sm btn-xs" id="groupShare">'+ICON_SHARE+' '+L("ชวนเพื่อน")+'</button>'+
        '<button class="icon-btn" data-group-panel="1" aria-expanded="'+ui.groupPanel+'" aria-controls="groupPanel" aria-label="'+L("ตัวเลือกกลุ่ม")+'">'+ICON_MORE+'</button>'+
      '</div>'+
      myTotalHTML()+
      panel+
    '</section>';
}
/** v2.4: ยอดของ "ฉัน" ตัวใหญ่ — คนสนใจตัวเลขของตัวเองที่สุด */
function myTotalHTML(){
  var mine = myShare();
  if (!mine) return "";
  return '<a class="my-total" href="'+billHref()+'">'+
    '<span class="my-label">'+L("ยอดของคุณ")+(myTransferText() ? '<span class="my-sub">'+esc(myTransferText())+'</span>' : '')+'</span>'+
    '<span class="my-amt">'+baht(mine.rounded)+' <small>'+L("บาท")+'</small></span>'+
    '<span class="my-go" aria-hidden="true">›</span></a>';
}

/* ---- ฟีเจอร์ที่ 1: จัดการสมาชิก ---- */
function renderMembers(){
  if (wsActive()) return renderWsPeople();
  var box = document.getElementById("memberList");
  var extra = document.getElementById("memberExtra");
  var input = document.getElementById("memberInput");
  var addBtn = document.getElementById("memberAdd");
  var msg = document.getElementById("memberMsg");
  if (!box) return;

  if (addBtn){
    addBtn.disabled = ui.savingMember;
    addBtn.innerHTML = ui.savingMember ? '<span class="spinner" aria-hidden="true"></span>'+L("กำลังบันทึก") : L("เพิ่ม");
  }
  if (input) input.setAttribute("aria-invalid", ui.memberError ? "true" : "false");
  var count = document.getElementById("memberCount");
  if (count) count.textContent = (!ui.loading && state.members.length) ? L("{n} คน", { n:state.members.length }) : "";
  if (msg){
    msg.className = "field-msg " + (ui.memberError ? "error" : "muted");
    msg.textContent = ui.memberError
      || (state.members.length ? L("แตะชื่อเพื่อแก้หรือลบ")
                               : L("ใส่ได้ทั้งชื่อจริงและชื่อเล่น สั้น ๆ อ่านง่ายที่สุด"));
  }

  if (ui.loading){
    // งาน 3.3: ตอนโหลดบิลกลุ่มบอกเป็นข้อความด้วย (มือถือเดิมมีแค่แถบจาง ๆ ดูเหมือนบิลว่าง)
    box.innerHTML = '<div class="skeleton" aria-hidden="true"><i></i><i></i><i></i></div>'+'<p class="hint" role="status" style="margin:var(--s2) 0 0">'+L("กำลังโหลดข้อมูลบิล…")+'</p>';
    if (extra) extra.innerHTML = "";
    return;
  }

  if (state.members.length === 0){
    box.innerHTML = '<p class="empty" style="margin-top:var(--s3)">'+kt("noPeople")+'</p>';
  } else {
    box.innerHTML = '<div class="chips">' + state.members.map(function(p){
      if (ui.editingMember === p.id){
        return '<span class="chip editing">'+
          '<label class="sr-only" for="editMemberInput">'+L("แก้ชื่อ {name}", { name:esc(p.name) })+'</label>'+
          '<input type="text" id="editMemberInput" value="'+esc(p.name)+'" maxlength="'+MAX_NAME+'" autocomplete="off">'+
          '<button class="act" data-save-member="'+p.id+'" aria-label="'+L("บันทึกชื่อใหม่")+'">✓</button>'+
          '<button class="act del" data-del-member="'+p.id+'" aria-label="'+L("ลบ {name} ออกจากโต๊ะ", { name:esc(p.name) })+'">'+ICON_DEL+'</button>'+
          '<button class="act" data-cancel-edit="1" aria-label="'+L("ยกเลิกการแก้ชื่อ")+'">'+ICON_X+'</button>'+
        '</span>';
      }
      // v2.6: ชิปเหลือแค่ชื่อ แตะเพื่อแก้หรือลบ (ไอคอนไปอยู่ในโหมดแก้)
      return '<button class="chip chip-tap" data-edit-member="'+p.id+'" aria-label="'+L("{name}: แตะเพื่อแก้หรือลบ", { name:esc(p.name) })+'">'+
        '<span class="nm">'+esc(p.name)+'</span></button>';
    }).join("") + '</div>';
  }

  if (extra) extra.innerHTML = memberExtraHTML();
}
/** ข้อความผิดพลาด + กล่องยืนยันการลบสมาชิก (ใช้ทั้งหน้ามือถือและพื้นที่ทำงานจอใหญ่) */
function memberExtraHTML(){
  var html = addSelfHTML();   // v4.6
  // v4.8: ทริปในเครื่อง → สร้างกลุ่มได้ตั้งแต่ตอนใส่คน (ทุกคนใส่ค่าใช้จ่ายเองตลอดทริป)
  if (state.kind === "trip" && ui.ctx === null && !ui.loading && !ui.tour && !ui.tripStash && Cloud.ready())
    html += '<button class="add-slot add-self" type="button" id="inviteBtn">'+ICON_USERS+' '+inviteLabel()+'</button>';
  if (ui.editError) html += '<div class="notice error"><p>'+esc(ui.editError)+'</p></div>';
  if (ui.save === "error" && ui.saveFailedIn !== "menu") html += saveErrorNotice();
  if (ui.confirmMember){
    var m = state.members.filter(function(p){ return p.id === ui.confirmMember; })[0];
    if (m){
      var n = menusOf(m.id).length;
      html += '<div class="confirm" role="alertdialog" aria-label="'+L("ยืนยันการลบสมาชิก")+'">'+
        '<h3>'+L("ลบ {name} ออกจากโต๊ะ?", { name:esc(m.name) })+'</h3>'+
        '<p>'+L("{name} อยู่ใน {n} เมนู ระบบจะนำชื่อออกจากเมนูเหล่านั้นแล้วคิดยอดใหม่ให้เฉพาะคนที่เหลือ", { name:esc(m.name), n:n })+'</p>'+
        '<div class="btn-row"><button class="btn-quiet" data-cancel-del="1">'+L("ยกเลิก")+'</button>'+
        '<button class="btn-danger" data-confirm-del="'+m.id+'">'+L("ลบออก")+'</button></div></div>';
    }
  }
  return html;
}

/** v3.1: แถวมื้ออาหารในรายการทริป — แตะเพื่อเข้าไปแก้เมนูข้างใน */
function mealRow(m){
  var sub = mealTotalOf(m), n = mealOf(m).menus.length;
  var paidBy = payerText(m), unpaid = sub.grand > 0 && !paidBy;
  var who = (unpaid ? '<span class="unpaid">'+L("ยังไม่เลือกคนจ่าย")+'</span>' : (paidBy ? '<b class="payer-tag">'+paidBy+'</b>' : ''))+
    (unpaid || paidBy ? ' · ' : '')+(n ? L("{n} เมนู", { n:n }) : L("ยังไม่มีเมนู"));
  return '<div class="row-item meal-row'+(unpaid ? ' warn' : '')+'">'+
    '<button class="row-tap" data-open-meal="'+m.id+'" aria-label="'+L("เปิดมื้อ {name}", { name:esc(m.name) })+'">'+
      '<span class="body"><span class="name">🍲 '+esc(m.name)+'</span><span class="sub">'+who+'</span></span>'+
      '<span class="amt">'+baht(sub.grand)+'<small>'+L("ตามที่กิน ›")+'</small></span>'+
    '</button></div>';
}
/** v2.6: ชื่อคนกินแบบสั้น ไม่ให้แถวยาวหลายบรรทัด — "ทุกคน" / "มาร์ค · พูม · ไอซ์" / "มาร์ค · พูม +3" */
function eatersLabel(ids){
  if (ids.length === state.members.length && ids.length > 1) return L("ทุกคน ({n})", { n:ids.length });
  var names = ids.map(function(id){ return esc(nameOf(id)); });
  return names.length <= 3 ? names.join(" · ") : names.slice(0,2).join(" · ")+" +"+(names.length-2);
}
function renderMenus(){
  var list = document.getElementById("menuList");
  var slot = document.getElementById("menuFormSlot");
  var meta = document.getElementById("menuMeta");
  var ws = wsActive();                // v4.4: จอใหญ่ — การ์ดรายการวาดใน renderWsMenus() ฟอร์มแก้ยังเป็นแผ่นเดิม
  if (ws){ renderWsMenus(); list = null; }
  if (!slot || (!list && !ws)) return;

  if (ui.loading){
    if (meta) meta.textContent = "";
    if (list) list.innerHTML = '<div class="skeleton" aria-hidden="true"><i style="width:100%"></i></div>'+'<p class="hint" role="status" style="margin:var(--s2) 0 0">'+L("กำลังโหลดข้อมูลบิล…")+'</p>';
    slot.innerHTML = "";
    return;
  }

  var total = state.kind === "trip" ? compute().grand : state.menus.reduce(function(a,m){ return a+m.price; },0);
  if (meta) meta.textContent = state.menus.length ? L("รวม {amt} ฿", { amt:baht(total) }) : "";

  if (!list){ /* จอใหญ่ */ }
  else if (state.menus.length===0 && !state.menuForm){
    list.innerHTML = '<p class="empty">'+kt("empty")+'</p>';
  } else {
    list.innerHTML = state.menus.map(function(m){
      if (m.type === "meal") return mealRow(m);
      var known = m.eaters.filter(function(id){ return !!nameOf(id); });
      var who = known.length ? eatersLabel(known) : L("ยังไม่ได้เลือกคนมีส่วน จึงยังไม่ถูกนำไปคำนวณ");
      var trip = state.kind === "trip";
      var unpaid = trip && known.length && !knownPayers(m).length;
      if (trip && known.length) who = (unpaid ? '<span class="unpaid">'+L("ยังไม่เลือกคนจ่าย")+'</span>' : '<b class="payer-tag">'+payerText(m)+'</b>')+' · '+who;
      var each = known.length > 1 ? '<small>'+L("คนละ {amt}", { amt:baht(m.price/known.length) })+'</small>' : '';
      var editing = state.menuForm && state.menuForm.id===m.id;
      // v2.6: แถวไม่มีไอคอน แตะแถวเพื่อแก้ ปุ่มอีกจาน/ลบอยู่ในฟอร์มแก้
      return '<div class="row-item'+(known.length && !unpaid ? "" : " warn")+(editing?" editing":"")+'">'+
        '<button class="row-tap" data-edit-menu="'+m.id+'" aria-label="'+L("แก้ไข {name}", { name:esc(m.name) })+'">'+
          '<span class="body"><span class="name">'+esc(m.name)+'</span><span class="sub">'+who+'</span></span>'+
          '<span class="amt">'+baht(m.price)+each+'</span>'+
        '</button></div>';
    }).join("");
  }

  var notice = (ui.save === "error" && ui.saveFailedIn === "menu") ? saveErrorNotice() : "";

  if (!state.menuForm){
    if (ws){ slot.innerHTML = notice; syncSheetLock(); return; }
    slot.innerHTML = (state.kind === "trip"
      ? '<div class="add-row"><button class="add-slot" id="menuOpen">'+kt("addShort")+'</button>'+
        '<button class="add-slot" data-add-meal="1">'+L("+ มื้ออาหาร 🍲")+'</button></div>'
      : '<button class="add-slot" id="menuOpen">'+kt("add")+'</button>')+notice;
    syncSheetLock();
    return;
  }

  var f = state.menuForm;
  var e = ui.menuErr || {};
  var all = state.members.length>0 && f.eaters.length===state.members.length;
  var picks = state.members.length
    ? '<div class="pick"><button class="all" data-eat-all="1" aria-pressed="'+all+'">'+L("ทุกคน")+'</button>'+
      state.members.map(function(p){
        return '<button data-eat="'+p.id+'" aria-pressed="'+(f.eaters.indexOf(p.id)>=0)+'">'+esc(p.name)+'</button>';
      }).join("")+'</div>'
    : '';
  var preview = menuPreviewText(f);
  // v3.0: ทริป — ใครจ่ายรายการนี้ (v4.15: เลือกได้หลายคน จ่ายคนละเท่ากัน)
  var payerPick = state.kind === "trip" && state.members.length
    ? '<div class="label">'+L("ใครจ่ายรายการนี้")+' <span class="label-hint">'+L("เลือกได้หลายคน")+'</span></div>'+
      payerPickHTML(knownPayers(f), "data-pay", L("ใครจ่ายรายการนี้"))+
      (e.payer ? '<p class="field-msg error" aria-live="polite">'+esc(e.payer)+'</p>' : '')
    : '';

  slot.innerHTML = sheetHTML(slot, (f.id?kt("editItem"):kt("newItem")),
    '<div class="form-box" role="group" aria-label="'+(f.id?kt("editItem"):kt("newItem"))+'">'+
      '<div class="form-title">'+(f.id?kt("editItem"):kt("newItem"))+'</div>'+
      '<div><label class="sr-only" for="mName">'+kt("nameLabel")+'</label>'+
        '<input type="text" id="mName" placeholder="'+kt("namePh")+'" value="'+esc(f.name)+'" autocomplete="off" maxlength="'+MAX_MENU_NAME+'" aria-describedby="mNameMsg" role="combobox" aria-expanded="false" aria-controls="mSuggestList" aria-autocomplete="list" aria-invalid="'+(e.name?"true":"false")+'">'+
        '<div id="mSuggest"></div>'+
        '<p class="field-msg '+(e.name?"error":"muted")+'" id="mNameMsg" aria-live="polite">'+(e.name?esc(e.name):"")+'</p></div>'+
      '<div><label class="sr-only" for="mPrice">'+kt("pricePh")+'</label>'+
        '<input type="number" id="mPrice" inputmode="decimal" step="0.01" min="0" placeholder="'+kt("pricePh")+'" value="'+(f.price===""?"":esc(f.price))+'" aria-describedby="mPriceMsg" aria-invalid="'+(e.price?"true":"false")+'">'+
        '<p class="field-msg '+(e.price?"error":"muted")+'" id="mPriceMsg" aria-live="polite">'+(e.price?esc(e.price):"")+'</p></div>'+
      payerPick+
      '<div class="label">'+kt("who")+(state.members.length>1 && !f.eaters.length ? ' <span class="label-hint">'+kt("whoHint")+'</span>' : '')+'</div>'+picks+
      (e.eaters
        ? '<p class="field-msg error" aria-live="polite">'+esc(e.eaters)+'</p>'
        : '<p class="form-preview" id="mPreview" aria-live="polite">'+preview+'</p>')+
      '<div class="form-actions">'+
        '<button class="btn-quiet" id="mCancel">'+L("ยกเลิก")+'</button>'+
        '<button class="btn-sm" id="mSave"'+(ui.savingMenu?" disabled":"")+'>'+
          (ui.savingMenu ? '<span class="spinner" aria-hidden="true"></span>'+L("กำลังบันทึก") : (f.id?L("บันทึก"):kt("addBtn")))+
        '</button>'+
      '</div>'+
      (f.id ? '<div class="form-more">'+
        '<button class="link-btn" data-dup-menu="'+f.id+'">'+ICON_COPY+' '+kt("another")+'</button>'+
        '<button class="link-btn danger" data-del-menu="'+f.id+'">'+ICON_DEL+' '+kt("del")+'</button></div>' : '')+
    '</div>', 'data-close-sheet="menu"')+notice;
  restoreSheetScroll(slot);

  if (ui.suggest.open) renderSuggestions();

  if (ui.focusMenuField){
    var target = document.getElementById(ui.focusMenuField);
    ui.focusMenuField = null;
    if (target) target.focus();
  }
}

function renderCharges(){
  var box = document.getElementById("chargeList");
  if (!box) return;
  box.innerHTML = state.charges.map(function(c){
    return '<button data-charge="'+c.id+'" aria-pressed="'+c.on+'">'+(c.fixed ? L(c.label) : esc(c.label))+' '+c.rate+' %'+
      (c.fixed?"":' <span data-del-charge="'+c.id+'" style="margin-left:var(--s2);opacity:.75">×</span>')+'</button>';
  }).join("") + '<button class="all" id="chargeOpen">'+L("+ กำหนดเอง")+'</button>';

  var slot = document.getElementById("chargeFormSlot");
  if (!state.chargeForm){ slot.innerHTML = ""; syncSheetLock(); return; }
  slot.innerHTML = sheetHTML(slot, L("เพิ่มค่าใช้จ่ายแบบเปอร์เซ็นต์"),
    '<div class="form-box">'+
      '<div class="form-title">'+L("ค่าใช้จ่ายแบบเปอร์เซ็นต์")+'</div>'+
      '<label class="sr-only" for="cLabel">'+L("ชื่อค่าใช้จ่าย")+'</label>'+
      '<input type="text" id="cLabel" placeholder="'+L("ชื่อค่าใช้จ่าย เช่น ค่าเปิดขวด")+'" autocomplete="off">'+
      '<label class="sr-only" for="cRate">'+L("เปอร์เซ็นต์")+'</label>'+
      '<input type="number" id="cRate" inputmode="decimal" step="0.1" min="0" placeholder="'+L("เปอร์เซ็นต์ (%)")+'">'+
      '<div class="form-actions"><button class="btn-quiet" id="cCancel">'+L("ยกเลิก")+'</button>'+
      '<button class="btn-sm" id="cSave">'+L("เพิ่ม")+'</button></div>'+
    '</div>', 'data-close-sheet="charge"');
  syncSheetLock();
  document.getElementById("cLabel").focus();
}

function renderShared(){
  var list = document.getElementById("sharedList");
  var slot = document.getElementById("sharedFormSlot");
  if (!list || !slot) return;
  list.innerHTML = state.shared.map(function(s){
    return '<div class="row-item"><div class="body"><div class="name">'+esc(s.name)+'</div></div>'+
      '<span class="amt">'+baht(s.price)+'</span>'+
      '<span class="acts"><button class="icon-btn icon-sm" data-del-shared="'+s.id+'" aria-label="'+L("ลบ {name}", { name:esc(s.name) })+'">'+ICON_X+'</button></span></div>';
  }).join("");
  if (!state.sharedForm){
    slot.innerHTML = '<button class="add-slot" id="sharedOpen">'+L("+ เพิ่มรายการ เช่น น้ำแข็ง น้ำเปล่า")+'</button>';
    ui.sharedSuggest = { open:false, items:[], active:-1 };
    syncSheetLock();
    return;
  }
  slot.innerHTML = sheetHTML(slot, L("เพิ่มรายการหารเท่ากัน"),
    '<div class="form-box">'+
      '<div class="form-title">'+L("เพิ่มรายการหารเท่ากัน")+'</div>'+
      '<label class="sr-only" for="sName">'+L("ชื่อรายการ")+'</label>'+
      '<input type="text" id="sName" placeholder="'+L("ชื่อรายการ เช่น น้ำแข็ง")+'" autocomplete="off" '+
        'role="combobox" aria-autocomplete="list" aria-controls="sSuggest" aria-expanded="false">'+
      '<div id="sSuggest"></div>'+
      '<label class="sr-only" for="sPrice">'+L("ราคา")+'</label>'+
      '<input type="number" id="sPrice" inputmode="decimal" step="0.01" min="0" placeholder="'+L("ราคา (บาท)")+'">'+
      '<div class="form-actions"><button class="btn-quiet" id="sCancel">'+L("ยกเลิก")+'</button>'+
      '<button class="btn-sm" id="sSave">'+L("เพิ่ม")+'</button></div>'+
    '</div>', 'data-close-sheet="shared"');
  syncSheetLock();
  document.getElementById("sName").focus();
  ui.sharedSuggest = { open:true, items:[], active:-1 };
  renderSharedSuggestions();
}

/* ---- v3.2: แท็บสรุป — ยอดรายคน + ใครจ่าย + ใครโอนให้ใคร ---- */
function renderSummary(){
  if (wsActive()) return renderWsSum();
  var box = document.getElementById("summary");
  var aside = document.getElementById("summaryAside");
  if (!box) return;
  if (ui.loading){ box.innerHTML = '<p class="empty">'+L("กำลังโหลดข้อมูล…")+'</p>'; return; }
  if (!hasData()){
    if (aside) aside.textContent = "";
    box.innerHTML = '<p class="empty">'+kt("emptySummary")+'</p>';
    return;
  }
  var r = compute();
  var me = myMemberId();
  if (aside) aside.textContent = L("{n} คน", { n:r.n });
  box.innerHTML =
    (r.orphan>0 ? '<div class="notice warn" style="margin:0 0 var(--s3)"><p>'+L("มี {n} {what} จึงยังไม่ถูกรวมในบิลนี้", { n:r.orphan, what:kt("orphan") })+'</p></div>' : '')+
    '<div class="sum-list">'+r.list.map(function(p){
      return '<div class="sum-row'+(p.id===me ? ' me' : '')+'"><span>'+esc(p.name)+(p.id===me ? ' <span class="me-tag">'+L("ฉัน")+'</span>' : '')+'</span>'+
        '<span class="mono">'+baht(p.rounded)+'</span></div>';
    }).join("")+'</div>'+
    '<div class="sum-total"><span>'+L("รวมทั้งหมด")+'</span><span class="mono">'+baht(r.grand)+' ฿</span></div>'+
    settleHTML(r)+
    '<a class="btn-main btn-block" style="margin-top:var(--s5)" href="'+billHref()+'">'+L("ดูใบสรุปยอด")+'</a>';
}
