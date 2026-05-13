const mongoose = require('mongoose');

const getView = (viewName) => async (req, res) => {
  const collection = mongoose.connection.db.collection(viewName);
  const query = req.query || {};
  const data = await collection.find(query).limit(100).toArray();
  res.json(data);
};

exports.getChiTietDeThi = getView('View_ChiTietDeThi');
exports.getBangXepHangThiThu = getView('View_BangXepHangThiThu');
exports.getPhanTichLoHongKienThuc = getView('View_PhanTichLoHongKienThuc');
exports.getChiTietKetQuaThiThu = getView('View_ChiTietKetQuaThiThu');
exports.getSoTayLoiSai = getView('View_SoTayLoiSai');
exports.getPhoDiemThiThu = getView('View_PhoDiemThiThu');
exports.getTienDoNhiemVuHomNay = getView('View_TienDo_NhiemVu_HomNay');
exports.getPhanTichMucTieuThucTe = getView('View_PhanTichMucTieu_ThucTe');
exports.getKiemDuyetHocLieu = getView('View_KiemDuyet_HocLieu');
exports.getCanhBaoHocSinh = getView('View_CanhBao_HocSinh');
