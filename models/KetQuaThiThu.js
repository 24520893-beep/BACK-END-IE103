const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const ChiTietBaiLamSchema = new mongoose.Schema({
  MaCauHoi: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CauHoi',
    required: true 
  },
  LuaChonCuaHocSinh: { type: String }, 
  KetQuaDungSai: { type: Boolean, required: true },
  
  // Tinh gọn: Không dùng default. Chỉ lưu dữ liệu này khi là câu Tự Luận
  DiemDatDuoc: { type: Number } 
}, { _id: false });

const KetQuaThiThuSchema = new mongoose.Schema({
  MaHocSinh: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'NguoiDung',
    required: true 
  },
  MaDeThi: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DeThiThu',
    required: true 
  },

  DiemSo: { type: Number, required: true, min: 0 },
  DanhGiaKienThuc: { type: String, trim: true }, 
  ChiTietBaiLam: [ChiTietBaiLamSchema]
}, {
  collection: 'KETQUATHITHU',
  timestamps: { 
    createdAt: 'NgayTao', 
    updatedAt: 'NgayCapNhat' 
  }
});

KetQuaThiThuSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
  indexFields: 'all'
});

KetQuaThiThuSchema.path('deletedAt').options.name = 'NgayXoa';

module.exports = mongoose.model('KetQuaThiThu', KetQuaThiThuSchema);