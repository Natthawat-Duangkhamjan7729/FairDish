// งาน 3.1: ภาพตัวอย่าง (ใบเสร็จหน้าแรก / หน้าแนะนำ / วิธีใช้) คำนวณจากบิลตัวอย่างชุดเดียวกับปุ่ม "ดูบิลตัวอย่าง" — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function load(){
  const ctx = vm.createContext({});
  for (const f of ["i18n.js", "state.js", "utils.js", "calc.js", "receipt.js"]){
    const file = path.join(__dirname, "..", "js", f);
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  }
  return ctx;
}

test("บิลตัวอย่าง: ยอดรายคนรวมกันเท่ายอดบิล และตรงกับตัวเลขที่เคยเขียนไว้ในภาพ", () => {
  const app = load();
  const d = app.demoSummary();
  const sum = Math.round(d.r.list.reduce((a, p) => a + p.rounded, 0) * 100) / 100;
  assert.equal(sum, d.r.grand);
  assert.equal(d.r.grand, 1110);
  assert.equal(d.r.n, 8);
  assert.equal(d.bill.menus.length, 10);
  assert.equal(d.r.foodTotal, 930);
  assert.equal(d.r.sharedTotal, 180);
  const by = n => d.by[n].rounded;
  assert.deepEqual([by("มาร์ค"), by("ไอซ์"), by("โฟรค์"), by("ยูกะ")], [151.67, 250, 61.66, 121.67]);
  assert.deepEqual([d.by["โฟรค์"].items.length, d.by["ยูกะ"].items.length, d.by["ไอซ์"].items.length], [2, 3, 6]);
  const dish = d.menu("ลาบหมู");
  assert.equal(dish.price, 80);
  assert.equal(dish.eaters.length, 4);
});

test("ใบเสร็จตัวอย่างแสดงยอดจากการคำนวณ ไม่มีตัวเลขตายตัว", () => {
  const app = load();
  const html = app.demoReceiptHTML();
  for (const p of app.demoSummary().r.list) assert.ok(html.includes(app.baht(p.rounded)), p.name);
  assert.ok(html.includes("1,110.00"));
});
