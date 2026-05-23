const express = require('express');
const router = express.Router();
const controller = require('../controllers/nguoidung.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');
const uploadCloud = require('../config/cloudinary');

// ✅ THÊM DÒNG NÀY
const attachDb = require('../middleware/dbConnection.middleware');

router.get('/danh-sach-gv', controller.getGiaoViens); // Public, không cần attachDb
router.get('/danh-sach-hs', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), controller.getHocSinhs);
router.get('/me', auth, attachDb, controller.getMe);
router.get('/', auth, attachDb, rbac('QuanTriVien'), controller.getAll);

router.post('/sign-up', controller.signUp); // Public
router.post('/', auth, attachDb, rbac('QuanTriVien'), controller.create);

router.put('/doi-mat-khau', auth, attachDb, controller.changePassword);
router.put('/:id', auth, attachDb, uploadCloud.single('avatar'), controller.update);

router.get('/thungrac-gv', auth, attachDb, rbac('QuanTriVien'), controller.getTrashTeachers);
router.put('/:id/restore', auth, attachDb, rbac('QuanTriVien'), controller.restoreTeacher);
router.delete('/:id/force', auth, attachDb, rbac('QuanTriVien'), controller.forceDeleteTeacher);
router.delete('/:id', auth, attachDb, rbac('QuanTriVien'), controller.remove);

module.exports = router;