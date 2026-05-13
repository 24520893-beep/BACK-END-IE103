// File: routes/nhandan.routes.js
const express = require('express');
const router = express.Router();
const nhanDanController = require('../controllers/nhandan.controller');

// GET /api/nhandan - Lấy danh sách
router.get('/', nhanDanController.getAll);

// POST /api/nhandan - Tạo nhãn mới
router.post('/', nhanDanController.create);

module.exports = router;