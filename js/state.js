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
  payers: [],
  kind: "meal",         // v3.0: "meal" มื้ออาหาร | "trip" ทริป (ทริประบุคนจ่ายในแต่ละรายการ: menus[i].payer)           // v2.5: [{ id:สมาชิก, amount:บาท | null }] null = จ่ายส่วนที่เหลือ
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
  focusGroupName:false, // v2.2: กด "สร้างกลุ่มก่อน" ที่หน้าแรก → โฟกัสช่องชื่อกลุ่มเมื่อเปิดหน้ากลุ่ม
  installNudgeOff:false, // v2.4: ผู้ใช้กดปิดการ์ดชวนติดตั้งแล้ว
  noReveal:false,       // v2.5: วาดหน้าใบสรุปซ้ำโดยไม่เล่นแอนิเมชันใบเสร็จ
  payerOpen:false,      // v2.6: กางส่วน "ใครจ่าย" แล้ว (ตอนยังไม่เลือกใครจะพับไว้)
  newGroupKind:"meal",  // v3.0: ประเภทที่เลือกไว้ในฟอร์มสร้างกลุ่ม
  pendingKind:null,     // v3.0: กดเริ่มจากหน้าแรก → ตั้งประเภทบิลส่วนตัวเมื่อโหลดเสร็จ
  lastPayer:null        // v3.0: คนจ่ายล่าสุดในโหมดทริป ใช้เป็นค่าตั้งต้นของรายการถัดไป
};

var MAX_NAME = 24;
var MAX_MENU_NAME = 40;
var MAX_PRICE = 100000;
function normText(x){ return String(x||"").toLowerCase().replace(/\s+/g,""); }
var APP_VERSION = "3.0";
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
    done:"จบมื้อแล้ว!", head:"มื้อนี้", thanks:"มื้อนี้อร่อยมาก ขอบคุณทุกคนที่มากินด้วยกันนะ", groupPrefix:"มื้อ"
  },
  trip: {
    icon:"✈️", name:"ทริป", start:"หารค่าทริป", startSub:"ที่พัก ค่าน้ำมัน ตั๋ว ใครจ่ายอะไรก็ใส่ไว้ แล้วดูว่าใครโอนให้ใคร",
    people:"ใครไปบ้าง", items:"ค่าใช้จ่าย", itemsTitle:"ค่าใช้จ่าย", who:"ใครมีส่วนในรายการนี้", whoHint:"แตะชื่อคนที่ไม่มีส่วนออก",
    add:"+ เพิ่มค่าใช้จ่าย", newItem:"เพิ่มค่าใช้จ่าย", editItem:"แก้ไขค่าใช้จ่าย", addBtn:"เพิ่ม",
    namePh:"เช่น ที่พัก ค่าน้ำมัน", nameLabel:"ชื่อรายการ", pricePh:"ยอด (บาท)",
    another:"ทำซ้ำรายการนี้", del:"ลบรายการนี้", next:"ต่อไป: ใส่ค่าใช้จ่าย ›",
    empty:"ยังไม่มีค่าใช้จ่าย — เพิ่มรายการแรก แล้วเลือกว่าใครจ่าย ใครมีส่วน", noName:"ยังไม่ได้ใส่ชื่อรายการ", noEater:"เลือกคนที่มีส่วนในรายการนี้อย่างน้อย 1 คน",
    orphan:"รายการที่ยังไม่ได้เลือกคนมีส่วน", noItems:"ไม่มีส่วนในรายการไหน", suggest:"รายการแนะนำ", suggestOften:"ค่าใช้จ่ายที่พบบ่อยในทริป",
    done:"จบทริปแล้ว!", head:"ทริปนี้", thanks:"ทริปนี้สนุกมาก ขอบคุณทุกคนที่ไปด้วยกันนะ", groupPrefix:"ทริป"
  }
};
function kt(key){ return (KIND_TEXT[state.kind] || KIND_TEXT.meal)[key]; }
function ktOf(kind, key){ return (KIND_TEXT[kind] || KIND_TEXT.meal)[key]; }
