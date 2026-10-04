/* FairDish — แสดงผลหน้าแอปหารบิล */
"use strict";

/* =========================================================
   7. แสดงผลหน้าแอป
   ========================================================= */
function render(){
  renderGroupBar(); renderMembers(); renderMenus(); renderCharges(); renderShared(); renderSummary();
  renderStepTabs(); renderTotalBar();
}

/* ---- v2.1: แท็บขั้นตอน + แถบยอดรวมล่างจอ ---- */
function renderStepTabs(){
  if (!document.getElementById("tab-members")) return;
  var counts = {
    members: state.members.length,
    menus: state.menus.length,
    shared: state.shared.length + state.charges.filter(function(c){ return c.on; }).length
  };
  STEPS.forEach(function(st){
    var tab = document.getElementById("tab-"+st.id);
    var panel = document.getElementById("panel-"+st.id);
    var on = ui.step === st.id;
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
    var c = document.getElementById("count-"+st.id);
    if (c) c.textContent = (!ui.loading && counts[st.id]) ? counts[st.id] : "";
  });
  var next = document.getElementById("memberNext");
  if (next) next.innerHTML = (!ui.loading && state.members.length && !state.menus.length)
    ? '<button class="add-slot" data-step="menus" style="margin-top:var(--s4)">ต่อไป: ใส่เมนูที่สั่ง ›</button>' : "";
  var hint = document.getElementById("menuNoMembers");
  if (hint) hint.innerHTML = (!ui.loading && !state.members.length)
    ? '<div class="notice info" style="margin:0 0 var(--s3)"><p>ยังไม่มีใครในโต๊ะ ใส่ชื่อคนกินก่อน แล้วค่อยเลือกว่าใครกินเมนูไหน</p>'+
      '<button class="btn-quiet" data-step="members">ไปใส่ชื่อ</button></div>' : "";
}
function setStep(step, focusTab){
  if (!STEPS.some(function(st){ return st.id===step; })) return;
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
  bar.innerHTML = '<a href="'+billHref()+'" aria-label="ดูใบสรุปยอด รวม '+baht(r.grand)+' บาท">'+
    '<span class="t-meta">'+r.n+' คน'+(mine ? ' · ฉัน '+baht(mine.rounded) : '')+'</span>'+
    '<span class="t-sum">'+baht(r.grand)+' ฿</span>'+
    '<span class="t-go">ดูสรุป ›</span></a>';
}

/* ---- v2.0: แถบกลุ่ม (ลิงก์แชร์ + ฉันคือใคร) ---- */
function renderGroupBar(){
  var box = document.getElementById("groupBar");
  if (!box) return;
  if (ui.loading){ box.innerHTML = ""; return; }
  if (!ui.ctx){ box.innerHTML = ""; return; }   // v2.6: คำชวนสร้างกลุ่มย้ายไปเป็นลิงก์ท้ายหน้า
  var me = myMemberId();
  var sub = me
    ? '<button class="group-sub" data-group-panel="1">คุณคือ <b>'+esc(nameOf(me))+'</b></button>'
    : (state.members.length ? '<button class="group-sub prompt" data-group-panel="1">เลือกว่าคุณคือใคร ›</button>' : '');
  var panel = !ui.groupPanel ? '' :
    '<div class="group-panel" id="groupPanel">'+
      '<div class="group-link">'+
        '<label class="sr-only" for="groupLinkInput">ลิงก์กลุ่ม</label>'+
        '<input type="text" id="groupLinkInput" readonly value="'+esc(groupLink(ui.ctx))+'">'+
        '<button class="btn-quiet" id="groupCopy">คัดลอก</button>'+
      '</div>'+
      '<p class="sub-head">ฉันคือใคร <span class="muted">(จำไว้ในเครื่องนี้ ยอดของคุณจะถูกไฮไลต์)</span></p>'+
      (state.members.length
        ? '<div class="pick" role="group" aria-label="ฉันคือใคร">'+state.members.map(function(p){
            return '<button data-me="'+p.id+'" aria-pressed="'+(p.id===me)+'">'+esc(p.name)+'</button>';
          }).join("")+'</div>'
        : '<p class="hint" style="margin:0">เพิ่มชื่อในแท็บ "คน" ก่อน แล้วเลือกว่าคุณคือใคร</p>')+
      '<div class="group-actions">'+
        '<button class="btn-quiet btn-xs" id="groupRefresh">โหลดข้อมูลล่าสุด</button>'+
        '<a class="group-leave" href="#/split">← กลับไปบิลส่วนตัว</a>'+
      '</div>'+
    '</div>';
  box.innerHTML =
    '<section class="group-bar" aria-labelledby="h-group">'+
      '<div class="group-top">'+
        '<div class="group-title"><span class="eyebrow">กลุ่ม</span><h2 id="h-group">'+esc(Store.groupName)+'</h2>'+sub+'</div>'+
        '<button class="btn-sm btn-xs" id="groupShare">'+ICON_SHARE+' แชร์ลิงก์</button>'+
        '<button class="icon-btn" data-group-panel="1" aria-expanded="'+ui.groupPanel+'" aria-controls="groupPanel" aria-label="ตัวเลือกกลุ่ม">'+ICON_MORE+'</button>'+
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
    '<span class="my-label">ยอดของคุณ'+(myTransferText() ? '<span class="my-sub">'+esc(myTransferText())+'</span>' : '')+'</span>'+
    '<span class="my-amt">'+baht(mine.rounded)+' <small>บาท</small></span>'+
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
    addBtn.innerHTML = ui.savingMember ? '<span class="spinner" aria-hidden="true"></span>กำลังบันทึก' : "เพิ่ม";
  }
  if (input) input.setAttribute("aria-invalid", ui.memberError ? "true" : "false");
  if (msg){
    msg.className = "field-msg " + (ui.memberError ? "error" : "muted");
    msg.textContent = ui.memberError
      || (state.members.length ? "แตะชื่อเพื่อแก้หรือลบ"
                               : "ใส่ได้ทั้งชื่อจริงและชื่อเล่น สั้น ๆ อ่านง่ายที่สุด");
  }

  if (ui.loading){
    box.innerHTML = '<div class="skeleton" aria-hidden="true"><i></i><i></i><i></i></div>';
    if (extra) extra.innerHTML = "";
    return;
  }

  if (state.members.length === 0){
    box.innerHTML = '<p class="empty" style="margin-top:var(--s3)">ยังไม่มีใครในโต๊ะ — ใส่ชื่อคนแรกได้เลย</p>';
  } else {
    box.innerHTML = '<div class="chips">' + state.members.map(function(p){
      if (ui.editingMember === p.id){
        return '<span class="chip editing">'+
          '<label class="sr-only" for="editMemberInput">แก้ชื่อ '+esc(p.name)+'</label>'+
          '<input type="text" id="editMemberInput" value="'+esc(p.name)+'" maxlength="'+MAX_NAME+'" autocomplete="off">'+
          '<button class="act" data-save-member="'+p.id+'" aria-label="บันทึกชื่อใหม่">✓</button>'+
          '<button class="act del" data-del-member="'+p.id+'" aria-label="ลบ '+esc(p.name)+' ออกจากโต๊ะ">'+ICON_DEL+'</button>'+
          '<button class="act" data-cancel-edit="1" aria-label="ยกเลิกการแก้ชื่อ">'+ICON_X+'</button>'+
        '</span>';
      }
      // v2.6: ชิปเหลือแค่ชื่อ แตะเพื่อแก้หรือลบ (ไอคอนไปอยู่ในโหมดแก้)
      return '<button class="chip chip-tap" data-edit-member="'+p.id+'" aria-label="'+esc(p.name)+' — แตะเพื่อแก้หรือลบ">'+
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
      html += '<div class="confirm" role="alertdialog" aria-label="ยืนยันการลบสมาชิก">'+
        '<h3>ลบ '+esc(m.name)+' ออกจากโต๊ะ?</h3>'+
        '<p>'+esc(m.name)+' อยู่ใน '+n+' เมนู ระบบจะนำชื่อออกจากเมนูเหล่านั้นแล้วคิดยอดใหม่ให้เฉพาะคนที่เหลือ</p>'+
        '<div class="btn-row"><button class="btn-quiet" data-cancel-del="1">ยกเลิก</button>'+
        '<button class="btn-danger" data-confirm-del="'+m.id+'">ลบออก</button></div></div>';
    }
  }
  extra.innerHTML = html;
}

/** v2.6: ชื่อคนกินแบบสั้น ไม่ให้แถวยาวหลายบรรทัด — "ทุกคน" / "มาร์ค · พูม · ไอซ์" / "มาร์ค · พูม +3" */
function eatersLabel(ids){
  if (ids.length === state.members.length && ids.length > 1) return "ทุกคน ("+ids.length+")";
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

  var total = state.menus.reduce(function(a,m){ return a+m.price; },0);
  if (meta) meta.textContent = state.menus.length ? "รวม "+baht(total)+" ฿" : "";

  if (state.menus.length===0 && !state.menuForm){
    list.innerHTML = '<p class="empty">ยังไม่มีเมนู — เพิ่มจานแรกแล้วเลือกว่าใครกิน</p>';
  } else {
    list.innerHTML = state.menus.map(function(m){
      var known = m.eaters.filter(function(id){ return !!nameOf(id); });
      var who = known.length ? eatersLabel(known) : "ยังไม่ได้เลือกคนกิน — ยังไม่ถูกนำไปคำนวณ";
      var each = known.length > 1 ? '<small>คนละ '+baht(m.price/known.length)+'</small>' : '';
      var editing = state.menuForm && state.menuForm.id===m.id;
      // v2.6: แถวไม่มีไอคอน แตะแถวเพื่อแก้ ปุ่มอีกจาน/ลบอยู่ในฟอร์มแก้
      return '<div class="row-item'+(known.length?"":" warn")+(editing?" editing":"")+'">'+
        '<button class="row-tap" data-edit-menu="'+m.id+'" aria-label="แก้ไข '+esc(m.name)+'">'+
          '<span class="body"><span class="name">'+esc(m.name)+'</span><span class="sub">'+who+'</span></span>'+
          '<span class="amt">'+baht(m.price)+each+'</span>'+
        '</button></div>';
    }).join("");
  }

  var notice = (ui.save === "error" && ui.saveFailedIn === "menu") ? saveErrorNotice() : "";

  if (!state.menuForm){
    slot.innerHTML = '<button class="add-slot" id="menuOpen">+ เพิ่มเมนู</button>'+notice;
    return;
  }

  var f = state.menuForm;
  var e = ui.menuErr || {};
  var all = state.members.length>0 && f.eaters.length===state.members.length;
  var picks = state.members.length
    ? '<div class="pick"><button class="all" data-eat-all="1" aria-pressed="'+all+'">ทุกคน</button>'+
      state.members.map(function(p){
        return '<button data-eat="'+p.id+'" aria-pressed="'+(f.eaters.indexOf(p.id)>=0)+'">'+esc(p.name)+'</button>';
      }).join("")+'</div>'
    : '';
  var preview = menuPreviewText(f);

  slot.innerHTML =
    '<div class="form-box" role="group" aria-label="'+(f.id?"แก้ไขเมนู":"เพิ่มเมนูใหม่")+'">'+
      '<div class="form-title">'+(f.id?"แก้ไขเมนู":"เพิ่มเมนูใหม่")+'</div>'+
      '<div><label class="sr-only" for="mName">ชื่อเมนู</label>'+
        '<input type="text" id="mName" placeholder="ชื่อเมนู เช่น ต้มยำ" value="'+esc(f.name)+'" autocomplete="off" maxlength="'+MAX_MENU_NAME+'" aria-describedby="mNameMsg" role="combobox" aria-expanded="false" aria-controls="mSuggestList" aria-autocomplete="list" aria-invalid="'+(e.name?"true":"false")+'">'+
        '<div id="mSuggest"></div>'+
        '<p class="field-msg '+(e.name?"error":"muted")+'" id="mNameMsg" aria-live="polite">'+(e.name?esc(e.name):"")+'</p></div>'+
      '<div><label class="sr-only" for="mPrice">ราคาต่อจาน เป็นบาท</label>'+
        '<input type="number" id="mPrice" inputmode="decimal" step="0.01" min="0" placeholder="ราคาต่อจาน (บาท)" value="'+(f.price===""?"":esc(f.price))+'" aria-describedby="mPriceMsg" aria-invalid="'+(e.price?"true":"false")+'">'+
        '<p class="field-msg '+(e.price?"error":"muted")+'" id="mPriceMsg" aria-live="polite">'+(e.price?esc(e.price):"")+'</p></div>'+
      '<div class="label">ใครกินเมนูนี้บ้าง'+(state.members.length>1 && !f.id ? ' <span class="label-hint">แตะชื่อคนที่ไม่ได้กินออก</span>' : '')+'</div>'+picks+
      (e.eaters
        ? '<p class="field-msg error" aria-live="polite">'+esc(e.eaters)+'</p>'
        : '<p class="form-preview" id="mPreview" aria-live="polite">'+preview+'</p>')+
      '<div class="form-actions">'+
        '<button class="btn-quiet" id="mCancel">ยกเลิก</button>'+
        '<button class="btn-sm" id="mSave"'+(ui.savingMenu?" disabled":"")+'>'+
          (ui.savingMenu ? '<span class="spinner" aria-hidden="true"></span>กำลังบันทึก' : (f.id?"บันทึก":"เพิ่มเมนู"))+
        '</button>'+
      '</div>'+
      (f.id ? '<div class="form-more">'+
        '<button class="link-btn" data-dup-menu="'+f.id+'">'+ICON_COPY+' เพิ่มอีกจาน</button>'+
        '<button class="link-btn danger" data-del-menu="'+f.id+'">'+ICON_DEL+' ลบเมนูนี้</button></div>' : '')+
    '</div>'+notice;

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
    return '<button data-charge="'+c.id+'" aria-pressed="'+c.on+'">'+esc(c.label)+' '+c.rate+' %'+
      (c.fixed?"":' <span data-del-charge="'+c.id+'" style="margin-left:var(--s2);opacity:.75">×</span>')+'</button>';
  }).join("") + '<button class="all" id="chargeOpen">+ กำหนดเอง</button>';

  var slot = document.getElementById("chargeFormSlot");
  if (!state.chargeForm){ slot.innerHTML = ""; return; }
  slot.innerHTML =
    '<div class="form-box" style="margin-top:var(--s2)">'+
      '<input type="text" id="cLabel" placeholder="ชื่อค่าใช้จ่าย เช่น ค่าเปิดขวด" autocomplete="off">'+
      '<input type="number" id="cRate" inputmode="decimal" step="0.1" min="0" placeholder="เปอร์เซ็นต์ (%)">'+
      '<div class="form-actions"><button class="btn-quiet" id="cCancel">ยกเลิก</button>'+
      '<button class="btn-sm" id="cSave">เพิ่ม</button></div>'+
    '</div>';
  document.getElementById("cLabel").focus();
}

function renderShared(){
  var list = document.getElementById("sharedList");
  var slot = document.getElementById("sharedFormSlot");
  if (!list || !slot) return;
  list.innerHTML = state.shared.map(function(s){
    return '<div class="row-item"><div class="body"><div class="name">'+esc(s.name)+'</div></div>'+
      '<span class="amt">'+baht(s.price)+'</span>'+
      '<span class="acts"><button class="icon-btn icon-sm" data-del-shared="'+s.id+'" aria-label="ลบ '+esc(s.name)+'">'+ICON_X+'</button></span></div>';
  }).join("");
  if (!state.sharedForm){
    slot.innerHTML = '<button class="add-slot" id="sharedOpen">+ เพิ่มรายการ เช่น น้ำแข็ง น้ำเปล่า</button>';
    ui.sharedSuggest = { open:false, items:[], active:-1 };
    return;
  }
  slot.innerHTML =
    '<div class="form-box">'+
      '<input type="text" id="sName" placeholder="ชื่อรายการ เช่น น้ำแข็ง" autocomplete="off" '+
        'role="combobox" aria-autocomplete="list" aria-controls="sSuggest" aria-expanded="false">'+
      '<div id="sSuggest"></div>'+
      '<input type="number" id="sPrice" inputmode="decimal" step="0.01" min="0" placeholder="ราคา (บาท)">'+
      '<div class="form-actions"><button class="btn-quiet" id="sCancel">ยกเลิก</button>'+
      '<button class="btn-sm" id="sSave">เพิ่ม</button></div>'+
    '</div>';
  document.getElementById("sName").focus();
  ui.sharedSuggest = { open:true, items:[], active:-1 };
  renderSharedSuggestions();
}

function renderSummary(){
  var box = document.getElementById("summary");
  var aside = document.getElementById("summaryAside");
  if (!box) return;
  if (ui.loading){ box.innerHTML = '<p class="empty">กำลังโหลดข้อมูล…</p>'; return; }
  if (!hasData()){
    if (aside) aside.textContent = "";
    box.innerHTML = '<p class="empty">ใส่ชื่อคนกินและรายการอาหารก่อน แล้วบิลจะขึ้นตรงนี้</p>';
    return;
  }
  var r = compute();
  if (aside) aside.textContent = "แตะชื่อเพื่อดูรายละเอียด";
  box.innerHTML =
    (r.orphan>0 ? '<div class="notice warn"><p>มี '+r.orphan+' เมนูที่ยังไม่ได้เลือกคนกิน จึงยังไม่ถูกรวมในบิลนี้</p></div>' : '')+
    receiptHTML(r,{interactive:true})+
    '<button class="btn-sm btn-block" id="copyBtn" style="margin-top:var(--s4)">คัดลอกสรุปยอด</button>'+
    '<a href="'+billHref()+'" class="add-slot" style="display:flex;align-items:center;justify-content:center;margin-top:var(--s2)">เปิดใบสรุปยอดเต็มหน้า</a>';
}
