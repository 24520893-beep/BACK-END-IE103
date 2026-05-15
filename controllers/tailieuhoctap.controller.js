const TaiLieuHocTap = require('../models/TaiLieuHocTap');
const NguoiDung = require('../models/NguoiDung'); // Thêm NguoiDung để lấy vai trò thực tế
const mongoose = require('mongoose');

// ==========================================
// 1. CÁC HÀM XỬ LÝ THÙNG RÁC
// ==========================================

exports.getTrash = async (req, res) => {
    try {
        // BẢO MẬT: Kiểm tra vai trò thực tế
        const currentUser = await NguoiDung.findById(req.user._id);
        if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';

        let filter = { deleted: true };

        if (search) filter.TenTaiLieu = { $regex: search, $options: 'i' };

        // Phân quyền: Giáo viên chỉ xem rác của mình, Admin xem tất cả
        if (currentUser.VaiTro !== 'QuanTriVien') {
            filter.MaGVDangTai = currentUser._id;
        }

        const totalItems = await TaiLieuHocTap.countDocumentsDeleted(filter);
        const items = await TaiLieuHocTap.findDeleted(filter)
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
        // BẢO MẬT: Kiểm tra vai trò thực tế
        const currentUser = await NguoiDung.findById(req.user._id);
        if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

        const { id } = req.params;

        const item = await TaiLieuHocTap.findOneDeleted({ _id: id });
        if (!item) return res.status(404).json({ message: "Không tìm thấy dữ liệu trong thùng rác." });

        // Kiểm tra quyền 
        if (currentUser.VaiTro !== 'QuanTriVien' && item.MaGVDangTai.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền khôi phục mục này." });
        }

        await item.restore();
        res.status(200).json({ message: "Khôi phục thành công." });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khôi phục", error: error.message });
    }
};

exports.forceDelete = async (req, res) => {
    try {
        // BẢO MẬT: Kiểm tra vai trò thực tế
        const currentUser = await NguoiDung.findById(req.user._id);
        if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

        const { id } = req.params;

        const item = await TaiLieuHocTap.findOneDeleted({ _id: id });
        if (!item) return res.status(404).json({ message: "Không tìm thấy dữ liệu trong thùng rác." });

        // Kiểm tra quyền
        if (currentUser.VaiTro !== 'QuanTriVien' && item.MaGVDangTai.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền xóa vĩnh viễn mục này." });
        }

        await TaiLieuHocTap.deleteOne({ _id: id });
        res.status(200).json({ message: "Đã xóa vĩnh viễn." });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa dữ liệu", error: error.message });
    }
};

// ==========================================
// 2. CÁC HÀM XỬ LÝ DỮ LIỆU CHÍNH
// ==========================================

exports.getAll = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const currentUserId = new mongoose.Types.ObjectId(currentUser._id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const { search, format, tag, subject, status } = req.query;

    let filter = { deleted: { $ne: true } };
    if (search) filter.TenTaiLieu = { $regex: search, $options: 'i' };
    if (format && format !== 'Tất cả') filter.DinhDang = format;
    if (subject && subject !== 'Tất cả') filter.MonHoc = subject;

    // Logic phân quyền
    if (currentUser.VaiTro === 'HocSinh') {
      filter.TrangThai = { $in: ['Đã xuất bản', 'Hoàn thiện'] };
    } else {
      if (status && status !== 'Tất cả') {
        filter.TrangThai = (status === 'Hoàn thiện' || status === 'Đã xuất bản') ? { $in: ['Đã xuất bản', 'Hoàn thiện'] } :
          (status === 'Từ chối' || status === 'Đã từ chối') ? { $in: ['Đã từ chối', 'Từ chối'] } : status;
        
        if (currentUser.VaiTro !== 'QuanTriVien' || (status !== 'Đang kiểm duyệt' && status !== 'Chờ duyệt')) {
          filter.$or = [{ MaGVDangTai: currentUserId }, { MaNguoiKiemDuyet: currentUserId }];
        }
      } else {
        filter.$or = [{ TrangThai: { $in: ['Đã xuất bản', 'Hoàn thiện'] } }, { MaGVDangTai: currentUserId }];
      }
    }

    if (tag && tag !== 'Tất cả') {
      const NhanDan = require('../models/NhanDan');
      const foundTag = await NhanDan.findOne({ TenNhanDan: tag });
      filter.DanhSachNhanDan = foundTag ? foundTag._id : new mongoose.Types.ObjectId();
    }

    const totalItems = await TaiLieuHocTap.countDocuments(filter);

    const items = await TaiLieuHocTap.aggregate([
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
            $cond: { if: { $eq: ["$MaGVDangTai", currentUserId] }, then: 1, else: 2 }
          }
        }
      },
      // Sắp xếp theo "Của tôi" -> "Trạng thái ưu tiên" -> "Ngày mới nhất"
      { $sort: { ownPriority: 1, sortPriority: 1, NgayTao: -1 } },

      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'NGUOIDUNG',
          localField: 'MaGVDangTai',
          foreignField: '_id',
          as: 'MaGVDangTai'
        }
      },
      { $unwind: { path: "$MaGVDangTai", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'NHANDAN',
          localField: 'DanhSachNhanDan',
          foreignField: '_id',
          as: 'DanhSachNhanDan'
        }
      },
      { $project: { "MaGVDangTai.MatKhauDaMaHoa": 0, sortPriority: 0, ownPriority: 0 } }
    ]);

    res.json({ data: items, totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page });
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await TaiLieuHocTap.findById(req.params.id)
      .populate('DanhSachNhanDan', 'TenNhanDan')
      .populate('MaGVDangTai', 'HoTen');
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
        return res.status(403).json({ message: "Chỉ Giáo viên hoặc Quản trị viên mới được phép đăng tài liệu." });
    }

    const { TenTaiLieu, DinhDang, MonHoc, DanhSachNhanDan } = req.body;

    const docData = {
      TenTaiLieu,
      MaGVDangTai: currentUser._id, // Cố định bằng ID query từ DB
      DinhDang,
      MonHoc
    };

    if (req.file) {
      docData.DuongDan = req.file.path;
    }

    if (DanhSachNhanDan && typeof DanhSachNhanDan === 'string') {
      docData.DanhSachNhanDan = JSON.parse(DanhSachNhanDan);
    }

    const item = new TaiLieuHocTap(docData);
    await item.save();
    
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: "Lỗi đăng tải tài liệu", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
        return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const { id } = req.params;
    
    // BẢO MẬT: Kiểm tra tài liệu tồn tại và quyền sở hữu
    const existingItem = await TaiLieuHocTap.findById(id);
    if (!existingItem) return res.status(404).json({ message: "Tài liệu không tồn tại" });

    if (currentUser.VaiTro !== 'QuanTriVien' && existingItem.MaGVDangTai.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ message: "Bạn không có quyền sửa tài liệu này." });
    }

    const updateData = { ...req.body };
    delete updateData.MaGVDangTai; // Không cho phép đổi người đăng

    if (req.file) {
      updateData.DuongDan = req.file.path;
    }

    if (updateData.DanhSachNhanDan && typeof updateData.DanhSachNhanDan === 'string') {
      updateData.DanhSachNhanDan = JSON.parse(updateData.DanhSachNhanDan);
    }

    const updateQuery = { $set: updateData };

    // TỰ ĐỘNG GHI NHẬN NGƯỜI DUYỆT BÀI / TỪ CHỐI
    if (updateData.TrangThai) {
      if (['Hoàn thiện', 'Đã xuất bản', 'Đã từ chối', 'Từ chối'].includes(updateData.TrangThai)) {
        updateQuery.$set.MaNguoiKiemDuyet = currentUser._id;
      } else if (updateData.TrangThai === 'Đang kiểm duyệt') {
        updateQuery.$unset = { MaNguoiKiemDuyet: "" };
        delete updateQuery.$set.MaNguoiKiemDuyet;
      }
    }

    const item = await TaiLieuHocTap.findByIdAndUpdate(
      id,
      updateQuery,
      { new: true, runValidators: true }
    );

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
        return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const { id } = req.params;

    const existingItem = await TaiLieuHocTap.findById(id);
    if (!existingItem) return res.status(404).json({ message: "Tài liệu không tồn tại" });

    if (currentUser.VaiTro !== 'QuanTriVien' && existingItem.MaGVDangTai.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ message: "Bạn không có quyền xóa tài liệu này." });
    }

    // Soft delete
    await TaiLieuHocTap.deleteById(id, currentUser._id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};