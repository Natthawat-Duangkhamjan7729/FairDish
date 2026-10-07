/* FairDish — การคำนวณยอดรายคน (ไม่แตะ DOM — ทดสอบได้ใน tests/) */
"use strict";

/* =========================================================
   4. การคำนวณ
   ========================================================= */
function compute(){ return computeBill(state); }

/** v3.1: คำนวณบิลใดก็ได้ { members, menus, shared, charges, kind } — ทริปเรียกซ้ำกับมื้ออาหารข้างใน (menus[i].type === "meal") */
function mealOf(m){
  var meal = m.meal || {};
  return { menus:meal.menus || [], shared:meal.shared || [], charges:meal.charges || [] };
}
function computeBill(b){
  var n = b.members.length;
  var known = {};
  b.members.forEach(function(p){ known[p.id] = true; });

  var per = {};
  b.members.forEach(function(p){
    per[p.id] = { id:p.id, name:p.name, food:0, items:[], sharedShare:0, charge:0, total:0, rounded:0 };
  });

  // มื้ออาหารในทริป: คิดแยกด้วยวิธีของมื้ออาหาร แล้วบวกยอดรายคน (ปัดเป็นสตางค์แล้ว) เข้ายอดของทริป
  var mealTotal = 0, mealOrphan = 0;
  b.menus.forEach(function(m){
    if (m.type !== "meal") return;
    var md = mealOf(m);
    var sub = computeBill({ members:b.members, menus:md.menus, shared:md.shared, charges:md.charges, kind:"meal" });
    mealOrphan += sub.orphan;
    if (!(sub.grand > 0)) return;
    mealTotal += sub.grand;
    sub.list.forEach(function(p){
      if (!per[p.id] || !p.rounded) return;
      per[p.id].food += p.rounded;
      per[p.id].items.push({ name:m.name, amount:p.rounded, split:null, meal:true });
    });
  });

  var cleaned = b.menus.filter(function(m){ return m.type !== "meal"; }).map(function(m){
    return { id:m.id, name:m.name, price:m.price, eaters:m.eaters.filter(function(id){ return known[id]; }) };
  });
  var valid = cleaned.filter(function(m){ return m.eaters.length > 0; });
  var orphan = cleaned.length - valid.length + mealOrphan;

  valid.forEach(function(m){
    var each = m.price / m.eaters.length;
    m.eaters.forEach(function(pid){
      if (!per[pid]) return;
      per[pid].food += each;
      per[pid].items.push({ name:m.name, amount:each, split:m.eaters.length });
    });
  });

  var foodTotal = valid.reduce(function(a,m){ return a+m.price; },0) + mealTotal;
  var sharedTotal = b.shared.reduce(function(a,s){ return a+s.price; },0);
  var sharedEach = n>0 ? sharedTotal/n : 0;
  // v3.0: ทริปไม่มีค่าบริการ/VAT แม้ข้อมูลเดิมจะเปิดไว้
  var rate = b.kind === "trip" ? 0 : b.charges.reduce(function(a,c){ return a+(c.on?c.rate:0); },0)/100;

  var list = b.members.map(function(p){
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

/* =========================================================
   4.5 ใครโอนให้ใคร (v2.5)
   ========================================================= */
/**
 * r = ผลจาก compute(), payers = [{ id, amount }] — amount = null แปลว่า "จ่ายส่วนที่เหลือ" (มีได้คนเดียว)
 * คืน { ok, reason, diff, transfers:[{ from, fromName, to, toName, amount }], paid:{ id: บาท } }
 * reason: "none" ยังไม่ระบุคนจ่าย | "missing" เว้นยอดไว้เกินหนึ่งคน | "short" ยอดที่จ่ายยังไม่ครบ | "over" จ่ายเกินยอดบิล
 * คิดเป็นสตางค์ (จำนวนเต็ม) ทั้งหมด ยอดที่โอนรวมกันจึงลงตัวพอดี และจับคู่คนติดมากสุดกับคนรอรับมากสุดเพื่อให้โอนน้อยครั้ง
 */
function settle(r, payers){
  var names = {};
  r.list.forEach(function(p){ names[p.id] = p.name; });
  var ps = (payers || []).filter(function(p){ return names[p.id] !== undefined; });
  var none = { ok:false, reason:"none", diff:0, transfers:[], paid:{} };
  if (!ps.length) return none;

  var target = Math.round(r.grand * 100);
  var open = ps.filter(function(p){ return p.amount == null; });
  if (open.length > 1) return { ok:false, reason:"missing", diff:0, transfers:[], paid:{} };
  var fixed = ps.reduce(function(a,p){ return a + (p.amount == null ? 0 : Math.round(p.amount * 100)); }, 0);
  var rest = target - fixed;
  if (open.length === 0 && rest !== 0) return { ok:false, reason: rest > 0 ? "short" : "over", diff:Math.abs(rest)/100, transfers:[], paid:{} };
  if (open.length === 1 && rest < 0) return { ok:false, reason:"over", diff:-rest/100, transfers:[], paid:{} };

  var paid = {};
  ps.forEach(function(p){
    var c = p.amount == null ? rest : Math.round(p.amount * 100);
    paid[p.id] = (paid[p.id] || 0) + c;
  });
  var bal = r.list.map(function(p){ return { id:p.id, name:p.name, c:(paid[p.id] || 0) - Math.round(p.rounded * 100) }; });
  var debt = bal.filter(function(b){ return b.c < 0; }).sort(function(a,b){ return a.c - b.c; });
  var cred = bal.filter(function(b){ return b.c > 0; }).sort(function(a,b){ return b.c - a.c; });
  var transfers = [];
  var i = 0, j = 0;
  while (i < debt.length && j < cred.length){
    var amt = Math.min(-debt[i].c, cred[j].c);
    if (amt > 0) transfers.push({ from:debt[i].id, fromName:debt[i].name, to:cred[j].id, toName:cred[j].name, amount:amt/100 });
    debt[i].c += amt; cred[j].c -= amt;
    if (debt[i].c === 0) i++;
    if (cred[j].c === 0) j++;
  }
  var paidBaht = {};
  Object.keys(paid).forEach(function(id){ paidBaht[id] = paid[id] / 100; });
  return { ok:true, reason:"", diff:0, transfers:transfers, paid:paidBaht };
}

/* =========================================================
   4.6 โหมดทริป: คนจ่ายแยกรายการ (v3.0)
   ========================================================= */
/** รวมยอดที่แต่ละคนจ่ายจาก payer ของแต่ละรายการ → { payers:[{id, amount}], missing:จำนวนรายการที่ยังไม่ระบุคนจ่าย }
 *  นับเฉพาะรายการที่ถูกคิดในบิล (มีคนมีส่วนอย่างน้อย 1 คน) ค่าส่วนกลางไม่มีคนจ่ายจึงนับเป็น missing */
function itemPayers(b){
  b = b || state;
  var known = {};
  b.members.forEach(function(p){ known[p.id] = true; });
  var paid = {}, missing = 0;
  b.menus.forEach(function(m){
    if (m.type === "meal"){
      var md = mealOf(m);
      var cents = Math.round(computeBill({ members:b.members, menus:md.menus, shared:md.shared, charges:md.charges, kind:"meal" }).grand * 100);
      if (!cents) return;                                   // มื้อว่าง ไม่ต้องมีคนจ่าย
      if (m.payer && known[m.payer]) paid[m.payer] = (paid[m.payer] || 0) + cents;
      else missing++;
      return;
    }
    if (!m.eaters.some(function(id){ return known[id]; })) return;
    if (m.payer && known[m.payer]) paid[m.payer] = (paid[m.payer] || 0) + Math.round(m.price * 100);
    else missing++;
  });
  missing += b.shared.length;
  return { payers: Object.keys(paid).map(function(id){ return { id:id, amount:paid[id] / 100 }; }), missing: missing };
}
/** ใครโอนให้ใคร — มื้ออาหารใช้คนจ่ายระดับบิล ทริปใช้คนจ่ายของแต่ละรายการ
 *  b = บิลที่จะคิด (ไม่ใส่ = บิลที่เปิดอยู่) */
function settleBill(r, b){
  b = b || state;
  if (b.kind !== "trip") return settle(r, b.payers);
  var ip = itemPayers(b);
  if (ip.missing) return { ok:false, reason:"unpaid", diff:0, count:ip.missing, transfers:[], paid:{} };
  return settle(r, ip.payers);
}

/* =========================================================
   4.7 ติ๊กว่าโอนแล้ว (v3.2)
   ========================================================= */
/** คีย์ของการโอนหนึ่งรายการ — รวมยอดเป็นสตางค์ไว้ด้วย ยอดเปลี่ยนแล้วติ๊กเดิมจะไม่นับให้เอง */
function transferKey(t){ return t.from + ">" + t.to + ":" + Math.round(t.amount * 100); }
/** { done:จำนวนที่ติ๊กแล้ว, total, all:ติ๊กครบทุกรายการ } */
function paidProgress(transfers, paid){
  var done = transfers.filter(function(t){ return !!(paid && paid[transferKey(t)]); }).length;
  return { done:done, total:transfers.length, all:transfers.length > 0 && done === transfers.length };
}
