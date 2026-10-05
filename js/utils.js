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
var ICON_SHARE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
/** เลื่อนจอไปตำแหน่ง y ทันที — html มี scroll-behavior:smooth ทำให้ window.scrollTo(0,y) เป็นแอนิเมชัน
    แล้วแย่งกับการเลื่อนครั้งถัดไป (เช่น การสอนเลื่อนหาปุ่มหลังเปลี่ยนหน้า แล้วถูกดึงกลับขึ้นบนสุด) */
function jumpTo(y){
  try { window.scrollTo({ top:y, left:0, behavior:"instant" }); } catch(e){ window.scrollTo(0, y); }
}
