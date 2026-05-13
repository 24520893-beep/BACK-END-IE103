const NhanDan = require('../models/NhanDan');

// 1. Lấy tất cả nhãn dán
exports.getAll = async (req, res) => {
  try {
    const tags = await NhanDan.find().sort({ TenNhanDan: 1 }); // Sắp xếp theo bảng chữ cái
    res.status(200).json(tags);
  } catch (error) {
    res.status(500).json({ message: "Lỗi trích xuất nhãn dán", error: error.message });
  }
};

// 2. Tạo nhãn dán mới (Tối ưu Zero-Footprint)
exports.create = async (req, res) => {
  try {
    const { TenNhanDan, GhiChu } = req.body;

    // Khởi tạo object dữ liệu động
    const tagData = { TenNhanDan };

    // Chỉ thêm Ghi chú vào object nếu nó có nội dung (không lưu chuỗi rỗng)
    if (GhiChu && GhiChu.trim() !== "") {
      tagData.GhiChu = GhiChu.trim();
    }

    const newTag = new NhanDan(tagData);
    await newTag.save();
    
    res.status(201).json(newTag);
  } catch (error) {
    // Xử lý lỗi trùng tên nhãn dán (code 11000 trong MongoDB)
    if (error.code === 11000) {
      return res.status(400).json({ message: "Tên nhãn dán này đã tồn tại trên hệ thống." });
    }
    res.status(500).json({ error: error.message });
  }
};

// 3. Cập nhật nhãn dán
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    const query = { $set: updateData };
    const unset = {};

    // Nếu người dùng xóa sạch nội dung Ghi chú, dùng $unset để xóa trường đó khỏi DB
    if (updateData.GhiChu === "") {
      delete updateData.GhiChu;
      unset.GhiChu = "";
    }

    const updatedTag = await NhanDan.findByIdAndUpdate(
      id,
      unset.GhiChu === "" ? { ...query, $unset: unset } : query,
      { new: true, runValidators: true }
    );

    if (!updatedTag) return res.status(404).json({ message: "Không tìm thấy nhãn dán." });
    res.json(updatedTag);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 4. Xóa nhãn dán (Xóa mềm)
exports.remove = async (req, res) => {
  try {
    await NhanDan.deleteById(req.params.id, req.user?._id);
    res.json({ message: 'Đã chuyển nhãn dán vào kho lưu trữ (xóa mềm).' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};