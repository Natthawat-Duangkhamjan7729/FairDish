/* FairDish — หน้าเว็บแต่ละหน้า */
"use strict";

/* =========================================================
   6. หน้าเว็บ
   ========================================================= */
function item(k,h,p){ return '<li><span class="k">'+k+'</span><div><h3>'+h+'</h3><p>'+p+'</p></div></li>'; }

function pageHome(){
  return ''+
  '<section class="hero"><div class="wrap hero-grid">'+
    '<div>'+
      '<p class="eyebrow">หารบิลให้สนุกขึ้นอีกนิด</p>'+
      '<h1>จ่ายตามที่กินจริง<br>จบทุกมื้ออย่างแฟร์</h1>'+
      '<p class="lede">FairDish คิดค่าอาหารจากเมนูที่แต่ละคนกินจริง บวกค่าส่วนกลางให้อัตโนมัติ แล้วสรุปออกมาเป็นบิลรายคนที่ส่งเข้ากลุ่มได้ทันที จบปัญหาคนกินน้อยต้องจ่ายเท่าคนกินเยอะ</p>'+
      '<p class="note"><span class="spark">&#9829; มื้อสนุก ไม่ต้องเกี่ยงยอด</span></p>'+
      '<div class="hero-steps"><span><b>1</b>เพิ่มเพื่อน</span><span><b>2</b>ใส่เมนู</span><span><b>3</b>ดูยอด</span></div>'+
      '<div class="btn-row"><a class="btn btn-main" href="#/split">เริ่มหารบิล &#8595;</a>'+
      '<a class="btn btn-line" href="#/how">ดูวิธีใช้</a></div>'+
      '<p class="note" style="margin-top:var(--s4)">ไม่ต้องสมัครสมาชิก · เปิดใช้ได้ทันทีบนมือถือ · บันทึกบิลไว้ในเครื่องให้อัตโนมัติ</p>'+
    '</div><div class="hero-art">'+
      '<span class="blob purple" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 3v6a3 3 0 0 0 6 0V3M10 12v9M17 3v18M17 3c-2 1-3 4-3 7h3"/></svg></span>'+
      '<span class="blob coral" aria-hidden="true">&#247;</span>'+
      '<span class="blob mint" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>'+
      demoReceiptHTML()+'</div>'+
  '</div></section>'+

  '<section><div class="wrap">'+
    '<div class="sec-head"><h2>บิลใบเดียวกัน สองวิธีคิด</h2>'+
    '<p>มื้อจริงจากการทดลองใช้: 8 คน 5 เมนู รวมค่าน้ำและข้าวเหนียว 620 บาท</p></div>'+
    '<div class="compare">'+
      '<div class="cmp bad"><h3>หารเท่ากันทั้งโต๊ะ</h3><div class="tag">620 ÷ 8 = ทุกคนจ่ายเท่ากัน</div>'+
        '<ul><li><span>ชาเน่ — กิน 1 เมนู</span><span>77.50</span></li>'+
        '<li><span>มาร์ค — กิน 4 เมนู</span><span>77.50</span></li>'+
        '<li><span>เจ้าสั่ว — กิน 4 เมนูราคาสูง</span><span>77.50</span></li></ul>'+
        '<p class="foot">ชาเน่จ่ายเกินไป 40.09 บาท ส่วนเจ้าสั่วจ่ายขาดไป 59.24 บาท ทั้งที่ไม่มีใครตั้งใจเอาเปรียบกัน</p></div>'+
      '<div class="cmp good"><h3>หารด้วย FairDish</h3><div class="tag">คิดจากเมนูที่แต่ละคนกินจริง</div>'+
        '<ul><li><span>ชาเน่ — กิน 1 เมนู</span><span>37.41</span></li>'+
        '<li><span>มาร์ค — กิน 4 เมนู</span><span>106.75</span></li>'+
        '<li><span>เจ้าสั่ว — กิน 4 เมนูราคาสูง</span><span>136.74</span></li></ul>'+
        '<p class="foot">ยอดรายคนรวมกันได้ 620.00 บาทพอดี ไม่มีเศษสตางค์หาย และทุกคนกดดูได้ว่ายอดของตัวเองมาจากเมนูไหน</p></div>'+
    '</div>'+
  '</div></section>'+

  '<section><div class="wrap">'+
    '<div class="sec-head"><h2>สิ่งที่ FairDish ทำให้</h2><p>ทุกอย่างอยู่ในหน้าเดียว ไล่จากบนลงล่างแล้วได้บิลเลย</p></div>'+
    '<ul class="bill-list">'+
      item("01","เพิ่มคนในโต๊ะ","ใส่ชื่อสมาชิกที่ร่วมมื้อนี้ แก้ชื่อหรือลบออกได้ตลอด พร้อมเลิกทำถ้าลบผิดคน")+
      item("02","ใส่เมนูและราคา","พิมพ์ไม่กี่ตัวอักษรก็มีเมนูแนะนำกว่า 1,000 รายการขึ้นมาให้เลือก และเมนูที่คุณสั่งเองระบบจำไว้ให้พร้อมราคาครั้งก่อน")+
      item("03","เลือกคนที่กินแต่ละเมนู","แตะชื่อคนที่กินจานนั้น ระบบหารเฉพาะคนที่แตะไว้ ไม่ใช่ทั้งโต๊ะ")+
      item("04","บวกค่าส่วนกลางอัตโนมัติ","ค่าบริการ 10% VAT 7% หรือกำหนดเปอร์เซ็นต์เอง ส่วนน้ำแข็ง น้ำเปล่า ข้าวเหนียว หารเท่ากันทุกคน")+
      item("05","สรุปยอดเป็นบิลรายคน","แตะชื่อใครก็เห็นทันทีว่ายอดนั้นมาจากเมนูไหนบ้าง กี่บาท หารกี่คน")+
      item("06","คัดลอกส่งเข้ากลุ่ม","กดปุ่มเดียวได้ข้อความสรุปพร้อมวางในแชทกลุ่ม ไม่ต้องพิมพ์ตามทีละคน")+
      item("07","ตรวจสอบและแก้ไขได้ตลอด","แก้เมนู ราคา หรือคนกินได้ทุกเมื่อ บิลคำนวณใหม่ให้ทันทีโดยไม่ต้องเริ่มใหม่")+
    '</ul>'+
  '</div></section>'+

  '<section><div class="wrap"><div class="cta-box">'+
    '<h2>มื้อหน้าไม่ต้องกดเครื่องคิดเลขแล้ว</h2>'+
    '<p>เปิด FairDish ตอนบิลมาถึงโต๊ะ ใส่ชื่อกับเมนู แล้วส่งยอดเข้ากลุ่มก่อนจะลุกจากร้าน</p>'+
    '<div class="btn-row"><a class="btn btn-main" href="#/split">เริ่มหารบิล</a>'+
    '<a class="btn btn-line" href="#/about">ที่มาของโปรเจกต์</a></div>'+
  '</div></div></section>';
}

function pageSplit(){
  return '<div class="page"><div class="wrap app-col">'+
    '<div class="page-head" style="margin-bottom:var(--s5);max-width:none">'+
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);flex-wrap:wrap">'+
        '<h1>หารบิล</h1>'+
        '<button class="btn-quiet" id="resetBtn" style="font-size:var(--fs-small);min-height:var(--tap);padding:var(--s2) var(--s4)">+ เริ่มบิลใหม่</button>'+
      '</div>'+
      '<label class="sr-only" for="billName">ชื่อบิล</label>'+
      '<input type="text" id="billName" class="bill-name" maxlength="40" autocomplete="off" '+
        'placeholder="ตั้งชื่อบิล เช่น ส้มตำป้าแดง" value="'+esc(currentBill() ? currentBill().name : "")+'">'+
      '<p>ไล่ทีละขั้นจาก 1 ถึง 4 ระบบบันทึกให้อัตโนมัติ บิลเก่าดูและแก้ได้ใน <a href="#/history">ประวัติ</a></p>'+
      (ui.confirmReset ? '<div class="confirm" role="alertdialog" aria-label="เริ่มบิลใหม่">'+
        '<h3>เริ่มบิลใหม่?</h3>'+
        '<p>บิลนี้ถูกเก็บไว้ในประวัติแล้ว เปิดกลับมาแก้ได้ทุกเมื่อ</p>'+
        '<div class="btn-row"><button class="btn-quiet" id="cancelReset">ยกเลิก</button>'+
        '<button class="btn-quiet" id="confirmResetKeep">ใช้เพื่อนชุดเดิม</button>'+
        '<button class="btn-sm" id="confirmReset">บิลว่าง</button></div></div>' : '')+
    '</div>'+

    '<section class="step-card" aria-labelledby="h-members">'+
      '<div class="step-head"><span class="step-num">1</span><h2 id="h-members">ใครกินบ้าง</h2>'+
      '<span class="aside" id="memberCount"></span></div>'+
      '<div class="field-row">'+
        '<div>'+
          '<label class="sr-only" for="memberInput">ชื่อคนที่ร่วมมื้อนี้</label>'+
          '<input type="text" id="memberInput" placeholder="พิมพ์ชื่อ เช่น มาร์ค" autocomplete="off" maxlength="'+MAX_NAME+'" aria-describedby="memberMsg">'+
        '</div>'+
        '<button class="btn-sm" id="memberAdd">เพิ่ม</button>'+
      '</div>'+
      '<p class="field-msg muted" id="memberMsg" aria-live="polite"></p>'+
      '<div id="memberList"></div>'+
      '<div id="memberExtra"></div>'+
    '</section>'+

    '<section class="step-card" aria-labelledby="h-menus"><div class="step-head"><span class="step-num">2</span><h2 id="h-menus">รายการอาหาร</h2>'+
      '<span class="aside" id="menuMeta"></span></div>'+
      '<div id="menuList"></div><div id="menuFormSlot"></div></section>'+

    '<section class="step-card"><div class="step-head"><span class="step-num">3</span><h2>ค่าส่วนกลาง</h2></div>'+
      '<p class="hint">คิดเป็น % จากยอดของแต่ละคน</p>'+
      '<div class="pick" id="chargeList"></div><div id="chargeFormSlot"></div>'+
      '<p class="sub-head">หารเท่ากันทุกคน</p>'+
      '<div id="sharedList"></div><div id="sharedFormSlot"></div></section>'+

    '<section class="step-card"><div class="step-head"><span class="step-num">4</span><h2>สรุปยอด</h2>'+
      '<span class="aside" id="summaryAside"></span></div>'+
      '<div id="summary" aria-live="polite"></div></section>'+

    '<div class="app-foot"><button id="demoBtn">ใส่ข้อมูลตัวอย่าง</button></div>'+
  '</div></div>';
}

function pageBill(){
  var head = '<div class="page"><div class="wrap">'+
    '<a class="crumb" href="#/split">← กลับไปแก้บิล</a>'+
    '<div class="page-head"><h1>ใบสรุปยอด</h1>'+
    '<p>ยอดที่แต่ละคนต้องจ่าย พร้อมที่มาของทุกบาท กางให้ทั้งโต๊ะดูหรือคัดลอกส่งเข้ากลุ่มได้เลย</p></div>';
  if (ui.loading) return head + '<div class="empty" style="max-width:540px">กำลังโหลดข้อมูลบิล…</div></div></div>';
  if (!hasData()){
    return head + '<div class="empty" style="max-width:540px">ยังไม่มีข้อมูลบิล เริ่มจากใส่ชื่อคนกินและเมนูในหน้าหารบิลก่อน<br><br>'+
      '<a class="btn btn-main" href="#/split">ไปหน้าหารบิล</a></div></div></div>';
  }
  var r = compute();
  return head + '<div class="app-col">'+
      (r.orphan>0 ? '<div class="notice warn"><p>มี '+r.orphan+' เมนูที่ยังไม่ได้เลือกคนกิน จึงยังไม่ถูกรวมในบิลนี้</p></div>' : '')+
      receiptHTML(r,{interactive:true})+
      '<button class="btn-sm btn-block" id="copyBtn" style="margin-top:var(--s5)">คัดลอกสรุปยอด</button>'+
      '<div class="app-foot"><a href="#/split">แก้ไขรายการ</a></div>'+
    '</div></div></div>';
}

function pageHow(){
  return '<div class="page"><div class="wrap">'+
    '<div class="page-head"><h1>วิธีใช้ 4 ขั้น</h1>'+
    '<p>ออกแบบให้ทำเสร็จภายในเวลาที่พนักงานเดินไปเก็บเงินอีกโต๊ะ</p></div>'+
    '<div class="steps">'+
      '<div class="stp"><b>1</b><h3>ใครกินบ้าง</h3><p>พิมพ์ชื่อทุกคนที่ร่วมโต๊ะ กดเพิ่มทีละคน ชื่อเล่นสั้น ๆ อ่านง่ายที่สุดตอนดูบิล</p></div>'+
      '<div class="stp"><b>2</b><h3>รายการอาหาร</h3><p>ใส่ชื่อเมนูกับราคาต่อจาน แล้วแตะเลือกคนที่กินจานนั้น ถ้าทั้งโต๊ะกินกดปุ่มทุกคนได้เลย</p></div>'+
      '<div class="stp"><b>3</b><h3>ค่าส่วนกลาง</h3><p>เปิดค่าบริการหรือ VAT ตามที่ร้านคิด ส่วนน้ำเปล่า น้ำแข็ง ข้าวเหนียว ใส่เป็นรายการหารเท่ากัน</p></div>'+
      '<div class="stp"><b>4</b><h3>สรุปยอด</h3><p>บิลขึ้นเองทันที แตะชื่อใครก็ดูที่มาของยอดได้ แล้วกดคัดลอกส่งเข้ากลุ่ม</p></div>'+
    '</div>'+
    '<section><div class="sec-head"><h2>สามคำถามที่ถูกถามบ่อย</h2></div>'+
      '<div class="split2">'+
        '<div class="panel"><h3>เศษสตางค์หายไปไหน</h3><p>ไม่หาย FairDish กระจายเศษสตางค์ให้ยอดรายคนรวมกันเท่ากับยอดบิลเป๊ะเสมอ ไม่ต้องมีใครควักเพิ่มทีหลัง</p></div>'+
        '<div class="panel"><h3>ค่าบริการคิดยังไง</h3><p>คิดเป็นเปอร์เซ็นต์จากยอดของแต่ละคนหลังรวมส่วนแบ่งค่าส่วนกลางแล้ว เหมือนที่ร้านคิดจากยอดบิลรวม</p></div>'+
        '<div class="panel"><h3>ปิดหน้าเว็บแล้วข้อมูลหายไหม</h3><p>ไม่หาย ระบบบันทึกบิลไว้ในเครื่องให้อัตโนมัติทุกครั้งที่แก้ข้อมูล เปิดกลับมาก็ทำต่อได้จากจุดเดิม</p></div>'+
      '</div>'+
    '</section>'+
    '<section><div class="cta-box"><h2>พร้อมลองแล้ว</h2>'+
      '<p>มีข้อมูลตัวอย่างให้กดใส่ในหน้าหารบิล ลองดูผลก่อนใช้จริงได้</p>'+
      '<div class="btn-row"><a class="btn btn-main" href="#/split">เริ่มหารบิล</a></div></div></section>'+
  '</div></div>';
}

function pageAbout(){
  return '<div class="page"><div class="wrap">'+
    '<div class="page-head"><h1>เกี่ยวกับ FairDish</h1>'+
    '<p>โปรเจกต์ที่เริ่มจากคำถามง่าย ๆ ว่าทำไมคนสั่งน้ำเปล่าแก้วเดียวต้องจ่ายเท่าคนสั่งสเต๊ก</p></div>'+
    '<div class="split2">'+
      '<div class="panel"><h3>ปัญหาที่ต้องการแก้</h3>'+
        '<p>การกินข้าวเป็นกลุ่มมักจบด้วยการหารเท่ากันทั้งโต๊ะ เพราะเร็วและไม่ต้องคิดมาก แต่คนที่กินน้อยหรือไม่ได้กินบางเมนูก็ต้องจ่ายมากกว่าที่ควร ความรู้สึกไม่เป็นธรรมสะสมจนกลายเป็นความขัดแย้งในกลุ่ม และการคิดเองก็ผิดพลาดง่ายเมื่อมีค่าบริการกับ VAT เข้ามา</p></div>'+
      '<div class="panel"><h3>ผู้ใช้ที่เราออกแบบให้</h3><dl class="dl">'+
          '<div><dt>ตัวแทนผู้ใช้</dt><dd>นายสมภูมิ อายุ 22 ปี นักศึกษา</dd></div>'+
          '<div><dt>สถานการณ์</dt><dd>กินข้าวกับเพื่อนเป็นกลุ่ม แต่ละคนสั่งไม่เท่ากัน</dd></div>'+
          '<div><dt>สิ่งที่ต้องการ</dt><dd>หารค่าอาหารให้ลงตัวโดยไม่ต้องเถียงกัน</dd></div>'+
          '<div><dt>สิ่งที่คาดหวัง</dt><dd>คำนวณถูกต้อง ครบถ้วน และอธิบายที่มาของยอดได้</dd></div>'+
      '</dl></div>'+
    '</div>'+
    '<section><div class="sec-head"><h2>ขอบเขตของเวอร์ชันนี้</h2>'+
      '<p>FairDish มีผู้ใช้ประเภทเดียว ทุกคนที่เปิดแอปทำสิ่งเดียวกันได้ทั้งหมด จึงไม่มีระบบสมาชิกหรือสิทธิ์แอดมินให้ต้องจำรหัสผ่าน</p></div>'+
      '<ul class="bill-list">'+
        item("✓","ใช้ได้ทันทีโดยไม่ต้องล็อกอิน","เปิดแล้วใช้เลย ไม่เก็บข้อมูลส่วนตัว ไม่ต้องรอโหลดบัญชี")+
        item("✓","บันทึกบิลไว้ในเครื่องให้อัตโนมัติ","แก้อะไรก็บันทึกทันที ปิดแล้วเปิดใหม่ยังทำต่อได้จากบิลเดิม")+
        item("—","ยังไม่มีประวัติบิลย้อนหลัง","เก็บได้ครั้งละหนึ่งบิล เป็นสิ่งที่จะต่อยอดในเวอร์ชันถัดไป พร้อมการแชร์ลิงก์ให้เพื่อนกดยืนยันเมนูของตัวเอง")+
      '</ul>'+
    '</section>'+
    '<section><div class="cta-box"><h2>ลองใช้ดูก่อนตัดสิน</h2>'+
      '<p>กดใส่ข้อมูลตัวอย่างในหน้าหารบิล แล้วดูว่าบิลรายคนออกมาหน้าตาเป็นยังไง</p>'+
      '<div class="btn-row"><a class="btn btn-main" href="#/split">เริ่มหารบิล</a>'+
      '<a class="btn btn-line" href="#/how">อ่านวิธีใช้</a></div></div></section>'+
  '</div></div>';
}
