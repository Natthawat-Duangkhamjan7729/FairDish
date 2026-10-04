/* FairDish — ข้อความ QR พร้อมเพย์ (มาตรฐาน EMVCo ของ ธปท.) พร้อมยอดเงิน — ไม่แตะ DOM ทดสอบได้ใน tests/
   ใช้คู่กับ QR.encode() / QR.svg() ใน qr.js */
"use strict";

/** เบอร์มือถือ 10 หลัก (0xxxxxxxxx) หรือเลขบัตรประชาชน/เลขผู้เสียภาษี 13 หลัก → ตัวเลขล้วน หรือ "" ถ้าไม่ถูกรูปแบบ */
function cleanPromptPay(text){
  var d = String(text || "").replace(/[\s\-]/g, "");
  if (/^\+?66\d{9}$/.test(d)) d = "0" + d.replace(/^\+?66/, "");
  if (/^0\d{9}$/.test(d) || /^\d{13}$/.test(d)) return d;
  return "";
}
/** แสดงเบอร์แบบซ่อนกลาง เช่น 081-xxx-4567 / เลข 13 หลัก x-xxxx-xxxxx-12-3 */
function maskPromptPay(id){
  id = cleanPromptPay(id);
  if (id.length === 10) return id.slice(0,3)+"-xxx-"+id.slice(6);
  if (id.length === 13) return "x-xxxx-xxxxx-"+id.slice(10,12)+"-"+id.slice(12);
  return "";
}
/** CRC-16/CCITT-FALSE (เริ่ม 0xFFFF, poly 0x1021) เป็นเลขฐานสิบหก 4 ตัวพิมพ์ใหญ่ */
function crc16(s){
  var crc = 0xFFFF;
  for (var i=0;i<s.length;i++){
    crc ^= s.charCodeAt(i) << 8;
    for (var b=0;b<8;b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return ("000" + crc.toString(16).toUpperCase()).slice(-4);
}
function emvField(tag, value){ return tag + ("0" + value.length).slice(-2) + value; }
/**
 * ข้อความสำหรับ QR พร้อมเพย์ — id = เบอร์/เลขบัตร (ผ่าน cleanPromptPay แล้วหรือยังก็ได้), amount = บาท (ไม่ใส่ = ให้คนโอนพิมพ์ยอดเอง)
 * คืน "" ถ้าเบอร์ไม่ถูกรูปแบบ
 */
function promptPayPayload(id, amount){
  id = cleanPromptPay(id);
  if (!id) return "";
  var target = id.length === 10 ? emvField("01", "0066" + id.slice(1)) : emvField("02", id);
  var hasAmount = typeof amount === "number" && isFinite(amount) && amount > 0;
  var s = emvField("00", "01") +
    emvField("01", hasAmount ? "12" : "11") +                         // 12 = ใช้ครั้งเดียวพร้อมยอด, 11 = ใช้ซ้ำได้
    emvField("29", emvField("00", "A000000677010111") + target) +
    emvField("58", "TH") +
    emvField("53", "764") +                                           // บาท
    (hasAmount ? emvField("54", amount.toFixed(2)) : "") +
    "6304";
  return s + crc16(s);
}
