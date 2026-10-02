#!/usr/bin/env bash
# เรียก Vercel REST API แบบอ่านอย่างเดียว พร้อมลองซ้ำอัตโนมัติ
# คำขอแรกหลังเริ่ม session บนคลาวด์บางครั้งได้ 502 หรือคำตอบว่าง แล้วครั้งต่อไปผ่าน
# token ถูกใส่ให้โดย API credentials ของ environment — สคริปต์นี้ไม่อ่านหรือพิมพ์ token
#
# ใช้: scripts/vercel-api.sh /v2/user
#      scripts/vercel-api.sh "/v6/deployments?app=fairdish&limit=5"
set -euo pipefail
path="${1:?usage: scripts/vercel-api.sh /v2/user}"
exec curl -sS --fail --retry 3 --retry-all-errors --retry-delay 1 --max-time 20 \
  "https://api.vercel.com${path}"
