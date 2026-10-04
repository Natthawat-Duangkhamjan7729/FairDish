/* FairDish — ตัวจับเหตุการณ์ของทั้งหน้า */
"use strict";

/* =========================================================
   10. เหตุการณ์
   ========================================================= */
document.addEventListener("keydown", function(e){
  if (!e.target) return;
  var stepId = e.target.getAttribute && e.target.getAttribute("data-step");
  if (stepId && e.target.getAttribute("role")==="tab" && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)){
    e.preventDefault();
    var ids = STEPS.map(function(st){ return st.id; });
    var i = ids.indexOf(stepId);
    var next = e.key==="Home" ? 0 : e.key==="End" ? ids.length-1 : (i + (e.key==="ArrowRight" ? 1 : -1) + ids.length) % ids.length;
    return setStep(ids[next], true);
  }
  if (e.target.id === "mName" && ui.suggest.open){
    if (e.key === "ArrowDown"){ e.preventDefault(); return moveSuggestion(1); }
    if (e.key === "ArrowUp"){ e.preventDefault(); return moveSuggestion(-1); }
    if (e.key === "Escape"){ e.preventDefault(); return closeSuggestions(); }
    if (e.key === "Enter" && ui.suggest.active >= 0){ e.preventDefault(); return pickSuggestion(ui.suggest.active); }
  }
  if (e.key !== "Enter") return;
  if (e.target.id === "memberInput"){ e.preventDefault(); addMember(); }
  if (e.target.id === "editMemberInput"){ e.preventDefault(); saveEdit(ui.editingMember); }
  if (e.target.id === "mName" || e.target.id === "mPrice"){ e.preventDefault(); saveMenuForm(); }
  if (e.target.id === "groupName"){ e.preventDefault(); createGroup(); }
  if (e.target.getAttribute && e.target.getAttribute("data-payer-amt") !== null){ e.preventDefault(); e.target.blur(); }
  if (e.target.id === "groupJoinInput"){ e.preventDefault(); joinGroup(); }
});
document.addEventListener("input", function(e){
  if (e.target && (e.target.id === "mName" || e.target.id === "mPrice")){
    var key = e.target.id === "mName" ? "name" : "price";
    if (ui.menuErr && ui.menuErr[key]){
      ui.menuErr[key] = "";
      var box = document.getElementById(e.target.id+"Msg");
      if (box){ box.className = "field-msg muted"; box.textContent = ""; }
      e.target.setAttribute("aria-invalid","false");
    }
    if (e.target.id === "mPrice") updateMenuPreview();
    if (e.target.id === "mName"){
      ui.suggest.open = true;
      ui.suggest.active = -1;
      renderSuggestions();
    }
  }
  if (e.target && e.target.id === "resetConfirmName"){
    var ok = document.getElementById("confirmReset");
    if (ok) ok.disabled = !resetNameMatches();
  }
  if (e.target && e.target.id === "memberInput" && ui.memberError){
    ui.memberError = "";
    var value = e.target.value;
    renderMembers();
    var el = document.getElementById("memberInput");
    if (el){ el.value = value; el.focus(); }
  }
});

document.addEventListener("click", async function(e){
  if (ui.suggest.open && e.target.closest && !e.target.closest("#mSuggest") && e.target.id !== "mName"){
    closeSuggestions();
  }
  var toggle = e.target.closest ? e.target.closest("[data-toggle]") : null;
  if (toggle){
    var toggleId = toggle.getAttribute("data-toggle");
    if (state.open[toggleId]) delete state.open[toggleId]; else state.open[toggleId] = true;
    if (currentPath()==="/bill") document.getElementById("view").innerHTML = pageBill();
    else renderSummary();
    return;
  }

  var sel = "[data-del-member],[data-edit-member],[data-save-member],[data-cancel-edit],[data-confirm-del],[data-cancel-del],"+
            "[data-edit-menu],[data-dup-menu],[data-del-menu],[data-eat],[data-eat-all],[data-suggest],"+
            "[data-charge],[data-del-charge],[data-del-shared],"+
            "#menuOpen,#mSave,#mCancel,#sharedOpen,#sSave,#sCancel,#chargeOpen,#cSave,#cCancel,"+
            "#copyBtn,#demoBtn,#resetBtn,#cancelReset,#confirmReset,#memberAdd,#retrySave,"+
            "[data-step],[data-group-panel],[data-theme-pick],[data-start-group],"+
            "#installBtn,#installClose,#installNow,#installCopyLink,"+
            "[data-me-pick],[data-me-close],[data-me-add],#shareImgBtn,#nudgeInstall,#nudgeClose,[data-payer],[data-payer-open],"+
            "#shareNative,#shareCopy,#shareSaveQr,[data-share-close],"+
            "[data-me],[data-forget-group],#groupCreate,#groupJoin,#groupCopy,#groupShare,#groupRefresh,#groupRetry,#groupLinkInput";
  var t = e.target.closest ? e.target.closest(sel) : null;
  if (!t) return;
  var v;

  /* ฟีเจอร์ที่ 1 */
  if (t.id==="memberAdd") return addMember();
  if (t.id==="retrySave") return retrySave();
  if ((v = t.getAttribute("data-edit-member"))) return startEdit(v);
  if ((v = t.getAttribute("data-save-member"))) return saveEdit(v);
  if (t.getAttribute("data-cancel-edit")){ ui.editingMember=null; ui.editError=""; return renderMembers(); }
  if ((v = t.getAttribute("data-del-member"))){ ui.editingMember=null; ui.editError=""; return askDelete(v); }
  if ((v = t.getAttribute("data-confirm-del"))) return removeMember(v);
  if (t.getAttribute("data-cancel-del")){ ui.confirmMember=null; return renderMembers(); }

  /* v2.5: ใครจ่ายให้ร้าน */
  if ((v = t.getAttribute("data-payer"))) return togglePayer(v);
  if (t.getAttribute("data-payer-open")){
    ui.payerOpen = true; rerenderBill();
    var first = document.querySelector("[data-payer]");
    if (first) first.focus({ preventScroll:true });
    return;
  }

  /* v2.4: ตอนจบมื้อ */
  if (t.id==="shareImgBtn") return shareReceiptImage();
  if (t.id==="nudgeInstall") return openInstall();
  if (t.id==="nudgeClose") return dismissInstallNudge();

  /* v2.4: ถามคุณคือใคร */
  if ((v = t.getAttribute("data-me-pick"))) return chooseMe(v);
  if (t.getAttribute("data-me-close")) return closeMeDialog();
  if (t.getAttribute("data-me-add")) return addMyselfFromDialog();

  /* v2.3: ติดตั้งแอป */
  if (t.id==="installBtn") return openInstall();
  if (t.id==="installClose") return closeInstall();
  if (t.id==="installNow") return installNow();
  if (t.id==="installCopyLink") return copyText(location.href, "คัดลอกลิงก์แล้ว วางในเบราว์เซอร์ได้เลย");

  /* v2.2: หน้าแรก → สร้างกลุ่ม */
  if (t.getAttribute("data-start-group")){ ui.focusGroupName = true; location.hash = "#/groups"; return; }

  /* v2.1: แท็บขั้นตอน, แผงกลุ่ม, ธีม */
  if ((v = t.getAttribute("data-step"))) return setStep(v, t.getAttribute("role")==="tab");
  if (t.getAttribute("data-group-panel")){ ui.groupPanel = !ui.groupPanel; return renderGroupBar(); }
  if ((v = t.getAttribute("data-theme-pick"))) return setTheme(v);

  /* v2.0: กลุ่ม */
  if (t.id==="groupCreate") return createGroup();
  if (t.id==="groupJoin") return joinGroup();
  if (t.id==="groupCopy") return copyText(groupLink(ui.ctx), "คัดลอกลิงก์กลุ่มแล้ว ส่งเข้าแชตได้เลย");
  if (t.id==="groupShare") return openShareDialog();
  if (t.id==="shareNative"){ closeShareDialog(); return shareGroupLink(); }
  if (t.id==="shareCopy") return copyText(inviteText(), "คัดลอกลิงก์พร้อมคำชวนแล้ว วางในแชตได้เลย");
  if (t.id==="shareSaveQr") return saveQrImage();
  if (t.getAttribute("data-share-close")) return closeShareDialog();
  if (t.id==="groupRefresh") return refreshGroup(true);
  if (t.id==="groupRetry") return loadContext(ui.ctx);
  if (t.id==="groupLinkInput") return t.select();
  if ((v = t.getAttribute("data-me"))) return setMe(v);
  if ((v = t.getAttribute("data-forget-group"))) return forgetGroup(v);

  /* ส่วนอื่นของแอป */
  if (t.id==="demoBtn") return loadDemo();
  if (t.id==="resetBtn"){
    ui.confirmReset = true;
    document.getElementById("view").innerHTML = pageSplit();
    render();
    var box = document.querySelector(".confirm");   // ให้กล่องยืนยันอยู่กลางจอ ไม่จมใต้แถบยอดรวม
    if (box) box.scrollIntoView({ block:"center" });
    var typed = document.getElementById("resetConfirmName");
    if (typed) typed.focus({ preventScroll:true });
    return;
  }
  if (t.id==="cancelReset"){
    ui.confirmReset = false;
    document.getElementById("view").innerHTML = pageSplit();
    return render();
  }
  if (t.id==="confirmReset"){
    if (ui.ctx && !resetNameMatches()) return;
    ui.confirmReset = false;
    var before = JSON.parse(JSON.stringify({ members:state.members, menus:state.menus, shared:state.shared, charges:state.charges, payers:state.payers }));
    state.members=[]; state.menus=[]; state.shared=[]; state.payers=[];
    state.charges = state.charges.filter(function(c){ return c.fixed; });
    state.charges.forEach(function(c){ c.on=false; });
    state.menuForm=null; state.sharedForm=null; state.chargeForm=null; state.open={};
    ui.confirmMember=null; ui.editingMember=null; ui.memberError=""; ui.undo=null;
    document.getElementById("view").innerHTML = pageSplit();
    render();
    var cleared = await commit(null);
    render();
    if (cleared) toast("ล้างข้อมูลแล้ว","ok",{ label:"เลิกทำ", action:function(){ undoReset(before); } });
    return;
  }

  if (t.id==="menuOpen"){
    // v2.4: โต๊ะไทยส่วนใหญ่กินด้วยกัน เริ่มที่ "ทุกคน" แล้วแตะเอาคนที่ไม่กินออก
    state.menuForm={ id:null, name:"", price:"", eaters:state.members.map(function(p){ return p.id; }) };
    ui.menuErr={}; ui.focusMenuField="mName";
    ui.suggest={ open:true, items:[], active:-1, total:0 };
    return renderMenus();
  }
  if ((v = t.getAttribute("data-suggest")) !== null) return pickSuggestion(parseInt(v,10));
  if ((v = t.getAttribute("data-edit-menu"))){
    var m = state.menus.filter(function(x){ return x.id===v; })[0];
    if (m){ state.menuForm={ id:m.id, name:m.name, price:m.price, eaters:m.eaters.slice() }; ui.menuErr={}; }
    closeSuggestions();
    return renderMenus();
  }
  if ((v = t.getAttribute("data-dup-menu"))){ state.menuForm=null; ui.menuErr={}; closeSuggestions(); return duplicateMenu(v); }
  if ((v = t.getAttribute("data-del-menu"))) return removeMenu(v);
  if ((v = t.getAttribute("data-eat"))){
    syncMenuForm();
    var f = state.menuForm;
    var i = f.eaters.indexOf(v);
    if (i>=0) f.eaters.splice(i,1); else f.eaters.push(v);
    if (f.eaters.length) ui.menuErr.eaters = "";
    return renderMenus();
  }
  if (t.getAttribute("data-eat-all")){
    syncMenuForm();
    var ff = state.menuForm;
    ff.eaters = ff.eaters.length===state.members.length ? [] : state.members.map(function(p){ return p.id; });
    if (ff.eaters.length) ui.menuErr.eaters = "";
    return renderMenus();
  }
  if (t.id==="mCancel"){ state.menuForm=null; ui.menuErr={}; closeSuggestions(); return renderMenus(); }
  if (t.id==="mSave") return saveMenuForm();

  if ((v = t.getAttribute("data-del-charge"))){
    e.stopPropagation();
    state.charges = state.charges.filter(function(c){ return c.id!==v; });
    render();
    await commit("ลบค่าใช้จ่ายแล้ว");
    return render();
  }
  if ((v = t.getAttribute("data-charge"))){
    state.charges.forEach(function(c){ if (c.id===v) c.on = !c.on; });
    render();
    await commit();
    return render();
  }
  if (t.id==="chargeOpen"){ state.chargeForm={}; return renderCharges(); }
  if (t.id==="cCancel"){ state.chargeForm=null; return renderCharges(); }
  if (t.id==="cSave"){
    var cl = document.getElementById("cLabel").value.trim();
    var cr = parseFloat(document.getElementById("cRate").value);
    if (!cl) return toast("ใส่ชื่อค่าใช้จ่ายก่อน","error");
    if (!(cr>=0)) return toast("ใส่เปอร์เซ็นต์เป็นตัวเลข","error");
    state.charges.push({ id:nid(), label:cl, rate:cr, on:true, fixed:false });
    state.chargeForm=null;
    render();
    await commit("เพิ่มค่าใช้จ่ายแล้ว");
    return render();
  }

  if (t.id==="sharedOpen"){ state.sharedForm={}; return renderShared(); }
  if (t.id==="sCancel"){ state.sharedForm=null; return renderShared(); }
  if (t.id==="sSave"){
    var sn = document.getElementById("sName").value.trim();
    var sp = parseFloat(document.getElementById("sPrice").value);
    if (!sn) return toast("ใส่ชื่อรายการก่อน","error");
    if (!(sp>=0)) return toast("ใส่ราคาเป็นตัวเลข","error");
    state.shared.push({ id:nid(), name:sn, price:sp });
    state.sharedForm=null;
    render();
    await commit("เพิ่มค่าส่วนกลางแล้ว");
    return render();
  }
  if ((v = t.getAttribute("data-del-shared"))){
    state.shared = state.shared.filter(function(s){ return s.id!==v; });
    render();
    await commit("ลบรายการแล้ว");
    return render();
  }

  if (t.id==="copyBtn") return copySummary();
});

/* v2.0: กลับมาที่แท็บ = ดึงบิลกลุ่มล่าสุด เผื่อเพื่อนแก้ไปแล้ว */
document.addEventListener("visibilitychange", function(){
  if (document.visibilityState === "visible") refreshGroup(false);
});

/* v2.3: แตะพื้นหลังมืดรอบหน้าต่างติดตั้ง = ปิด */
document.getElementById("installDialog").addEventListener("click", function(e){
  if (e.target === this) closeInstall();
});
document.getElementById("meDialog").addEventListener("click", function(e){
  if (e.target === this) closeMeDialog();
});

/* v2.5: ยอดที่หัวจ่ายแต่ละคนจ่าย — บันทึกตอนพิมพ์เสร็จ (ออกจากช่อง / กด Enter) */
document.addEventListener("change", function(e){
  var id = e.target && e.target.getAttribute && e.target.getAttribute("data-payer-amt");
  if (id) setPayerAmount(id, e.target.value);
});
document.getElementById("shareDialog").addEventListener("click", function(e){
  if (e.target === this) closeShareDialog();
});
