// ตรวจระบบของเครื่องสำหรับหน้าต่างวิธีติดตั้งแอป — รันด้วย `node --test`
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadApp(){
  // install.js ผูก event กับ window ตอนโหลด จึงใส่ window ปลอมที่มีแค่ addEventListener
  const ctx = vm.createContext({ window: { addEventListener(){} } });
  const file = path.join(__dirname, "..", "js", "install.js");
  vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  return ctx;
}

const UA = {
  iphone:  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  ipadOS:  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  lineIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.15.0",
  fbAndroid: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]"
};

test("ตรวจระบบจาก user agent", () => {
  const app = loadApp();
  assert.equal(app.detectPlatform(UA.iphone, "iPhone", 5), "ios");
  assert.equal(app.detectPlatform(UA.ipadOS, "MacIntel", 5), "ios");      // iPad ที่แสร้งเป็น Mac
  assert.equal(app.detectPlatform(UA.ipadOS, "MacIntel", 0), "desktop");  // Mac จริงไม่มีจอสัมผัส
  assert.equal(app.detectPlatform(UA.android, "Linux armv8l", 5), "android");
  assert.equal(app.detectPlatform(UA.windows, "Win32", 0), "desktop");
  assert.equal(app.detectPlatform("", "", 0), "desktop");
});

test("รู้ว่าเปิดผ่านเบราว์เซอร์ในแอปแชต", () => {
  const app = loadApp();
  assert.equal(app.detectInApp(UA.lineIos), "line");
  assert.equal(app.detectInApp(UA.fbAndroid), "facebook");
  assert.equal(app.detectInApp("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/430.0]"), "messenger");
  assert.equal(app.detectInApp("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6"), "tiktok");
  assert.equal(app.detectInApp(UA.iphone), "");
  assert.equal(app.detectInApp(UA.android), "");
});
