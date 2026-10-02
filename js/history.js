/* FairDish — สมุดบิล: บันทึกทุกบิลอัตโนมัติ เปิดแก้ย้อนหลังได้ */
"use strict";

/* =========================================================
   8.5 ประวัติบิล
   บิลที่เปิดอยู่คือ state ตามเดิม ส่วน billBook เก็บทุกบิล
   ทุกครั้งที่ commit() ระบบคัดลอก state ลงบิลปัจจุบันแล้วบันทึกทั้งสมุด
   ========================================================= */
var billBook = { currentId:null, list:[] };
var BILL_LIMIT = 200;

function clone(x){ return JSON.parse(JSON.stringify(x)); }
function defaultCharges(){
  return [
    { id:"svc", label:"ค่าบริการ", rate:10, on:false, fixed:true },
    { id:"vat", label:"VAT", rate:7, on:false, fixed:true }
  ];
}
function newBillRecord(members){
  var now = new Date().toISOString();
  return { id:"b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
           name:"", createdAt:now, updatedAt:now,
           members:members||[], menus:[], shared:[], charges:defaultCharges() };
}
function billHasData(b){ return b.members.length>0 && (b.menus.length + b.shared.length)>0; }
function currentBill(){
  for (var i=0;i<billBook.list.length;i++) if (billBook.list[i].id===billBook.currentId) return billBook.list[i];
  return null;
}
function billDate(iso){
  var d = new Date(iso);
  return d.toLocaleDateString("th-TH",{ day:"numeric", month:"short", year:"2-digit" })+" "+
         d.toLocaleTimeString("th-TH",{ hour:"2-digit", minute:"2-digit" });
}
function billTitle(b){ return b.name || "บิล "+billDate(b.createdAt); }

/* โหลดสมุดบิล — ถ้ายังไม่มี ให้ย้ายบิลเดิม (key v1) มาเป็นใบแรก */
async function loadBillBook(){
  var book = await Store.loadBills();
  if (!book){
    book = { currentId:null, list:[] };
    var legacy = await Store.load();
    if (legacy && legacy.members){
      var b = newBillRecord();
      b.members = legacy.members || [];
      b.menus = legacy.menus || [];
      b.shared = legacy.shared || [];
      if (legacy.charges && legacy.charges.length) b.charges = legacy.charges;
      if (legacy.savedAt){ b.createdAt = legacy.savedAt; b.updatedAt = legacy.savedAt; }
      book.list.push(b);
      book.currentId = b.id;
    }
  }
  billBook = book;
  if (!currentBill()){
    var fresh = newBillRecord();
    billBook.list.unshift(fresh);
    billBook.currentId = fresh.id;
  }
  applyBill(currentBill());
}

/* ใส่บิลลง state (หน้าจอหารบิล) */
function applyBill(b){
  state.members = clone(b.members || []);
  state.menus = (b.menus || []).map(function(m){
    return { id:m.id, name:m.name, price:Number(m.price)||0, eaters:(m.eaters||[]).slice() };
  });
  state.shared = clone(b.shared || []);
  state.charges = b.charges && b.charges.length ? clone(b.charges) : defaultCharges();
  state.menuForm=null; state.sharedForm=null; state.chargeForm=null; state.open={};
  ui.confirmMember=null; ui.editingMember=null; ui.memberError=""; ui.undo=null; ui.confirmReset=false;
  var maxId = 0;
  state.members.concat(state.menus, state.shared).forEach(function(x){
    var num = parseInt(String(x.id).replace(/^i/,""),10);
    if (!isNaN(num) && num > maxId) maxId = num;
  });
  uid = maxId;
}

/* คัดลอก state ลงบิลปัจจุบัน แล้วบันทึกทั้งสมุด (เรียกจาก commit) */
async function saveBillBook(){
  var b = currentBill();
  if (!b){ b = newBillRecord(); billBook.list.unshift(b); billBook.currentId = b.id; }
  var before = JSON.stringify([b.members,b.menus,b.shared,b.charges]);
  b.members = clone(state.members); b.menus = clone(state.menus);
  b.shared = clone(state.shared); b.charges = clone(state.charges);
  if (JSON.stringify([b.members,b.menus,b.shared,b.charges]) !== before) b.updatedAt = new Date().toISOString();
  // เก็บเฉพาะบิลที่มีข้อมูล (บิลที่เปิดอยู่เก็บไว้เสมอ) และไม่เกิน BILL_LIMIT ใบ
  billBook.list = billBook.list.filter(function(x){ return x.id===billBook.currentId || billHasData(x); });
  if (billBook.list.length > BILL_LIMIT){
    billBook.list.sort(function(x,y){ return x.updatedAt < y.updatedAt ? 1 : -1; });
    billBook.list = billBook.list.slice(0, BILL_LIMIT);
  }
  await Store.saveBills(billBook);
}

async function startNewBill(keepMembers){
  await saveBillBook();
  var members = keepMembers ? clone(state.members) : [];
  var b = newBillRecord(members);
  billBook.list.unshift(b);
  billBook.currentId = b.id;
  applyBill(b);
  if (currentPath()!=="/split") location.hash = "#/split";
  else { document.getElementById("view").innerHTML = pageSplit(); render(); }
  await commit(keepMembers ? "เริ่มบิลใหม่ ใช้เพื่อนชุดเดิม" : "เริ่มบิลใหม่แล้ว บิลเดิมอยู่ในประวัติ");
}

async function openBill(id){
  await saveBillBook();
  billBook.currentId = id;
  var b = currentBill();
  if (!b) return;
  applyBill(b);
  await Store.saveBills(billBook);
  location.hash = "#/split";
  toast("เปิด "+billTitle(b)+" แล้ว แก้ไขได้เลย","ok");
}

async function deleteBill(id){
  var index = -1;
  for (var i=0;i<billBook.list.length;i++) if (billBook.list[i].id===id) index = i;
  if (index<0) return;
  var removed = billBook.list.splice(index,1)[0];
  var wasCurrent = billBook.currentId===id;
  if (wasCurrent){
    var b = newBillRecord();
    billBook.list.unshift(b);
    billBook.currentId = b.id;
    applyBill(b);
  }
  await Store.saveBills(billBook);
  await commit();
  document.getElementById("view").innerHTML = pageHistory();
  toast("ลบ "+billTitle(removed)+" แล้ว","ok",{ label:"เลิกทำ", action:async function(){
    billBook.list.splice(Math.min(index,billBook.list.length),0,removed);
    if (wasCurrent){
      billBook.list = billBook.list.filter(function(x){ return x.id!==billBook.currentId; });
      billBook.currentId = removed.id;
      applyBill(removed);
    }
    await Store.saveBills(billBook);
    await commit("กู้คืนบิลแล้ว");
    if (currentPath()==="/history") document.getElementById("view").innerHTML = pageHistory();
  }});
}

async function renameBill(name){
  var b = currentBill();
  if (!b) return;
  b.name = String(name||"").trim().slice(0,40);
  await commit();
}

function pageHistory(){
  var head = '<div class="page"><div class="wrap app-col">'+
    '<div class="page-head" style="max-width:none">'+
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);flex-wrap:wrap">'+
        '<h1>ประวัติบิล</h1>'+
        '<button class="btn-quiet" id="historyNewBill" style="font-size:var(--fs-small);min-height:var(--tap);padding:var(--s2) var(--s4)">+ เริ่มบิลใหม่</button>'+
      '</div>'+
      '<p>ทุกบิลบันทึกให้อัตโนมัติในเครื่องนี้ กดเพื่อเปิดแก้ไขย้อนหลังได้</p>'+
    '</div>';
  if (ui.loading) return head + '<div class="empty">กำลังโหลดประวัติ…</div></div></div>';
  var bills = billBook.list.filter(function(b){ return billHasData(b) || b.id===billBook.currentId && billHasData(state); });
  bills.sort(function(x,y){ return x.updatedAt < y.updatedAt ? 1 : -1; });
  if (!bills.length){
    return head + '<div class="empty">ยังไม่มีบิลที่บันทึกไว้ ลองหารบิลแรกดูก่อน<br><br>'+
      '<a class="btn btn-main" href="#/split">ไปหน้าหารบิล</a></div></div></div>';
  }
  var rows = bills.map(function(b){
    var isCur = b.id===billBook.currentId;
    var r = compute(isCur ? state : b);
    var edited = b.updatedAt && b.createdAt && b.updatedAt.slice(0,16)!==b.createdAt.slice(0,16);
    return '<li class="bill-row'+(isCur?' current':'')+'">'+
      '<button class="bill-open" data-open-bill="'+esc(b.id)+'">'+
        '<span class="bill-main"><b>'+esc(billTitle(b))+'</b>'+
        (isCur ? ' <span class="bill-tag">เปิดอยู่</span>' : '')+
        '<span class="bill-meta">'+r.n+' คน · '+(b.menus.length+b.shared.length)+' รายการ · '+
          (edited ? 'แก้ไขล่าสุด '+billDate(b.updatedAt) : billDate(b.createdAt))+'</span></span>'+
        '<span class="bill-total mono">'+baht(r.grand)+' ฿</span>'+
      '</button>'+
      '<button class="bill-del" data-del-bill="'+esc(b.id)+'" aria-label="ลบ '+esc(billTitle(b))+'">'+ICON_DEL+'</button>'+
    '</li>';
  }).join("");
  return head + '<ul class="bill-list">'+rows+'</ul>'+
    '<p class="muted" style="font-size:var(--fs-small);margin-top:var(--s5)">ประวัติเก็บอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น '+
    'ถ้าใช้ผ่าน Safari แนะนำให้เพิ่มลงหน้าจอโฮม เพื่อไม่ให้ iOS ล้างข้อมูลเมื่อไม่ได้เปิดนาน</p>'+
    '</div></div>';
}

document.addEventListener("click", function(e){
  var t = e.target.closest ? e.target.closest("[data-open-bill],[data-del-bill],#historyNewBill") : null;
  if (!t) return;
  var v;
  if (t.id==="historyNewBill"){ ui.confirmReset = true; location.hash = "#/split"; return; }
  if ((v = t.getAttribute("data-open-bill"))) return openBill(v);
  if ((v = t.getAttribute("data-del-bill"))) return deleteBill(v);
});
document.addEventListener("change", function(e){
  if (e.target && e.target.id==="billName") renameBill(e.target.value);
});
