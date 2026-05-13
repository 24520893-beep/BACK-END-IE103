const KetQuaThiThu = require('../models/KetQuaThiThu');

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const studentId = req.query.studentId;
    const examId = req.query.examId;

    let query = {};
    if (studentId) query.MaHocSinh = studentId;
    if (examId) query.MaDeThi = examId;

    const [totalItems, items] = await Promise.all([
      KetQuaThiThu.countDocuments(query),
      KetQuaThiThu.find(query)
        .populate('MaDeThi', 'TenDeThi MonHoc')
        .populate('MaHocSinh', 'HoTen Email')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ NgayTao: -1 })
    ]);

    res.json({
      data: items,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi trích xuất kết quả", error: error.message });
  }
};

exports.getById = async (req, res) => {
  const item = await KetQuaThiThu.findById(req.params.id);
  res.json(item);
};

exports.create = async (req, res) => {
  try {
    const { MaDeThi, DiemSo, DanhGiaKienThuc, ChiTietBaiLam } = req.body;

    // 1. Xây dựng object dữ liệu động
    const ketQuaData = {
      MaHocSinh: req.user?._id, // Lấy ID học sinh trực tiếp từ token
      MaDeThi,
      DiemSo
    };

    // 2. Chỉ thêm các trường nếu có dữ liệu thực tế
    if (DanhGiaKienThuc) ketQuaData.DanhGiaKienThuc = DanhGiaKienThuc;
    
    if (ChiTietBaiLam && ChiTietBaiLam.length > 0) {
      ketQuaData.ChiTietBaiLam = ChiTietBaiLam;
    }

    const item = new KetQuaThiThu(ketQuaData);
    await item.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: "Lỗi lưu kết quả thi", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Không cho phép thay đổi đối tượng dự thi và đề thi gốc qua hàm update thông thường
    delete updateData.MaHocSinh;
    delete updateData.MaDeThi;

    const item = await KetQuaThiThu.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ message: "Không tìm thấy bản ghi" });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  await KetQuaThiThu.deleteById(req.params.id, req.user._id);
  res.json({ message: 'Deleted' });
};
