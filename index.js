const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// ตั้งค่าการเชื่อมต่อ Supabase กฟภ.สาขาควนขนุน
const supabaseUrl = 'https://tdcgsvbcidbjvpxhrmet.supabase.co';
const supabaseKey = 'SUPABASE_ANON_KEY_ของท่าน'; // ใส่ Key หรือปล่อยผ่านถ้าใช้ระบบรับค่าอัตโนมัติ
const supabase = createClient(supabaseUrl, supabaseKey);

// LINE Channel Access Token ที่ตั้งค่าไว้
const LINE_ACCESS_TOKEN = 'ใส่_Channel_Access_Token_ของคุณตรงนี้';

// ฟังก์ชันคำนวณระยะทาง Haversine (รัศมี 1 กม.)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // รัศมีโลกหน่วยเป็นกิโลเมตร
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

// Webhook Endpoint สำหรับรับข้อความจาก LINE
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) {
    return res.status(200).send('OK');
  }

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'location') {
      const userLat = event.message.latitude;
      const userLon = event.message.longitude;
      const replyToken = event.replyToken;

      // ดึงข้อมูลไฟดับจากตาราง outage_reports ใน Supabase
      const { data: outages, error } = await supabase
        .from('outage_reports')
        .select('*');

      let foundOutage = false;
      let outageDetails = '';

      if (!error && outages) {
        for (const outage of outages) {
          const distance = getDistanceFromLatLonInKm(userLat, userLon, outage.latitude, outage.longitude);
          if (distance <= 1.0) { // อยู่ในรัศมี 1 กิโลเมตร
            foundOutage = true;
            outageDetails = `⚠️ แจ้งเตือนพื้นที่ไฟฟ้าขัดข้อง (กฟภ.ควนขนุน)\nสาเหตุ: ${outage.description || 'กระแสไฟฟ้าขัดข้องฉุกเฉิน'}\nระยะห่างจากจุดของคุณ: ${(distance * 1000).toFixed(0)} เมตร`;
            break;
          }
        }
      }

      let replyText = foundOutage 
        ? outageDetails 
        : "✅ ตรวจสอบแล้ว ตำแหน่งของคุณไม่อยู่ในพื้นที่ไฟดับ (รัศมี 1 กม. ปกติสุขดีครับ)";

      // ส่งข้อความกลับหาผู้ใช้ทาง LINE
      await axios.post('https://api.line.me/v2/bot/message/reply', {
        replyToken: replyToken,
        messages: [{ type: 'text', text: replyText }]
      }, {
        headers: {
          'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    }
  }

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PEA Line Bot Server is running on port ${PORT}`);
});
