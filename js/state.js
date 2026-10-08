/* FairDish — ข้อมูลของบิล สถานะหน้าจอ และค่าคงที่ */
"use strict";

/* =========================================================
   2. ข้อมูลของบิล
   ========================================================= */
var uid = 0;
// v4.13.1: ต่อท้ายส่วนสุ่ม — สองเครื่องในกลุ่มเพิ่มรายการพร้อมกันจะได้รหัสไม่ซ้ำ รวมข้อมูลกันได้ (parseInt ใน applyBill ยังอ่านเลขหน้าได้)
function nid(){ uid += 1; return "i" + uid + "_" + Math.random().toString(36).slice(2, 6); }

function defaultCharges(){
  return [
    { id:"svc", label:"ค่าบริการ", rate:10, on:false, fixed:true },
    { id:"vat", label:"VAT", rate:7, on:false, fixed:true }
  ];
}

var state = {
  members: [],
  menus: [],
  shared: [],
  charges: defaultCharges(),
  payers: [],           // v2.5: [{ id:สมาชิก, amount:บาท | null }] null = จ่ายส่วนที่เหลือ
  kind: "meal",         // v3.0: "meal" มื้ออาหาร | "trip" ทริป (ทริประบุคนจ่ายในแต่ละรายการ: menus[i].payer / payers — payersOf() ใน calc.js)
  name: "",             // v3.2: ชื่อบิลส่วนตัว (บิลกลุ่มใช้ชื่อกลุ่ม)
  paid: {},             // v3.2: การโอนที่ติ๊กแล้ว { transferKey(): true }
  confirms: {},         // v4.1: เพื่อนยืนยันเมนู { memberId: { at, sig } } (ดู confirm.js)
  menuMemory: [],
  menuForm:null, sharedForm:null, chargeForm:null, open:{}
};

var ui = {
  loading:true,
  save:"loading",
  savingMember:false,
  memberError:"",
  editingMember:null,
  editError:"",
  confirmMember:null,
  savingMenu:false,
  menuErr:{},
  suggest:{ open:false, items:[], active:-1, total:0 },
  focusMenuField:null,
  saveFailedIn:null,
  undo:null,
  undoTimer:null,
  confirmReset:false,
  ctx:undefined,        // บิลที่โหลดอยู่: undefined = ยังไม่โหลด, null = บิลส่วนตัว, "<id>" = กลุ่ม
  groupError:"",        // "notfound" | "load" | "disabled"
  myGroups:[],
  creatingGroup:false,
  syncing:false,
  step:"members",       // v2.1: แท็บขั้นตอนที่เปิดอยู่ในหน้าหารบิล
  groupPanel:false,     // v2.1: แผงตัวเลือกกลุ่ม (⋯) เปิดอยู่ไหม
  theme:"system",       // v2.1: "system" | "light" | "dark"
  installNudgeOff:false, // v2.4: ผู้ใช้กดปิดการ์ดชวนติดตั้งแล้ว
  noReveal:false,       // v2.5: วาดหน้าใบสรุปซ้ำโดยไม่เล่นแอนิเมชันใบเสร็จ
  lastPayers:[],        // v3.0: คนจ่ายล่าสุดในโหมดทริป ใช้เป็นค่าตั้งต้นของรายการถัดไป (v4.15: หลายคนได้)
  inappSkipped:false,   // v4.14: ปิดหน้าต่าง "เปิดในเบราว์เซอร์ดีกว่า" แล้ว (สำรองเมื่อ sessionStorage ใช้ไม่ได้)
  meAfterInApp:false,   // v4.14: รอถาม "เข้าร่วมกลุ่มไหม?" หลังปิดหน้าต่างนั้น
  tripStash:null,       // v3.1: กำลังแก้มื้ออาหารข้างในทริป { mealId, menus, shared, charges, payers } ของทริปที่พักไว้
  history:[],           // v3.2: บิลส่วนตัวที่เก็บเข้าประวัติแล้ว (ใหม่สุดก่อน)
  sheet:null,           // v3.2: แผ่นล่างจอที่เปิดอยู่นอกหน้าหารบิล "kind" | "rename"
  showDone:false,       // v3.2: โอนครบทุกคนแล้ว → หน้าใบสรุปแสดงหน้าจอ "จบมื้อแล้ว"
  showOnb:false, onbStep:0, onbNext:null, tour:null, tourNext:null,   // v4.5: tour = การสอนแบบกดจริงที่กำลังทำ (js/tour.js)   // v4.1: หน้าแนะนำ 3 หน้า (ครั้งแรกที่เปิดหน้าหลัก)
  wsFocus:null, wsPast:[], wsDrag:null, wsSuggest:{ open:false, items:[], active:-1 },   // v4.4: จอใหญ่ — คนที่เลือกดู, ประวัติเลิกทำ, ชื่อที่กำลังลาก
  histQ:"", histFilter:"all", histSel:null, sharePick:null,   // v4.4: ประวัติ (ค้นหา/กรอง/ที่เลือก), คนที่ดูตัวอย่างในหน้าชวนเพื่อน
  guestFor:null, guestSel:null, guestDone:false, guestSaving:false,   // v4.1: หน้าที่เพื่อนเห็น #/g/<id>/me
  myName:"", nameAsked:false,   // v4.6: ชื่อที่ให้เราเรียก + เคยถามแล้วหรือยัง (js/profile.js)
  nameFor:null,
  doneShown:{},
  camera:null,                  // v4.12: เครื่องนี้มีกล้องไหม (detectCamera) — ไม่มี = ไม่มีระบบสแกน QR
  groupKeys:{},                 // v4.11: กุญแจเข้ารหัสของกลุ่ม (จากลิงก์ที่เปิด / ตอนสร้าง) — ถาวรอยู่ใน myGroups[].key                 // v4.10: การ์ด "เสร็จแล้ว" ที่ขึ้นในการเปิดหน้าหลักครั้งนี้ (วาดซ้ำแล้วยังอยู่)                 // v4.9: ลิงก์กลุ่มที่รอไปต่อหลังตอบชื่อ
  navLocal:undefined, navOpenKey:null,   // navOpenKey = บิลที่แตะกางไว้ในแถบซ้าย (จอสัมผัส)   // v4.15 บิลในเครื่องที่อ่านไว้ให้แถบซ้าย
  shareBack:null,               // v4.8.1: หน้าที่กดเข้าหน้าชวนเพื่อนมา "/split" | "/bill"
  shareAfterLoad:false  // v3.2: เพิ่งสร้างกลุ่มจากบิลส่วนตัว → เปิดหน้าต่างชวนเพื่อนเมื่อโหลดกลุ่มเสร็จ
};

var MAX_NAME = 24;
var MAX_MENU_NAME = 40;
var MAX_PRICE = 100000;
function normText(x){ return String(x||"").toLowerCase().replace(/\s+/g,""); }
var APP_VERSION = "4.17.5";
var MENU_MEMORY_LIMIT = 60;

/* ---- v3.0: คำที่ต่างกันตามประเภทบิล — ใช้ kt("key") แทนการเขียนคำตรง ๆ ---- */
var KIND_TEXT = {
  meal: {
    icon:"🍲", name:"มื้ออาหาร", start:"หารค่าอาหาร", startSub:"เลือกได้ว่าใครกินเมนูไหน คิดตามที่กินจริง",
    people:"ใครกินบ้าง", items:"เมนู", itemsTitle:"รายการอาหาร", who:"ใครกินเมนูนี้บ้าง", whoHint:"แตะชื่อคนที่กิน",
    add:"+ เพิ่มเมนู", newItem:"เพิ่มเมนูใหม่", editItem:"แก้ไขเมนู", addBtn:"เพิ่มเมนู",
    namePh:"ชื่อเมนู เช่น ต้มยำ", nameLabel:"ชื่อเมนู", pricePh:"ราคาต่อจาน (บาท)",
    another:"เพิ่มอีกจาน", del:"ลบเมนูนี้", next:"ต่อไป: ใส่เมนูที่สั่ง ›",
    empty:"ยังไม่มีเมนู เพิ่มจานแรกแล้วเลือกว่าใครกิน", noName:"ยังไม่ได้ใส่ชื่อเมนู", noEater:"เลือกคนที่กินเมนูนี้อย่างน้อย 1 คน",
    orphan:"เมนูที่ยังไม่ได้เลือกคนกิน", noItems:"ไม่ได้สั่งเมนูส่วนตัว", suggest:"เมนูแนะนำ", suggestOften:"เมนูที่คุณสั่งบ่อย",
    done:"จบมื้อแล้ว!", head:"มื้อนี้", fromWhat:"เมนูไหน", sumLabel:"ค่าอาหาร",
    addShort:"+ เพิ่มเมนู", thanks:"มื้อนี้อร่อยมาก ขอบคุณทุกคนที่มากินด้วยกันนะ", groupPrefix:"มื้อ",
    title:"หารบิล", summary:"สรุปยอด", kindSub:"หารตามเมนูที่แต่ละคนกินจริง มีค่าบริการและ VAT",
    noPeople:"ยังไม่มีใครในโต๊ะ ใส่ชื่อคนแรกได้เลย", emptySummary:"ใส่ชื่อคนกินและรายการอาหารก่อน แล้วบิลจะขึ้นตรงนี้"
  },
  trip: {
    icon:"✈️", name:"ทริป", start:"หารค่าทริป", startSub:"ที่พัก ค่าน้ำมัน ตั๋ว ใครจ่ายอะไรก็ใส่ไว้ แล้วดูว่าใครโอนให้ใคร",
    people:"ใครไปบ้าง", items:"ค่าใช้จ่าย", itemsTitle:"ค่าใช้จ่าย", who:"ใครมีส่วนในรายการนี้", whoHint:"แตะชื่อคนที่มีส่วน",
    add:"+ เพิ่มค่าใช้จ่าย", newItem:"เพิ่มค่าใช้จ่าย", editItem:"แก้ไขค่าใช้จ่าย", addBtn:"เพิ่ม",
    namePh:"เช่น ที่พัก ค่าน้ำมัน", nameLabel:"ชื่อรายการ", pricePh:"ยอด (บาท)",
    another:"ทำซ้ำรายการนี้", del:"ลบรายการนี้", next:"ต่อไป: ใส่ค่าใช้จ่าย ›",
    empty:"ยังไม่มีค่าใช้จ่าย เพิ่มรายการแรก แล้วเลือกว่าใครจ่าย ใครมีส่วน", noName:"ยังไม่ได้ใส่ชื่อรายการ", noEater:"เลือกคนที่มีส่วนในรายการนี้อย่างน้อย 1 คน",
    orphan:"รายการที่ยังไม่ได้เลือกคนมีส่วน", noItems:"ไม่มีส่วนในรายการไหน", suggest:"รายการแนะนำ", suggestOften:"ค่าใช้จ่ายที่พบบ่อยในทริป",
    done:"จบทริปแล้ว!", head:"ทริปนี้", fromWhat:"รายการไหน", sumLabel:"ค่าใช้จ่าย",
    addShort:"+ ค่าใช้จ่าย", thanks:"ทริปนี้สนุกมาก ขอบคุณทุกคนที่ไปด้วยกันนะ", groupPrefix:"ทริป",
    title:"หารทริป", summary:"สรุปทริป", kindSub:"แต่ละรายการมีคนจ่ายของตัวเอง ใส่มื้ออาหารข้างในได้ สรุปโอนครั้งเดียว",
    noPeople:"ยังไม่มีใครในทริป ใส่ชื่อคนแรกได้เลย", emptySummary:"ใส่ชื่อคนและค่าใช้จ่ายก่อน แล้วสรุปจะขึ้นตรงนี้"
  }
};
function kt(key){ return L((KIND_TEXT[state.kind] || KIND_TEXT.meal)[key]); }
function ktOf(kind, key){ return L((KIND_TEXT[kind] || KIND_TEXT.meal)[key]); }
var HISTORY_LIMIT = 50;
/** ชื่อบิลตั้งต้น เช่น "มื้อ 4 ต.ค." — ตอนบิลมาถึงโต๊ะไม่มีใครอยากคิดชื่อ */
function defaultBillName(kind, date){
  return ktOf(kind || "meal", "groupPrefix") + " " + shortDate(date || new Date());
}

/* ---- งาน 3.1: บิลตัวอย่างแหล่งเดียว ----
   ปุ่ม "ดูบิลตัวอย่าง 8 คน" (loadDemo) ใส่บิลนี้ลงบิลในเครื่อง และภาพตัวอย่างในหน้าแรก / หน้าแนะนำ / หน้าวิธีใช้
   คำนวณยอดจากบิลนี้ด้วย computeBill() (demoSummary() ใน receipt.js) — แก้ตรงนี้ที่เดียว ทุกภาพเปลี่ยนตาม
   มื้ออีสานร้านหน้ามอ 8 คน แต่ละคนกินไม่เท่ากันแบบที่เกิดจริง (ไม่มีค่าบริการ/VAT) */
function demoMealData(){
  var names = ["มาร์ค","พูม","ไอซ์","ชาเน่","โม","ยูกะ","โฟรค์","เจ้าสัว"];
  var members = names.map(function(n){ return { id:nid(), name:L(n) }; });
  function ids(list){ return list.map(function(n){ return members[names.indexOf(n)].id; }); }
  var menus = [
    ["ตำไทย", 50, ["ชาเน่","ยูกะ","โฟรค์"]],
    ["ตำปูปลาร้า", 50, ["มาร์ค","พูม","เจ้าสัว"]],
    ["ตำซั่ว", 60, ["ไอซ์","มาร์ค"]],
    ["ไก่ย่างเขาสวนกวาง", 180, names],
    ["คอหมูย่าง", 120, ["มาร์ค","ไอซ์","เจ้าสัว"]],
    ["ลาบหมู", 80, ["มาร์ค","พูม","ไอซ์","โม"]],
    ["ต้มแซ่บกระดูกอ่อน", 120, ["ไอซ์","เจ้าสัว","โม"]],
    ["ไส้กรอกอีสาน", 60, ["ชาเน่","โม"]],
    ["ไข่เจียวหมูสับ", 60, ["ยูกะ"]],
    ["ซอยจุ๊", 150, ["ไอซ์","เจ้าสัว"]]
  ].map(function(m){ return { id:nid(), name:L(m[0]), price:m[1], eaters:ids(m[2]) }; });
  var shared = [["ข้าวเหนียว 4 กระติ๊บ", 60], ["น้ำแข็ง", 20], ["โค้กขวดใหญ่ 2 ขวด", 70], ["น้ำเปล่าขวดใหญ่ 2 ขวด", 30]]
    .map(function(s){ return { id:nid(), name:L(s[0]), price:s[1] }; });
  var charges = defaultCharges();
  charges.forEach(function(c){ c.on = false; });   // ร้านอีสานทั่วไปไม่คิดค่าบริการ / VAT
  return { kind:"meal", name:L("ร้านส้มตำหน้ามอ"), members:members, menus:menus, shared:shared, charges:charges, payers:[], paid:{} };
}

/* ---- งาน 3.4: ตรวจฟอร์มค่าส่วนกลาง / ค่าใช้จ่ายแบบเปอร์เซ็นต์ (ไม่แตะ DOM — tests/validate.test.js) ----
   คืน { ช่อง: "ข้อความบอกวิธีแก้" } เฉพาะช่องที่ผิด · ว่าง = ผ่าน */
function priceError(raw){
  var text = String(raw === undefined || raw === null ? "" : raw).trim(), n = parseFloat(text);
  if (text === "") return L("ยังไม่ได้ใส่ราคา");
  if (isNaN(n) || !/^-?\d*\.?\d+$/.test(text)) return L("ราคาต้องเป็นตัวเลข เช่น 60 หรือ 60.50");
  if (n < 0) return L("ราคาต้องไม่ติดลบ");
  if (n > MAX_PRICE) return L("ราคาสูงเกินจริง ลองตรวจจำนวนศูนย์อีกครั้ง");
  return "";
}
function validateSharedForm(name, priceRaw){
  var errs = {}, n = String(name || "").trim();
  if (!n) errs.name = L("ใส่ชื่อรายการก่อน");
  else if (n.length > MAX_MENU_NAME) errs.name = L("ชื่อเมนูยาวเกิน {n} ตัวอักษร", { n:MAX_MENU_NAME });
  var p = priceError(priceRaw); if (p) errs.price = p;
  return errs;
}
function validateChargeForm(label, rateRaw){
  var errs = {}, n = String(label || "").trim(), text = String(rateRaw === undefined || rateRaw === null ? "" : rateRaw).trim(), r = parseFloat(text);
  if (!n) errs.label = L("ใส่ชื่อค่าใช้จ่ายก่อน");
  else if (n.length > MAX_MENU_NAME) errs.label = L("ชื่อเมนูยาวเกิน {n} ตัวอักษร", { n:MAX_MENU_NAME });
  if (text === "" || isNaN(r) || !/^-?\d*\.?\d+$/.test(text)) errs.rate = L("ใส่เปอร์เซ็นต์เป็นตัวเลข");
  else if (r < 0 || r > 100) errs.rate = L("เปอร์เซ็นต์ต้องอยู่ระหว่าง 0 ถึง 100");
  return errs;
}
