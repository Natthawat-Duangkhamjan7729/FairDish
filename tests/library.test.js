// v4.15: คลังเมนู / ค่าส่วนกลาง / ค่าใช้จ่ายทริป ทุกรายการมีชื่ออังกฤษ และโหมด EN แสดง/ค้นด้วยชื่ออังกฤษ — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dir = path.join(__dirname, "..", "js");
const THAI = /[฀-๿]/;
function load(){
  const ctx = vm.createContext({});
  for (const f of ["i18n.js", "state.js", "menu-library.js", "library-en.js"]) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx);
  vm.runInContext("MENU_LIBRARY = buildMenuLibrary();", ctx);
  return ctx;
}

test("ทุกเมนูในคลังมีชื่ออังกฤษ (ไม่มีอักษรไทยหรือ {} ค้าง)", () => {
  const ctx = load();
  const lib = JSON.parse(vm.runInContext("JSON.stringify(MENU_LIBRARY)", ctx));   // ข้าม realm ของ vm
  assert.ok(lib.length > 1200, "คลังเมนูมี " + lib.length + " รายการ");
  const bad = lib.filter(l => !l.en || THAI.test(l.en) || /[{}]/.test(l.en)).map(l => l.name);
  assert.deepEqual(bad, []);
});

test("ทุกค่าส่วนกลางและค่าใช้จ่ายทริปมีชื่ออังกฤษ", () => {
  const ctx = load();
  const src = fs.readFileSync(path.join(dir, "shared-library.js"), "utf8");
  const lit = re => JSON.parse(vm.runInContext("JSON.stringify(" + src.match(re)[1] + ")", ctx));
  const groups = lit(/var SHARED_GROUPS = (\[[\s\S]*?\n\]);/);
  const popular = lit(/var SHARED_POPULAR = (\[[^\]]*\])/);
  const trip = lit(/var TRIP_LIBRARY = (\[[\s\S]*?\])\.map/);
  const shared = vm.runInContext("SHARED_EN", ctx), tripEn = vm.runInContext("TRIP_EN", ctx);
  const names = popular.concat(...groups.map(g => g.names));
  assert.deepEqual(names.filter(n => !shared[n] || THAI.test(shared[n])), []);
  assert.deepEqual(trip.filter(n => !tripEn[n] || THAI.test(tripEn[n])), []);
});

test("menuEn(): ประกอบชื่อจากตระกูล × วัตถุดิบ, วิธีปรุงวางหน้า, ชื่อเต็มชนะ", () => {
  const ctx = load();
  const en = (a, b, c) => vm.runInContext("menuEn(" + [a, b, c].filter(x => x !== undefined).map(x => JSON.stringify(x)).join(",") + ")", ctx);
  assert.equal(en("ข้าวผัดกุ้ง", "ข้าวผัด", "กุ้ง"), "Shrimp Fried Rice");
  assert.equal(en("ปลานิลทอด", "ปลานิล", "ทอด"), "Fried Tilapia");
  assert.equal(en("ข้าวมันไก่", "ข้าว", "มันไก่"), "Hainanese Chicken Rice");
  assert.equal(en("ต้มยำ", "ต้มยำ"), "Tom Yum");
  assert.equal(en("ไม่มีในคลัง"), "");
});

test("libName() / libPos(): โหมด EN แสดงชื่ออังกฤษ ค้นได้ทั้งอังกฤษและไทย", () => {
  const ctx = load();
  vm.runInContext('this.__l = MENU_LIBRARY.filter(function(l){ return l.name === "ผัดไทยกุ้งสด"; })[0];', ctx);
  assert.equal(vm.runInContext("libName(__l)", ctx), "ผัดไทยกุ้งสด");
  vm.runInContext('LANG = "en"', ctx);
  assert.equal(vm.runInContext("libName(__l)", ctx), "Pad Thai Fresh Shrimp");
  assert.equal(vm.runInContext('libPos(__l, normText("pad thai"))', ctx), 0);
  assert.ok(vm.runInContext('libPos(__l, normText("ผัดไทย"))', ctx) >= 0);
  assert.equal(vm.runInContext('libPos(__l, normText("pizza"))', ctx), -1);
});
