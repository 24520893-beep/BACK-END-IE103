const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const DeThiThuSchema = new mongoose.Schema({
  TenDeThi: { type: String, required: true, trim: true },
  ThoiGianGioiHan: { type: Number, required: true }, 
  MonHoc: { type: String, required: true },
  
  TrangThai: { 
    type: String, 
    default: "Đang kiểm duyệt" 
  },

  // Tham chiếu người dùng
  MaGVThietKe: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'NguoiDung',
    required: true 
  },
  MaNguoiKiemDuyet: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'NguoiDung' 
  },

  // Loại bỏ default: [] để tránh chiếm dụng không gian khi chưa có nhãn/câu hỏi
  DanhSachNhanDan: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NhanDan'
  }],

  DanhSachCauHoi: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CauHoi' 
  }]
}, {
  collection: 'DETHITHU',
  timestamps: { createdAt: 'NgayTao', updatedAt: 'NgayCapNhat' }
});

DeThiThuSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
  indexFields: 'all'
});

DeThiThuSchema.path('deletedAt').options.name = 'NgayXoa';

module.exports = mongoose.model('DeThiThu', DeThiThuSchema);