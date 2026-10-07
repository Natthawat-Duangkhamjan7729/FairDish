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

// v4.11: ทุกไฟล์แชร์ global ร่วมกัน — ชื่อฟังก์ชันซ้ำ = ตัวที่โหลดทีหลังทับตัวแรกเงียบ ๆ
// (v4.9 เคยมี joinGroup() สองตัว ช่องวางลิงก์เข้ากลุ่มในหน้าประวัติเลยพัง)
test("ไม่มีชื่อฟังก์ชันระดับบนสุดซ้ำกันข้ามไฟล์", () => {
  const seen = {}, dup = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".js"))){
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    let m;
    while ((m = re.exec(src))){
      if (seen[m[1]]) dup.push(m[1] + " (" + seen[m[1]] + ", " + f + ")");
      else seen[m[1]] = f;
    }
  }
  assert.deepEqual(dup, []);
});

// งาน 6.1: ขนาดตัวอักษรมาจาก type scale เดียว — นอก :root ห้ามเขียน font-size เป็นตัวเลขตายตัว
test("CSS: font-size ทุกจุดใช้ตัวแปร type scale (ไม่มีขนาดตายตัวนอก :root)", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const bad = [];
  const re = /font-size\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(css))) if (!/^(var\(--(fs|icon)-[a-z0-9-]+\)|inherit)\s*$/.test(m[1].trim())) bad.push(m[0]);
  assert.deepEqual(bad, []);
});
