// ทดสอบส่วนกลุ่มที่ไม่แตะ DOM / เครือข่าย — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadApp(){
  const ctx = vm.createContext({});
  for (const f of ["config.js", "i18n.js", "state.js", "cloud.js", "calc.js", "save.js", "confirm.js"]){
    const file = path.join(__dirname, "..", "js", f);
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  }
  return ctx;
}
const plain = x => JSON.parse(JSON.stringify(x));

test("แยกเส้นทางหน้ากลุ่ม", () => {
  const app = loadApp();
  assert.deepEqual(plain(app.parseGroupPath("/g/0123456789ab")), { id: "0123456789ab", key: "", bill: false, me: false, share: false });
  assert.deepEqual(plain(app.parseGroupPath("/g/0123456789ab/bill")), { id: "0123456789ab", key: "", bill: true, me: false, share: false });
  assert.deepEqual(plain(app.parseGroupPath("/g/0123456789ab/me")), { id: "0123456789ab", key: "", bill: false, me: true, share: false });
  assert.deepEqual(plain(app.parseGroupPath("/g/0123456789ab/share")), { id: "0123456789ab", key: "", bill: false, me: false, share: true });
  assert.equal(app.parseGroupPath("/split"), null);
  assert.equal(app.parseGroupPath("/g/"), null);
  assert.equal(app.parseGroupPath("/g/abc/other"), null);
});

test("รหัสกลุ่มต้องเป็นเลขฐานสิบหก 12 ตัว", () => {
  const app = loadApp();
  assert.equal(app.isGroupId("0123456789ab"), true);
  assert.equal(app.isGroupId("0123456789AB"), false);
  assert.equal(app.isGroupId("0123456789a"), false);
  assert.equal(app.isGroupId("<script>1234"), false);
  assert.equal(app.isGroupId(undefined), false);
});

test("รับได้ทั้งลิงก์เต็มและรหัสกลุ่ม", () => {
  const app = loadApp();
  assert.equal(app.groupIdFromInput("https://fairdish.vercel.app/#/g/0123456789ab"), "0123456789ab");
  assert.equal(app.groupIdFromInput("  https://fairdish.vercel.app/#/g/0123456789AB/bill "), "0123456789ab");
  assert.equal(app.groupIdFromInput("0123456789ab"), "0123456789ab");
  assert.equal(app.groupIdFromInput("https://fairdish.vercel.app/#/g/0123456789abc"), "");
  assert.equal(app.groupIdFromInput("สวัสดี"), "");
});

test("applyBill: ไม่มีข้อมูล = บิลว่างพร้อมค่าบริการตั้งต้น", () => {
  const app = loadApp();
  app.state.members = [{ id: "i1", name: "เอ" }];
  app.applyBill(null);
  assert.equal(app.state.members.length, 0);
  assert.deepEqual(plain(app.state.charges.map(c => c.id)), ["svc", "vat"]);
});

test("applyBill: ตั้งตัวนับ id ต่อจากของเดิม ไม่ให้ id ชนกัน", () => {
  const app = loadApp();
  app.applyBill({
    members: [{ id: "i2", name: "เอ" }],
    menus: [{ id: "i5", name: "ลาบ", price: "80", eaters: ["i2"] }],
    shared: [],
    charges: [{ id: "i9", label: "ค่าเปิดขวด", rate: 5, on: true, fixed: false }]
  });
  assert.equal(app.state.menus[0].price, 80);
  assert.match(app.nid(), /^i10_[a-z0-9]+$/);   // v4.13.1: มีส่วนสุ่มต่อท้าย
});

test("v4.2: ไม่เก็บข้อมูลอื่นของคน — เบอร์พร้อมเพย์ (pp) ที่บันทึกไว้จาก v4.1 ถูกทิ้ง", () => {
  const app = loadApp();
  app.applyBill({ members: [{ id: "i1", name: "เอ", pp: "0812345678" }, { id: "i2", name: "บี", pp: "1234567890123", extra: 1 }] });
  assert.deepEqual(plain(app.state.members), [{ id: "i1", name: "เอ" }, { id: "i2", name: "บี" }]);
  assert.equal(JSON.stringify(app.serialize()).includes("0812345678"), false);
  assert.equal(JSON.stringify(app.serialize()).includes("1234567890123"), false);
});
