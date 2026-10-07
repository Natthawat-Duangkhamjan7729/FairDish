/* FairDish — v4.15: ชื่อภาษาอังกฤษของคลังเมนู / ค่าส่วนกลาง / ค่าใช้จ่ายทริป (โหมด EN แสดงและค้นด้วยชื่อนี้)
   เมนูตระกูล "อาหาร × วัตถุดิบ" ประกอบชื่อเอง: MENU_EN_BASE[อาหาร] = [ชื่ออาหารเดี่ยว ๆ, แม่แบบที่มี {v}]
   แล้วแทน {v} ด้วย MENU_EN_WORD[วัตถุดิบ] — ถ้าคำของวัตถุดิบมี {b} (วิธีปรุง เช่น "Fried {b}") ใช้คำนั้นแทนแม่แบบ
   ชื่อที่ประกอบแล้วไม่เป็นธรรมชาติ หรือเมนูเดี่ยว ใส่ชื่อเต็มใน MENU_EN_FULL (ชนะการประกอบเสมอ)
   tests/library.test.js เช็กว่าทุกรายการในคลังมีชื่ออังกฤษ */
"use strict";

var MENU_EN_BASE = {
  "ส้มตำ":["Som Tam","Som Tam {v}"], "ตำ":["Tam","Tam {v}"], "ลาบ":["Larb","{v} Larb"], "น้ำตก":["Nam Tok","{v} Nam Tok"],
  "ก้อย":["Koi","{v} Koi"], "ต้มแซ่บ":["Tom Saep","Tom Saep {v}"], "ต้มยำ":["Tom Yum","Tom Yum {v}"], "ต้มข่า":["Tom Kha","Tom Kha {v}"],
  "ต้มจืด":["Clear Soup","Clear Soup with {v}"], "แกงเขียวหวาน":["Green Curry","{v} Green Curry"], "แกงเผ็ด":["Red Curry","{v} Red Curry"],
  "แกงส้ม":["Sour Curry","Sour Curry with {v}"], "แกงป่า":["Jungle Curry","{v} Jungle Curry"], "แกงมัสมั่น":["Massaman Curry","{v} Massaman Curry"],
  "พะแนง":["Panang Curry","{v} Panang Curry"], "แกงกะหรี่":["Yellow Curry","{v} Yellow Curry"],
  "แกงหน่อไม้":["Bamboo Shoot Curry","Bamboo Shoot Curry with {v}"], "แกงอ่อม":["Kaeng Om","{v} Kaeng Om"], "อ่อม":["Om Curry","{v} Om Curry"],
  "หมก":["Mok","{v} Mok"], "ผัดกะเพรา":["Pad Kra Pao","Pad Kra Pao {v}"], "ผัดพริกแกง":["Pad Prik Gaeng","Pad Prik Gaeng {v}"],
  "ผัด":["Stir-fry","Stir-fried {v}"], "ผัดฉ่า":["Pad Cha","Pad Cha {v}"], "ผัดขี้เมา":["Pad Kee Mao","Pad Kee Mao {v}"],
  "ผัดเปรี้ยวหวาน":["Sweet and Sour Stir-fry","Sweet and Sour {v}"], "ผัดไทย":["Pad Thai","Pad Thai {v}"], "ผัดซีอิ๊ว":["Pad See Ew","Pad See Ew {v}"],
  "ราดหน้า":["Rad Na","Rad Na {v}"], "ข้าวผัด":["Fried Rice","{v} Fried Rice"], "ข้าว":["Rice","{v} with Rice"],
  "ก๋วยเตี๋ยว":["Noodle Soup","{v} Noodles"], "บะหมี่":["Egg Noodles","{v} Egg Noodles"], "ขนมจีน":["Khanom Jeen","Khanom Jeen {v}"],
  "ยำ":["Spicy Salad","Spicy {v} Salad"], "สุกี้":["Suki","Suki {v}"], "จิ้มจุ่ม":["Jim Jum","{v} Jim Jum"], "หม้อไฟ":["Hot Pot","{v} Hot Pot"],
  "สปาเกตตี":["Spaghetti","Spaghetti {v}"], "พิซซ่า":["Pizza","{v} Pizza"], "สเต๊ก":["Steak","{v} Steak"], "สลัด":["Salad","{v} Salad"],
  "ซูชิ":["Sushi","{v} Sushi"], "ข้าวหน้า":["Rice Bowl","{v} Rice Bowl"], "ราเมง":["Ramen","{v} Ramen"], "ไก่ทอด":["Fried Chicken","{v} Fried Chicken"],
  "หมูกระทะ":["Moo Kata","Moo Kata {v}"], "ชาบู":["Shabu","Shabu {v}"], "ปิ้งย่าง":["BBQ Grill","{v} BBQ"], "แหนมเนือง":["Nam Neuang","Nam Neuang {v}"],
  "หอย":["Shellfish","{v} Shellfish"], "ปลากะพง":["Sea Bass","{v} Sea Bass"], "ปลานิล":["Tilapia","{v} Tilapia"], "ปลาดุก":["Catfish","{v} Catfish"],
  "ปู":["Crab","{v} Crab"], "กุ้ง":["Shrimp","{v} Shrimp"], "ปลาหมึก":["Squid","{v} Squid"], "คอหมู":["Pork Neck","{v} Pork Neck"],
  "ไก่ย่าง":["Grilled Chicken","{v} Grilled Chicken"], "เนื้อย่าง":["Grilled Beef","{v} Grilled Beef"], "ซี่โครงหมู":["Pork Ribs","{v} Pork Ribs"],
  "ไข่เจียว":["Thai Omelette","{v} Omelette"], "ชา":["Tea","{v} Tea"], "กาแฟ":["Coffee","{v} Coffee"], "น้ำ":["Drink","{v} Drink"],
  "บิงซู":["Bingsu","{v} Bingsu"], "ไอศกรีม":["Ice Cream","{v} Ice Cream"],
  "ผัดกระเทียม":["Garlic Stir-fry","Stir-fried {v} with Garlic"], "ผัดพริกไทยดำ":["Black Pepper Stir-fry","Stir-fried {v} with Black Pepper"],
  "ผัดพริกเกลือ":["Salt and Chili Stir-fry","{v} with Salt and Chili"], "ผัดผงกะหรี่":["Curry Powder Stir-fry","Stir-fried {v} with Curry Powder"],
  "ผัดน้ำพริกเผา":["Chili Paste Stir-fry","Stir-fried {v} with Chili Paste"], "ผัดเผ็ด":["Spicy Stir-fry","Spicy Stir-fried {v}"],
  "คั่วกลิ้ง":["Khua Kling","Khua Kling {v}"], "ฉู่ฉี่":["Choo Chee Curry","Choo Chee {v}"], "แกงคั่ว":["Kaeng Khua","Kaeng Khua {v}"],
  "สามรส":["Three-Flavor Dish","Three-Flavor {v}"], "ราดพริก":["Chili Sauce Dish","{v} with Chili Sauce"], "ทอดกระเทียม":["Garlic Fried","Garlic Fried {v}"],
  "นึ่งมะนาว":["Steamed with Lime","Steamed {v} with Lime"], "นึ่งซีอิ๊ว":["Steamed with Soy Sauce","Steamed {v} with Soy Sauce"],
  "ย่างจิ้มแจ่ว":["Grilled with Jaew Dip","Grilled {v} with Jaew Dip"], "อบวุ้นเส้น":["Baked Glass Noodles","Baked {v} with Glass Noodles"],
  "ทอดน้ำปลา":["Fish Sauce Fried","Fish Sauce Fried {v}"], "ลวกจิ้ม":["Blanched with Dip","Blanched {v} with Dip"], "แดดเดียว":["Sun-dried","Sun-dried {v}"],
  "ต้มส้ม":["Tom Som","Tom Som {v}"], "ห่อหมก":["Hor Mok","{v} Hor Mok"], "ไข่ตุ๋น":["Steamed Egg","Steamed Egg with {v}"],
  "หมูสามชั้น":["Pork Belly","{v} Pork Belly"], "ปีกไก่":["Chicken Wings","{v} Chicken Wings"], "เกี๊ยว":["Wonton","{v} Wonton"],
  "เต้าหู้":["Tofu","{v} Tofu"], "เห็ด":["Mushrooms","{v} Mushrooms"], "ข้าวเหนียว":["Sticky Rice","Sticky Rice with {v}"], "โรตี":["Roti","{v} Roti"],
  "ขนมปัง":["Bread","Bread with {v}"], "ชานม":["Milk Tea","{v} Milk Tea"], "สมูทตี้":["Smoothie","{v} Smoothie"], "น้ำปั่น":["Fruit Smoothie","{v} Smoothie"],
  "เบอร์เกอร์":["Burger","{v} Burger"], "หมูทอด":["Fried Pork","{v} Fried Pork"], "ปลาทอด":["Fried Fish","{v} Fried Fish"],
  "ซุป":["Sup (Isaan Salad)","Isaan {v} Salad"], "แกงเห็ด":["Mushroom Curry","{v} Mushroom Curry"], "ไก่":["Chicken","{v} Chicken"], "เป็ด":["Duck","{v} Duck"],
  "สะเต๊ะ":["Satay","{v} Satay"], "แกงจืด":["Clear Soup","Clear Soup with {v}"], "หม้อไฟทะเล":["Seafood Hot Pot","Seafood Hot Pot ({v})"],
  "หอยทอด":["Mussel Pancake","{v} Mussel Pancake"],
  /* v4.15 */
  "ข้าวซอย":["Khao Soi","{v} Khao Soi"], "โจ๊ก":["Congee","{v} Congee"], "ข้าวต้ม":["Rice Soup","{v} Rice Soup"], "เย็นตาโฟ":["Yen Ta Fo","Yen Ta Fo {v}"],
  "ผัดพริกขิง":["Pad Prik Khing","Pad Prik Khing {v}"], "ผัดสะตอ":["Stink Bean Stir-fry","Stir-fried Stink Beans with {v}"],
  "แกงเหลือง":["Southern Yellow Curry","Southern Yellow Curry with {v}"], "แกงฮังเล":["Hang Lay Curry","{v} Hang Lay Curry"],
  "น้ำพริก":["Chili Dip","Nam Prik {v}"], "หม่าล่า":["Mala","Mala {v}"], "อุด้ง":["Udon","{v} Udon"], "โซบะ":["Soba","{v} Soba"],
  "ข้าวแกงกะหรี่":["Japanese Curry Rice","{v} Curry Rice"], "ซาซิมิ":["Sashimi","{v} Sashimi"], "เทมปุระ":["Tempura","{v} Tempura"],
  "คาราอาเกะ":["Karaage","{v} Karaage"], "ข้าวปั้น":["Onigiri","{v} Onigiri"], "บิบิมบับ":["Bibimbap","{v} Bibimbap"], "คิมบับ":["Kimbap","{v} Kimbap"],
  "จิเก":["Jjigae","{v} Jjigae"], "รามยอน":["Ramyeon","{v} Ramyeon"], "แซนด์วิช":["Sandwich","{v} Sandwich"], "ฮอทดอก":["Hot Dog","{v} Hot Dog"],
  "ซุปครีม":["Cream Soup","Cream of {v} Soup"], "มักกะโรนี":["Macaroni","{v} Macaroni"], "ลาซานญ่า":["Lasagna","{v} Lasagna"],
  "มัทฉะ":["Matcha","Matcha {v}"], "โกโก้":["Cocoa","{v} Cocoa"], "เค้ก":["Cake","{v} Cake"], "ครัวซองต์":["Croissant","{v} Croissant"],
  "แพนเค้ก":["Pancakes","{v} Pancakes"], "ฮันนี่โทสต์":["Honey Toast","{v} Honey Toast"], "โซจู":["Soju","{v} Soju"], "ไวน์":["Wine","{v} Wine"]
};

var MENU_EN_WORD = {
  /* วัตถุดิบ / เนื้อสัตว์ */
  "หมู":"Pork", "เนื้อ":"Beef", "ไก่":"Chicken", "เป็ด":"Duck", "ปลา":"Fish", "ทะเล":"Seafood", "ซีฟู้ด":"Seafood", "กุ้ง":"Shrimp", "ปู":"Crab",
  "หอย":"Shellfish", "ปลาหมึก":"Squid", "ปลาดุก":"Catfish", "ปลากะพง":"Sea Bass", "ปลานิล":"Tilapia", "ปลาทับทิม":"Red Tilapia", "ปลาช่อน":"Snakehead Fish",
  "ปลาคัง":"Pla Kang", "ปลาสำลี":"Pla Sam Lee", "ปลาทู":"Mackerel", "แซลมอน":"Salmon", "ปลาแซลมอน":"Salmon", "ทูน่า":"Tuna", "ปลาไหล":"Eel",
  "หมูสับ":"Minced Pork", "หมูชิ้น":"Sliced Pork", "หมูกรอบ":"Crispy Pork", "หมูคั่ว":"Toasted Pork", "เนื้อคั่ว":"Toasted Beef", "ไก่คั่ว":"Toasted Chicken",
  "หมูสามชั้น":"Pork Belly", "คอหมู":"Pork Neck", "หมูย่าง":"Grilled Pork", "เนื้อย่าง":"Grilled Beef", "คอหมูย่าง":"Grilled Pork Neck", "ไก่ย่าง":"Grilled Chicken",
  "หมูปิ้ง":"Grilled Pork", "หมูแดง":"Red Pork", "หมูยอ":"Pork Sausage", "แหนม":"Fermented Pork", "แหนมสด":"Fresh Fermented Pork", "กุนเชียง":"Chinese Sausage",
  "ไส้กรอก":"Sausage", "เบคอน":"Bacon", "เลือด":"Blood", "เครื่องใน":"Offal", "กระดูกอ่อน":"Pork Cartilage", "ซี่โครงหมู":"Pork Ribs", "ขาหมู":"Pork Leg",
  "กระดูกหมู":"Pork Bones", "เอ็นเนื้อ":"Beef Tendon", "เอ็นข้อไก่":"Chicken Cartilage", "ปีกไก่":"Chicken Wings", "อกไก่":"Chicken Breast",
  "ไก่บ้าน":"Free-range Chicken", "ไก่กรอบ":"Crispy Chicken", "ไก่ทอด":"Fried Chicken", "ไก่เทริยากิ":"Teriyaki Chicken", "หมูทอด":"Tonkatsu",
  "หมูชาชู":"Chashu Pork", "หมูป่า":"Wild Boar", "เป็ดย่าง":"Roast Duck", "กุ้งสด":"Fresh Shrimp", "กุ้งแม่น้ำ":"River Prawn", "กุ้งน้ำข้น":"Shrimp (Creamy)",
  "กุ้งเทมปุระ":"Shrimp Tempura", "กุ้งทอด":"Fried Shrimp", "กุ้งดอง":"Pickled Shrimp", "ปูม้า":"Blue Crab", "ปูดอง":"Pickled Crab", "ปูนิ่ม":"Soft-shell Crab",
  "ปูอัด":"Crab Stick", "หอยดอง":"Pickled Shellfish", "หอยแมลงภู่":"Mussels", "หอยแครง":"Cockle", "หอยลาย":"Surf Clams", "หอยขม":"River Snails",
  "หอยเชลล์":"Scallop", "หอยทอด":"Crispy Mussels", "ไข่":"Egg", "ไข่ดาว":"Fried Egg", "ไข่เจียว":"Omelette", "ไข่เค็ม":"Salted Egg", "ไข่หวาน":"Tamago",
  "ไข่ปลา":"Fish Roe", "ไข่กุ้ง":"Shrimp Roe", "ไข่มดแดง":"Red Ant Eggs", "ไข่เยี่ยวม้า":"Century Egg", "ลูกชิ้นปลา":"Fish Ball", "ปลากระป๋อง":"Canned Fish",
  "ปลาเค็ม":"Salted Fish", "ปลาดุกฟู":"Crispy Fluffy Catfish", "ปลาย่าง":"Grilled Fish", "เต้าหู้":"Tofu", "เห็ด":"Mushroom", "เห็ดรวม":"Mixed Mushroom",
  "รวมมิตร":"Combo", "รวมมิตรทะเล":"Mixed Seafood", "รวม":"Assorted",
  /* ผัก ผลไม้ */
  "หน่อไม้":"Bamboo Shoot", "หน่อไม้ดอง":"Pickled Bamboo Shoot", "หน่อไม้ปลาร้า":"Bamboo Shoot with Pla Ra", "หน่อไม้หมู":"Bamboo Shoots and Pork",
  "ผัก":"Vegetable", "ผักรวม":"Mixed Vegetables", "ผักกาดขาว":"Napa Cabbage", "สาหร่าย":"Seaweed", "ตำลึง":"Ivy Gourd Leaves", "วุ้นเส้น":"Glass Noodles",
  "ดอกแค":"Sesbania Flowers", "ชะอม":"Cha-om", "ชะอมกุ้ง":"Cha-om and Shrimp", "ใส่ย่านาง":"Yanang Leaves", "ย่านาง":"Yanang Leaves", "หัวปลี":"Banana Blossom",
  "ถั่วพู":"Wing Bean", "ตะไคร้":"Lemongrass", "คะน้ากรอบ":"Crispy Kale", "ถั่วฝักยาว":"Long Bean", "ถั่วฝักยาวหมู":"Long Beans and Pork",
  "แตง":"Cucumber", "ข้าวโพด":"Corn", "มะม่วง":"Mango", "ผลไม้":"Fruit", "ผลไม้รวม":"Mixed Fruit", "สับปะรด":"Pineapple", "สับปะรดกุ้ง":"Pineapple and Shrimp",
  "ฟักทอง":"Pumpkin", "ฟักทองหมู":"Pumpkin and Pork", "มันฝรั่ง":"Potato", "มะละกอ":"Green Papaya", "ยอดมะพร้าว":"Coconut Shoots", "ขนุน":"Young Jackfruit",
  "มะเขือ":"Eggplant", "เผาะ":"Puffball", "แตงโม":"Watermelon", "ฝรั่ง":"Guava", "ส้ม":"Orange", "บลูเบอร์รี":"Blueberry", "เสาวรส":"Passion Fruit",
  "สตรอว์เบอร์รี":"Strawberry", "ทุเรียน":"Durian", "กล้วยไข่":"Banana", "มะพร้าว":"Coconut", "ใบเตย":"Pandan", "แครอท":"Carrot", "อัลมอนด์":"Almond",
  "พีช":"Peach", "องุ่น":"Grape", "แอปเปิลเขียว":"Green Apple", "ส้มยูซุ":"Yuzu", "บ๊วย":"Ume", "มิ้นต์":"Mint", "กระเทียม":"Garlic", "สมุนไพร":"Herb", "งา":"Sesame",
  /* ต้มจืด / ผัด (ทั้งวลี) */
  "เต้าหู้หมูสับ":"Tofu and Minced Pork", "ฟักหมูสับ":"Winter Melon and Minced Pork", "มะระยัดไส้":"Stuffed Bitter Gourd", "เกี๊ยวหมู":"Pork Wontons",
  "คะน้าหมูกรอบ":"Kale with Crispy Pork", "คะน้าน้ำมันหอย":"Kale in Oyster Sauce", "ผักบุ้งไฟแดง":"Morning Glory", "ผักรวมมิตร":"Mixed Vegetables",
  "บล็อกโคลี่กุ้ง":"Broccoli with Shrimp", "ถั่วฝักยาวหมูสับ":"Long Beans with Minced Pork", "ยอดฟักทอง":"Pumpkin Shoots", "ดอกกะหล่ำหมู":"Cauliflower with Pork",
  "มะระใส่ไข่":"Bitter Gourd with Egg", "หน่อไม้ฝรั่งกุ้ง":"Asparagus with Shrimp", "เห็ดรวมน้ำมันหอย":"Mixed Mushrooms in Oyster Sauce",
  "ฟักทองใส่ไข่":"Pumpkin with Egg", "วุ้นเส้นหมูสับ":"Glass Noodles with Minced Pork", "มาม่าใส่ไข่":"Instant Noodles with Egg",
  /* ส้มตำ */
  "ไทย":"Thai", "ไทยไข่เค็ม":"Thai with Salted Egg", "ไทยกุ้งสด":"Thai with Fresh Shrimp", "ปูปลาร้า":"Crab and Pla Ra", "ปลาร้า":"Pla Ra",
  "ลาวไข่เค็ม":"Lao with Salted Egg", "ซั่ว":"Sua with Rice Noodles", "ซั่วไข่เค็ม":"Sua with Salted Egg", "ถาด":"Platter", "แคบหมู":"Pork Rinds",
  "ป่า":"Jungle Style", "มั่ว":"Mixed", "อีสาน":"Isaan",
  /* ข้าวผัด / เส้น */
  "อเมริกัน":"American", "ต้มยำ":"Tom Yum", "น้ำพริกลงเรือ":"Nam Prik Long Ruea", "กะเพราหมูสับ":"Basil Minced Pork", "พริกแกง":"Curry Paste",
  "กะปิ":"Shrimp Paste", "กะปิกุ้ง":"Shrimp Paste and Shrimp", "แกงเขียวหวาน":"Green Curry", "เส้นใหญ่":"Wide Noodles", "หมี่กรอบ":"Crispy Noodles",
  "หมูน้ำตก":"Pork Nam Tok", "เนื้อน้ำตก":"Beef Nam Tok", "เนื้อตุ๋น":"Stewed Beef", "หมูตุ๋น":"Stewed Pork", "เป็ดตุ๋น":"Stewed Duck", "ไก่ตุ๋น":"Stewed Chicken",
  "ต้มยำหมู":"Tom Yum Pork", "ต้มยำทะเล":"Tom Yum Seafood", "ต้มยำแห้ง":"Dry Tom Yum", "ไก่มะระ":"Chicken and Bitter Gourd", "เรือ":"Boat", "แคะ":"Hakka",
  "เย็นตาโฟ":"Yen Ta Fo", "น้ำใสหมู":"Clear Broth Pork", "หมูมะนาว":"Lime Pork", "เกี๊ยวหมูแดง":"Wonton and Red Pork", "แห้งหมูสับ":"Dry Minced Pork",
  "เกี๊ยวปู":"Crab Wonton", "น้ำยา":"Nam Ya", "น้ำเงี้ยว":"Nam Ngiao", "น้ำพริก":"Nam Prik", "แกงไก่":"Chicken Curry", "ซาวน้ำ":"Sao Nam",
  "มาม่า":"Instant Noodle", "สามกรอบ":"Three Crispy", "แห้ง":"Dry", "น้ำ":"Soup", "แห้งทะเล":"Dry Seafood", "น้ำทะเล":"Seafood Soup", "หม้อไฟ":"Hot Pot",
  /* ฝรั่ง / ญี่ปุ่น / เกาหลี */
  "คาโบนาร่า":"Carbonara", "ขี้เมาทะเล":"Drunken Seafood", "ซอสมะเขือเทศ":"Tomato Sauce", "ครีมซอสไก่":"Chicken Cream Sauce",
  "ผัดพริกแห้งเบคอน":"Dried Chili Bacon", "หน้ารวม":"Combination", "แฮมชีส":"Ham and Cheese", "ฮาวายเอียน":"Hawaiian", "เปปเปอโรนี":"Pepperoni",
  "ไส้กรอกชีส":"Sausage and Cheese", "บาร์บีคิวไก่":"BBQ Chicken", "หมูพริกไทยดำ":"Black Pepper Pork", "ซีซาร์":"Caesar", "มิโสะ":"Miso", "เกี๊ยวซ่า":"Gyoza",
  "เกาหลี":"Korean", "ญี่ปุ่น":"Japanese", "ซอสเผ็ด":"Spicy Sauce", "หาดใหญ่":"Hat Yai", "ชีส":"Cheese", "น้ำปลา":"Fish Sauce", "เทมปุระ":"Tempura",
  "คิทสึเนะ":"Kitsune", "แกงกะหรี่":"Curry", "คาราอาเกะ":"Karaage", "กิมจิ":"Kimchi", "ซุนดูบู":"Sundubu", "เต้าเจี้ยว":"Doenjang", "บูเด":"Budae",
  "คลับ":"Club", "หมูหยอง":"Pork Floss", "จัมโบ้":"Jumbo",
  /* ชุด / ขนาด */
  "ชุดเล็ก":"Small Set", "ชุดใหญ่":"Large Set", "บุฟเฟ่ต์":"Buffet", "ชุดทะเล":"Seafood Set", "ชุดเนื้อ":"Beef Set", "ชุดหมู":"Pork Set", "ชุดรวม":"Combo Set",
  "น้ำซุปต้มยำ":"Tom Yum Broth", "ครึ่งตัว":"Half", "เต็มตัว":"Whole", "ถ้วยใหญ่":"Large Cup",
  /* ไก่ย่าง / เนื้อย่าง */
  "เขาสวนกวาง":"Khao Suan Kwang", "วิเชียรบุรี":"Wichian Buri", "ไม้มะดัน":"Mai Madan", "เสือร้องไห้":"Crying Tiger",
  /* เครื่องดื่ม / ของหวาน */
  "ไทยเย็น":"Iced Thai", "เย็น":"Iced", "ร้อน":"Hot", "มะนาว":"Lime", "นมไข่มุก":"Bubble Milk", "เขียวนมสด":"Green Milk", "ดำเย็น":"Iced Black",
  "มะนาวโซดา":"Lime Soda", "นมสด":"Fresh Milk", "ช็อกโกแลต":"Chocolate", "ชาไทย":"Thai Tea", "ชาเขียว":"Green Tea", "โอริโอ้":"Oreo", "กะทิ":"Coconut",
  "วานิลลา":"Vanilla", "สังขยา":"Custard", "นมข้น":"Condensed Milk", "เนยน้ำตาล":"Butter and Sugar", "ไข่มุก":"Bubble", "บุก":"Konjac Jelly",
  "ไต้หวัน":"Taiwanese", "กรอบ":"Crispy", "นุ่ม":"Soft", "ฟู":"Fluffy", "บาร์บีคิว":"BBQ", "ซอสเกาหลี":"Korean Sauce", "คั่วพริกเกลือ":"Salt and Chili",
  "ลาเต้":"Latte", "ลาเต้เย็น":"Iced Latte", "กาแฟ":"Coffee", "เรดเวลเวท":"Red Velvet", "เนยสด":"Butter", "เนยน้ำผึ้ง":"Butter and Honey",
  "ไอศกรีม":"Ice Cream", "ยาคูลท์":"Yakult", "แดง":"Red", "ขาว":"White", "สปาร์กลิง":"Sparkling",
  /* น้ำพริก / หม่าล่า */
  "หนุ่ม":"Noom", "อ่อง":"Ong", "ตาแดง":"Ta Daeng", "ลงเรือ":"Long Ruea", "เสียบไม้":"Skewers", "ปิ้งย่าง":"Grill", "เซียงกัว":"Xiang Guo",
  /* วิธีปรุง — วางหน้าชื่ออาหาร */
  "ทอด":"Fried {b}", "ย่าง":"Grilled {b}", "เผา":"Charcoal-grilled {b}", "นึ่ง":"Steamed {b}", "ทอดกรอบ":"Crispy Fried {b}", "ทอดน้ำปลา":"Fish Sauce Fried {b}",
  "ทอดกระเทียม":"Garlic Fried {b}", "ทอดสมุนไพร":"Herb Fried {b}", "ทอดขมิ้น":"Turmeric Fried {b}", "ชุบแป้งทอด":"Battered Fried {b}",
  "เผาเกลือ":"Salt-crusted Grilled {b}", "อบเกลือ":"Salt-baked {b}", "อบเนย":"Butter Baked {b}", "อบบาร์บีคิว":"BBQ Baked {b}",
  "นึ่งมะนาว":"Steamed {b} with Lime", "นึ่งซีอิ๊ว":"Steamed {b} with Soy Sauce", "นึ่งซีฟู้ด":"Steamed {b} with Seafood", "ราดพริก":"{b} with Chili Sauce",
  "ผัดฉ่า":"Pad Cha {b}", "สามรส":"Three-Flavor {b}", "ต้มส้ม":"Tom Som {b}", "ต้มแซ่บ":"Tom Saep {b}", "ผัดเผ็ด":"Spicy Stir-fried {b}",
  "ผัดผงกะหรี่":"Stir-fried {b} with Curry Powder", "ผัดพริกไทยดำ":"Stir-fried {b} with Black Pepper", "ผัดพริกเกลือ":"{b} with Salt and Chili",
  "ผัดพริกแกง":"Stir-fried {b} with Curry Paste", "ผัดไข่เค็ม":"Stir-fried {b} with Salted Egg", "ผัดน้ำมันหอย":"Stir-fried {b} in Oyster Sauce",
  "ผัดซอส":"Stir-fried {b} in Sauce", "ผัดเม็ดมะม่วง":"Stir-fried {b} with Cashew Nuts", "ผัด":"Stir-fried {b}", "ดองน้ำปลา":"Fish Sauce Marinated {b}",
  "แช่น้ำปลา":"Raw {b} in Fish Sauce", "อบวุ้นเส้น":"Baked {b} with Glass Noodles", "ย่างจิ้มแจ่ว":"Grilled {b} with Jaew Dip", "จิ้มแจ่ว":"{b} with Jaew Dip",
  "ทอดซอสมะขาม":"Fried {b} with Tamarind Sauce", "อบซอส":"Baked {b} in Sauce", "ต้มขมิ้น":"{b} Turmeric Soup", "ย่างซอสเกาหลี":"Korean-style Grilled {b}",
  "ตุ๋นมะนาวดอง":"{b} Soup with Pickled Lime", "พะโล้":"Five-Spice Stewed {b}", "ผัดซอสมะเขือเทศ":"Stir-fried {b} in Tomato Sauce",
  "อบชีส":"Baked {b} with Cheese", "ผัดขี้เมา":"Drunken Stir-fried {b}", "ซุป":"{b} Soup", "ปั่น":"Blended {b}", "แก้ว":"Glass of {b}", "ขวด":"Bottle of {b}"
};

/* ชื่อเต็ม — เมนูเดี่ยว และชื่อที่ประกอบเองไม่เป็นธรรมชาติ */
var MENU_EN_FULL = {
  /* ตระกูลที่ต้องเขียนทั้งชื่อ */
  "ข้าวมันไก่":"Hainanese Chicken Rice", "ข้าวมันไก่ทอด":"Fried Chicken Rice", "ข้าวหมูแดง":"Red Pork with Rice", "ข้าวหมูกรอบ":"Crispy Pork with Rice",
  "ข้าวขาหมู":"Stewed Pork Leg with Rice", "ข้าวหน้าเป็ด":"Roast Duck with Rice", "ข้าวคลุกกะปิ":"Shrimp Paste Rice", "ข้าวไข่ข้น":"Creamy Omelette Rice",
  "ข้าวไข่เจียวหมูสับ":"Minced Pork Omelette with Rice", "ข้าวหมูทอดกระเทียม":"Garlic Pork with Rice", "ข้าวไก่ทอด":"Fried Chicken with Rice",
  "ข้าวแกงกะหรี่ญี่ปุ่น":"Japanese Curry Rice", "ข้าวยำไข่ดาว":"Fried Egg Salad with Rice", "ข้าวหมูสามชั้นทอด":"Fried Pork Belly with Rice",
  "ข้าวหมูกระเทียม":"Garlic Pork with Rice", "ข้าวเหนียวหมูปิ้ง":"Sticky Rice with Grilled Pork", "ข้าวเหนียวไก่ย่าง":"Sticky Rice with Grilled Chicken",
  "ข้าวต้มยำ":"Tom Yum with Rice", "ข้าวหน้าไก่ทอด":"Fried Chicken Rice Bowl", "ข้าวไข่ดาว":"Fried Egg with Rice", "ข้าวหมูสับไข่เค็ม":"Minced Pork and Salted Egg with Rice",
  "ข้าวแกงเขียวหวานไก่":"Chicken Green Curry with Rice", "ข้าวต้มยำไก่":"Chicken Tom Yum with Rice", "ข้าวกะเพราทะเล":"Seafood Kra Pao with Rice",
  "ข้าวหมูพะโล้":"Five-Spice Stewed Pork with Rice", "ข้าวไก่ผัดเม็ดมะม่วง":"Cashew Chicken with Rice",
  "หอยลายผัดน้ำพริกเผา":"Surf Clams with Chili Paste", "หอยแครงลวก":"Blanched Cockles", "หอยแมลงภู่อบ":"Baked Mussels", "หอยนางรมสด":"Fresh Oysters",
  "หอยทอด":"Mussel Pancake", "หอยจ๊อทอด":"Fried Crab Rolls", "หอยเชลล์ย่าง":"Grilled Scallops",
  "น้ำเปล่า":"Water", "น้ำมะนาวโซดา":"Lime Soda", "น้ำส้มคั้น":"Fresh Orange Juice", "น้ำมะพร้าว":"Coconut Water", "น้ำอัดลม":"Soft Drink", "น้ำแข็ง":"Ice",
  "น้ำแตงโมปั่น":"Watermelon Smoothie", "น้ำเก๊กฮวย":"Chrysanthemum Tea", "น้ำใบเตย":"Pandan Drink", "น้ำมะนาว":"Limeade",
  "กาแฟลาเต้เย็น":"Iced Latte", "กาแฟอเมริกาโน่":"Americano", "กาแฟคาปูชิโน่":"Cappuccino", "กาแฟมอคค่าเย็น":"Iced Mocha",
  "ปลาดุกฟูผัดพริก":"Crispy Fluffy Catfish with Chili", "ปูนิ่มทอดกระเทียม":"Garlic Fried Soft-shell Crab", "ปลาหมึกไข่ย่าง":"Grilled Squid with Roe",
  "เนื้อย่างริบอาย":"Grilled Ribeye", "เนื้อย่างสันคอ":"Grilled Beef Chuck", "ไอศกรีมแซนด์วิช":"Ice Cream Sandwich", "ไข่ตุ๋นรวม":"Steamed Egg Combo",
  "เกี๊ยวน้ำ":"Wonton Soup", "เกี๊ยวซ่า":"Gyoza", "เต้าหู้ทรงเครื่อง":"Tofu with Mixed Toppings", "ขนมปังปิ้งชุด":"Toast Set",
  "ชานมชาไทย":"Thai Milk Tea", "ชานมชาเขียว":"Green Milk Tea", "แกงเห็ดย่านาง":"Mushroom Curry with Yanang Leaves", "เป็ดย่าง":"Roast Duck",
  "หอยทอดชุดใหญ่":"Mussel Pancake (Large)", "ผัดไทยไข่":"Pad Thai with Egg", "โซบะเย็น":"Cold Soba", "มักกะโรนีอบชีส":"Macaroni and Cheese",
  "แกงหน่อไม้ใส่ย่านาง":"Bamboo Shoot Curry with Yanang Leaves",
  /* เมนูเดี่ยว */
  "ซอยจุ๊":"Soi Ju (Raw Beef with Dip)", "แจ่วฮ้อน":"Jaew Hon (Isaan Hot Pot)", "เนื้อเสือร้องไห้":"Crying Tiger Beef", "หมูมะนาว":"Spicy Lime Pork",
  "ไส้กรอกอีสาน":"Isaan Sausage", "ไส้อั่ว":"Sai Ua (Northern Sausage)", "แคบหมู":"Pork Rinds", "น้ำพริกอ่อง":"Nam Prik Ong", "น้ำพริกปลาร้า":"Pla Ra Chili Dip",
  "น้ำพริกกะปิผักสด":"Shrimp Paste Chili Dip with Vegetables", "ผักสดจิ้มแจ่ว":"Fresh Vegetables with Jaew Dip", "ข้าวเหนียว":"Sticky Rice", "ข้าวสวย":"Steamed Rice",
  "ตับหวาน":"Spicy Liver Salad", "หลู้หมู":"Lu Moo (Northern Raw Pork Salad)", "หมูจุ่ม":"Moo Jum (Pork Hot Pot)", "เนื้อแดดเดียว":"Sun-dried Beef",
  "หมูแดดเดียว":"Sun-dried Pork", "ปลาส้มทอด":"Fried Fermented Fish", "ไข่ป่าม":"Khai Pam (Grilled Egg in Banana Leaf)", "อ่องปู":"Ong Pu (Crab Fat Dip)",
  "ปีกไก่ทอด":"Fried Chicken Wings", "ปีกไก่ทอดน้ำปลา":"Fish Sauce Fried Chicken Wings", "เอ็นข้อไก่ทอด":"Fried Chicken Cartilage", "หนังไก่ทอด":"Fried Chicken Skin",
  "นักเก็ตไก่":"Chicken Nuggets", "ไส้กรอกทอด":"Fried Sausage", "มันฝรั่งทอด":"French Fries", "ปอเปี๊ยะทอด":"Fried Spring Rolls", "เกี๊ยวทอด":"Fried Wontons",
  "ทอดมันปลากราย":"Fish Cakes", "ทอดมันกุ้ง":"Shrimp Cakes", "หมูทอดกระเทียม":"Garlic Fried Pork", "หมูกรอบ":"Crispy Pork Belly", "แคบหมูไร้มัน":"Lean Pork Rinds",
  "กุ้งเผา":"Charcoal-grilled Shrimp", "ปลาเผาเกลือ":"Salt-crusted Grilled Fish", "ปลาทับทิมเผา":"Grilled Red Tilapia", "ข้าวโพดย่าง":"Grilled Corn",
  "ไส้ย่าง":"Grilled Pork Intestines", "ตับย่าง":"Grilled Liver", "หมูสามชั้นย่าง":"Grilled Pork Belly", "กั้งทอดกระเทียม":"Garlic Fried Mantis Shrimp",
  "ปลาช่อนแป๊ะซะ":"Snakehead Fish Pae Sa", "ปลานึ่งซีอิ๊ว":"Steamed Fish with Soy Sauce", "ทะเลเผา":"Grilled Seafood", "กระเพาะปลาน้ำแดง":"Fish Maw Soup",
  "ต้มเล้ง":"Spicy Pork Bone Soup", "ต้มเลือดหมู":"Pork Blood Soup", "แกงจืดวุ้นเส้น":"Glass Noodle Clear Soup", "แกงเลียง":"Kaeng Liang (Spicy Vegetable Soup)",
  "หน่อไม้ต้มจิ้มแจ่ว":"Boiled Bamboo Shoots with Jaew Dip", "ไข่ลูกเขย":"Son-in-law Eggs", "ไข่พะโล้":"Five-Spice Stewed Eggs", "ยำวุ้นเส้นทะเล":"Spicy Seafood Glass Noodle Salad",
  "กิมจิ":"Kimchi", "ต๊อกบกกี":"Tteokbokki", "ข้าวยำเกาหลี":"Bibimbap", "ทาโกยากิ":"Takoyaki", "ทงคัตสึ":"Tonkatsu", "แซลมอนซาซิมิ":"Salmon Sashimi",
  "ปูอัดชีส":"Crab Stick with Cheese", "เฟรนช์ฟรายส์":"French Fries", "นาโช่ส์":"Nachos", "ขาหมูเยอรมัน":"German Pork Knuckle", "ปีกไก่บาร์บีคิว":"BBQ Chicken Wings",
  "ชีสบอล":"Cheese Balls", "หัวหอมทอด":"Onion Rings", "ข้าวเหนียวมะม่วง":"Mango Sticky Rice", "บัวลอย":"Bua Loy (Rice Balls in Coconut Milk)",
  "โรตีกล้วย":"Banana Roti", "ทับทิมกรอบ":"Tub Tim Grob (Water Chestnut Rubies)", "ลอดช่องน้ำกะทิ":"Lod Chong in Coconut Milk", "เครปเค้ก":"Crepe Cake",
  "ชีสเค้ก":"Cheesecake", "บราวนี่":"Brownie", "วาฟเฟิล":"Waffle", "ปังเย็น":"Pang Yen (Shaved Ice Toast)", "ขนมปังสังขยา":"Bread with Custard",
  "เค้กช็อกโกแลต":"Chocolate Cake", "ผลไม้รวม":"Mixed Fruit",
  "ข้าวมันไก่ต้ม":"Boiled Chicken Rice", "ข้าวหมกไก่":"Chicken Biryani", "ข้าวซอยไก่":"Chicken Khao Soi", "ผัดหมี่โคราช":"Pad Mee Korat",
  "ก๋วยจั๊บญวน":"Vietnamese Noodle Soup (Kuay Jab Yuan)", "ก๋วยจั๊บน้ำข้น":"Kuay Jab (Peppery Rice Roll Soup)", "โจ๊กหมู":"Pork Congee", "ข้าวต้มหมู":"Pork Rice Soup",
  "ข้าวต้มปลา":"Fish Rice Soup", "ขนมปังปิ้ง":"Toast", "แซนด์วิช":"Sandwich", "เบอร์เกอร์ไก่":"Chicken Burger", "เบอร์เกอร์เนื้อ":"Beef Burger",
  "โค้ก":"Coke", "เป๊ปซี่":"Pepsi", "สไปรท์":"Sprite", "โซดา":"Soda", "นมสด":"Fresh Milk", "โกโก้เย็น":"Iced Cocoa", "โอวัลตินเย็น":"Iced Ovaltine",
  "น้ำผลไม้ปั่น":"Fruit Smoothie", "สมูทตี้":"Smoothie",
  "ปลาร้าบอง":"Pla Ra Bong (Fermented Fish Dip)", "แจ่วบอง":"Jaew Bong (Chili Paste)", "ปลาร้าสับ":"Minced Pla Ra Dip", "ไข่มดแดงคั่ว":"Stir-fried Red Ant Eggs",
  "แมงดาปิ้ง":"Grilled Horseshoe Crab", "จิ้งหรีดทอด":"Fried Crickets", "ไข่เยี่ยวม้าทรงเครื่อง":"Century Egg with Toppings", "ยำไข่เยี่ยวม้า":"Spicy Century Egg Salad",
  "ผัดพริกขิงหมู":"Pad Prik Khing Pork", "ปลาสลิดทอด":"Fried Gourami Fish", "ปลาอินทรีย์เค็มทอด":"Fried Salted Mackerel", "กุนเชียงทอด":"Fried Chinese Sausage",
  "หมูยอทอด":"Fried Pork Sausage", "แหนมทอด":"Fried Fermented Pork", "ลูกชิ้นปิ้ง":"Grilled Meatballs", "ลูกชิ้นทอด":"Fried Meatballs", "ปลาหมึกกรอบ":"Crispy Squid",
  "สาหร่ายทอด":"Fried Seaweed", "เกี๊ยวกรอบน้ำจิ้มบ๊วย":"Crispy Wontons with Plum Sauce", "เต้าหู้ทอดซอสถั่ว":"Fried Tofu with Peanut Sauce", "สปริงโรลกุ้ง":"Shrimp Spring Rolls",
  "ปอเปี๊ยะสด":"Fresh Spring Rolls", "ข้าวเกรียบปากหม้อ":"Steamed Rice Skin Dumplings", "ขนมจีบ":"Shumai", "ซาลาเปาไส้หมู":"Pork Bun", "ขนมกุยช่าย":"Chive Dumplings",
  "หอยจ๊อ":"Crab Rolls", "ก๋วยเตี๋ยวหลอด":"Rolled Rice Noodles", "ขนมครก":"Coconut Pancakes (Khanom Krok)", "กล้วยทอด":"Fried Bananas", "มันทอด":"Fried Sweet Potato",
  "เผือกทอด":"Fried Taro", "ทุเรียนทอด":"Fried Durian Chips", "ข้าวโพดคลุกเนย":"Buttered Corn", "ผลไม้ตามฤดูกาล":"Seasonal Fruit", "สับปะรดหั่น":"Sliced Pineapple",
  "แตงโมหั่น":"Sliced Watermelon", "ฝรั่งจิ้มพริกเกลือ":"Guava with Chili Salt", "มะม่วงน้ำปลาหวาน":"Mango with Sweet Fish Sauce", "สลัดโรล":"Salad Rolls",
  "นมเย็น":"Iced Milk", "นมชมพู":"Pink Milk", "โอเลี้ยง":"Thai Iced Black Coffee (Oliang)", "ชาดำเย็น":"Iced Black Tea", "น้ำแดงมะนาว":"Red Soda with Lime",
  "น้ำเขียว":"Green Syrup Drink", "น้ำลำไย":"Longan Juice", "น้ำกระเจี๊ยบ":"Roselle Juice", "น้ำอ้อย":"Sugarcane Juice", "น้ำมะตูม":"Bael Fruit Tea", "น้ำขิง":"Ginger Tea",
  "น้ำมะขาม":"Tamarind Juice", "น้ำฝรั่ง":"Guava Juice", "น้ำองุ่น":"Grape Juice", "น้ำแอปเปิล":"Apple Juice", "น้ำสไปรท์มะนาว":"Sprite with Lime",
  "เบียร์ขวดใหญ่":"Beer (Large Bottle)", "เบียร์กระป๋อง":"Beer (Can)", "โซดาขวด":"Bottled Soda", "น้ำเปล่าขวดใหญ่":"Water (Large Bottle)", "น้ำแข็งถัง":"Ice Bucket",
  /* v4.15 */
  "ข้าวมันส้มตำ":"Coconut Rice with Som Tam", "ข้าวไข่เจียว":"Omelette with Rice", "ข้าวหมูทอด":"Fried Pork with Rice", "ข้าวกะเพราไข่ดาว":"Kra Pao with Rice and Fried Egg",
  "ไข่ดาว":"Fried Egg", "ไข่ต้ม":"Boiled Egg", "ไข่ลวก":"Soft-boiled Egg", "ไก่ต้มน้ำปลา":"Chicken Boiled in Fish Sauce", "แกงไตปลา":"Kaeng Tai Pla (Fish Kidney Curry)",
  "ข้าวยำปักษ์ใต้":"Southern Rice Salad", "ใบเหลียงผัดไข่":"Stir-fried Liang Leaves with Egg", "ข้าวกั๊นจิ๊น":"Khao Kan Jin (Steamed Rice with Pork Blood)",
  "ลาบเหนือ":"Northern Larb", "จิ้นส้มหมก":"Grilled Fermented Pork in Banana Leaf", "ไก่ทอดเกาะยอ":"Koh Yo Fried Chicken",
  "เป็ดปักกิ่ง":"Peking Duck", "ฮะเก๋า":"Har Gow (Shrimp Dumplings)", "ขนมจีบกุ้ง":"Shrimp Shumai", "เสี่ยวหลงเปา":"Xiao Long Bao", "ซาลาเปาครีม":"Custard Bun",
  "ฟองเต้าหู้":"Tofu Skin Rolls", "ผัดผักกวางตุ้ง":"Stir-fried Bok Choy", "ข้าวผัดหยางโจว":"Yangzhou Fried Rice", "เกี๊ยวน้ำกุ้ง":"Shrimp Wonton Soup",
  "บะหมี่หยก":"Jade Noodles", "กุยช่ายทอด":"Fried Chive Cakes", "ปาท่องโก๋":"Chinese Doughnuts (Pa Thong Ko)", "น้ำเต้าหู้":"Soy Milk",
  "โอโคโนมิยากิ":"Okonomiyaki", "ยากิโซบะ":"Yakisoba", "ยากิโทริ":"Yakitori", "ทามาโกะยากิ":"Tamagoyaki", "เอดามาเมะ":"Edamame", "ชาวันมูชิ":"Chawanmushi",
  "ซุปมิโสะ":"Miso Soup", "แซลมอนย่าง":"Grilled Salmon", "ปลาซาบะย่าง":"Grilled Saba", "สาหร่ายวากาเมะ":"Wakame Salad",
  "จาจังมยอน":"Jajangmyeon", "จัมปง":"Jjamppong", "บุลโกกิ":"Bulgogi", "ซัมกยอบซัล":"Samgyeopsal", "พาจอน":"Pajeon", "จับแช":"Japchae", "โอเด้ง":"Oden Skewers",
  "ฟิชแอนด์ชิปส์":"Fish and Chips", "ไก่ป๊อป":"Popcorn Chicken", "ขนมปังกระเทียม":"Garlic Bread", "อเมริกันเบรกฟาสต์":"American Breakfast",
  "ไส้กรอกรมควัน":"Smoked Sausage", "มันบด":"Mashed Potatoes", "โทสต์อะโวคาโด":"Avocado Toast",
  "ทาร์ตไข่":"Egg Tart", "พุดดิ้ง":"Pudding", "คุกกี้":"Cookies", "มาการอง":"Macarons", "โดนัท":"Donut", "บานอฟฟี่":"Banoffee Pie", "ทีรามิสุ":"Tiramisu",
  "ปังปิ้งเนยนม":"Toast with Butter and Condensed Milk", "ทองหยิบ":"Thong Yip (Golden Egg Yolk Flowers)", "ฝอยทอง":"Foi Thong (Golden Threads)",
  "ขนมถ้วย":"Khanom Thuai (Coconut Custard Cups)", "กล้วยบวชชี":"Bananas in Coconut Milk", "สาคูเปียก":"Sago in Coconut Milk", "ขนมเบื้อง":"Thai Crispy Pancakes",
  "ลูกชุบ":"Look Choop (Mung Bean Sweets)", "วุ้นกะทิ":"Coconut Jelly", "ซ่าหริ่ม":"Sarim (Noodles in Coconut Milk)", "เฉาก๊วย":"Grass Jelly",
  "เอสเพรสโซ่":"Espresso", "กาแฟร้อน":"Hot Coffee", "ชาร้อน":"Hot Tea", "ชามะลิ":"Jasmine Tea", "ชาอูหลง":"Oolong Tea", "ชาพีช":"Peach Tea", "โซดาบ๊วย":"Plum Soda",
  "น้ำผึ้งมะนาว":"Honey Lime", "อิตาเลียนโซดา":"Italian Soda", "เลมอนเนด":"Lemonade", "นมกล้วย":"Banana Milk", "ช็อกโกแลตปั่น":"Chocolate Frappe",
  "ชาไทยปั่น":"Thai Tea Frappe", "ชาเขียวปั่น":"Green Tea Frappe", "กาแฟปั่น":"Coffee Frappe", "ค็อกเทล":"Cocktail"
};

/** ชื่ออังกฤษของเมนู — full = ชื่อไทยทั้งชื่อ, base/variant = ตระกูลกับวัตถุดิบ (ไม่มี = เมนูเดี่ยว) · ไม่รู้จัก = "" */
function menuEn(full, base, variant){
  if (Object.prototype.hasOwnProperty.call(MENU_EN_FULL, full)) return MENU_EN_FULL[full];
  var b = base && MENU_EN_BASE[base];
  if (!b) return "";
  if (variant === undefined) return b[0];
  var w = MENU_EN_WORD[variant];
  if (!w) return "";
  return w.indexOf("{b}") >= 0 ? w.replace("{b}", b[0]) : b[1].replace("{v}", w);
}

/* ---- ค่าส่วนกลาง (shared-library.js) ---- */
var SHARED_EN = {
  "น้ำแข็ง":"Ice", "น้ำแข็งถัง":"Ice Bucket", "น้ำแข็งเพิ่ม":"Extra Ice", "น้ำเปล่า":"Water", "น้ำเปล่าขวดใหญ่":"Water (Large Bottle)", "น้ำดื่มถัง":"Drinking Water Jug",
  "โซดา":"Soda", "น้ำอัดลม":"Soft Drinks", "โค้ก":"Coke", "โค้กขวดใหญ่":"Coke (Large Bottle)", "เป๊ปซี่":"Pepsi", "สไปรท์":"Sprite", "แฟนต้า":"Fanta",
  "ชาเย็นเหยือก":"Iced Tea Pitcher", "น้ำหวานเหยือก":"Syrup Drink Pitcher", "น้ำมะพร้าว":"Coconut Water", "เบียร์":"Beer", "เบียร์ทาวเวอร์":"Beer Tower",
  "เบียร์ช้าง":"Chang Beer", "เบียร์ลีโอ":"Leo Beer", "เบียร์สิงห์":"Singha Beer", "เหล้า":"Liquor", "มิกเซอร์":"Mixers", "ค่าเปิดขวด":"Corkage",
  "ข้าวเหนียว":"Sticky Rice", "ข้าวเหนียวกระติ๊บ":"Sticky Rice Basket", "ข้าวสวย":"Steamed Rice", "ข้าวสวยโถ":"Rice Bowl (Shared)", "ข้าวเปล่า":"Plain Rice",
  "ขนมจีน":"Rice Noodles (Khanom Jeen)", "เส้นขนมจีน":"Khanom Jeen Noodles", "ผักสด":"Fresh Vegetables", "ผักเครื่องเคียง":"Side Vegetables",
  "ชุดผัก":"Vegetable Set", "ผักเพิ่ม":"Extra Vegetables", "น้ำจิ้ม":"Dipping Sauce", "น้ำจิ้มซีฟู้ด":"Seafood Sauce", "น้ำจิ้มแจ่ว":"Jaew Dip",
  "น้ำซุป":"Broth", "เติมน้ำซุป":"Broth Refill", "ไข่ไก่":"Eggs", "ชุดหมูกระทะ":"Moo Kata Set", "กับแกล้ม":"Drinking Snacks", "ถั่ว":"Peanuts",
  "ขนม":"Snacks", "ขนมขบเคี้ยว":"Chips and Snacks", "ผลไม้":"Fruit", "ของหวาน":"Dessert", "เค้กวันเกิด":"Birthday Cake",
  "ค่าส่ง":"Delivery Fee", "ค่าส่งอาหาร":"Food Delivery Fee", "ค่าแพ็กเกจ":"Packaging Fee", "ค่ากล่อง":"Box Fee", "ค่าถุง":"Bag Fee", "ทิป":"Tip",
  "ทิปพนักงาน":"Staff Tip", "ผ้าเย็น":"Wet Towels", "ทิชชู่":"Tissues", "ค่าเตา":"Grill Fee", "ค่าถ่าน":"Charcoal", "ค่าโต๊ะ":"Table Fee", "ค่าห้อง":"Room Fee",
  "ค่าห้องคาราโอเกะ":"Karaoke Room", "ค่าแก้ว":"Glass Fee", "ค่าจอดรถ":"Parking", "ค่าแท็กซี่":"Taxi", "ค่าน้ำมัน":"Fuel", "ค่าทางด่วน":"Tolls",
  "ค่าตกแต่ง":"Decorations", "เทียนวันเกิด":"Birthday Candles"
};

/* ---- ค่าใช้จ่ายทริป (TRIP_LIBRARY ใน shared-library.js) ---- */
var TRIP_EN = {
  "ที่พัก":"Accommodation", "ค่าห้องพัก":"Room", "ค่าโฮมสเตย์":"Homestay", "ค่ารีสอร์ต":"Resort", "ค่าแคมป์":"Campsite", "ค่าเต็นท์":"Tent",
  "ค่าน้ำมัน":"Fuel", "ค่าทางด่วน":"Tolls", "ค่าเช่ารถ":"Car Rental", "ค่าเช่ามอเตอร์ไซค์":"Motorbike Rental", "ค่าที่จอดรถ":"Parking", "แท็กซี่":"Taxi",
  "Grab":"Grab", "ค่ารถสองแถว":"Songthaew", "ค่าเรือ":"Boat", "ค่ารถตู้":"Van", "ตั๋วเครื่องบิน":"Flights", "ตั๋วรถทัวร์":"Bus Tickets", "ตั๋วรถไฟ":"Train Tickets",
  "ค่ากระเป๋าโหลด":"Checked Baggage", "ค่าอาหาร":"Food", "มื้อเช้า":"Breakfast", "มื้อกลางวัน":"Lunch", "มื้อเย็น":"Dinner", "ค่าเครื่องดื่ม":"Drinks",
  "กาแฟ":"Coffee", "ขนม":"Snacks", "ของใช้ในทริป":"Trip Supplies", "ค่าเข้าชม":"Admission", "ค่าบัตรเข้าอุทยาน":"National Park Fee", "ค่ากิจกรรม":"Activities",
  "ค่าไกด์":"Guide", "ค่าทัวร์":"Tour", "ค่าดำน้ำ":"Diving / Snorkeling", "ค่าเช่าอุปกรณ์":"Equipment Rental", "ของฝาก":"Souvenirs", "ซิมเน็ต":"SIM / Data",
  "ค่าประกันการเดินทาง":"Travel Insurance", "ทิป":"Tip"
};
