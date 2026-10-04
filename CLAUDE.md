# FairDish — กฎของโปรเจกต์

เว็บแอปหารบิลแบบ static ไม่มี build step ไม่มี framework deploy บน Vercel ได้ทันที

## โครงสร้าง

- `index.html` — โครงหน้าเท่านั้น (header, `<main id="view">`, footer) และลำดับการโหลดสคริปต์
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
| `calc.js` | `compute()` คำนวณเงิน, `settle()` ใครโอนให้ใคร (คิดเป็นสตางค์) — **ห้ามแตะ DOM** |
| `receipt.js`, `pages.js`, `render.js` | สร้าง HTML ของแต่ละหน้า |
| `actions.js` | การกระทำของผู้ใช้ |
| `share-image.js` | วาดใบเสร็จเป็นรูป PNG ด้วย canvas (`receiptImageBlob()`, `shareReceiptImage()`) สีอ่านจากตัวแปร CSS ของ `.receipt-wrap` |
| `install.js` | ปุ่ม/หน้าต่าง "ติดตั้งแอป" (มือถือเท่านั้น แสดงวิธีของระบบที่ตรวจพบระบบเดียว) — `detectPlatform()`, `detectInApp()`, `beforeinstallprompt` |
| `router.js` | hash router (`#/split`, `#/bill`, `#/groups`, `#/g/<id>`, `#/g/<id>/bill`, `#/more`) + แท็บล่าง (`tabOf()`: home / split / bill / groups / more) |
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
- หน้าหารบิลแบ่งเป็นแท็บ (`STEPS` ใน `pages.js`, `ui.step`) ทุกแผงถูกสร้างครบแต่ซ่อนด้วย `hidden`
  ฟังก์ชัน `render*()` จึงหา element ได้เสมอ
- แก้ฟังก์ชันใน `supabase/schema.sql` ต้องรัน SQL ใหม่ใน Supabase ด้วย

## ทดสอบ

```
node --test                 # ทดสอบการคำนวณ
npx serve .                 # เปิดเว็บที่ http://localhost:3000
```

แนะนำให้ติดตั้ง skill `scrutinize` และ `debug-mantra` จาก `npx skills add thananon/9arm-skills`
แล้วใช้ `scrutinize` รีวิวงานตัวเองก่อน push และใช้ `debug-mantra` เวลาไล่บั๊ก

## Vercel

- เว็บจริง: https://fairdish.vercel.app — push ขึ้น branch `claude/upload-website-wtcq0p` แล้ว Vercel deploy ให้อัตโนมัติ
- เรียก Vercel API ผ่าน `scripts/vercel-api.sh <path>` เสมอ (ลองซ้ำให้เอง เพราะคำขอแรกของ session บนคลาวด์อาจได้ 502)
  token ถูกใส่ให้โดย API credentials ของ environment ห้ามพิมพ์หรือ log token
