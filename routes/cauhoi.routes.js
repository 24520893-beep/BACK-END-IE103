const express = require('express');
const router = express.Router();
const controller = require('../controllers/cauhoi.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// 1. IMPORT MIDDLEWARE CLOUDINARY
const uploadCloud = require('../config/cloudinary');

const attachDb = require('../middleware/dbConnection.middleware'); // ✅ THÊM

router.get('/thungrac', auth, attachDb, controller.getTrash);
router.put('/:id/restore', auth, attachDb, controller.restore);
router.delete('/:id/force', auth, attachDb, controller.forceDelete);
router.get('/', auth, attachDb, controller.getAll);
router.get('/:id', auth, attachDb, controller.getById);
router.post('/', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), uploadCloud.single('image'), controller.create);
router.put('/:id', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), uploadCloud.single('image'), controller.update);
router.delete('/:id', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), controller.remove);

module.exports = router;