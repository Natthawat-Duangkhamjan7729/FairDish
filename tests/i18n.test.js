// v4.0/v4.1: ทุกข้อความใน L("…") ต้องมีคำแปลภาษาอังกฤษ และค่าแทรก {ชื่อ} ต้องตรงกัน — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dir = path.join(__dirname, "..", "js");
function loadEN(){
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(dir, "i18n.js"), "utf8") + fs.readFileSync(path.join(dir, "i18n-en.js"), "utf8") +
    fs.readFileSync(path.join(dir, "state.js"), "utf8") + ";this.__EN = EN; this.__KT = KIND_TEXT; this.__L = L;", ctx);
  return ctx;
}
function keysInCode(){
  const keys = new Set();
  for (const f of fs.readdirSync(dir)){
    if (/library|i18n/.test(f)) continue;
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    const re = /\bL\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
    let m;
    while ((m = re.exec(s))) keys.add(JSON.parse(m[1][0] === "'" ? '"' + m[1].slice(1, -1).replace(/"/g, '\\"') + '"' : m[1]));
  }
  const html = fs.readFileSync(path.join(dir, "..", "index.html"), "utf8");
  const re2 = /data-i18n(?:-label)?="([^"]+)"/g;
  let m;
  while ((m = re2.exec(html))) keys.add(m[1]);
  return keys;
}

test("ทุกข้อความไทยใน L() และ data-i18n มีคำแปลภาษาอังกฤษ", () => {
  const ctx = loadEN();
  const keys = keysInCode();
  for (const k of ["meal", "trip"]) for (const v of Object.values(ctx.__KT[k])) keys.add(v);
  const missing = [...keys].filter(k => /[฀-๿]/.test(k) && !(k in ctx.__EN));
  assert.deepEqual(missing, []);
});

test("ค่าแทรก {ชื่อ} ในคำแปลตรงกับต้นฉบับ", () => {
  const ctx = loadEN();
  const bad = Object.keys(ctx.__EN).filter(k => {
    const a = (k.match(/\{\w+\}/g) || []).sort().join(), b = (ctx.__EN[k].match(/\{\w+\}/g) || []).sort().join();
    return a !== b;
  });
  assert.deepEqual(bad, []);
});

test("L(): ภาษาไทยเป็นค่าตั้งต้น เปลี่ยนเป็นอังกฤษได้ และแทนค่าให้", () => {
  const ctx = loadEN();
  assert.equal(ctx.__L("เพิ่ม {name} แล้ว", { name: "มาร์ค" }), "เพิ่ม มาร์ค แล้ว");
  vm.runInContext('LANG = "en"', ctx);
  assert.equal(ctx.__L("เพิ่ม {name} แล้ว", { name: "Mark" }), "Added Mark");
  assert.equal(ctx.__L("ข้อความที่ไม่มีคำแปล"), "ข้อความที่ไม่มีคำแปล");
});

test("v4.1: ข้อความที่เก็บเป็นตาราง (หน้าแนะนำ ธีม สถานะยืนยัน ค่าบริการ) มีคำแปลครบ", () => {
  const ctx = vm.createContext({});
  for (const f of ["i18n.js", "i18n-en.js", "state.js", "pages.js", "confirm.js"]) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx);
  vm.runInContext("this.__keys = [].concat(ONBOARD.reduce(function(a,o){ return a.concat(o); }, []), " +
    "Object.keys(CONFIRM_BADGE).map(function(k){ return CONFIRM_BADGE[k][1]; }), defaultCharges().map(function(c){ return c.label; }));", ctx);
  const missing = [...ctx.__keys].filter(k => /[฀-๿]/.test(k) && !(k in ctx.EN));
  assert.deepEqual(missing, []);
});

test("v4.5/v4.4: ตารางข้อความของการสอนใช้ (TOUR_STEPS) และตัวกรองประวัติมีคำแปลครบ", () => {
  const ctx = vm.createContext({ window:{}, document:{}, WIDE_MQ:null });
  for (const f of ["i18n.js", "i18n-en.js", "state.js", "wide.js", "tour.js"]) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx);
  vm.runInContext("this.__keys = [].concat(TOUR_STEPS.map(function(s){ return s.title; }), TOUR_STEPS.map(function(s){ return s.body; }), " +
    "HIST_FILTERS.map(function(f){ return f[1]; }));", ctx);
  const missing = [...ctx.__keys].filter(k => /[฀-๿]/.test(k) && !(k in ctx.EN));
  assert.deepEqual(missing, []);
});
