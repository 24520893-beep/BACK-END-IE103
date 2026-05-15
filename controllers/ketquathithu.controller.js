const KetQuaThiThu = require('../models/KetQuaThiThu');
const DeThiThu = require('../models/DeThiThu'); 
const NguoiDung = require('../models/NguoiDung'); // Thêm NguoiDung để query Role thực tế

exports.getAll = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let query = {};

    if (currentUser.VaiTro === 'HocSinh') {
        query.MaHocSinh = currentUser._id;
    } 
    else if (currentUser.VaiTro === 'GiaoVien') {
        // Giáo viên chỉ được xem kết quả của những đề do chính mình tạo
        const myExams = await DeThiThu.find({ MaGVThietKe: currentUser._id }).select('_id');
        const myExamIds = myExams.map(exam => exam._id);
        query.MaDeThi = { $in: myExamIds };
    }

    if (req.query.studentId && currentUser.VaiTro !== 'HocSinh') {
        query.MaHocSinh = req.query.studentId;
    }
    if (req.query.examId) {
        query.MaDeThi = req.query.examId;
    }

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
  try {
      const item = await KetQuaThiThu.findById(req.params.id)
        .populate('MaDeThi')
        .populate('MaHocSinh', 'HoTen Email');
      if (!item) return res.status(404).json({ message: "Không tìm thấy kết quả" });
      res.json(item);
  } catch (error) {
      res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// ==============================================================
// THUẬT TOÁN CHẤM ĐIỂM TẠI BACK-END (BẢO MẬT & CHÍNH XÁC)
// ==============================================================
exports.create = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro !== 'HocSinh') {
        return res.status(403).json({ message: "Chỉ học sinh mới có thể nộp bài thi." });
    }

    const { MaDeThi, DanhGiaKienThuc, ChiTietBaiLam } = req.body;

    // 1. Tải đề thi gốc từ DB để lấy Đáp án chính xác
    const deThiGoc = await DeThiThu.findById(MaDeThi).populate('DanhSachCauHoi');
    if (!deThiGoc) return res.status(404).json({ message: "Không tìm thấy đề thi gốc" });

    // Tạo từ điển câu hỏi để tra cứu nhanh O(1)
    const tuDienCauHoi = {};
    deThiGoc.DanhSachCauHoi.forEach(q => tuDienCauHoi[q._id.toString()] = q);

    let correctCount = 0;
    let autoGradableCount = 0;
    const mangChiTietDaCham = [];

    // 2. Chấm điểm từng câu học sinh gửi lên
    if (ChiTietBaiLam && ChiTietBaiLam.length > 0) {
      for (const item of ChiTietBaiLam) {
        const cauHoiGoc = tuDienCauHoi[item.MaCauHoi.toString()];
        if (!cauHoiGoc) continue; // Bỏ qua nếu mã câu hỏi không tồn tại trong đề

        let isCorrect = false;
        const dapAnHocSinh = item.LuaChonCuaHocSinh || "";
        const dapAnChuan = cauHoiGoc.DapAnChinhXac || "";

        if (cauHoiGoc.LoaiCauHoi !== 'TuLuan') {
          autoGradableCount++;
        }

        // Logic so khớp đáp án
        if (cauHoiGoc.LoaiCauHoi === 'TracNghiem' || cauHoiGoc.LoaiCauHoi === 'DungSai') {
          // Trắc nghiệm (A/B/C/D) và Đúng/Sai (Đ-S-Đ-Đ): Khớp chuỗi tuyệt đối
          isCorrect = dapAnHocSinh.trim().toUpperCase() === dapAnChuan.trim().toUpperCase();
        } else if (cauHoiGoc.LoaiCauHoi === 'DienKhuyet') {
          // Điền khuyết: Không phân biệt hoa thường
          isCorrect = dapAnHocSinh.trim().toLowerCase() === dapAnChuan.trim().toLowerCase();
        }

        if (isCorrect) correctCount++;

        mangChiTietDaCham.push({
          MaCauHoi: item.MaCauHoi,
          LuaChonCuaHocSinh: dapAnHocSinh,
          KetQuaDungSai: isCorrect
        });
      }
    }

    // 3. TÍNH TOÁN VÀ LÀM TRÒN ĐIỂM SỐ CHUẨN XÁC
    let diemSo = 0;
    if (autoGradableCount > 0) {
        // Tính điểm thô trên thang 10
        const diemTho = (correctCount / autoGradableCount) * 10;
        
        // Làm tròn đến 2 chữ số thập phân an toàn bằng Math.round
        diemSo = Math.round(diemTho * 100) / 100;
    }

    // 4. Lưu vào Database (Sử dụng ID từ DB truy vấn thay vì token)
    const ketQuaData = {
      MaHocSinh: currentUser._id, 
      MaDeThi,
      DiemSo: diemSo, 
      ChiTietBaiLam: mangChiTietDaCham
    };

    if (DanhGiaKienThuc) ketQuaData.DanhGiaKienThuc = DanhGiaKienThuc;

    const newKetQua = new KetQuaThiThu(ketQuaData);
    await newKetQua.save();

    res.status(201).json(newKetQua);
  } catch (error) {
    res.status(400).json({ message: "Lỗi lưu kết quả thi", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
        // Học sinh không được phép sửa kết quả thi sau khi đã nộp
        return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Không cho phép sửa người làm bài hoặc đề thi
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
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro !== 'QuanTriVien') {
        return res.status(403).json({ message: "Chỉ Quản trị viên mới được xóa kết quả thi." });
    }

    await KetQuaThiThu.deleteById(req.params.id, currentUser._id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};