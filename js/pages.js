/* FairDish — หน้าเว็บแต่ละหน้า (หน้าแรก/ประวัติ/ยืนยันเมนู อยู่ใน screens.js) */
"use strict";

/* =========================================================
   6. หน้าเว็บ
   ========================================================= */
function item(k,h,p){ return '<li><span class="k">'+k+'</span><div><h3>'+h+'</h3><p>'+p+'</p></div></li>'; }

var ICON_START_GROUP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.4.2 4 1.9 4.5 4.6"/></svg>';

/** แท็บของหน้าหารบิล — ทริปไม่มีแท็บส่วนกลาง (ไม่มีค่าบริการ/VAT และ "หารทุกคน" คือเลือกทุกคนอยู่แล้ว) */
function steps(){
  if (ui.tripStash) return [ { id:"menus", label:L("เมนู") }, { id:"shared", label:L("ส่วนกลาง") } ];   // v3.1: แก้มื้อในทริป
  var list = [ { id:"members", label:L("คน") }, { id:"menus", label:kt("items") } ];
  if (state.kind !== "trip") list.push({ id:"shared", label:L("ส่วนกลาง") });
  return list;
}
function kindSwitch(attr, current){
  return '<div class="kind-switch" role="group" aria-label="'+L("ประเภทบิล")+'">'+["meal","trip"].map(function(k){
    return '<button type="button" '+attr+'="'+k+'" aria-pressed="'+(current===k)+'">'+ktOf(k,"icon")+' '+ktOf(k,"name")+'</button>';
  }).join("")+'</div>';
}
function stepTab(st, i){
  var on = ui.step === st.id;
  return '<button type="button" role="tab" id="tab-'+st.id+'" aria-controls="panel-'+st.id+'" aria-selected="'+on+'" tabindex="'+(on?0:-1)+'" data-step="'+st.id+'">'+
    '<span class="tab-num" aria-hidden="true">'+(i+1)+'</span>'+st.label+' <span class="tab-count" id="count-'+st.id+'"></span></button>';
}
function stepPanel(id, body){
  return '<section class="step-card step-panel" role="tabpanel" id="panel-'+id+'" aria-labelledby="tab-'+id+'"'+(ui.step===id?'':' hidden')+'>'+body+'</section>';
}

function pageSplit(){
  if (ui.ctx && ui.groupError) return pageGroupError();
  var inGroup = !!ui.ctx;
  if (!steps().some(function(st){ return st.id === ui.step; })) ui.step = steps()[0].id;
  var inMeal = !!ui.tripStash;
  return '<div class="page page-app"><div class="wrap split-layout">'+
    '<div class="split-main">'+
      (inMeal ? '<button class="crumb back-trip" data-back-trip="1">← '+L("กลับไปที่ทริป")+'</button>' : '')+
      '<div class="split-head">'+
        '<h1>'+(inMeal ? "🍲 "+L("มื้ออาหารในทริป") : (inGroup ? L("หารบิลกลุ่ม") : L("หารบิล")))+'</h1>'+
        '<p>'+(inGroup ? L("ทุกคนที่มีลิงก์กลุ่มแก้บิลนี้ได้ ระบบบันทึกขึ้นกลุ่มให้อัตโนมัติ")
                       : L("ไล่ทีละแท็บ ระบบบันทึกในเครื่องให้อัตโนมัติทุกครั้งที่แก้ข้อมูล"))+'</p>'+
        (inMeal || inGroup ? '' : '<div id="titleSlot"></div>')+
        (inMeal ? '' : '<div id="kindSlot"></div>')+
      '</div>'+
      (inMeal ? '<div id="mealHead"></div>' : '<div id="groupBar"></div>')+
      '<div class="step-tabs" role="tablist" aria-label="'+L("ขั้นตอนการหารบิล")+'">'+steps().map(stepTab).join("")+'</div>'+

      stepPanel("members",
        '<div class="step-head"><h2 id="h-members">'+kt("people")+'</h2></div>'+
        '<div class="field-row">'+
          '<div>'+
            '<label class="sr-only" for="memberInput">'+L("ชื่อคนในบิลนี้")+'</label>'+
            '<input type="text" id="memberInput" placeholder="'+L("พิมพ์ชื่อ เช่น มาร์ค")+'" autocomplete="off" maxlength="'+MAX_NAME+'" aria-describedby="memberMsg">'+
          '</div>'+
          '<button class="btn-sm" id="memberAdd">'+L("เพิ่ม")+'</button>'+
        '</div>'+
        '<p class="field-msg muted" id="memberMsg" aria-live="polite"></p>'+
        '<div id="memberList"></div>'+
        '<div id="memberExtra"></div>'+
        '<div id="memberNext"></div>')+

      stepPanel("menus",
        '<div class="step-head"><h2 id="h-menus">'+kt("itemsTitle")+'</h2><span class="aside" id="menuMeta"></span></div>'+
        '<div id="menuNoMembers"></div>'+
        '<div id="menuList"></div><div id="menuFormSlot"></div>')+

      (state.kind === "trip" ? '' : stepPanel("shared",
        '<div class="step-head"><h2>'+L("ค่าส่วนกลาง")+'</h2></div>'+
        '<p class="hint">'+L("คิดเป็น % จากยอดของแต่ละคน")+'</p>'+
        '<div class="pick" id="chargeList"></div><div id="chargeFormSlot"></div>'+
        '<p class="sub-head">'+L("หารเท่ากันทุกคน")+'</p>'+
        '<div id="sharedList"></div><div id="sharedFormSlot"></div>'))+

      (ui.confirmReset ? '<div class="confirm" role="alertdialog" aria-label="'+L("ยืนยันการล้างข้อมูล")+'">'+
        '<h3>'+L("ล้างข้อมูลทั้งหมดในบิลนี้?")+'</h3>'+
        '<p>'+L("รายชื่อและรายการทั้งหมดจะถูกล้างออก")+(inGroup ? " <b>"+L("ทุกคนในกลุ่มจะเห็นบิลว่างด้วย")+"</b>" : "")+'</p>'+
        (inGroup ? '<label class="confirm-type" for="resetConfirmName">'+L("พิมพ์ชื่อกลุ่ม {name} เพื่อยืนยัน", { name:'<b>'+esc(Store.groupName)+'</b>' })+'</label>'+
          '<input type="text" id="resetConfirmName" autocomplete="off" placeholder="'+esc(Store.groupName)+'">' : '')+
        '<div class="btn-row"><button class="btn-quiet" id="cancelReset">'+L("ยกเลิก")+'</button>'+
        '<button class="btn-danger" id="confirmReset"'+(inGroup ? ' disabled' : '')+'>'+ICON_DEL+' '+L("ล้างข้อมูล")+'</button></div></div>' : '')+
      (inMeal ? '<div class="app-foot"><button data-back-trip="1">← '+L("กลับไปที่ทริป")+'</button>'+
          '<button class="danger-link" data-del-meal="1">'+ICON_DEL+' '+L("ลบมื้อนี้")+'</button></div>' :
      '<div class="app-foot">'+
        (!inGroup && Cloud.ready() ? '<a href="#/groups">👥 '+L("ชวนเพื่อนมาแก้บิลนี้ด้วยกัน")+'</a>' : '')+
        (inGroup ? '' : '<button id="demoBtn">'+L("ใส่ข้อมูลตัวอย่าง")+'</button>')+
        '<button id="resetBtn">'+ICON_DEL+' '+L("ล้างข้อมูลทั้งหมด")+'</button>'+
      '</div>')+
    '</div>'+

    '<aside class="split-side" aria-labelledby="h-summary">'+
      '<section class="step-card">'+
        '<div class="step-head"><h2 id="h-summary">'+L("สรุปยอด")+'</h2><span class="aside" id="summaryAside"></span></div>'+
        '<div id="summary" aria-live="polite"></div>'+
      '</section>'+
    '</aside>'+
  '</div></div>'+
  '<div class="total-bar" id="totalBar" hidden></div>';
}

/** ชื่อบิลที่เปิดอยู่: กลุ่มใช้ชื่อกลุ่ม บิลส่วนตัวใช้ชื่อที่ตั้งเอง หรือชื่อตั้งต้นตามวันที่ */
function currentBillName(){
  if (ui.ctx) return Store.groupName;
  return state.title || billTitle(serialize());
}

function pageBill(){
  if (ui.ctx && ui.groupError) return pageGroupError();
  var eyebrow = ui.loading ? '' : '<p class="eyebrow">'+(ui.ctx ? L("บิลกลุ่ม")+' · ' : '')+kt("icon")+' '+esc(currentBillName())+'</p>';
  var head = '<div class="page"><div class="wrap">'+
    '<a class="crumb" href="'+splitHref()+'">← '+L("กลับไปแก้บิล")+'</a>'+
    '<div class="page-head">'+eyebrow+'<h1>'+L("ใบสรุปยอด")+'</h1>'+
    '<p>'+L("ยอดที่แต่ละคนต้องจ่าย พร้อมที่มาของทุกบาท กางให้ทั้งโต๊ะดูหรือคัดลอกส่งเข้ากลุ่มได้เลย")+'</p></div>';
  if (ui.loading) return head + '<div class="empty" style="max-width:540px">'+L("กำลังโหลดข้อมูลบิล…")+'</div></div></div>';
  if (!hasData()){
    return head + '<div class="empty" style="max-width:540px">'+L("ยังไม่มีข้อมูลบิล เริ่มจากใส่ชื่อคนกินและเมนูในหน้าหารบิลก่อน")+'<br><br>'+
      '<a class="btn btn-main" href="'+splitHref()+'">'+L("ไปหน้าหารบิล")+'</a></div></div></div>';
  }
  var r = compute();
  var done = r.orphan === 0;
  if (done){
    // v2.4: ตอนจบที่น่าจำ (peak-end) — บิลครบแล้ว ฉลองเล็ก ๆ แล้วพาไปแชร์ต่อ
    head = '<div class="page"><div class="wrap">'+
      '<a class="crumb" href="'+splitHref()+'">← '+L("กลับไปแก้บิล")+'</a>'+
      '<div class="page-head finish-head">'+eyebrow+
      '<h1>'+kt("done")+' <span class="finish-pop" aria-hidden="true">🎉</span></h1>'+
      '<p>'+L("ยอดครบทุกคนแล้ว ส่งให้เพื่อนได้เลย กดชื่อใครก็เห็นว่ายอดมาจาก{what}", { what:kt("fromWhat") })+'</p></div>';
  }
  var mine = myShare();
  return head + '<div class="app-col">'+
      (r.orphan>0 ? '<div class="notice warn"><p>'+L("มี {n} {what} จึงยังไม่ถูกรวมในบิลนี้", { n:r.orphan, what:kt("orphan") })+'</p></div>' : '')+
      (mine ? '<div class="my-total my-total-bill"><span class="my-label">'+L("ยอดของคุณ ({name})", { name:esc(nameOf(mine.id)) })+
        (myTransferText() ? '<span class="my-sub">'+esc(myTransferText())+'</span>' : '')+'</span>'+
        '<span class="my-amt">'+baht(mine.rounded)+' <small>'+L("บาท")+'</small></span></div>' : '')+
      receiptHTML(r,{ interactive:true, reveal:done && !ui.noReveal })+
      '<div class="finish-actions">'+
        '<button class="btn-sm btn-block" id="shareImgBtn">'+ICON_SHARE+' '+L("แชร์รูปใบเสร็จ")+'</button>'+
        '<button class="btn-quiet btn-block" id="copyBtn">'+ICON_COPY+' '+L("คัดลอกเป็นข้อความ")+'</button>'+
      '</div>'+
      confirmSection(r)+
      payerSection(r)+
      (done ? installNudgeHTML() : '')+
      '<div class="app-foot"><a href="'+splitHref()+'">'+L("แก้ไขรายการ")+'</a></div>'+
    '</div></div></div>';
}

function pageGroupError(){
  var msg = ({
    notfound:[L("ไม่พบกลุ่มนี้"),L("ลิงก์อาจพิมพ์ผิดหรือคัดลอกมาไม่ครบ ลองขอลิงก์จากเพื่อนอีกครั้ง")],
    disabled:[L("ระบบกลุ่มยังไม่เปิดใช้"),L("เว็บนี้ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์สำหรับกลุ่ม ยังหารบิลในเครื่องตัวเองได้ตามปกติ")],
    load:[L("โหลดกลุ่มไม่สำเร็จ"),L("ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง")]
  })[ui.groupError] || [L("โหลดกลุ่มไม่สำเร็จ"),""];
  return '<div class="page"><div class="wrap app-col">'+
    '<div class="page-head"><h1>'+msg[0]+'</h1><p>'+msg[1]+'</p></div>'+
    '<div class="btn-row">'+
      (ui.groupError==="load" ? '<button class="btn-sm" id="groupRetry">'+L("ลองอีกครั้ง")+'</button>' : '')+
      '<a class="btn-quiet" href="#/groups">'+L("ไปหน้ากลุ่ม")+'</a>'+
      '<a class="btn-quiet" href="#/split">'+L("หารบิลในเครื่อง")+'</a>'+
    '</div></div></div>';
}

function pageGroups(){
  var on = Cloud.ready();
  var list = ui.myGroups.length
    ? ui.myGroups.map(function(g){
        var when = g.at ? shortDate(g.at) : "";
        return '<div class="row-item">'+
          '<a class="row-tap" href="#/g/'+esc(g.id)+'"><span class="body">'+
            '<span class="name">'+ktOf(g.kind,"icon")+' '+esc(g.name)+'</span>'+
            '<span class="sub">'+(when ? L("เปิดล่าสุด {when}", { when:when }) : "")+'</span></span></a>'+
          '<span class="acts"><button class="icon-btn" data-forget-group="'+esc(g.id)+'" aria-label="'+L("เอา {name} ออกจากรายการ", { name:esc(g.name) })+'">'+ICON_X+'</button></span>'+
        '</div>';
      }).join("")
    : '<p class="empty">'+L("ยังไม่มีกลุ่ม — สร้างกลุ่มใหม่ หรือกดลิงก์ที่เพื่อนส่งมา")+'</p>';

  var create = !on
    ? '<div class="notice warn"><p>'+L("ระบบกลุ่มยังไม่เปิดใช้ในเว็บนี้ (ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์) ยังหารบิลในเครื่องได้ตามปกติ")+'</p></div>'
    : '<section class="step-card" aria-labelledby="h-new-group">'+
        '<div class="step-head"><h2 id="h-new-group">'+L("สร้างกลุ่มใหม่")+'</h2></div>'+
        kindSwitch("data-group-kind", ui.newGroupKind)+
        '<div class="field-row">'+
          '<div><label class="sr-only" for="groupName">'+L("ชื่อกลุ่ม")+'</label>'+
          '<input type="text" id="groupName" value="'+esc(defaultGroupName(null, ui.newGroupKind))+'" placeholder="'+L("ชื่อกลุ่ม เช่น ส้มตำหน้ามอ")+'" autocomplete="off" maxlength="'+MAX_GROUP_NAME+'" aria-describedby="groupMsg"></div>'+
          '<button class="btn-sm" id="groupCreate">'+L("สร้างกลุ่ม")+'</button>'+
        '</div>'+
        '<div id="groupFromSlot"></div>'+
        '<p class="field-msg muted" id="groupMsg" aria-live="polite">'+L("ตั้งชื่อให้แล้ว กดสร้างได้เลย · ส่งลิงก์เฉพาะคนในโต๊ะ")+'</p>'+
        // v2.6: ส่วนใหญ่กดลิงก์จากแชตอยู่แล้ว ช่องวางลิงก์จึงพับไว้
        '<details class="join-fold"><summary>'+L("มีลิงก์จากเพื่อน? วางตรงนี้")+'</summary>'+
          '<div class="field-row">'+
            '<div><label class="sr-only" for="groupJoinInput">'+L("ลิงก์หรือรหัสกลุ่ม")+'</label>'+
            '<input type="text" id="groupJoinInput" placeholder="'+L("วางลิงก์หรือรหัสกลุ่ม")+'" autocomplete="off" aria-describedby="groupJoinMsg"></div>'+
            '<button class="btn-quiet" id="groupJoin">'+L("เข้ากลุ่ม")+'</button>'+
          '</div>'+
          '<p class="field-msg muted" id="groupJoinMsg" aria-live="polite"></p>'+
        '</details>'+
      '</section>';
  var mine = '<section class="step-card" aria-labelledby="h-my-groups">'+
      '<div class="step-head"><h2 id="h-my-groups">'+L("กลุ่มของฉัน")+'</h2></div>'+
      list+
      '<a class="add-slot" href="#/split" style="margin-top:var(--s3)">'+L("เปิดบิลส่วนตัว (ไม่แชร์)")+'</a>'+
    '</section>';

  return '<div class="page"><div class="wrap app-col">'+
    '<div class="page-head" style="max-width:none"><h1>'+L("กลุ่ม")+'</h1>'+
      '<p>'+L("ส่งลิงก์กลุ่มเข้าแชต เพื่อนกดแล้วแก้บิลเดียวกันได้ ไม่ต้องสมัคร")+'</p></div>'+
    (ui.myGroups.length ? mine + create : create + mine)+
  '</div></div>';
}

var THEMES = [ { id:"system", label:"ตามเครื่อง" }, { id:"light", label:"สว่าง" }, { id:"dark", label:"มืด" } ];
function pageMore(){
  function link(href, name, sub){
    return '<div class="row-item"><a class="row-tap" href="'+href+'"><span class="body">'+
      '<span class="name">'+name+'</span><span class="sub">'+sub+'</span></span><span aria-hidden="true">›</span></a></div>';
  }
  return '<div class="page"><div class="wrap app-col">'+
    '<div class="page-head" style="max-width:none"><h1>'+L("อื่น ๆ")+'</h1></div>'+
    '<section class="step-card" aria-labelledby="h-lang">'+
      '<div class="step-head"><h2 id="h-lang">'+L("ภาษา")+'</h2></div>'+
      '<div class="pick" role="group" aria-labelledby="h-lang">'+
        '<button data-lang="th" aria-pressed="'+(LANG==="th")+'" lang="th">ไทย</button>'+
        '<button data-lang="en" aria-pressed="'+(LANG==="en")+'" lang="en">English</button>'+
      '</div>'+
    '</section>'+
    '<section class="step-card" aria-labelledby="h-theme">'+
      '<div class="step-head"><h2 id="h-theme">'+L("ธีม")+'</h2></div>'+
      '<div class="pick" role="group" aria-labelledby="h-theme">'+THEMES.map(function(t){
        return '<button data-theme-pick="'+t.id+'" aria-pressed="'+(ui.theme===t.id)+'">'+L(t.label)+'</button>';
      }).join("")+'</div>'+
    '</section>'+
    '<section class="step-card" aria-labelledby="h-pages">'+
      '<div class="step-head"><h2 id="h-pages">'+L("เกี่ยวกับ FairDish")+'</h2></div>'+
      link("#/history",L("ประวัติบิล"),L("บิลที่เก็บไว้ในเครื่องนี้ และกลุ่มที่คุณเคยเปิด"))+
      link("#/how",L("วิธีใช้"),L("ทีละขั้น + คำถามที่ถูกถามบ่อย"))+
      link("#/about",L("เกี่ยวกับ"),L("ทีมผู้จัดทำและขอบเขตของเวอร์ชันนี้"))+
      '<div class="row-item"><button class="row-tap" data-ob-show="1"><span class="body">'+
        '<span class="name">'+L("ดูหน้าแนะนำอีกครั้ง")+'</span><span class="sub">'+L("3 หน้าสั้น ๆ ว่า FairDish ทำอะไรได้")+'</span></span><span aria-hidden="true">›</span></button></div>'+
    '</section>'+
    '<p class="hint" style="text-align:center">FairDish v'+APP_VERSION+'</p>'+
  '</div></div>';
}

function pageHow(){
  return '<div class="page"><div class="wrap">'+
    '<div class="page-head"><h1>'+L("วิธีใช้ 4 ขั้น")+'</h1>'+
    '<p>'+L("ออกแบบให้ทำเสร็จภายในเวลาที่พนักงานเดินไปเก็บเงินอีกโต๊ะ")+'</p></div>'+
    '<div class="steps">'+
      '<div class="stp"><b>1</b><h3>'+L("ใครกินบ้าง")+'</h3><p>'+L("พิมพ์ชื่อทุกคนที่ร่วมโต๊ะ กดเพิ่มทีละคน ชื่อเล่นสั้น ๆ อ่านง่ายที่สุดตอนดูบิล")+'</p></div>'+
      '<div class="stp"><b>2</b><h3>'+L("รายการอาหาร")+'</h3><p>'+L("ใส่ชื่อเมนูกับราคาต่อจาน แล้วแตะเลือกคนที่กินจานนั้น ถ้าทั้งโต๊ะกินกดปุ่มทุกคนได้เลย")+'</p></div>'+
      '<div class="stp"><b>3</b><h3>'+L("ค่าส่วนกลาง")+'</h3><p>'+L("เปิดค่าบริการหรือ VAT ตามที่ร้านคิด ส่วนน้ำเปล่า น้ำแข็ง ข้าวเหนียว ใส่เป็นรายการหารเท่ากัน")+'</p></div>'+
      '<div class="stp"><b>4</b><h3>'+L("สรุปยอด")+'</h3><p>'+L("บิลขึ้นเองทันที แตะชื่อใครก็ดูที่มาของยอดได้ แล้วกดคัดลอกส่งเข้ากลุ่ม")+'</p></div>'+
    '</div>'+

    // v4.0: ย้ายมาจากหน้าแรกเดิม — หน้าแรกกลายเป็น "บิลของฉัน" แบบแอป
    '<section><div class="sec-head"><h2>'+L("บิลใบเดียวกัน สองวิธีคิด")+'</h2>'+
      '<p>'+L("มื้ออีสานร้านหน้ามอ: 8 คน 10 เมนู รวมข้าวเหนียวกับน้ำ 1,110 บาท")+'</p></div>'+
      '<div class="compare">'+
        '<div class="cmp bad"><h3>'+L("หารเท่ากันทั้งโต๊ะ")+'</h3><div class="tag">'+L("1,110 ÷ 8 = ทุกคนจ่ายเท่ากัน")+'</div>'+
          '<ul><li><span>'+L("โฟรค์ — กิน 2 เมนู")+'</span><span>138.75</span></li>'+
          '<li><span>'+L("ยูกะ — ไม่กินเผ็ด 3 เมนู")+'</span><span>138.75</span></li>'+
          '<li><span>'+L("ไอซ์ — กิน 6 เมนู มีซอยจุ๊")+'</span><span>138.75</span></li></ul>'+
          '<p class="foot">'+L("โฟรค์จ่ายเกินไป 77.09 บาท ส่วนไอซ์จ่ายขาดไป 111.25 บาท ทั้งที่ไม่มีใครตั้งใจเอาเปรียบกัน")+'</p></div>'+
        '<div class="cmp good"><h3>'+L("หารด้วย FairDish")+'</h3><div class="tag">'+L("คิดจากเมนูที่แต่ละคนกินจริง")+'</div>'+
          '<ul><li><span>'+L("โฟรค์ — กิน 2 เมนู")+'</span><span>61.66</span></li>'+
          '<li><span>'+L("ยูกะ — ไม่กินเผ็ด 3 เมนู")+'</span><span>121.67</span></li>'+
          '<li><span>'+L("ไอซ์ — กิน 6 เมนู มีซอยจุ๊")+'</span><span>250.00</span></li></ul>'+
          '<p class="foot">'+L("ยอดรายคนรวมกันได้ 1,110.00 บาทพอดี ไม่มีเศษสตางค์หาย และทุกคนกดดูได้ว่ายอดของตัวเองมาจากเมนูไหน")+'</p></div>'+
      '</div>'+
    '</section>'+

    '<section><div class="sec-head"><h2>'+L("สิ่งที่ FairDish ทำให้")+'</h2><p>'+L("ไล่ทีละแท็บ คน · เมนู · ส่วนกลาง แล้วได้บิลเลย")+'</p></div>'+
      '<ul class="bill-list">'+
        item("01",L("เพิ่มคนในโต๊ะ"),L("ใส่ชื่อสมาชิกที่ร่วมมื้อนี้ แก้ชื่อหรือลบออกได้ตลอด พร้อมเลิกทำถ้าลบผิดคน"))+
        item("02",L("ใส่เมนูและราคา"),L("พิมพ์ไม่กี่ตัวอักษรก็มีเมนูแนะนำกว่า 1,000 รายการขึ้นมาให้เลือก และเมนูที่คุณสั่งเองระบบจำไว้ให้พร้อมราคาครั้งก่อน"))+
        item("03",L("เลือกคนที่กินแต่ละเมนู"),L("แตะชื่อคนที่กินจานนั้น ระบบหารเฉพาะคนที่แตะไว้ ไม่ใช่ทั้งโต๊ะ"))+
        item("04",L("บวกค่าส่วนกลางอัตโนมัติ"),L("ค่าบริการ 10% VAT 7% หรือกำหนดเปอร์เซ็นต์เอง ส่วนน้ำแข็ง น้ำเปล่า ข้าวเหนียว หารเท่ากันทุกคน"))+
        item("05",L("สรุปยอดเป็นบิลรายคน"),L("แตะชื่อใครก็เห็นทันทีว่ายอดนั้นมาจากเมนูไหนบ้าง กี่บาท หารกี่คน"))+
        item("06",L("ให้เพื่อนยืนยันเมนูเอง"),L("ส่งลิงก์กลุ่ม เพื่อนเลือกชื่อตัวเองแล้วติ๊กเมนูที่กิน เห็นว่าใครยืนยันแล้วบ้าง"))+
        item("07",L("เก็บประวัติบิล"),L("เริ่มบิลใหม่เมื่อไหร่ บิลเก่าถูกเก็บไว้ในประวัติ เปิดกลับมาดูหรือทำต่อได้"))+
      '</ul>'+
    '</section>'+

    '<section><div class="sec-head"><h2>'+L("สามคำถามที่ถูกถามบ่อย")+'</h2></div>'+
      '<div class="split2">'+
        '<div class="panel"><h3>'+L("เศษสตางค์หายไปไหน")+'</h3><p>'+L("ไม่หาย FairDish กระจายเศษสตางค์ให้ยอดรายคนรวมกันเท่ากับยอดบิลเป๊ะเสมอ ไม่ต้องมีใครควักเพิ่มทีหลัง")+'</p></div>'+
        '<div class="panel"><h3>'+L("ค่าบริการคิดยังไง")+'</h3><p>'+L("คิดเป็นเปอร์เซ็นต์จากยอดของแต่ละคนหลังรวมส่วนแบ่งค่าส่วนกลางแล้ว เหมือนที่ร้านคิดจากยอดบิลรวม")+'</p></div>'+
        '<div class="panel"><h3>'+L("ปิดหน้าเว็บแล้วข้อมูลหายไหม")+'</h3><p>'+L("ไม่หาย ระบบบันทึกบิลไว้ในเครื่องให้อัตโนมัติทุกครั้งที่แก้ข้อมูล เปิดกลับมาก็ทำต่อได้จากจุดเดิม")+'</p></div>'+
      '</div>'+
    '</section>'+
    '<section><div class="cta-box"><h2>'+L("พร้อมลองแล้ว")+'</h2>'+
      '<p>'+L("มีข้อมูลตัวอย่างให้กดใส่ในหน้าหารบิล ลองดูผลก่อนใช้จริงได้")+'</p>'+
      '<div class="btn-row"><a class="btn btn-main" href="#/split">'+L("เริ่มหารบิล")+'</a></div></div></section>'+
  '</div></div>';
}

function pageAbout(){
  return '<div class="page"><div class="wrap">'+
    '<div class="page-head"><h1>'+L("เกี่ยวกับ FairDish")+'</h1>'+
    '<p>'+L("โปรเจกต์ที่เริ่มจากคำถามง่าย ๆ ว่าทำไมคนสั่งน้ำเปล่าแก้วเดียวต้องจ่ายเท่าคนสั่งสเต๊ก")+'</p></div>'+
    '<div class="split2">'+
      '<div class="panel"><h3>'+L("ปัญหาที่ต้องการแก้")+'</h3>'+
        '<p>'+L("การกินข้าวเป็นกลุ่มมักจบด้วยการหารเท่ากันทั้งโต๊ะ เพราะเร็วและไม่ต้องคิดมาก แต่คนที่กินน้อยหรือไม่ได้กินบางเมนูก็ต้องจ่ายมากกว่าที่ควร ความรู้สึกไม่เป็นธรรมสะสมจนกลายเป็นความขัดแย้งในกลุ่ม และการคิดเองก็ผิดพลาดง่ายเมื่อมีค่าบริการกับ VAT เข้ามา")+'</p></div>'+
      '<div class="panel"><h3>'+L("ผู้ใช้ที่เราออกแบบให้")+'</h3><dl class="dl">'+
          '<div><dt>'+L("ตัวแทนผู้ใช้")+'</dt><dd>'+L("นายสมภูมิ อายุ 22 ปี นักศึกษา")+'</dd></div>'+
          '<div><dt>'+L("สถานการณ์")+'</dt><dd>'+L("กินข้าวกับเพื่อนเป็นกลุ่ม แต่ละคนสั่งไม่เท่ากัน")+'</dd></div>'+
          '<div><dt>'+L("สิ่งที่ต้องการ")+'</dt><dd>'+L("หารค่าอาหารให้ลงตัวโดยไม่ต้องเถียงกัน")+'</dd></div>'+
          '<div><dt>'+L("สิ่งที่คาดหวัง")+'</dt><dd>'+L("คำนวณถูกต้อง ครบถ้วน และอธิบายที่มาของยอดได้")+'</dd></div>'+
      '</dl></div>'+
    '</div>'+
    '<section><div class="sec-head"><h2>'+L("ขอบเขตของเวอร์ชันนี้")+'</h2>'+
      '<p>'+L("FairDish มีผู้ใช้ประเภทเดียว ทุกคนที่เปิดแอปทำสิ่งเดียวกันได้ทั้งหมด จึงไม่มีระบบสมาชิกหรือสิทธิ์แอดมินให้ต้องจำรหัสผ่าน")+'</p></div>'+
      '<ul class="bill-list">'+
        item("✓",L("ใช้ได้ทันทีโดยไม่ต้องล็อกอิน"),L("เปิดแล้วใช้เลย ไม่เก็บข้อมูลส่วนตัว ไม่ต้องรอโหลดบัญชี"))+
        item("✓",L("บันทึกบิลไว้ในเครื่องให้อัตโนมัติ"),L("แก้อะไรก็บันทึกทันที ปิดแล้วเปิดใหม่ยังทำต่อได้จากบิลเดิม"))+
        item("✓",L("ประวัติบิลย้อนหลัง"),L("เริ่มบิลใหม่แล้วบิลเก่าถูกเก็บไว้ในเครื่องนี้ เปิดดูหรือทำต่อได้"))+
        item("✓",L("เพื่อนยืนยันเมนูของตัวเอง"),L("ในกลุ่ม เพื่อนเลือกชื่อแล้วติ๊กเมนูที่กินเอง ทุกคนเห็นว่าใครยืนยันแล้ว"))+
      '</ul>'+
    '</section>'+
    '<section><div class="cta-box"><h2>'+L("ลองใช้ดูก่อนตัดสิน")+'</h2>'+
      '<p>'+L("กดใส่ข้อมูลตัวอย่างในหน้าหารบิล แล้วดูว่าบิลรายคนออกมาหน้าตาเป็นยังไง")+'</p>'+
      '<div class="btn-row"><a class="btn btn-main" href="#/split">'+L("เริ่มหารบิล")+'</a>'+
      '<a class="btn btn-line" href="#/how">'+L("อ่านวิธีใช้")+'</a></div></div></section>'+
  '</div></div>';
}
