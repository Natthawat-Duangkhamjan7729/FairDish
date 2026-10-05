/* FairDish — ชั้นเก็บข้อมูล: localStorage → window.storage → หน่วยความจำ
   อยู่ในกลุ่ม (groupId) = บิลเก็บบนเซิร์ฟเวอร์ผ่าน Cloud (js/cloud.js) แทน */
"use strict";

/* =========================================================
   1. ชั้นเก็บข้อมูล — เลือกที่เก็บที่ใช้ได้จริงในสภาพแวดล้อมนั้น
   ========================================================= */
var Store = {
  key: "fairdish:bill:v1",
  menuKey: "fairdish:menu-memory:v1",   // คีย์ใหม่ ไม่ทับข้อมูลบิลที่เคยบันทึกไว้
  groupsKey: "fairdish:groups:v1",      // กลุ่มที่เครื่องนี้เคยเปิด + "ฉันคือใคร"
  themeKey: "fairdish:theme:v1",
  profileKey: "fairdish:profile:v1",    // v4.6: { name, asked } ชื่อที่ให้เราเรียก — อยู่ในเครื่องเท่านั้น
  historyKey: "fairdish:history:v1",    // v3.2: บิลส่วนตัวที่เก็บเข้าประวัติ        // v2.1: "system" | "light" | "dark" (index.html อ่านค่านี้ก่อนวาดหน้า)
  groupId: null,                        // null = บิลส่วนตัวในเครื่อง
  groupName: "",
  version: 0,                           // version ของบิลกลุ่มที่โหลดมาล่าสุด ใช้กันเขียนทับกัน
  mode: "memory",
  mem: null,
  memStore: {},
  async init(){
    try {
      if (window.storage && typeof window.storage.get === "function"){ this.mode = "artifact"; return; }
    } catch(e){}
    try {
      var probe = "__fairdish_probe__";
      window.localStorage.setItem(probe,"1");
      window.localStorage.removeItem(probe);
      this.mode = "local";
    } catch(e){ this.mode = "memory"; }
  },
  async readRaw(key){
    if (this.mode === "artifact"){
      try {
        var res = await window.storage.get(key);
        return res && res.value ? res.value : null;
      } catch(e){ return null; }            // ยังไม่เคยมีข้อมูล = ไม่ใช่ข้อผิดพลาด
    }
    if (this.mode === "local") return window.localStorage.getItem(key);
    return this.memStore[key] || null;
  },
  async writeRaw(key, text){
    if (this.mode === "artifact"){
      var res = await window.storage.set(key, text);
      if (!res) throw new Error("storage rejected");
      return;
    }
    if (this.mode === "local"){ window.localStorage.setItem(key, text); return; }
    this.memStore[key] = text;
  },
  /** บิลกลุ่มที่ไม่มีอยู่จริง → null, บิลกลุ่มว่าง → {} */
  async load(){
    if (this.groupId){
      var id = this.groupId;
      var g = await Cloud.get(id);
      if (this.groupId !== id) throw new Error("group changed");
      if (!g) return null;
      this.version = g.version;
      this.groupName = g.name;
      return g.data || {};
    }
    var raw = await this.readRaw(this.key);
    return raw ? JSON.parse(raw) : null;
  },
  async save(data){
    if (this.groupId){
      var id = this.groupId;
      var res = await Cloud.save(id, data, this.version);
      if (this.groupId !== id) return;
      if (res && res.ok){ this.version = res.version; return; }
      var err = new Error(res && res.missing ? "group missing" : "group conflict");
      err.conflict = !(res && res.missing);
      err.latest = res;
      throw err;
    }
    var text = JSON.stringify(data);
    await this.writeRaw(this.key, text);
    this.mem = JSON.parse(text);
  },
  async loadMenus(){
    var raw = await this.readRaw(this.menuKey);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  },
  async saveMenus(list){
    await this.writeRaw(this.menuKey, JSON.stringify(list));
  },
  async loadGroups(){
    var raw = await this.readRaw(this.groupsKey);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(function(g){ return g && isGroupId(g.id); }) : [];
  },
  async saveGroups(list){
    await this.writeRaw(this.groupsKey, JSON.stringify(list));
  },
  /** v3.2: บิลส่วนตัวในเครื่อง (ไม่สนว่าตอนนี้เปิดกลุ่มอยู่หรือเปล่า) */
  async loadLocalBill(){
    var raw = await this.readRaw(this.key);
    return raw ? JSON.parse(raw) : null;
  },
  async saveLocalBill(data){
    await this.writeRaw(this.key, JSON.stringify(data));
  },
  async loadHistory(){
    var raw = await this.readRaw(this.historyKey);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(function(h){ return h && h.id && h.data; }) : [];
  },
  async saveHistory(list){
    await this.writeRaw(this.historyKey, JSON.stringify(list));
  },
  async loadProfile(){
    var raw = await this.readRaw(this.profileKey);
    var p = raw ? JSON.parse(raw) : null;
    return p && typeof p === "object" ? p : null;
  },
  async saveProfile(p){
    await this.writeRaw(this.profileKey, JSON.stringify(p));
  }
};
