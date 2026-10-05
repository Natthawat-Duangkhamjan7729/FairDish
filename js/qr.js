/* FairDish — สร้าง QR code เอง ไม่ใช้ไลบรารี (v2.7)
   รองรับข้อความแบบ byte (UTF-8) เวอร์ชัน 1–15 (v4.11) ระดับแก้ผิด H (กู้ได้ ~30%) จึงวางโลโก้ทับตรงกลางได้
   อ้างอิงขั้นตอนตามมาตรฐาน ISO/IEC 18004 — ไม่แตะ DOM ทดสอบได้ใน tests/qr.test.js */
"use strict";

var QR = (function(){
  // ระดับ H: [จำนวน EC ต่อบล็อก, [[จำนวนบล็อก, data ต่อบล็อก], ...]]
  var EC_H = {
    1:[17,[[1,9]]], 2:[28,[[1,16]]], 3:[22,[[2,13]]], 4:[16,[[4,9]]], 5:[22,[[2,11],[2,12]]],
    6:[28,[[4,15]]], 7:[26,[[4,13],[1,14]]], 8:[26,[[4,14],[2,15]]], 9:[24,[[4,12],[4,13]]], 10:[28,[[6,15],[2,16]]],
    // v4.11: ถึงเวอร์ชัน 15 — ลิงก์กลุ่มที่มีกุญแจเข้ารหัสบนโดเมนยาว (เว็บทดลอง) เกิน 119 ไบต์ของเวอร์ชัน 10
    11:[24,[[3,12],[8,13]]], 12:[28,[[7,14],[4,15]]], 13:[22,[[12,11],[4,12]]], 14:[24,[[11,12],[5,13]]], 15:[24,[[11,12],[7,13]]]
  };
  var ALIGN = { 1:[], 2:[6,18], 3:[6,22], 4:[6,26], 5:[6,30], 6:[6,34], 7:[6,22,38], 8:[6,24,42], 9:[6,26,46], 10:[6,28,50],
    11:[6,30,54], 12:[6,32,58], 13:[6,34,62], 14:[6,26,46,66], 15:[6,26,48,70] };
  var MAX_VERSION = 15;

  function utf8(text){
    if (typeof TextEncoder === "function") return Array.prototype.slice.call(new TextEncoder().encode(text));
    var s = unescape(encodeURIComponent(text)), out = [];
    for (var i=0;i<s.length;i++) out.push(s.charCodeAt(i));
    return out;
  }
  function dataCodewords(v){
    return EC_H[v][1].reduce(function(a,g){ return a + g[0]*g[1]; }, 0);
  }
  /** เวอร์ชันเล็กสุดที่ใส่ข้อความได้ หรือ 0 ถ้ายาวเกินเวอร์ชัน 10 */
  function pickVersion(len){
    for (var v=1; v<=MAX_VERSION; v++){
      var need = 4 + (v < 10 ? 8 : 16) + len*8;
      if (need <= dataCodewords(v)*8) return v;
    }
    return 0;
  }

  /* ---- Reed–Solomon บน GF(256) พหุนาม 0x11D ---- */
  function mul(x, y){
    var z = 0;
    for (var i=7; i>=0; i--){
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function rsDivisor(degree){
    var r = [];
    for (var i=0;i<degree-1;i++) r.push(0);
    r.push(1);
    var root = 1;
    for (var k=0;k<degree;k++){
      for (var j=0;j<r.length;j++){
        r[j] = mul(r[j], root);
        if (j+1 < r.length) r[j] ^= r[j+1];
      }
      root = mul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, divisor){
    var r = divisor.map(function(){ return 0; });
    data.forEach(function(b){
      var f = b ^ r.shift();
      r.push(0);
      divisor.forEach(function(c, i){ r[i] ^= mul(c, f); });
    });
    return r;
  }

  /** บิตข้อมูล → codeword ที่ใส่ EC และสลับบล็อกแล้ว */
  function codewords(bytes, v){
    var cap = dataCodewords(v) * 8, bits = [];
    function push(val, n){ for (var i=n-1;i>=0;i--) bits.push((val >>> i) & 1); }
    push(4, 4);                                   // โหมด byte
    push(bytes.length, v < 10 ? 8 : 16);
    bytes.forEach(function(b){ push(b, 8); });
    push(0, Math.min(4, cap - bits.length));      // terminator
    while (bits.length % 8) bits.push(0);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
    var data = [];
    for (var i=0;i<bits.length;i+=8){
      var b = 0;
      for (var j=0;j<8;j++) b = (b << 1) | bits[i+j];
      data.push(b);
    }
    var ecLen = EC_H[v][0], div = rsDivisor(ecLen), blocks = [], k = 0;
    EC_H[v][1].forEach(function(g){
      for (var n=0;n<g[0];n++){
        var d = data.slice(k, k + g[1]); k += g[1];
        blocks.push({ d:d, e:rsRemainder(d, div) });
      }
    });
    var out = [], maxD = Math.max.apply(null, blocks.map(function(b){ return b.d.length; }));
    for (var x=0;x<maxD;x++) blocks.forEach(function(b){ if (x < b.d.length) out.push(b.d[x]); });
    for (var y=0;y<ecLen;y++) blocks.forEach(function(b){ out.push(b.e[y]); });
    return out;
  }

  function Matrix(v){
    var size = v*4 + 17, mod = [], fn = [];
    for (var y=0;y<size;y++){ mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setF(x, y, dark){ mod[y][x] = dark; fn[y][x] = true; }

    // ลายบังคับ: เส้น timing, finder, alignment, จองที่ format/version
    for (var i=0;i<size;i++){ setF(6, i, i%2 === 0); setF(i, 6, i%2 === 0); }
    [[3,3],[size-4,3],[3,size-4]].forEach(function(c){
      for (var dy=-4; dy<=4; dy++) for (var dx=-4; dx<=4; dx++){
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0]+dx, yy = c[1]+dy;
        if (xx>=0 && xx<size && yy>=0 && yy<size) setF(xx, yy, d !== 2 && d !== 4);
      }
    });
    var al = ALIGN[v], last = al.length - 1;
    al.forEach(function(ay, i){ al.forEach(function(ax, j){
      if ((i===0 && j===0) || (i===0 && j===last) || (i===last && j===0)) return;
      for (var dy=-2; dy<=2; dy++) for (var dx=-2; dx<=2; dx++) setF(ax+dx, ay+dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }); });
    function drawFormat(mask){
      var data = (2 << 3) | mask, rem = data;        // ระดับ H = 0b10
      for (var i=0;i<10;i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = ((data << 10) | rem) ^ 0x5412;
      function bit(i){ return ((bits >>> i) & 1) !== 0; }
      for (var a=0;a<=5;a++) setF(8, a, bit(a));
      setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
      for (var b=9;b<15;b++) setF(14-b, 8, bit(b));
      for (var c=0;c<8;c++) setF(size-1-c, 8, bit(c));
      for (var e=8;e<15;e++) setF(8, size-15+e, bit(e));
      setF(8, size-8, true);
    }
    drawFormat(0);
    if (v >= 7){
      var rem = v;
      for (var r=0;r<12;r++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = (v << 12) | rem;
      for (var q=0;q<18;q++){
        var on = ((vb >>> q) & 1) !== 0, a2 = size - 11 + q % 3, b2 = Math.floor(q / 3);
        setF(a2, b2, on); setF(b2, a2, on);
      }
    }
    return { size:size, mod:mod, fn:fn, drawFormat:drawFormat };
  }

  function placeData(m, cw){
    var size = m.size, i = 0, total = cw.length * 8;
    for (var right = size-1; right >= 1; right -= 2){
      if (right === 6) right = 5;
      for (var vert=0; vert<size; vert++){
        for (var j=0;j<2;j++){
          var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size-1-vert : vert;
          if (!m.fn[y][x] && i < total){
            m.mod[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  }
  function maskBit(mask, x, y){
    switch (mask){
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x/3) + Math.floor(y/2)) % 2 === 0;
      case 5: return x*y % 2 + x*y % 3 === 0;
      case 6: return (x*y % 2 + x*y % 3) % 2 === 0;
      default: return ((x + y) % 2 + x*y % 3) % 2 === 0;
    }
  }
  function applyMask(m, mask){
    for (var y=0;y<m.size;y++) for (var x=0;x<m.size;x++)
      if (!m.fn[y][x] && maskBit(mask, x, y)) m.mod[y][x] = !m.mod[y][x];
  }
  /** คะแนนโทษแบบย่อ (แถวสีเดียวยาว, บล็อก 2×2, สัดส่วนดำ/ขาว) — มาสก์ไหนก็อ่านได้ แค่เลือกตัวที่สแกนง่ายสุด */
  function penalty(m){
    var s = m.size, p = 0, dark = 0;
    for (var y=0;y<s;y++){
      for (var dir=0; dir<2; dir++){
        var run = 1;
        for (var x=1;x<s;x++){
          var a = dir ? m.mod[x][y] : m.mod[y][x], b = dir ? m.mod[x-1][y] : m.mod[y][x-1];
          if (a === b){ run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
        }
      }
      for (var x2=0;x2<s;x2++){
        if (m.mod[y][x2]) dark++;
        if (y < s-1 && x2 < s-1){
          var c = m.mod[y][x2];
          if (c === m.mod[y][x2+1] && c === m.mod[y+1][x2] && c === m.mod[y+1][x2+1]) p += 3;
        }
      }
    }
    var total = s*s;
    p += Math.floor(Math.abs(dark*20 - total*10) / total) * 10;
    return p;
  }

  /** ข้อความ → { size, dark(x,y) } หรือ null ถ้ายาวเกินเวอร์ชัน 10 (119 ไบต์) */
  function encode(text){
    var bytes = utf8(String(text)), v = pickVersion(bytes.length);
    if (!v) return null;
    var m = Matrix(v);
    placeData(m, codewords(bytes, v));
    var best = 0, bestP = Infinity;
    for (var mask=0; mask<8; mask++){
      applyMask(m, mask); m.drawFormat(mask);
      var p = penalty(m);
      if (p < bestP){ bestP = p; best = mask; }
      applyMask(m, mask);                         // XOR กลับคืน
    }
    applyMask(m, best); m.drawFormat(best);
    return { size:m.size, version:v, mask:best, dark:function(x, y){ return m.mod[y][x]; } };
  }

  /** QR เป็น SVG (มีขอบขาว 4 ช่องตามมาตรฐาน) สีโมดูลใช้ currentColor */
  function svg(text, label){
    var q = encode(text);
    if (!q) return "";
    var n = q.size + 8, d = "";
    for (var y=0;y<q.size;y++) for (var x=0;x<q.size;x++) if (q.dark(x, y)) d += "M"+(x+4)+" "+(y+4)+"h1v1h-1z";
    return '<svg class="qr-svg" viewBox="0 0 '+n+' '+n+'" role="img" aria-label="'+(label || "QR code")+'" shape-rendering="crispEdges">'+
      '<path d="'+d+'" fill="currentColor"/></svg>';
  }

  return { encode:encode, svg:svg, pickVersion:pickVersion };
})();
