const express = require('express');
const router = express.Router();
const controller = require('../controllers/report.controller');
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');

// Example RBAC: Only QuanTriVien can access pending approval queue
router.get('/kiemduyet-hoclieu', auth, rbac('QuanTriVien'), controller.getKiemDuyetHocLieu);

// Top 10 students by avg score (all roles)
router.get('/bangxephang-thithu', auth, controller.getBangXepHangThiThu);

// Add all 10 views
router.get('/chitiet-dethi', auth, controller.getChiTietDeThi);
router.get('/phantich-lohongkienthuc', auth, controller.getPhanTichLoHongKienThuc);
router.get('/chitiet-ketquathithu', auth, controller.getChiTietKetQuaThiThu);
router.get('/sotay-loisai', auth, controller.getSoTayLoiSai);
router.get('/phodiem-thithu', auth, controller.getPhoDiemThiThu);
router.get('/tiendo-nhiemvu-homnay', auth, controller.getTienDoNhiemVuHomNay);
router.get('/phantich-muctieu-thucte', auth, controller.getPhanTichMucTieuThucTe);
router.get('/canhbao-hocsinh', auth, controller.getCanhBaoHocSinh);

module.exports = router;
