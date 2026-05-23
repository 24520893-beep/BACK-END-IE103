// config/db.js
const mongoose = require('mongoose');

const connections = {};

const DB_URIS = {
  QuanTriVien: process.env.MONGO_URI_QUANTRIVIEN,
  GiaoVien:    process.env.MONGO_URI_GIAOVIEN,
  HocSinh:     process.env.MONGO_URI_HOCSINH,
};

async function getConnectionByRole(vaiTro) {
  const key = DB_URIS[vaiTro] ? vaiTro : null;
  if (!key) throw new Error(`Không tìm thấy URI cho vai trò: ${vaiTro}`);

  if (connections[key] && connections[key].readyState === 1) {
    return connections[key];
  }

  console.log(`[DB] Khởi tạo connection mới cho vai trò: ${key}`);
  const conn = await mongoose.createConnection(DB_URIS[key]).asPromise();
  connections[key] = conn;
  return conn;
}

async function connectDB() {
  try {
    // ✅ Giữ lại mongoose.connect() cho default connection
    // Dùng URI QuanTriVien làm default vì login/signup cần full quyền đọc NGUOIDUNG
    await mongoose.connect(process.env.MONGO_URI_QUANTRIVIEN);
    console.log('[DB] ✅ Default connection (QuanTriVien) sẵn sàng');

    // Khởi tạo thêm 2 connection riêng cho GiaoVien và HocSinh
    await Promise.all([
      getConnectionByRole('GiaoVien'),
      getConnectionByRole('HocSinh'),
    ]);

    // Cache luôn QuanTriVien = default connection để tái sử dụng qua getConnectionByRole
    connections['QuanTriVien'] = mongoose.connection;

    console.log('[DB] ✅ Tất cả 3 connection đã sẵn sàng (QuanTriVien, GiaoVien, HocSinh)');
  } catch (err) {
    console.error('[DB] ❌ Lỗi kết nối:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB, getConnectionByRole };