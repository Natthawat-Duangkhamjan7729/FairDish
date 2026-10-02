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
  var rows = [["มาร์ค",106.75],["กิติภูมิ",117.46],["พูบ",73.41],["ชาเน่",37.41],
              ["โบ",37.41],["ยูกะ",37.41],["โอชิ",73.41],["เจ้าสั่ว",136.74]];
  var lines = rows.map(function(p){
    return '<div class="r-line"><span class="caret" style="visibility:hidden">&#9654;</span>'+
      '<span class="who">'+p[0]+'</span><span class="val">'+baht(p[1])+'</span></div>';
  }).join("");
  return '<div class="receipt-wrap reveal"><div class="receipt">'+
    '<div class="r-title">ใบสรุปยอด</div>'+
    '<div class="r-meta">8 คน · 5 เมนู · ร้านอาหารอีสาน</div>'+lines+
    '<div class="r-sum"><div><span>ค่าอาหาร</span><span>475.00</span></div>'+
    '<div><span>ค่าส่วนกลาง</span><span>145.00</span></div></div>'+
    '<div class="r-total"><span>รวมทั้งหมด</span><span>620.00 ฿</span></div>'+
    barcode(620)+'</div><div class="receipt-edge"></div></div>';
}
