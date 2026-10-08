// งาน 3.4: ตรวจฟอร์มค่าส่วนกลางและค่าใช้จ่ายแบบเปอร์เซ็นต์ — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function load(){
  const ctx = vm.createContext({});
  for (const f of ["i18n.js", "state.js"]){
    const file = path.join(__dirname, "..", "js", f);
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  }
  return ctx;
}

test("ค่าส่วนกลาง: ช่องว่างบอกครบทุกช่อง", () => {
  const app = load();
  assert.deepEqual(Object.keys(app.validateSharedForm("", "")).sort(), ["name", "price"]);
});

test("ค่าส่วนกลาง: ราคาผิดรูปแบบ ติดลบ และเกิน 100,000 ถูกปฏิเสธ", () => {
  const app = load();
  for (const bad of ["abc", "12abc", "-5", "100000.01", "99999999"]) assert.ok(app.validateSharedForm("น้ำแข็ง", bad).price, bad);
  for (const ok of ["0", "20", "60.50", "100000"]) assert.deepEqual({ ...app.validateSharedForm("น้ำแข็ง", ok) }, {}, ok);
});

test("ค่าใช้จ่าย %: ต้องมีชื่อ และเปอร์เซ็นต์ 0 ถึง 100", () => {
  const app = load();
  assert.deepEqual(Object.keys(app.validateChargeForm("", "")).sort(), ["label", "rate"]);
  for (const bad of ["abc", "-1", "100.5", "500"]) assert.ok(app.validateChargeForm("ค่าเปิดขวด", bad).rate, bad);
  for (const ok of ["0", "5", "12.5", "100"]) assert.deepEqual({ ...app.validateChargeForm("ค่าเปิดขวด", ok) }, {}, ok);
});
