const express = require('express');
const router = express.Router();
const controller = require('../controllers/thongke.controller');

router.get('/tongquan', controller.getTongQuan);

module.exports = router;