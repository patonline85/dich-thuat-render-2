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
  // URL của Cloudflare Worker bạn đã tạo ở Bước 1
  // !! QUAN TRỌNG: Thay thế bằng URL Worker của chính bạn !!
  const WORKER_URL = 'https://dich-khai-thi-proxy.your-username.workers.dev'; 
  
  const { chineseText } = req.body;

  if (!chineseText) {
    return res.status(400).json({ error: 'Văn bản tiếng Trung không được để trống.' });
  }
  
  if (WORKER_URL.includes('your-username')) {
      return res.status(500).json({ error: 'Vui lòng cấu hình WORKER_URL trong file index.js.' });
  }

  try {
    // Gửi yêu cầu đến "trạm trung chuyển" Cloudflare Worker
    const workerResponse = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chineseText: chineseText }),
    });

    if (!workerResponse.ok) {
        const errorText = await workerResponse.text();
        throw new Error(`Lỗi từ Worker: ${workerResponse.status} - ${errorText}`);
    }

    // Thiết lập headers để stream về cho client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Chuyển tiếp (pipe) luồng dữ liệu từ Worker về thẳng cho client
    workerResponse.body.pipe(res);

  } catch (err) {
    console.error('Lỗi máy chủ:', err);
    if (!res.headersSent) {
        res.status(500).send(`Lỗi máy chủ: ${err.message}`);
    } else {
        res.end();
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
