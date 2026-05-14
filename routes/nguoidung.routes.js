const express = require('express');
const router = express.Router();
const controller = require('../controllers/nguoidung.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// 1. IMPORT MIDDLEWARE CLOUDINARY
const uploadCloud = require('../config/cloudinary');

// Các route GET
router.get('/danh-sach-gv', controller.getGiaoViens);
router.get('/danh-sach-hs', auth, rbac('GiaoVien', 'QuanTriVien'), controller.getHocSinhs);
router.get('/', auth, rbac('QuanTriVien'), controller.getAll);
router.get('/me', auth, controller.getMe);

// Các route POST
router.post('/sign-up', controller.signUp);
router.post('/', auth, rbac('QuanTriVien'), controller.create);

// 2. CHÈN uploadCloud.single('avatar') VÀO ROUTE CẬP NHẬT (PUT)
router.put('/:id', auth, uploadCloud.single('avatar'), controller.update);

// Route DELETE (Đã rút gọn rbac bị lặp chữ)
router.delete('/:id', auth, rbac('QuanTriVien'), controller.remove);

module.exports = router;