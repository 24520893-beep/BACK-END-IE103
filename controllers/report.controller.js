const mongoose = require('mongoose');
const NguoiDung = require('../models/NguoiDung'); // Để kiểm tra quyền

const getSecuredView = (viewName, requiresStudentId = false) => async (req, res) => {
  try {
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy người dùng." });

    const collection = mongoose.connection.db.collection(viewName);

    // Lấy query từ client gửi lên
    let query = req.query || {};

    // ==========================================
    // LOGIC ÉP QUYỀN BẢO MẬT THEO VIEW
    // ==========================================

    // Nếu đây là View chứa dữ liệu cá nhân của học sinh (VD: Sổ tay lỗi sai, Lỗ hổng kiến thức)
    if (requiresStudentId) {
      if (currentUser.VaiTro === 'HocSinh') {
        // Học sinh chỉ được xem dữ liệu của chính mình (Ép cứng MaHocSinh = ID người gọi)
        query.MaHocSinh = new mongoose.Types.ObjectId(currentUser._id);
      } else if (currentUser.VaiTro === 'GiaoVien' || currentUser.VaiTro === 'QuanTriVien') {
        // Giáo viên/Admin muốn xem thì phải truyền mã học sinh lên, nếu không truyền -> báo lỗi
        if (!query.MaHocSinh) {
          return res.status(400).json({ message: "Vui lòng chỉ định mã học sinh cần xem." });
        }
        query.MaHocSinh = new mongoose.Types.ObjectId(query.MaHocSinh);
      }
    }

    // Nếu là View kiểm duyệt học liệu (Chỉ Admin hoặc Moderator mới được xem)
    if (viewName === 'View_KiemDuyet_HocLieu' && currentUser.VaiTro === 'HocSinh') {
      return res.status(403).json({ message: "Từ chối truy cập." });
    }

    // Xóa các key phân trang ra khỏi query để tránh lỗi tìm kiếm của MongoDB
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    delete query.page;
    delete query.limit;

    // Truy vấn vào View
    const data = await collection.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.status(200).json(data);

  } catch (error) {
    console.error(`Lỗi trích xuất View ${viewName}:`, error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

exports.getChiTietDeThiChoHocSinh = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Tự động kéo dữ liệu từ View
    const collection = mongoose.connection.db.collection('View_ChiTietDeThi');

    // Lấy dữ liệu từ View (Đã được Pre-joined và ĐÃ ẨN SẴN ĐÁP ÁN TỪ DATABASE)
    const deThi = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });

    if (!deThi) return res.status(404).json({ message: "Đề thi không tồn tại hoặc chưa được xuất bản." });

    // Không cần vòng lặp filter đáp án nữa, trả thẳng về cho Client render tốc độ cao
    res.json(deThi);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải đề thi", error: error.message });
  }
};

exports.getBangXepHangThiThu = getSecuredView('View_BangXepHangThiThu');
exports.getPhoDiemThiThu = getSecuredView('View_PhoDiemThiThu');

// CÁC VIEW CÁ NHÂN HÓA (Bắt buộc phải check MaHocSinh để bảo mật)
// Truyền tham số thứ 2 là 'true'
exports.getPhanTichLoHongKienThuc = getSecuredView('View_PhanTichLoHongKienThuc', true);
exports.getSoTayLoiSai = getSecuredView('View_SoTayLoiSai', true);
// File: controllers/report.controller.js

exports.getReviewKetQuaChoHocSinh = async (req, res) => {
  try {
    const { id } = req.params; // ID của kết quả thi (MaKetQua)
    const currentUser = await NguoiDung.findById(req.user._id);
    
    const collection = mongoose.connection.db.collection('View_ChiTietKetQuaThiThu');

    // 1. Truy vấn tất cả các câu hỏi thuộc về mã kết quả này trong View
    // Lưu ý: Vì View dùng $unwind nên mỗi câu hỏi là 1 dòng, chúng ta dùng .find()
    const reviewData = await collection.find({ 
      MaKetQua: new mongoose.Types.ObjectId(id) 
    }).toArray();

    if (!reviewData || reviewData.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu bài làm." });
    }

    // 2. LOGIC BẢO MẬT: Chỉ chính chủ hoặc Admin mới được xem review chi tiết
    // (Lấy MaHocSinh từ dòng đầu tiên của kết quả review)
    if (currentUser.VaiTro === 'HocSinh' && reviewData[0].MaHocSinh?.toString() !== currentUser._id.toString()) {
       // Nếu trong View chưa có MaHocSinh, bạn nên cập nhật lại định nghĩa View để bổ sung trường này
       return res.status(403).json({ message: "Bạn không có quyền xem bài làm của người khác." });
    }

    // Trả về mảng các câu hỏi đã có đầy đủ nội dung và kết quả đúng/sai
    res.json(reviewData);
  } catch (error) {
    console.error("Lỗi khi lấy review bài làm:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};
exports.getTienDoNhiemVuHomNay = getSecuredView('View_TienDo_NhiemVu_HomNay', true);
exports.getPhanTichMucTieuThucTe = getSecuredView('View_PhanTichMucTieu_ThucTe', true);
exports.getCanhBaoHocSinh = getSecuredView('View_CanhBao_HocSinh', true);
