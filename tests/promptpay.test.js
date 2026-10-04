// QR พร้อมเพย์ (มาตรฐาน EMVCo) — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadApp(){
  const ctx = vm.createContext({});
  for (const f of ["qr.js", "promptpay.js"]){
    const file = path.join(__dirname, "..", "js", f);
    vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  }
  return ctx;
}

test("CRC-16/CCITT-FALSE ตรงค่ามาตรฐาน", () => {
  assert.equal(loadApp().crc16("123456789"), "29B1");
});

test("รับเบอร์มือถือ/เลขบัตรหลายรูปแบบ และปฏิเสธรูปแบบผิด", () => {
  const app = loadApp();
  assert.equal(app.cleanPromptPay("081-234-5678"), "0812345678");
  assert.equal(app.cleanPromptPay("+66812345678"), "0812345678");
  assert.equal(app.cleanPromptPay("1 2345 67890 12 3"), "1234567890123");
  assert.equal(app.cleanPromptPay("12345"), "");
  assert.equal(app.cleanPromptPay("abcdefghij"), "");
  assert.equal(app.maskPromptPay("0812345678"), "081-xxx-5678");
});

test("ข้อความ QR จากเบอร์มือถือพร้อมยอด", () => {
  const p = loadApp().promptPayPayload("0812345678", 120.5);
  assert.equal(p.slice(0, -4),
    "000201" + "010212" + "2937" + "0016A000000677010111" + "01130066812345678" +
    "5802TH" + "5303764" + "5406120.50" + "6304");
  assert.match(p, /[0-9A-F]{4}$/);
});

test("เลขบัตร 13 หลักใช้ช่อง 02 และไม่มียอด = QR ใช้ซ้ำได้", () => {
  const p = loadApp().promptPayPayload("1234567890123");
  assert.ok(p.startsWith("000201010211" + "2937" + "0016A000000677010111" + "02131234567890123"));
  assert.ok(!p.includes("5406"));
});

test("CRC ท้ายข้อความถูกต้อง และเข้ารหัสเป็น QR ได้", () => {
  const app = loadApp();
  const p = app.promptPayPayload("0899999999", 9999.99);
  assert.equal(p.slice(-4), app.crc16(p.slice(0, -4)));
  assert.ok(app.QR.encode(p));
  assert.equal(app.promptPayPayload("123"), "");
});

test("ตรงกับตัวอย่างอ้างอิงของไลบรารี promptpay-qr", () => {
  const app = loadApp();
  assert.equal(app.promptPayPayload("000-000-0000", 4.22),
    "00020101021229370016A000000677010111011300660000000005802TH530376454044.226304E469");
  assert.equal(app.promptPayPayload("0812345678"),
    "00020101021129370016A000000677010111011300668123456785802TH530376463045D82");
});
