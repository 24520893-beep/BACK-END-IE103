const express = require('express');
const router = express.Router();
const controller = require('../controllers/dethithu.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// Đã sửa 'verifyToken' thành 'auth' và 'taiLieuController' thành 'controller'
router.get('/thungrac', auth, controller.getTrash);
router.put('/:id/restore', auth, controller.restore);
router.delete('/:id/force', auth, controller.forceDelete);

// TẤT CẢ các thao tác đều yêu cầu phải có tài khoản (auth)
router.get('/', auth, controller.getAllExams); // Xem danh sách đề thi
router.get('/:id', auth, controller.getById); // Xem chi tiết 1 đề thi

// Các quyền quản trị dành riêng cho Giáo viên
router.post('/', auth, rbac('GiaoVien' , 'QuanTriVien'), controller.create);
router.put('/:id', auth, rbac('GiaoVien' , 'QuanTriVien'), controller.update);
router.delete('/:id', auth, rbac('GiaoVien', 'QuanTriVien'), controller.remove);

module.exports = router;