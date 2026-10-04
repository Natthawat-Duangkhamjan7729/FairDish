/* FairDish — แสดงผลหน้าแอปหารบิล */
"use strict";

/* =========================================================
   7. แสดงผลหน้าแอป
   ========================================================= */
function render(){
  renderTitle(); renderKindSlot(); renderMealHead(); renderGroupBar(); renderMembers(); renderMenus(); renderCharges(); renderShared(); renderSummary();
  renderStepTabs(); renderTotalBar(); syncSheet();
}

/* ---- v4.0: ฟอร์มเพิ่ม/แก้รายการเป็น bottom sheet บนมือถือ (CSS ใช้ body.sheet-open) ---- */
function syncSheet(){
  var open = currentPath() === "/split" && !!(state.menuForm || state.sharedForm || state.chargeForm);
  document.body.classList.toggle("sheet-open", open);
}

/* ---- v4.0: ชื่อบิลส่วนตัว (บิลกลุ่มใช้ชื่อกลุ่ม) ---- */
function renderTitle(){
  var box = document.getElementById("titleSlot");
  if (!box) return;
  if (ui.loading){ box.innerHTML = ""; return; }
  if (document.activeElement && document.activeElement.id === "billTitle") return;   // กำลังพิมพ์อยู่ อย่าวาดทับ
  box.innerHTML = '<label class="sr-only" for="billTitle">'+L("ชื่อบิล")+'</label>'+
    '<input type="text" id="billTitle" class="title-input" maxlength="'+MAX_MENU_NAME+'" autocomplete="off" value="'+esc(state.title)+'" '+
      'placeholder="'+esc(L("ตั้งชื่อบิล เช่น {name}", { name:billTitle({ kind:state.kind }) }))+'">';
}
async function renameBill(value){
  var name = String(value || "").trim().replace(/\s+/g," ").slice(0, MAX_MENU_NAME);
  if (name === state.title) return;
  state.title = name;
  await commit(name ? L("ตั้งชื่อบิลเป็น {name} แล้ว", { name:name }) : null);
}

/* ---- v3.0: สลับประเภทบิล (สลับได้เมื่อยังไม่มีรายการ) ---- */
function renderKindSlot(){
  var box = document.getElementById("kindSlot");
  if (!box) return;
  box.innerHTML = ui.loading ? "" : kindSwitch("data-kind", state.kind);
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
    '<div class="label" style="margin-top:var(--s4)">'+L("ใครจ่ายมื้อนี้")+'</div>'+
    '<div class="pick payer-pick" role="radiogroup" aria-label="'+L("ใครจ่ายมื้อนี้")+'">'+state.members.map(function(p){
      var on = item.payer === p.id;
      return '<button role="radio" data-meal-pay="'+p.id+'" aria-pressed="'+on+'" aria-checked="'+on+'">'+esc(p.name)+'</button>';
    }).join("")+'</div>'+
    (nameOf(item.payer) ? '' : '<p class="field-msg error">'+L("เลือกว่าใครจ่ายมื้อนี้ จะได้รวมในการโอนของทริป")+'</p>')+
    '<p class="meal-total">'+L("ยอดมื้อนี้")+' <b>'+baht(r.grand)+' ฿</b> <span>'+L("หารตามที่แต่ละคนกินจริง")+'</span></p>'+
  '</section>';
}

/* ---- v2.1: แท็บขั้นตอน + แถบยอดรวมล่างจอ ---- */
function renderStepTabs(){
  if (!document.querySelector(".step-tabs")) return;
  var counts = {
    members: state.members.length,
    menus: state.menus.length,
    shared: state.shared.length + state.charges.filter(function(c){ return c.on; }).length
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
  var tabs = document.querySelector(".step-tabs");
  if (tabs && tabs.getBoundingClientRect().top < 0) tabs.scrollIntoView({ block:"start" });
}
function renderTotalBar(){
  var bar = document.getElementById("totalBar");
  if (!bar) return;
  if (ui.loading || !hasData()){
    bar.hidden = true; bar.innerHTML = "";
    document.body.classList.remove("has-total");
    return;
  }
  var r = compute();
  var me = myMemberId();
  var mine = me ? r.list.filter(function(p){ return p.id===me; })[0] : null;
  bar.hidden = false;
  document.body.classList.add("has-total");
  bar.innerHTML = '<a href="'+billHref()+'" aria-label="'+L("ดูใบสรุปยอด รวม {amt} บาท", { amt:baht(r.grand) })+'">'+
    '<span class="t-meta">'+L("{n} คน", { n:r.n })+(mine ? ' · '+L("ฉัน {amt}", { amt:baht(mine.rounded) }) : '')+'</span>'+
    '<span class="t-sum">'+baht(r.grand)+' ฿</span>'+
    '<span class="t-go">'+L("ดูสรุป")+' ›</span></a>';
}

/* ---- v2.0: แถบกลุ่ม (ลิงก์แชร์ + ฉันคือใคร) ---- */
function renderGroupBar(){
  var box = document.getElementById("groupBar");
  if (!box) return;
  if (ui.loading){ box.innerHTML = ""; return; }
  if (!ui.ctx){ box.innerHTML = ""; return; }   // v2.6: คำชวนสร้างกลุ่มย้ายไปเป็นลิงก์ท้ายหน้า
  var me = myMemberId();
  var sub = me
    ? '<button class="group-sub" data-group-panel="1">'+L("คุณคือ {name}", { name:'<b>'+esc(nameOf(me))+'</b>' })+'</button>'
    : (state.members.length ? '<button class="group-sub prompt" data-group-panel="1">'+L("เลือกว่าคุณคือใคร")+' ›</button>' : '');
  // v4.0: ชวนยืนยันเมนูของตัวเอง ถ้ายังไม่ยืนยันหรือมีคนแก้หลังยืนยัน
  var cf = "";
  if (me && hasData()){
    var st = confirmStatusOf(serialize(), me);
    if (st !== "confirmed") cf = '<a class="cf-nudge" href="#/g/'+esc(ui.ctx)+'/me">'+
      (st === "changed" ? L("มีคนแก้รายการของคุณ — ตรวจแล้วยืนยันอีกครั้ง") : L("ติ๊กเมนูที่คุณกินแล้วกดยืนยัน"))+' ›</a>';
  }
  var panel = !ui.groupPanel ? '' :
    '<div class="group-panel" id="groupPanel">'+
      '<div class="group-link">'+
        '<label class="sr-only" for="groupLinkInput">'+L("ลิงก์กลุ่ม")+'</label>'+
        '<input type="text" id="groupLinkInput" readonly value="'+esc(groupLink(ui.ctx))+'">'+
        '<button class="btn-quiet" id="groupCopy">'+L("คัดลอก")+'</button>'+
      '</div>'+
      '<p class="sub-head">'+L("ฉันคือใคร")+' <span class="muted">('+L("จำไว้ในเครื่องนี้ ยอดของคุณจะถูกไฮไลต์")+')</span></p>'+
      (state.members.length
        ? '<div class="pick" role="group" aria-label="'+L("ฉันคือใคร")+'">'+state.members.map(function(p){
            return '<button data-me="'+p.id+'" aria-pressed="'+(p.id===me)+'">'+esc(p.name)+'</button>';
          }).join("")+'</div>'
        : '<p class="hint" style="margin:0">'+L("เพิ่มชื่อในแท็บ \"คน\" ก่อน แล้วเลือกว่าคุณคือใคร")+'</p>')+
      '<div class="group-actions">'+
        '<button class="btn-quiet btn-xs" id="groupRefresh">'+L("โหลดข้อมูลล่าสุด")+'</button>'+
        '<a class="group-leave" href="#/split">← '+L("กลับไปบิลส่วนตัว")+'</a>'+
      '</div>'+
    '</div>';
  box.innerHTML =
    '<section class="group-bar" aria-labelledby="h-group">'+
      '<div class="group-top">'+
        '<div class="group-title"><span class="eyebrow">'+L("บิลกลุ่ม")+'</span><h2 id="h-group">'+esc(Store.groupName)+'</h2>'+sub+'</div>'+
        '<button class="btn-sm btn-xs" id="groupShare" aria-haspopup="dialog">'+ICON_SHARE+' '+L("ชวนเพื่อน")+'</button>'+
        '<button class="icon-btn" data-group-panel="1" aria-expanded="'+ui.groupPanel+'" aria-controls="groupPanel" aria-label="'+L("ตัวเลือกกลุ่ม")+'">'+ICON_MORE+'</button>'+
      '</div>'+
      myTotalHTML()+
      cf+
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
  if (msg){
    msg.className = "field-msg " + (ui.memberError ? "error" : "muted");
    msg.textContent = ui.memberError
      || (state.members.length ? L("แตะชื่อเพื่อแก้หรือลบ")
                               : L("ใส่ได้ทั้งชื่อจริงและชื่อเล่น สั้น ๆ อ่านง่ายที่สุด"));
  }

  if (ui.loading){
    box.innerHTML = '<div class="skeleton" aria-hidden="true"><i></i><i></i><i></i></div>';
    if (extra) extra.innerHTML = "";
    return;
  }

  if (state.members.length === 0){
    box.innerHTML = '<p class="empty" style="margin-top:var(--s3)">'+(state.kind === "trip"
      ? L("ยังไม่มีใครในทริป — ใส่ชื่อคนแรกได้เลย") : L("ยังไม่มีใครในโต๊ะ — ใส่ชื่อคนแรกได้เลย"))+'</p>';
  } else {
    box.innerHTML = '<div class="chips">' + state.members.map(function(p){
      if (ui.editingMember === p.id){
        return '<span class="chip editing">'+
          '<label class="sr-only" for="editMemberInput">'+L("แก้ชื่อ {name}", { name:esc(p.name) })+'</label>'+
          '<input type="text" id="editMemberInput" value="'+esc(p.name)+'" maxlength="'+MAX_NAME+'" autocomplete="off">'+
          '<button class="act" data-save-member="'+p.id+'" aria-label="'+L("บันทึกชื่อใหม่")+'">✓</button>'+
          '<button class="act del" data-del-member="'+p.id+'" aria-label="'+L("ลบ {name} ออก", { name:esc(p.name) })+'">'+ICON_DEL+'</button>'+
          '<button class="act" data-cancel-edit="1" aria-label="'+L("ยกเลิกการแก้ชื่อ")+'">'+ICON_X+'</button>'+
        '</span>';
      }
      // v2.6: ชิปเหลือแค่ชื่อ แตะเพื่อแก้หรือลบ (ไอคอนไปอยู่ในโหมดแก้)
      return '<button class="chip chip-tap" data-edit-member="'+p.id+'" aria-label="'+L("{name} — แตะเพื่อแก้หรือลบ", { name:esc(p.name) })+'">'+
        '<span class="nm">'+esc(p.name)+'</span></button>';
    }).join("") + '</div>';
  }

  if (!extra) return;
  var html = "";
  if (ui.editError) html += '<div class="notice error"><p>'+esc(ui.editError)+'</p></div>';
  if (ui.save === "error" && ui.saveFailedIn !== "menu") html += saveErrorNotice();
  if (ui.confirmMember){
    var m = state.members.filter(function(p){ return p.id === ui.confirmMember; })[0];
    if (m){
      var n = menusOf(m.id).length;
      html += '<div class="confirm" role="alertdialog" aria-label="'+L("ยืนยันการลบสมาชิก")+'">'+
        '<h3>'+L("ลบ {name} ออก?", { name:esc(m.name) })+'</h3>'+
        '<p>'+L("{name} อยู่ใน {n} รายการ ระบบจะนำชื่อออกจากรายการเหล่านั้นแล้วคิดยอดใหม่ให้เฉพาะคนที่เหลือ", { name:esc(m.name), n:n })+'</p>'+
        '<div class="btn-row"><button class="btn-quiet" data-cancel-del="1">'+L("ยกเลิก")+'</button>'+
        '<button class="btn-danger" data-confirm-del="'+m.id+'">'+L("ลบออก")+'</button></div></div>';
    }
  }
  extra.innerHTML = html;
}

/** v3.1: แถวมื้ออาหารในรายการทริป — แตะเพื่อเข้าไปแก้เมนูข้างใน */
function mealRow(m){
  var sub = mealTotalOf(m), n = mealOf(m).menus.length;
  var unpaid = sub.grand > 0 && !nameOf(m.payer);
  var who = (unpaid ? '<span class="unpaid">'+L("ยังไม่เลือกคนจ่าย")+'</span>' : (nameOf(m.payer) ? '<b class="payer-tag">'+L("{name} จ่าย", { name:esc(nameOf(m.payer)) })+'</b>' : ''))+
    (unpaid || nameOf(m.payer) ? ' · ' : '')+(n ? L("{n} เมนู", { n:n }) : L("ยังไม่มีเมนู"));
  return '<div class="row-item meal-row'+(unpaid ? ' warn' : '')+'">'+
    '<button class="row-tap" data-open-meal="'+m.id+'" aria-label="'+L("เปิดมื้อ {name}", { name:esc(m.name) })+'">'+
      '<span class="body"><span class="name">🍲 '+esc(m.name)+'</span><span class="sub">'+who+'</span></span>'+
      '<span class="amt">'+baht(sub.grand)+'<small>'+L("ตามที่กิน")+' ›</small></span>'+
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
  if (!list || !slot) return;

  if (ui.loading){
    if (meta) meta.textContent = "";
    list.innerHTML = '<div class="skeleton" aria-hidden="true"><i style="width:100%"></i></div>';
    slot.innerHTML = "";
    return;
  }

  var total = state.kind === "trip" ? compute().grand : state.menus.reduce(function(a,m){ return a+m.price; },0);
  if (meta) meta.textContent = state.menus.length ? L("รวม {amt} ฿", { amt:baht(total) }) : "";

  if (state.menus.length===0 && !state.menuForm){
    list.innerHTML = '<p class="empty">'+kt("empty")+'</p>';
  } else {
    list.innerHTML = state.menus.map(function(m){
      if (m.type === "meal") return mealRow(m);
      var known = m.eaters.filter(function(id){ return !!nameOf(id); });
      var who = known.length ? eatersLabel(known) : L("ยังไม่ได้เลือกคนมีส่วน — ยังไม่ถูกนำไปคำนวณ");
      var trip = state.kind === "trip";
      var unpaid = trip && known.length && !nameOf(m.payer);
      if (trip && known.length) who = (unpaid ? '<span class="unpaid">'+L("ยังไม่เลือกคนจ่าย")+'</span>' : '<b class="payer-tag">'+L("{name} จ่าย", { name:esc(nameOf(m.payer)) })+'</b>')+' · '+who;
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
    slot.innerHTML = (state.kind === "trip"
      ? '<div class="add-row"><button class="add-slot" id="menuOpen">'+kt("addShort")+'</button>'+
        '<button class="add-slot" data-add-meal="1">+ '+L("มื้ออาหาร")+' 🍲</button></div>'
      : '<button class="add-slot" id="menuOpen">'+kt("add")+'</button>')+notice;
    syncSheet();
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
  // v3.0: ทริป — ใครจ่ายรายการนี้ (เลือกได้คนเดียว)
  var payerPick = state.kind === "trip" && state.members.length
    ? '<div class="label">'+L("ใครจ่ายรายการนี้")+'</div>'+
      '<div class="pick payer-pick" role="radiogroup" aria-label="'+L("ใครจ่ายรายการนี้")+'">'+state.members.map(function(p){
        var on = f.payer === p.id;
        return '<button role="radio" data-pay="'+p.id+'" aria-pressed="'+on+'" aria-checked="'+on+'">'+esc(p.name)+'</button>';
      }).join("")+'</div>'+
      (e.payer ? '<p class="field-msg error" aria-live="polite">'+esc(e.payer)+'</p>' : '')
    : '';

  slot.innerHTML =
    '<div class="sheet-backdrop" data-sheet-close="menu" aria-hidden="true"></div>'+
    '<div class="form-box sheet" role="group" aria-label="'+(f.id?kt("editItem"):kt("newItem"))+'">'+
      '<i class="sheet-grip" aria-hidden="true"></i>'+
      '<div class="form-title">'+(f.id?kt("editItem"):kt("newItem"))+'</div>'+
      '<div><label class="sr-only" for="mName">'+kt("nameLabel")+'</label>'+
        '<input type="text" id="mName" placeholder="'+kt("namePh")+'" value="'+esc(f.name)+'" autocomplete="off" maxlength="'+MAX_MENU_NAME+'" aria-describedby="mNameMsg" role="combobox" aria-expanded="false" aria-controls="mSuggestList" aria-autocomplete="list" aria-invalid="'+(e.name?"true":"false")+'">'+
        '<div id="mSuggest"></div>'+
        '<p class="field-msg '+(e.name?"error":"muted")+'" id="mNameMsg" aria-live="polite">'+(e.name?esc(e.name):"")+'</p></div>'+
      '<div><label class="sr-only" for="mPrice">'+kt("pricePh")+'</label>'+
        '<input type="number" id="mPrice" inputmode="decimal" step="0.01" min="0" placeholder="'+kt("pricePh")+'" value="'+(f.price===""?"":esc(f.price))+'" aria-describedby="mPriceMsg" aria-invalid="'+(e.price?"true":"false")+'">'+
        '<p class="field-msg '+(e.price?"error":"muted")+'" id="mPriceMsg" aria-live="polite">'+(e.price?esc(e.price):"")+'</p></div>'+
      payerPick+
      '<div class="label">'+kt("who")+(state.members.length>1 && !f.id ? ' <span class="label-hint">'+kt("whoHint")+'</span>' : '')+'</div>'+picks+
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
    '</div>'+notice;
  syncSheet();

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
    return '<button data-charge="'+c.id+'" aria-pressed="'+c.on+'">'+esc(c.fixed ? L(c.label) : c.label)+' '+c.rate+' %'+
      (c.fixed?"":' <span data-del-charge="'+c.id+'" style="margin-left:var(--s2);opacity:.75" aria-label="'+L("ลบ")+'">×</span>')+'</button>';
  }).join("") + '<button class="all" id="chargeOpen">+ '+L("กำหนดเอง")+'</button>';

  var slot = document.getElementById("chargeFormSlot");
  if (!state.chargeForm){ slot.innerHTML = ""; syncSheet(); return; }
  slot.innerHTML =
    '<div class="sheet-backdrop" data-sheet-close="charge" aria-hidden="true"></div>'+
    '<div class="form-box sheet" role="group" aria-label="'+L("ค่าใช้จ่ายเป็นเปอร์เซ็นต์")+'">'+
      '<i class="sheet-grip" aria-hidden="true"></i>'+
      '<div class="form-title">'+L("ค่าใช้จ่ายเป็นเปอร์เซ็นต์")+'</div>'+
      '<input type="text" id="cLabel" placeholder="'+L("ชื่อค่าใช้จ่าย เช่น ค่าเปิดขวด")+'" autocomplete="off">'+
      '<input type="number" id="cRate" inputmode="decimal" step="0.1" min="0" placeholder="'+L("เปอร์เซ็นต์ (%)")+'">'+
      '<div class="form-actions"><button class="btn-quiet" id="cCancel">'+L("ยกเลิก")+'</button>'+
      '<button class="btn-sm" id="cSave">'+L("เพิ่ม")+'</button></div>'+
    '</div>';
  syncSheet();
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
    slot.innerHTML = '<button class="add-slot" id="sharedOpen">+ '+L("เพิ่มรายการ เช่น น้ำแข็ง น้ำเปล่า")+'</button>';
    ui.sharedSuggest = { open:false, items:[], active:-1 };
    syncSheet();
    return;
  }
  slot.innerHTML =
    '<div class="sheet-backdrop" data-sheet-close="shared" aria-hidden="true"></div>'+
    '<div class="form-box sheet" role="group" aria-label="'+L("เพิ่มรายการหารเท่ากัน")+'">'+
      '<i class="sheet-grip" aria-hidden="true"></i>'+
      '<div class="form-title">'+L("เพิ่มรายการหารเท่ากัน")+'</div>'+
      '<input type="text" id="sName" placeholder="'+L("ชื่อรายการ เช่น น้ำแข็ง")+'" autocomplete="off" '+
        'role="combobox" aria-autocomplete="list" aria-controls="sSuggest" aria-expanded="false">'+
      '<div id="sSuggest"></div>'+
      '<input type="number" id="sPrice" inputmode="decimal" step="0.01" min="0" placeholder="'+L("ราคา (บาท)")+'">'+
      '<div class="form-actions"><button class="btn-quiet" id="sCancel">'+L("ยกเลิก")+'</button>'+
      '<button class="btn-sm" id="sSave">'+L("เพิ่ม")+'</button></div>'+
    '</div>';
  syncSheet();
  document.getElementById("sName").focus();
  ui.sharedSuggest = { open:true, items:[], active:-1 };
  renderSharedSuggestions();
}

function renderSummary(){
  var box = document.getElementById("summary");
  var aside = document.getElementById("summaryAside");
  if (!box) return;
  if (ui.loading){ box.innerHTML = '<p class="empty">'+L("กำลังโหลดข้อมูล…")+'</p>'; return; }
  if (!hasData()){
    if (aside) aside.textContent = "";
    box.innerHTML = '<p class="empty">'+(state.kind === "trip"
      ? L("ใส่ชื่อคนที่ไปและค่าใช้จ่ายก่อน แล้วบิลจะขึ้นตรงนี้")
      : L("ใส่ชื่อคนกินและรายการอาหารก่อน แล้วบิลจะขึ้นตรงนี้"))+'</p>';
    return;
  }
  var r = compute();
  if (aside) aside.textContent = L("แตะชื่อเพื่อดูรายละเอียด");
  box.innerHTML =
    (r.orphan>0 ? '<div class="notice warn"><p>'+L("มี {n} {what} จึงยังไม่ถูกรวมในบิลนี้", { n:r.orphan, what:kt("orphan") })+'</p></div>' : '')+
    receiptHTML(r,{interactive:true})+
    '<button class="btn-sm btn-block" id="copyBtn" style="margin-top:var(--s4)">'+L("คัดลอกสรุปยอด")+'</button>'+
    '<a href="'+billHref()+'" class="add-slot" style="display:flex;align-items:center;justify-content:center;margin-top:var(--s2)">'+L("เปิดใบสรุปยอดเต็มหน้า")+'</a>';
}
