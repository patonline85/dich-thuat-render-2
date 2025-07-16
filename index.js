require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());

// Phục vụ index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/translate', async (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const { chineseText } = req.body;

  if (!apiKey) return res.status(500).send('Chưa cấu hình API key.');
  if (!chineseText) return res.status(400).send('Văn bản không được để trống.');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`;
  const prompt = `Dịch tiếng Trung sang tiếng Việt: \n\n${chineseText}`;

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
    });

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json();
      console.error('Google API error:', error);
      throw new Error(error.error?.message || 'Lỗi từ Google API');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkText = decoder.decode(value, { stream: true });
      res.write(chunkText); // gửi về frontend
    }
    res.end();

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send(`Lỗi máy chủ: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
