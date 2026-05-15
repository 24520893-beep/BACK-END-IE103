const NguoiDung = require('../models/NguoiDung');
const bcrypt = require('bcryptjs');

// ==========================================
// CÁC HÀM GET
// ==========================================

exports.getAll = async (req, res) => {
  try {
    // Kéo người dùng từ DB ra kiểm tra quyền thay vì tin vào token
    const requestUser = await NguoiDung.findById(req.user._id);
    if (!requestUser || requestUser.VaiTro !== 'QuanTriVien') {
      return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const users = await NguoiDung.find().select('-MatKhauDaMaHoa');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await NguoiDung.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

exports.getHocSinhs = async (req, res) => {
  try {
    const requestUser = await NguoiDung.findById(req.user._id);
    if (!requestUser || (requestUser.VaiTro !== 'QuanTriVien' && requestUser.VaiTro !== 'GiaoVien')) {
      return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const students = await NguoiDung.find({ VaiTro: 'HocSinh' })
      .select('_id HoTen Email')
      .sort({ HoTen: 1 }); 

    res.status(200).json(students);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách học sinh:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách học sinh', error: error.message });
  }
};

exports.getGiaoViens = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; 
    const search = req.query.search || '';
    const subject = req.query.subject || 'Tất cả';

    let query = { VaiTro: 'GiaoVien' };

    if (search) {
      query.HoTen = { $regex: search, $options: 'i' };
    }

    if (subject !== 'Tất cả') {
      query.MonHoc = subject;
    }

    const [totalItems, teachers] = await Promise.all([
      NguoiDung.countDocuments(query),
      NguoiDung.find(query).select('-MatKhauDaMaHoa')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ _id: -1 }) 
    ]);

    res.json({
      data: teachers,
      totalPages: Math.ceil(totalItems / limit),
      totalItems: totalItems,
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách giáo viên', error: error.message });
  }
};

// ==========================================
// CÁC HÀM TẠO MỚI / ĐĂNG KÝ
// ==========================================

exports.create = async (req, res) => {
  try {
    // KIỂM TRA BẢO MẬT: Lấy trực tiếp thông tin người đang thực hiện request từ DB
    const requestUser = await NguoiDung.findById(req.user._id);
    
    // Nếu không tồn tại hoặc không phải Quản trị viên -> Chặn ngay lập tức
    if (!requestUser || requestUser.VaiTro !== 'QuanTriVien') {
        return res.status(403).json({ message: "Từ chối truy cập. Chỉ Quản trị viên mới được phép thêm giáo viên." });
    }

    const { HoTen, Email, MatKhau, MonHoc } = req.body;

    const existingUser = await NguoiDung.findOne({ Email });
    if (existingUser) {
      return res.status(400).json({ message: "Email này đã được sử dụng." });
    }

    const userData = {
      HoTen,
      Email,
      MatKhauDaMaHoa: bcrypt.hashSync(MatKhau, 10),
      VaiTro: 'GiaoVien' // Ép cứng
    };

    if (MonHoc) userData.MonHoc = MonHoc;

    const user = new NguoiDung(userData);
    await user.save();

    const result = user.toObject();
    delete result.MatKhauDaMaHoa;

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: "Lỗi tạo tài khoản", error: error.message });
  }
};

exports.signUp = async (req, res) => {
  try {
    const {
      HoTen, Email, MatKhau,
      KhoiThiMucTieu, KhoiThi,
      DiemKyVong, TruongKyVong
    } = req.body;

    const existingUser = await NguoiDung.findOne({ Email });
    if (existingUser) {
      return res.status(400).json({ message: "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập." });
    }

    const hashedPassword = bcrypt.hashSync(MatKhau, 10);

    const userData = {
      HoTen, Email,
      MatKhauDaMaHoa: hashedPassword,
      VaiTro: 'HocSinh' // Ép cứng
    };

    const khoiThiHS = KhoiThiMucTieu || KhoiThi;
    if (khoiThiHS) userData.KhoiThi = khoiThiHS;
    if (DiemKyVong) userData.DiemKyVong = DiemKyVong;
    if (TruongKyVong) userData.TruongKyVong = TruongKyVong;

    const newUser = new NguoiDung(userData);
    await newUser.save();

    const result = newUser.toObject();
    delete result.MatKhauDaMaHoa;

    res.status(201).json({
      message: "Đăng ký tài khoản học sinh thành công!",
      data: result
    });

  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi đăng ký tài khoản.", error: error.message });
  }
};

// ==========================================
// CÁC HÀM CẬP NHẬT / ĐỔI MẬT KHẨU
// ==========================================

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };
    const { MatKhauXacNhan } = req.body; 

    // BẢO MẬT TỐI ĐA: Loại bỏ hoàn toàn các trường không được phép tự do sửa đổi
    delete updateData.VaiTro;
    delete updateData.MonHoc;

    // 1. KIỂM TRA MẬT KHẨU XÁC NHẬN VÀ QUYỀN TRUY CẬP TỪ DB
    const requestUser = await NguoiDung.findById(req.user._id).select('+MatKhauDaMaHoa');
    
    // Nếu ID truy vấn không khớp với ID token (người dùng tự sửa ID của người khác) thì chặn
    if (id !== req.user._id && requestUser.VaiTro !== 'QuanTriVien') {
      return res.status(403).json({ message: "Bạn không có quyền sửa thông tin của người khác." });
    }

    // Lấy thông tin user bị sửa (nếu là tự sửa thì targetUser = requestUser)
    const targetUser = (id === req.user._id) ? requestUser : await NguoiDung.findById(id).select('+MatKhauDaMaHoa');

    if (!targetUser) {
        return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    if (!MatKhauXacNhan) {
        return res.status(400).json({ message: "Vui lòng nhập mật khẩu để xác nhận thay đổi." });
    }

    // Người xác nhận mật khẩu là người đang thực hiện request
    const isMatch = bcrypt.compareSync(MatKhauXacNhan, requestUser.MatKhauDaMaHoa);
    if (!isMatch) {
        return res.status(401).json({ message: "Mật khẩu xác nhận không chính xác." });
    }

    // 2. XỬ LÝ ẢNH ĐẠI DIỆN
    if (req.file) {
      updateData.Avatar = req.file.path;
    }

    if (updateData.MatKhau) {
      updateData.MatKhauDaMaHoa = bcrypt.hashSync(updateData.MatKhau, 10);
      delete updateData.MatKhau;
    }
    
    delete updateData.MatKhauXacNhan;

    // 4. THỰC HIỆN CẬP NHẬT
    const updatedUser = await NguoiDung.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-MatKhauDaMaHoa');

    res.status(200).json(updatedUser);

  } catch (error) {
    console.error("Lỗi Update User:", error);
    res.status(400).json({ message: "Cập nhật thất bại", error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { MatKhauCu, MatKhauMoi } = req.body;
    const userId = req.user._id; 

    // Lấy thông tin từ DB để verify
    const user = await NguoiDung.findById(userId).select('+MatKhauDaMaHoa');
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const isMatch = bcrypt.compareSync(MatKhauCu, user.MatKhauDaMaHoa);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác." });
    }

    user.MatKhauDaMaHoa = bcrypt.hashSync(MatKhauMoi, 10);
    await user.save();

    res.status(200).json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error);
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// ==========================================
// CÁC HÀM XÓA
// ==========================================

exports.remove = async (req, res) => {
  try {
    // BẢO MẬT: Kiểm tra vai trò thực tế từ DB
    const requestUser = await NguoiDung.findById(req.user._id);
    if (!requestUser || requestUser.VaiTro !== 'QuanTriVien') {
      return res.status(403).json({ message: "Từ chối truy cập. Chỉ quản trị viên mới được phép xóa." });
    }

    await NguoiDung.deleteById(req.params.id, req.user._id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// THÙNG RÁC GIÁO VIÊN
// ==========================================

exports.getTrashTeachers = async (req, res) => {
  try {
    const requestUser = await NguoiDung.findById(req.user._id);
    if (!requestUser || requestUser.VaiTro !== 'QuanTriVien') {
      return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';

    let query = { VaiTro: 'GiaoVien', deleted: true };

    if (search) {
      query.$or = [
        { HoTen: { $regex: search, $options: 'i' } },
        { Email: { $regex: search, $options: 'i' } }
      ];
    }

    const [totalItems, teachers] = await Promise.all([
      NguoiDung.countDocumentsDeleted(query),
      NguoiDung.findDeleted(query).select('-MatKhauDaMaHoa')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ NgayXoa: -1 }) 
    ]);

    res.status(200).json({
      data: teachers,
      totalPages: Math.ceil(totalItems / limit),
      totalItems: totalItems,
      currentPage: page
    });
  } catch (error) {
    console.error("Lỗi khi tải thùng rác giáo viên:", error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách giáo viên đã xóa', error: error.message });
  }
};

exports.restoreTeacher = async (req, res) => {
  try {
    const requestUser = await NguoiDung.findById(req.user._id);
    if (!requestUser || requestUser.VaiTro !== 'QuanTriVien') {
      return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const { id } = req.params;
    const teacher = await NguoiDung.findOneDeleted({ _id: id, VaiTro: 'GiaoVien' });
    if (!teacher) {
      return res.status(404).json({ message: "Không tìm thấy giáo viên này trong thùng rác." });
    }

    await teacher.restore();
    
    res.status(200).json({ message: "Khôi phục tài khoản giáo viên thành công!" });
  } catch (error) {
    console.error("Lỗi khôi phục giáo viên:", error);
    res.status(500).json({ message: "Lỗi khôi phục dữ liệu", error: error.message });
  }
};

exports.forceDeleteTeacher = async (req, res) => {
  try {
    const requestUser = await NguoiDung.findById(req.user._id);
    if (!requestUser || requestUser.VaiTro !== 'QuanTriVien') {
      return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const { id } = req.params;
    const teacher = await NguoiDung.findOneDeleted({ _id: id, VaiTro: 'GiaoVien' });
    if (!teacher) {
      return res.status(404).json({ message: "Không tìm thấy giáo viên này trong thùng rác." });
    }

    await NguoiDung.deleteOne({ _id: id });

    res.status(200).json({ message: "Đã xóa vĩnh viễn tài khoản giáo viên khỏi hệ thống." });
  } catch (error) {
    console.error("Lỗi xóa vĩnh viễn:", error);
    res.status(500).json({ message: "Lỗi xóa vĩnh viễn", error: error.message });
  }
};