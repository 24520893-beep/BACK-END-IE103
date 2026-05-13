const NguoiDung = require('../models/NguoiDung');
const bcrypt = require('bcryptjs');

exports.getAll = async (req, res) => {
  const users = await NguoiDung.find();
  res.json(users);
};

exports.getMe = async (req, res) => {
  const user = await NguoiDung.findById(req.user._id);
  res.json(user);
};

// Thêm hàm này vào controllers/nguoidung.controller.js

exports.getHocSinhs = async (req, res) => {
  try {
    // 1. Tìm tất cả người dùng có VaiTro là 'HocSinh'
    // 2. Sử dụng .select() để chỉ lấy các trường cần thiết: _id, HoTen, Email
    const students = await NguoiDung.find({ VaiTro: 'HocSinh' })
      .select('_id HoTen Email')
      .sort({ HoTen: 1 }); // Sắp xếp tên theo thứ tự A-Z

    res.status(200).json(students);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách học sinh:", error);
    res.status(500).json({ 
      message: 'Lỗi máy chủ khi tải danh sách học sinh', 
      error: error.message 
    });
  }
};

// Cập nhật trong controllers/nguoidung.controller.js
exports.getGiaoViens = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Đồng bộ 12 mục/trang
    const search = req.query.search || '';
    const subject = req.query.subject || 'Tất cả';

    // Điều kiện mặc định: Chỉ tìm người dùng có vai trò là Giáo viên
    let query = { VaiTro: 'GiaoVien' };

    // Lọc theo tên giáo viên
    if (search) {
      query.HoTen = { $regex: search, $options: 'i' };
    }

    // Lọc theo môn học
    if (subject !== 'Tất cả') {
      query.MonHoc = subject;
    }

    const [totalItems, teachers] = await Promise.all([
      NguoiDung.countDocuments(query),
      NguoiDung.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ _id: -1 }) // Sắp xếp giáo viên mới nhất lên đầu (tùy chọn)
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

exports.create = async (req, res) => {
  try {
    const { 
      HoTen, Email, MatKhau, VaiTro, 
      MonHoc, KhoiThi, DiemKyVong, TruongKyVong 
    } = req.body;

    // 1. Khởi tạo các trường dùng chung mà ai cũng phải có
    const userData = {
      HoTen,
      Email,
      MatKhauDaMaHoa: bcrypt.hashSync(MatKhau, 10),
      VaiTro
    };

    // 2. Chỉ thêm trường đặc thù dựa trên VaiTro
    
    if (MonHoc) userData.MonHoc = MonHoc;
    
    

    // 3. Tạo instance và lưu (Chỉ chứa các trường đã được thêm ở trên)
    const user = new NguoiDung(userData);
    await user.save();

    const result = user.toObject();
    delete result.MatKhauDaMaHoa;

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: "Lỗi tạo tài khoản", error: error.message });
  }
};

// Hàm đăng ký dành riêng cho Học sinh (Public API)
exports.signUp = async (req, res) => {
  try {
    // 1. Nhận dữ liệu từ Front-end gửi lên
    const { 
      HoTen, 
      Email, 
      MatKhau, 
      KhoiThiMucTieu, // Nhận tên biến theo đúng payload Front-end
      KhoiThi,        // Dự phòng nếu truyền chuẩn tên Schema
      DiemKyVong, 
      TruongKyVong 
    } = req.body;

    // 2. Kiểm tra xem Email đã tồn tại trong hệ thống chưa
    const existingUser = await NguoiDung.findOne({ Email });
    if (existingUser) {
      return res.status(400).json({ 
        message: "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập." 
      });
    }

    // 3. Mã hóa mật khẩu
    const hashedPassword = bcrypt.hashSync(MatKhau, 10);

    // 4. Xây dựng Object người dùng
    // ⚠️ BẢO MẬT: Ép cứng VaiTro là 'HocSinh', bỏ qua giá trị VaiTro từ Front-end gửi lên
    const userData = {
      HoTen,
      Email,
      MatKhauDaMaHoa: hashedPassword,
      VaiTro: 'HocSinh'
    };

    // 5. Thêm các trường mục tiêu học tập (Chỉ thêm nếu có dữ liệu)
    // Ánh xạ KhoiThiMucTieu từ React sang KhoiThi của MongoDB
    const khoiThiHS = KhoiThiMucTieu || KhoiThi; 
    if (khoiThiHS) userData.KhoiThi = khoiThiHS;
    if (DiemKyVong) userData.DiemKyVong = DiemKyVong;
    if (TruongKyVong) userData.TruongKyVong = TruongKyVong;

    // 6. Lưu vào Database
    const newUser = new NguoiDung(userData);
    await newUser.save();

    // 7. Loại bỏ mật khẩu băm trước khi trả về kết quả
    const result = newUser.toObject();
    delete result.MatKhauDaMaHoa;

    res.status(201).json({ 
      message: "Đăng ký tài khoản học sinh thành công!", 
      data: result 
    });

  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ 
      message: "Lỗi hệ thống khi đăng ký tài khoản.", 
      error: error.message 
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    // 1. Xử lý nếu người dùng muốn đổi mật khẩu
    if (updateData.MatKhau) {
      updateData.MatKhauDaMaHoa = bcrypt.hashSync(updateData.MatKhau, 10);
      delete updateData.MatKhau; // Xóa key tạm từ body
    }

    // 2. Thực hiện cập nhật
    const updatedUser = await NguoiDung.findByIdAndUpdate(
      id, 
      { $set: updateData }, 
      { new: true, runValidators: true } // Trả về bản ghi mới và chạy kiểm tra schema
    ).select('-MatKhauDaMaHoa'); // Không trả về mật khẩu sau khi update

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Lỗi Update User:", error);
    res.status(400).json({ message: "Cập nhật thất bại", error: error.message });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await NguoiDung.deleteById(req.params.id, req.user._id);
  res.json({ message: 'User deleted' });
};

