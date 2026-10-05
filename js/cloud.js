/* FairDish — กลุ่มผ่านลิงก์: คุยกับ Supabase + ข้อมูล "กลุ่มของฉัน" ในเครื่อง */
"use strict";

/* =========================================================
   2.5 กลุ่ม
   ========================================================= */
var MAX_GROUP_NAME = 40;
var MY_GROUPS_LIMIT = 30;

/** รหัสกลุ่ม = เลขฐานสิบหก 12 ตัว (สุ่มจากฝั่งเซิร์ฟเวอร์) */
function isGroupId(id){ return /^[0-9a-f]{12}$/.test(String(id||"")); }

/** "/g/<id>" หรือ "/g/<id>/bill" → { id, bill } ไม่ใช่หน้ากลุ่ม → null (id อาจผิดรูปแบบ ให้ผู้เรียกเช็กเอง)
    v4.11: ลิงก์ที่ส่งให้เพื่อนมีกุญแจเข้ารหัส "/g/<id>.<key>/…" → key */
function parseGroupPath(path){
  var m = /^\/g\/([^\/.]+)(?:\.([A-Za-z0-9_-]+))?(\/bill|\/me|\/share)?$/.exec(String(path||""));
  return m ? { id:m[1], key:m[2] || "", bill:m[3] === "/bill", me:m[3] === "/me", share:m[3] === "/share" } : null;
}
/* ---- v4.11: กุญแจเข้ารหัสของแต่ละกลุ่ม (รู้จากลิงก์ที่เปิด หรือจำไว้ใน "กลุ่มของฉัน") ---- */
function groupKey(id){
  if (ui.groupKeys[id]) return ui.groupKeys[id];
  var g = myGroup(id);
  return g && g.key ? g.key : "";
}
function rememberKey(id, key){
  if (!Seal.isKey(key)) return;
  ui.groupKeys[id] = key;
  var g = myGroup(id);
  if (g && g.key !== key){ g.key = key; saveMyGroups(); }
}

/** รับทั้งลิงก์เต็มหรือรหัสกลุ่มที่ผู้ใช้วางมา → รหัสกลุ่ม หรือ "" */
function groupIdFromInput(text){
  var s = String(text||"").trim().toLowerCase();
  var m = /#\/g\/([0-9a-f]{12})(?:[.\/?#]|$)/.exec(s);   // v4.11: ".<กุญแจ>" ต่อท้ายรหัสได้
  if (m) return m[1];
  return isGroupId(s) ? s : "";
}

/** v4.11: ลิงก์/QR ของกลุ่ม → hash ในแอปนี้ "#/g/<id>[/me|/bill]" (ลิงก์อาจมาจากเว็บอีกโดเมน เช่นตัวเต็ม/ตัวทดลอง) หรือ "" */
function groupHashFromInput(text){
  var s = String(text || "").trim();
  var m = /#\/g\/([0-9a-fA-F]{12})((?:\.[A-Za-z0-9_-]+)?)(\/me|\/bill)?(?:[\/?#\s]|$)/.exec(s);
  if (m) return "#/g/" + m[1].toLowerCase() + m[2] + (m[3] || "");
  var id = groupIdFromInput(s);
  return id ? "#/g/" + id : "";
}
/** ชื่อกลุ่มตั้งต้น เช่น "มื้อ 4 ต.ค." — ตอนบิลมาถึงโต๊ะไม่มีใครอยากคิดชื่อ */
function defaultGroupName(date, kind){
  return ktOf(kind || "meal", "groupPrefix") + " " + shortDate(date || new Date());
}
function groupLink(id){
  var k = groupKey(id);
  return location.origin + location.pathname + "#/g/" + id + (k ? "." + k : "");   // v4.11: ลิงก์ที่ส่งต่อต้องมีกุญแจ
}
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
  /* v4.11: กลุ่มใหม่เข้ารหัสทั้งชื่อและบิล (เซิร์ฟเวอร์เห็นชื่อ "FairDish" กับข้อมูลที่อ่านไม่ออก)
     กลุ่มเก่าที่ไม่ได้เข้ารหัสยังอ่าน/เขียนแบบเดิม — ดูจากว่ามีกุญแจของกลุ่มนั้นไหม */
  async create(name, data){
    if (!Seal.ok()) return this.rpc("create_group", { p_name:name, p_data:data });
    var key = Seal.newKey();
    var res = await this.rpc("create_group", { p_name:"FairDish", p_data:await Seal.lock({ name:name, data:data }, key) });
    if (res && res.id){ ui.groupKeys[res.id] = key; res.key = key; res.name = name; }
    return res;
  },
  /** เปิดกล่องที่เข้ารหัส → แทนที่ data/name ใน r — ไม่มีกุญแจหรือกุญแจผิด = error .nokey */
  async unseal(id, r){
    if (!r || !Seal.sealed(r.data)) return r;
    var key = groupKey(id), inner;
    try { if (!key) throw 0; inner = await Seal.open(r.data, key); }
    catch(e){ var err = new Error("group key"); err.nokey = true; throw err; }
    r.data = inner.data || {};
    r.name = inner.name || r.name;
    return r;
  },
  async get(id){ return this.unseal(id, await this.rpc("get_group", { p_id:id })); },
  async save(id, data, version){
    var key = groupKey(id);
    var body = key && Seal.ok() ? await Seal.lock({ name:Store.groupName, data:data }, key) : data;
    var res = await this.rpc("save_group", { p_id:id, p_data:body, p_version:version });
    if (res && !res.ok && res.data) await this.unseal(id, res);   // ชนกับเพื่อน — ข้อมูลล่าสุดต้องเปิดก่อนใช้
    return res;
  },
  remove(id, owner){ return this.rpc("delete_group", { p_id:id, p_owner:owner }); }   // v4.11: ยุบกลุ่ม
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
  if (ui.groupKeys[id]) g.key = ui.groupKeys[id];   // v4.11: จำกุญแจเข้ารหัสไว้ เปิดครั้งหน้าไม่ต้องมีลิงก์เต็ม
  g.at = Date.now();
  ui.myGroups.sort(function(a,b){ return (b.at||0)-(a.at||0); });
  if (ui.myGroups.length > MY_GROUPS_LIMIT) ui.myGroups = ui.myGroups.slice(0, MY_GROUPS_LIMIT);
  return saveMyGroups();
}
/** v4.10: จำข้อมูลล่าสุดของกลุ่มไว้ในเครื่อง ให้หน้าหลักขึ้นการ์ดความคืบหน้าได้ทันที (และรู้ว่าเสร็จแล้วหรือยัง) */
function snapGroup(id, data){
  var g = myGroup(id);
  if (!g || !data) return;
  g.snap = data;
  g.done = billDone(data);
  if (!g.done) g.doneSeen = false;
  saveMyGroups();
}
/** id ของสมาชิกที่ผู้ใช้เครื่องนี้เลือกว่าเป็นตัวเอง (เฉพาะในกลุ่ม) */
function myMemberId(){
  if (!ui.ctx) return null;
  var g = myGroup(ui.ctx);
  return g && g.me && nameOf(g.me) ? g.me : null;
}
