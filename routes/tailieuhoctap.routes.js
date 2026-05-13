const express = require('express');
const router = express.Router();
const controller = require('../controllers/tailieuhoctap.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// Đã sửa 'verifyToken' thành 'auth' và 'taiLieuController' thành 'controller'
router.get('/thungrac', auth, controller.getTrash);
router.put('/:id/restore', auth, controller.restore);
router.delete('/:id/force', auth, controller.forceDelete);

router.get('/', auth, controller.getAll);
router.get('/:id', auth, controller.getById);
router.post('/', auth, rbac('GiaoVien', 'QuanTriVien'), controller.create);
router.put('/:id', auth, rbac('GiaoVien', 'QuanTriVien'), controller.update);
router.delete('/:id', auth, rbac('GiaoVien', 'QuanTriVien'), controller.remove);

module.exports = router;