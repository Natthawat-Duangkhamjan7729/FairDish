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
  var lines = r.list.map(function(p){
    var opened = !!state.open[p.id];
    var html = (opts.interactive
      ? '<button class="r-line" data-toggle="'+p.id+'" aria-expanded="'+opened+'"><span class="caret">&#9654;</span>'
      : '<div class="r-line"><span class="caret" style="visibility:hidden">&#9654;</span>')
      + '<span class="who">'+esc(p.name)+'</span><span class="val">'+baht(p.rounded)+'</span>'
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
  var rows = [["มาร์ค",112.93],["พูม",112.93],["ไอซ์",205.43],["ชาเน่",153.09],
              ["โม",123.09],["ยูกะ",111.67],["โฟรค์",92.93],["เจ้าสัว",197.93]];
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
