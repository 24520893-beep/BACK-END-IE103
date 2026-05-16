const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const NhiemVuSchema = new mongoose.Schema({
  LoaiNhiemVu: { 
    type: String, 
    enum: ['TaiLieuHocTap', 'DeThiThu'], 
    required: true 
  },
  MaThamChieu: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'DanhSachNhiemVu.LoaiNhiemVu',
    required: true
  },
  ThuTu: { type: Number } 
}, { _id: false });

const LichSuTienDoSchema = new mongoose.Schema({
  NgayGhiNhan: { type: Date, default: Date.now },
  MucDoHoanThanh: { type: Number }, 
  NhiemVuHoanThanh: { type: Number }
}, { _id: false });

const LoTrinhHocTapSchema = new mongoose.Schema({
  TenLoTrinh: { type: String, required: true, trim: true },
  MonHoc: { type: String, required: true },
  TrangThai: { type: String, default: "Đang kiểm duyệt" },
  
  // Tiến độ: Chỉ lưu khi bắt đầu có tiến trình (loại bỏ default 0 nếu muốn tối ưu tuyệt đối)
  MucDoHoanThanh: { type: Number, min: 0, max: 100 },
  GhiChu: { type: String, trim: true },

  MaHocSinh: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung', required: true }, 
  MaGVPhuTrach: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung', required: true },
  MaNguoiKiemDuyet: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' },

  // Mảng: Không để default [] để tránh chiếm dụng dung lượng khi chưa có dữ liệu
  DanhSachNhiemVu: [NhiemVuSchema],
  LichSuTienDo: [LichSuTienDoSchema]

}, {
  collection: 'LOTRINHHOCTAP',
  timestamps: { createdAt: 'NgayTao', updatedAt: 'NgayCapNhat' }
});

LoTrinhHocTapSchema.plugin(mongooseDelete, { deletedAt: true, deletedBy: true, overrideMethods: 'all' });
LoTrinhHocTapSchema.path('deletedAt').options.name = 'NgayXoa';

// Tạo một index tự động xóa bản ghi sau 30 ngày (2592000 giây) kể từ ngày NgayXoa
LoTrinhHocTapSchema.index(
  { NgayXoa: 1 }, 
  { expireAfterSeconds: 2592000, partialFilterExpression: { deleted: true } }
);

module.exports = mongoose.model('LoTrinhHocTap', LoTrinhHocTapSchema);