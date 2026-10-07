// v4.1: เพื่อนยืนยันเมนูของตัวเอง (ส่วนที่ไม่แตะ DOM) — ตรรกะจาก v4.0 รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadApp(){
  const ctx = vm.createContext({});
  for (const f of ["config.js", "i18n.js", "state.js", "cloud.js", "save.js", "calc.js", "confirm.js"]){
    const file = path.join(__dirname, "..", "js", f);
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  }
  return ctx;
}
const plain = x => JSON.parse(JSON.stringify(x));

function mealBill(){
  return {
    kind: "meal",
    members: [{ id: "a", name: "เอ" }, { id: "b", name: "บี" }, { id: "c", name: "ซี" }],
    menus: [
      { id: "m1", name: "ลาบ", price: 90, eaters: ["a", "b", "c"] },
      { id: "m2", name: "ซอยจุ๊", price: 150, eaters: ["a"] },
      { id: "m3", name: "ไข่เจียว", price: 60, eaters: ["b"] }
    ],
    shared: [{ id: "s1", name: "น้ำแข็ง", price: 30 }],
    charges: [{ id: "svc", label: "ค่าบริการ", rate: 10, on: true, fixed: true }]
  };
}
function tripBill(){
  return {
    kind: "trip",
    members: [{ id: "a", name: "เอ" }, { id: "b", name: "บี" }],
    menus: [
      { id: "t1", name: "ที่พัก", price: 1000, eaters: ["a", "b"], payer: "a" },
      { id: "t2", type: "meal", name: "มื้อเย็น", price: 0, eaters: [], payer: "b", meal: {
        menus: [{ id: "x1", name: "ส้มตำ", price: 60, eaters: ["a", "b"] }, { id: "x2", name: "ไก่ย่าง", price: 120, eaters: ["a"] }],
        shared: [], charges: [] } }
    ],
    shared: [], charges: []
  };
}

test("itemsOf: ทริปรวมเมนูในมื้ออาหารด้วย และ key ไม่ซ้ำกัน", () => {
  const items = loadApp().itemsOf(tripBill());
  assert.deepEqual(plain(items.map(i => i.key)), ["t1", "t2/x1", "t2/x2"]);
  assert.equal(items[1].group, "มื้อเย็น");
});

test("ยืนยันเมนู: ติ๊ก = มีชื่อ ไม่ติ๊ก = เอาชื่อออก และสถานะเปลี่ยนเมื่อมีคนแก้ทีหลัง", () => {
  const app = loadApp();
  const d = mealBill();
  assert.equal(app.confirmStatusOf(d, "b"), "pending");
  assert.equal(app.applyConfirm(d, "b", { m1: true, m2: true }, "2026-10-04T10:00:00Z"), true);
  assert.deepEqual(plain(d.menus.map(m => m.eaters)), [["a", "b", "c"], ["a", "b"], []]);
  assert.equal(app.confirmStatusOf(d, "b"), "confirmed");
  d.menus[0].eaters = ["a", "c"];
  assert.equal(app.confirmStatusOf(d, "b"), "changed");
});

test("ยืนยันเมนู: ไม่มีชื่อนี้ในบิลแล้ว = ไม่แก้อะไร", () => {
  const app = loadApp();
  const d = mealBill();
  const before = JSON.stringify(d);
  assert.equal(app.applyConfirm(d, "zz", { m1: true }), false);
  assert.equal(JSON.stringify(d), before);
});

test("ยืนยันเมนูในทริป: แก้เมนูในมื้ออาหารข้างในได้ และยอดรวมยังเท่ายอดบิล", () => {
  const app = loadApp();
  const d = tripBill();
  app.applyConfirm(d, "b", { "t1": true, "t2/x1": true, "t2/x2": true });
  assert.deepEqual(plain(d.menus[1].meal.menus.map(m => m.eaters)), [["a", "b"], ["a", "b"]]);
  const r = app.computeBill(app.normalizeBill(d));
  const sum = Math.round(r.list.reduce((a, p) => a + p.rounded, 0) * 100) / 100;
  assert.equal(sum, r.grand);
  assert.equal(r.grand, 1180);
});

test("applyBill/serialize เก็บการยืนยัน ข้อมูลผิดรูปแบบถูกทิ้ง", () => {
  const app = loadApp();
  app.applyBill({ confirms: { a: { at: "x", sig: "m1" }, b: "bad", c: { at: "y" } } });
  assert.deepEqual(plain(app.state.confirms), { a: { at: "x", sig: "m1" } });
  assert.deepEqual(plain(app.serialize().confirms), { a: { at: "x", sig: "m1" } });
  app.applyBill({ confirms: [1, 2] });
  assert.deepEqual(plain(app.state.confirms), {});
});

/* งาน 4.3: ประวัติการเปลี่ยนสถานะ (log) */
test("log: บิลเดิมที่ไม่มี log ใช้ได้เหมือนเดิม และ serialize ไม่เพิ่มฟิลด์ log ให้บิลที่ไม่มีประวัติ", () => {
  const app = loadApp();
  app.applyBill(mealBill());
  assert.deepEqual(plain(app.state.log), []);
  assert.equal("log" in plain(app.serialize()), false);
  assert.equal("log" in plain(app.normalizeBill(mealBill())), false);
});

test("log: เก็บเฉพาะรูปแบบที่ถูกต้อง เรียงตามเวลา ไม่เกิน 100 รายการ และเก็บแค่รหัสสมาชิก", () => {
  const app = loadApp();
  const raw = [{ id: "e2", at: "2026-10-07T10:00:02Z", ev: "paid", who: "a", to: "b", amt: 50, name: "ห้ามเก็บ", phone: "081" },
    { id: "e1", at: "2026-10-07T10:00:01Z", ev: "join", who: "a", by: "a" },
    { id: "x", at: "2026-10-07T10:00:03Z", ev: "hack" }, "bad", { at: "z", ev: "join" }];
  const log = plain(app.cleanLog(raw));
  assert.deepEqual(log.map(e => e.id), ["e1", "e2"]);
  assert.deepEqual(log[1], { id: "e2", at: "2026-10-07T10:00:02Z", ev: "paid", who: "a", to: "b", amt: 50 });
  const many = Array.from({ length: 130 }, (_, i) => ({ id: "n" + i, at: new Date(Date.UTC(2026, 9, 7, 0, 0, i)).toISOString(), ev: "join", who: "a" }));
  const kept = app.cleanLog(many);
  assert.equal(kept.length, 100);
  assert.equal(kept[99].id, "n129");
});

test("log: addLog ต่อท้ายบิลดิบ และยืนยันเมนูแล้ว normalizeBill ยังมีประวัติ", () => {
  const app = loadApp();
  const d = mealBill();
  app.applyConfirm(d, "b", { m1: true });
  const e = app.addLog(d, "confirm", { who: "b", by: "b" });
  assert.equal(e.ev, "confirm");
  const b = app.normalizeBill(d);
  assert.deepEqual(plain(b.log).map(x => [x.ev, x.who, x.by]), [["confirm", "b", "b"]]);
  app.applyBill(d);
  assert.equal(app.serialize().log.length, 1);
});

test("log: บันทึกชนกัน รวมประวัติของทั้งสองเครื่องไม่ซ้ำ (mergeBills ไม่ถูกแก้ ประวัติรวมแยก)", () => {
  const app = loadApp();
  const base = [{ id: "e1", at: "2026-10-07T10:00:00Z", ev: "create", by: "a" }];
  const mine = base.concat([{ id: "e2", at: "2026-10-07T10:01:00Z", ev: "paidAll", by: "a" }]);
  const theirs = base.concat([{ id: "e3", at: "2026-10-07T10:00:30Z", ev: "confirm", who: "b", by: "b" }]);
  assert.deepEqual(plain(app.mergeLogs(mine, theirs)).map(e => e.id), ["e1", "e3", "e2"]);
  assert.deepEqual(plain(app.mergeLogs(undefined, theirs)).map(e => e.id), ["e1", "e3"]);
});
