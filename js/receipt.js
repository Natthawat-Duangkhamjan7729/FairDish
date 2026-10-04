/* FairDish — ใบเสร็จ */
"use strict";

/* =========================================================
   5. ใบเสร็จ
   ========================================================= */
function barcode(seed){
  var bars="", x = Math.max(1, Math.round(seed*100)) % 9973;
  for (var i=0;i<46;i++){
    x = (x*1103515245 + 12345) % 2147483648;
    bars += '<i style="width:'+(1+(x%4))+'px;height:'+(60+(x%41))+'%"></i>';
  }
  return '<div class="barcode" aria-hidden="true">'+bars+'</div>';
}
function receiptHTML(r, opts){
  opts = opts || {};
  var kind = opts.kind || state.kind;               // v3.2: ใบเสร็จของบิลในประวัติส่งประเภทมาเอง
  var me = opts.kind ? null : myMemberId();
  var lines = r.list.map(function(p){
    var opened = !!state.open[p.id];
    var cls = "r-line" + (p.id===me ? " me" : "");
    var html = (opts.interactive
      ? '<button class="'+cls+'" data-toggle="'+p.id+'" aria-expanded="'+opened+'"><span class="caret">&#9654;</span>'
      : '<div class="'+cls+'"><span class="caret" style="visibility:hidden">&#9654;</span>')
      + '<span class="who">'+esc(p.name)+(p.id===me ? ' <span class="me-tag">ฉัน</span>' : '')+'</span><span class="val">'+baht(p.rounded)+'</span>'
      + (opts.interactive ? '</button>' : '</div>');
    if (opts.interactive && opened){
      var d = p.items.map(function(it){
        return '<div><span class="dname">'+(it.meal ? '🍲 '+esc(it.name)+' · ตามที่กิน' : esc(it.name)+' ÷ '+it.split)+'</span><span>'+baht(it.amount)+'</span></div>';
      }).join("");
      if (p.items.length===0) d = '<div><span class="dname">'+ktOf(kind,"noItems")+'</span><span>0.00</span></div>';
      if (r.sharedTotal>0) d += '<div><span class="dname">ค่าส่วนกลาง ÷ '+r.n+'</span><span>'+baht(p.sharedShare)+'</span></div>';
      if (r.rate>0) d += '<div><span class="dname">ค่าบริการ + ภาษี '+(r.rate*100).toFixed(0)+'%</span><span>'+baht(p.charge)+'</span></div>';
      html += '<div class="r-detail">'+d+'</div>';
    }
    return html;
  }).join("");

  var sums = '<div><span>'+ktOf(kind,"sumLabel")+'</span><span>'+baht(r.foodTotal)+'</span></div>';
  if (r.sharedTotal>0) sums += '<div><span>ค่าส่วนกลาง</span><span>'+baht(r.sharedTotal)+'</span></div>';
  if (r.chargeTotal>0) sums += '<div><span>ค่าบริการ + ภาษี</span><span>'+baht(r.chargeTotal)+'</span></div>';

  return '<div class="receipt-wrap'+(opts.reveal?' reveal':'')+'"><div class="receipt">'+
    '<div class="r-title">ใบสรุปยอด</div>'+
    '<div class="r-meta">'+r.n+' คน · '+r.list.reduce(function(a,p){return a+p.items.length;},0)+' รายการที่แบ่งกัน</div>'+
    lines+
    '<div class="r-sum">'+sums+'</div>'+
    '<div class="r-total"><span>รวมทั้งหมด</span><span>'+baht(r.grand)+' ฿</span></div>'+
    barcode(r.grand)+
  '</div><div class="receipt-edge"></div></div>';
}
function demoReceiptHTML(){
  // ตรงกับปุ่ม "ใส่ข้อมูลตัวอย่าง" (loadDemo) — แก้ข้อมูลตัวอย่างแล้วต้องแก้ตรงนี้ด้วย
  var rows = [["มาร์ค",151.67],["พูม",81.66],["ไอซ์",250.00],["ชาเน่",91.67],
              ["โม",135.00],["ยูกะ",121.67],["โฟรค์",61.66],["เจ้าสัว",216.67]];
  var lines = rows.map(function(p){
    return '<div class="r-line"><span class="caret" style="visibility:hidden">&#9654;</span>'+
      '<span class="who">'+p[0]+'</span><span class="val">'+baht(p[1])+'</span></div>';
  }).join("");
  return '<div class="receipt-wrap reveal"><div class="receipt">'+
    '<div class="r-title">ใบสรุปยอด</div>'+
    '<div class="r-meta">8 คน · 10 เมนู · ร้านส้มตำหน้ามอ</div>'+lines+
    '<div class="r-sum"><div><span>ค่าอาหาร</span><span>930.00</span></div>'+
    '<div><span>ค่าส่วนกลาง</span><span>180.00</span></div></div>'+
    '<div class="r-total"><span>รวมทั้งหมด</span><span>1,110.00 ฿</span></div>'+
    barcode(1110)+'</div><div class="receipt-edge"></div></div>';
}

/* ---- v2.5 / v3.2: ใครจ่ายให้ร้าน + ใครโอนให้ใคร (อยู่ในแท็บสรุปของหน้าหารบิล) ---- */
/** ส่วนเลือกคนจ่ายของมื้ออาหาร หรือยอดที่แต่ละคนจ่ายไปของทริป แล้วต่อด้วยรายการโอน */
function settleHTML(r){
  var s = settleBill(r);
  var head = state.kind === "trip" ? tripPaidHTML(s) : mealPayerHTML(r, s);
  var body;
  if (s.ok) body = transfersBlock(s, true, "h-sum-tf");
  else body = '<h3 class="settle-head" id="h-sum-tf">ใครโอนให้ใคร</h3>'+
    '<p class="notice warn" style="margin:0">'+(s.reason === "unpaid"
      ? 'ยังไม่ได้ใส่ว่าใครจ่าย '+s.count+' รายการ ใส่ให้ครบในแท็บ'+kt("items")+'แล้วจะรู้ว่าใครต้องโอนให้ใคร'
      : (s.reason === "none" ? 'เลือกคนจ่ายให้ร้านก่อน แล้วจะสรุปให้ว่าใครโอนให้ใคร' : 'แก้ยอดที่คนจ่ายให้ตรงกับยอดบิลก่อน'))+'</p>';
  return '<div class="settle">'+head+body+'</div>';
}
function mealPayerHTML(r, s){
  var chosen = {};
  state.payers.forEach(function(p){ chosen[p.id] = p; });
  var active = state.payers.filter(function(p){ return !!nameOf(p.id); });

  var picks = '<div class="pick" role="group" aria-labelledby="h-payers">'+r.list.map(function(p){
    return '<button data-payer="'+p.id+'" aria-pressed="'+(!!chosen[p.id])+'">'+esc(p.name)+'</button>';
  }).join("")+'</div>';

  var amounts = active.length < 2 ? "" : '<div class="payer-amts">'+active.map(function(p){
    return '<label class="payer-row"><span class="payer-name">'+esc(nameOf(p.id))+' จ่าย</span>'+
      '<input type="number" inputmode="decimal" step="0.01" min="0" data-payer-amt="'+p.id+'" '+
        'value="'+(p.amount == null ? "" : p.amount)+'" placeholder="ส่วนที่เหลือ" aria-label="ยอดที่ '+esc(nameOf(p.id))+' จ่าย">'+
      '<span class="payer-unit">บาท</span></label>';
  }).join("")+'</div>';

  var msg = ({
    none:    ["muted", "แตะชื่อคนที่จ่าย จ่ายหลายคนได้ เว้นยอดไว้ได้หนึ่งคนเป็นส่วนที่เหลือ"],
    missing: ["muted", "ใส่ยอดที่แต่ละคนจ่าย เว้นว่างไว้ได้คนเดียว ระบบจะคิดเป็นส่วนที่เหลือให้"],
    short:   ["error", "ยอดที่จ่ายรวมกันยังขาดอีก "+baht(s.diff)+" บาท"],
    over:    ["error", "ยอดที่จ่ายรวมกันเกินยอดบิล "+baht(s.diff)+" บาท"]
  })[s.reason];
  var open = active.filter(function(p){ return p.amount == null; })[0];
  if (s.ok && active.length === 1) msg = ["muted", nameOf(active[0].id)+" จ่ายทั้งหมด "+baht(r.grand)+" บาท"];
  if (s.ok && active.length > 1 && open) msg = ["muted", nameOf(open.id)+" จ่ายส่วนที่เหลือ "+baht(s.paid[open.id])+" บาท"];

  return '<h3 class="settle-head" id="h-payers">ใครจ่ายให้ร้าน</h3>'+
    picks + amounts +
    (msg ? '<p class="field-msg '+msg[0]+'" aria-live="polite">'+esc(msg[1])+'</p>' : '');
}
/** ทริป: คนจ่ายอยู่ในแต่ละรายการแล้ว แสดงยอดที่แต่ละคนจ่ายไป */
function tripPaidHTML(s){
  if (!s.ok) return "";
  return '<h3 class="settle-head">ใครจ่ายไปแล้ว</h3><div class="paid-list">'+Object.keys(s.paid).map(function(id){
    return '<span class="paid-chip">'+esc(nameOf(id))+' จ่ายไป <b>'+baht(s.paid[id])+'</b></span>';
  }).join("")+'</div>';
}
/**
 * รายการโอน — interactive = ติ๊กว่าโอนแล้วได้ (ข้อมูลอยู่ใน state.paid และบันทึกไปกับบิล/กลุ่ม)
 * paid ส่งมาเองได้ (บิลในประวัติ) ไม่ส่ง = ของบิลที่เปิดอยู่
 */
function transfersBlock(s, interactive, headId, paid){
  paid = paid || state.paid;
  var me = interactive ? myMemberId() : null;
  var prog = paidProgress(s.transfers, paid);
  var rows = s.transfers.map(function(t){
    var k = transferKey(t), done = !!paid[k];
    var mine = me && (t.from === me || t.to === me);
    var box = '<span class="tf-box">'+(done ? ICON_CHECK : '')+'</span>';
    return '<div class="tf-row'+(done ? ' done' : '')+(mine ? ' me' : '')+'">'+
      (interactive
        ? '<button class="tf-tick" type="button" role="checkbox" data-paid="'+esc(k)+'" aria-checked="'+done+'" aria-label="'+esc(t.fromName)+' โอนให้ '+esc(t.toName)+' แล้ว">'+box+'</button>'
        : '<span class="tf-tick" aria-hidden="true">'+box+'</span>')+
      '<span class="tf-who"><span class="tf-names"><b>'+esc(t.fromName)+'</b> <span class="tf-arrow" aria-label="โอนให้">→</span> <b>'+esc(t.toName)+'</b></span>'+
        '<span class="tf-status">'+(done ? 'โอนแล้ว' : 'ยังไม่ได้โอน')+'</span></span>'+
      '<span class="tf-amt">'+baht(t.amount)+'</span></div>';
  }).join("");
  return '<div class="tf-head"><h3 class="settle-head" id="'+headId+'">ใครโอนให้ใคร</h3>'+
      (s.transfers.length ? '<span class="tf-count">โอนแล้ว '+prog.done+'/'+prog.total+'</span>' : '')+'</div>'+
    (s.transfers.length
      ? (interactive ? '<p class="hint">แตะช่องหน้าชื่อเมื่อโอนแล้ว ไม่มีใครต้องตามทวง</p>' : '')+rows+
        (s.transfers.length > 1 ? '<p class="tf-note">หักลบให้แล้ว โอนแค่ '+s.transfers.length+' ครั้งก็จบ</p>' : '')
      : '<p class="hint" style="margin:0">ไม่มีใครต้องโอน ทุกคนจ่ายพอดีกับส่วนของตัวเอง 👍</p>');
}
