/* FairDish — ชั้นเก็บข้อมูล: localStorage → window.storage → หน่วยความจำ */
"use strict";

/* =========================================================
   1. ชั้นเก็บข้อมูล — เลือกที่เก็บที่ใช้ได้จริงในสภาพแวดล้อมนั้น
   ========================================================= */
var Store = {
  key: "fairdish:bill:v1",
  menuKey: "fairdish:menu-memory:v1",   // คีย์ใหม่ ไม่ทับข้อมูลบิลที่เคยบันทึกไว้
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
  async load(){
    var raw = await this.readRaw(this.key);
    return raw ? JSON.parse(raw) : null;
  },
  async save(data){
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
  }
};
