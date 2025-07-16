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
  const apiKey = process.env.GOOGLE_API_KEY;
  const { chineseText } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình GOOGLE_API_KEY.' });
  }
  if (!chineseText) {
    return res.status(400).json({ error: 'Văn bản tiếng Trung không được để trống.' });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`;

  const prompt = `
**Yêu cầu nhiệm vụ (TUÂN THỦ TUYỆT ĐỐI):**
Bạn PHẢI hành động như "Trợ Lý Dịch Khai Thị". Giọng điệu của bạn phải trang nghiêm, từ tốn, và đầy lòng từ bi, giống như một bậc thầy đang giảng giải Phật Pháp. Khi dịch và giải thích, bạn phải dùng ngôn ngữ Phật học chính xác, dễ hiểu, phù hợp với người Việt.
**Nhiệm vụ:**
1.  **Dịch Chính Xác:** Dịch đoạn văn bản tiếng Trung sang tiếng Việt.
2.  **Khai Thị (Giải Thích):** Sau khi dịch, bạn phải viết một đoạn "KHAI THỊ" để giải thích ý nghĩa sâu xa của đoạn văn, đặc biệt là các thuật ngữ Phật học, và đưa ra lời khuyên tu tập dựa trên nội dung đó.
3.  **Định dạng:** Trình bày rõ ràng phần "Bản Dịch" và "Khai Thị".
**Văn bản cần dịch:**
---
${chineseText}
---
`;

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Lỗi từ Google API:', errorText);
      throw new Error('Không nhận được phản hồi hợp lệ từ Google API.');
    }

    // Thiết lập đúng headers cho Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Hàm xử lý buffer để tìm các đối tượng JSON hoàn chỉnh
    const processBuffer = () => {
        // Luồng dữ liệu từ Google là một chuỗi JSON array, ví dụ: "[{...}, {...}]"
        // Chúng ta cần tìm từng đối tượng {...} hoàn chỉnh một.
        let braceCount = 0;
        let objectStartIndex = -1;

        for (let i = 0; i < buffer.length; i++) {
            if (buffer[i] === '{') {
                if (braceCount === 0) {
                    objectStartIndex = i;
                }
                braceCount++;
            } else if (buffer[i] === '}') {
                braceCount--;
                if (braceCount === 0 && objectStartIndex !== -1) {
                    // Khi số lượng dấu '{' và '}' bằng nhau, ta đã tìm thấy một đối tượng hoàn chỉnh
                    const objectStr = buffer.substring(objectStartIndex, i + 1);
                    
                    try {
                        // Kiểm tra xem có phải là JSON hợp lệ không
                        JSON.parse(objectStr); 
                        // Gửi đối tượng JSON hợp lệ này về client theo đúng định dạng SSE
                        res.write(`data: ${objectStr}\n\n`);
                        
                        // Cắt bỏ phần đã xử lý khỏi buffer
                        buffer = buffer.substring(i + 1);
                        // Reset vòng lặp để quét phần còn lại của buffer
                        i = -1; 
                        objectStartIndex = -1;
                    } catch (e) {
                        // Bỏ qua nếu không phải JSON hợp lệ (ví dụ: chuỗi có chứa dấu '{' hoặc '}')
                        // và tiếp tục tìm kiếm
                    }
                }
            }
        }
    };

    // Vòng lặp đọc dữ liệu từ Google
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        // Thêm dữ liệu mới vào buffer và xử lý
        buffer += decoder.decode(value);
        processBuffer();
    }

    res.end();

  } catch (err) {
    console.error('Lỗi máy chủ:', err);
    // Tránh gửi header hai lần nếu lỗi xảy ra sau khi đã flushHeaders
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
