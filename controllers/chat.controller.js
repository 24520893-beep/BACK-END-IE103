require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Khởi tạo Gemini với API Key từ file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: "Bạn là Trợ lý AI học thuật của hệ thống HOCMOI.VN. Hãy trả lời ngắn gọn, thân thiện và tập trung vào hỗ trợ học tập, giải bài tập và tư vấn lộ trình học cho học sinh Việt Nam.",
});

exports.chatWithAI = async (req, res) => {
    const controller = new AbortController();

    // SỬA Ở ĐÂY: Chỉ ngắt AI khi Client thực sự chủ động ngắt (req.aborted = true)
    req.on('close', () => {
        if (req.aborted) {
            console.log("🔌 Trình duyệt đã hủy yêu cầu (Do bấm nút Dừng hoặc Reload). Đang dừng AI...");
            controller.abort();
        }
    });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: "Nội dung trống" });

        const result = await model.generateContent(message, { signal: controller.signal });
        const response = await result.response;
        
        // Trả về kết quả bình thường
        res.status(200).json({ reply: response.text() });

    } catch (error) {
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
            // Lỗi này do ta chủ động sập cầu dao, nên cứ im lặng bỏ qua, không cần báo lỗi đỏ
        } else {
            console.error("Lỗi AI Chat thật sự:", error);
            if (!res.headersSent) {
                res.status(500).json({ reply: "Hệ thống đang bận, ní thử lại sau nhé!" });
            }
        }
    }
};