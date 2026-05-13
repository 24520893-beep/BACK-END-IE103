const express = require('express');
const router = express.Router();
const controller = require('../controllers/ketquathithu.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

router.get('/', auth, controller.getAll);
router.get('/:id', auth, controller.getById);
router.post('/', auth, rbac('HocSinh'), controller.create);
router.put('/:id', auth, rbac('HocSinh'), controller.update);
router.delete('/:id', auth, rbac('HocSinh'), controller.remove);

module.exports = router;
