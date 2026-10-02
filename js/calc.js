/* FairDish — การคำนวณยอดรายคน (ไม่แตะ DOM — ทดสอบได้ใน tests/) */
"use strict";

/* =========================================================
   4. การคำนวณ
   ========================================================= */
function compute(){
  var n = state.members.length;
  var known = {};
  state.members.forEach(function(p){ known[p.id] = true; });

  var cleaned = state.menus.map(function(m){
    return { id:m.id, name:m.name, price:m.price, eaters:m.eaters.filter(function(id){ return known[id]; }) };
  });
  var valid = cleaned.filter(function(m){ return m.eaters.length > 0; });
  var orphan = cleaned.length - valid.length;

  var per = {};
  state.members.forEach(function(p){
    per[p.id] = { id:p.id, name:p.name, food:0, items:[], sharedShare:0, charge:0, total:0, rounded:0 };
  });
  valid.forEach(function(m){
    var each = m.price / m.eaters.length;
    m.eaters.forEach(function(pid){
      if (!per[pid]) return;
      per[pid].food += each;
      per[pid].items.push({ name:m.name, amount:each, split:m.eaters.length });
    });
  });

  var foodTotal = valid.reduce(function(a,m){ return a+m.price; },0);
  var sharedTotal = state.shared.reduce(function(a,s){ return a+s.price; },0);
  var sharedEach = n>0 ? sharedTotal/n : 0;
  var rate = state.charges.reduce(function(a,c){ return a+(c.on?c.rate:0); },0)/100;

  var list = state.members.map(function(p){
    var row = per[p.id];
    row.sharedShare = sharedEach;
    var base = row.food + sharedEach;
    row.charge = base*rate;
    row.total = base + row.charge;
    return row;
  });

  var chargeTotal = (foodTotal + sharedTotal) * rate;
  var grand = foodTotal + sharedTotal + chargeTotal;

  var target = Math.round(grand*100);
  var cents = list.map(function(r){ return Math.floor(r.total*100 + 1e-7); });
  var diff = target - cents.reduce(function(a,b){ return a+b; },0);
  var order = list.map(function(r,i){
    return { i:i, frac: r.total*100 - Math.floor(r.total*100 + 1e-7) };
  }).sort(function(a,b){ return b.frac - a.frac; });
  var k=0;
  while (diff>0 && order.length>0){ cents[order[k % order.length].i]+=1; diff-=1; k+=1; }
  k=0;
  while (diff<0 && order.length>0){ cents[order[order.length-1-(k % order.length)].i]-=1; diff+=1; k+=1; }
  list.forEach(function(r,i){ r.rounded = cents[i]/100; });

  return { list:list, foodTotal:foodTotal, sharedTotal:sharedTotal, chargeTotal:chargeTotal,
           grand:Math.round(grand*100)/100, rate:rate, orphan:orphan, n:n };
}
function hasData(){ return state.members.length>0 && (state.menus.length + state.shared.length)>0; }
