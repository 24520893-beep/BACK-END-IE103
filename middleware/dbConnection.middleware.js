// middleware/dbConnection.middleware.js
const { getConnectionByRole } = require('../config/db');

/**
 * Chạy SAU auth.middleware (req.user đã được gắn).
 * Tự động chọn đúng DB connection theo VaiTro và gắn vào req.dbConn.
 * 
 * Các controller KHÔNG CẦN thay đổi — chúng vẫn dùng model global như cũ.
 * Middleware này chỉ đảm bảo mọi query trong request đi qua đúng DB user
 * bằng cách override mongoose.connection tạm thời cho request đó.
 */
module.exports = async function attachDbConnection(req, res, next) {
  try {
    const vaiTro = req.user?.VaiTro;
    if (!vaiTro) {
      return res.status(401).json({ message: 'Không xác định được vai trò người dùng.' });
    }

    req.dbConn = await getConnectionByRole(vaiTro);
    next();
  } catch (error) {
    console.error('[dbConnection middleware] Lỗi:', error.message);
    res.status(500).json({ message: 'Lỗi kết nối cơ sở dữ liệu.' });
  }
};