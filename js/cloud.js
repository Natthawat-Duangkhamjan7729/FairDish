/* FairDish — กลุ่มผ่านลิงก์: คุยกับ Supabase + ข้อมูล "กลุ่มของฉัน" ในเครื่อง */
"use strict";

/* =========================================================
   2.5 กลุ่ม
   ========================================================= */
var MAX_GROUP_NAME = 40;
var MY_GROUPS_LIMIT = 30;

/** รหัสกลุ่ม = เลขฐานสิบหก 12 ตัว (สุ่มจากฝั่งเซิร์ฟเวอร์) */
function isGroupId(id){ return /^[0-9a-f]{12}$/.test(String(id||"")); }

/** "/g/<id>" หรือ "/g/<id>/bill" → { id, bill } ไม่ใช่หน้ากลุ่ม → null (id อาจผิดรูปแบบ ให้ผู้เรียกเช็กเอง) */
function parseGroupPath(path){
  var m = /^\/g\/([^\/]+)(\/bill|\/me|\/share)?$/.exec(String(path||""));
  return m ? { id:m[1], bill:m[2] === "/bill", me:m[2] === "/me", share:m[2] === "/share" } : null;
}

/** รับทั้งลิงก์เต็มหรือรหัสกลุ่มที่ผู้ใช้วางมา → รหัสกลุ่ม หรือ "" */
function groupIdFromInput(text){
  var s = String(text||"").trim().toLowerCase();
  var m = /#\/g\/([0-9a-f]{12})(?:[\/?#]|$)/.exec(s);
  if (m) return m[1];
  return isGroupId(s) ? s : "";
}

/** ชื่อกลุ่มตั้งต้น เช่น "มื้อ 4 ต.ค." — ตอนบิลมาถึงโต๊ะไม่มีใครอยากคิดชื่อ */
function defaultGroupName(date, kind){
  return ktOf(kind || "meal", "groupPrefix") + " " + shortDate(date || new Date());
}
function groupLink(id){ return location.origin + location.pathname + "#/g/" + id; }
function splitHref(){ return ui.ctx ? "#/g/"+ui.ctx : "#/split"; }
function billHref(){ return ui.ctx ? "#/g/"+ui.ctx+"/bill" : "#/bill"; }

var Cloud = {
  ready(){ return !!(SUPABASE_URL && SUPABASE_ANON_KEY); },
  async rpc(fn, args){
    if (!this.ready()) throw new Error("cloud disabled");
    var headers = { "Content-Type":"application/json", "apikey":SUPABASE_ANON_KEY };
    // anon key แบบเก่าเป็น JWT ต้องส่งซ้ำใน Authorization ส่วน publishable key แบบใหม่ห้ามส่ง
    if (/^eyJ/.test(SUPABASE_ANON_KEY)) headers.Authorization = "Bearer " + SUPABASE_ANON_KEY;
    var res = await fetch(SUPABASE_URL.replace(/\/+$/,"") + "/rest/v1/rpc/" + fn, {
      method:"POST", headers:headers, body:JSON.stringify(args)
    });
    if (!res.ok) throw new Error("cloud " + fn + " " + res.status);
    return res.json();
  },
  create(name, data){ return this.rpc("create_group", { p_name:name, p_data:data }); },
  get(id){ return this.rpc("get_group", { p_id:id }); },
  save(id, data, version){ return this.rpc("save_group", { p_id:id, p_data:data, p_version:version }); }
};

/* ---- กลุ่มของฉัน (จำไว้ในเครื่องนี้เท่านั้น) ---- */
function myGroup(id){
  for (var i=0;i<ui.myGroups.length;i++) if (ui.myGroups[i].id===id) return ui.myGroups[i];
  return null;
}
function saveMyGroups(){
  return Store.saveGroups(ui.myGroups).catch(function(){});
}
function rememberGroup(id, name, kind){
  var g = myGroup(id);
  if (!g){ g = { id:id, name:name, me:null, at:0 }; ui.myGroups.push(g); }
  g.name = name;
  if (kind) g.kind = kind;
  g.at = Date.now();
  ui.myGroups.sort(function(a,b){ return (b.at||0)-(a.at||0); });
  if (ui.myGroups.length > MY_GROUPS_LIMIT) ui.myGroups = ui.myGroups.slice(0, MY_GROUPS_LIMIT);
  return saveMyGroups();
}
/** id ของสมาชิกที่ผู้ใช้เครื่องนี้เลือกว่าเป็นตัวเอง (เฉพาะในกลุ่ม) */
function myMemberId(){
  if (!ui.ctx) return null;
  var g = myGroup(ui.ctx);
  return g && g.me && nameOf(g.me) ? g.me : null;
}
