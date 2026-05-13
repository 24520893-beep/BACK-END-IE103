const NguoiDung = require('../models/NguoiDung');
const TaiLieuHocTap = require('../models/TaiLieuHocTap');
const DeThiThu = require('../models/DeThiThu');
const CauHoi = require('../models/CauHoi');

exports.getTongQuan = async (req, res) => {
  try {
    const [hocSinh, giaoVien, taiLieu, deThi, cauHoi] = await Promise.all([
      NguoiDung.countDocuments({ VaiTro: 'HocSinh' }),
      NguoiDung.countDocuments({ VaiTro: 'GiaoVien' }),
      TaiLieuHocTap.countDocuments(),
      DeThiThu.countDocuments(),
      CauHoi.countDocuments()
    ]);

    res.json({ hocSinh, giaoVien, taiLieu, deThi, cauHoi });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi trích xuất thống kê', error: error.message });
  }
};