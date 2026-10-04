/* FairDish — รายการแนะนำสำหรับค่าส่วนกลาง (ของที่ทั้งโต๊ะใช้ร่วมกัน หารเท่ากันทุกคน) */
"use strict";

/* ---- คลังค่าส่วนกลาง ----
   แยกจากคลังเมนู เพราะเป็นของที่ใช้ร่วมกันทั้งโต๊ะ ไม่ได้เลือกว่าใครกิน
   POPULAR = แสดงทันทีตอนเปิดฟอร์ม (ยังไม่พิมพ์อะไร) */
var SHARED_POPULAR = ["น้ำแข็ง","น้ำเปล่า","ข้าวเหนียว","ข้าวสวย","ผ้าเย็น","น้ำอัดลม","ค่าส่ง","ทิป"];
var SHARED_GROUPS = [
  { label:"น้ำ / เครื่องดื่มรวม", names:[
    "น้ำแข็ง","น้ำแข็งถัง","น้ำแข็งเพิ่ม","น้ำเปล่า","น้ำเปล่าขวดใหญ่","น้ำดื่มถัง","โซดา","น้ำอัดลม",
    "โค้ก","โค้กขวดใหญ่","เป๊ปซี่","สไปรท์","แฟนต้า","ชาเย็นเหยือก","น้ำหวานเหยือก","น้ำมะพร้าว",
    "เบียร์","เบียร์ทาวเวอร์","เบียร์ช้าง","เบียร์ลีโอ","เบียร์สิงห์","เหล้า","มิกเซอร์","ค่าเปิดขวด" ]},
  { label:"ของกินรวมโต๊ะ", names:[
    "ข้าวเหนียว","ข้าวเหนียวกระติ๊บ","ข้าวสวย","ข้าวสวยโถ","ข้าวเปล่า","ขนมจีน","เส้นขนมจีน",
    "ผักสด","ผักเครื่องเคียง","ชุดผัก","ผักเพิ่ม","น้ำจิ้ม","น้ำจิ้มซีฟู้ด","น้ำจิ้มแจ่ว","น้ำซุป","เติมน้ำซุป",
    "ไข่ไก่","ชุดหมูกระทะ","กับแกล้ม","ถั่ว","ขนม","ขนมขบเคี้ยว","ผลไม้","ของหวาน","เค้กวันเกิด" ]},
  { label:"ค่าใช้จ่ายร่วม", names:[
    "ค่าส่ง","ค่าส่งอาหาร","ค่าแพ็กเกจ","ค่ากล่อง","ค่าถุง","ทิป","ทิปพนักงาน","ผ้าเย็น","ทิชชู่",
    "ค่าเตา","ค่าถ่าน","ค่าโต๊ะ","ค่าห้อง","ค่าห้องคาราโอเกะ","ค่าแก้ว","ค่าจอดรถ","ค่าแท็กซี่",
    "ค่าน้ำมัน","ค่าทางด่วน","ค่าตกแต่ง","เทียนวันเกิด" ]}
];
var SHARED_LIBRARY = (function(){
  var out = [], seen = {};
  SHARED_GROUPS.forEach(function(g){
    g.names.forEach(function(n){
      var k = normText(n);
      if (!seen[k]){ seen[k] = true; out.push({ name:n, norm:k }); }
    });
  });
  return out;
})();

ui.sharedSuggest = { open:false, items:[], active:-1 };

function sharedSuggestions(query){
  var q = normText(query);
  if (!q) return SHARED_POPULAR.map(function(n){ return { name:n }; });
  var hits = SHARED_LIBRARY.filter(function(l){ return l.norm.indexOf(q) >= 0; })
    .map(function(l){ return { name:l.name, tier:l.norm.indexOf(q)===0 ? 0 : 1, len:l.name.length }; });
  hits.sort(function(a,b){ return a.tier - b.tier || a.len - b.len || a.name.localeCompare(b.name, "th"); });
  return hits.slice(0, SUGGEST_LIMIT);
}

function renderSharedSuggestions(){
  var box = document.getElementById("sSuggest");
  var input = document.getElementById("sName");
  if (!box || !input) return;
  var query = input.value;
  var items = ui.sharedSuggest.open ? sharedSuggestions(query) : [];
  ui.sharedSuggest.items = items;
  if (ui.sharedSuggest.active >= items.length) ui.sharedSuggest.active = -1;
  if (!items.length){ box.innerHTML = ""; input.setAttribute("aria-expanded","false"); return; }
  var head = String(query||"").trim() ? "รายการแนะนำ "+items.length+" รายการ" : "ค่าส่วนกลางที่ใช้บ่อย";
  box.innerHTML = '<div class="suggest" role="listbox" aria-label="ค่าส่วนกลางแนะนำ">'+
    '<div class="s-head">'+head+'</div>'+
    items.map(function(it,i){
      return '<button type="button" role="option" id="sSuggest'+i+'" data-ssuggest="'+i+'" aria-selected="'+(i===ui.sharedSuggest.active)+'">'+
        '<span class="s-name">'+highlight(it.name, query)+'</span></button>';
    }).join("")+
  '</div>';
  input.setAttribute("aria-expanded","true");
  input.setAttribute("aria-activedescendant", ui.sharedSuggest.active>=0 ? "sSuggest"+ui.sharedSuggest.active : "");
}

function closeSharedSuggestions(){
  ui.sharedSuggest = { open:false, items:[], active:-1 };
  var box = document.getElementById("sSuggest");
  if (box) box.innerHTML = "";
  var input = document.getElementById("sName");
  if (input){ input.setAttribute("aria-expanded","false"); input.setAttribute("aria-activedescendant",""); }
}

function pickSharedSuggestion(i){
  var it = ui.sharedSuggest.items[i];
  var nameEl = document.getElementById("sName");
  if (!it || !nameEl) return;
  nameEl.value = it.name;
  closeSharedSuggestions();
  var priceEl = document.getElementById("sPrice");
  if (priceEl) priceEl.focus();
}

document.addEventListener("input", function(e){
  if (e.target && e.target.id === "sName"){
    ui.sharedSuggest.open = true;
    ui.sharedSuggest.active = -1;
    renderSharedSuggestions();
  }
});
document.addEventListener("keydown", function(e){
  if (!e.target || e.target.id !== "sName" || !ui.sharedSuggest.open) return;
  var n = ui.sharedSuggest.items.length;
  if ((e.key === "ArrowDown" || e.key === "ArrowUp") && n){
    e.preventDefault();
    var next = ui.sharedSuggest.active + (e.key === "ArrowDown" ? 1 : -1);
    ui.sharedSuggest.active = next < 0 ? n - 1 : next >= n ? 0 : next;
    return renderSharedSuggestions();
  }
  if (e.key === "Escape"){ e.preventDefault(); return closeSharedSuggestions(); }
  if (e.key === "Enter" && ui.sharedSuggest.active >= 0){ e.preventDefault(); return pickSharedSuggestion(ui.sharedSuggest.active); }
});
document.addEventListener("click", function(e){
  var t = e.target.closest ? e.target.closest("[data-ssuggest]") : null;
  if (t) return pickSharedSuggestion(parseInt(t.getAttribute("data-ssuggest"),10));
  if (ui.sharedSuggest.open && e.target.id !== "sName" && !(e.target.closest && e.target.closest("#sSuggest"))) closeSharedSuggestions();
});

/* ---- v3.0: คลังค่าใช้จ่ายของทริป (ใช้แทนคลังเมนูเมื่อบิลเป็นทริป) ---- */
var TRIP_POPULAR = ["ที่พัก","ค่าน้ำมัน","ค่าอาหาร","ค่าทางด่วน","ค่าเข้าชม","ของฝาก"];
var TRIP_LIBRARY = [
  "ที่พัก","ค่าห้องพัก","ค่าโฮมสเตย์","ค่ารีสอร์ต","ค่าแคมป์","ค่าเต็นท์",
  "ค่าน้ำมัน","ค่าทางด่วน","ค่าเช่ารถ","ค่าเช่ามอเตอร์ไซค์","ค่าที่จอดรถ","แท็กซี่","Grab","ค่ารถสองแถว","ค่าเรือ","ค่ารถตู้",
  "ตั๋วเครื่องบิน","ตั๋วรถทัวร์","ตั๋วรถไฟ","ค่ากระเป๋าโหลด",
  "ค่าอาหาร","มื้อเช้า","มื้อกลางวัน","มื้อเย็น","ค่าเครื่องดื่ม","กาแฟ","ขนม","ของใช้ในทริป",
  "ค่าเข้าชม","ค่าบัตรเข้าอุทยาน","ค่ากิจกรรม","ค่าไกด์","ค่าทัวร์","ค่าดำน้ำ","ค่าเช่าอุปกรณ์",
  "ของฝาก","ซิมเน็ต","ค่าประกันการเดินทาง","ทิป"
].map(function(n){ return { name:n, norm:normText(n), popular:TRIP_POPULAR.indexOf(n) >= 0 }; });
