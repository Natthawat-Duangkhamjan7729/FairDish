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

/* ---- v2.5: ใครโอนให้ใคร ---- */
function settleBill(spec, payers){
  const app = loadApp();
  app.state.members = spec.members.map((name, i) => ({ id: "m" + i, name }));
  app.state.menus = (spec.menus || []).map(([name, price, eaters], i) =>
    ({ id: "f" + i, name, price, eaters: eaters.map(n => "m" + n) }));
  app.state.shared = (spec.shared || []).map(([name, price], i) => ({ id: "s" + i, name, price }));
  const r = app.compute();
  return { r, s: app.settle(r, payers.map(([i, amount]) => ({ id: "m" + i, amount }))) };
}
const transfersText = s => [...s.transfers].map(t => `${t.fromName}>${t.toName}:${t.amount}`).sort();
// ทุกคนต้องเหลือยอดสุทธิ 0 หลังโอน: จ่ายให้ร้าน + โอนออก − รับเข้า = ยอดที่ต้องจ่ายของตัวเอง
function assertBalanced(r, s){
  for (const p of r.list){
    const out = s.transfers.filter(t => t.from === p.id).reduce((a, t) => a + Math.round(t.amount * 100), 0);
    const inn = s.transfers.filter(t => t.to === p.id).reduce((a, t) => a + Math.round(t.amount * 100), 0);
    assert.equal(Math.round((s.paid[p.id] || 0) * 100) + out - inn, Math.round(p.rounded * 100), p.name);
  }
}

test("ยังไม่ระบุคนจ่าย = ไม่มีรายการโอน (ทำงานแบบเดิม)", () => {
  const { s } = settleBill({ members: ["เอ", "บี"], menus: [["ข้าว", 100, [0, 1]]] }, []);
  assert.equal(s.ok, false);
  assert.equal(s.reason, "none");
});

test("จ่ายคนเดียว: ทุกคนโอนส่วนของตัวเองให้คนจ่าย", () => {
  const { r, s } = settleBill({ members: ["เอ", "บี", "ซี"], menus: [["ส้มตำ", 90, [0, 1]], ["ลาบ", 120, [2]]] }, [[0, null]]);
  assert.equal(s.ok, true);
  assert.deepEqual(transfersText(s), ["บี>เอ:45", "ซี>เอ:120"].sort());
  assertBalanced(r, s);
});

test("หัวจ่ายสองคน: หักลบแล้วโอนน้อยครั้งที่สุด", () => {
  // เอกินคนเดียว 300 แต่จ่าย 100, บีกินคนเดียว 100 แต่จ่าย 300 → เอโอนให้บีครั้งเดียว 200
  const { r, s } = settleBill({ members: ["เอ", "บี"], menus: [["สเต๊ก", 300, [0]], ["สลัด", 100, [1]]] }, [[0, 100], [1, null]]);
  assert.equal(s.ok, true);
  assert.equal(s.paid.m1, 300);
  assert.deepEqual(transfersText(s), ["เอ>บี:200"]);
  assertBalanced(r, s);
});

test("จำนวนครั้งที่โอนไม่เกินจำนวนคน − 1 และเศษสตางค์ลงตัว", () => {
  const { r, s } = settleBill({
    members: ["1", "2", "3", "4", "5", "6", "7"],
    menus: [["ก", 99.99, [0, 1, 2]], ["ข", 47, [3, 4, 5, 6]], ["ค", 13.5, [0, 6]]], shared: [["ทิป", 11]]
  }, [[0, 50.5], [3, 70], [6, null]]);
  assert.equal(s.ok, true);
  assert.ok(s.transfers.length <= 6);
  assertBalanced(r, s);
});

test("ยอดที่จ่ายไม่ครบ / เกิน / เว้นว่างหลายคน ถูกแจ้งเตือน", () => {
  const spec = { members: ["เอ", "บี"], menus: [["ข้าว", 100, [0, 1]]] };
  assert.deepEqual([settleBill(spec, [[0, 60], [1, 30]]).s.reason, settleBill(spec, [[0, 60], [1, 30]]).s.diff], ["short", 10]);
  assert.equal(settleBill(spec, [[0, 80], [1, 40]]).s.reason, "over");
  assert.equal(settleBill(spec, [[0, 150], [1, null]]).s.reason, "over");
  assert.equal(settleBill(spec, [[0, null], [1, null]]).s.reason, "missing");
});

test("คนจ่ายที่ถูกลบออกจากโต๊ะไปแล้วไม่ถูกนับ", () => {
  const { s } = settleBill({ members: ["เอ", "บี"], menus: [["ข้าว", 100, [0, 1]]] }, [[5, null]]);
  assert.equal(s.reason, "none");
});
