const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());

// Phục vụ tệp index.html khi người dùng truy cập trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Điểm cuối API để xử lý việc dịch thuật bằng phương pháp STREAMING
app.post('/api/translate', async (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('API key not configured on server.');
    return res.status(500).send('Lỗi: Khóa API chưa được cấu hình trên máy chủ.');
  }

  const { chineseText } = req.body;
  if (!chineseText) {
    return res.status(400).send('Lỗi: Không có văn bản tiếng Trung nào được cung cấp.');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`;

  const prompt = `
      **Yêu cầu nhiệm vụ (TUÂN THỦ TUYỆT ĐỐI):**
      Bạn PHẢI hành động như "Trợ Lý Dịch Khai Thị", một chuyên gia dịch thuật tiếng Trung sang tiếng Việt trong lĩnh vực Phật giáo, dựa trên triết lý và khai thị của Đài Trưởng Lư Quân Hoành.
      Nhiệm vụ của bạn là phải dịch văn bản tiếng Trung giản thể sau đây sang tiếng Việt. Hãy tuân thủ nghiêm ngặt các quy tắc và sử dụng tri thức nền tảng dưới đây để đảm bảo bản dịch có chất lượng cao nhất, đúng văn phong và thuật ngữ của Pháp Môn Tâm Linh.
      **Quy tắc dịch thuật (BẮT BUỘC VÀ KHÔNG THAY ĐỔI):**
      1. **Giữ nguyên bố cục:** Giữ nguyên cách trình bày dòng, đoạn của văn bản gốc.
      2. **Dịch sát nghĩa:** Chỉ dịch sát nghĩa từng câu, không diễn đạt lại theo ý hiểu cá nhân.
      3. **Thuật ngữ chuyên môn:** Nếu gặp thuật ngữ khó, hãy phiên âm Hán-Việt và giải thích ngắn gọn ở cuối bản dịch (nếu cần).
      **Từ điển chuyên môn (SỬ DỤNG CHÍNH XÁC TUYỆT ĐỐI):**
      - 礼佛大忏悔文 : Lễ Phật Đại Sám Hối Văn - 女听众 : Nữ Thính Giả - 台长答 : Đài Trưởng đáp - 小房子 : Ngôi Nhà Nhỏ - 冰山地狱 : Địa Ngục Núi Băng - 男聽眾 : Nam Thính Giả - 圖騰 : Đồ Đằng - 靈性 : Vong Linh - 聽眾 : Thính Giả - 好好修 : Cứ chăm chỉ tu hành - 誓願 : thệ nguyện - 一門精進 : Nhất Môn Tinh Tấn - 大悲神咒 : Chú Đại Bi - 諸佛國者 : các cõi Phật - 众生 : chúng sinh - 卢军宏 : Lư Quân Hoành - 要经者 : Người cần Kinh - 师兄 : Sư Huynh
      **Tri thức nền tảng (BẮT BUỘC SỬ DỤNG LÀM CƠ SỞ DỊCH):**
      - Mọi vấn đề trong cuộc sống (sự nghiệp, sức khỏe, hôn nhân, bệnh tật như tự kỷ) đều liên quan đến nghiệp chướng (业障) và vong linh (灵性).
      - Giải pháp chính là "Tam Đại Pháp Bảo": Niệm Kinh (念经), Hứa Nguyện (许愿), và Phóng Sanh (放生).
      - "Ngôi Nhà Nhỏ" (小房子) là một tổ hợp kinh văn đặc biệt dùng để trả nợ nghiệp, siêu độ vong linh, người cần kinh (要经者) và thai nhi bị phá bỏ. Đây là phương pháp cốt lõi.
      - Các kinh văn thường dùng: Chú Đại Bi (大悲咒) để tăng năng lượng, Tâm Kinh (心经) để khai mở trí tuệ, Lễ Phật Đại Sám Hối Văn (礼佛大忏悔文) để sám hối nghiệp chướng, Chú Chuẩn Đề (准提神咒) để cầu nguyện sự nghiệp, học hành, và Giải Kết Chú (解结咒) để hóa giải oán kết.
      - Giấc mơ (梦境) là một hình thức khai thị, thường báo hiệu về nghiệp chướng, vong linh cần siêu độ, hoặc những điềm báo cần hóa giải bằng cách niệm kinh, niệm Ngôi Nhà Nhỏ.
      - Các vấn đề của trẻ nhỏ thường liên quan đến nghiệp chướng của cha mẹ, đặc biệt là nghiệp phá thai.
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
        const errorResult = await geminiResponse.json();
        console.error('Error from Google AI API:', errorResult);
        throw new Error(errorResult.error?.message || 'Lỗi từ Google AI API');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    geminiResponse.body.pipe(res);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send(`Lỗi máy chủ: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Dòng log để xác nhận phiên bản mới đã được triển khai
  console.log('--- Trợ Lý Dịch Khai Thị - PHIÊN BẢN STREAMING ĐÃ HOẠT ĐỘNG ---');
});
index.html (Dán nội dung này vào tệp index.html của bạn)

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trợ Lý Dịch Khai Thị - Ứng dụng Dịch thuật Phật giáo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .loader {
            border-top-color: #3498db;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .toast {
            visibility: hidden;
            min-width: 250px;
            background-color: #333;
            color: #fff;
            text-align: center;
            border-radius: 8px;
            padding: 16px;
            position: fixed;
            z-index: 100;
            left: 50%;
            transform: translateX(-50%);
            bottom: 30px;
            opacity: 0;
            transition: opacity 0.5s, visibility 0.5s;
        }
        .toast.show {
            visibility: visible;
            opacity: 1;
        }
    </style>
</head>
<body class="bg-[#fffbbe] text-gray-800">

    <div class="container mx-auto p-4 md:p-8">
        <header class="text-center mb-8">
            <div class="flex justify-center items-center mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-teal-600"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                 <h1 class="text-3xl md:text-4xl font-bold text-teal-700 ml-3">Trợ Lý Dịch Khai Thị</h1>
            </div>
            <p class="text-md text-gray-600">Ứng dụng dịch thuật chuyên ngành Phật giáo từ Trung sang Việt</p>
        </header>
        
        <main class="bg-white p-6 rounded-2xl shadow-lg">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div class="flex justify-between items-center mb-2">
                       <label for="chinese-text" class="block text-lg font-semibold text-gray-700">Văn bản tiếng Trung (Giản thể)</label>
                        <button id="clear-button" class="text-sm text-red-500 hover:text-red-700 font-semibold flex items-center p-1 rounded-md transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Xóa
                        </button>
                    </div>
                   <textarea id="chinese-text" rows="15" class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-300" placeholder="Nhập hoặc dán văn bản tiếng Trung cần dịch vào đây..."></textarea>
                </div>

                <div>
                    <label for="vietnamese-text" class="block text-lg font-semibold mb-2 text-gray-700">Bản dịch tiếng Việt</label>
                    <div class="relative">
                        <div id="vietnamese-text" style="white-space: pre-wrap; min-height: 358px;" class="w-full p-4 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-300"></div>
                     </div>
                </div>
            </div>

            <div class="text-center mt-6 flex justify-center items-center space-x-4">
                <button id="translate-button" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center">
                   <svg id="loader" class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-6 w-6 mr-3 hidden" viewBox="0 0 24 24"></svg>
                    <span id="button-text">Dịch văn bản</span>
                </button>
                <button id="copy-button" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Sao chép
                </button>
             </div>
        </main>

        <footer class="text-center mt-8 text-gray-500 text-sm">
			<div class="mt-8 bg-white p-6 rounded-2xl shadow-lg">
				<p class="text-center text-gray-700 italic leading-relaxed">
					🙏🙏🙏 Vì tâm nguyện con muốn hoằng dương Pháp Môn Tâm Linh, mang những lời dạy quý giá của Sư Phụ Lư Quân Hoành đến gần hơn với tất cả mọi người, con đã xây dựng ứng dụng này! Trong quá trình hoằng pháp nếu con có gì sai sót, không Đúng Lý Đúng Pháp, Con xin Chư Phật, Chư Bồ Tát, Chư Thần Hộ Pháp, Từ Bi tha thứ cho con.
				</p>
			</div>
        </footer>
    </div>
    
    <div id="toast" class="toast"></div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // DOM Elements
            const translateButton = document.getElementById('translate-button');
            const chineseTextArea = document.getElementById('chinese-text');
            const vietnameseOutputDiv = document.getElementById('vietnamese-text');
            const copyButton = document.getElementById('copy-button');
            const clearButton = document.getElementById('clear-button');
            const loader = document.getElementById('loader');
            const buttonText = document.getElementById('button-text');
            const toast = document.getElementById('toast');

            const showToast = (message) => {
                toast.textContent = message;
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
            };

            clearButton.addEventListener('click', () => {
                chineseTextArea.value = '';
                vietnameseOutputDiv.textContent = '';
                showToast('Đã xóa nội dung.');
            });
            
            translateButton.addEventListener('click', async () => {
                const chineseText = chineseTextArea.value.trim();

                if (!chineseText) {
                    showToast("Vui lòng nhập văn bản tiếng Trung.");
                    return;
                }
                
                loader.classList.remove('hidden');
                buttonText.textContent = 'Đang dịch...';
                translateButton.disabled = true;
                vietnameseOutputDiv.textContent = '';

                try {
                    const response = await fetch('/api/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chineseText: chineseText })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let fullText = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value, { stream: true });
                        
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const jsonStr = line.substring(6);
                                    const parsed = JSON.parse(jsonStr);
                                    const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                                    if (textPart) {
                                        fullText += textPart;
                                        vietnameseOutputDiv.textContent = fullText;
                                    }
                                } catch (e) {
                                    // Bỏ qua các dòng JSON không hoàn chỉnh
                                }
                            }
                        }
                    }

                } catch (error) {
                    console.error("Lỗi chi tiết khi dịch:", error);
                    vietnameseOutputDiv.textContent = `Đã xảy ra lỗi khi dịch. Vui lòng thử lại sau.\n\nChi tiết: ${error.message}`;
                    showToast("Đã có lỗi xảy ra. Vui lòng thử lại.");
                } finally {
                    loader.classList.add('hidden');
                    buttonText.textContent = 'Dịch văn bản';
                    translateButton.disabled = false;
                }
            });

            copyButton.addEventListener('click', () => {
                const chineseText = chineseTextArea.value.trim();
                const vietnameseText = vietnameseOutputDiv.textContent.trim();

                if (!chineseText && !vietnameseText) {
                    showToast("Không có nội dung để sao chép.");
                    return;
                }

                const textToCopy = `Bản gốc:\n${chineseText}\n\nBản dịch:\n${vietnameseText}`;
                
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast("Đã sao chép bản gốc và bản dịch!");
                }).catch(err => {
                    console.error('Không thể sao chép: ', err);
                    showToast("Lỗi! Không thể sao chép.");
                });
            });
        });
    </script>
</body>
</html>
