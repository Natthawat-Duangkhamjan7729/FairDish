/* FairDish — ข้อมูลของบิล สถานะหน้าจอ และค่าคงที่ */
"use strict";

/* =========================================================
   2. ข้อมูลของบิล
   ========================================================= */
var uid = 0;
function nid(){ uid += 1; return "i" + uid; }

var state = {
  members: [],
  menus: [],
  shared: [],
  charges: [
    { id:"svc", label:"ค่าบริการ", rate:10, on:false, fixed:true },
    { id:"vat", label:"VAT", rate:7, on:false, fixed:true }
  ],
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
  confirmReset:false
};

var MAX_NAME = 24;
var MAX_MENU_NAME = 40;
var MAX_PRICE = 100000;
function normText(x){ return String(x||"").toLowerCase().replace(/\s+/g,""); }
var APP_VERSION = "1.9";
var MENU_MEMORY_LIMIT = 60;
