/* FairDish — v4.11: เข้ารหัสบิลกลุ่มก่อนส่งขึ้นเซิร์ฟเวอร์ (AES-GCM ผ่าน WebCrypto ที่มีในเบราว์เซอร์ ไม่ใช้ไลบรารี)
   กุญแจ = ข้อความสุ่ม 16 ตัว (96 บิต) ต่อท้ายลิงก์กลุ่ม "#/g/<id>.<กุญแจ>" — ส่วนหลัง # ไม่ถูกส่งไปเซิร์ฟเวอร์
   ฐานข้อมูลเก็บแค่ { v:1, iv, ct } ถ้าหลุดก็อ่านชื่อคน/ยอดเงินไม่ได้ · ไม่แตะ DOM ทดสอบได้ใน tests/seal.test.js */
"use strict";

var Seal = (function(){
  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  function b64u(bytes){
    var s = "";
    for (var i = 0; i < bytes.length; i += 3){
      var n = (bytes[i] << 16) | ((bytes[i+1] || 0) << 8) | (bytes[i+2] || 0);
      s += B64[n >> 18 & 63] + B64[n >> 12 & 63] + (i+1 < bytes.length ? B64[n >> 6 & 63] : "") + (i+2 < bytes.length ? B64[n & 63] : "");
    }
    return s;
  }
  function unb64u(str){
    var out = [], buf = 0, bits = 0;
    for (var i = 0; i < str.length; i++){
      var v = B64.indexOf(str[i]);
      if (v < 0) throw new Error("bad base64");
      buf = (buf << 6) | v; bits += 6;
      if (bits >= 8){ bits -= 8; out.push((buf >> bits) & 255); }
    }
    return new Uint8Array(out);
  }
  function c(){ return (typeof crypto !== "undefined" && crypto) || null; }
  async function aesKey(secret){
    var hash = await c().subtle.digest("SHA-256", new TextEncoder().encode("fairdish:" + secret));
    return c().subtle.importKey("raw", hash, { name:"AES-GCM" }, false, ["encrypt", "decrypt"]);
  }
  return {
    /** เบราว์เซอร์นี้เข้ารหัสได้ไหม (ต้องเป็น https หรือ localhost) */
    ok: function(){ return !!(c() && c().subtle && c().getRandomValues); },
    /** กุญแจใหม่: 12 ไบต์สุ่ม → 16 ตัวอักษร (ใส่ในลิงก์ได้) */
    newKey: function(){ return b64u(c().getRandomValues(new Uint8Array(12))); },
    isKey: function(k){ return /^[A-Za-z0-9_-]{16}$/.test(String(k || "")); },
    /** ข้อมูลที่เข้ารหัสแล้วหน้าตาแบบนี้ */
    sealed: function(d){ return !!(d && d.v === 1 && typeof d.iv === "string" && typeof d.ct === "string"); },
    lock: async function(obj, secret){
      var iv = c().getRandomValues(new Uint8Array(12));
      var ct = await c().subtle.encrypt({ name:"AES-GCM", iv:iv }, await aesKey(secret), new TextEncoder().encode(JSON.stringify(obj)));
      return { v:1, iv:b64u(iv), ct:b64u(new Uint8Array(ct)) };
    },
    /** กุญแจผิด/ข้อมูลถูกแก้ = โยน error (AES-GCM ตรวจความถูกต้องให้) */
    open: async function(box, secret){
      var pt = await c().subtle.decrypt({ name:"AES-GCM", iv:unb64u(box.iv) }, await aesKey(secret), unb64u(box.ct));
      return JSON.parse(new TextDecoder().decode(pt));
    },
    _b64u: b64u, _unb64u: unb64u
  };
})();
