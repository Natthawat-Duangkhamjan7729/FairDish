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
  var me = myMemberId();
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
        return '<div><span class="dname">'+esc(it.name)+' ÷ '+it.split+'</span><span>'+baht(it.amount)+'</span></div>';
      }).join("");
      if (p.items.length===0) d = '<div><span class="dname">ไม่ได้สั่งเมนูส่วนตัว</span><span>0.00</span></div>';
      if (r.sharedTotal>0) d += '<div><span class="dname">ค่าส่วนกลาง ÷ '+r.n+'</span><span>'+baht(p.sharedShare)+'</span></div>';
      if (r.rate>0) d += '<div><span class="dname">ค่าบริการ + ภาษี '+(r.rate*100).toFixed(0)+'%</span><span>'+baht(p.charge)+'</span></div>';
      html += '<div class="r-detail">'+d+'</div>';
    }
    return html;
  }).join("");

  var sums = '<div><span>ค่าอาหาร</span><span>'+baht(r.foodTotal)+'</span></div>';
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

/* ---- v2.5: ใครจ่ายให้ร้าน + ใครโอนให้ใคร ---- */
function payerSection(r){
  var anyPayer = state.payers.some(function(p){ return !!nameOf(p.id); });
  if (!anyPayer && !ui.payerOpen){
    // v2.6: ยังไม่ใช้ = แถวเดียวพับไว้ หน้าสรุปจะได้ไม่ยาว
    return '<button class="payer-toggle" data-payer-open="1" aria-expanded="false">'+
      '<span><b>ใครจ่ายให้ร้านไปก่อน?</b><span>ดูว่าใครต้องโอนให้ใคร</span></span><span aria-hidden="true">›</span></button>';
  }
  var s = settle(r, state.payers);
  var me = myMemberId();
  var chosen = {};
  state.payers.forEach(function(p){ chosen[p.id] = p; });
  var active = state.payers.filter(function(p){ return !!nameOf(p.id); });

  var picks = '<div class="pick" role="group" aria-label="คนที่จ่ายเงินให้ร้าน">'+r.list.map(function(p){
    return '<button data-payer="'+p.id+'" aria-pressed="'+(!!chosen[p.id])+'">'+esc(p.name)+'</button>';
  }).join("")+'</div>';

  var amounts = active.length < 2 ? "" : '<div class="payer-amts">'+active.map(function(p){
    return '<label class="payer-row"><span class="payer-name">'+esc(nameOf(p.id))+' จ่าย</span>'+
      '<input type="number" inputmode="decimal" step="0.01" min="0" data-payer-amt="'+p.id+'" '+
        'value="'+(p.amount == null ? "" : p.amount)+'" placeholder="ส่วนที่เหลือ" aria-label="ยอดที่ '+esc(nameOf(p.id))+' จ่าย">'+
      '<span class="payer-unit">บาท</span></label>';
  }).join("")+'</div>';

  var msg = ({
    none:    ["muted", "แตะชื่อคนที่จ่ายเงินให้ร้านไปก่อน จ่ายกันหลายคนก็เลือกได้"],
    missing: ["muted", "ใส่ยอดที่แต่ละคนจ่าย เว้นว่างไว้ได้คนเดียว ระบบจะคิดเป็นส่วนที่เหลือให้"],
    short:   ["error", "ยอดที่จ่ายรวมกันยังขาดอีก "+baht(s.diff)+" บาท"],
    over:    ["error", "ยอดที่จ่ายรวมกันเกินยอดบิล "+baht(s.diff)+" บาท"]
  })[s.reason];
  var open = active.filter(function(p){ return p.amount == null; })[0];
  if (s.ok && active.length > 1 && open) msg = ["muted", nameOf(open.id)+" จ่ายส่วนที่เหลือ "+baht(s.paid[open.id])+" บาท"];

  var transfers = "";
  if (s.ok){
    transfers = '<div class="transfers" aria-live="polite"><h3>โอนเงินตามนี้</h3>'+
      (s.transfers.length ? s.transfers.map(function(t){
        var mine = me && (t.from === me || t.to === me);
        return '<div class="tf-row'+(mine ? ' me' : '')+'">'+
          '<span class="tf-who"><b>'+esc(t.fromName)+'</b> <span class="tf-arrow" aria-label="โอนให้">→</span> <b>'+esc(t.toName)+'</b></span>'+
          '<span class="tf-amt">'+baht(t.amount)+'</span></div>';
      }).join("") : '<p class="hint" style="margin:0">ไม่มีใครต้องโอน ทุกคนจ่ายพอดีกับที่กิน 👍</p>')+
      '<p class="tf-note">'+(s.transfers.length > 1 ? "หักลบให้แล้ว โอนแค่ "+s.transfers.length+" ครั้งก็จบ" : "")+'</p></div>';
  }

  return '<section class="step-card payer-card" aria-labelledby="h-payers">'+
    '<div class="step-head"><h2 id="h-payers">ใครจ่ายให้ร้านไปก่อน?</h2></div>'+
    picks + amounts +
    (msg ? '<p class="field-msg '+msg[0]+'" aria-live="polite">'+esc(msg[1])+'</p>' : '')+
    transfers+
  '</section>';
}
