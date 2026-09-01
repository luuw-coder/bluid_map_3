// ============================================================
// MAP RENDERER v3 — phong cách "adventure board" kiểu Stickman
// Party: ô tròn dạng nút bấm nổi khối, path be/kem uốn tự nhiên,
// nền texture cỏ/tuyết loang màu, mũi tên tròn xanh dương.
// ============================================================
console.log('[map-render] script loaded');

(function () {
  try {
    if (typeof TILES === 'undefined') {
      throw new Error('TILES chưa được định nghĩa — kiểm tra map-data.js có được nạp TRƯỚC map-render.js không, và tên file có khớp hoa/thường không.');
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const CELL = 96;
    const PAD = 100;

    const svg = document.getElementById('mapSvg');
    const world = document.getElementById('world');
    const viewport = document.getElementById('viewport');

    if (!svg || !world || !viewport) {
      throw new Error('Không tìm thấy #mapSvg / #world / #viewport trong index.html');
    }

    function el(tag, attrs = {}) {
      const e = document.createElementNS(SVG_NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }

    // seeded pseudo-random để texture ổn định giữa các lần render
    function mulberry32(seed) {
      return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(20260901);

    const tileIndex = {};
    TILES.forEach(t => tileIndex[t.id] = t);

    function tileCenter(t) {
      return { cx: PAD + t.x * CELL, cy: PAD + t.y * CELL };
    }

    function mapBounds() {
      const maxX = Math.max(...TILES.map(t => t.x), ...DECORATIONS.map(d => d.x));
      const maxY = Math.max(...TILES.map(t => t.y), ...DECORATIONS.map(d => d.y));
      return { width: PAD * 2 + maxX * CELL, height: PAD * 2 + maxY * CELL };
    }

    const branchEdgeKey = (a, b) => a + '>' + b;
    const dangerSet = new Set((BRANCH_EDGES.danger || []).map(([a,b]) => branchEdgeKey(a,b)));
    const safeSet = new Set((BRANCH_EDGES.safe || []).map(([a,b]) => branchEdgeKey(a,b)));
    function branchClass(a, b) {
      const k = branchEdgeKey(a, b);
      if (dangerSet.has(k)) return 'edge-danger';
      if (safeSet.has(k)) return 'edge-safe';
      return 'edge-normal';
    }

    // Bảng màu icon theo loại ô — dùng cho vòng ngoài ô (giống nút màu trong ảnh tham khảo)
    const TYPE_RING = {
      normal:    { ring: '#8fb5e0', fill: '#eaf3ff' },
      chest:     { ring: '#e0a94a', fill: '#fff3d9' },
      penalty:   { ring: '#d9564a', fill: '#ffe1de' },
      lucky:     { ring: '#5aa8e0', fill: '#e4f3ff' },
      territory: { ring: '#4a7fd9', fill: '#dbe8ff' },
      mystery:   { ring: '#b05ad9', fill: '#f2e0ff' },
      money:     { ring: '#e0c23a', fill: '#fff8d6' },
      heal:      { ring: '#4ad98a', fill: '#dcffec' },
      double:    { ring: '#e08a3a', fill: '#ffe9d2' },
      start:     { ring: '#4ad98a', fill: '#dcffec' },
      finish:    { ring: '#e0c23a', fill: '#fff3c4' },
    };

    // ---------- nền texture đất/tuyết ----------
    function drawBackground(width, height) {
      const defs = el('defs');

      const groundGrad = el('linearGradient', { id: 'groundGrad', x1: '0%', y1: '0%', x2: '30%', y2: '100%' });
      groundGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#dff2ff' }));
      groundGrad.appendChild(el('stop', { offset: '55%', 'stop-color': '#bfe3f7' }));
      groundGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#a9d6ef' }));
      defs.appendChild(groundGrad);

      // gradient dùng cho các ô nút bấm (trên sáng dưới tối, hiệu ứng nổi khối)
      const btnGrad = el('radialGradient', { id: 'btnGrad', cx: '35%', cy: '30%', r: '75%' });
      btnGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#ffffff' }));
      btnGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#eef6fb' }));
      defs.appendChild(btnGrad);

      svg.appendChild(defs);

      svg.appendChild(el('rect', {
        x: -400, y: -400, width: width + 800, height: height + 800,
        fill: 'url(#groundGrad)',
      }));

      // Mảng "đất tuyết" loang màu ngẫu nhiên (giống mảng cỏ đậm/nhạt trong ảnh tham khảo)
      const patchGroup = el('g', { class: 'ground-patches' });
      const patchCount = 46;
      for (let i = 0; i < patchCount; i++) {
        const x = rand() * width;
        const y = rand() * height;
        const r = 60 + rand() * 130;
        const shade = rand();
        const fill = shade < 0.5 ? '#d3ecfb' : (shade < 0.8 ? '#c3e4f5' : '#e8f6ff');
        patchGroup.appendChild(el('ellipse', {
          cx: x, cy: y, rx: r, ry: r * (0.55 + rand() * 0.3),
          fill, opacity: 0.5,
        }));
      }
      svg.appendChild(patchGroup);
    }

    function drawIceLakes() {
      const g = el('g', { class: 'ice-lakes' });
      (ICE_LAKES || []).forEach(lake => {
        const cx = PAD + lake.x * CELL, cy = PAD + lake.y * CELL;
        const rx = lake.rx * CELL, ry = lake.ry * CELL;
        g.appendChild(el('ellipse', { cx: cx+6, cy: cy+8, rx, ry, fill: '#6fb3d6', opacity: 0.35 }));
        g.appendChild(el('ellipse', { cx, cy, rx, ry, fill: '#9fdcf5', opacity: 0.85, stroke: '#ffffff', 'stroke-width': 3 }));
        g.appendChild(el('ellipse', { cx: cx-rx*0.28, cy: cy-ry*0.32, rx: rx*0.32, ry: ry*0.2, fill: '#ffffff', opacity: 0.55 }));
      });
      svg.appendChild(g);
    }

    // ---------- path be/kem dạng "con đường mòn" ----------
    function drawPaths() {
      const gShadow = el('g', { class: 'path-shadow' });
      const gCasing = el('g', { class: 'path-casing' });
      const gFill = el('g', { class: 'path-fill' });
      const gArrows = el('g', { class: 'path-arrows' });

      TILES.forEach(t => {
        t.next.forEach(nId => {
          const to = tileIndex[nId];
          if (!to) { console.warn('[map-render] Cạnh trỏ tới ô không tồn tại:', t.id, '->', nId); return; }
          const c1 = tileCenter(t);
          const c2 = tileCenter(to);
          const cls = branchClass(t.id, to.id);

          gShadow.appendChild(el('line', {
            x1: c1.cx, y1: c1.cy + 5, x2: c2.cx, y2: c2.cy + 5,
            class: 'path-shadow-line',
          }));
          gCasing.appendChild(el('line', {
            x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy,
            class: 'path-casing-line',
          }));
          gFill.appendChild(el('line', {
            x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy,
            class: `path-fill-line ${cls}`,
          }));

          const mx = (c1.cx + c2.cx) / 2;
          const my = (c1.cy + c2.cy) / 2;
          const angle = Math.atan2(c2.cy - c1.cy, c2.cx - c1.cx) * 180 / Math.PI;

          const arrowGroup = el('g', { transform: `translate(${mx},${my}) rotate(${angle})`, class: 'path-arrow-group' });
          arrowGroup.appendChild(el('circle', { r: 15, class: 'path-arrow-bg' }));
          arrowGroup.appendChild(el('polygon', { points: '-5,-7 7,0 -5,7', class: 'path-arrow-tri' }));
          gArrows.appendChild(arrowGroup);
        });
      });

      svg.appendChild(gShadow);
      svg.appendChild(gCasing);
      svg.appendChild(gFill);
      svg.appendChild(gArrows);
    }

    // ---------- trang trí (rừng + băng giá kết hợp) ----------
    let decoGroup = null;
    function drawDecorations() {
      decoGroup = el('g', { class: 'decorations' });
      (DECORATIONS || []).forEach(d => {
        const cx = PAD + d.x * CELL, cy = PAD + d.y * CELL;
        const wrap = el('g', { transform: `translate(${cx},${cy})` });
        wrap.appendChild(el('ellipse', { cx: 2, cy: 14, rx: 16, ry: 5, class: 'deco-shadow' }));
        const t = el('text', { x: 0, y: 0, class: 'deco-icon' });
        t.textContent = d.icon;
        wrap.appendChild(t);
        decoGroup.appendChild(wrap);
      });
      svg.appendChild(decoGroup);
    }

    // ---------- ô dạng nút bấm nổi khối ----------
    const tileInfoBox = document.getElementById('tileInfo');
    let showNumbers = false;

    function drawTiles() {
      const g = el('g', { class: 'tiles' });
      TILES.forEach((t, i) => {
        const { cx, cy } = tileCenter(t);
        const info = TILE_TYPES[t.type] || { icon: '?', label: t.type, desc: '' };
        const colors = TYPE_RING[t.type] || TYPE_RING.normal;
        const isTerminal = t.type === 'start' || t.type === 'finish';
        const r = isTerminal ? 30 : 26;

        const group = el('g', { class: 'tile-group', 'data-tile': t.id });

        // đế bóng dưới ô (tạo hiệu ứng nổi khối)
        group.appendChild(el('circle', { cx: cx, cy: cy + 4, r: r, class: 'tile-shadow' }));

        // vòng ngoài màu theo loại ô
        group.appendChild(el('circle', {
          cx, cy, r: r + 4, fill: colors.ring, class: 'tile-ring',
        }));
        // mặt nút chính
        group.appendChild(el('circle', {
          cx, cy, r, fill: 'url(#btnGrad)', class: 'tile-face',
          stroke: colors.ring, 'stroke-width': 2,
        }));
        // highlight nhỏ góc trên trái tạo độ bóng
        group.appendChild(el('ellipse', {
          cx: cx - r*0.35, cy: cy - r*0.4, rx: r*0.35, ry: r*0.2,
          fill: '#ffffff', opacity: 0.6, class: 'tile-highlight',
        }));

        const icon = el('text', { x: cx, y: cy + 1, class: 'tile-icon' });
        icon.textContent = info.icon;
        group.appendChild(icon);

        const numLabel = el('text', {
          x: cx, y: cy + r + 16, class: 'tile-num tnum',
          style: showNumbers ? '' : 'display:none',
        });
        numLabel.textContent = (i + 1).toString();
        group.appendChild(numLabel);

        group.addEventListener('mouseenter', ev => showTileInfo(ev, info));
        group.addEventListener('mousemove', positionTileInfo);
        group.addEventListener('mouseleave', hideTileInfo);
        group.addEventListener('touchstart', ev => showTileInfo(ev.touches[0], info), { passive: true });

        g.appendChild(group);
      });
      svg.appendChild(g);
    }

    function showTileInfo(ev, info) {
      if (!tileInfoBox) return;
      tileInfoBox.style.display = 'block';
      tileInfoBox.innerHTML = `<span class="t-label">${info.icon} ${info.label}</span><br><span class="t-desc">${info.desc}</span>`;
      positionTileInfo(ev);
    }
    function positionTileInfo(ev) {
      if (!tileInfoBox) return;
      tileInfoBox.style.left = (ev.clientX + 16) + 'px';
      tileInfoBox.style.top = (ev.clientY + 12) + 'px';
    }
    function hideTileInfo() { if (tileInfoBox) tileInfoBox.style.display = 'none'; }

    // ---------- legend ----------
    function buildLegend() {
      const list = document.getElementById('legendList');
      if (!list) return;
      Object.entries(TILE_TYPES).forEach(([key, info]) => {
        if (key === 'start' || key === 'finish') return;
        const colors = TYPE_RING[key] || TYPE_RING.normal;
        const row = document.createElement('div');
        row.className = 'legend-row';
        row.innerHTML = `
          <div class="legend-icon" style="background:${colors.fill};border-color:${colors.ring}">${info.icon}</div>
          <div class="legend-text">
            <div class="label">${info.label}</div>
            <div class="desc">${info.desc}</div>
          </div>`;
        list.appendChild(row);
      });
    }

    // ---------- pan & zoom ----------
    let scale = 1, minScale = 0.35, maxScale = 2.4;
    let panX = 0, panY = 0;
    let isDragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;

    function applyTransform() {
      world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    function centerView(width, height) {
      const vw = viewport.clientWidth || window.innerWidth;
      const vh = viewport.clientHeight || window.innerHeight;
      scale = Math.max(Math.min(vw / width, vh / height, 1) * 0.94, minScale);
      panX = (vw - width * scale) / 2;
      panY = (vh - height * scale) / 2;
      applyTransform();
    }

    viewport.addEventListener('mousedown', e => {
      isDragging = true;
      viewport.classList.add('dragging');
      dragStartX = e.clientX; dragStartY = e.clientY;
      panStartX = panX; panStartY = panY;
    });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      panX = panStartX + (e.clientX - dragStartX);
      panY = panStartY + (e.clientY - dragStartY);
      applyTransform();
    });
    window.addEventListener('mouseup', () => { isDragging = false; viewport.classList.remove('dragging'); });

    viewport.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));
      const rect = viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const wx = (mx - panX) / scale, wy = (my - panY) / scale;
      scale = newScale;
      panX = mx - wx * scale;
      panY = my - wy * scale;
      applyTransform();
    }, { passive: false });

    let touchStartDist = null, touchStartScale = 1;
    viewport.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        isDragging = true;
        dragStartX = e.touches[0].clientX; dragStartY = e.touches[0].clientY;
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
    viewport.addEventListener('touchmove', e => {
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

    function bindButton(id, fn) {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', fn);
    }

    bindButton('zoomIn', () => { scale = Math.min(maxScale, scale + 0.15); applyTransform(); });
    bindButton('zoomOut', () => { scale = Math.max(minScale, scale - 0.15); applyTransform(); });

    bindButton('btnToggleDeco', (e) => {
      if (!decoGroup) return;
      const visible = decoGroup.style.display !== 'none';
      decoGroup.style.display = visible ? 'none' : '';
      e.target.classList.toggle('active', !visible);
    });
    bindButton('btnToggleNum', (e) => {
      showNumbers = !showNumbers;
      document.querySelectorAll('.tnum').forEach(n => n.style.display = showNumbers ? '' : 'none');
      e.target.classList.toggle('active', showNumbers);
    });

    let gridGroup = null, gridVisible = false;
    function drawGrid(width, height) {
      gridGroup = el('g', { class: 'coord-grid', style: 'display:none' });
      for (let x = 0; x <= MAP_CONFIG.cols; x++) {
        gridGroup.appendChild(el('line', { x1: PAD+x*CELL, y1: 0, x2: PAD+x*CELL, y2: height, stroke: 'rgba(0,0,0,0.08)', 'stroke-width': 1 }));
      }
      for (let y = 0; y <= MAP_CONFIG.rows; y++) {
        gridGroup.appendChild(el('line', { x1: 0, y1: PAD+y*CELL, x2: width, y2: PAD+y*CELL, stroke: 'rgba(0,0,0,0.08)', 'stroke-width': 1 }));
      }
      svg.appendChild(gridGroup);
    }
    bindButton('btnToggleGrid', (e) => {
      gridVisible = !gridVisible;
      if (gridGroup) gridGroup.style.display = gridVisible ? '' : 'none';
      e.target.classList.toggle('active', gridVisible);
    });

    bindButton('btnReset', () => {
      const { width, height } = mapBounds();
      centerView(width, height);
    });

    // ---------- init ----------
    function init() {
      const { width, height } = mapBounds();
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      drawBackground(width, height);
      drawIceLakes();
      drawGrid(width, height);
      drawPaths();
      drawDecorations();
      drawTiles();
      buildLegend();

      centerView(width, height);
      console.log('[map-render] Vẽ map thành công:', TILES.length, 'ô');
    }

    window.addEventListener('resize', () => {
      const { width, height } = mapBounds();
      centerView(width, height);
    });

    init();
  } catch (err) {
    console.error('[map-render] LỖI:', err);
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:20px;left:20px;right:20px;background:#c0392b;color:#fff;padding:16px;border-radius:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;';
    box.textContent = 'Lỗi khi vẽ bản đồ: ' + (err && err.message ? err.message : err);
    document.body.appendChild(box);
  }
})();
