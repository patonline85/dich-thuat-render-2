require('dotenv').config();
const express = require('express');
const path = require('path');
// node-fetch không còn cần thiết nếu bạn dùng Node.js v18+
// const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Phục vụ file index.html khi truy cập vào trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Xử lý yêu cầu dịch
app.post('/api/translate', async (req, res) => {
  // !! QUAN TRỌNG: Thay thế bằng URL Google Apps Script của chính bạn !!
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8-KHfmVNUQ87Qdw3qk43ql_mI87Qy3KIpECE2GkUpPQx0DF7SD7qCIRT2aNm0xH_Q9A/exec'; 
  
  const { chineseText } = req.body;

  if (!chineseText) {
    return res.status(400).json({ error: 'Văn bản tiếng Trung không được để trống.' });
  }
  
  if (APPS_SCRIPT_URL.includes('AKfycbw8-KHfmVNUQ87Qdw3qk43ql_mI87Qy3KIpECE2GkUpPQx0DF7SD7qCIRT2aNm0xH_Q9A')) {
      return res.status(500).json({ error: 'Vui lòng cấu hình APPS_SCRIPT_URL trong file index.js.' });
  }

  try {
    // Gửi yêu cầu đến proxy Google Apps Script
    const scriptResponse = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chineseText: chineseText }),
      // Apps Script có thể chuyển hướng, cần phải theo dõi
      redirect: 'follow'
    });

    const data = await scriptResponse.json();

    if (data.error) {
        // Chuyển tiếp lỗi từ Apps Script về cho client
        throw new Error(data.error);
    }

    // Gửi kết quả dịch về cho client
    res.status(200).json(data);

  } catch (err) {
    console.error('Lỗi máy chủ:', err);
    res.status(500).json({ error: `Lỗi máy chủ: ${err.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
