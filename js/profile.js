/* FairDish — v4.6: ชื่อที่ให้เราเรียก — ถามตอนใช้งานครั้งแรก (ต่อจากหน้าแนะนำ) เปลี่ยนได้ตลอดในหน้าตั้งค่า
   เก็บในเครื่องเท่านั้น (Store.profileKey) ไม่ไปกับข้อมูลบิล/กลุ่ม */
"use strict";

var nameThen = null;   // ทำต่อหลังปิดหน้าต่างถามชื่อ (เช่น ไปการสอนต่อจากหน้าแนะนำ)

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

/* ---- หน้าต่างถามชื่อ ---- */
/** เปิดหน้าหลักครั้งแรกหลังผ่านหน้าแนะนำ (คนที่เคยใช้ก่อน v4.6 ก็ถามหนึ่งครั้ง) */
function maybeAskName(){
  if (ui.nameAsked || ui.showOnb || ui.tour) return;
  openNameDialog(null);
}
function openNameDialog(then){
  var box = document.getElementById("nameDialog");
  if (!box || box.open){ if (then) then(); return; }
  nameThen = then || null;
  box.innerHTML =
    '<div class="install-head"><img src="img/logo.png" alt="" width="48" height="48"><div>'+
      '<h2 id="nameTitle">'+L("อยากให้เราเรียกคุณว่าอะไรดี?")+'</h2>'+
      '<p>'+L("ชื่อเล่นสั้น ๆ ก็ได้ เราจะใช้ทักทาย และช่วยใส่ชื่อคุณเข้าโต๊ะได้ในแตะเดียว เปลี่ยนได้ทุกเมื่อในหน้าตั้งค่า")+'</p></div></div>'+
    '<label class="sr-only" for="nameInput">'+L("ชื่อที่ให้เราเรียก")+'</label>'+
    '<input type="text" id="nameInput" placeholder="'+L("เช่น มาร์ค")+'" autocomplete="nickname" maxlength="'+MAX_NAME+'" aria-describedby="nameMsg">'+
    '<p class="field-msg muted" id="nameMsg" aria-live="polite"></p>'+
    '<button class="btn-main btn-block" type="button" data-name-save="1">'+L("ตกลง")+'</button>'+
    '<div class="me-other name-skip"><button class="me-skip" type="button" data-name-skip="1">'+L("ไว้ทีหลัง")+'</button></div>';
  if (typeof box.showModal === "function") box.showModal(); else box.setAttribute("open","");
  var input = document.getElementById("nameInput");
  if (input) input.focus();
}
function closeNameDialog(){
  var box = document.getElementById("nameDialog");
  if (!box) return;
  if (typeof box.close === "function") box.close();
  else { box.removeAttribute("open"); onNameDialogClosed(); }
}
/** ปิดด้วยวิธีไหนก็ตาม (ไว้ทีหลัง / Esc / แตะพื้นหลัง) = ถามแล้ว ไม่ถามซ้ำ แล้วทำสิ่งที่ค้างไว้ต่อ */
function onNameDialogClosed(){
  if (!ui.nameAsked){
    storeMyName("");
    toast(L("ตั้งชื่อได้ทุกเมื่อในหน้าตั้งค่า"),"ok");
  }
  var then = nameThen; nameThen = null;
  if (then) then();
}
async function saveNameFromDialog(){
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
  toast(L("ยินดีที่ได้รู้จัก {name} 👋", { name:name }),"ok");
  closeNameDialog();
  if (!nameThen && currentPath() === "/") route();   // ทักทายในหน้าหลักทันที
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
