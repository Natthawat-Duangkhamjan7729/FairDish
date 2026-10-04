/* FairDish — วาดใบเสร็จเป็นรูปไว้แชร์เข้าแชต (v2.4) — ใช้ canvas ล้วน ไม่มีไลบรารี */
"use strict";

/* =========================================================
   8.6 รูปใบเสร็จ
   ========================================================= */

/** อ่านสีจากตัวแปร CSS ของใบเสร็จ (.receipt-wrap ใช้ชุดสีสว่างเสมอ) ไม่ hard-code สีซ้ำในนี้ */
function receiptPalette(){
  var probe = document.createElement("div");
  probe.className = "receipt-wrap";
  probe.style.position = "absolute"; probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  var cs = getComputedStyle(probe);
  var pick = function(n){ return cs.getPropertyValue(n).trim(); };
  var pal = {
    bg:pick("--bg"), paper:pick("--paper"), ink:pick("--ink"), ink2:pick("--ink-2"), line:pick("--line-2"),
    tag:pick("--secondary"), tagInk:pick("--secondary-ink"),
    head:pick("--font-head"), body:pick("--font-body"), num:pick("--font-num")
  };
  document.body.removeChild(probe);
  return pal;
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
}
function fitText(ctx, text, maxW){
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 1 && ctx.measureText(text+"…").width > maxW) text = text.slice(0,-1);
  return text+"…";
}
function loadImage(src){
  return new Promise(function(ok){
    var img = new Image();
    img.onload = function(){ ok(img); };
    img.onerror = function(){ ok(null); };
    img.src = src;
  });
}

/** วาดใบเสร็จของบิลที่เปิดอยู่ → Promise<Blob> (PNG กว้าง 1080px) */
async function receiptImageBlob(){
  var r = compute();
  var pal = receiptPalette();
  try { await Promise.all([
    document.fonts.load("600 44px "+pal.head), document.fonts.load("400 34px "+pal.body),
    document.fonts.load("600 34px "+pal.num)
  ]); } catch(e){}
  var logo = await loadImage("img/icon-192.png");

  var W = 1080, PAD = 72, CARD_X = 60, CARD_W = W - 120, ROW = 76;
  var H = 420 + r.list.length * ROW + 300;
  var c = document.createElement("canvas");
  c.width = W; c.height = H;
  var ctx = c.getContext("2d");

  ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.paper; roundRect(ctx, CARD_X, 60, CARD_W, H - 120, 36); ctx.fill();

  // หัวใบเสร็จ
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "600 30px "+pal.body;
  var tag = "ใบสรุปยอด", tw = ctx.measureText(tag).width + 56;
  ctx.fillStyle = pal.tag; roundRect(ctx, (W-tw)/2, 120, tw, 56, 28); ctx.fill();
  ctx.fillStyle = pal.tagInk; ctx.fillText(tag, W/2, 149);
  ctx.fillStyle = pal.ink; ctx.font = "600 52px "+pal.head;
  ctx.fillText(fitText(ctx, (ui.ctx && Store.groupName) || "มื้อนี้", CARD_W - 2*PAD), W/2, 236);
  ctx.fillStyle = pal.ink2; ctx.font = "400 30px "+pal.body;
  ctx.fillText(r.n+" คน · หารตามที่กินจริง", W/2, 300);

  // รายคน
  var y = 380;
  ctx.textBaseline = "middle";
  // รูปนี้ส่งเข้าแชตให้ทุกคนดู จึงไม่ไฮไลต์ "ฉัน" ของคนส่ง
  r.list.forEach(function(p){
    ctx.fillStyle = pal.ink;
    ctx.textAlign = "left"; ctx.font = "400 36px "+pal.body;
    ctx.fillText(fitText(ctx, p.name, CARD_W - 2*PAD - 260), CARD_X+PAD, y + ROW/2 - 4);
    ctx.textAlign = "right"; ctx.font = "600 36px "+pal.num;
    ctx.fillText(baht(p.rounded), W - CARD_X - PAD, y + ROW/2 - 4);
    ctx.strokeStyle = pal.line; ctx.setLineDash([8,8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CARD_X+PAD, y+ROW-2); ctx.lineTo(W-CARD_X-PAD, y+ROW-2); ctx.stroke();
    y += ROW;
  });

  // รวม
  ctx.setLineDash([]); ctx.strokeStyle = pal.ink; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(CARD_X+PAD, y+30); ctx.lineTo(W-CARD_X-PAD, y+30); ctx.stroke();
  ctx.fillStyle = pal.ink;
  ctx.textAlign = "left"; ctx.font = "600 42px "+pal.head; ctx.fillText("รวมทั้งหมด", CARD_X+PAD, y+90);
  ctx.textAlign = "right"; ctx.font = "600 46px "+pal.num; ctx.fillText(baht(r.grand)+" ฿", W-CARD_X-PAD, y+90);

  // ท้ายใบ
  var fy = H - 130;
  ctx.textAlign = "left"; ctx.fillStyle = pal.ink2; ctx.font = "400 28px "+pal.body;
  var brand = "หารตามที่กินจริงด้วย FairDish", bw = ctx.measureText(brand).width + (logo ? 64 : 0);
  var bx = (W - bw)/2;
  if (logo){ ctx.save(); roundRect(ctx, bx, fy-24, 48, 48, 12); ctx.clip(); ctx.drawImage(logo, bx, fy-24, 48, 48); ctx.restore(); bx += 64; }
  ctx.fillText(brand, bx, fy);

  return new Promise(function(ok, fail){
    c.toBlob(function(b){ b ? ok(b) : fail(new Error("toBlob failed")); }, "image/png");
  });
}

/** แชร์รูปผ่านเมนูแชร์ของมือถือ ถ้าเครื่องไม่รองรับก็ดาวน์โหลดไฟล์แทน */
async function shareReceiptImage(){
  var btn = document.getElementById("shareImgBtn");
  if (btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>กำลังสร้างรูป'; }
  try {
    var blob = await receiptImageBlob();
    var name = "FairDish-" + ((ui.ctx && Store.groupName) || "bill").replace(/[\\/:*?"<>|\s]+/g,"-") + ".png";
    var file = typeof File === "function" ? new File([blob], name, { type:"image/png" }) : null;
    if (file && navigator.canShare && navigator.canShare({ files:[file] })){
      try { await navigator.share({ files:[file], text:"ยอดของแต่ละคน มื้อนี้ 🍲" }); }
      catch(e){ if (e && e.name !== "AbortError") throw e; }
    } else {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
      toast("บันทึกรูปใบเสร็จแล้ว ส่งเข้าแชตได้เลย","ok");
    }
  } catch(err){
    toast("สร้างรูปไม่สำเร็จ ลองคัดลอกข้อความแทน","error");
  } finally {
    var again = document.getElementById("shareImgBtn");
    if (again){ again.disabled = false; again.innerHTML = ICON_SHARE+' แชร์รูปใบเสร็จ'; }
  }
}
