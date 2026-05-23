const express = require('express');
const router = express.Router();
const controller = require('../controllers/report.controller'); // Giả sử bạn lưu chung trong report.controller
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');


const attachDb = require('../middleware/dbConnection.middleware'); // ✅ THÊM

router.get('/bangxephang-thithu', auth, attachDb, controller.getBangXepHangThiThu);
router.get('/phodiem-thithu', auth, attachDb, controller.getPhoDiemThiThu);
router.get('/chitiet-dethi/:id', auth, attachDb, controller.getChiTietDeThiChoHocSinh);
router.get('/chitiet-ketquathithu/:id', auth, attachDb, controller.getReviewKetQuaChoHocSinh);
router.get('/phantich-lohongkienthuc', auth, attachDb, controller.getPhanTichLoHongKienThuc);
router.get('/sotay-loisai', auth, attachDb, controller.getSoTayLoiSai);
router.get('/tiendo-nhiemvu-homnay', auth, attachDb, controller.getTienDoNhiemVuHomNay);
router.get('/phantich-muctieu-thucte', auth, attachDb, controller.getPhanTichMucTieuThucTe);
router.get('/canhbao-hocsinh', auth, attachDb, controller.getCanhBaoHocSinh);

module.exports = router;