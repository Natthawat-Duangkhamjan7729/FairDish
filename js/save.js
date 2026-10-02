/* FairDish — บันทึกข้อมูล + สถานะการบันทึก */
"use strict";

/* =========================================================
   3. บันทึกข้อมูล + สถานะ
   ========================================================= */
function serialize(){
  return { members:state.members, menus:state.menus, shared:state.shared,
           charges:state.charges, savedAt:new Date().toISOString() };
}
function setSave(next){
  ui.save = next;
  var chip = document.getElementById("saveChip");
  var text = document.getElementById("saveChipText");
  if (!chip || !text) return;
  chip.dataset.state = next;
  text.textContent = ({ loading:"กำลังโหลดข้อมูล", saving:"กำลังบันทึก",
                        saved:"บันทึกแล้ว", error:"ยังไม่ได้บันทึก" })[next] || "";
}
async function commit(successMessage, source){
  setSave("saving");
  try {
    await Store.save(serialize());
    setSave("saved");
    ui.saveFailedIn = null;
    if (successMessage) toast(successMessage,"ok");
    return true;
  } catch(err){
    setSave("error");
    ui.saveFailedIn = source || "member";
    toast("บันทึกไม่สำเร็จ ข้อมูลบนหน้าจอยังอยู่ครบ","error",{ label:"ลองอีกครั้ง", action:retrySave });
    render();
    return false;
  }
}
function saveErrorNotice(){
  return '<div class="notice error"><p>บันทึกลงเครื่องไม่สำเร็จ ข้อมูลที่เห็นยังอยู่ครบ แต่ถ้าปิดหน้านี้จะหาย</p>'+
    '<button class="btn-quiet" id="retrySave">ลองบันทึกอีกครั้ง</button></div>';
}
async function retrySave(){
  var ok = await commit();
  if (ok) toast("บันทึกเรียบร้อยแล้ว","ok");
  render();
}
