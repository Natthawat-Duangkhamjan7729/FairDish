# FairDish — กฎของโปรเจกต์

เว็บแอปหารบิลแบบ static ไม่มี build step ไม่มี framework deploy บน Vercel ได้ทันที

## โครงสร้าง

- `index.html` — โครงหน้าเท่านั้น (header, `<main id="view">`, footer) และลำดับการโหลดสคริปต์
- `css/style.css` — สไตล์ทั้งหมด ใช้ตัวแปรสีและขนาดใน `:root` ห้าม hard-code สีใหม่
- `js/` — สคริปต์ธรรมดา (ไม่ใช่ ES module) แชร์ตัวแปร global ร่วมกัน
  **ลำดับใน `index.html` สำคัญ:** ไฟล์หลังใช้ของจากไฟล์ก่อนหน้าได้ แต่ห้ามเรียกใช้ของจากไฟล์ที่โหลดทีหลังตอนโหลดไฟล์
  (ในฟังก์ชันที่ถูกเรียกภายหลังใช้ได้) ไฟล์ใหม่ต้องเพิ่ม `<script src>` ใน `index.html` ให้ถูกตำแหน่ง

| ไฟล์ | หน้าที่ |
|---|---|
| `store.js` | ชั้นเก็บข้อมูล (localStorage) |
| `state.js` | `state`, `ui`, ค่าคงที่, `APP_VERSION` |
| `menu-library.js` | คลังเมนูแนะนำ |
| `utils.js` | `baht`, `esc`, ไอคอน |
| `save.js` | `commit()` บันทึกข้อมูล |
| `calc.js` | `compute()` คำนวณเงิน — **ห้ามแตะ DOM** |
| `receipt.js`, `pages.js`, `render.js` | สร้าง HTML ของแต่ละหน้า |
| `actions.js` | การกระทำของผู้ใช้ |
| `router.js` | hash router (`#/split`, `#/bill`, …) |
| `events.js` | event delegation ของทั้งหน้า |
| `main.js` | `boot()` |

## กฎ

- ข้อความที่มาจากผู้ใช้ต้องผ่าน `esc()` ก่อนใส่ใน HTML ทุกครั้ง
- แก้ `js/calc.js` แล้วต้องรัน `node --test` และเพิ่ม test ใน `tests/calc.test.js` ถ้าเป็นกรณีใหม่
  ยอดรายคน (`rounded`) รวมกันต้องเท่ายอดบิล (`grand`) เสมอ
- เปลี่ยนเวอร์ชัน: แก้ `APP_VERSION` ใน `js/state.js`, footer ใน `index.html` และ README ให้ตรงกัน
- ห้ามเพิ่ม dependency, bundler หรือ framework โดยไม่ได้ตกลงกันก่อน

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
