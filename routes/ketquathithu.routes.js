const express = require('express');
const router = express.Router();
const controller = require('../controllers/ketquathithu.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// IMPORT MIDDLEWARE CLOUDINARY
const uploadCloud = require('../config/cloudinary');

const attachDb = require('../middleware/dbConnection.middleware'); // ✅ THÊM

router.get('/check-exam/:examId', auth, attachDb, controller.checkByExam);
router.get('/', auth, attachDb, controller.getAll);
router.get('/:id', auth, attachDb, controller.getById);
router.post('/', auth, attachDb, rbac('HocSinh'), uploadCloud.any(), controller.create);
router.put('/:id', auth, attachDb, rbac('HocSinh'), controller.update);
router.delete('/:id', auth, attachDb, rbac('HocSinh'), controller.remove);

module.exports = router;