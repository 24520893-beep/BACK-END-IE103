const express = require('express');
const router = express.Router();

// KHAI BÁO CÁC MODULE CẦN THIẾT
const controller = require('../controllers/nguoidung.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');
const uploadCloud = require('../config/cloudinary');

// ==========================================
// CÁC ROUTE GET (Lấy dữ liệu)
// ==========================================
router.get('/danh-sach-gv', controller.getGiaoViens);

router.get('/danh-sach-hs', auth, rbac('GiaoVien', 'QuanTriVien'), controller.getHocSinhs);

router.get('/me', auth, controller.getMe); // Phải đặt trước /:id hoặc /

router.get('/', auth, rbac('QuanTriVien'), controller.getAll);


// ==========================================
// CÁC ROUTE POST (Tạo mới)
// ==========================================
router.post('/sign-up', controller.signUp); // Học sinh tự đăng ký (Public)

router.post('/', auth, rbac('QuanTriVien'), controller.create); // Admin tạo Giáo viên


// ==========================================
// CÁC ROUTE PUT (Cập nhật)
// ==========================================

// ĐÃ SỬA LỖI TẠI ĐÂY: Dùng đúng tên biến 'auth' và 'controller' đã require ở trên
router.put('/doi-mat-khau', auth, controller.changePassword);

// Cập nhật thông tin cá nhân (Có hỗ trợ upload file tên là 'avatar')
router.put('/:id', auth, uploadCloud.single('avatar'), controller.update);

router.get('/thungrac-gv', auth, rbac('QuanTriVien'), controller.getTrashTeachers);

// Khôi phục giáo viên
router.put('/:id/restore', auth, rbac('QuanTriVien'), controller.restoreTeacher);

// Xóa vĩnh viễn giáo viên
router.delete('/:id/force', auth, rbac('QuanTriVien'), controller.forceDeleteTeacher);
// ==========================================
// CÁC ROUTE DELETE (Xóa)
// ==========================================
router.delete('/:id', auth, rbac('QuanTriVien'), controller.remove);

module.exports = router;