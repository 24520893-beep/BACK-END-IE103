const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const multer = require('multer');

// 1. Cấu hình lưu file tạm vào RAM và giới hạn 5MB cho toàn bộ request
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn cứng 5 Megabytes
    }
});

// 2. Middleware bọc ngoài để bắt lỗi file quá lớn từ Multer và trả về JSON
router.post('/', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: "Dung lượng file quá lớn. Tối đa 5MB!" });
            }
            return res.status(400).json({ message: "Lỗi tải file: " + err.message });
        } else if (err) {
            return res.status(500).json({ message: "Lỗi hệ thống khi đọc file." });
        }
        next(); // Nếu không có lỗi, đi tiếp vào Controller
    });
}, chatController.chatWithAI);

module.exports = router;