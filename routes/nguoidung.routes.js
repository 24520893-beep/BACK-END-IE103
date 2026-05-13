const express = require('express');
const router = express.Router();
const controller = require('../controllers/nguoidung.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');


// Thay vì: router.get('/danh-sach-gv', auth, controller.getGiaoViens);
// Hãy sửa thành:
router.get('/danh-sach-gv', controller.getGiaoViens);
router.get('/danh-sach-hs', auth, rbac('GiaoVien', 'QuanTriVien'), controller.getHocSinhs);
router.get('/', auth, rbac('QuanTriVien'), controller.getAll);
router.get('/me', auth, controller.getMe);
router.post('/sign-up',  controller.signUp);
router.post('/', auth, rbac('QuanTriVien'), controller.create);
router.put('/:id', auth, controller.update);
router.delete('/:id', auth, rbac('QuanTriVien', 'QuanTriVien'), controller.remove);

module.exports = router;
