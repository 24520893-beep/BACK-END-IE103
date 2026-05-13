const LoTrinhHocTap = require('../models/LoTrinhHocTap');
const mongoose = require('mongoose');

exports.getTrash = async (req, res) => {
    try {
        const currentUser = req.user;
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
        const currentUser = req.user;
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
        const currentUser = req.user;
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

exports.getAll = async (req, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const currentUserId = new mongoose.Types.ObjectId(currentUser._id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';
    const status = req.query.status;

    let filter = { deleted: { $ne: true } };

    // ==========================================
    // LOGIC PHÂN QUYỀN HIỂN THỊ (BẢN VÁ MỚI)
    // ==========================================
    if (currentUser.VaiTro === 'HocSinh') {
        // Học sinh: Chỉ thấy lộ trình mình được gán và đã xuất bản
        filter.MaHocSinh = currentUserId;
        filter.TrangThai = { $in: ['Đã xuất bản', 'Hoàn thiện'] };
    } 
    else if (currentUser.VaiTro === 'GiaoVien') {
        // Giáo viên: Chỉ thấy lộ trình do chính mình tạo
        filter.MaGVPhuTrach = currentUserId;
        if (status && status !== 'Tất cả') filter.TrangThai = status;
    }
    else if (currentUser.VaiTro === 'QuanTriVien') {
        // Quản trị viên: Thấy bài mình tạo HOẶC tất cả bài đã Hoàn thiện của người khác
        filter.$or = [
            { MaGVPhuTrach: currentUserId },
            { TrangThai: { $in: ['Đã xuất bản', 'Hoàn thiện'] } }
        ];
        if (status && status !== 'Tất cả') filter.TrangThai = status;
    }

    if (search) filter.TenLoTrinh = { $regex: search, $options: 'i' };

    const totalItems = await LoTrinhHocTap.countDocuments(filter);

    const items = await LoTrinhHocTap.aggregate([
      { $match: filter },
      {
        $addFields: {
          // Quy tắc trạng thái: Từ chối(1) -> Chờ duyệt(2) -> Hoàn thiện chưa xong(3) -> Xong(4)
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
          // Ưu tiên "Của tôi"
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
  const item = await LoTrinhHocTap.findById(req.params.id)
        .populate('MaGVPhuTrach', 'HoTen')
        .populate('MaHocSinh', 'HoTen'); 
  res.json(item);
};

exports.create = async (req, res) => {
  try {
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
      MaGVPhuTrach: req.user._id,
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
    const { id } = req.params;
    const updateData = { ...req.body };
    
    if (updateData.DanhSachNhiemVu) {
      updateData.DanhSachNhiemVu = updateData.DanhSachNhiemVu.map(comp => ({
          LoaiNhiemVu: comp.LoaiNhiemVu === 'DeThiThu' || comp.LoaiNhiemVu === 'DeThi' ? 'DeThiThu' : 'TaiLieuHocTap', 
          MaThamChieu: comp.MaThamChieu,
          ThuTu: comp.ThuTu
      }));
    }

    const updateQuery = { $set: updateData };
    const unsetFields = {};

    // TỰ ĐỘNG GHI NHẬN NGƯỜI DUYỆT LỘ TRÌNH HOẶC XÓA KHI THU HỒI
    if (updateData.TrangThai) {
        if (['Hoàn thiện', 'Đã xuất bản', 'Đã từ chối', 'Từ chối'].includes(updateData.TrangThai)) {
            updateQuery.$set.MaNguoiKiemDuyet = req.user._id;
        } else if (updateData.TrangThai === 'Đang kiểm duyệt') {
            unsetFields.MaNguoiKiemDuyet = "";
            delete updateQuery.$set.MaNguoiKiemDuyet;
        }
    }

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
    if (!item) return res.status(404).json({ message: "Không tìm thấy lộ trình" });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await LoTrinhHocTap.deleteById(req.params.id, req.user._id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};