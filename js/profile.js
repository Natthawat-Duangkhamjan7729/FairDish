/* FairDish — v4.6: ชื่อที่ให้เราเรียก — ถามตอนใช้งานครั้งแรก (ต่อจากหน้าแนะนำ) เปลี่ยนได้ตลอดในหน้าตั้งค่า
   เก็บในเครื่องเท่านั้น (Store.profileKey) ไม่ไปกับข้อมูลบิล/กลุ่ม */
"use strict";

var nameThen = null;   // ทำต่อหลังตอบหน้าถามชื่อ (เช่น ไปการสอนต่อจากหน้าแนะนำ)

function cleanMyName(raw){ return String(raw || "").trim().replace(/\s+/g, " "); }
function myNameProblem(name){
  if (!name) return L("ยังไม่ได้พิมพ์ชื่อ");
  if (name.length > MAX_NAME) return L("ชื่อยาวเกิน {n} ตัวอักษร", { n:MAX_NAME });
  return "";
}
async function storeMyName(name){
  ui.myName = name;
  ui.nameAsked = true;
  try { await Store.saveProfile({ name:name, asked:true }); return true; }
  catch(e){ toast(L("บันทึกชื่อลงเครื่องไม่สำเร็จ ใช้ได้เฉพาะรอบนี้"),"error"); return false; }
}

/* ---- หน้าถามชื่อ (หน้าเต็ม ต่อจากหน้าแนะนำ — ไม่เด้งทับหน้าอื่น) ---- */
/** หน้าหลักแสดงหน้าถามชื่อแทน: ผ่านหน้าแนะนำแล้ว ยังไม่เคยถาม และไม่ได้อยู่ในการสอน (คนที่เคยใช้ก่อน v4.6 ก็ถามหนึ่งครั้ง) */
function needName(){ return !ui.showOnb && !ui.nameAsked && !ui.tour; }
function pageAskName(){
  return '<div class="'+(isWide() ? 'w-name ' : '')+'page page-onb page-name">'+
    '<div class="onb-top"><span class="onb-brand"><img class="logo-mark" src="img/logo.png" alt="" width="32" height="32"><b>FairDish</b></span>'+
      '<button class="link-btn" type="button" data-name-skip="1">'+L("ไว้ทีหลัง")+'</button></div>'+
    '<div class="onb-art"><span class="onb-circle sun" aria-hidden="true"></span>'+
      '<img class="name-mascot" src="img/mascot.png" alt="" width="220" height="220"></div>'+
    '<p class="eyebrow">'+L("ยินดีต้อนรับสู่ FairDish")+'</p>'+
    '<h1 class="onb-title" id="nameTitle">'+L("อยากให้เราเรียกคุณว่าอะไรดี?")+'</h1>'+
    '<p class="onb-body">'+L("ชื่อเล่นสั้น ๆ ก็ได้ เราจะใช้ทักทาย และช่วยใส่ชื่อคุณเข้าโต๊ะได้ในแตะเดียว เปลี่ยนได้ทุกเมื่อในหน้าตั้งค่า")+'</p>'+
    '<label class="sr-only" for="nameInput">'+L("ชื่อที่ให้เราเรียก")+'</label>'+
    '<input type="text" id="nameInput" placeholder="'+L("เช่น มาร์ค")+'" autocomplete="nickname" maxlength="'+MAX_NAME+'" aria-describedby="nameMsg">'+
    '<p class="field-msg muted" id="nameMsg" aria-live="polite"></p>'+
    '<button class="btn-main btn-block" type="button" data-name-save="1">'+L("ตกลง")+'</button>'+
    '<p class="intro-note">'+L("ชื่อนี้เก็บไว้ในเครื่องนี้เท่านั้น")+'</p>'+
  '</div>';
}
/** ต่อจากหน้าแนะนำ: แสดงหน้าถามชื่อ แล้วค่อยทำ then (ไปการสอน / บิลตัวอย่าง / หน้าที่ตั้งใจเปิด) */
function askNameThen(then){
  nameThen = then || null;
  if (location.hash !== "#/" && location.hash !== "") location.hash = "#/"; else route();
}
/** ตอบแล้ว (ใส่ชื่อหรือไว้ทีหลัง) → ทำสิ่งที่ค้างไว้ต่อ ไม่มี = วาดหน้าหลักจริง */
function nameDone(){
  var then = nameThen; nameThen = null;
  route();                 // หน้าหลักจริงแทนหน้าถามชื่อก่อน แล้วค่อยไปต่อ (การสอนเปลี่ยนหน้าเอง)
  if (then) then();
}
async function saveNameFromPage(){
  var input = document.getElementById("nameInput");
  if (!input) return;
  var name = cleanMyName(input.value), problem = myNameProblem(name);
  if (problem){
    var msg = document.getElementById("nameMsg");
    msg.className = "field-msg error";
    msg.textContent = problem;
    input.setAttribute("aria-invalid","true");
    input.focus();
    return;
  }
  await storeMyName(name);
  // ไปการสอน/บิลตัวอย่างต่อ = ไม่ขึ้น toast ทับ (หน้าหลักทักทายด้วยชื่ออยู่แล้ว)
  nameDone();
}
async function skipNameFromPage(){
  await storeMyName("");
  nameDone();
}

/* ---- หน้าตั้งค่า ---- */
function myNameSectionHTML(){
  return '<section class="step-card" aria-labelledby="h-myname">'+
    '<div class="step-head"><h2 id="h-myname">'+L("ชื่อที่ให้เราเรียก")+'</h2></div>'+
    '<div class="field-row"><div>'+
      '<label class="sr-only" for="myNameInput">'+L("ชื่อที่ให้เราเรียก")+'</label>'+
      '<input type="text" id="myNameInput" value="'+esc(ui.myName)+'" placeholder="'+L("เช่น มาร์ค")+'" autocomplete="nickname" maxlength="'+MAX_NAME+'" aria-describedby="myNameMsg">'+
    '</div><button class="btn-sm" type="button" data-myname-save="1">'+L("บันทึก")+'</button></div>'+
    '<p class="field-msg muted" id="myNameMsg" aria-live="polite">'+
      (ui.myName ? L("ตอนนี้เราเรียกคุณว่า {name}", { name:esc(ui.myName) }) : L("ยังไม่ได้ตั้งชื่อ ใส่ชื่อเล่นสั้น ๆ ได้เลย"))+'</p>'+
    (ui.myName ? '<button class="link-btn danger" type="button" data-myname-clear="1">'+L("ลบชื่อ")+'</button>' : '')+
  '</section>';
}
function refreshMore(){
  if (currentPath() === "/more") document.getElementById("view").innerHTML = pageMore();
}
async function saveMyNameFromSettings(){
  var input = document.getElementById("myNameInput");
  if (!input) return;
  var name = cleanMyName(input.value), problem = myNameProblem(name);
  if (problem){
    var msg = document.getElementById("myNameMsg");
    msg.className = "field-msg error";
    msg.textContent = problem;
    input.setAttribute("aria-invalid","true");
    input.focus();
    return;
  }
  if (name === ui.myName) return toast(L("ตอนนี้เราเรียกคุณว่า {name}", { name:name }),"ok");
  var ok = await storeMyName(name);
  refreshMore();
  if (ok) toast(L("ต่อไปเราจะเรียกคุณว่า {name}", { name:name }),"ok");
}
async function clearMyName(){
  var ok = await storeMyName("");
  refreshMore();
  if (ok) toast(L("ลบชื่อแล้ว"),"ok");
}

/* ---- ใช้ชื่อในแอป ---- */
function helloHTML(){
  return ui.myName ? '<p class="eyebrow home-hello">'+L("สวัสดี {name} 👋", { name:esc(ui.myName) })+'</p>' : '';
}
/** id ของคนในบิลที่ชื่อตรงกับชื่อของเรา หรือ null */
function myNameMemberId(){
  if (!ui.myName) return null;
  var me = normText(ui.myName);
  var m = state.members.filter(function(p){ return normText(p.name) === me; })[0];
  return m ? m.id : null;
}
/** ปุ่ม "+ เพิ่มตัวเอง" ในขั้นใส่คน — ไม่แสดงตอนสอนใช้และตอนแก้มื้อในทริป */
function addSelfHTML(){
  if (!ui.myName || ui.loading || ui.tour || ui.tripStash || myNameMemberId()) return "";
  return '<button class="add-slot add-self" type="button" data-add-self="1">'+L("+ เพิ่มตัวเอง ({name})", { name:esc(ui.myName) })+'</button>';
}
async function addSelf(){
  if (!addSelfHTML() || ui.savingMember) return;
  var problem = validateName(ui.myName, null);
  if (problem) return toast(problem,"error");
  if (wsActive()) pushUndo();
  state.members.push({ id:nid(), name:ui.myName });
  render();
  await commit(L("เพิ่ม {name} แล้ว", { name:ui.myName }));
  render();
}
