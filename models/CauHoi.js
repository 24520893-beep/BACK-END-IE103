const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const CauHoiSchema = new mongoose.Schema({
  LoaiCauHoi: { 
    type: String, 
    required: true,
    enum: ['TracNghiem', 'DungSai', 'DienKhuyet', 'TuLuan'] 
  },
  TrangThai: { type: String, default: "Đang kiểm duyệt" },
  NoiDungCauHoi: { type: String, required: true },
  MonHoc: { type: String },
  ChuyenDe: { type: String },
  DoKho: { type: String },
  
  MaGVBienSoan: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' },
  MaNguoiKiemDuyet: { type: mongoose.Schema.Types.ObjectId, ref: 'NguoiDung' },
  
  // Các trường đặc thù (Loại bỏ default để tối ưu dung lượng)
  DanhSachLuaChon: [{ type: String }], 
  DapAnChinhXac: { type: String },     
  DapAnGoiY: { type: String }          
}, {
  collection: 'CAUHOI',
  timestamps: { createdAt: 'NgayTao', updatedAt: 'NgayCapNhat' }
});

CauHoiSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: 'all',
  indexFields: 'all'
});

CauHoiSchema.path('deletedAt').options.name = 'NgayXoa';

module.exports = mongoose.model('CauHoi', CauHoiSchema);