// ============================================================
// MAP RENDERER — vẽ bản đồ SVG từ map-data.js
// ============================================================

const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL = 100; // px logic mỗi ô lưới
const PAD = 140;  // lề quanh map

const svg = document.getElementById('mapSvg');
const world = document.getElementById('world');
const viewport = document.getElementById('viewport');

// Đánh dấu các cạnh (edge) thuộc nhánh "nguy hiểm" hoặc "an toàn" để tô màu riêng
const BRANCH_EDGES = {
  danger: new Set([
    't6->tA1','tA1->tA2','tA2->tA3','tA3->tA4','tA4->tA5','tA5->tMerge1',
    't12->tC1','tC1->tC2','tC2->tC3','tC3->tMerge2',
  ]),
  safe: new Set([
    't6->tB1','tB1->tB2','tB2->tB3','tB3->tB4','tB4->tB5','tB5->tB6','tB6->tMerge1',
    't12->tD1','tD1->tD2','tD2->tD3','tD3->tD4','tD4->tD5','tD5->tMerge2',
  ]),
};

function tileCenter(t) {
  return { cx: PAD + t.x * CELL, cy: PAD + t.y * CELL };
}

function buildTileIndex() {
  const idx = {};
  TILES.forEach(t => idx[t.id] = t);
  return idx;
}
const tileIndex = buildTileIndex();

function mapBounds() {
  const maxX = Math.max(...TILES.map(t => t.x), ...DECORATIONS.map(d => d.x));
  const maxY = Math.max(...TILES.map(t => t.y), ...DECORATIONS.map(d => d.y));
  return {
    width: PAD * 2 + maxX * CELL,
    height: PAD * 2 + maxY * CELL,
  };
}

function el(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// ---------- Vẽ nền tuyết với gợn nhẹ ----------
function drawSnowGround(width, height) {
  const g = el('g', { class: 'snow-ground' });

  const grad = el('radialGradient', { id: 'snowGrad', cx: '50%', cy: '35%', r: '75%' });
  grad.appendChild(el('stop', { offset: '0%', 'stop-color': '#f6fbff' }));
  grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#cfe4f2' }));
  const defs = el('defs');
  defs.appendChild(grad);

  const iceGrad = el('linearGradient', { id: 'iceGrad', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
  iceGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#bfe8fb' }));
  iceGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#6fb8e0' }));
  defs.appendChild(iceGrad);

  svg.appendChild(defs);

  g.appendChild(el('rect', { x: -200, y: -200, width: width + 400, height: height + 400, fill: 'url(#snowGrad)' }));

  // Vài mảng bóng tuyết nhẹ ngẫu nhiên (dạng blob) để nền không phẳng
  const blobs = [
    [width*0.15, height*0.2, 220, 100], [width*0.7, height*0.15, 260, 120],
    [width*0.25, height*0.75, 240, 110], [width*0.85, height*0.7, 200, 100],
    [width*0.5, height*0.5, 300, 140],
  ];
  blobs.forEach(([x,y,rx,ry]) => {
    g.appendChild(el('ellipse', { cx: x, cy: y, rx, ry, fill: '#dceefa', opacity: 0.5 }));
  });

  svg.appendChild(g);
}

// ---------- Vẽ hồ băng ----------
function drawIceLakes() {
  const g = el('g', { class: 'ice-lakes' });
  ICE_LAKES.forEach(lake => {
    const cx = PAD + lake.x * CELL;
    const cy = PAD + lake.y * CELL;
    const rx = lake.rx * CELL;
    const ry = lake.ry * CELL;
    g.appendChild(el('ellipse', { cx, cy, rx, ry, class: 'ice-lake' }));
    g.appendChild(el('ellipse', {
      cx: cx - rx*0.25, cy: cy - ry*0.3, rx: rx*0.35, ry: ry*0.25,
      class: 'ice-lake-highlight'
    }));
  });
  svg.appendChild(g);
}

// ---------- Vẽ path nối các ô ----------
function edgeKey(a, b) { return `${a}->${b}`; }

function branchClassFor(fromId, toId) {
  const key = edgeKey(fromId, toId);
  if (BRANCH_EDGES.danger.has(key)) return 'path-branch-danger';
  if (BRANCH_EDGES.safe.has(key)) return 'path-branch-safe';
  return '';
}

function drawPaths() {
  const gEdge = el('g', { class: 'paths-edge' });
  const gFill = el('g', { class: 'paths-fill' });

  TILES.forEach(t => {
    t.next.forEach(nId => {
      const to = tileIndex[nId];
      if (!to) return;
      const c1 = tileCenter(t);
      const c2 = tileCenter(to);
      const bClass = branchClassFor(t.id, to.id);

      gEdge.appendChild(el('line', {
        x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy,
        class: 'path-line-edge',
      }));
      gFill.appendChild(el('line', {
        x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy,
        class: `path-line ${bClass}`,
      }));
    });
  });

  svg.appendChild(gEdge);
  svg.appendChild(gFill);
}

// ---------- Vẽ trang trí ----------
let decoGroup = null;
function drawDecorations() {
  decoGroup = el('g', { class: 'decorations' });
  DECORATIONS.forEach(d => {
    const cx = PAD + d.x * CELL;
    const cy = PAD + d.y * CELL;
    const t = el('text', { x: cx, y: cy, class: 'deco-icon' });
    t.textContent = d.icon;
    decoGroup.appendChild(t);
  });
  svg.appendChild(decoGroup);
}

// ---------- Vẽ các ô ----------
const tileInfoBox = document.getElementById('tileInfo');
let showNumbers = false;
let tileNumberEls = [];

function drawTiles() {
  const g = el('g', { class: 'tiles' });
  TILES.forEach((t, i) => {
    const { cx, cy } = tileCenter(t);
    const info = TILE_TYPES[t.type];

    const group = el('g', { class: 'tile-group', 'data-tile': t.id });

    const isTerminal = t.type === 'start' || t.type === 'finish';
    const r = isTerminal ? 30 : 26;

    const bg = el('circle', {
      cx, cy, r,
      class: 'tile-bg',
      fill: isTerminal ? '#fff3c4' : '#ffffff',
      stroke: isTerminal ? 'var(--accent-gold)' : '#d8e8f2',
      'stroke-width': isTerminal ? 3 : 2,
    });
    group.appendChild(bg);

    const icon = el('text', { x: cx, y: cy - (isTerminal ? 1 : 0), class: 'tile-icon' });
    icon.textContent = info.icon;
    group.appendChild(icon);

    const numLabel = el('text', {
      x: cx, y: cy + r + 11, class: 'tile-label-num', style: showNumbers ? '' : 'display:none'
    });
    numLabel.textContent = (i + 1).toString();
    numLabel.classList.add('tnum');
    group.appendChild(numLabel);

    group.addEventListener('mouseenter', (ev) => showTileInfo(ev, t, info));
    group.addEventListener('mousemove', (ev) => positionTileInfo(ev));
    group.addEventListener('mouseleave', hideTileInfo);

    g.appendChild(group);
  });
  svg.appendChild(g);
}

function showTileInfo(ev, tile, info) {
  tileInfoBox.style.display = 'block';
  tileInfoBox.innerHTML = `<span class="t-label">${info.icon} ${info.label}</span><br><span class="t-desc">${info.desc}</span>`;
  positionTileInfo(ev);
}
function positionTileInfo(ev) {
  tileInfoBox.style.left = (ev.clientX + 16) + 'px';
  tileInfoBox.style.top = (ev.clientY + 12) + 'px';
}
function hideTileInfo() {
  tileInfoBox.style.display = 'none';
}

// ---------- Legend ----------
function buildLegend() {
  const list = document.getElementById('legendList');
  Object.values(TILE_TYPES).forEach(info => {
    if (info.label === 'Bắt đầu' || info.label === 'Đích') return;
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.innerHTML = `
      <div class="legend-icon">${info.icon}</div>
      <div class="legend-text">
        <div class="label">${info.label}</div>
        <div class="desc">${info.desc}</div>
      </div>
    `;
    list.appendChild(row);
  });
}

// ---------- Pan & Zoom ----------
let scale = 1, minScale = 0.35, maxScale = 2.2;
let panX = 0, panY = 0;
let isDragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;

function applyTransform() {
  world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function centerView(width, height) {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  scale = Math.min(vw / width, vh / height, 1) * 0.92;
  scale = Math.max(scale, minScale);
  panX = (vw - width * scale) / 2;
  panY = (vh - height * scale) / 2;
  applyTransform();
}

viewport.addEventListener('mousedown', (e) => {
  isDragging = true;
  viewport.classList.add('dragging');
  dragStartX = e.clientX; dragStartY = e.clientY;
  panStartX = panX; panStartY = panY;
});
window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  panX = panStartX + (e.clientX - dragStartX);
  panY = panStartY + (e.clientY - dragStartY);
  applyTransform();
});
window.addEventListener('mouseup', () => {
  isDragging = false;
  viewport.classList.remove('dragging');
});

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));
  // zoom relative to cursor
  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const wx = (mx - panX) / scale;
  const wy = (my - panY) / scale;
  scale = newScale;
  panX = mx - wx * scale;
  panY = my - wy * scale;
  applyTransform();
}, { passive: false });

// Touch support (basic pinch + pan)
let touchStartDist = null, touchStartScale = 1;
viewport.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
    panStartX = panX; panStartY = panY;
  } else if (e.touches.length === 2) {
    isDragging = false;
    touchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    touchStartScale = scale;
  }
}, { passive: true });
viewport.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1 && isDragging) {
    panX = panStartX + (e.touches[0].clientX - dragStartX);
    panY = panStartY + (e.touches[0].clientY - dragStartY);
    applyTransform();
  } else if (e.touches.length === 2 && touchStartDist) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    scale = Math.min(maxScale, Math.max(minScale, touchStartScale * (dist / touchStartDist)));
    applyTransform();
  }
}, { passive: true });
viewport.addEventListener('touchend', () => { isDragging = false; touchStartDist = null; });

document.getElementById('zoomIn').addEventListener('click', () => {
  scale = Math.min(maxScale, scale + 0.15);
  applyTransform();
});
document.getElementById('zoomOut').addEventListener('click', () => {
  scale = Math.max(minScale, scale - 0.15);
  applyTransform();
});

// ---------- Toggle controls ----------
document.getElementById('btnToggleDeco').addEventListener('click', (e) => {
  const visible = decoGroup.style.display !== 'none';
  decoGroup.style.display = visible ? 'none' : '';
  e.target.classList.toggle('active', !visible);
});
document.getElementById('btnToggleNum').addEventListener('click', (e) => {
  showNumbers = !showNumbers;
  document.querySelectorAll('.tnum').forEach(n => n.style.display = showNumbers ? '' : 'none');
  e.target.classList.toggle('active', showNumbers);
});
let gridVisible = false, gridGroup = null;
document.getElementById('btnToggleGrid').addEventListener('click', (e) => {
  gridVisible = !gridVisible;
  gridGroup.style.display = gridVisible ? '' : 'none';
  e.target.classList.toggle('active', gridVisible);
});

function drawGrid(width, height) {
  gridGroup = el('g', { class: 'coord-grid', style: 'display:none' });
  for (let x = 0; x <= MAP_CONFIG.cols; x++) {
    gridGroup.appendChild(el('line', {
      x1: PAD + x*CELL, y1: 0, x2: PAD + x*CELL, y2: height,
      stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
    }));
  }
  for (let y = 0; y <= MAP_CONFIG.rows; y++) {
    gridGroup.appendChild(el('line', {
      x1: 0, y1: PAD + y*CELL, x2: width, y2: PAD + y*CELL,
      stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
    }));
  }
  svg.appendChild(gridGroup);
}

document.getElementById('btnReset').addEventListener('click', () => {
  const { width, height } = mapBounds();
  centerView(width, height);
});

// ---------- Init ----------
function init() {
  const { width, height } = mapBounds();
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  drawSnowGround(width, height);
  drawIceLakes();
  drawGrid(width, height);
  drawPaths();
  drawDecorations();
  drawTiles();
  buildLegend();

  centerView(width, height);
}

window.addEventListener('resize', () => {
  const { width, height } = mapBounds();
  centerView(width, height);
});

init();
