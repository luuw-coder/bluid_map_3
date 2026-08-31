// ============================================================
// MAP DATA — Bản đồ mùa đông cho game board 4-6 người
// ============================================================
// Mỗi ô (tile) có:
//   id: định danh duy nhất
//   x, y: toạ độ trên lưới (đơn vị ô, không phải pixel)
//   type: loại ô (xem TILE_TYPES)
//   next: mảng id của (các) ô tiếp theo — >1 phần tử = điểm rẽ nhánh
//
// Toạ độ x tăng dần sang phải, y tăng dần xuống dưới.
// Map được thiết kế dạng "con đường" uốn lượn qua các hàng,
// với 2 điểm rẽ nhánh chính tạo ra lựa chọn "đường nguy hiểm
// nhiều phần thưởng" vs "đường an toàn dài hơn".

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
  finish:    { icon: '🏆', label: 'Đích',        desc: 'Điểm kết thúc' },
};

// Vật trang trí — không nằm trên đường đi, chỉ để trang trí xung quanh map.
// Mỗi vật gồm: icon, x, y (toạ độ tự do, có thể là số thập phân),
// và scale tuỳ ý để tạo cảm giác tự nhiên (không thẳng hàng cứng nhắc).
const DECORATIONS = [
  { icon: '🌲', x: 0.5,  y: 0.8  }, { icon: '🌲', x: 1.3, y: 2.6 },
  { icon: '🌲', x: 2.8,  y: 0.4  }, { icon: '🌲', x: 4.6, y: 1.1 },
  { icon: '🌲', x: 6.4,  y: 3.4  }, { icon: '🌲', x: 7.9, y: 5.6 },
  { icon: '🌲', x: 9.6,  y: 7.4  }, { icon: '🌲', x: 11.2,y: 4.6 },
  { icon: '🌲', x: 12.8, y: 1.2  }, { icon: '🌲', x: 0.8, y: 6.8 },
  { icon: '🌲', x: 3.4,  y: 8.6  }, { icon: '🌲', x: 13.6,y: 8.1 },

  { icon: '❄️', x: 1.9,  y: 1.5 }, { icon: '❄️', x: 5.2, y: 3.9 },
  { icon: '❄️', x: 8.6,  y: 2.1 }, { icon: '❄️', x: 10.4,y: 6.1 },
  { icon: '❄️', x: 2.6,  y: 5.4 }, { icon: '❄️', x: 6.1, y: 7.9 },
  { icon: '❄️', x: 12.1, y: 5.9 },

  { icon: '⛄', x: 3.9,  y: 2.9 }, { icon: '⛄', x: 9.1, y: 4.4 },
  { icon: '⛄', x: 5.8,  y: 6.4 }, { icon: '⛄', x: 11.6,y: 2.4 },

  { icon: '🪨', x: 1.2,  y: 4.1 }, { icon: '🪨', x: 7.2, y: 1.6 },
  { icon: '🪨', x: 10.9, y: 8.4 }, { icon: '🪨', x: 4.1, y: 6.9 },

  { icon: '🧊', x: 0.6,  y: 3.1 }, { icon: '🧊', x: 8.3, y: 6.9 },
  { icon: '🧊', x: 13.1, y: 3.6 },

  // Hồ băng lớn — vẽ riêng dưới dạng vùng, xem renderer
];

const ICE_LAKES = [
  { x: 5.6, y: 5.1, rx: 1.6, ry: 0.9 },
  { x: 11.6, y: 6.9, rx: 1.4, ry: 0.8 },
];

// ------------------------------------------------------------
// PATH — con đường chính với 2 điểm rẽ nhánh
// ------------------------------------------------------------
// Bố cục tổng thể (14 cột x 9 hàng), path uốn zig-zag qua các hàng:
//
//  Hàng 0: START ───────────────────────────►  (rẽ nhánh tại cột 6)
//                                    ┌── nhánh NGUY HIỂM (hàng 1, ngắn, nhiều item)
//  Hàng 1/2: ...................... │
//                                    └── nhánh AN TOÀN (vòng qua hàng 2-3, dài hơn)
//  hai nhánh gộp lại ở cột 10, hàng 3
//  Hàng 3-4: tiếp tục, rẽ nhánh thứ 2 tại cột 10
//  Hàng 5-8: vòng xuống, hợp nhất, dẫn tới FINISH góc dưới phải
//
// next: [] nghĩa là ô cuối (FINISH)

const TILES = [
  // ---- Đoạn mở đầu (hàng 0) ----
  { id: 't0',  x: 0,  y: 0, type: 'start',    next: ['t1'] },
  { id: 't1',  x: 1,  y: 0, type: 'normal',   next: ['t2'] },
  { id: 't2',  x: 2,  y: 0, type: 'money',    next: ['t3'] },
  { id: 't3',  x: 3,  y: 0, type: 'normal',   next: ['t4'] },
  { id: 't4',  x: 4,  y: 0, type: 'chest',    next: ['t5'] },
  { id: 't5',  x: 5,  y: 0, type: 'lucky',    next: ['t6'] },

  // ---- ĐIỂM RẼ NHÁNH #1 tại t6 (cột 6, hàng 0) ----
  { id: 't6',  x: 6,  y: 0, type: 'normal',   next: ['tA1', 'tB1'] },

  // Nhánh A: "NGUY HIỂM" — đi thẳng ngang hàng 0-1, ngắn, đậm đặc item + phạt
  { id: 'tA1', x: 7,  y: 0, type: 'penalty',  next: ['tA2'] },
  { id: 'tA2', x: 8,  y: 0, type: 'chest',    next: ['tA3'] },
  { id: 'tA3', x: 9,  y: 0, type: 'territory',next: ['tA4'] },
  { id: 'tA4', x: 9,  y: 1, type: 'mystery',  next: ['tA5'] },
  { id: 'tA5', x: 9,  y: 2, type: 'chest',    next: ['tMerge1'] },

  // Nhánh B: "AN TOÀN" — vòng xuống dưới, dài hơn, ít nguy hiểm hơn, có hồi máu
  { id: 'tB1', x: 6,  y: 1, type: 'heal',     next: ['tB2'] },
  { id: 'tB2', x: 6,  y: 2, type: 'normal',   next: ['tB3'] },
  { id: 'tB3', x: 7,  y: 2, type: 'money',    next: ['tB4'] },
  { id: 'tB4', x: 8,  y: 2, type: 'normal',   next: ['tB5'] },
  { id: 'tB5', x: 8,  y: 3, type: 'lucky',    next: ['tB6'] },
  { id: 'tB6', x: 9,  y: 3, type: 'normal',   next: ['tMerge1'] },

  // ---- Hai nhánh hợp lại ----
  { id: 'tMerge1', x: 10, y: 3, type: 'double', next: ['t10'] },
  { id: 't10', x: 11, y: 3, type: 'normal',   next: ['t11'] },
  { id: 't11', x: 11, y: 4, type: 'mystery',  next: ['t12'] },

  // ---- ĐIỂM RẼ NHÁNH #2 tại t12 ----
  { id: 't12', x: 11, y: 4, type: 'normal',   next: ['tC1', 'tD1'] },

  // Nhánh C: "NGUY HIỂM" — băng qua hồ băng, ngắn, ô phạt + lãnh địa
  { id: 'tC1', x: 12, y: 4, type: 'territory',next: ['tC2'] },
  { id: 'tC2', x: 12, y: 5, type: 'penalty',  next: ['tC3'] },
  { id: 'tC3', x: 12, y: 6, type: 'chest',    next: ['tMerge2'] },

  // Nhánh D: "AN TOÀN" — vòng qua bên trái, dài hơn, nhiều ô tiền/hồi máu
  { id: 'tD1', x: 10, y: 4, type: 'money',    next: ['tD2'] },
  { id: 'tD2', x: 10, y: 5, type: 'normal',   next: ['tD3'] },
  { id: 'tD3', x: 10, y: 6, type: 'heal',     next: ['tD4'] },
  { id: 'tD4', x: 11, y: 6, type: 'normal',   next: ['tD5'] },
  { id: 'tD5', x: 11, y: 7, type: 'lucky',    next: ['tMerge2'] },

  // ---- Hợp nhất lần 2 ----
  { id: 'tMerge2', x: 12, y: 7, type: 'double', next: ['t20'] },
  { id: 't20', x: 12, y: 8, type: 'normal',   next: ['t21'] },
  { id: 't21', x: 11, y: 8, type: 'chest',    next: ['t22'] },
  { id: 't22', x: 10, y: 8, type: 'territory',next: ['t23'] },
  { id: 't23', x: 9,  y: 8, type: 'normal',   next: ['t24'] },
  { id: 't24', x: 8,  y: 8, type: 'mystery',  next: ['t25'] },
  { id: 't25', x: 7,  y: 8, type: 'money',    next: ['t26'] },
  { id: 't26', x: 6,  y: 8, type: 'normal',   next: ['t27'] },
  { id: 't27', x: 5,  y: 8, type: 'penalty',  next: ['t28'] },
  { id: 't28', x: 4,  y: 8, type: 'heal',     next: ['t29'] },
  { id: 't29', x: 3,  y: 8, type: 'chest',    next: ['t30'] },
  { id: 't30', x: 2,  y: 8, type: 'lucky',    next: ['t31'] },
  { id: 't31', x: 1,  y: 8, type: 'normal',   next: ['t32'] },
  { id: 't32', x: 0,  y: 8, type: 'territory',next: ['tF'] },

  { id: 'tF',  x: 0,  y: 7, type: 'finish',   next: [] },
];

const MAP_CONFIG = {
  cols: 14,
  rows: 9,
  tileSize: 72, // px trên lưới logic — renderer có thể scale
};

if (typeof module !== 'undefined') {
  module.exports = { TILE_TYPES, TILES, DECORATIONS, ICE_LAKES, MAP_CONFIG };
}
