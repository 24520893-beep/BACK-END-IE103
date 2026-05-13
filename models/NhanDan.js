const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

const NhanDanSchema = new mongoose.Schema({
  // Tên nhãn dán: Bắt buộc, duy nhất, tự động xóa khoảng trắng đầu cuối
  TenNhanDan: { 
    type: String, 
    required: true,
    unique: true, 
    trim: true 
  },
  
  // Ghi chú: Loại bỏ default "" để tối ưu dung lượng
  GhiChu: { 
    type: String,
    trim: true
  }
}, { 
  collection: 'NHANDAN', 
  timestamps: { 
    createdAt: 'NgayTao', 
    updatedAt: 'NgayCapNhat' 
  } 
});

NhanDanSchema.plugin(mongooseDelete, { 
  deletedAt: true, 
  deletedBy: true, 
  overrideMethods: 'all', 
  indexFields: 'all'
});

NhanDanSchema.path('deletedAt').options.name = 'NgayXoa';

module.exports = mongoose.model('NhanDan', NhanDanSchema);