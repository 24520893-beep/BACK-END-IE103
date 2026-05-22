const DeThiThu = require('../models/DeThiThu');
const NguoiDung = require('../models/NguoiDung'); // Bổ sung import model người dùng
const mongoose = require('mongoose');

// ==========================================
// THÙNG RÁC ĐỀ THI THỬ
// ==========================================

exports.getTrash = async (req, res) => {
    try {
        // BẢO MẬT: Kiểm tra thông tin thực tế từ DB
        const currentUser = await NguoiDung.findById(req.user._id);
        if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';

        let filter = { deleted: true };

        if (search) {
            filter.TenDeThi = { $regex: search, $options: 'i' };
        }

        // Quản trị viên xem tất cả, Giáo viên chỉ xem rác của mình
        if (currentUser.VaiTro !== 'QuanTriVien') {
            filter.MaGVThietKe = currentUser._id;
        }

        const totalItems = await DeThiThu.countDocumentsDeleted(filter);
        const items = await DeThiThu.findDeleted(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ NgayXoa: -1 });

        res.status(200).json({
            data: items,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
};

exports.restore = async (req, res) => {
    try {
        // BẢO MẬT: Kiểm tra thông tin thực tế từ DB
        const currentUser = await NguoiDung.findById(req.user._id);
        if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

        const { id } = req.params;

        const item = await DeThiThu.findOneDeleted({ _id: id });
        if (!item) return res.status(404).json({ message: "Không tìm thấy đề thi trong thùng rác." });

        if (currentUser.VaiTro !== 'QuanTriVien' && item.MaGVThietKe.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền khôi phục đề thi này." });
        }

        await item.restore();
        res.status(200).json({ message: "Khôi phục thành công." });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khôi phục", error: error.message });
    }
};

exports.forceDelete = async (req, res) => {
    try {
        // BẢO MẬT: Kiểm tra thông tin thực tế từ DB
        const currentUser = await NguoiDung.findById(req.user._id);
        if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

        const { id } = req.params;

        const item = await DeThiThu.findOneDeleted({ _id: id });
        if (!item) return res.status(404).json({ message: "Không tìm thấy đề thi trong thùng rác." });

        if (currentUser.VaiTro !== 'QuanTriVien' && item.MaGVThietKe.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền xóa vĩnh viễn đề thi này." });
        }

        await DeThiThu.deleteOne({ _id: id });
        res.status(200).json({ message: "Đã xóa vĩnh viễn đề thi." });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa dữ liệu", error: error.message });
    }
};

// ==========================================
// LẤY DANH SÁCH & CHI TIẾT ĐỀ THI
// ==========================================

exports.getAllExams = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra thông tin thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const currentUserId = new mongoose.Types.ObjectId(currentUser._id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; 
    
    // Nhận thêm tham số examType từ Front-end
    const { search, subject, status, examType } = req.query;

    let filter = { deleted: { $ne: true } };
    if (search) filter.TenDeThi = { $regex: search, $options: 'i' };

    // ========================================
    // LOGIC LỌC MỚI: PHÂN TÁCH THPT vs ĐGNL
    // ========================================
    if (examType === 'DGNL') {
        // Lọc các đề thi KHÔNG CÓ môn học
        filter.$or = [{ MonHoc: { $exists: false } }, { MonHoc: null }, { MonHoc: "" }];
    } else if (examType === 'THPT') {
        // Lọc các đề thi BẮT BUỘC CÓ môn học
        filter.MonHoc = { $exists: true, $ne: "", $ne: null };
        if (subject && subject !== 'Tất cả') {
            filter.MonHoc = subject; 
        }
    } else {
        // Trường hợp 'Tất cả', nếu có chọn cụ thể môn học thì lọc môn đó
        if (subject && subject !== 'Tất cả') {
            filter.MonHoc = subject;
        }
    }

    // ========================================
    // LOGIC PHÂN QUYỀN HIỂN THỊ
    // ========================================
    if (currentUser.VaiTro === 'HocSinh') {
        filter.TrangThai = { $in: ['Đã xuất bản', 'Hoàn thiện'] };
    } else {
        if (status && status !== 'Tất cả') {
            filter.TrangThai = (status === 'Hoàn thiện' || status === 'Đã xuất bản') ? { $in: ['Đã xuất bản', 'Hoàn thiện'] } : 
                              (status === 'Từ chối' || status === 'Đã từ chối') ? { $in: ['Đã từ chối', 'Từ chối'] } : status;
            
            if (currentUser.VaiTro !== 'QuanTriVien' || (status !== 'Đang kiểm duyệt' && status !== 'Chờ duyệt')) {
                // Bọc bằng $and để không đè thuộc tính $or của phần lọc DGNL bên trên
                filter = {
                    $and: [
                        filter,
                        { $or: [{ MaGVThietKe: currentUserId }, { MaNguoiKiemDuyet: currentUserId }] }
                    ]
                };
            }
        } else {
            filter = {
                $and: [
                    filter,
                    { $or: [{ TrangThai: { $in: ['Đã xuất bản', 'Hoàn thiện'] } }, { MaGVThietKe: currentUserId }] }
                ]
            };
        }
    }

    const totalItems = await DeThiThu.countDocuments(filter);

    const exams = await DeThiThu.aggregate([
      { $match: filter },
      {
        $addFields: {
          sortPriority: {
            $switch: {
              branches: [
                { case: { $in: ["$TrangThai", ["Đã từ chối", "Từ chối"]] }, then: 1 },
                { case: { $in: ["$TrangThai", ["Đang kiểm duyệt", "Chờ duyệt"]] }, then: 2 },
                { case: { $in: ["$TrangThai", ["Đã xuất bản", "Hoàn thiện"]] }, then: 3 }
              ],
              default: 4
            }
          },
          ownPriority: {
            $cond: { if: { $eq: ["$MaGVThietKe", currentUserId] }, then: 1, else: 2 }
          }
        }
      },
      // ƯU TIÊN: Của tôi lên trước -> Trạng thái (Lỗi > Chờ > Xong) -> Mới nhất
      { $sort: { ownPriority: 1, sortPriority: 1, NgayTao: -1 } },
      
      { $skip: (page - 1) * limit },
      { $limit: limit },

      {
        $lookup: {
          from: 'NGUOIDUNG',
          localField: 'MaGVThietKe',
          foreignField: '_id',
          as: 'MaGVThietKe'
        }
      },
      { $unwind: { path: "$MaGVThietKe", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'NHANDAN',
          localField: 'DanhSachNhanDan',
          foreignField: '_id',
          as: 'DanhSachNhanDan'
        }
      },
      { $project: { "MaGVThietKe.MatKhauDaMaHoa": 0, sortPriority: 0, ownPriority: 0 } }
    ]);

    res.json({
      data: exams,
      totalPages: Math.ceil(totalItems / limit),
      totalItems: totalItems,
      currentPage: page
    });

  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
        return res.status(403).json({ message: "Học sinh vui lòng sử dụng luồng truy cập đề thi riêng." });
    }

    const item = await DeThiThu.findById(req.params.id)
      .populate('DanhSachNhanDan', 'TenNhanDan GhiChu')
      .populate('MaGVThietKe', 'HoTen')
      .populate('DanhSachCauHoi'); // Trả về đầy đủ kể cả đáp án để giáo viên sửa
    
    if (!item) return res.status(404).json({ message: "Không tìm thấy đề thi" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// TẠO MỚI, CẬP NHẬT & XÓA MỀM
// ==========================================

exports.create = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra thông tin thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
        return res.status(403).json({ message: "Từ chối truy cập. Chỉ Giáo viên hoặc Quản trị viên mới được tạo đề thi." });
    }

    const { 
      TenDeThi, ThoiGianGioiHan, MonHoc, DanhSachNhanDan, DanhSachCauHoi 
    } = req.body;

    const deThiData = {
      TenDeThi,
      ThoiGianGioiHan,
      MaGVThietKe: currentUser._id // Ép cứng người tạo là người gửi Request
    };

    // LOGIC: NẾU LÀ THPT THÌ LƯU MÔN HỌC, NẾU ĐGNL THÌ BỎ QUA
    if (MonHoc && MonHoc.trim() !== "") {
        deThiData.MonHoc = MonHoc.trim();
    }

    if (DanhSachNhanDan && DanhSachNhanDan.length > 0) deThiData.DanhSachNhanDan = DanhSachNhanDan;
    if (DanhSachCauHoi && DanhSachCauHoi.length > 0) deThiData.DanhSachCauHoi = DanhSachCauHoi;

    const item = new DeThiThu(deThiData);
    await item.save();
    
    res.status(201).json(item);
  } catch (error) {
    console.error("Lỗi tạo đề thi:", error);
    res.status(400).json({ message: "Không thể tạo đề thi", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra thông tin thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
        return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const { id } = req.params;

    // Kiểm tra quyền sở hữu
    const existingItem = await DeThiThu.findById(id);
    if (!existingItem) return res.status(404).json({ message: "Không tìm thấy đề thi." });

    if (currentUser.VaiTro !== 'QuanTriVien' && existingItem.MaGVThietKe.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ message: "Bạn không có quyền sửa đề thi này." });
    }

    const updateData = { ...req.body };

    // Không cho phép sửa người tạo
    delete updateData.MaGVThietKe;

    const updateQuery = { $set: updateData };
    updateQuery.$unset = {};

    // LOGIC: Tự động GỠ BỎ trường MonHoc nếu người dùng chuyển loại đề sang ĐGNL
    if (updateData.MonHoc === "" || updateData.MonHoc === null) {
        delete updateQuery.$set.MonHoc;
        updateQuery.$unset.MonHoc = "";
    }

    // TỰ ĐỘNG GHI NHẬN NGƯỜI DUYỆT ĐỀ THI HOẶC XÓA KHI THU HỒI
    if (updateData.TrangThai) {
        if (['Hoàn thiện', 'Đã xuất bản', 'Đã từ chối', 'Từ chối'].includes(updateData.TrangThai)) {
            updateQuery.$set.MaNguoiKiemDuyet = currentUser._id;
        } else if (updateData.TrangThai === 'Đang kiểm duyệt') {
            updateQuery.$unset.MaNguoiKiemDuyet = "";
            delete updateQuery.$set.MaNguoiKiemDuyet;
        }
    }

    // Xóa object $unset nếu nó rỗng để tránh lỗi query MongoDB
    if (Object.keys(updateQuery.$unset).length === 0) {
        delete updateQuery.$unset;
    }

    const item = await DeThiThu.findByIdAndUpdate(
      id, 
      updateQuery, 
      { new: true, runValidators: true }
    );

    res.json(item);
  } catch (error) {
    res.status(400).json({ message: "Cập nhật thất bại", error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra thông tin thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
        return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const { id } = req.params;

    const existingItem = await DeThiThu.findById(id);
    if (!existingItem) return res.status(404).json({ message: "Không tìm thấy đề thi." });

    if (currentUser.VaiTro !== 'QuanTriVien' && existingItem.MaGVThietKe.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ message: "Bạn không có quyền xóa đề thi này." });
    }

    await DeThiThu.deleteById(id, currentUser._id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa", error: error.message });
  }
};