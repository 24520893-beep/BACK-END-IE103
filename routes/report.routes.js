const express = require('express');
const router = express.Router();
const controller = require('../controllers/report.controller'); // Giả sử bạn lưu chung trong report.controller
const auth = require('../middleware/auth.middleware');
const rbac = require('../middleware/rbac.middleware');


// Top 10 students by avg score (all roles)
router.get('/bangxephang-thithu', auth, controller.getBangXepHangThiThu);
router.get('/phodiem-thithu', auth, controller.getPhoDiemThiThu);
// =====================================
// ĐÃ SỬA: Thêm /:id cho các route cần xem chi tiết
// =====================================
router.get('/chitiet-dethi/:id', auth, controller.getChiTietDeThiChoHocSinh);
router.get('/chitiet-ketquathithu/:id', auth, controller.getReviewKetQuaChoHocSinh);

// Các route báo cáo/danh sách (Không cần ID trên path, dùng req.query là đủ)
router.get('/phantich-lohongkienthuc', auth, controller.getPhanTichLoHongKienThuc);
router.get('/sotay-loisai', auth, controller.getSoTayLoiSai);

router.get('/tiendo-nhiemvu-homnay', auth, controller.getTienDoNhiemVuHomNay);
router.get('/phantich-muctieu-thucte', auth, controller.getPhanTichMucTieuThucTe);
router.get('/canhbao-hocsinh', auth, controller.getCanhBaoHocSinh);

module.exports = router;