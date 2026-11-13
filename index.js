const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ตั้งค่าการเชื่อมต่อ Supabase กฟภ.สาขาควนขนุน
const supabaseUrl = 'https://tdcgsvbcidbjvpxhrmet.supabase.co';
const supabaseKey = 'SUPABASE_ANON_KEY_ของคุณ'; // ใส่ Key ของท่าน
const supabase = createClient(supabaseUrl, supabaseKey);

// LINE Channel Access Token
const LINE_ACCESS_TOKEN = 'ใส่_Channel_Access_Token_ของคุณตรงนี้';

// ---------------------------------------------------------
// 1. หน้าเว็บไซต์หลัก (Web Frontend) สำหรับเปิดลิงก์แจ้งปัญหา
// ---------------------------------------------------------
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ระบบแจ้งเหตุไฟฟ้าขัดข้อง - กฟภ.สาขาควนขนุน</title>
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style> body { font-family: 'Prompt', sans-serif; } </style>
    </head>
    <body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
        <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h1 class="text-xl font-bold text-red-600 mb-2 text-center">⚡ แจ้งเหตุไฟฟ้าขัดข้อง</h1>
            <p class="text-sm text-gray-500 mb-6 text-center">การไฟฟ้าส่วนภูมิภาค สาขาควนขนุน</p>
            
            <form id="outageForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">สาเหตุ / รายละเอียดความขัดข้อง</label>
                    <textarea id="description" rows="3" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="เช่น หม้อแปลงระเบิด, ไฟดับบริเวณซอย..."></textarea>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ละติจูด (Lat)</label>
                        <input type="text" id="latitude" required class="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="พิกัด Lat">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ลองจิจูด (Lon)</label>
                        <input type="text" id="longitude" required class="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="พิกัด Lon">
                    </div>
                </div>
                <button type="button" onclick="getLocation()" class="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">📍 ดึงพิกัดตำแหน่งปัจจุบันของฉัน</button>
                <button type="submit" class="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition">🚀 ส่งข้อมูลแจ้งเหตุ</button>
            </form>
            <div id="resultMsg" class="mt-4 text-center text-sm font-medium"></div>
        </div>

        <script>
            function getLocation() {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                        document.getElementById('latitude').value = position.coords.latitude;
                        document.getElementById('longitude').value = position.coords.longitude;
                        alert('ดึงพิกัดสำเร็จ!');
                    }, () => {
                        alert('ไม่สามารถดึงพิกัดได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง');
                    });
                } else {
                    alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
                }
            }

            const supabaseUrl = 'https://tdcgsvbcidbjvpxhrmet.supabase.co';
            const supabaseKey = 'SUPABASE_ANON_KEY_ของคุณ'; // ใส่ Key ของท่าน
            const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

            document.getElementById('outageForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const desc = document.getElementById('description').value;
                const lat = parseFloat(document.getElementById('latitude').value);
                const lon = parseFloat(document.getElementById('longitude').value);
                const msg = document.getElementById('resultMsg');

                const { error } = await _supabase.from('outage_reports').insert([
                    { description: desc, latitude: lat, longitude: lon }
                ]);

                if (error) {
                    msg.className = 'mt-4 text-center text-sm font-medium text-red-600';
                    msg.innerText = '❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล';
                } else {
                    msg.className = 'mt-4 text-center text-sm font-medium text-green-600';
                    msg.innerText = '✅ แจ้งข้อมูลสำเร็จ เจ้าหน้าที่รับเรื่องแล้วครับ';
                    document.getElementById('outageForm').reset();
                }
            });
        </script>
    </body>
    </html>
  `);
});

// ฟังก์ชันคำนวณระยะทาง Haversine (รัศมี 1 กม.)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// ---------------------------------------------------------
// 2. ระบบ Webhook สำหรับ LINE Bot (รับข้อความและพิกัด)
// ---------------------------------------------------------
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) {
    return res.status(200).send('OK');
  }

  for (const event of events) {
    const replyToken = event.replyToken;

    // กรณีผู้ใช้พิมพ์ข้อความทักเข้ามา
    if (event.type === 'message' && event.message.type === 'text') {
      const { data: outages, error } = await supabase
        .from('outage_reports')
        .select('*');

      let outageListText = "⚡ แจ้งเหตุไฟฟ้าขัดข้อง (กฟภ.สาขาควนขนุน)\n\nปัจจุบันไม่มีรายการพื้นที่ไฟฟ้าขัดข้องครับ";
      
      if (!error && outages && outages.length > 0) {
        outageListText = "⚡ แจ้งเหตุไฟฟ้าขัดข้อง (กฟภ.สาขาควนขนุน)\nรายการพื้นที่ไฟดับที่มีการแจ้งไว้:\n";
        outages.forEach((item, index) => {
          outageListText += `${index + 1}. ${item.description || 'ไฟฟ้าขัดข้องฉุกเฉิน'}\n`;
        });
      }

      // ดึงลิงก์เว็บหลักจาก Render ของโปรเจกต์นี้เอง
      const webUrl = `https://${req.get('host')}/`;
      outageListText += `\n📍 หากท่านต้องการแจ้งปัญหาไฟฟ้าขัดข้อง กรุณาส่งพิกัด (Location) ของท่าน หรือแจ้งผ่านเว็บไซต์:\n${webUrl}`;

      await sendLineMessage(replyToken, outageListText);
    }

    // กรณีผู้ใช้ส่งพิกัด (Location) เข้ามาเช็ก
    else if (event.type === 'message' && event.message.type === 'location') {
      const userLat = event.message.latitude;
      const userLon = event.message.longitude;

      const { data: outages, error } = await supabase
        .from('outage_reports')
        .select('*');

      let foundOutage = false;

      if (!error && outages) {
        for (const outage of outages) {
          const distance = getDistanceFromLatLonInKm(userLat, userLon, outage.latitude, outage.longitude);
          if (distance <= 1.0) { // อยู่ในรัศมี 1 กิโลเมตร
            foundOutage = true;
            break;
          }
        }
      }

      const webUrl = `https://${req.get('host')}/`;
      let replyText = "";
      if (foundOutage) {
        replyText = "⚠️ พื้นที่ดังกล่าวได้รับการแจ้งปัญหาไฟฟ้าขัดข้องแล้ว เจ้าหน้าที่กำลังดำเนินการแก้ไขครับ";
      } else {
        replyText = `✅ ตำแหน่งของคุณไม่อยู่ในรัศมี 1 กม. จากจุดที่ได้รับแจ้ง\nหากต้องการแจ้งปัญหาไฟฟ้าขัดข้องเพิ่มเติม กรุณาแจ้งในหน้าเว็บของเราได้ที่:\n${webUrl}`;
      }

      await sendLineMessage(replyToken, replyText);
    }
  }

  res.status(200).send('OK');
});

// ฟังก์ชันช่วยส่งข้อความหา LINE
async function sendLineMessage(replyToken, text) {
  await axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken: replyToken,
    messages: [{ type: 'text', text: text }]
  }, {
    headers: {
      'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PEA Line Bot Server is running on port ${PORT}`);
});
