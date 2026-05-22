const express = require('express');
const router = express.Router();
const controller = require('../controllers/ketquathithu.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// IMPORT MIDDLEWARE CLOUDINARY
const uploadCloud = require('../config/cloudinary');

router.get('/check-exam/:examId', auth, controller.checkByExam);


router.get('/', auth, controller.getAll);
router.get('/:id', auth, controller.getById);


// ĐÃ THÊM: uploadCloud.any() để hứng toàn bộ file đính kèm gửi lên
router.post('/', auth, rbac('HocSinh'), uploadCloud.any(), controller.create);

router.put('/:id', auth, rbac('HocSinh'), controller.update);
router.delete('/:id', auth, rbac('HocSinh'), controller.remove);

module.exports = router;