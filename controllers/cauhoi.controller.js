const CauHoi = require('../models/CauHoi');
const mongoose = require('mongoose');

// ... (Các phần import giữ nguyên)
exports.getTrash = async (req, res) => {
    try {
        const currentUser = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';

        let filter = { deleted: true };

        if (search) {
            filter.NoiDungCauHoi = { $regex: search, $options: 'i' };
        }

        // Quản trị viên xem tất cả, Giáo viên chỉ xem rác của mình
        if (currentUser.VaiTro !== 'QuanTriVien') {
            filter.MaGVBienSoan = currentUser._id;
        }

        const totalItems = await CauHoi.countDocumentsDeleted(filter);
        const items = await CauHoi.findDeleted(filter)
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

        const item = await CauHoi.findOneDeleted({ _id: id });
        if (!item) return res.status(404).json({ message: "Không tìm thấy câu hỏi trong thùng rác." });

        if (currentUser.VaiTro !== 'QuanTriVien' && item.MaGVBienSoan.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền khôi phục câu hỏi này." });
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

        const item = await CauHoi.findOneDeleted({ _id: id });
        if (!item) return res.status(404).json({ message: "Không tìm thấy câu hỏi trong thùng rác." });

        if (currentUser.VaiTro !== 'QuanTriVien' && item.MaGVBienSoan.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền xóa vĩnh viễn câu hỏi này." });
        }

        await CauHoi.deleteOne({ _id: id });
        res.status(200).json({ message: "Đã xóa vĩnh viễn câu hỏi." });
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
    const limit = parseInt(req.query.limit) || 9;
    const { search, type, difficulty, status } = req.query;

    let filter = { deleted: { $ne: true } };
    if (search) filter.NoiDungCauHoi = { $regex: search, $options: 'i' };
    if (type && type !== 'Tất cả') filter.LoaiCauHoi = type;
    if (difficulty && difficulty !== 'Tất cả') filter.DoKho = difficulty;

    // Phân quyền hiển thị (Giữ nguyên logic cũ của bạn)
    if (currentUser.VaiTro === 'HocSinh') {
      filter.TrangThai = { $in: ['Đã xuất bản', 'Hoàn thiện'] };
    } else {
      if (status && status !== 'Tất cả') {
        filter.TrangThai = (status === 'Hoàn thiện' || status === 'Đã xuất bản') ? { $in: ['Đã xuất bản', 'Hoàn thiện'] } :
          (status === 'Từ chối' || status === 'Đã từ chối') ? { $in: ['Đã từ chối', 'Từ chối'] } : status;
        if (currentUser.VaiTro !== 'QuanTriVien' || (status !== 'Đang kiểm duyệt' && status !== 'Chờ duyệt')) {
          filter.$or = [{ MaGVBienSoan: currentUserId }, { MaNguoiKiemDuyet: currentUserId }];
        }
      } else {
        filter.$or = [{ TrangThai: { $in: ['Đã xuất bản', 'Hoàn thiện'] } }, { MaGVBienSoan: currentUserId }];
      }
    }

    const totalItems = await CauHoi.countDocuments(filter);

    const items = await CauHoi.aggregate([
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
            $cond: { if: { $eq: ["$MaGVBienSoan", currentUserId] }, then: 1, else: 2 }
          }
        }
      },
      // THAY ĐỔI Ở ĐÂY: Ưu tiên 'Của tôi' lên đầu, sau đó mới tới 'Trạng thái'
      { $sort: { ownPriority: 1, sortPriority: 1, NgayTao: -1 } },

      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'NGUOIDUNG',
          localField: 'MaGVBienSoan',
          foreignField: '_id',
          as: 'MaGVBienSoan'
        }
      },
      { $unwind: { path: "$MaGVBienSoan", preserveNullAndEmptyArrays: true } },
      { $project: { "MaGVBienSoan.MatKhauDaMaHoa": 0, sortPriority: 0, ownPriority: 0 } }
    ]);

    res.json({ data: items, totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getById = async (req, res) => {
  try {
    const item = await CauHoi.findById(req.params.id).populate('MaGVBienSoan', 'HoTen');
    if (!item) return res.status(404).json({ message: "Không tìm thấy câu hỏi" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      LoaiCauHoi, NoiDungCauHoi, MonHoc, ChuyenDe, DoKho,
      DanhSachLuaChon, DapAnChinhXac, DapAnGoiY
    } = req.body;

    const cauHoiData = {
      LoaiCauHoi, NoiDungCauHoi, MonHoc, ChuyenDe, DoKho,
      MaGVBienSoan: req.user?._id
    };

    switch (LoaiCauHoi) {
      case 'TracNghiem':
        if (DanhSachLuaChon) cauHoiData.DanhSachLuaChon = DanhSachLuaChon;
        if (DapAnChinhXac) cauHoiData.DapAnChinhXac = DapAnChinhXac;
        break;
      case 'DienKhuyet':
      case 'DungSai':
        if (DapAnChinhXac) cauHoiData.DapAnChinhXac = DapAnChinhXac;
        break;
      case 'TuLuan':
        if (DapAnGoiY) cauHoiData.DapAnGoiY = DapAnGoiY;
        break;
    }

    const item = new CauHoi(cauHoiData);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: "Lỗi tạo câu hỏi", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData.MaGVBienSoan;

    const updateFields = { $set: updateData };
    const unsetFields = {};

    if (updateData.LoaiCauHoi === 'TuLuan') {
      unsetFields.DanhSachLuaChon = "";
      unsetFields.DapAnChinhXac = "";
    }

    // TỰ ĐỘNG GHI NHẬN NGƯỜI DUYỆT CÂU HỎI HOẶC XÓA KHI THU HỒI
    if (updateData.TrangThai) {
      if (['Hoàn thiện', 'Đã xuất bản', 'Đã từ chối', 'Từ chối'].includes(updateData.TrangThai)) {
        updateFields.$set.MaNguoiKiemDuyet = req.user._id;
      } else if (updateData.TrangThai === 'Đang kiểm duyệt') {
        unsetFields.MaNguoiKiemDuyet = "";
        delete updateFields.$set.MaNguoiKiemDuyet;
      }
    }

    const finalUpdateQuery = Object.keys(unsetFields).length > 0
      ? { ...updateFields, $unset: unsetFields }
      : updateFields;

    const item = await CauHoi.findByIdAndUpdate(
      id,
      finalUpdateQuery,
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ message: "Không tìm thấy câu hỏi" });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await CauHoi.deleteById(req.params.id, req.user._id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};