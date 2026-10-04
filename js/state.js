/* FairDish — ข้อมูลของบิล สถานะหน้าจอ และค่าคงที่ */
"use strict";

/* =========================================================
   2. ข้อมูลของบิล
   ========================================================= */
var uid = 0;
function nid(){ uid += 1; return "i" + uid; }

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
  kind: "meal",         // v3.0: "meal" มื้ออาหาร | "trip" ทริป (ทริประบุคนจ่ายในแต่ละรายการ: menus[i].payer)
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
  lastPayer:null,       // v3.0: คนจ่ายล่าสุดในโหมดทริป ใช้เป็นค่าตั้งต้นของรายการถัดไป
  tripStash:null,       // v3.1: กำลังแก้มื้ออาหารข้างในทริป { mealId, menus, shared, charges, payers } ของทริปที่พักไว้
  history:[],           // v3.2: บิลส่วนตัวที่เก็บเข้าประวัติแล้ว (ใหม่สุดก่อน)
  sheet:null,           // v3.2: แผ่นล่างจอที่เปิดอยู่นอกหน้าหารบิล "kind" | "rename"
  showDone:false,       // v3.2: โอนครบทุกคนแล้ว → หน้าใบสรุปแสดงหน้าจอ "จบมื้อแล้ว"
  showOnb:false, onbStep:0,   // v4.1: หน้าแนะนำ 3 หน้า (ครั้งแรกที่เปิดหน้าหลัก)
  guestFor:null, guestSel:null, guestDone:false, guestSaving:false,   // v4.1: หน้าที่เพื่อนเห็น #/g/<id>/me
  shareAfterLoad:false  // v3.2: เพิ่งสร้างกลุ่มจากบิลส่วนตัว → เปิดหน้าต่างชวนเพื่อนเมื่อโหลดกลุ่มเสร็จ
};

var MAX_NAME = 24;
var MAX_MENU_NAME = 40;
var MAX_PRICE = 100000;
function normText(x){ return String(x||"").toLowerCase().replace(/\s+/g,""); }
var APP_VERSION = "4.1";
var MENU_MEMORY_LIMIT = 60;

/* ---- v3.0: คำที่ต่างกันตามประเภทบิล — ใช้ kt("key") แทนการเขียนคำตรง ๆ ---- */
var KIND_TEXT = {
  meal: {
    icon:"🍲", name:"มื้ออาหาร", start:"หารค่าอาหาร", startSub:"เลือกได้ว่าใครกินเมนูไหน คิดตามที่กินจริง",
    people:"ใครกินบ้าง", items:"เมนู", itemsTitle:"รายการอาหาร", who:"ใครกินเมนูนี้บ้าง", whoHint:"แตะชื่อคนที่ไม่ได้กินออก",
    add:"+ เพิ่มเมนู", newItem:"เพิ่มเมนูใหม่", editItem:"แก้ไขเมนู", addBtn:"เพิ่มเมนู",
    namePh:"ชื่อเมนู เช่น ต้มยำ", nameLabel:"ชื่อเมนู", pricePh:"ราคาต่อจาน (บาท)",
    another:"เพิ่มอีกจาน", del:"ลบเมนูนี้", next:"ต่อไป: ใส่เมนูที่สั่ง ›",
    empty:"ยังไม่มีเมนู — เพิ่มจานแรกแล้วเลือกว่าใครกิน", noName:"ยังไม่ได้ใส่ชื่อเมนู", noEater:"เลือกคนที่กินเมนูนี้อย่างน้อย 1 คน",
    orphan:"เมนูที่ยังไม่ได้เลือกคนกิน", noItems:"ไม่ได้สั่งเมนูส่วนตัว", suggest:"เมนูแนะนำ", suggestOften:"เมนูที่คุณสั่งบ่อย",
    done:"จบมื้อแล้ว!", head:"มื้อนี้", fromWhat:"เมนูไหน", sumLabel:"ค่าอาหาร",
    addShort:"+ เพิ่มเมนู", thanks:"มื้อนี้อร่อยมาก ขอบคุณทุกคนที่มากินด้วยกันนะ", groupPrefix:"มื้อ",
    title:"หารบิล", summary:"สรุปยอด", kindSub:"หารตามเมนูที่แต่ละคนกินจริง มีค่าบริการและ VAT",
    noPeople:"ยังไม่มีใครในโต๊ะ — ใส่ชื่อคนแรกได้เลย", emptySummary:"ใส่ชื่อคนกินและรายการอาหารก่อน แล้วบิลจะขึ้นตรงนี้"
  },
  trip: {
    icon:"✈️", name:"ทริป", start:"หารค่าทริป", startSub:"ที่พัก ค่าน้ำมัน ตั๋ว ใครจ่ายอะไรก็ใส่ไว้ แล้วดูว่าใครโอนให้ใคร",
    people:"ใครไปบ้าง", items:"ค่าใช้จ่าย", itemsTitle:"ค่าใช้จ่าย", who:"ใครมีส่วนในรายการนี้", whoHint:"แตะชื่อคนที่ไม่มีส่วนออก",
    add:"+ เพิ่มค่าใช้จ่าย", newItem:"เพิ่มค่าใช้จ่าย", editItem:"แก้ไขค่าใช้จ่าย", addBtn:"เพิ่ม",
    namePh:"เช่น ที่พัก ค่าน้ำมัน", nameLabel:"ชื่อรายการ", pricePh:"ยอด (บาท)",
    another:"ทำซ้ำรายการนี้", del:"ลบรายการนี้", next:"ต่อไป: ใส่ค่าใช้จ่าย ›",
    empty:"ยังไม่มีค่าใช้จ่าย — เพิ่มรายการแรก แล้วเลือกว่าใครจ่าย ใครมีส่วน", noName:"ยังไม่ได้ใส่ชื่อรายการ", noEater:"เลือกคนที่มีส่วนในรายการนี้อย่างน้อย 1 คน",
    orphan:"รายการที่ยังไม่ได้เลือกคนมีส่วน", noItems:"ไม่มีส่วนในรายการไหน", suggest:"รายการแนะนำ", suggestOften:"ค่าใช้จ่ายที่พบบ่อยในทริป",
    done:"จบทริปแล้ว!", head:"ทริปนี้", fromWhat:"รายการไหน", sumLabel:"ค่าใช้จ่าย",
    addShort:"+ ค่าใช้จ่าย", thanks:"ทริปนี้สนุกมาก ขอบคุณทุกคนที่ไปด้วยกันนะ", groupPrefix:"ทริป",
    title:"หารทริป", summary:"สรุปทริป", kindSub:"แต่ละรายการมีคนจ่ายของตัวเอง ใส่มื้ออาหารข้างในได้ สรุปโอนครั้งเดียว",
    noPeople:"ยังไม่มีใครในทริป — ใส่ชื่อคนแรกได้เลย", emptySummary:"ใส่ชื่อคนและค่าใช้จ่ายก่อน แล้วสรุปจะขึ้นตรงนี้"
  }
};
function kt(key){ return L((KIND_TEXT[state.kind] || KIND_TEXT.meal)[key]); }
function ktOf(kind, key){ return L((KIND_TEXT[kind] || KIND_TEXT.meal)[key]); }
var HISTORY_LIMIT = 50;
/** ชื่อบิลตั้งต้น เช่น "มื้อ 4 ต.ค." — ตอนบิลมาถึงโต๊ะไม่มีใครอยากคิดชื่อ */
function defaultBillName(kind, date){
  return ktOf(kind || "meal", "groupPrefix") + " " + shortDate(date || new Date());
}
