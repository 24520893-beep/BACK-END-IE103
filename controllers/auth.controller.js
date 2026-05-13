const NguoiDung = require('../models/NguoiDung');
const jwt = require('jsonwebtoken');
const { secret, expiresIn } = require('../config/jwt');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
  try {
    const { Email, MatKhau } = req.body;
    
    // 1. Tìm người dùng theo Email
    const user = await NguoiDung.findOne({ Email });
    
    // 2. Kiểm tra user có tồn tại không và Mật khẩu có khớp không (Đã sửa thành MatKhauDaMaHoa)
    if (!user || !bcrypt.compareSync(MatKhau, user.MatKhauDaMaHoa)) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }
    
    // 3. Tạo Token
    const token = jwt.sign(
      { _id: user._id, VaiTro: user.VaiTro, Email: user.Email },
      secret,
      { expiresIn }
    );
    
    // 4. Loại bỏ trường mật khẩu trước khi gửi thông tin user về Front-end để bảo mật
    const userToReturn = user.toObject();
    delete userToReturn.MatKhauDaMaHoa;

    // 5. Trả về CẢ token VÀ thông tin user
    res.status(200).json({ 
      token, 
      user: userToReturn 
    });

  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};