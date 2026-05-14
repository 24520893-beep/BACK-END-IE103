const express = require('express');
const router = express.Router();
const controller = require('../controllers/cauhoi.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// 1. IMPORT MIDDLEWARE CLOUDINARY
const uploadCloud = require('../config/cloudinary');

// Các route liên quan đến thùng rác
router.get('/thungrac', auth, controller.getTrash);
router.put('/:id/restore', auth, controller.restore);
router.delete('/:id/force', auth, controller.forceDelete);

// Các route truy xuất dữ liệu
router.get('/', auth, controller.getAll);
router.get('/:id', auth, controller.getById);

// 2. CHÈN uploadCloud.single('image') VÀO ROUTE TẠO MỚI (POST) VÀ CẬP NHẬT (PUT)
router.post('/', auth, rbac('GiaoVien', 'QuanTriVien'), uploadCloud.single('image'), controller.create);
router.put('/:id', auth, rbac('GiaoVien', 'QuanTriVien'), uploadCloud.single('image'), controller.update);

// Route xóa mềm
router.delete('/:id', auth, rbac('GiaoVien', 'QuanTriVien'), controller.remove);

module.exports = router;