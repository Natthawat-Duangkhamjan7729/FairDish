/* FairDish — ภาษา (v4.0): เขียนข้อความเป็นภาษาไทยในโค้ดตามเดิม แล้วครอบด้วย L("…")
   โหมด EN จะหาคำแปลจาก EN โดยใช้ข้อความไทยเป็นคีย์ ไม่เจอ = แสดงภาษาไทย
   ข้อความที่มีค่าแทรกเขียนเป็น L("ลบ {name} แล้ว", { name:x }) — อย่าต่อสตริงก่อนส่งเข้า L() */
"use strict";

var LANG = "th";
var LANG_KEY = "fairdish:lang:v1";
var EN = {};

/** แปลข้อความ + แทนค่า {ชื่อ} — vars เป็นข้อความธรรมดา ผู้เรียกต้อง esc() เองถ้าจะใส่ใน HTML */
function L(th, vars){
  var s = LANG === "en" && Object.prototype.hasOwnProperty.call(EN, th) ? EN[th] : th;
  if (vars) s = s.replace(/\{(\w+)\}/g, function(m, k){ return vars[k] != null ? String(vars[k]) : m; });
  return s;
}
/** รูปแบบวันที่ตามภาษา */
function dateLocale(){ return LANG === "en" ? "en-GB" : "th-TH"; }
function shortDate(t){
  return new Date(t).toLocaleDateString(dateLocale(), { day:"numeric", month:"short" });
}
function monthLabel(t){
  return new Date(t).toLocaleDateString(dateLocale(), { month:"long", year:"numeric" });
}
/** ข้อความคงที่ใน index.html (แถบล่าง เมนูบน ท้ายหน้า) ใส่ data-i18n="ข้อความไทย" ไว้ */
function applyStaticText(){
  document.documentElement.lang = LANG;
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function(el){
    el.textContent = L(el.getAttribute("data-i18n"));
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-label]"), function(el){
    el.setAttribute("aria-label", L(el.getAttribute("data-i18n-label")));
  });
}
