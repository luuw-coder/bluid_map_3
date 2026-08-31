// ============================================================
// MAP RENDERER v2
// ============================================================
console.log('[map-render] script loaded');

(function () {
  try {
    if (typeof TILES === 'undefined') {
      throw new Error('TILES chưa được định nghĩa — kiểm tra map-data.js có được nạp TRƯỚC map-render.js không, và tên file có khớp hoa/thường không.');
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const CELL = 92;
    const PAD = 90;

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

    // ---------- nền ----------
    function drawBackground(width, height) {
      const defs = el('defs');
      const grad = el('linearGradient', { id: 'groundGrad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
      grad.appendChild(el('stop', { offset: '0%', 'stop-color': '#eaf6ff' }));
      grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#cfe7f7' }));
      defs.appendChild(grad);
      svg.appendChild(defs);

      svg.appendChild(el('rect', {
        x: -300, y: -300, width: width + 600, height: height + 600,
        fill: 'url(#groundGrad)',
      }));

      // vài mảng bóng tuyết nhẹ
      const blobs = [
        [width*0.12, height*0.15, 200, 90], [width*0.75, height*0.1, 240, 110],
        [width*0.3, height*0.7, 220, 100], [width*0.85, height*0.65, 210, 100],
        [width*0.55, height*0.4, 260, 120],
      ];
      blobs.forEach(([x,y,rx,ry]) => {
        svg.appendChild(el('ellipse', { cx: x, cy: y, rx, ry, fill: '#dcf0fb', opacity: 0.55 }));
      });
    }

    function drawIceLakes() {
      const g = el('g', { class: 'ice-lakes' });
      (ICE_LAKES || []).forEach(lake => {
        const cx = PAD + lake.x * CELL, cy = PAD + lake.y * CELL;
        const rx = lake.rx * CELL, ry = lake.ry * CELL;
        g.appendChild(el('ellipse', { cx, cy, rx, ry, fill: '#8fd3ef', opacity: 0.6 }));
        g.appendChild(el('ellipse', { cx: cx-rx*0.25, cy: cy-ry*0.3, rx: rx*0.35, ry: ry*0.25, fill: '#fff', opacity: 0.35 }));
      });
      svg.appendChild(g);
    }

    // ---------- path + mũi tên ----------
    function drawPaths() {
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

          gCasing.appendChild(el('line', {
            x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy,
            class: 'path-casing-line',
          }));
          gFill.appendChild(el('line', {
            x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy,
            class: `path-fill-line ${cls}`,
          }));

          // mũi tên ở điểm giữa cạnh, xoay theo hướng đi
          const mx = (c1.cx + c2.cx) / 2;
          const my = (c1.cy + c2.cy) / 2;
          const angle = Math.atan2(c2.cy - c1.cy, c2.cx - c1.cx) * 180 / Math.PI;
          const arrow = el('polygon', {
            points: '-8,-6 8,0 -8,6',
            transform: `translate(${mx},${my}) rotate(${angle})`,
            class: 'path-arrow',
          });
          gArrows.appendChild(arrow);
        });
      });

      svg.appendChild(gCasing);
      svg.appendChild(gFill);
      svg.appendChild(gArrows);
    }

    // ---------- trang trí ----------
    let decoGroup = null;
    function drawDecorations() {
      decoGroup = el('g', { class: 'decorations' });
      (DECORATIONS || []).forEach(d => {
        const cx = PAD + d.x * CELL, cy = PAD + d.y * CELL;
        const t = el('text', { x: cx, y: cy, class: 'deco-icon' });
        t.textContent = d.icon;
        decoGroup.appendChild(t);
      });
      svg.appendChild(decoGroup);
    }

    // ---------- ô ----------
    const tileInfoBox = document.getElementById('tileInfo');
    let showNumbers = false;

    function drawTiles() {
      const g = el('g', { class: 'tiles' });
      TILES.forEach((t, i) => {
        const { cx, cy } = tileCenter(t);
        const info = TILE_TYPES[t.type] || { icon: '?', label: t.type, desc: '' };
        const isTerminal = t.type === 'start' || t.type === 'finish';
        const r = isTerminal ? 27 : 24;

        const group = el('g', { class: 'tile-group', 'data-tile': t.id });

        group.appendChild(el('circle', {
          cx, cy, r,
          class: 'tile-bg',
          fill: isTerminal ? '#fff3c4' : '#ffffff',
          stroke: isTerminal ? '#f2c14e' : '#cfe3f0',
          'stroke-width': isTerminal ? 3 : 2,
        }));

        const icon = el('text', { x: cx, y: cy, class: 'tile-icon' });
        icon.textContent = info.icon;
        group.appendChild(icon);

        const numLabel = el('text', {
          x: cx, y: cy + r + 12, class: 'tile-num tnum',
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
      Object.values(TILE_TYPES).forEach(info => {
        if (info.label === 'Bắt đầu' || info.label === 'Đích') return;
        const row = document.createElement('div');
        row.className = 'legend-row';
        row.innerHTML = `
          <div class="legend-icon">${info.icon}</div>
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
