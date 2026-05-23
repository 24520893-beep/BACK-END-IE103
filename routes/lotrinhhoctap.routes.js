const express = require('express');
const router = express.Router();

const controller = require('../controllers/lotrinhhoctap.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// API PUBLIC: Không cần auth, đặt trước /:id
router.get('/public/featured', controller.getPublicFeatured);

// Các route có auth giữ nguyên như cũ
router.get('/thungrac', auth, controller.getTrash);
router.put('/:id/restore', auth, controller.restore);
router.delete('/:id/force', auth, controller.forceDelete);

router.get('/nhiemvu-homnay', auth, controller.getTodayTasks);

router.get('/', auth, controller.getAll);
router.get('/:id', auth, controller.getById);

router.post('/', auth, rbac('GiaoVien', 'QuanTriVien'), controller.create);
router.put('/:id', auth, controller.update);
router.delete('/:id', auth, rbac('GiaoVien', 'QuanTriVien'), controller.remove);

module.exports = router;