require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: "Bạn là Trợ lý AI học thuật của hệ thống HOCMOI.VN. Hãy trả lời ngắn gọn, thân thiện và tập trung vào hỗ trợ học tập, giải bài tập và tư vấn lộ trình học cho học sinh Việt Nam. Trả lời bằng Markdown.",
});

exports.chatWithAI = async (req, res) => {
    const controller = new AbortController();

    req.on('close', () => {
        if (req.aborted) {
            console.log("🔌 Trình duyệt đã hủy yêu cầu. Đang dừng AI...");
            controller.abort();
        }
    });

    try {
        const { message } = req.body;
        const file = req.file;

        if (!message && !file) {
            return res.status(400).json({ message: "Nội dung trống" });
        }

        const parts = [];
        if (message) parts.push({ text: message });
        
        if (file) {
            // TỐI ƯU HÓA: Kiểm tra chi tiết kích thước theo loại file
            if (file.mimetype.startsWith('image/') && file.size > 4 * 1024 * 1024) {
                return res.status(400).json({ message: "Dung lượng ảnh vượt quá 4MB." });
            }
            if (file.mimetype.startsWith('audio/') && file.size > 5 * 1024 * 1024) {
                return res.status(400).json({ message: "Dung lượng file ghi âm vượt quá 5MB." });
            }

            parts.push({
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: file.mimetype
                }
            });
        }

        let response;
        let retries = 3;
        while (retries > 0) {
            try {
                const result = await model.generateContent(parts, { signal: controller.signal });
                response = await result.response;
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                console.log(`AI quá tải, đang thử lại... còn ${retries} lần.`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        res.status(200).json({ reply: response.text() });

    } catch (error) {
        if (error.name === 'AbortError' || error.message.includes('aborted')) return;
        
        console.error("Lỗi AI Chat:", error);
        if (!res.headersSent) {
            // Phân biệt lỗi 400 (bị chặn bởi code) và lỗi 500
            res.status(500).json({ reply: "Hệ thống đang bận, ní thử lại sau nhé!" });
        }
    }
};