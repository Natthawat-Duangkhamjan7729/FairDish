// ทุกไฟล์ใน js/ ต้อง parse ผ่าน — กันพิมพ์เครื่องหมายคำพูดผิดแล้วทั้งไฟล์ไม่ทำงาน
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dir = path.join(__dirname, "..", "js");
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".js"))){
  test("parse ผ่าน: js/" + f, () => {
    assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(dir, f), "utf8"), { filename: f }));
  });
}
