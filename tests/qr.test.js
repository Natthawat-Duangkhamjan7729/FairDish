// ตรวจโครงสร้าง QR ที่สร้างเอง (การถอดรหัสจริงทดสอบด้วยเบราว์เซอร์ใน e2e) — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadQR(){
  const ctx = vm.createContext({ TextEncoder });
  const file = path.join(__dirname, "..", "js", "qr.js");
  vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  return ctx.QR;
}

test("เลือกเวอร์ชันเล็กสุดที่ใส่ลิงก์ได้ และปฏิเสธข้อความที่ยาวเกิน", () => {
  const QR = loadQR();
  assert.equal(QR.pickVersion(44), 5);       // https://fairdish.vercel.app/#/g/<12>
  assert.equal(QR.pickVersion(119), 10);
  assert.equal(QR.pickVersion(120), 11);     // v4.11: ถึงเวอร์ชัน 15 (ลิงก์กลุ่มที่มีกุญแจเข้ารหัส)
  assert.equal(QR.pickVersion(220), 15);
  assert.equal(QR.pickVersion(221), 0);
  assert.equal(QR.encode("x".repeat(221)), null);
  assert.equal(QR.encode("x".repeat(150)).size, 12 * 4 + 17);
});

test("ขนาดและ finder pattern ถูกต้อง", () => {
  const QR = loadQR();
  const q = QR.encode("https://fairdish.vercel.app/#/g/0123456789ab");
  assert.equal(q.size, 5 * 4 + 17);
  // finder มุมซ้ายบน: กรอบนอกดำ วงในขาว จุดกลาง 3×3 ดำ
  for (let i = 0; i < 7; i++){ assert.ok(q.dark(i, 0)); assert.ok(q.dark(0, i)); assert.ok(q.dark(6, i)); }
  for (let i = 1; i < 6; i++) assert.ok(!q.dark(i, 1));
  assert.ok(q.dark(3, 3));
  // โมดูลดำบังคับข้าง finder ล่างซ้าย
  assert.ok(q.dark(8, q.size - 8));
});

test("format bits อ่านกลับได้เป็นระดับ H และมาสก์ที่เลือก", () => {
  const QR = loadQR();
  const q = QR.encode("ไทย 🍲 FairDish");
  let bits = 0;
  for (let i = 0; i <= 5; i++) bits |= (q.dark(8, i) ? 1 : 0) << i;
  bits |= (q.dark(8, 7) ? 1 : 0) << 6;
  bits |= (q.dark(8, 8) ? 1 : 0) << 7;
  bits |= (q.dark(7, 8) ? 1 : 0) << 8;
  for (let i = 9; i < 15; i++) bits |= (q.dark(14 - i, 8) ? 1 : 0) << i;
  const data = (bits ^ 0x5412) >>> 10;
  assert.equal(data >>> 3, 2);              // 0b10 = ระดับ H
  assert.equal(data & 7, q.mask);
});
