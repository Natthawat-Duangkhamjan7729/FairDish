// v4.11: เข้ารหัสบิลกลุ่ม (js/seal.js) + ลิงก์กลุ่มที่มีกุญแจ — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dir = path.join(__dirname, "..", "js");
function load(files){
  const ctx = vm.createContext({ crypto: globalThis.crypto, TextEncoder, TextDecoder, ui:{ groupKeys:{}, myGroups:[] }, location:{ origin:"https://fairdish.vercel.app", pathname:"/" } });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
  return ctx;
}

test("เข้ารหัสแล้วเปิดกลับได้ครบ และเซิร์ฟเวอร์เห็นแค่ข้อมูลที่อ่านไม่ออก", async () => {
  const { Seal } = load(["seal.js"]);
  const key = Seal.newKey();
  assert.ok(Seal.isKey(key));
  const bill = { name:"ทริปเชียงใหม่", data:{ members:[{ id:"i1", name:"มาร์ค" }], menus:[{ id:"i2", name:"ที่พัก", price:5800 }] } };
  const box = await Seal.lock(bill, key);
  assert.ok(Seal.sealed(box));
  const raw = JSON.stringify(box);
  for (const word of ["มาร์ค", "ที่พัก", "5800", "เชียงใหม่", "members"]) assert.ok(!raw.includes(word), "ไม่ควรเห็น " + word);
  assert.equal(JSON.stringify(await Seal.open(box, key)), JSON.stringify(bill));
});

test("กุญแจผิดหรือข้อมูลถูกแก้ = เปิดไม่ได้", async () => {
  const { Seal } = load(["seal.js"]);
  const box = await Seal.lock({ a:1 }, Seal.newKey());
  await assert.rejects(Seal.open(box, Seal.newKey()));
  const key = Seal.newKey(), box2 = await Seal.lock({ a:1 }, key);
  const ct = Seal._unb64u(box2.ct); ct[0] ^= 1;
  await assert.rejects(Seal.open({ v:1, iv:box2.iv, ct:Seal._b64u(ct) }, key));
});

test("เข้ารหัสซ้ำได้ผลต่างกันทุกครั้ง (iv สุ่ม) และ base64url กลับได้ทุกความยาว", async () => {
  const { Seal } = load(["seal.js"]);
  const key = Seal.newKey();
  assert.notEqual((await Seal.lock({ a:1 }, key)).ct, (await Seal.lock({ a:1 }, key)).ct);
  for (let n = 0; n < 40; n++){
    const bytes = Uint8Array.from({ length:n }, (_, i) => (i * 37 + n) & 255);
    assert.deepEqual(Array.from(Seal._unb64u(Seal._b64u(bytes))), Array.from(bytes));
  }
});

test("ลิงก์กลุ่มมีกุญแจ และอ่านกลับได้ทั้งจาก route และช่องวางลิงก์", () => {
  const ctx = load(["seal.js", "cloud.js"]);
  ctx.ui.groupKeys["0123456789ab"] = "AbCdEfGhIjKlMn_-";
  assert.equal(ctx.groupLink("0123456789ab"), "https://fairdish.vercel.app/#/g/0123456789ab.AbCdEfGhIjKlMn_-");
  const p = ctx.parseGroupPath("/g/0123456789ab.AbCdEfGhIjKlMn_-/me");
  assert.equal(p.id, "0123456789ab"); assert.equal(p.key, "AbCdEfGhIjKlMn_-"); assert.ok(p.me);
  assert.equal(ctx.parseGroupPath("/g/0123456789ab").key, "");
  assert.equal(ctx.groupIdFromInput("https://x.app/#/g/0123456789ab.AbCdEfGhIjKlMn_-/me"), "0123456789ab");
  assert.equal(ctx.groupHashFromInput("ดูบิล https://fairdish-git-x.vercel.app/#/g/0123456789AB.AbCdEfGhIjKlMn_-/me นะ"), "#/g/0123456789ab.AbCdEfGhIjKlMn_-/me");
  assert.equal(ctx.groupHashFromInput("0123456789ab"), "#/g/0123456789ab");
  assert.equal(ctx.groupHashFromInput("hello"), "");
});
