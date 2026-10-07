// v4.13.1: รวมข้อมูลตอนบันทึกชนกับเพื่อนในกลุ่ม (mergeBills ใน save.js) — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadApp(){
  const ctx = vm.createContext({});
  for (const f of ["config.js", "i18n.js", "state.js", "calc.js", "save.js", "confirm.js"]){
    const file = path.join(__dirname, "..", "js", f);
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  }
  return ctx;
}
const app = loadApp();
const plain = x => JSON.parse(JSON.stringify(x));
const names = list => plain(list).map(x => x.name);
function bill(extra){
  return Object.assign({ kind:"trip", name:"ทริป", members:[{ id:"m1", name:"A" }, { id:"m2", name:"B" }],
    menus:[{ id:"x1", name:"ที่พัก", price:900, eaters:["m1","m2"], payer:"m1" }], shared:[], payers:[], paid:{}, confirms:{} }, extra);
}

test("รหัสรายการใหม่ไม่ซ้ำกันแม้เลขนับเท่ากัน", () => {
  const a = loadApp(), b = loadApp();
  assert.notEqual(a.nid(), b.nid());
});

test("สองเครื่องเพิ่มรายการพร้อมกัน → ได้ทั้งสองรายการ", () => {
  const base = bill();
  const mine = bill({ menus: base.menus.concat({ id:"i2_aaaa", name:"น้ำมัน", price:500, eaters:["m1","m2"], payer:"m1" }) });
  const theirs = bill({ menus: base.menus.concat({ id:"i2_bbbb", name:"ตั๋ว", price:200, eaters:["m1","m2"], payer:"m2" }) });
  assert.deepEqual(names(app.mergeBills(base, mine, theirs).menus), ["ที่พัก", "ตั๋ว", "น้ำมัน"]);
});

test("เราลบรายการ เพื่อนไม่ได้แตะ = ลบ · เพื่อนลบ เราไม่ได้แตะ = ลบ", () => {
  const base = bill({ menus: bill().menus.concat({ id:"x2", name:"ข้าว", price:100, eaters:["m1"] }) });
  const mine = bill({ menus: [base.menus[1]] });                       // เราลบที่พัก
  const theirs = bill({ menus: [base.menus[0]] });                     // เพื่อนลบข้าว
  assert.deepEqual(plain(app.mergeBills(base, mine, theirs).menus), []);
});

test("เพื่อนแก้รายการที่เราลบ = เก็บของเพื่อนไว้", () => {
  const base = bill();
  const mine = bill({ menus: [] });
  const theirs = bill({ menus: [Object.assign({}, base.menus[0], { price:1200 })] });
  assert.equal(app.mergeBills(base, mine, theirs).menus[0].price, 1200);
});

test("แก้คนละช่อง: ของที่เราแก้ใช้ของเรา ของที่เราไม่ได้แตะใช้ของเพื่อน", () => {
  const base = bill();
  const mine = bill({ name:"ทริปเชียงใหม่", members: base.members.concat({ id:"i3_cccc", name:"C" }) });
  const theirs = bill({ menus:[Object.assign({}, base.menus[0], { price:1000 })], paid:{ "m2>m1:450":true } });
  const out = app.mergeBills(base, mine, theirs);
  assert.equal(out.name, "ทริปเชียงใหม่");
  assert.deepEqual(names(out.members), ["A", "B", "C"]);
  assert.equal(out.menus[0].price, 1000);
  assert.deepEqual(plain(out.paid), { "m2>m1:450":true });
});

test("ติ๊กโอน/ยืนยันเมนูรวมทีละคีย์ — เราเอาติ๊กออก เพื่อนติ๊กอีกอัน", () => {
  const base = bill({ paid:{ k1:true }, confirms:{ m1:{ at:"1", sig:"a" } } });
  const mine = bill({ paid:{}, confirms:{ m1:{ at:"1", sig:"a" } } });
  const theirs = bill({ paid:{ k1:true, k2:true }, confirms:{ m1:{ at:"1", sig:"a" }, m2:{ at:"2", sig:"b" } } });
  const out = app.mergeBills(base, mine, theirs);
  assert.deepEqual(plain(out.paid), { k2:true });
  assert.deepEqual(Object.keys(out.confirms).sort(), ["m1", "m2"]);
});

test("มื้อในทริปที่สองฝั่งแก้ข้างใน → รวมเมนูในมื้อ", () => {
  const meal = { id:"i5_meal", type:"meal", name:"มื้อที่ 1", price:0, eaters:[], payer:"m1", meal:{ menus:[], shared:[], charges:[] } };
  const base = bill({ menus:[meal] });
  const withMenu = (id, name) => bill({ menus:[Object.assign({}, meal, { meal:{ menus:[{ id, name, price:50, eaters:["m1"] }], shared:[], charges:[] } })] });
  const out = app.mergeBills(base, withMenu("i6_a", "ส้มตำ"), withMenu("i6_b", "ไก่ย่าง"));
  assert.deepEqual(names(out.menus[0].meal.menus), ["ไก่ย่าง", "ส้มตำ"]);
});

test("ไม่รู้ข้อมูลตั้งต้น → ไม่ทิ้งของใครเลย", () => {
  const mine = bill({ menus:[{ id:"a", name:"A1", price:1, eaters:["m1"] }] });
  const theirs = bill({ menus:[{ id:"b", name:"B1", price:1, eaters:["m1"] }] });
  assert.deepEqual(names(app.mergeBills(null, mine, theirs).menus), ["B1", "A1"]);
});

test("v4.15: หลายคนจ่ายรายการเดียว — normalizeBill เก็บไว้ และรวมข้อมูลแล้วไม่หาย", () => {
  const two = { id:"x1", name:"ที่พัก", price:900, eaters:["m1","m2"], payer:"m1", payers:["m1","m2"] };
  assert.deepEqual(plain(app.normalizeBill(bill({ menus:[two] })).menus[0].payers), ["m1","m2"]);
  const base = bill();
  const merged = app.mergeBills(base, bill({ menus:[two] }), base);
  assert.deepEqual(plain(merged.menus[0].payers), ["m1","m2"]);
});
