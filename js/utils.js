/* FairDish — ฟังก์ชันช่วย: จัดรูปแบบเงิน, escape HTML, ไอคอน */
"use strict";

var money = new Intl.NumberFormat("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
function baht(v){ return money.format(v); }
function esc(s){
  return String(s).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function nameOf(id){
  for (var i=0;i<state.members.length;i++) if (state.members[i].id===id) return state.members[i].name;
  return "";
}
function menusOf(memberId){
  return state.menus.filter(function(m){ return m.eaters.indexOf(memberId) >= 0; });
}
var ICON_EDIT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
var ICON_DEL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';
var ICON_X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var ICON_COPY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>';
var ICON_MORE='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
/* งาน 1.5: ไอคอนประเภทบิลแทนอีโมจิ 🍲 ✈️ 👥 — เส้นจากชุด Lucide (ISC license, lucide.dev) ขนาด 24 เส้นหนา 2 เท่ากับไอคอนอื่นในแอป */
var ICON_MEAL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';
var ICON_TRIP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';
var ICON_GROUP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
/** ไอคอนประเภทบิล (มื้ออาหาร / ทริป / ทริปแบบกลุ่ม) สำหรับหน้าแรก แถบซ้าย และแผ่นเลือกประเภท */
function kindIconHTML(kind){
  return '<span class="kind-svg" aria-hidden="true">'+(kind === "trip" ? ICON_TRIP : kind === "trip-group" ? ICON_GROUP : ICON_MEAL)+'</span>';
}
var ICON_SHARE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
/** เลื่อนจอไปตำแหน่ง y ทันที — html มี scroll-behavior:smooth ทำให้ window.scrollTo(0,y) เป็นแอนิเมชัน
    แล้วแย่งกับการเลื่อนครั้งถัดไป (เช่น การสอนเลื่อนหาปุ่มหลังเปลี่ยนหน้า แล้วถูกดึงกลับขึ้นบนสุด) */
function jumpTo(y){
  try { window.scrollTo({ top:y, left:0, behavior:"instant" }); } catch(e){ window.scrollTo(0, y); }
}
