/* FairDish — v4.5: สอนใช้แบบกดจริง (ต่อจากหน้าแนะนำ / "สอนใช้อีกครั้ง" ในตั้งค่า)
   ใช้ "บิลฝึก" ชั่วคราว: ระหว่างสอน commit() ไม่บันทึกอะไรลงเครื่อง (ui.tour) บิลจริงที่ทำค้างไว้จึงไม่ถูกแตะ
   แต่ละขั้นไฮไลต์ปุ่มที่ต้องกด แล้วไปขั้นถัดไปเองเมื่อทำสำเร็จ (ดูจากข้อมูลใน state) — จอใหญ่/มือถือใช้ขั้นต่างกันบางขั้น
   จบแล้วถามติดตั้งแอปบนมือถือ/แท็บเล็ต (Install.available()) ไม่งั้นไปหน้าหลัก */
"use strict";

/** บิลฝึก: บิลอาหารว่าง ๆ ให้ผู้ใช้ใส่เอง */
function practiceBill(){
  var b = emptyBill("meal");
  b.name = L("บิลฝึก");
  return b;
}
function tourVisible(sel){
  var list = document.querySelectorAll(sel);
  for (var i = 0; i < list.length; i++){
    var r = list[i].getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return list[i];
  }
  return null;
}
function firstMenu(){ return state.menus.filter(function(m){ return m.type !== "meal"; })[0]; }
function tourTransfers(){
  if (!hasData()) return 0;
  var s = settleBill(compute());
  return s.ok ? s.transfers.length : 0;
}

/* ---- v4.5.1: "ถัดไป" โดยไม่ได้ทำเอง = ระบบทำให้ดูด้วยข้อมูลตัวอย่าง (ขั้นหลังจะได้มีข้อมูลให้ดูต่อ) ---- */
function tourAddPeople(){
  var want = [L("มาร์ค"), L("ไอซ์"), L("ยูกะ")];      // 3 คน: ติ๊กโอนหนึ่งรายการแล้วยังไม่ "โอนครบ"
  want.forEach(function(name){
    if (state.members.length >= 3) return;
    if (state.members.some(function(p){ return normText(p.name) === normText(name); })) return;
    state.members.push({ id:nid(), name:name });
  });
  render();
}
function tourAddMenus(){
  state.menuForm = null; ui.menuErr = {};
  if (typeof closeSuggestions === "function") closeSuggestions();
  var ids = state.members.map(function(p){ return p.id; });
  if (!ids.length){ tourAddPeople(); ids = state.members.map(function(p){ return p.id; }); }
  if (!state.menus.length){
    state.menus.push({ id:nid(), name:L("ส้มตำ"), price:90, eaters:ids.slice() });
    state.menus.push({ id:nid(), name:L("ลาบหมู"), price:80, eaters:ids.slice(0, Math.max(1, ids.length - 1)) });
  }
  render();
}
function tourGoBill(){ location.hash = billHref(); }

/* ---- ขั้นตอน (mode: "mobile" | "wide" | ไม่ใส่ = ทั้งคู่) · auto = สิ่งที่ระบบทำให้เมื่อกด "ถัดไป" ---- */
var TOUR_STEPS = [
  { id:"people", path:"/split", target:[".field-row"],
    title:"ใส่ชื่อคนในบิล", body:"พิมพ์ชื่อแล้วกด \"เพิ่ม\" ใส่อย่างน้อย 2 คน เช่น มาร์ค กับ ไอซ์",
    auto:tourAddPeople,
    done:function(){ return state.members.length >= 2; } },
  { id:"tabMenus", mode:"mobile", path:"/split", target:["#tab-menus"],
    title:"ไปที่แท็บเมนู", body:"แตะแท็บ \"เมนู\" เพื่อใส่รายการอาหาร",
    auto:function(){ setStep("menus"); },
    done:function(){ return ui.step === "menus" || state.menus.length > 0; } },
  { id:"menuMobile", mode:"mobile", path:"/split", target:[".sheet", "#menuOpen"],
    title:"เพิ่มเมนูแรก", body:"แตะ \"+ เพิ่มเมนู\" พิมพ์ชื่อและราคา (เลือกจากเมนูแนะนำได้) แตะชื่อคนที่กินจานนี้ แล้วกดเพิ่ม",
    auto:tourAddMenus,
    done:function(){ return state.menus.length >= 1 && !state.menuForm; } },
  { id:"menuWide", mode:"wide", path:"/split", target:[".ws-add"],
    title:"เพิ่มเมนูแรก", body:"พิมพ์ชื่อเมนูและราคา แล้วกด \"+ เพิ่ม\" หรือ Enter จะเลือกจากเมนูแนะนำก็ได้ ครั้งหน้ากด M เพื่อมาที่ช่องนี้",
    auto:tourAddMenus,
    done:function(){ return state.menus.length >= 1; } },
  { id:"eaters", mode:"wide", path:"/split", target:[".ws-card .ws-picks"],
    title:"เลือกว่าใครกินจานนี้", body:"แตะชื่อคนที่กินจานนี้ให้เป็นสีม่วง (กด \"ทุกคน\" ถ้ากินด้วยกันหมด) หรือลากชื่อจากคอลัมน์ซ้ายมาวางบนการ์ดก็ได้",
    enter:function(t){ var m = firstMenu(); t.snap = m ? m.eaters.slice().sort().join() : ""; },
    auto:function(){ var m = firstMenu(); if (m && state.members.length) wsToggleEater(m.id, state.members[0].id); },
    done:function(t){ var m = firstMenu(); return !!m && m.eaters.slice().sort().join() !== t.snap; } },
  { id:"tabShared", mode:"mobile", path:"/split", target:["#tab-shared"],
    title:"ค่าส่วนกลาง", body:"แตะแท็บ \"ส่วนกลาง\" ที่นี่ใส่ค่าบริการ VAT และของที่หารเท่ากันทุกคน",
    auto:function(){ setStep("shared"); },
    done:function(){ return ui.step === "shared"; } },
  { id:"charges", path:"/split", target:["#chargeList"], next:true,
    title:"ค่าบริการ / VAT", body:"ถ้าร้านคิดค่าบริการหรือ VAT แตะเพื่อเปิด ระบบคิดเป็น % จากยอดของแต่ละคนให้เอง (ร้านไม่คิดก็กดถัดไปได้เลย)",
    enter:function(t){ t.snap = JSON.stringify(state.charges); },
    done:function(t){ return JSON.stringify(state.charges) !== t.snap; } },
  { id:"live", mode:"wide", path:"/split", target:[".ws-sum .receipt-wrap"], next:true,
    title:"สรุปยอดสด", body:"ยอดของแต่ละคนอัปเดตทันทีที่แก้ แตะชื่อเพื่อดูเฉพาะรายการของคนนั้น (เมนูที่ไม่ได้กินจะจางลง)" },
  // v4.12: มือถือไม่มีแท็บสรุปแล้ว — ไปใบสรุปยอดจากแถบล่าง แล้วเลือกคนจ่าย/ติ๊กโอนที่นั่นเหมือนจอใหญ่
  { id:"toBillMobile", mode:"mobile", path:"/split", target:["#totalBar .btn-main"],
    title:"ดูใบสรุปยอด", body:"กด \"ดูใบสรุปยอด\" ที่แถบล่าง เพื่อดูยอดของแต่ละคน เลือกคนจ่าย และดูว่าใครต้องโอนให้ใคร",
    auto:tourGoBill,
    done:function(){ return currentPath() === "/bill"; } },
  { id:"toBillWide", mode:"wide", path:"/split", target:[".ws-sum .btn-main"],
    title:"ไปใบสรุปยอด", body:"กด \"ดูใบสรุปยอด\" เพื่อเลือกคนจ่ายและดูว่าใครต้องโอนให้ใคร",
    auto:tourGoBill,
    done:function(){ return currentPath() === "/bill"; } },
  { id:"payer", path:"/bill", target:["#billSettle .settle .pick", ".w-settle .pick"],
    title:"ใครจ่ายให้ร้าน", body:"แตะชื่อคนที่จ่ายเงินให้ร้านไปก่อน ระบบจะคิดให้ว่าคนอื่นต้องโอนให้ใครเท่าไร",
    auto:function(){ if (state.members[0]) togglePayer(state.members[0].id); },
    done:function(){ return state.payers.length >= 1; } },
  { id:"paid", path:"/bill", target:["#billSettle .tf-tick", ".w-settle .tf-tick"],
    title:"ติ๊กเมื่อโอนแล้ว", body:"พอเพื่อนโอนมาแล้ว แตะช่องหน้าชื่อ ไม่ต้องจำเองว่าใครโอนแล้วบ้าง",
    skip:function(){ return tourTransfers() === 0; },
    auto:function(){ var s = hasData() ? settleBill(compute()) : null; if (s && s.ok && s.transfers[0]) togglePaid(transferKey(s.transfers[0])); },
    done:function(){ return Object.keys(state.paid).length >= 1; } },
  { id:"share", path:"/bill", target:[".w-actions", ".page .btn-stack"], next:true,
    title:"ส่งเข้ากลุ่มแชต", body:"คัดลอกสรุปยอด หรือแชร์รูปใบเสร็จส่งเข้ากลุ่มได้เลย ส่วน \"ชวนเพื่อน\" จะสร้างลิงก์ให้เพื่อนติ๊กเมนูเอง (ตอนฝึกยังกดไม่ได้)" }
];

/* ---- เริ่ม / จบ ---- */
var TOUR_ROUTES = ["/split", "/bill"];
function tourStart(){
  closeGlobalSheet();
  hideToast();                            // ข้อความที่ค้างจากหน้าก่อนอย่าทับกล่องสอน
  ui.tour = { i:-1, t:{} };
  ui.tourNext = ui.onbNext || null;      // เปิดครั้งแรกจากลิงก์หน้าอื่น → จบแล้วไปหน้านั้น
  ui.onbNext = null;
  ui.step = "members";
  state.menuForm = null; state.sharedForm = null; state.chargeForm = null;
  // v4.5.2: ใส่บิลฝึกว่าง ๆ ทันที (บิลส่วนตัว ไม่ผ่าน loadContext) — ก่อนหน้านี้ช่วงรอโหลด การสอนเห็นบิลจริงที่เปิดค้าง
  // ว่ามีคน/เมนูแล้วจึงข้ามขั้นไป ตอนนี้เริ่มจากขั้นแรกเสมอ (จบการสอน ui.ctx = undefined → โหลดบิลจริงกลับมา)
  loadToken++;                            // ยกเลิก loadContext ที่ค้างอยู่ไม่ให้เขียนทับบิลฝึก
  Store.groupId = null; Store.version = 0; Store.base = null; Store.groupName = "";
  applyBill(practiceBill());
  ui.ctx = null; ui.loading = false; ui.groupError = "";
  setSave("saved");
  ui.wsPast = []; ui.wsFocus = null;
  tourGo(0);
  if (location.hash === "#/split") route(); else location.hash = "#/split";
  tourLoop();
}
/** จบการสอน: ทิ้งบิลฝึก (ui.ctx = undefined → เปิดหน้าหารบิลครั้งหน้าโหลดบิลจริงจากเครื่อง) */
function tourEnd(go){
  if (!ui.tour) return;
  ui.tour = null;
  ui.wsPast = []; ui.wsFocus = null;
  ui.ctx = undefined;
  renderTour();
  var next = ui.tourNext; ui.tourNext = null;
  if (go === false) return;
  var dest = next && next !== "#/" ? next : "#/";
  if (location.hash === dest) route(); else location.hash = dest;
}
function tourGo(i){
  var t = ui.tour;
  if (!t) return;
  t.i = i; t.t = {}; t.scrolled = false;
  var st = TOUR_STEPS[i];
  if (st && st.enter) st.enter(t.t);
  renderTour();
}
function tourStepForScreen(st){
  return !!st && !(st.mode === "mobile" && isWide()) && !(st.mode === "wide" && !isWide());
}
function tourStepOk(st){
  return tourStepForScreen(st) && !(st.skip && st.skip());
}
function tourPath(st){ return typeof st.path === "function" ? st.path() : st.path; }
/** ไปขั้นถัดไปที่ใช้กับจอนี้ได้ (ขั้นที่ทำสำเร็จไปแล้วจะถูกข้ามเองตอน tourTick) — เลยขั้นสุดท้าย = หน้าจบ */
function tourAdvance(){
  var t = ui.tour, i = t.i + 1;
  while (i < TOUR_STEPS.length && !tourStepOk(TOUR_STEPS[i])){
    if (tourStepForScreen(TOUR_STEPS[i])) t.skipped = (t.skipped || 0) + 1;   // ข้ามจริงเพราะ skip() — หักออกจากตัวนับ
    i++;
  }
  tourGo(Math.min(i, TOUR_STEPS.length));
}

/* ---- วาดชั้นสอน (ไฮไลต์ + กล่องคำอธิบาย) ---- */
var tourLast = "";
function tourLoop(){
  if (!ui.tour) return;
  tourTick();
  requestAnimationFrame(tourLoop);
}
function tourTick(){
  var t = ui.tour;
  if (!t) return;
  var st = TOUR_STEPS[t.i];
  if (st && (!tourStepOk(st) || (st.done && st.done(t.t)))) return tourAdvance();
  var box = document.getElementById("tour");
  if (!box) return;
  var el = null, away = false;
  if (st){
    away = currentPath() !== tourPath(st);
    if (!away) for (var k = 0; k < st.target.length && !el; k++) el = tourVisible(st.target[k]);
    if (el && !t.scrolled){
      t.scrolled = true;
      var r0 = el.getBoundingClientRect();
      if (r0.top < 70 || r0.bottom > innerHeight - 90) el.scrollIntoView({ block:"center" });
    }
  }
  var r = el ? el.getBoundingClientRect() : null;
  var key = t.i + "|" + (away ? "away" : "") + "|" + (r ? [r.left, r.top, r.width, r.height].map(Math.round).join() : "none") + "|" + innerWidth + "x" + innerHeight;
  if (key === tourLast) return;
  tourLast = key;
  placeTour(box, r);
}
function renderTour(){
  var box = document.getElementById("tour");
  if (!box) return;
  tourLast = "";
  document.body.classList.toggle("touring", !!ui.tour);
  if (!ui.tour){ box.hidden = true; box.innerHTML = ""; return; }
  var t = ui.tour, st = TOUR_STEPS[t.i];
  // นับขั้นตามจอ ไม่ใช่ตาม skip() ตอนนี้ — เดิมขั้น "ติ๊กโอนแล้ว" ถูกข้ามตอนยังไม่มียอดโอน ตัวนับจึงขึ้น "1 จาก 9" แล้วกลายเป็น "10 จาก 10"
  var skipped = t.skipped || 0;
  var total = (TOUR_STEPS.filter(tourStepForScreen).length - skipped) || TOUR_STEPS.length;
  var n = TOUR_STEPS.slice(0, t.i + 1).filter(tourStepForScreen).length - skipped;
  box.hidden = false;
  var tip;
  if (!st){
    var install = Install.available();
    tip = '<div class="tour-tip tour-end" role="dialog" aria-modal="true" aria-labelledby="tourTitle">'+
      '<img class="tour-mascot" src="img/mascot.png" alt="" width="96" height="96">'+
      '<h2 id="tourTitle">'+L("เก่งมาก! พร้อมหารบิลจริงแล้ว 🎉")+'</h2>'+
      '<p>'+(install ? L("ติดตั้ง FairDish ลงเครื่องไว้ไหม? เปิดได้เร็วจากหน้าจอโฮมเหมือนแอป ไม่ต้องหาลิงก์ทุกครั้ง")
                     : L("บิลฝึกจะถูกลบไป บิลที่คุณทำค้างไว้ยังอยู่ครบ ไปเริ่มบิลจริงกันเลย"))+'</p>'+
      '<div class="tour-btns">'+(install
        ? '<button class="btn-main" type="button" data-tour-install="1">'+L("ติดตั้งแอปเลย")+'</button>'+
          '<button class="btn-line" type="button" data-tour-done="1">'+L("ไว้ทีหลัง ไปหน้าหลัก")+'</button>'
        : '<button class="btn-main" type="button" data-tour-done="1">'+L("ไปหน้าหลัก")+'</button>')+'</div>'+
    '</div>';
    box.innerHTML = '<div class="tour-scrim"></div>'+tip;
    var b = box.querySelector(".tour-btns .btn-main");
    if (b) b.focus();
    return;
  }
  tip = '<div class="tour-tip" role="dialog" aria-live="polite" aria-labelledby="tourTitle">'+
    '<div class="tour-top"><span class="tour-count">'+L("ขั้นที่ {n} จาก {total}", { n:n, total:total })+'</span>'+
      '<button class="link-btn" type="button" data-tour-skip="1">'+L("ข้ามการสอน")+'</button></div>'+
    '<h2 id="tourTitle">'+L(st.title)+'</h2>'+
    '<p class="tour-body">'+L(st.body)+'</p>'+
    '<p class="tour-away" hidden>'+L("กลับไปทำต่อที่หน้านี้")+' <button class="btn-sm btn-xs" type="button" data-tour-back="1">'+L("ไปต่อ")+'</button></p>'+
    '<div class="tour-btns">'+(st.auto ? '<span class="tour-hint">'+L("ไม่อยากกรอก? กดถัดไป ระบบใส่ตัวอย่างให้ดู")+'</span>' : '')+
      '<button class="btn-sm" type="button" data-tour-next="1">'+L("ถัดไป")+'</button></div>'+
  '</div>';
  box.innerHTML = '<i class="tour-block" data-b="t"></i><i class="tour-block" data-b="l"></i><i class="tour-block" data-b="r"></i><i class="tour-block" data-b="b"></i>'+
    '<i class="tour-ring" aria-hidden="true"></i>'+tip;
  tourTick();
}
/** วางวงไฮไลต์รอบปุ่ม + ตัวกันกดรอบ ๆ + กล่องคำอธิบายใกล้ปุ่ม (ไม่มีเป้า = กล่องกลางจอ กดหน้าเว็บได้ตามปกติ) */
function placeTour(box, r){
  var ring = box.querySelector(".tour-ring"), tip = box.querySelector(".tour-tip");
  if (!ring || !tip) return;
  var st = TOUR_STEPS[ui.tour.i];
  var away = st && currentPath() !== tourPath(st);
  var awayEl = tip.querySelector(".tour-away");
  if (awayEl) awayEl.hidden = !away;
  var pad = 6, W = innerWidth, H = innerHeight;
  var blocks = box.querySelectorAll(".tour-block");
  if (!r){
    ring.style.display = "none";
    Array.prototype.forEach.call(blocks, function(b){ b.style.display = "none"; });
    tip.style.left = Math.max(12, (W - tip.offsetWidth) / 2) + "px";
    tip.style.top = Math.max(12, H - tip.offsetHeight - 24) + "px";
    return;
  }
  var x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad), w = Math.min(W, r.right + pad) - x, h = Math.min(H, r.bottom + pad) - y;
  ring.style.display = "block";
  ring.style.left = x + "px"; ring.style.top = y + "px"; ring.style.width = w + "px"; ring.style.height = h + "px";
  var set = function(b, l, t2, ww, hh){ b.style.display = "block"; b.style.left = l + "px"; b.style.top = t2 + "px"; b.style.width = Math.max(0, ww) + "px"; b.style.height = Math.max(0, hh) + "px"; };
  Array.prototype.forEach.call(blocks, function(b){
    var s = b.getAttribute("data-b");
    if (s === "t") set(b, 0, 0, W, y);
    if (s === "b") set(b, 0, y + h, W, H - y - h);
    if (s === "l") set(b, 0, y, x, h);
    if (s === "r") set(b, x + w, y, W - x - w, h);
  });
  tip.classList.remove("mini");
  var pos = tourTipPos(tip, x, y, w, h, W, H);
  if (pos.overlap){                     // ไม่มีที่ให้กล่องเต็ม (เช่นแผ่นฟอร์มเกือบเต็มจอ) → ย่อเหลือแถบหัวเรื่องบนสุดของจอ
    tip.classList.add("mini");
    pos = { left:Math.max(8, (W - tip.offsetWidth) / 2), top:8 };
  }
  tip.style.left = pos.left + "px"; tip.style.top = pos.top + "px";
}
/** ตำแหน่งกล่องคำอธิบาย: ใต้ปุ่ม → เหนือปุ่ม → ข้าง ๆ · overlap = ทับปุ่มเลี่ยงไม่ได้ */
function tourTipPos(tip, x, y, w, h, W, H){
  var tw = tip.offsetWidth, th = tip.offsetHeight, gap = 14;
  var left = Math.min(Math.max(12, x + w / 2 - tw / 2), W - tw - 12);
  if (y + h + gap + th <= H - 8) return { left:left, top:y + h + gap };
  if (y - gap - th >= 8) return { left:left, top:y - gap - th };
  if (x + w + gap + tw <= W - 8) return { left:x + w + gap, top:Math.min(Math.max(8, y), H - th - 8) };
  if (x - gap - tw >= 8) return { left:x - gap - tw, top:Math.min(Math.max(8, y), H - th - 8) };
  return { left:left, top:Math.max(8, H - th - 8), overlap:true };
}

/* ---- ปุ่มในชั้นสอน ---- */
/** "ถัดไป": ขั้นที่ยังไม่ได้ทำ → ระบบทำให้ (auto) แล้วรอให้หน้าวาดผลเสร็จก่อนไปขั้นต่อไป */
function tourNextClick(){
  var t = ui.tour, st = t && TOUR_STEPS[t.i];
  if (!st) return;
  var i = t.i;
  if (st.auto && !(st.done && st.done(t.t))){
    try { st.auto(); } catch(e){}
    setTimeout(function(){ if (ui.tour && ui.tour.i === i) tourAdvance(); }, 350);
    return;
  }
  tourAdvance();
}
function tourClick(t){
  if (t.getAttribute("data-tour-next")){ tourNextClick(); return true; }
  if (t.getAttribute("data-tour-skip")){ tourEnd(); return true; }
  if (t.getAttribute("data-tour-done")){ tourEnd(); return true; }
  if (t.getAttribute("data-tour-back")){ var st = TOUR_STEPS[ui.tour.i]; if (st) location.hash = tourPath(st) === "/bill" ? billHref() : splitHref(); return true; }
  if (t.getAttribute("data-tour-install")){
    tourEnd();
    // v4.6: ยังไม่ได้ตอบชื่อ = หน้าหลักเป็นหน้าถามชื่อ → เปิดหน้าต่างติดตั้งหลังตอบ ไม่เด้งทับกัน
    setTimeout(function(){ if (needName()) nameThen = function(){ route(); openInstall(); }; else openInstall(); }, 60);
    return true;
  }
  return false;
}
