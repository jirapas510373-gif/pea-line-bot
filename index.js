const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// ตั้งค่าการเชื่อมต่อ Supabase กฟภ.สาขาควนขนุน
const supabaseUrl = 'https://tdcgsvbcidbjvpxhrmet.supabase.co';
const supabaseKey = 'SUPABASE_ANON_KEY_ของคุณ'; // ใส่ Key ของท่าน
const supabase = createClient(supabaseUrl, supabaseKey);

// LINE Channel Access Token
const LINE_ACCESS_TOKEN = 'C2gX/V1yu+EnFsIxZnRNFAn5W4ct8yPMDMGZJxRBq/VmuHREjq2QiUngwNZsdydCesK1Zj1HJrVrOKsO0lf5+2G0yoZj827n/oARhziJenBfZG+2vEMHz3hE3LlgrrieMx7bSH5rp3jFShKAXYC40gdB04t89/1O/w1cDnyilFU=';

// ลิงก์หน้าเว็บสำหรับแจ้งปัญหาไฟฟ้าขัดข้อง (เปลี่ยนเป็นลิงก์เว็บของคุณ)
const WEB_REPORT_URL = 'https://pea-kwn-outage.onrender.com'; 

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

// Webhook Endpoint สำหรับรับข้อความจาก LINE
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) {
    return res.status(200).send('OK');
  }

  for (const event of events) {
    const replyToken = event.replyToken;

    // 1. กรณีผู้ใช้ทักข้อความตัวอักษรเข้ามา
    if (event.type === 'message' && event.message.type === 'text') {
      // ดึงข้อมูลทั้งหมดจากตาราง outage_reports
      const { data: outages, error } = await supabase
        .from('outage_reports')
        .select('*');

      let outageListText = "⚡ แจ้งเหตุไฟฟ้าขัดข้อง (กฟภ.สาขาควนขนุน)\n\nปัจจุบันไม่มีรายการพื้นที่ไฟฟ้าขัดข้องครับ";
      
      if (!error && outages && outages.length > 0) {
        outageListText = "⚡ แจ้งเหตุไฟฟ้าขัดข้อง (กฟภ.สาขาควนขนุน)\nรายการพื้นที่ไฟดับที่มีการแจ้งไว้:\n";
        outages.forEach((item, index) => {
          outageListText += `${index + 1}. ${item.description || 'ไฟฟ้าขัดข้องฉุกเฉิน'} (พิกัด: ${item.latitude}, ${item.longitude})\n`;
        });
      }

      outageListText += `\n📍 หากท่านต้องการแจ้งปัญหาไฟฟ้าขัดข้อง กรุณาส่งพิกัด (Location) ของท่านในแชทนี้เพื่อตรวจสอบพื้นที่ไฟดับครับ`;

      await sendLineMessage(replyToken, outageListText);
    }

    // 2. กรณีผู้ใช้ส่งพิกัด (Location) เข้ามา
    else if (event.type === 'message' && event.message.type === 'location') {
      const userLat = event.message.latitude;
      const userLon = event.message.longitude;

      // ดึงข้อมูลทั้งหมดมาเช็กระยะทาง
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

      let replyText = "";
      if (foundOutage) {
        replyText = "⚠️ พื้นที่ดังกล่าวได้รับการแจ้งปัญหาไฟฟ้าขัดข้องแล้ว เจ้าหน้าที่กำลังดำเนินการแก้ไขครับ";
      } else {
        replyText = `✅ ตำแหน่งของคุณไม่อยู่ในรัศมี 1 กม. จากจุดที่ได้รับแจ้ง\nหากต้องการแจ้งปัญหาไฟฟ้าขัดข้องเพิ่มเติม กรุณาแจ้งในหน้าเว็บของเราได้ที่:\n${WEB_REPORT_URL}`;
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
