const express = require('express');
const uploadCloud = require('../config/cloudinary');
const router = express.Router();
const controller = require('../controllers/tailieuhoctap.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

const attachDb = require('../middleware/dbConnection.middleware'); // ✅ THÊM

router.get('/thungrac', auth, attachDb, controller.getTrash);
router.put('/:id/restore', auth, attachDb, controller.restore);
router.delete('/:id/force', auth, attachDb, controller.forceDelete);
router.get('/', auth, attachDb, controller.getAll);
router.get('/:id', auth, attachDb, controller.getById);
router.post('/', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), uploadCloud.single('fileUpload'), controller.create);
router.put('/:id', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), uploadCloud.single('fileUpload'), controller.update);
router.delete('/:id', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), controller.remove);

module.exports = router;