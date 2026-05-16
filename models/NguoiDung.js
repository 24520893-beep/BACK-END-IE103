const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const NguoiDungSchema = new mongoose.Schema({
  HoTen: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  MatKhauDaMaHoa: { type: String, required: true },
  VaiTro: { 
    type: String, 
    enum: ['HocSinh', 'GiaoVien', 'QuanTriVien'], 
    required: true 
  },

  Avatar: { 
    type: String, 
    default: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" // Có thể để link ảnh mặc định tạm thời hoặc để chuỗi rỗng ""
  },

  // Loại bỏ default để trường này không tồn tại nếu không có dữ liệu
  MonHoc: { type: String }, 

  // Thuộc tính dành riêng cho 'HocSinh'
  KhoiThi: { type: String },
  DiemKyVong: { type: Number },
  TruongKyVong: { type: String }

}, { 
  collection: 'NGUOIDUNG',
  timestamps: { createdAt: 'NgayTao', updatedAt: 'NgayCapNhat' } 
});

// Cấu hình Plugin Xóa mềm (Soft Delete)
NguoiDungSchema.plugin(mongooseDelete, { 
  deletedAt: true, 
  deletedBy: true, 
  overrideMethods: 'all', 
  indexFields: 'all'
});

// Đổi tên trường deletedAt mặc định thành NgayXoa để đồng bộ hệ thống
NguoiDungSchema.path('deletedAt').options.name = 'NgayXoa';

// Tạo một index tự động xóa bản ghi người dùng sau 30 ngày (2592000 giây) kể từ ngày bị xóa mềm
NguoiDungSchema.index(
  { NgayXoa: 1 }, 
  { expireAfterSeconds: 2592000, partialFilterExpression: { deleted: true } }
);

module.exports = mongoose.model('NguoiDung', NguoiDungSchema);