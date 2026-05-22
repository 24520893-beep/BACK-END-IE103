const KetQuaThiThu = require('../models/KetQuaThiThu');
const DeThiThu = require('../models/DeThiThu');
const NguoiDung = require('../models/NguoiDung'); 
const LoTrinhHocTap = require('../models/LoTrinhHocTap');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", 
  systemInstruction: "Bạn là hệ thống chấm thi tự động lõi của HOCMOI.VN. Nhiệm vụ của bạn là đọc câu hỏi, đáp án mẫu và bài làm của học sinh để chấm điểm một cách cực kỳ chính xác, công bằng và nghiêm khắc.",
  generationConfig: {
    responseMimeType: "application/json", 
  }
});

async function fetchFileAsBase64ForAI(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: response.headers.get('content-type') || 'image/jpeg'
      },
    };
  } catch (err) {
    console.error("Lỗi tải file Cloudinary:", err);
    return null;
  }
}

async function callAIGradingWithRetry(noiDungGuiAI, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await aiModel.generateContent(noiDungGuiAI);
            return result.response.text().trim(); 
        } catch (error) {
            console.warn(`[Cảnh báo AI] Lần thử ${i + 1} thất bại:`, error.message);
            if (i === maxRetries - 1) throw error; 
            await new Promise(resolve => setTimeout(resolve, 2500));
        }
    }
}

exports.getAll = async (req, res) => {
  try {
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy thông tin người dùng." });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    let query = {};

    if (currentUser.VaiTro === 'HocSinh') {
      query.MaHocSinh = currentUser._id;
    }
    else if (currentUser.VaiTro === 'GiaoVien') {
      const myExams = await DeThiThu.find({ MaGVThietKe: currentUser._id }).select('_id');
      const myExamIds = myExams.map(exam => exam._id);
      query.MaDeThi = { $in: myExamIds };
    }

    if (req.query.studentId && currentUser.VaiTro !== 'HocSinh') query.MaHocSinh = req.query.studentId;
    if (req.query.examId) query.MaDeThi = req.query.examId;

    const [totalItems, items] = await Promise.all([
      KetQuaThiThu.countDocuments(query),
      KetQuaThiThu.find(query)
        .populate('MaDeThi', 'TenDeThi MonHoc')
        .populate('MaHocSinh', 'HoTen Email')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ NgayTao: -1 })
    ]);

    res.json({ data: items, totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ message: "Lỗi trích xuất kết quả", error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await KetQuaThiThu.findById(req.params.id).populate('MaDeThi').populate('MaHocSinh', 'HoTen Email');
    if (!item) return res.status(404).json({ message: "Không tìm thấy kết quả" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

// Thêm vào cuối file, trước module.exports cuối cùng
exports.checkByExam = async (req, res) => {
  try {
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser) return res.status(401).json({ message: "Không tìm thấy người dùng." });

    const { examId } = req.params;

    const ketQua = await KetQuaThiThu.findOne({
      MaHocSinh: currentUser._id,
      MaDeThi: examId,
      deleted: { $ne: true }
    })
    .sort({ DiemSo: -1 }) // THÊM DÒNG NÀY: Ưu tiên lấy kết quả cao điểm nhất
    .select('_id DiemSo NgayTao');

    if (!ketQua) {
      return res.status(404).json({ existed: false, message: "Chưa có kết quả thi." });
    }

    res.json({ existed: true, ketQua });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro !== 'HocSinh') {
      return res.status(403).json({ message: "Chỉ học sinh mới có thể nộp bài thi." });
    }

    const MaDeThi = req.body.MaDeThi;
    let ChiTietBaiLam = [];
    try { ChiTietBaiLam = JSON.parse(req.body.ChiTietBaiLam); } catch (e) {}
    
    const files = req.files || []; 

    const deThiGoc = await DeThiThu.findById(MaDeThi).populate('DanhSachCauHoi');
    if (!deThiGoc) return res.status(404).json({ message: "Không tìm thấy đề thi gốc" });

    const tuDienCauHoi = {};
    deThiGoc.DanhSachCauHoi.forEach(q => tuDienCauHoi[q._id.toString()] = q);

    const totalQuestions = deThiGoc.DanhSachCauHoi.length;
    if (totalQuestions === 0) return res.status(400).json({ message: "Đề thi không có câu hỏi." });

    const pointPerQuestion = 10 / totalQuestions;
    let nhanXetTongHop = ""; 
    const mangChiTietDaCham = [];
    let aiHoanToanThatBai = false; 

    // VÒNG LẶP SẼ AWAIT TỪNG CÂU CHO ĐẾN KHI CHẤM XONG HẾT
    if (ChiTietBaiLam && ChiTietBaiLam.length > 0) {
      for (const item of ChiTietBaiLam) {
        const cauHoiGoc = tuDienCauHoi[item.MaCauHoi.toString()];
        if (!cauHoiGoc) continue;

        let isCorrect = false;
        let diemCauNay = 0;
        let dapAnHocSinh = item.LuaChonCuaHocSinh || "";
        const dapAnChuan = cauHoiGoc.DapAnChinhXac || "";

        let chiTietItem = {
            MaCauHoi: item.MaCauHoi,
            KetQuaDungSai: false 
        };

        if (cauHoiGoc.LoaiCauHoi === 'TuLuan') {
          const fileField = `file_${item.MaCauHoi}`;
          const uploadedFile = files.find(f => f.fieldname === fileField);
          const fileUrl = uploadedFile ? uploadedFile.path : null; 
          let textHocSinh = dapAnHocSinh.trim();

          if (textHocSinh && fileUrl) {
              dapAnHocSinh = `${textHocSinh}\n\n[File đính kèm]: ${fileUrl}`;
          } else if (fileUrl) {
              dapAnHocSinh = `[File đính kèm]: ${fileUrl}`;
          } else {
              dapAnHocSinh = textHocSinh; 
          }

          if (!textHocSinh && !fileUrl) {
              diemCauNay = 0;
              isCorrect = false;
              nhanXetTongHop += `- Câu tự luận (${cauHoiGoc.ChuyenDe || 'Chung'}): Bỏ trống (0 điểm). `;
          } else {
              const aiPrompt = `
Hãy chấm điểm bài làm tự luận này của học sinh dựa trên các thông số sau:
- CÂU HỎI: ${cauHoiGoc.NoiDungCauHoi}
- ĐÁP ÁN GỢI Ý / TIÊU CHÍ CHẤM: ${cauHoiGoc.DapAnGoiY || dapAnChuan || 'Tự đánh giá theo kiến thức chuẩn.'}
- PHẦN TRẢ LỜI VĂN BẢN CỦA HỌC SINH: ${textHocSinh || 'Không có văn bản'}
${fileUrl ? '- HỌC SINH CÓ ĐÍNH KÈM HÌNH ẢNH. Hãy phân tích kỹ hình ảnh đính kèm để chấm.' : ''}

Yêu cầu định dạng trả về là JSON thuần túy (không bọc trong \`\`\`json):
{
  "tilePhanTram": <Số nguyên từ 0 đến 100>,
  "nhanXet": "<Nhận xét ngắn gọn>"
}
              `;

              try {
                  const noiDungGuiAI = [aiPrompt];
                  if (fileUrl) {
                      const filePart = await fetchFileAsBase64ForAI(fileUrl);
                      if (filePart) noiDungGuiAI.push(filePart);
                  }

                  const responseText = await callAIGradingWithRetry(noiDungGuiAI, 3);

                  let duLieuAI = { tilePhanTram: 0, nhanXet: "Lỗi phân tích JSON." }; 
                  try {
                      const jsonCleaned = responseText.replace(/```json|```/g, "").trim();
                      duLieuAI = JSON.parse(jsonCleaned);
                  } catch (e) {
                      const matchPhanTram = responseText.match(/"tilePhanTram"\s*:\s*(\d+)/);
                      if (matchPhanTram) duLieuAI.tilePhanTram = parseInt(matchPhanTram[1]);
                      duLieuAI.nhanXet = "AI đã chấm điểm thành công.";
                  }

                  let phanTramChuan = parseInt(duLieuAI.tilePhanTram);
                  if (isNaN(phanTramChuan)) phanTramChuan = 0;

                  diemCauNay = (phanTramChuan / 100) * pointPerQuestion;
                  isCorrect = phanTramChuan >= 50; 
                  nhanXetTongHop += `- Câu tự luận (${cauHoiGoc.ChuyenDe || 'Chung'}): ${duLieuAI.nhanXet} (Đạt ${phanTramChuan}%). `;

              } catch (aiError) {
                  console.error("AI đã thất bại hoàn toàn sau 3 lần thử:", aiError);
                  diemCauNay = 0;
                  isCorrect = false;
                  aiHoanToanThatBai = true;
                  nhanXetTongHop += `- Câu tự luận: Hệ thống AI quá tải nên không thể chấm (0 điểm). Vui lòng báo Giáo viên. `;
              }
          }
          
          chiTietItem.DiemDatDuoc = Math.round(diemCauNay * 100) / 100;
          
        } else {
          if (cauHoiGoc.LoaiCauHoi === 'TracNghiem' || cauHoiGoc.LoaiCauHoi === 'DungSai') {
            isCorrect = dapAnHocSinh.trim().toUpperCase() === dapAnChuan.trim().toUpperCase();
          } else if (cauHoiGoc.LoaiCauHoi === 'DienKhuyet') {
            isCorrect = dapAnHocSinh.trim().toLowerCase() === dapAnChuan.trim().toLowerCase();
          }
          if (isCorrect) {
            diemCauNay = pointPerQuestion;
          }
          
          // Với trắc nghiệm, điểm phụ thuộc vào isCorrect, tính luôn để lưu vào mảng
          chiTietItem.DiemDatDuoc = isCorrect ? Math.round(diemCauNay * 100) / 100 : 0;
        }

        chiTietItem.LuaChonCuaHocSinh = dapAnHocSinh;
        chiTietItem.KetQuaDungSai = isCorrect;

        mangChiTietDaCham.push(chiTietItem);
      }
    }

    // =========================================================================
    // CÚ CHỐT: VÒNG LẶP AWAIT KẾT THÚC -> BẮT ĐẦU QUÉT MẢNG ĐỂ TÍNH TỔNG ĐIỂM
    // =========================================================================
    const tongDiemHienTai = mangChiTietDaCham.reduce((sum, item) => {
        return sum + (item.DiemDatDuoc || 0);
    }, 0);

    const ketQuaData = {
      MaHocSinh: currentUser._id,
      MaDeThi,
      DiemSo: Math.round(tongDiemHienTai * 100) / 100, 
      ChiTietBaiLam: mangChiTietDaCham,
      DanhGiaKienThuc: nhanXetTongHop.trim() || "Hoàn thành bài thi trắc nghiệm hệ thống."
    };

    const newKetQua = new KetQuaThiThu(ketQuaData);
    await newKetQua.save();

    try {
        if (tongDiemHienTai >= 5) {
            // Tìm các lộ trình hợp lệ của học sinh này
            const loTrinhList = await LoTrinhHocTap.find({
                MaHocSinh: currentUser._id,
                TrangThai: { $in: ['Đã xuất bản', 'Hoàn thiện'] },
                deleted: { $ne: true }
            });

            for (const lt of loTrinhList) {
                const lastEntry = lt.LichSuTienDo?.at(-1);
                const currentDone = lastEntry?.NhiemVuHoanThanh ?? lt.NhiemVuHoanThanh ?? 0;
                const totalTasks = lt.DanhSachNhiemVu.length;

                // Nếu lộ trình chưa hoàn thành hết
                if (currentDone < totalTasks) {
                    const currentTask = lt.DanhSachNhiemVu[currentDone];
                    
                    // Kiểm tra xem nhiệm vụ "đang chờ làm (currentDone)" có KHỚP với bài thi vừa nộp không
                    if (currentTask.LoaiNhiemVu === 'DeThiThu' && currentTask.MaThamChieu.toString() === MaDeThi.toString()) {
                        const newDoneCount = currentDone + 1;
                        const newPercentage = newDoneCount >= totalTasks ? 100 : Math.floor((newDoneCount / totalTasks) * 100);

                        // Cập nhật tiến độ vào DB
                        await LoTrinhHocTap.findByIdAndUpdate(lt._id, {
                            MucDoHoanThanh: newPercentage,
                            NhiemVuHoanThanh: newDoneCount,
                            $push: {
                                LichSuTienDo: {
                                    NgayGhiNhan: new Date(),
                                    MucDoHoanThanh: newPercentage,
                                    NhiemVuHoanThanh: newDoneCount
                                }
                            }
                        });
                    }
                }
            }
        }
    } catch (updateProgressError) {
        console.error("Lỗi tự động cập nhật lộ trình:", updateProgressError);
        // Không return lỗi ở đây để học sinh vẫn nhận được điểm thi bình thường
    }
    // ====================================================================

    res.status(201).json({
        ...newKetQua._doc,
        aiFailed: aiHoanToanThatBai 
    });
  } catch (error) {
    console.error("Lỗi nghiêm trọng tại luồng nộp bài:", error);
    res.status(400).json({ message: "Lỗi lưu kết quả thi", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro === 'HocSinh') {
      return res.status(403).json({ message: "Từ chối truy cập." });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData.MaHocSinh;
    delete updateData.MaDeThi;

    const item = await KetQuaThiThu.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ message: "Không tìm thấy bản ghi" });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const currentUser = await NguoiDung.findById(req.user._id);
    if (!currentUser || currentUser.VaiTro !== 'QuanTriVien') {
      return res.status(403).json({ message: "Chỉ Quản trị viên mới được xóa kết quả thi." });
    }

    await KetQuaThiThu.deleteById(req.params.id, currentUser._id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};