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

/**
 * Trích xuất đối tượng JSON hoàn chỉnh đầu tiên từ một chuỗi buffer.
 * @param {string} buffer - Chuỗi chứa dữ liệu JSON đang được stream.
 * @returns {{object: string|null, remainingBuffer: string}} - Trả về đối tượng JSON tìm thấy và phần còn lại của buffer.
 */
function extractNextJsonObject(buffer) {
    const objectStartIndex = buffer.indexOf('{');
    if (objectStartIndex === -1) {
        return { object: null, remainingBuffer: buffer };
    }

    let braceCount = 1;
    for (let i = objectStartIndex + 1; i < buffer.length; i++) {
        if (buffer[i] === '{') {
            braceCount++;
        } else if (buffer[i] === '}') {
            braceCount--;
        }

        if (braceCount === 0) {
            const objectEndIndex = i + 1;
            const objectStr = buffer.substring(objectStartIndex, objectEndIndex);
            try {
                JSON.parse(objectStr);
                return {
                    object: objectStr,
                    remainingBuffer: buffer.substring(objectEndIndex)
                };
            } catch (e) {
                // Không phải là JSON hợp lệ, tiếp tục tìm kiếm
            }
        }
    }
    return { object: null, remainingBuffer: buffer };
}

/**
 * Hàm fetch có cơ chế tự động thử lại khi gặp lỗi 503 (quá tải) hoặc 429 (giới hạn truy cập).
 * @param {string} url - URL để fetch.
 * @param {object} options - Tùy chọn cho fetch.
 * @param {number} retries - Số lần thử lại tối đa.
 * @returns {Promise<Response>} - Trả về đối tượng Response nếu thành công.
 */
async function fetchWithRetry(url, options, retries = 3) {
    let delay = 1000; // Đợi 1 giây cho lần thử đầu tiên
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            // Nếu thành công, trả về ngay lập tức
            if (response.ok) {
                return response;
            }
            // Nếu gặp lỗi có thể thử lại (quá tải, giới hạn truy cập)
            if (response.status === 503 || response.status === 429) {
                console.warn(`API trả về lỗi ${response.status}. Thử lại sau ${delay / 1000} giây... (Lần thử ${i + 1}/${retries})`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Tăng thời gian chờ cho lần thử tiếp theo
                continue; // Chuyển sang lần thử tiếp theo
            }
            // Đối với các lỗi khác, báo lỗi ngay lập tức
            const errorText = await response.text();
            throw new Error(`Lỗi không thể thử lại từ API: ${response.status} - ${errorText}`);

        } catch (error) {
            // Nếu đây là lần thử cuối cùng, ném lỗi ra ngoài
            if (i === retries - 1) {
                throw error;
            }
        }
    }
    throw new Error('Đã hết số lần thử lại mà vẫn không thành công.');
}


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
Là một chuyên gia dịch thuật tiếng Trung sang tiếng Việt trong lĩnh vực Phật giáo. Bạn hãy dịch các văn bản tiếng Trung giản thể sang Tiếng Việt theo ngôn ngữ đời thường dễ hiểu. Giữ nguyên bố cục, dòng, đoạn và cách trình bày của văn bản gốc sang tiếng Việt. Không diễn đạt lại theo ý hiểu cá nhân, chỉ dịch sát nghĩa từng câu. Nếu gặp thuật ngữ chuyên môn khó dịch, hãy phiên âm Hán-Việt kèm theo giải thích ngắn gọn (nếu cần) ở cuối mỗi bản dịch.
Từ điển dịch thuật chuyên môn cần ghi nhớ:
礼佛大忏悔文 : Lễ Phật Đại Sám Hối Văn.
女听众 : Nữ Thính Giả.
台长答 : Đài Trưởng đáp.
小房子 : Ngôi Nhà Nhỏ.
冰山地狱 : Địa Ngục Núi Băng.
男聽眾 : Nam Thính Giả.
圖騰 : Đồ Đằng.
靈性 : Vong Linh.
聽眾 : Thính Giả.
好好修 : Cứ chăm chỉ tu hành
誓願 : thệ nguyện
一門精進 : Nhất Môn Tinh Tấn
大悲神咒 : Chú Đại Bi
諸佛國者 : các cõi Phật
众生 : chúng sinh
卢军宏 : Lư Quân Hoành
要经者 : Người cần Kinh
师兄 : Sư Huynh
Bạn hãy tự động dịch tất cả các văn bản tiếng Trung tôi gửi lên.
---
${chineseText}
---
`;

  try {
    // Sử dụng hàm fetchWithRetry thay vì fetch thông thường
    const geminiResponse = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });

        let processNext = true;
        while (processNext) {
            const result = extractNextJsonObject(buffer);
            if (result.object) {
                res.write(`data: ${result.object}\n\n`);
                buffer = result.remainingBuffer;
            } else {
                processNext = false;
            }
        }
    }

    res.end();

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
