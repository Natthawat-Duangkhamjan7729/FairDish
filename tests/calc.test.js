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
  for (const f of ["i18n.js", "state.js", "calc.js"]){
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

/* ---- v3.0: โหมดทริป คนจ่ายแยกรายการ ---- */
function trip(spec){
  const app = loadApp();
  app.state.kind = "trip";
  app.state.members = spec.members.map((name, i) => ({ id: "m" + i, name }));
  app.state.menus = spec.items.map(([name, price, eaters, payer], i) =>
    ({ id: "t" + i, name, price, eaters: eaters.map(n => "m" + n), payer: payer == null ? undefined : "m" + payer }));
  if (spec.vat) { app.state.charges[0].on = true; app.state.charges[1].on = true; }
  const r = app.compute();
  return { app, r, s: app.settleBill(r) };
}

test("ทริป: แต่ละรายการคนจ่ายต่างกัน หักลบแล้วโอนน้อยครั้ง", () => {
  // ที่พัก 3,000 (เอจ่าย, 3 คน), น้ำมัน 900 (บีจ่าย, 3 คน), ตั๋วเข้าชม 600 (ซีจ่าย, เอ+ซี), ของฝาก 150 (เอจ่าย, เอคนเดียว)
  const { r, s } = trip({ members: ["เอ", "บี", "ซี"], items: [
    ["ที่พัก", 3000, [0, 1, 2], 0], ["น้ำมัน", 900, [0, 1, 2], 1], ["ตั๋วเข้าชม", 600, [0, 2], 2], ["ของฝาก", 150, [0], 0]
  ]});
  assert.deepEqual({ ...byName(r) }, { "เอ": 1750, "บี": 1300, "ซี": 1600 });
  assert.equal(r.grand, 4650);
  assert.equal(s.ok, true);
  assert.deepEqual({ ...s.paid }, { m0: 3150, m1: 900, m2: 600 });
  assert.deepEqual(transfersText(s), ["บี>เอ:400", "ซี>เอ:1000"].sort());
  assertBalanced(r, s);
});

test("ทริป: ไม่คิดค่าบริการ/VAT แม้ข้อมูลเดิมเปิดไว้", () => {
  const { r } = trip({ members: ["เอ", "บี"], items: [["ที่พัก", 1000, [0, 1], 0]], vat: true });
  assert.equal(r.rate, 0);
  assert.equal(r.grand, 1000);
  assert.equal(sumRounded(r), 1000);
});

test("ทริป: รายการที่ยังไม่ระบุคนจ่ายถูกแจ้ง และไม่สรุปการโอน", () => {
  const { s } = trip({ members: ["เอ", "บี"], items: [["ที่พัก", 1000, [0, 1], 0], ["น้ำมัน", 500, [0, 1], null]] });
  assert.equal(s.ok, false);
  assert.equal(s.reason, "unpaid");
  assert.equal(s.count, 1);
});

test("ทริป: เศษสตางค์ยังลงตัว และคนจ่ายที่ถูกลบออกนับเป็นยังไม่ระบุ", () => {
  const a = trip({ members: ["1", "2", "3"], items: [["ก", 100, [0, 1, 2], 0], ["ข", 0.1, [0, 1, 2], 1]] });
  assert.equal(sumRounded(a.r), a.r.grand);
  assert.equal(a.s.ok, true);
  assertBalanced(a.r, a.s);
  const b = trip({ members: ["1", "2"], items: [["ก", 100, [0, 1], 7]] });
  assert.equal(b.s.reason, "unpaid");
});

test("มื้ออาหาร: settleBill ใช้คนจ่ายระดับบิลแบบเดิม", () => {
  const app = loadApp();
  app.state.members = [{ id: "m0", name: "เอ" }, { id: "m1", name: "บี" }];
  app.state.menus = [{ id: "f0", name: "ข้าว", price: 100, eaters: ["m0", "m1"], payer: "m1" }];
  app.state.payers = [{ id: "m0", amount: null }];
  const s = app.settleBill(app.compute());
  assert.deepEqual(transfersText(s), ["บี>เอ:50"]);
});

/* ---- v3.1: มื้ออาหารข้างในทริป ---- */
function tripWithMeal({ members, items, meal, mealPayer, vat }){
  const app = loadApp();
  app.state.kind = "trip";
  app.state.members = members.map((name, i) => ({ id: "m" + i, name }));
  const charges = app.defaultCharges();
  if (vat) charges[1].on = true;
  app.state.menus = items.map(([name, price, eaters, payer], i) =>
    ({ id: "t" + i, name, price, eaters: eaters.map(n => "m" + n), payer: payer == null ? undefined : "m" + payer }));
  if (meal) app.state.menus.push({ id: "meal1", type: "meal", name: "มื้อเย็น", eaters: [], price: 0,
    payer: mealPayer == null ? undefined : "m" + mealPayer,
    meal: { menus: meal.map(([name, price, eaters], i) => ({ id: "f" + i, name, price, eaters: eaters.map(n => "m" + n) })), shared: [], charges } });
  const r = app.compute();
  return { app, r, s: app.settleBill(r) };
}

test("ทริป + มื้ออาหาร: ยอดรายคน = ส่วนที่หารเท่า + ส่วนที่กินจริง", () => {
  // ที่พัก 900 (3 คน, เอจ่าย) + มื้อเย็น: ส้มตำ 90 (เอ+บี), ไก่ 120 (ซีคนเดียว) บีจ่ายมื้อนี้
  const { r, s } = tripWithMeal({ members: ["เอ", "บี", "ซี"],
    items: [["ที่พัก", 900, [0, 1, 2], 0]], meal: [["ส้มตำ", 90, [0, 1]], ["ไก่", 120, [2]]], mealPayer: 1 });
  assert.deepEqual({ ...byName(r) }, { "เอ": 345, "บี": 345, "ซี": 420 });
  assert.equal(r.grand, 1110);
  assert.equal(sumRounded(r), r.grand);
  assert.equal(s.ok, true);
  assert.deepEqual({ ...s.paid }, { m0: 900, m1: 210 });
  assertBalanced(r, s);
});

test("ทริป + มื้ออาหาร: VAT ของมื้อคิดเฉพาะในมื้อนั้น และเศษลงตัวทั้งทริป", () => {
  const { r, s } = tripWithMeal({ members: ["1", "2", "3"],
    items: [["น้ำมัน", 100, [0, 1, 2], 2]], meal: [["ก", 99.99, [0, 1, 2]], ["ข", 13.5, [0]]], mealPayer: 0, vat: true });
  assert.equal(r.rate, 0);                                   // ระดับทริปไม่มี VAT
  assert.equal(r.grand, Math.round((100 + (99.99 + 13.5) * 1.07) * 100) / 100);
  assert.equal(sumRounded(r), r.grand);
  assert.equal(s.ok, true);
  assertBalanced(r, s);
});

test("ทริป + มื้ออาหาร: มื้อที่ยังไม่ระบุคนจ่ายถูกแจ้ง แต่มื้อว่างไม่ถูกนับ", () => {
  const a = tripWithMeal({ members: ["เอ", "บี"], items: [["ที่พัก", 100, [0, 1], 0]], meal: [["ข้าว", 50, [0, 1]]] });
  assert.equal(a.s.reason, "unpaid");
  assert.equal(a.s.count, 1);
  const b = tripWithMeal({ members: ["เอ", "บี"], items: [["ที่พัก", 100, [0, 1], 0]], meal: [] });
  assert.equal(b.s.ok, true);
  assert.equal(b.r.grand, 100);
});

test("ทริป + มื้ออาหาร: เมนูในมื้อที่ไม่มีคนกินนับเป็น orphan", () => {
  const { r } = tripWithMeal({ members: ["เอ"], items: [], meal: [["ข้าว", 40, [0]], ["ไม่มีใครกิน", 500, []]], mealPayer: 0 });
  assert.equal(r.grand, 40);
  assert.equal(r.orphan, 1);
});

/* ---- v3.2: settleBill กับบิลที่ไม่ได้เปิดอยู่ + ติ๊กว่าโอนแล้ว ---- */
test("settleBill(r, b): คิดบิลจากประวัติได้โดยไม่แตะ state", () => {
  const app = loadApp();
  const b = { kind: "trip", members: [{ id: "a", name: "เอ" }, { id: "b", name: "บี" }],
    menus: [{ id: "x", name: "ที่พัก", price: 1000, eaters: ["a", "b"], payer: "a" }], shared: [], charges: app.defaultCharges(), payers: [] };
  const r = app.computeBill(b);
  const s = app.settleBill(r, b);
  assert.deepEqual(transfersText(s), ["บี>เอ:500"]);
  assert.equal(app.state.members.length, 0);
});

test("ติ๊กโอนแล้ว: นับครบเมื่อติ๊กทุกรายการ และยอดเปลี่ยน = ติ๊กเดิมไม่นับ", () => {
  const app = loadApp();
  const t1 = { from: "b", to: "a", amount: 500 }, t2 = { from: "c", to: "a", amount: 120.5 };
  const paid = {};
  assert.deepEqual({ ...app.paidProgress([t1, t2], paid) }, { done: 0, total: 2, all: false });
  paid[app.transferKey(t1)] = true;
  paid[app.transferKey(t2)] = true;
  assert.equal(app.paidProgress([t1, t2], paid).all, true);
  assert.equal(app.paidProgress([t1, { from: "c", to: "a", amount: 130 }], paid).done, 1);
  assert.equal(app.paidProgress([], paid).all, false);
});
