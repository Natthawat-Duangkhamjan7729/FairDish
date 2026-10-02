// ทดสอบการคำนวณเงิน — รันด้วย `node --test` (ไม่ต้องติดตั้งอะไรเพิ่ม)
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// โหลดไฟล์ js/ แบบเดียวกับเบราว์เซอร์ (สคริปต์ธรรมดาที่แชร์ global)
function loadApp(){
  const ctx = vm.createContext({});
  for (const f of ["state.js", "calc.js"]){
    const file = path.join(__dirname, "..", "js", f);
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  }
  return ctx;
}

function bill({ members, menus = [], shared = [], svc = false, vat = false }){
  const app = loadApp();
  app.state.members = members.map((name, i) => ({ id: "m" + i, name }));
  app.state.menus = menus.map(([name, price, eaters], i) =>
    ({ id: "f" + i, name, price, eaters: eaters.map(n => "m" + n) }));
  app.state.shared = shared.map(([name, price], i) => ({ id: "s" + i, name, price }));
  app.state.charges[0].on = svc;
  app.state.charges[1].on = vat;
  return app.compute();
}

const sumRounded = r => Math.round(r.list.reduce((a, p) => a + p.rounded, 0) * 100) / 100;
const byName = r => Object.fromEntries(r.list.map(p => [p.name, p.rounded]));

test("หารเมนูเฉพาะคนที่กิน", () => {
  const r = bill({ members: ["เอ", "บี", "ซี"], menus: [["ส้มตำ", 90, [0, 1]], ["ลาบ", 120, [2]]] });
  assert.deepEqual({ ...byName(r) }, { "เอ": 45, "บี": 45, "ซี": 120 });
  assert.equal(r.grand, 210);
});

test("เศษสตางค์ถูกกระจายจนรวมเท่ายอดบิลพอดี", () => {
  const r = bill({ members: ["เอ", "บี", "ซี"], menus: [["หมูกระทะ", 100, [0, 1, 2]]] });
  assert.equal(sumRounded(r), 100);
  assert.deepEqual(r.list.map(p => p.rounded).sort(), [33.33, 33.33, 33.34]);
});

test("ค่าส่วนกลางหารเท่ากันทุกคน", () => {
  const r = bill({ members: ["เอ", "บี"], menus: [["ข้าว", 50, [0]]], shared: [["น้ำแข็ง", 20]] });
  assert.deepEqual({ ...byName(r) }, { "เอ": 60, "บี": 10 });
  assert.equal(r.sharedTotal, 20);
});

test("ค่าบริการ 10% + VAT 7% คิดบนยอดอาหารและส่วนกลาง", () => {
  const r = bill({ members: ["เอ", "บี"], menus: [["สเต๊ก", 200, [0, 1]]], svc: true, vat: true });
  assert.equal(r.rate, 0.17);
  assert.equal(r.grand, 234);
  assert.equal(sumRounded(r), 234);
});

test("ยอดรวมรายคนเท่ายอดบิลเสมอ แม้ตัวเลขหารไม่ลงตัว", () => {
  const r = bill({
    members: ["1", "2", "3", "4", "5", "6", "7"],
    menus: [["ก", 99.99, [0, 1, 2]], ["ข", 47, [3, 4, 5, 6]], ["ค", 13.5, [0, 6]]],
    shared: [["ทิป", 11]], svc: true, vat: true
  });
  assert.equal(sumRounded(r), r.grand);
});

test("เมนูที่ไม่มีคนกินไม่ถูกนำมาคิด และนับเป็น orphan", () => {
  const r = bill({ members: ["เอ"], menus: [["ข้าว", 40, [0]], ["ไม่มีใครกิน", 500, []]] });
  assert.equal(r.grand, 40);
  assert.equal(r.orphan, 1);
});

test("สมาชิกที่ถูกลบไปแล้วไม่ถูกคิดเงินจากเมนูเดิม", () => {
  const r = bill({ members: ["เอ", "บี"], menus: [["ไก่ทอด", 90, [0, 1, 5]]] });
  assert.deepEqual({ ...byName(r) }, { "เอ": 45, "บี": 45 });
});

test("ไม่มีสมาชิกเลยไม่พัง", () => {
  const r = bill({ members: [], shared: [["น้ำ", 30]] });
  assert.equal(r.list.length, 0);
  assert.equal(r.n, 0);
});

test("compute(bill) คำนวณบิลอื่นได้โดยไม่แตะบิลที่เปิดอยู่ (ใช้ในหน้าประวัติ)", () => {
  const app = loadApp();
  app.state.members = [{ id: "a", name: "เอ" }];
  app.state.menus = [{ id: "x", name: "ข้าว", price: 50, eaters: ["a"] }];
  const old = {
    members: [{ id: "p", name: "พี" }, { id: "q", name: "คิว" }],
    menus: [{ id: "y", name: "หมูกระทะ", price: 299, eaters: ["p", "q"] }],
    shared: [], charges: [{ id: "vat", rate: 7, on: true }]
  };
  const r = app.compute(old);
  assert.equal(r.grand, 319.93);
  assert.equal(sumRounded(r), 319.93);
  assert.equal(app.compute().grand, 50);
});
