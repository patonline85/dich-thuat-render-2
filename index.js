require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());

// Phục vụ index.html + file tĩnh (nếu có)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/translate', async (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('API key chưa được cấu hình.');
    return res.status(500).send('Lỗi: Khóa API chưa được cấu hình trên máy chủ.');
  }

  const { chineseText } = req.body;
  if (!chineseText) {
    return res.status(400).send('Lỗi: Không có văn bản tiếng Trung.');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`;

  const prompt = `**Văn bản cần dịch:**\n---\n${chineseText}\n---`;

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      }),
    });

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error('Google AI API lỗi:', error);
      return res.status(500).send('Lỗi từ Google AI API');
    }

    const text = await geminiResponse.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text);

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send(`Lỗi máy chủ: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
