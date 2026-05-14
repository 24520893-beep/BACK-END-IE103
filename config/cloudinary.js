const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// 1. Cấu hình thông tin kết nối Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Cấu hình kho lưu trữ (Storage) cho Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'HOCMOI_TaiLieu', // Tên thư mục sẽ tạo trên Cloudinary
    resource_type: 'auto', // Tự động nhận diện (ảnh, video, pdf...)
    allowed_formats: ['jpg', 'jpeg', 'png', 'mp3', 'mp4', 'pdf']
  },
});

// 3. Xuất middleware upload
const uploadCloud = multer({ storage });
module.exports = uploadCloud;