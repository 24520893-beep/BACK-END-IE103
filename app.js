require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
// Thay thế đoạn cấu hình cors cũ trong app.js bằng đoạn này:
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Thêm OPTIONS
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Bypass-Tunnel-Reminder',     // Cho phép header từ Front-end đi qua
        'ngrok-skip-browser-warning'  // Dự phòng nếu dùng ngrok
    ]
}));

app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.send('🚀 Server HOCMOI đang chạy ổn định trên Internet!');
});
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/nguoidung', require('./routes/nguoidung.routes'));
app.use('/api/cauhoi', require('./routes/cauhoi.routes'));
app.use('/api/tailieuhoctap', require('./routes/tailieuhoctap.routes'));
app.use('/api/dethithu', require('./routes/dethithu.routes'));
app.use('/api/ketquathithu', require('./routes/ketquathithu.routes'));
app.use('/api/lotrinhhoctap', require('./routes/lotrinhhoctap.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/thongke', require('./routes/thongke.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/nhandan', require('./routes/nhandan.routes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
