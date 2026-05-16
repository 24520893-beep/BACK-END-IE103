const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const TaiLieuHocTapSchema = new mongoose.Schema({
  // Tên tài liệu: Bắt buộc, xóa khoảng trắng thừa
  TenTaiLieu: { type: String, required: true, trim: true },
  
  TrangThai: { 
    type: String, 
    default: "Đang kiểm duyệt" 
  },

  // Loại bỏ default để tiết kiệm dung lượng
  DinhDang: { type: String, trim: true }, // PDF, Video, MP3...
  DuongDan: { type: String, trim: true }, // URL đến tệp tin
  MonHoc: { type: String, trim: true },   // Toán, Lý, Hóa...

  // Tham chiếu người dùng
  MaGVDangTai: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'NguoiDung',
    required: true 
  },
  MaNguoiKiemDuyet: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'NguoiDung' 
  },

  // Mảng tham chiếu nhãn dán: Chỉ tồn tại khi có tag
  DanhSachNhanDan: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NhanDan'
  }]
}, {
  collection: 'TAILIEUHOCTAP',
  timestamps: { 
    createdAt: 'NgayTao', 
    updatedAt: 'NgayCapNhat' 
  }
});

TaiLieuHocTapSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
  indexFields: 'all'
});

TaiLieuHocTapSchema.path('deletedAt').options.name = 'NgayXoa';

// Tạo một index tự động xóa bản ghi sau 30 ngày (2592000 giây) kể từ ngày NgayXoa
TaiLieuHocTapSchema.index(
  { NgayXoa: 1 }, 
  { expireAfterSeconds: 2592000, partialFilterExpression: { deleted: true } }
);
 
module.exports = mongoose.model('TaiLieuHocTap', TaiLieuHocTapSchema);