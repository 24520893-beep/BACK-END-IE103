const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const ChiTietBaiLamSchema = new mongoose.Schema({
  MaCauHoi: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CauHoi',
    required: true 
  },
  LuaChonCuaHocSinh: { type: String }, 
  KetQuaDungSai: { type: Boolean, required: true } // Yêu cầu xác định rõ đúng hay sai
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
  
  // Loại bỏ default: "" để tiết kiệm dung lượng nếu chưa có nhận xét
  DanhGiaKienThuc: { type: String, trim: true }, 

  // Mảng chi tiết chỉ tồn tại nếu có dữ liệu
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