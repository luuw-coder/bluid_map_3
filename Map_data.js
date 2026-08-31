// ============================================================
// MAP DATA v2 — Bản đồ mùa đông, phong cách "board trail" kiểu
// Stickman Party: nhiều hàng ô nối tiếp uốn theo hình chữ S,
// mũi tên chỉ hướng đi, có 2 điểm rẽ nhánh thật (đường ngắn
// nguy hiểm / đường dài an toàn) rồi nhập lại.
// ============================================================

const TILE_TYPES = {
  normal:    { icon: '⬜', label: 'Ô thường',   desc: 'Không có gì' },
  chest:     { icon: '🎁', label: 'Ô rương',     desc: 'Nhận 1 vật phẩm ngẫu nhiên' },
  penalty:   { icon: '💀', label: 'Ô phạt',      desc: '-5 HP, -5 tiền' },
  lucky:     { icon: '🎲', label: 'Ô may mắn',   desc: 'Được lắc xúc xắc thêm 1 lần' },
  territory: { icon: '🟦', label: 'Ô lãnh địa',  desc: 'Chiếm 1-2 ô gần đó làm lãnh địa' },
  mystery:   { icon: '❓', label: 'Ô bí ẩn',     desc: 'Hiệu ứng ngẫu nhiên tốt hoặc xấu' },
  money:     { icon: '💰', label: 'Ô tiền',      desc: '+5 tiền' },
  heal:      { icon: '❤️', label: 'Ô hồi máu',   desc: '+5 HP' },
  double:    { icon: '🎯', label: 'Ô x2',        desc: 'Quay xúc xắc lần 2 để đi tiếp' },
  start:     { icon: '🏁', label: 'Bắt đầu',     desc: 'Điểm xuất phát' },
  finish:    { icon: '👑', label: 'Đích',        desc: 'Điểm kết thúc' },
};

// ------------------------------------------------------------
// LAYOUT: lưới 12 cột x 11 hàng, đường đi uốn chữ S qua từng
// hàng (giống ảnh tham khảo), với 2 đoạn tách thành 2 hàng
// song song (rẽ nhánh) rồi gộp lại.
// ------------------------------------------------------------
// Cách đọc TILES: mỗi ô có id, x, y (toạ độ lưới), type, next[].
// col: 0..11 trái->phải, row: 0..10 trên->dưới.

const TILES = [
  // ===== Hàng 0: đi sang phải =====
  { id: 's0',  x: 0,  y: 0, type: 'start',    next: ['s1'] },
  { id: 's1',  x: 1,  y: 0, type: 'normal',   next: ['s2'] },
  { id: 's2',  x: 2,  y: 0, type: 'money',    next: ['s3'] },
  { id: 's3',  x: 3,  y: 0, type: 'normal',   next: ['s4'] },
  { id: 's4',  x: 4,  y: 0, type: 'chest',    next: ['s5'] },
  { id: 's5',  x: 5,  y: 0, type: 'normal',   next: ['s6'] },
  { id: 's6',  x: 6,  y: 0, type: 'lucky',    next: ['s7'] },
  { id: 's7',  x: 7,  y: 0, type: 'normal',   next: ['s8'] },
  { id: 's8',  x: 8,  y: 0, type: 'territory',next: ['s9'] },
  { id: 's9',  x: 9,  y: 0, type: 'normal',   next: ['s10'] },
  { id: 's10', x: 10, y: 0, type: 'money',    next: ['s11'] },
  { id: 's11', x: 11, y: 0, type: 'normal',   next: ['s12'] },

  // rẽ xuống hàng 1
  { id: 's12', x: 11, y: 1, type: 'chest',    next: ['s13'] },

  // ===== Hàng 1: đi sang trái =====
  { id: 's13', x: 10, y: 1, type: 'normal',   next: ['s14'] },
  { id: 's14', x: 9,  y: 1, type: 'penalty',  next: ['s15'] },
  { id: 's15', x: 8,  y: 1, type: 'normal',   next: ['s16'] },
  { id: 's16', x: 7,  y: 1, type: 'mystery',  next: ['s17'] },
  { id: 's17', x: 6,  y: 1, type: 'normal',   next: ['s18'] },
  { id: 's18', x: 5,  y: 1, type: 'heal',     next: ['s19'] },
  { id: 's19', x: 4,  y: 1, type: 'normal',   next: ['s20'] },
  { id: 's20', x: 3,  y: 1, type: 'money',    next: ['s21'] },
  { id: 's21', x: 2,  y: 1, type: 'normal',   next: ['s22'] },
  { id: 's22', x: 1,  y: 1, type: 'lucky',    next: ['s23'] },

  // rẽ xuống hàng 2
  { id: 's23', x: 0,  y: 1, type: 'normal',   next: ['s24'] },
  { id: 's24', x: 0,  y: 2, type: 'chest',    next: ['branchPoint1'] },

  // ===== ĐIỂM RẼ NHÁNH #1 =====
  // Nhánh nguy hiểm: đi thẳng hàng 2 (ngắn, 6 ô, nhiều rương+phạt)
  // Nhánh an toàn: vòng qua hàng 3 (dài hơn, 9 ô, nhiều hồi máu/tiền)
  { id: 'branchPoint1', x: 1, y: 2, type: 'normal', next: ['dA1', 'dB1'] },

  { id: 'dA1', x: 2,  y: 2, type: 'penalty',  next: ['dA2'] },
  { id: 'dA2', x: 3,  y: 2, type: 'chest',    next: ['dA3'] },
  { id: 'dA3', x: 4,  y: 2, type: 'territory',next: ['dA4'] },
  { id: 'dA4', x: 5,  y: 2, type: 'penalty',  next: ['dA5'] },
  { id: 'dA5', x: 6,  y: 2, type: 'chest',    next: ['mergePoint1'] },

  { id: 'dB1', x: 1,  y: 3, type: 'heal',     next: ['dB2'] },
  { id: 'dB2', x: 2,  y: 3, type: 'normal',   next: ['dB3'] },
  { id: 'dB3', x: 3,  y: 3, type: 'money',    next: ['dB4'] },
  { id: 'dB4', x: 4,  y: 3, type: 'normal',   next: ['dB5'] },
  { id: 'dB5', x: 5,  y: 3, type: 'lucky',    next: ['dB6'] },
  { id: 'dB6', x: 6,  y: 3, type: 'normal',   next: ['mergePoint1'] },

  // ===== HỢP NHẤT #1 =====
  { id: 'mergePoint1', x: 7, y: 2, type: 'double', next: ['s30'] },

  // ===== Hàng 2 tiếp tục, rẽ xuống hàng 4, đi sang phải =====
  { id: 's30', x: 7,  y: 3, type: 'normal',   next: ['s31'] },
  { id: 's31', x: 7,  y: 4, type: 'mystery',  next: ['s32'] },
  { id: 's32', x: 8,  y: 4, type: 'normal',   next: ['s33'] },
  { id: 's33', x: 9,  y: 4, type: 'money',    next: ['s34'] },
  { id: 's34', x: 10, y: 4, type: 'normal',   next: ['s35'] },
  { id: 's35', x: 11, y: 4, type: 'chest',    next: ['s36'] },

  // rẽ xuống hàng 5
  { id: 's36', x: 11, y: 5, type: 'normal',   next: ['s37'] },

  // ===== Hàng 5: đi sang trái =====
  { id: 's37', x: 10, y: 5, type: 'lucky',    next: ['s38'] },
  { id: 's38', x: 9,  y: 5, type: 'normal',   next: ['s39'] },
  { id: 's39', x: 8,  y: 5, type: 'territory',next: ['s40'] },
  { id: 's40', x: 7,  y: 5, type: 'normal',   next: ['s41'] },
  { id: 's41', x: 6,  y: 5, type: 'heal',     next: ['s42'] },
  { id: 's42', x: 5,  y: 5, type: 'normal',   next: ['branchPoint2'] },

  // ===== ĐIỂM RẼ NHÁNH #2 =====
  { id: 'branchPoint2', x: 4, y: 5, type: 'normal', next: ['eA1', 'eB1'] },

  { id: 'eA1', x: 4,  y: 6, type: 'territory',next: ['eA2'] },
  { id: 'eA2', x: 3,  y: 6, type: 'penalty',  next: ['eA3'] },
  { id: 'eA3', x: 3,  y: 5, type: 'chest',    next: ['mergePoint2'] },

  { id: 'eB1', x: 3,  y: 4, type: 'money',    next: ['eB2'] },
  { id: 'eB2', x: 2,  y: 4, type: 'lucky',    next: ['eB3'] },
  { id: 'eB3', x: 2,  y: 5, type: 'normal',   next: ['eB4'] },
  { id: 'eB4', x: 2,  y: 6, type: 'heal',     next: ['mergePoint2'] },

  // ===== HỢP NHẤT #2 =====
  { id: 'mergePoint2', x: 1, y: 6, type: 'double', next: ['s50'] },

  // ===== Hàng 6-8: tiếp tục cuộn xuống, dẫn tới đích =====
  { id: 's50', x: 1,  y: 7, type: 'normal',   next: ['s51'] },
  { id: 's51', x: 2,  y: 7, type: 'chest',    next: ['s52'] },
  { id: 's52', x: 3,  y: 7, type: 'normal',   next: ['s53'] },
  { id: 's53', x: 4,  y: 7, type: 'mystery',  next: ['s54'] },
  { id: 's54', x: 5,  y: 7, type: 'normal',   next: ['s55'] },
  { id: 's55', x: 6,  y: 7, type: 'money',    next: ['s56'] },
  { id: 's56', x: 7,  y: 7, type: 'normal',   next: ['s57'] },
  { id: 's57', x: 8,  y: 7, type: 'territory',next: ['s58'] },
  { id: 's58', x: 9,  y: 7, type: 'normal',   next: ['s59'] },
  { id: 's59', x: 10, y: 7, type: 'lucky',    next: ['s60'] },
  { id: 's60', x: 11, y: 7, type: 'chest',    next: ['s61'] },

  // rẽ xuống hàng 8
  { id: 's61', x: 11, y: 8, type: 'normal',   next: ['s62'] },

  // ===== Hàng 8: đi sang trái, về đích =====
  { id: 's62', x: 10, y: 8, type: 'penalty',  next: ['s63'] },
  { id: 's63', x: 9,  y: 8, type: 'normal',   next: ['s64'] },
  { id: 's64', x: 8,  y: 8, type: 'heal',     next: ['s65'] },
  { id: 's65', x: 7,  y: 8, type: 'normal',   next: ['s66'] },
  { id: 's66', x: 6,  y: 8, type: 'money',    next: ['s67'] },
  { id: 's67', x: 5,  y: 8, type: 'normal',   next: ['s68'] },
  { id: 's68', x: 4,  y: 8, type: 'chest',    next: ['s69'] },
  { id: 's69', x: 3,  y: 8, type: 'normal',   next: ['s70'] },
  { id: 's70', x: 2,  y: 8, type: 'lucky',    next: ['s71'] },
  { id: 's71', x: 1,  y: 8, type: 'territory',next: ['s72'] },
  { id: 's72', x: 0,  y: 8, type: 'normal',   next: ['finish'] },

  { id: 'finish', x: 0, y: 9, type: 'finish', next: [] },
];

// Cạnh thuộc nhánh nguy hiểm / an toàn, dùng để tô màu path khác nhau
const BRANCH_EDGES = {
  danger: [
    ['branchPoint1','dA1'], ['dA1','dA2'], ['dA2','dA3'], ['dA3','dA4'], ['dA4','dA5'], ['dA5','mergePoint1'],
    ['branchPoint2','eA1'], ['eA1','eA2'], ['eA2','eA3'], ['eA3','mergePoint2'],
  ],
  safe: [
    ['branchPoint1','dB1'], ['dB1','dB2'], ['dB2','dB3'], ['dB3','dB4'], ['dB4','dB5'], ['dB5','dB6'], ['dB6','mergePoint1'],
    ['branchPoint2','eB1'], ['eB1','eB2'], ['eB2','eB3'], ['eB3','eB4'], ['eB4','mergePoint2'],
  ],
};

// ------------------------------------------------------------
// Vật trang trí — rải quanh map, tránh đè lên đường đi.
// ------------------------------------------------------------
const DECORATIONS = [
  { icon: '🌲', x: 0.4,  y: 4.4 }, { icon: '🌲', x: 9.5,  y: 2.5 },
  { icon: '🌲', x: 6.2,  y: 6.4 }, { icon: '🌲', x: 3.8,  y: 0.5 },
  { icon: '🌲', x: 11.6, y: 6.4 }, { icon: '🌲', x: 8.4,  y: 9.4 },
  { icon: '🌲', x: 0.6,  y: 6.5 }, { icon: '🌲', x: 5.6,  y: 4.4 },

  { icon: '❄️', x: 2.4,  y: 0.6 }, { icon: '❄️', x: 10.5, y: 3.5 },
  { icon: '❄️', x: 6.5,  y: 1.5 }, { icon: '❄️', x: 8.6,  y: 6.5 },
  { icon: '❄️', x: 4.5,  y: 5.6 },

  { icon: '⛄', x: 9.6,  y: 5.4 }, { icon: '⛄', x: 5.4,  y: 8.6 },
  { icon: '⛄', x: 0.5,  y: 9.4 },

  { icon: '🪨', x: 6.5,  y: 4.6 }, { icon: '🪨', x: 3.5,  y: 3.5 },
  { icon: '🪨', x: 10.5, y: 8.5 },

  { icon: '🧊', x: 8.5,  y: 3.5 }, { icon: '🧊', x: 1.5,  y: 5.5 },
];

const ICE_LAKES = [
  { x: 9.6, y: 1.5, rx: 1.0, ry: 0.7 },
  { x: 5.6, y: 6.5, rx: 1.1, ry: 0.7 },
];

const MAP_CONFIG = { cols: 12, rows: 10 };
