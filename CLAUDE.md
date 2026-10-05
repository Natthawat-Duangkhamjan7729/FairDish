# FairDish — กฎของโปรเจกต์

เว็บแอปหารบิลแบบ static ไม่มี build step ไม่มี framework deploy บน Vercel ได้ทันที

## โครงสร้าง

- `index.html` — โครงหน้าเท่านั้น (`.app-shell` ที่มี `<main id="view">` + footer, แท็บล่าง, `#globalSheet`, หน้าต่าง dialog) และลำดับการโหลดสคริปต์
  v3.2: หน้าตาแบบแอป ไม่มีเมนูด้านบน — ทุกหน้าสร้างแถบหัวเองด้วย `appBar()` ใน `pages.js`
  v4.4: จอใหญ่ตามดีไซน์ "FairDish Wide" — มือถือ (<600px) หน้าเดิมใน `pages.js` ไม่เปลี่ยน;
  ≥600px (`isWide()` ใน `render.js` ต้องตรงกับ media query) หน้า `pageXxx()` เรียกฉบับจอใหญ่ใน `wide.js` แทน
  แถบนำทาง `#sidenav` (`renderSideNav()`): แท็บเล็ต = แถบไอคอน 88px, ≥1280px = แถบเต็ม 244px · ซ่อนตอนหน้าแนะนำและหน้า `#/g/<id>/me`
  หน้าหารบิล ≥768px: คนแถวบน + รายการ | สรุปยอดสด · ≥1024px: สามคอลัมน์ · จอข้ามเส้น 600px → `onWideChange()` วาดใหม่ (เก็บข้อความที่พิมพ์ค้างไว้)
- `css/style.css` — สไตล์ทั้งหมด ใช้ตัวแปรสีและขนาดใน `:root` ห้าม hard-code สีใหม่
  v4.5.3: ธีม ตามระบบ / มืด / สว่าง (`THEMES` ใน `pages.js`) ยังไม่เคยเลือก = สว่าง — สคริปต์ใน `<head>` ของ `index.html` กับ `applyTheme()` ต้องให้ผลตรงกัน
  **สีใหม่ต้องใส่ค่าโหมดมืดด้วย** ในสองบล็อกท้ายไฟล์ (`prefers-color-scheme: dark` และ `[data-theme="dark"]`) ให้ตรงกัน
  ใบเสร็จ (`.receipt-wrap`) ใช้ชุดสีสว่างเสมอ
- `js/` — สคริปต์ธรรมดา (ไม่ใช่ ES module) แชร์ตัวแปร global ร่วมกัน
  **ลำดับใน `index.html` สำคัญ:** ไฟล์หลังใช้ของจากไฟล์ก่อนหน้าได้ แต่ห้ามเรียกใช้ของจากไฟล์ที่โหลดทีหลังตอนโหลดไฟล์
  (ในฟังก์ชันที่ถูกเรียกภายหลังใช้ได้) ไฟล์ใหม่ต้องเพิ่ม `<script src>` ใน `index.html` ให้ถูกตำแหน่ง

| ไฟล์ | หน้าที่ |
|---|---|
| `config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (เว้นว่าง = ปิดระบบกลุ่ม) |
| `i18n.js`, `i18n-en.js` | v4.1: `L("ข้อความไทย", {ค่าแทรก})` แปลตาม `LANG` (th/en), คำแปลอังกฤษคีย์เป็นข้อความไทย, `shortDate()` / `monthLabel()` / `longDate()` |
| `store.js` | ชั้นเก็บข้อมูล (localStorage หรือบิลกลุ่มผ่าน `Cloud` เมื่อ `Store.groupId` ถูกตั้ง) |
| `state.js` | `state`, `ui`, ค่าคงที่, `APP_VERSION` |
| `qr.js` | `QR.encode()` / `QR.svg()` สร้าง QR code เอง (byte, เวอร์ชัน 1–10, ระดับแก้ผิด H) — ไม่แตะ DOM |
| `cloud.js` | `Cloud` เรียก RPC ของ Supabase ด้วย `fetch`, รหัส/ลิงก์กลุ่ม, "กลุ่มของฉัน" |
| `menu-library.js` | คลังเมนูแนะนำ |
| `shared-library.js` | รายการแนะนำค่าส่วนกลาง (แยกจากคลังเมนู) |
| `utils.js` | `baht`, `esc`, ไอคอน |
| `save.js` | `commit()` บันทึกข้อมูล |
| `calc.js` | `compute()` / `computeBill(bill)` คำนวณเงิน (ทริปเรียกซ้ำกับมื้อข้างใน), `settle()` / `settleBill()` ใครโอนให้ใคร — **ห้ามแตะ DOM** |
| `receipt.js`, `pages.js`, `render.js` | สร้าง HTML ของแต่ละหน้า |
| `actions.js` | การกระทำของผู้ใช้ |
| `share-image.js` | วาดใบเสร็จเป็นรูป PNG ด้วย canvas (`receiptImageBlob()`, `shareReceiptImage()`) สีอ่านจากตัวแปร CSS ของ `.receipt-wrap` |
| `confirm.js` | v4.1: เพื่อนยืนยันเมนู (`applyConfirm`, `confirmStatusOf`, `saveConfirm` รวมกับข้อมูลล่าสุดเมื่อชน) + หน้า `#/g/<id>/share` และ `#/g/<id>/me` |
| `wide.js` | v4.4: หน้าจอใหญ่ (≥600px) — แถบนำทางซ้าย, หน้าแนะนำหน้าเดียว, หน้าแรก, พื้นที่ทำงานหารบิล (`pageWorkspace`, `renderWorkspace`, แตะ/ลากชื่อ, เลิกทำ `pushUndo`/`wsUndo`), ใบสรุปยอด, ชวนเพื่อน, ประวัติแบบรายการ+รายละเอียด, `onWideChange()` |
| `tour.js` | v4.5: สอนใช้แบบกดจริง — `TOUR_STEPS` (ขั้น: เป้าหมายที่ไฮไลต์, เงื่อนไขทำสำเร็จจาก `state`, mode mobile/wide), `tourStart()` / `tourEnd()`, วาดชั้นสอนใน `#tour` |
| `profile.js` | v4.6: ชื่อที่ให้เราเรียก (`ui.myName`, `Store.profileKey`) — หน้าถามชื่อแบบหน้าเต็ม (`needName()` → `pageHome()` แสดง `pageAskName()`, ต่อจากหน้าแนะนำด้วย `askNameThen()`), ส่วน "ชื่อที่ให้เราเรียก" ในหน้าตั้งค่า, ปุ่ม "+ เพิ่มตัวเอง" (`addSelfHTML()`) |
| `install.js` | ปุ่ม/หน้าต่าง "ติดตั้งแอป" (มือถือเท่านั้น แสดงวิธีของระบบที่ตรวจพบระบบเดียว) — `detectPlatform()`, `detectInApp()`, `beforeinstallprompt` |
| `router.js` | hash router (`#/split`, `#/bill`, `#/history`, `#/h/<id>` บิลในประวัติ, `#/g/<id>`, `#/g/<id>/bill`, `#/g/<id>/share`, `#/g/<id>/me`, `#/more`; `#/groups` เดิม = หน้าประวัติ) + แท็บล่าง (`tabOf()`: home / history — หน้าหารบิลและใบสรุปไม่มีแท็บล่าง) |
| `events.js` | event delegation ของทั้งหน้า |
| `main.js` | `boot()`, `loadContext()` สลับบิลส่วนตัว/บิลกลุ่ม, `refreshGroup()` |

## กฎ

- ข้อความที่มาจากผู้ใช้ต้องผ่าน `esc()` ก่อนใส่ใน HTML ทุกครั้ง
- v4.1: ข้อความที่ผู้ใช้เห็นทุกข้อความต้องผ่าน `L()` เขียนทั้งประโยคพร้อมค่าแทรก เช่น `L("ลบ {name} แล้ว", { name:x })` ห้ามต่อคำทีละท่อน
  แล้วเพิ่มคำแปลใน `js/i18n-en.js` (`tests/i18n.test.js` เช็กว่าครบ) — ตารางข้อความที่ประกาศตอนโหลดไฟล์ให้เรียก `L()` ตอนแสดง ไม่ใช่ตอนประกาศ
- แก้ `js/calc.js` แล้วต้องรัน `node --test` และเพิ่ม test ใน `tests/calc.test.js` ถ้าเป็นกรณีใหม่
  ยอดรายคน (`rounded`) รวมกันต้องเท่ายอดบิล (`grand`) เสมอ
- เปลี่ยนเวอร์ชัน: แก้ `APP_VERSION` ใน `js/state.js`, footer ใน `index.html` และ README ให้ตรงกัน
- ห้ามเพิ่ม dependency, bundler หรือ framework โดยไม่ได้ตกลงกันก่อน
  (Supabase ตกลงแล้วสำหรับระบบกลุ่ม — เรียกผ่าน `fetch` ไม่ใช้ไลบรารี)
- ลิงก์ไปหน้าหารบิล/ใบสรุปยอดใช้ `splitHref()` / `billHref()` เพื่อให้อยู่ในกลุ่มเดิม
  (ลิงก์ใน `index.html` ใส่ `data-link="split|bill"` แล้ว `updateChrome()` ตั้ง href ให้)
- แถวรายการและชิปชื่อไม่ใส่ไอคอนแก้/ลบ — แตะแถว/ชื่อเพื่อเปิดโหมดแก้ ปุ่มลบและปุ่มอื่นอยู่ในนั้น
- บิลมีประเภท `state.kind` = `"meal"` | `"trip"` — คำที่ต่างตามประเภทใช้ `kt("key")` / `ktOf(kind, key)` จาก `KIND_TEXT` ใน `state.js`
  ทริประบุคนจ่ายในแต่ละรายการ (`menus[i].payer`) และใช้ `settleBill()` ใน `calc.js` (เลือกวิธีตามประเภทให้เอง) อย่าเรียก `settle()` ตรง ๆ
- มื้ออาหารในทริป = รายการ `{ type:"meal", name, payer, meal:{ menus, shared, charges } }`
  ตอนแก้มื้อ `enterMeal()` สลับ `state.menus/shared/charges` เป็นของมื้อชั่วคราว (`ui.tripStash` เก็บของทริป) และ `serialize()` ประกอบกลับเป็นทริป
  `route()` / `applyBill()` ออกจากมื้อให้เอง — โค้ดที่วนรายการทริปต้องข้ามหรือจัดการ `type === "meal"` (ไม่มี `eaters`/`price` จริง)
- หน้าหารบิลแบ่งเป็นแท็บ (`steps()` ใน `pages.js`, `ui.step` — คน / เมนู / ส่วนกลาง / สรุป (มือถือเท่านั้น — จอใหญ่ใช้ `pageWorkspace()` ไม่มีแท็บ); ทริปไม่มีแท็บส่วนกลาง, ในมื้อของทริปมีแค่เมนู / ส่วนกลาง) ทุกแผงถูกสร้างครบแต่ซ่อนด้วย `hidden`
  ฟังก์ชัน `render*()` จึงหา element ได้เสมอ — "ใครจ่ายให้ร้าน / ใครโอนให้ใคร" อยู่ในแท็บสรุป (`settleHTML()` ใน `receipt.js`)
- ฟอร์มเพิ่ม/แก้ (เมนู ค่าส่วนกลาง ค่าบริการ) เป็นแผ่นล่างจอ: ห่อด้วย `sheetHTML()` ใน `render.js` แล้วปิดด้วย `data-close-sheet` / Esc
  แผ่นนอกหน้าหารบิล (เลือกประเภทบิล, ตั้งชื่อบิล) ใช้ `renderGlobalSheet()` / `closeGlobalSheet()` ใน `actions.js`
- เลือกประเภทบิลครั้งเดียวตอนเริ่ม (`openKindSheet()` → `startNewBill(kind)`) ไม่มีปุ่มสลับในหน้าหารบิล
  เริ่มบิลใหม่ = บิลส่วนตัวเดิมที่มีข้อมูลถูกเก็บเข้า **ประวัติ** (`ui.history`, `Store.historyKey`) ก่อนเสมอ ห้ามเขียนทับบิลเดิมตรง ๆ
- บิลมี `name` (บิลกลุ่มใช้ชื่อกลุ่มผ่าน `billName()`) และ `paid` = การโอนที่ติ๊กแล้ว คีย์จาก `transferKey()` ใน `calc.js` (รวมยอดเป็นสตางค์ ยอดเปลี่ยน = ติ๊กเดิมไม่นับ)
  ข้อมูลที่บันทึกไว้ทุกแหล่งผ่าน `normalizeBill()` ใน `save.js` ก่อนใช้
- v4.1: การยืนยันเมนูเก็บที่ `confirms` (บันทึกไปกับบิล/กลุ่ม)
- v4.4: พื้นที่ทำงานจอใหญ่ใช้ฟังก์ชันวาดเดิมผ่าน id เดิม (`#memberInput`, `#menuFormSlot`, `#chargeList`, `#sharedList`, `#mealHead`)
  `renderMembers()` / `renderMenus()` / `renderSummary()` ส่งต่อไป `renderWs*()` เมื่อ `wsActive()` — การแก้ข้อมูลในพื้นที่ทำงานต้องเรียก `pushUndo()` ก่อน
  ปุ่มลัด (N, M, T, Ctrl/⌘+Z, Esc) อยู่ใน `wideShortcut()` ของ `events.js` และไม่ทำงานตอนกำลังพิมพ์
  ช่องเพิ่มรายการบรรทัดเดียว (`#wsName`) ใช้เมนูแนะนำชุดเดียวกับฟอร์มแผ่น (`menuSuggestions()` + `suggestBoxHTML()` ใน `actions.js`)
- v4.5: ระหว่างสอนใช้ (`ui.tour`) ใช้ "บิลฝึก" (`practiceBill()` ใส่แทนบิลในเครื่องตอน `loadContext()`) — `commit()` / `rememberMenu()` ไม่บันทึกอะไร,
  ชวนเพื่อน/สร้างกลุ่มถูกปิด, เริ่มบิลใหม่หรือเปิดหน้าอื่นนอก `#/split` `#/bill` = จบการสอน · แก้ปุ่ม/หน้าที่การสอนชี้ ต้องแก้ `target` ใน `TOUR_STEPS` ด้วย
  v4.5.1: ทุกขั้นมีปุ่ม "ถัดไป" — ขั้นที่ขั้นหลังพึ่งข้อมูลของมันต้องมี `auto()` (ระบบทำให้ด้วยข้อมูลตัวอย่างเมื่อกดถัดไปโดยยังไม่ได้ทำเอง)
- v4.4.1: หน้าแนะนำขึ้นครั้งเดียวต่อเครื่อง (`ONBOARD_KEY` = `fairdish:onboarded:v2` ใน `pages.js` — เปลี่ยนเลขเมื่ออยากให้ทุกคนเห็นใหม่)
  เปิดครั้งแรกจากหน้าอื่น `route()` จำหน้าไว้ใน `ui.onbNext` แล้วพาไปหน้าแนะนำก่อน — ลิงก์กลุ่ม (`#/g/...`) ไม่ต้องผ่านหน้าแนะนำ
- v4.6: ชื่อที่ให้เราเรียกเก็บแยกที่ `Store.profileKey` ในเครื่องเท่านั้น ห้ามใส่ลงข้อมูลบิล/กลุ่มเอง (ใส่ได้เฉพาะตอนผู้ใช้กด "+ เพิ่มตัวเอง")
  ถามครั้งเดียวต่อเครื่อง: ใส่ชื่อหรือ "ไว้ทีหลัง" = `asked:true` · เป็นหน้าเต็มของหน้าหลัก ไม่ใช่หน้าต่างเด้ง (ห้ามซ้อนกับหน้าแนะนำ/การสอน) ไม่ขึ้นตอนเปิดลิงก์กลุ่ม
- เลื่อนจอจากโค้ดใช้ `jumpTo(y)` (utils.js) ไม่ใช้ `window.scrollTo(0,y)` — html มี scroll-behavior:smooth ทำให้กลายเป็นแอนิเมชันที่แย่งกับการเลื่อนครั้งถัดไป
- v4.7: บิลกลุ่มอัปเดตสดด้วยการดึง `get_group` ทุก `LIVE_MS` (main.js) ตอนแท็บอยู่หน้าจอ — `refreshGroup(false, true)` ข้ามเมื่อกำลังกรอก/พิมพ์ (`typingInView()`, `ui.sheet`)
  แจ้งเฉพาะข่าวที่บอกได้ (`groupNews()`: ใครเข้ากลุ่ม/ยืนยันเมนู) · สร้างกลุ่มด้วย `inviteFromBill(hostName)` ใส่ชื่อคนสร้างเป็นสมาชิกแรก + ตั้ง `me`
- v4.8: ชวนเพื่อนต่างกันตามประเภท — มื้ออาหารชวนท้ายบิล (ลิงก์ `/me` ยืนยันเมนู) · ทริปสร้างกลุ่มก่อนได้ (`data-new-kind="trip-group"`,
  ปุ่ม `#inviteBtn` ในขั้นใส่คน) ลิงก์ = บิลกลุ่ม `#/g/<id>` ใช้ `inviteLink()` / `inviteLabel()` ใน confirm.js อย่าเรียก `confirmLink()` ตรง ๆ ในหน้าชวน
- v4.2: **ห้ามเก็บเบอร์โทร เลขบัตรประชาชน หรือข้อมูลระบุตัวตนอื่นในข้อมูลบิล** (บิลกลุ่มอยู่บน Supabase และใครมีลิงก์ก็อ่านได้ — PDPA)
  `normalizeBill()` เก็บ members แค่ `{ id, name }`
- แก้ฟังก์ชันใน `supabase/schema.sql` ต้องรัน SQL ใหม่ใน Supabase ด้วย

## ทดสอบ

```
node --test                 # ทดสอบการคำนวณ
npx serve .                 # เปิดเว็บที่ http://localhost:3000
```

แนะนำให้ติดตั้ง skill `scrutinize` และ `debug-mantra` จาก `npx skills add thananon/9arm-skills`
แล้วใช้ `scrutinize` รีวิวงานตัวเองก่อน push และใช้ `debug-mantra` เวลาไล่บั๊ก

## ระดับของเว็บ

| ระดับ | branch |
|---|---|
| ตัวเต็ม (ทุกคนใช้) | `claude/upload-website-wtcq0p` → fairdish.vercel.app |
| Beta | `claude/playground` |
| Developer Beta | `claude/dev-beta` |

ปล่อยไล่ลำดับ Developer Beta → Beta → ตัวเต็ม เมื่อเจ้าของโปรเจกต์สั่งเท่านั้น
commit ที่ใส่แถบบอกระดับ (แถบ Beta / Developer Beta) ห้ามติดไปกับการปล่อยขึ้นระดับถัดไป

## Vercel

- เว็บจริง: https://fairdish.vercel.app — push ขึ้น branch `claude/upload-website-wtcq0p` แล้ว Vercel deploy ให้อัตโนมัติ
- เรียก Vercel API ผ่าน `scripts/vercel-api.sh <path>` เสมอ (ลองซ้ำให้เอง เพราะคำขอแรกของ session บนคลาวด์อาจได้ 502)
  token ถูกใส่ให้โดย API credentials ของ environment ห้ามพิมพ์หรือ log token
