// File: routes/nhandan.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/nhandan.controller');
const auth = require('../middleware/auth.middleware');         // ← thiếu dòng này
const rbac = require('../middleware/rbac.middleware');         // ← thiếu dòng này
const attachDb = require('../middleware/dbConnection.middleware'); // ← thiếu dòng này

router.get('/', controller.getAll);

router.post('/', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), controller.create);
router.put('/:id', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), controller.update);
router.delete('/:id', auth, attachDb, rbac('GiaoVien', 'QuanTriVien'), controller.remove);

module.exports = router;