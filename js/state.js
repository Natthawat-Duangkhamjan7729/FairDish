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
  noReveal:false        // v2.5: วาดหน้าใบสรุปซ้ำโดยไม่เล่นแอนิเมชันใบเสร็จ
};

var MAX_NAME = 24;
var MAX_MENU_NAME = 40;
var MAX_PRICE = 100000;
function normText(x){ return String(x||"").toLowerCase().replace(/\s+/g,""); }
var APP_VERSION = "2.5";
var MENU_MEMORY_LIMIT = 60;
