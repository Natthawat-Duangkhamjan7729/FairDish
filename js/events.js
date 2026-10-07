/* FairDish — ตัวจับเหตุการณ์ของทั้งหน้า */
"use strict";

/* =========================================================
   10. เหตุการณ์
   ========================================================= */
document.addEventListener("keydown", function(e){
  if (!e.target) return;
  // v3.2: Esc ปิดแผ่นล่างจอ (ถ้ากล่องเมนูแนะนำเปิดอยู่ ปิดกล่องนั้นก่อน)
  if (e.key === "Escape" && !(e.target.id === "mName" && ui.suggest.open) && !(e.target.id === "sName" && ui.sharedSuggest && ui.sharedSuggest.open)){
    if (ui.sheet){ e.preventDefault(); return closeGlobalSheet(); }
    if (state.menuForm){ e.preventDefault(); state.menuForm=null; ui.menuErr={}; closeSuggestions(); return renderMenus(); }
    if (state.sharedForm){ e.preventDefault(); state.sharedForm=null; return renderShared(); }
    if (state.chargeForm){ e.preventDefault(); state.chargeForm=null; return renderCharges(); }
  }
  if (wideShortcut(e)) return;
  var stepId = e.target.getAttribute && e.target.getAttribute("data-step");
  if (stepId && e.target.getAttribute("role")==="tab" && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)){
    e.preventDefault();
    var ids = steps().map(function(st){ return st.id; });
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
  if (e.target.id === "wsName" && ui.wsSuggest && ui.wsSuggest.open && ui.wsSuggest.items.length){   // v4.4.1: เมนูแนะนำจอใหญ่
    if (e.key === "ArrowDown"){ e.preventDefault(); return moveWsSuggest(1); }
    if (e.key === "ArrowUp"){ e.preventDefault(); return moveWsSuggest(-1); }
    if (e.key === "Escape"){ e.preventDefault(); return closeWsSuggest(); }
    if (e.key === "Enter" && ui.wsSuggest.active >= 0){ e.preventDefault(); return pickWsSuggest(ui.wsSuggest.active); }
  }
  if (e.key !== "Enter") return;
  if (e.target.id === "nameInput"){ e.preventDefault(); return saveNameFromPage(); }
  if (e.target.id === "myNameInput"){ e.preventDefault(); return saveMyNameFromSettings(); }
  if (e.target.id === "memberInput"){ e.preventDefault(); if (wsActive()) pushUndo(); addMember(); }
  if (e.target.id === "editMemberInput"){ e.preventDefault(); saveEdit(ui.editingMember); }
  if (e.target.id === "mName" || e.target.id === "mPrice"){ e.preventDefault(); saveMenuForm(); }
  if (e.target.id === "guestName"){ e.preventDefault(); addGuest(); }
  if (e.target.id === "billNameInput"){ e.preventDefault(); saveBillName(); }
  if (e.target.id === "hostNameInput"){ e.preventDefault(); saveHostSheet(); }   // v4.7
  if (e.target.id === "tripNameInput"){ e.preventDefault(); var go = document.querySelector("[data-trip-go]"); if (go) goTripFromSheet(go.getAttribute("data-trip-go")); }   // v4.12
  if (e.target.id === "joinNameInput"){ e.preventDefault(); joinAsMe(); }         // v4.9
  if (e.target.getAttribute && e.target.getAttribute("data-payer-amt") !== null){ e.preventDefault(); e.target.blur(); }
  if (e.target.id === "mealName"){ e.preventDefault(); e.target.blur(); }
  if (e.target.id === "groupJoinInput"){ e.preventDefault(); joinGroup(); }
  if (e.target.id === "wsName" || e.target.id === "wsPrice"){ e.preventDefault(); wsAddMenu(); }
});
/** v4.4: ปุ่มลัดบนจอใหญ่ — N เพิ่มรายการ, M/T เริ่มบิล, Ctrl/⌘+Z เลิกทำ, Esc เลิกดูเฉพาะคน (ไม่ทำงานตอนพิมพ์อยู่) */
function wideShortcut(e){
  if (!isWide() || e.altKey) return false;
  var tag = e.target.tagName, typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;
  if (typing || ui.sheet || state.menuForm || state.sharedForm || state.chargeForm || document.querySelector("dialog[open]")) return false;
  var path = currentPath(), k = e.key;
  if (path === "/split" && wsActive()){
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (k === "z" || k === "Z")){ e.preventDefault(); wsUndo(); return true; }
    if (e.ctrlKey || e.metaKey) return false;
    // v4.15: M = เมนู (ตรงกับปุ่มลัดเริ่มมื้อในหน้าแรก) — N ยังใช้ได้สำหรับคนที่เคยชิน
    if (k === "m" || k === "M" || k === "n" || k === "N"){ var n = document.getElementById("wsName"); if (n){ e.preventDefault(); n.focus(); return true; } }
    if (k === "Escape" && ui.wsFocus){ e.preventDefault(); ui.wsFocus = null; renderWorkspace(); return true; }
  }
  if (path === "/" && !ui.showOnb && !e.ctrlKey && !e.metaKey && (k === "m" || k === "M" || k === "t" || k === "T")){
    e.preventDefault(); if (k === "t" || k === "T") openTripNameSheet("trip"); else startNewBill("meal"); return true;
  }
  return false;
}
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
  if (e.target && e.target.id === "wsName"){ ui.wsSuggest = { open:true, items:[], active:-1 }; renderWsSuggest(); }
  if (e.target && e.target.id === "histQ"){ ui.histQ = e.target.value; renderHistoryWide(); }   // v4.4: ค้นหาประวัติ (ไม่วาดช่องค้นหาใหม่ จะได้พิมพ์ต่อได้)
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
  if (ui.wsSuggest && ui.wsSuggest.open && e.target.closest && !e.target.closest("#wsSuggest") && e.target.id !== "wsName") closeWsSuggest();
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
            "[data-step],[data-group-panel],[data-theme-pick],[data-pay],"+
            "[data-open-kind],[data-new-kind],[data-trip-go],[data-start-demo],[data-close-global],[data-close-sheet],[data-rename],#billNameSave,"+
            "[data-paid],[data-show-done],[data-show-receipt],[data-restore-history],[data-del-history],[data-nav-open],[data-paid-all],[data-hist-paid-all],#inviteBtn,"+
            "[data-open-meal],[data-add-meal],[data-back-trip],[data-meal-pay],[data-del-meal],"+
            "#installBtn,#installClose,#installNow,#installCopyLink,#inappSkip,#inappClose,"+
            "[data-me-pick],[data-me-close],[data-me-add],#shareImgBtn,#nudgeInstall,#nudgeClose,[data-payer],[data-payer-open],"+
            "#shareNative,#shareCopy,#shareSaveQr,"+
            "[data-lang],[data-onb-next],[data-onb-skip],[data-onb-again],"+
            "[data-guest-who],[data-guest-add],[data-guest-item],[data-guest-save],[data-guest-change],[data-guest-again],"+
            "[data-me],[data-forget-group],#groupJoin,#groupCopy,#groupShare,#groupRefresh,#groupRetry,#groupLinkInput,"+
            "[data-ws-focus],[data-ws-eat],[data-ws-all],[data-ws-pay],[data-ws-me],#wsUndo,#wsAdd,[data-side-invite],"+
            "[data-share-pick],[data-hist-sel],[data-hist-filter],[data-onb-demo],[data-ws-suggest],"+
            "[data-scan-close],[data-scan-paste],[data-dissolve],[data-dissolve-ok],[data-del-local],[data-del-local-ok],[data-open-join],[data-share-close],[data-me-join],[data-guest-join],[data-host-save],[data-host-skip],[data-name-save],[data-name-skip],[data-myname-save],[data-myname-clear],[data-add-self],"+
            "[data-onb-start],[data-tour-start],[data-tour-next],[data-tour-skip],[data-tour-done],[data-tour-back],[data-tour-install]";
  var t = e.target.closest ? e.target.closest(sel) : null;
  if (!t) return;
  var v;

  /* ฟีเจอร์ที่ 1 */
  if (t.id==="memberAdd"){ if (wsActive()) pushUndo(); return addMember(); }
  if (t.id==="retrySave") return retrySave();
  if ((v = t.getAttribute("data-edit-member"))) return startEdit(v);
  if ((v = t.getAttribute("data-save-member"))) return saveEdit(v);
  if (t.getAttribute("data-cancel-edit")){ ui.editingMember=null; ui.editError=""; return renderMembers(); }
  if ((v = t.getAttribute("data-del-member"))){ ui.editingMember=null; ui.editError=""; return askDelete(v); }
  if ((v = t.getAttribute("data-confirm-del"))){ if (wsActive()) pushUndo(); return removeMember(v); }
  if (t.getAttribute("data-cancel-del")){ ui.confirmMember=null; return renderMembers(); }

  /* v3.2: เริ่มบิลใหม่ / แผ่นล่างจอ / ประวัติ / ติ๊กโอนแล้ว */
  if (t.getAttribute("data-open-kind")) return openKindSheet();
  if ((v = t.getAttribute("data-new-kind"))) return (v === "trip" || v === "trip-group") ? openTripNameSheet(v) : startNewBill(v);   // v4.12
  if ((v = t.getAttribute("data-trip-go"))) return goTripFromSheet(v);
  if (t.getAttribute("data-start-demo")) return startNewBill("meal", true);
  if (t.getAttribute("data-close-global")) return closeGlobalSheet();
  if ((v = t.getAttribute("data-close-sheet"))){
    if (v === "menu"){ state.menuForm=null; ui.menuErr={}; closeSuggestions(); return renderMenus(); }
    if (v === "shared"){ state.sharedForm=null; return renderShared(); }
    if (v === "charge"){ state.chargeForm=null; return renderCharges(); }
    return;
  }
  if (t.getAttribute("data-rename")) return openRenameSheet();
  if (t.id==="billNameSave") return saveBillName();
  if ((v = t.getAttribute("data-paid"))) return togglePaid(v);
  if ((v = t.getAttribute("data-lang"))) return setLang(v);
  if (t.getAttribute("data-onb-next")) return onboardNext();
  if (t.getAttribute("data-onb-skip")) return finishOnboard();
  if (t.getAttribute("data-onb-again")) return onboardAgain();
  /* v4.1: หน้าที่เพื่อนเห็น — เลือกชื่อ ติ๊กเมนู ยืนยัน */
  if ((v = t.getAttribute("data-guest-who"))) return pickGuest(v);
  if (t.getAttribute("data-guest-add")) return addGuest();
  if ((v = t.getAttribute("data-guest-item"))) return toggleGuestItem(v);
  if (t.getAttribute("data-guest-save")) return submitGuest();
  if (t.getAttribute("data-guest-change")){ ui.guestFor = null; ui.guestSel = null; ui.guestDone = false; var gg = myGroup(ui.ctx); if (gg){ gg.me = null; saveMyGroups(); } return rerenderGuest(); }
  if (t.getAttribute("data-guest-again")){ ui.guestDone = false; return rerenderGuest(); }
  if (t.getAttribute("data-show-done")){ ui.showDone = true; document.getElementById("view").innerHTML = pageBill(); return jumpTo(0); }
  if (t.getAttribute("data-show-receipt")){ ui.showDone = false; ui.noReveal = true; document.getElementById("view").innerHTML = pageBill(); ui.noReveal = false; return jumpTo(0); }
  if (t.getAttribute("data-paid-all")) return togglePaidAll();
  if ((v = t.getAttribute("data-hist-paid-all"))) return togglePaidAllHistory(v);
  if ((v = t.getAttribute("data-restore-history"))) return restoreHistory(v);
  if ((v = t.getAttribute("data-nav-open"))){ v = v.split(":"); return restoreHistory(v[0], v[1] === "bill" ? "summary" : "members"); }   // v4.15: แถบซ้าย
  if ((v = t.getAttribute("data-del-history"))) return deleteHistory(v);

  /* v4.5: สอนใช้แบบกดจริง */
  if (ui.tour && tourClick(t)) return;
  if (t.getAttribute("data-onb-start")) return finishOnboard(true);
  if (t.getAttribute("data-tour-start")) return tourStart();

  /* v4.4: จอใหญ่ */
  if ((v = t.getAttribute("data-ws-suggest")) !== null) return pickWsSuggest(parseInt(v, 10));
  if ((v = t.getAttribute("data-ws-focus"))) return wsFocusPerson(v);
  if ((v = t.getAttribute("data-ws-eat"))){ v = v.split(":"); return wsToggleEater(v[0], v[1]); }
  if ((v = t.getAttribute("data-ws-all"))) return wsToggleAll(v);
  if ((v = t.getAttribute("data-ws-pay"))){ v = v.split(":"); return wsSetPayer(v[0], v[1]); }
  if (t.getAttribute("data-ws-me")) return openMeDialog();
  if (t.id==="wsUndo") return wsUndo();
  if (t.id==="wsAdd") return wsAddMenu();
  if (t.getAttribute("data-side-invite")) return sideInvite();
  if ((v = t.getAttribute("data-share-pick"))) return pickShareMember(v);
  if ((v = t.getAttribute("data-hist-sel"))){ ui.histSel = v; return renderHistoryWide(); }
  if ((v = t.getAttribute("data-hist-filter"))){ ui.histFilter = v; return renderHistoryWide(); }
  if (t.getAttribute("data-onb-demo")){ ui.onbNext = null; return finishOnboard("demo"); }
  if (t.id==="inviteBtn") return inviteFromBill();

  /* v2.5: ใครจ่ายให้ร้าน */
  if ((v = t.getAttribute("data-payer"))) return togglePayer(v);

  /* v2.4: ตอนจบมื้อ */
  if (t.id==="shareImgBtn") return shareReceiptImage();
  if (t.id==="nudgeInstall") return openInstall();
  if (t.id==="nudgeClose") return dismissInstallNudge();

  /* v2.4: ถามคุณคือใคร */
  if (t.getAttribute("data-host-save")) return saveHostSheet();         // v4.7: ชื่อคนสร้างกลุ่ม
  if (t.getAttribute("data-host-skip")) return skipHostSheet();
  if (t.getAttribute("data-name-save")) return saveNameFromPage();     // v4.6: ชื่อที่ให้เราเรียก
  if (t.getAttribute("data-name-skip")) return skipNameFromPage();
  if (t.getAttribute("data-myname-save")) return saveMyNameFromSettings();
  if (t.getAttribute("data-myname-clear")) return clearMyName();
  if (t.getAttribute("data-add-self")) return addSelf();
  if (t.getAttribute("data-share-close")) return closeShareDialog();
  if (t.getAttribute("data-open-join")) return openJoin();               // v4.13: มีกล้อง = หน้าต่างสแกน · ไม่มี = วางลิงก์
  if (t.getAttribute("data-scan-close")) return closeScanDialog();
  if (t.getAttribute("data-scan-paste")) return openJoinSheet();
  if (t.getAttribute("data-dissolve")) return openDissolveSheet();       // v4.11: ยุบกลุ่ม
  if (t.getAttribute("data-del-local")) return openDeleteLocalSheet();   // v4.15: ลบบิลที่กำลังหาร (ถามก่อน)
  if (t.getAttribute("data-del-local-ok")) return deleteLocalBill();
  if (t.getAttribute("data-dissolve-ok")) return dissolveGroup();          // v4.11: สแกน/วางลิงก์เข้ากลุ่ม
  if (t.getAttribute("data-me-join")) return joinAsMe();                // v4.9: เข้าร่วมกลุ่ม
  if (t.getAttribute("data-guest-join")) return guestJoin();
  if ((v = t.getAttribute("data-me-pick"))) return chooseMe(v);
  if (t.getAttribute("data-me-close")) return closeMeDialog();
  if (t.getAttribute("data-me-add")) return addMyselfFromDialog();

  /* v3.1: มื้ออาหารในทริป */
  if ((v = t.getAttribute("data-open-meal"))) return enterMeal(v);
  if (t.getAttribute("data-add-meal")) return addMeal();
  if (t.getAttribute("data-back-trip")) return backToTrip();
  if ((v = t.getAttribute("data-meal-pay"))) return setMealPayer(v);
  if (t.getAttribute("data-del-meal")) return deleteMeal();

  /* v3.0: คนจ่ายของรายการทริป */
  if ((v = t.getAttribute("data-pay"))){
    syncMenuForm();
    setPayersOf(state.menuForm, togglePayerIn(knownPayers(state.menuForm), v));   // v4.15: จ่ายด้วยกันหลายคนได้
    if (ui.menuErr && knownPayers(state.menuForm).length) ui.menuErr.payer = "";
    return renderMenus();
  }

  /* v2.3: ติดตั้งแอป */
  if (t.id==="installBtn") return openInstall();
  if (t.id==="installClose") return closeInstall();
  if (t.id==="installNow") return installNow();
  if (t.id==="installCopyLink") return copyText(currentLink(false), L("คัดลอกลิงก์แล้ว วางในเบราว์เซอร์ได้เลย"));
  if (t.id==="inappSkip" || t.id==="inappClose") return skipInApp();

  /* v2.1: แท็บขั้นตอน, แผงกลุ่ม, ธีม */
  if ((v = t.getAttribute("data-step"))) return setStep(v, t.getAttribute("role")==="tab");
  if (t.getAttribute("data-group-panel")){ ui.groupPanel = !ui.groupPanel; return renderGroupBar(); }
  if ((v = t.getAttribute("data-theme-pick"))) return setTheme(v);

  /* v2.0: กลุ่ม */
  if (t.id==="groupJoin") return joinGroup();
  if (t.id==="groupCopy") return copyText(groupLink(ui.ctx), L("คัดลอกลิงก์กลุ่มแล้ว ส่งเข้าแชตได้เลย"));
  if (t.id==="groupShare") return openShareDialog();   // v4.11: หน้าต่างชวนเพื่อน
  if (t.id==="shareNative") return shareGroupLink();
  if (t.id==="shareCopy") return copyText(inviteText(), L("คัดลอกลิงก์พร้อมคำชวนแล้ว วางในแชตได้เลย"));
  if (t.id==="shareSaveQr") return saveQrImage();
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
    if (cleared) toast(L("ล้างข้อมูลแล้ว"),"ok",{ label:L("เลิกทำ"), action:function(){ undoReset(before); } });
    return;
  }

  if (t.id==="menuOpen"){
    // v4.15: ไม่เลือกทุกคนให้เอง — แตะชื่อคนที่กินเอง (หรือกด "ทุกคน")
    state.menuForm={ id:null, name:"", price:"", eaters:[] };
    // v3.0: ทริป — คนจ่ายตั้งต้น = คนที่เลือกครั้งก่อน หรือ "ฉัน"
    if (state.kind === "trip") setPayersOf(state.menuForm, defaultPayers());
    ui.menuErr={}; ui.focusMenuField="mName";
    ui.suggest={ open:true, items:[], active:-1, total:0 };
    return renderMenus();
  }
  if ((v = t.getAttribute("data-suggest")) !== null) return pickSuggestion(parseInt(v,10));
  if ((v = t.getAttribute("data-edit-menu"))){
    var m = state.menus.filter(function(x){ return x.id===v; })[0];
    if (m){ state.menuForm=setPayersOf({ id:m.id, name:m.name, price:m.price, eaters:m.eaters.slice() }, payersOf(m)); ui.menuErr={}; }
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
    await commit(L("ลบค่าใช้จ่ายแล้ว"));
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
    if (!cl) return toast(L("ใส่ชื่อค่าใช้จ่ายก่อน"),"error");
    if (!(cr>=0)) return toast(L("ใส่เปอร์เซ็นต์เป็นตัวเลข"),"error");
    state.charges.push({ id:nid(), label:cl, rate:cr, on:true, fixed:false });
    state.chargeForm=null;
    render();
    await commit(L("เพิ่มค่าใช้จ่ายแล้ว"));
    return render();
  }

  if (t.id==="sharedOpen"){ state.sharedForm={}; return renderShared(); }
  if (t.id==="sCancel"){ state.sharedForm=null; return renderShared(); }
  if (t.id==="sSave"){
    var sn = document.getElementById("sName").value.trim();
    var sp = parseFloat(document.getElementById("sPrice").value);
    if (!sn) return toast(L("ใส่ชื่อรายการก่อน"),"error");
    if (!(sp>=0)) return toast(L("ใส่ราคาเป็นตัวเลข"),"error");
    state.shared.push({ id:nid(), name:sn, price:sp });
    state.sharedForm=null;
    render();
    await commit(L("เพิ่มค่าส่วนกลางแล้ว"));
    return render();
  }
  if ((v = t.getAttribute("data-del-shared"))){
    state.shared = state.shared.filter(function(s){ return s.id!==v; });
    render();
    await commit(L("ลบรายการแล้ว"));
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
document.getElementById("shareDialog").addEventListener("click", function(e){
  if (e.target === this) closeShareDialog();
});
/* v4.13: หน้าต่างสแกน — ปิดทางไหนก็ตาม (Esc / พื้นหลัง / ปุ่มปิด) ต้องปิดกล้อง */
document.getElementById("scanDialog").addEventListener("click", function(e){
  if (e.target === this) closeScanDialog();
});
document.getElementById("scanDialog").addEventListener("close", stopScan);

/* v2.5: ยอดที่หัวจ่ายแต่ละคนจ่าย — บันทึกตอนพิมพ์เสร็จ (ออกจากช่อง / กด Enter) */
document.addEventListener("change", function(e){
  var id = e.target && e.target.getAttribute && e.target.getAttribute("data-payer-amt");
  if (id) setPayerAmount(id, e.target.value);
  if (e.target && e.target.id === "mealName") renameMeal(e.target.value);
});


/* v4.4: ลากชื่อคน (จอใหญ่) ไปวางบนการ์ดรายการ = เพิ่มคนนั้นเป็นคนมีส่วน */
document.addEventListener("dragstart", function(e){
  var el = e.target.closest ? e.target.closest("[data-ws-drag]") : null;
  if (!el) return;
  ui.wsDrag = el.getAttribute("data-ws-drag");
  e.dataTransfer.effectAllowed = "copy";
  try { e.dataTransfer.setData("text/plain", ui.wsDrag); } catch(err){}
  document.body.classList.add("ws-dragging");
});
document.addEventListener("dragend", function(){
  ui.wsDrag = null;
  document.body.classList.remove("ws-dragging");
  Array.prototype.forEach.call(document.querySelectorAll(".ws-card.over"), function(c){ c.classList.remove("over"); });
});
document.addEventListener("dragover", function(e){
  if (!ui.wsDrag) return;
  var card = e.target.closest ? e.target.closest("[data-ws-drop]") : null;
  Array.prototype.forEach.call(document.querySelectorAll(".ws-card.over"), function(c){ if (c !== card) c.classList.remove("over"); });
  if (!card) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
  card.classList.add("over");
});
document.addEventListener("drop", function(e){
  var card = e.target.closest ? e.target.closest("[data-ws-drop]") : null;
  var pid = ui.wsDrag;
  if (!card || !pid) return;
  e.preventDefault();
  card.classList.remove("over");
  ui.wsDrag = null;
  document.body.classList.remove("ws-dragging");
  wsToggleEater(card.getAttribute("data-ws-drop"), pid, true);
});

/* v4.4.1: แตะช่องชื่อรายการบนจอใหญ่ = แสดงเมนูที่สั่งบ่อย (เหมือนฟอร์มแผ่น) */
document.addEventListener("focusin", function(e){
  if (e.target && e.target.id === "wsName" && !(ui.wsSuggest && ui.wsSuggest.open)) openWsSuggest();
});

/* v4.15: แถบซ้าย — แตะ/คลิกชื่อบิลครั้งแรกเพื่อกางเมนูย่อย (ทั้งคอมและแท็บเล็ต) กางอยู่แล้ว = เปิดบิลตามปกติ */
document.addEventListener("click", function(e){
  var head = e.target.closest && e.target.closest("#sidenav .sn-bhead");
  if (!head) return;
  var box = head.closest(".sn-bill");
  if (!box || box.classList.contains("open")) return;
  e.preventDefault(); e.stopPropagation();
  ui.navOpenKey = box.getAttribute("data-nav-key");
  renderSideNav();
}, true);
