# FairDish — กฎของโปรเจกต์

เว็บแอปหารบิลแบบ static ไม่มี build step ไม่มี framework deploy บน Vercel ได้ทันที

## โครงสร้าง

- `index.html` — โครงหน้าเท่านั้น (`.app-shell` ที่มี `<main id="view">` + footer, แท็บล่าง, `#globalSheet`, หน้าต่าง dialog) และลำดับการโหลดสคริปต์
  v3.2: หน้าตาแบบแอปมือถือ กว้างไม่เกิน 480px (จอคอมจัดไว้กลางจอ) ไม่มีเมนูด้านบน — ทุกหน้าสร้างแถบหัวเองด้วย `appBar()` ใน `pages.js`
- `css/style.css` — สไตล์ทั้งหมด ใช้ตัวแปรสีและขนาดใน `:root` ห้าม hard-code สีใหม่
  **สีใหม่ต้องใส่ค่าโหมดมืดด้วย** ในสองบล็อกท้ายไฟล์ (`prefers-color-scheme: dark` และ `[data-theme="dark"]`) ให้ตรงกัน
  ใบเสร็จ (`.receipt-wrap`) ใช้ชุดสีสว่างเสมอ
- `js/` — สคริปต์ธรรมดา (ไม่ใช่ ES module) แชร์ตัวแปร global ร่วมกัน
  **ลำดับใน `index.html` สำคัญ:** ไฟล์หลังใช้ของจากไฟล์ก่อนหน้าได้ แต่ห้ามเรียกใช้ของจากไฟล์ที่โหลดทีหลังตอนโหลดไฟล์
  (ในฟังก์ชันที่ถูกเรียกภายหลังใช้ได้) ไฟล์ใหม่ต้องเพิ่ม `<script src>` ใน `index.html` ให้ถูกตำแหน่ง

| ไฟล์ | หน้าที่ |
|---|---|
| `config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (เว้นว่าง = ปิดระบบกลุ่ม) |
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
| `install.js` | ปุ่ม/หน้าต่าง "ติดตั้งแอป" (มือถือเท่านั้น แสดงวิธีของระบบที่ตรวจพบระบบเดียว) — `detectPlatform()`, `detectInApp()`, `beforeinstallprompt` |
| `router.js` | hash router (`#/split`, `#/bill`, `#/history`, `#/h/<id>` บิลในประวัติ, `#/g/<id>`, `#/g/<id>/bill`, `#/more`; `#/groups` เดิม = หน้าประวัติ) + แท็บล่าง (`tabOf()`: home / history — หน้าหารบิลและใบสรุปไม่มีแท็บล่าง) |
| `events.js` | event delegation ของทั้งหน้า |
| `main.js` | `boot()`, `loadContext()` สลับบิลส่วนตัว/บิลกลุ่ม, `refreshGroup()` |

## กฎ

- ข้อความที่มาจากผู้ใช้ต้องผ่าน `esc()` ก่อนใส่ใน HTML ทุกครั้ง
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
- หน้าหารบิลแบ่งเป็นแท็บ (`steps()` ใน `pages.js`, `ui.step` — คน / เมนู / ส่วนกลาง / สรุป; ทริปไม่มีแท็บส่วนกลาง, ในมื้อของทริปมีแค่เมนู / ส่วนกลาง) ทุกแผงถูกสร้างครบแต่ซ่อนด้วย `hidden`
  ฟังก์ชัน `render*()` จึงหา element ได้เสมอ — "ใครจ่ายให้ร้าน / ใครโอนให้ใคร" อยู่ในแท็บสรุป (`settleHTML()` ใน `receipt.js`)
- ฟอร์มเพิ่ม/แก้ (เมนู ค่าส่วนกลาง ค่าบริการ) เป็นแผ่นล่างจอ: ห่อด้วย `sheetHTML()` ใน `render.js` แล้วปิดด้วย `data-close-sheet` / Esc
  แผ่นนอกหน้าหารบิล (เลือกประเภทบิล, ตั้งชื่อบิล) ใช้ `renderGlobalSheet()` / `closeGlobalSheet()` ใน `actions.js`
- เลือกประเภทบิลครั้งเดียวตอนเริ่ม (`openKindSheet()` → `startNewBill(kind)`) ไม่มีปุ่มสลับในหน้าหารบิล
  เริ่มบิลใหม่ = บิลส่วนตัวเดิมที่มีข้อมูลถูกเก็บเข้า **ประวัติ** (`ui.history`, `Store.historyKey`) ก่อนเสมอ ห้ามเขียนทับบิลเดิมตรง ๆ
- บิลมี `name` (บิลกลุ่มใช้ชื่อกลุ่มผ่าน `billName()`) และ `paid` = การโอนที่ติ๊กแล้ว คีย์จาก `transferKey()` ใน `calc.js` (รวมยอดเป็นสตางค์ ยอดเปลี่ยน = ติ๊กเดิมไม่นับ)
  ข้อมูลที่บันทึกไว้ทุกแหล่งผ่าน `normalizeBill()` ใน `save.js` ก่อนใช้
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
