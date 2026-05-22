const LoTrinhHocTap = require('../models/LoTrinhHocTap');
const NguoiDung = require('../models/NguoiDung'); // Bổ sung NguoiDung để lấy VaiTro thực tế
const mongoose = require('mongoose');

// ==========================================
// THÙNG RÁC LỘ TRÌNH HỌC TẬP
// ==========================================

exports.getTrash = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';

    let filter = { deleted: true };

    // Tìm kiếm theo tên lộ trình
    if (search) {
      filter.TenLoTrinh = { $regex: search, $options: 'i' };
    }

    // Quản trị viên xem tất cả, Giáo viên chỉ xem rác của mình
    if (currentUser.VaiTro !== 'QuanTriVien') {
      filter.MaGVPhuTrach = currentUser._id;
    }

    const totalItems = await LoTrinhHocTap.countDocumentsDeleted(filter);
    const items = await LoTrinhHocTap.findDeleted(filter)
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
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const { id } = req.params;

    const item = await LoTrinhHocTap.findOneDeleted({ _id: id });
    if (!item) return res.status(404).json({ message: "Không tìm thấy lộ trình trong thùng rác." });

    // Kiểm tra quyền (Chỉ Admin hoặc người tạo ra lộ trình mới được khôi phục)
    if (currentUser.VaiTro !== 'QuanTriVien' && item.MaGVPhuTrach.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền khôi phục lộ trình này." });
    }

    await item.restore();
    res.status(200).json({ message: "Khôi phục thành công." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khôi phục", error: error.message });
  }
};

exports.forceDelete = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const { id } = req.params;

    const item = await LoTrinhHocTap.findOneDeleted({ _id: id });
    if (!item) return res.status(404).json({ message: "Không tìm thấy lộ trình trong thùng rác." });

    // Kiểm tra quyền (Chỉ Admin hoặc người tạo ra lộ trình mới được xóa vĩnh viễn)
    if (currentUser.VaiTro !== 'QuanTriVien' && item.MaGVPhuTrach.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xóa vĩnh viễn lộ trình này." });
    }

    // Xóa hoàn toàn khỏi Database
    await LoTrinhHocTap.deleteOne({ _id: id });
    res.status(200).json({ message: "Đã xóa vĩnh viễn lộ trình." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa dữ liệu", error: error.message });
  }
};

// ==========================================
// LẤY DANH SÁCH & CHI TIẾT
// ==========================================

exports.getAll = async (req, res) => {
  const scope = req.query.scope || 'moderation'; // mặc định giữ hành vi cũ cho QuanLyLoTrinh
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const currentUserId = new mongoose.Types.ObjectId(currentUser._id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';
    const status = req.query.status;

    let filter = { deleted: { $ne: true } };

    // LOGIC PHÂN QUYỀN HIỂN THỊ
    if (currentUser.VaiTro === 'HocSinh') {
      filter.MaHocSinh = currentUserId;
      filter.TrangThai = { $in: ['Đã xuất bản', 'Hoàn thiện'] };
    }
    else if (currentUser.VaiTro === 'GiaoVien') {
      filter.MaGVPhuTrach = currentUserId;
      if (status && status !== 'Tất cả') filter.TrangThai = status;
    }
    else if (currentUser.VaiTro === 'QuanTriVien') {

      // === TRANG LoTrinh: danh mục đã duyệt toàn hệ thống ===
      if (scope === 'catalog') {
        filter.TrangThai = { $in: ['Hoàn thiện', 'Đã xuất bản'] };
        // không set MaNguoiKiemDuyet
        // search vẫn áp dụng như hiện tại
      }

      // === TRANG QuanLyLoTrinh: logic kiểm duyệt như cũ ===
      else if (status === 'Đang kiểm duyệt') {
        filter.TrangThai = 'Đang kiểm duyệt';
      }
      else if (status === 'Hoàn thiện') {
        filter.TrangThai = 'Hoàn thiện';
        filter.MaNguoiKiemDuyet = currentUserId;
      }
      else if (status === 'Đã từ chối') {
        filter.TrangThai = 'Đã từ chối';
        filter.MaNguoiKiemDuyet = currentUserId;
      }
      else {
        filter.$or = [
          { TrangThai: 'Đang kiểm duyệt' },
          { MaNguoiKiemDuyet: currentUserId }
        ];
      }
    }

    if (search) filter.TenLoTrinh = { $regex: search, $options: 'i' };

    const totalItems = await LoTrinhHocTap.countDocuments(filter);

    const items = await LoTrinhHocTap.aggregate([
      { $match: filter },
      {
        $addFields: {
          sortPriority: {
            $switch: {
              branches: [
                { case: { $in: ["$TrangThai", ["Đã từ chối", "Từ chối"]] }, then: 1 },
                { case: { $in: ["$TrangThai", ["Đang kiểm duyệt", "Chờ duyệt"]] }, then: 2 },
                { case: { $and: [{ $in: ["$TrangThai", ["Đã xuất bản", "Hoàn thiện"]] }, { $lt: ["$MucDoHoanThanh", 100] }] }, then: 3 },
                { case: { $and: [{ $in: ["$TrangThai", ["Đã xuất bản", "Hoàn thiện"]] }, { $eq: ["$MucDoHoanThanh", 100] }] }, then: 4 }
              ],
              default: 5
            }
          },
          ownPriority: {
            $cond: { if: { $eq: ["$MaGVPhuTrach", currentUserId] }, then: 1, else: 2 }
          }
        }
      },
      // SẮP XẾP: Của tôi -> Trạng thái ưu tiên -> Mới nhất
      { $sort: { ownPriority: 1, sortPriority: 1, NgayTao: -1 } },

      { $skip: (page - 1) * limit },
      { $limit: limit },

      { $lookup: { from: 'NGUOIDUNG', localField: 'MaGVPhuTrach', foreignField: '_id', as: 'MaGVPhuTrach' } },
      { $unwind: { path: "$MaGVPhuTrach", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'NGUOIDUNG', localField: 'MaHocSinh', foreignField: '_id', as: 'MaHocSinh' } },
      { $unwind: { path: "$MaHocSinh", preserveNullAndEmptyArrays: true } },

      { $project: { "MaGVPhuTrach.MatKhauDaMaHoa": 0, "MaHocSinh.MatKhauDaMaHoa": 0, sortPriority: 0, ownPriority: 0 } }
    ]);

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

exports.getById = async (req, res) => {
  try {
    const item = await LoTrinhHocTap.findById(req.params.id)
      .populate('MaGVPhuTrach', 'HoTen')
      .populate('MaHocSinh', 'HoTen')
      .populate({
        path: 'DanhSachNhiemVu.MaThamChieu',
        select: 'TenTaiLieu TenDeThi'
      });

    if (!item) return res.status(404).json({ message: "Không tìm thấy lộ trình." });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// TẠO MỚI, CẬP NHẬT, XÓA MỀM
// ==========================================

exports.create = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
      return res.status(403).json({ message: "Từ chối truy cập. Chỉ Giáo viên hoặc Quản trị viên mới được tạo lộ trình." });
    }

    const { TenLoTrinh, MonHoc, MaHocSinh, DanhSachNhiemVu, GhiChu } = req.body;

    if (!MaHocSinh || !DanhSachNhiemVu?.length) {
      return res.status(400).json({ message: "Thiếu thông tin Học sinh hoặc Danh sách nhiệm vụ." });
    }

    const danhSachNhiemVuChuan = DanhSachNhiemVu.map(comp => ({
      LoaiNhiemVu: comp.LoaiNhiemVu === 'DeThi' || comp.LoaiNhiemVu === 'DeThiThu' ? 'DeThiThu' : 'TaiLieuHocTap',
      MaThamChieu: comp.MaThamChieu,
      ThuTu: comp.ThuTu
    }));

    const newRoadmap = new LoTrinhHocTap({
      TenLoTrinh,
      MonHoc,
      MaHocSinh,
      MaGVPhuTrach: currentUser._id, // Ép cứng người tạo từ DB
      DanhSachNhiemVu: danhSachNhiemVuChuan,
      TrangThai: 'Đang kiểm duyệt',
      GhiChu: GhiChu?.trim() || ""
    });

    await newRoadmap.save();
    res.status(201).json({ message: `Đã tạo lộ trình thành công.`, data: newRoadmap });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi tạo lộ trình", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // BẢO MẬT: Lấy người dùng thực tế
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy người dùng." });

    const { id } = req.params;
    const existingItem = await LoTrinhHocTap.findById(id);

    if (!existingItem) return res.status(404).json({ message: "Không tìm thấy lộ trình" });

    let updateData = { ...req.body };

    // TÁCH QUYỀN SỬA ĐỔI RÕ RÀNG
    if (currentUser.VaiTro === 'HocSinh') {
  if (existingItem.MaHocSinh.toString() !== currentUser._id.toString()) {
    return res.status(403).json({ message: "Bạn không có quyền cập nhật lộ trình này." });
  }

  updateData = {
    MucDoHoanThanh: req.body.MucDoHoanThanh,
    NhiemVuHoanThanh: req.body.NhiemVuHoanThanh
  };

  // Xác định tiến độ hiện tại từ LichSuTienDo cuối (source of truth)
  const lastEntry = existingItem.LichSuTienDo?.at(-1);
  const currentDone = lastEntry?.NhiemVuHoanThanh ?? existingItem.NhiemVuHoanThanh ?? 0;
  const currentPct  = lastEntry?.MucDoHoanThanh  ?? existingItem.MucDoHoanThanh  ?? 0;

  if (
    (updateData.NhiemVuHoanThanh !== undefined && updateData.NhiemVuHoanThanh < currentDone) ||
    (updateData.MucDoHoanThanh   !== undefined && updateData.MucDoHoanThanh   < currentPct)
  ) {
    return res.status(400).json({
      message: "Tiến độ không thể giảm xuống thấp hơn giá trị hiện tại."
    });
  }
}
 else {
      // Giáo viên / Quản trị viên
      if (currentUser.VaiTro !== 'QuanTriVien' && existingItem.MaGVPhuTrach.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ message: "Bạn không có quyền sửa lộ trình này." });
      }

      // Cập nhật lại nhiệm vụ nếu có gửi lên
      if (updateData.DanhSachNhiemVu) {
        updateData.DanhSachNhiemVu = updateData.DanhSachNhiemVu.map(comp => ({
          LoaiNhiemVu: comp.LoaiNhiemVu === 'DeThiThu' || comp.LoaiNhiemVu === 'DeThi' ? 'DeThiThu' : 'TaiLieuHocTap',
          MaThamChieu: comp.MaThamChieu,
          ThuTu: comp.ThuTu
        }));
      }

      // Không cho đổi người phụ trách
      delete updateData.MaGVPhuTrach;
    }

    const updateQuery = { $set: updateData };
    const unsetFields = {};

    // GHI NHẬN NGƯỜI DUYỆT (Chỉ dành cho Quản trị viên/Giáo viên)
    if (updateData.TrangThai && currentUser.VaiTro !== 'HocSinh') {
      if (['Hoàn thiện', 'Đã xuất bản', 'Đã từ chối', 'Từ chối'].includes(updateData.TrangThai)) {
        updateQuery.$set.MaNguoiKiemDuyet = currentUser._id;
      } else if (updateData.TrangThai === 'Đang kiểm duyệt') {
        unsetFields.MaNguoiKiemDuyet = "";
        delete updateQuery.$set.MaNguoiKiemDuyet;
      }
    }

    // LƯU LỊCH SỬ TIẾN ĐỘ VÀO MẢNG
    if (updateData.MucDoHoanThanh !== undefined) {
      updateQuery.$push = {
        LichSuTienDo: {
          NgayGhiNhan: new Date(),
          MucDoHoanThanh: updateData.MucDoHoanThanh,
          NhiemVuHoanThanh: updateData.NhiemVuHoanThanh || 0
        }
      };
    }

    const finalUpdateQuery = Object.keys(unsetFields).length > 0
      ? { ...updateQuery, $unset: unsetFields }
      : updateQuery;

    const item = await LoTrinhHocTap.findByIdAndUpdate(id, finalUpdateQuery, { new: true, runValidators: true });

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò từ DB
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
      return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const existingItem = await LoTrinhHocTap.findById(req.params.id);
    if (!existingItem) return res.status(404).json({ message: "Không tìm thấy lộ trình." });

    if (currentUser.VaiTro !== 'QuanTriVien' && existingItem.MaGVPhuTrach.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xóa lộ trình này." });
    }

    await LoTrinhHocTap.deleteById(req.params.id, currentUser._id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// API PUBLIC LẤY LỘ TRÌNH TIÊU BIỂU CHO TRANG CHỦ
// ==========================================
exports.getPublicFeatured = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    // Lọc: Không bị xóa, Không có mã học sinh (Lộ trình chung), Trạng thái Đã xuất bản/Hoàn thiện
    const filter = {
      deleted: { $ne: true },
      $or: [{ MaHocSinh: { $exists: false } }, { MaHocSinh: null }],
      TrangThai: { $in: ['Đã xuất bản', 'Hoàn thiện'] }
    };

    const items = await LoTrinhHocTap.find(filter)
      .populate('MaGVPhuTrach', 'HoTen') // Lấy tên giáo viên thiết kế
      .sort({ NgayTao: -1 }) // Ưu tiên mới nhất
      .limit(limit);

    res.status(200).json({ data: items });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi lấy lộ trình tiêu biểu", error: error.message });
  }
};