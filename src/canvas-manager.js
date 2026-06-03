/**
 * CanvasManager - High-Performance Canvas Rendering Engine
 * Handles drawing shapes, grid lines, selections, handles, and coordinate mappings.
 */

export class CanvasManager {
  constructor(canvas, domOverlay) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.domOverlay = domOverlay;
    
    // Set grid size for dots
    this.gridSize = 40;
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Translates screen coords to infinite canvas coordinates based on pan & zoom
   */
  screenToCanvas(screenX, screenY, panX, panY, zoom) {
    return {
      x: (screenX - panX) / zoom,
      y: (screenY - panY) / zoom
    };
  }

  /**
   * Translates canvas coordinates to screen coordinates
   */
  canvasToScreen(canvasX, canvasY, panX, panY, zoom) {
    return {
      x: canvasX * zoom + panX,
      y: canvasY * zoom + panY
    };
  }

  /**
   * Draws infinite dot grid and Volleyball Court
   */
  drawGrid(panX, panY, zoom) {
    this.ctx.save();
    
    // Grid dot color (sleek low-opacity light dots for dark theme)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    
    const scaledGrid = this.gridSize * zoom;
    
    // Find the offset where we should start drawing dots
    const offsetX = panX % scaledGrid;
    const offsetY = panY % scaledGrid;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Dot radius scales slightly with zoom but stays readable
    const dotRadius = zoom < 0.5 ? 0.7 : zoom > 1.5 ? 1.5 : 1.0;

    for (let x = offsetX; x < width; x += scaledGrid) {
      for (let y = offsetY; y < height; y += scaledGrid) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    this.ctx.restore();
  }

  /**
   * Draws a highly detailed top-down volleyball court
   */
  drawVolleyballCourt() {
    this.ctx.save();
    
    // 1. Draw Free Zone / Arena floor (Outer bounds)
    // Court dimensions: 18m x 9m. At 1m = 100px: 1800px x 900px
    // Let's scale to fit screen comfortably: 1m = 50px -> Court: 900px x 450px
    const courtW = 900;
    const courtH = 450;
    const halfW = courtW / 2;
    const halfH = courtH / 2;
    const attackDist = 150; // 3m from center
    
    // Draw outer free zone floor (gorgeous warm arena floor)
    this.ctx.fillStyle = 'rgba(249, 115, 22, 0.04)'; // Subtle orange tint
    this.ctx.fillRect(-halfW - 120, -halfH - 80, courtW + 240, courtH + 160);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-halfW - 120, -halfH - 80, courtW + 240, courtH + 160);

    // 2. Draw Court Boundary Fill (Ocean blue volleyball floor)
    this.ctx.fillStyle = 'rgba(14, 165, 233, 0.12)'; // Modern blue court
    this.ctx.fillRect(-halfW, -halfH, courtW, courtH);
    
    // 3. Draw Court Markings (Sidelines & Endlines)
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 4; // Volleyball lines are 5cm thick
    this.ctx.lineCap = 'square';
    this.ctx.lineJoin = 'miter';
    this.ctx.strokeRect(-halfW, -halfH, courtW, courtH);

    // 4. Draw Centerline (directly under the net)
    this.ctx.beginPath();
    this.ctx.moveTo(0, -halfH);
    this.ctx.lineTo(0, halfH);
    this.ctx.stroke();

    // 5. Draw Attack Lines (3-meter lines)
    // Left half attack line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.moveTo(-attackDist, -halfH);
    this.ctx.lineTo(-attackDist, halfH);
    // Right half attack line
    this.ctx.moveTo(attackDist, -halfH);
    this.ctx.lineTo(attackDist, halfH);
    this.ctx.stroke();
    
    // Draw Coach/Sub line markers (dashed lines outside court)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    // Libero replacement zone markings
    this.ctx.beginPath();
    this.ctx.moveTo(-attackDist, -halfH - 10);
    this.ctx.lineTo(-attackDist, -halfH - 30);
    this.ctx.moveTo(attackDist, -halfH - 10);
    this.ctx.lineTo(attackDist, -halfH - 30);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 6. Draw Net (Top View)
    // Draw net straps extending past sidelines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -halfH - 40);
    this.ctx.lineTo(0, halfH + 40);
    this.ctx.stroke();

    // Net body (translucent mesh)
    this.ctx.fillStyle = 'rgba(15, 15, 20, 0.85)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.fillRect(-6, -halfH - 20, 12, courtH + 40);
    this.ctx.strokeRect(-6, -halfH - 20, 12, courtH + 40);
    
    // Draw Net grid lines pattern inside net
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    for (let y = -halfH - 20; y <= halfH + 20; y += 8) {
      this.ctx.moveTo(-6, y);
      this.ctx.lineTo(6, y);
    }
    this.ctx.stroke();

    // Draw antennas (Red/White stripes at court boundary limits)
    const drawAntenna = (y) => {
      this.ctx.save();
      this.ctx.lineWidth = 4;
      // White base
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.moveTo(-3, y - 10);
      this.ctx.lineTo(3, y - 10);
      this.ctx.moveTo(-3, y + 10);
      this.ctx.lineTo(3, y + 10);
      this.ctx.stroke();
      
      // Red stripes
      this.ctx.strokeStyle = '#EF4444';
      this.ctx.beginPath();
      this.ctx.moveTo(-3, y - 5);
      this.ctx.lineTo(3, y - 5);
      this.ctx.moveTo(-3, y + 5);
      this.ctx.lineTo(3, y + 5);
      this.ctx.moveTo(-3, y);
      this.ctx.lineTo(3, y);
      this.ctx.stroke();
      this.ctx.restore();
    };
    drawAntenna(-halfH);
    drawAntenna(halfH);

    this.ctx.restore();
  }

  /**
   * Redraw all vector canvas elements
   */
  drawElements(elements, panX, panY, zoom, selectedElementId, activeDrawingElement = null) {
    this.clear();
    this.drawGrid(panX, panY, zoom);
    
    this.ctx.save();
    // Apply pan and zoom transform
    this.ctx.translate(panX, panY);
    this.ctx.scale(zoom, zoom);
    
    // Render the strategic volleyball court background first
    this.drawVolleyballCourt();
    
    // Render static saved elements
    elements.forEach(element => {
      if (element.type !== 'sticky') { // Sticky notes are DOM elements
        this.drawSingleElement(element);
      }
    });

    // Draw active drawing shape (ghost preview while dragging cursor)
    if (activeDrawingElement && activeDrawingElement.type !== 'sticky') {
      this.drawSingleElement(activeDrawingElement);
    }
    
    // Render bounding boxes around selected elements
    if (selectedElementId) {
      const selected = elements.find(el => el.id === selectedElementId);
      if (selected && selected.type !== 'sticky') {
        this.drawSelectionOutline(selected);
      }
    }
    
    this.ctx.restore();
  }

  /**
   * Renders a single vector element onto canvas context
   */
  drawSingleElement(el) {
    this.ctx.save();
    
    // Config line style
    this.ctx.strokeStyle = el.strokeColor || '#8B5CF6';
    this.ctx.lineWidth = el.strokeWidth || 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    if (el.strokeStyle === 'dashed') {
      this.ctx.setLineDash([el.strokeWidth * 3, el.strokeWidth * 3]);
    } else {
      this.ctx.setLineDash([]);
    }

    const fillColor = el.fillColor || 'transparent';

    switch (el.type) {
      case 'player':
        this.drawPlayerJersey(el);
        break;

      case 'ball':
        this.drawVolleyball(el);
        break;
      case 'pen':
        if (el.points && el.points.length > 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(el.points[0].x, el.points[0].y);
          
          for (let i = 1; i < el.points.length; i++) {
            // Draw smooth quadratic bezier curve segments instead of stiff straight segments
            const xc = (el.points[i].x + el.points[i - 1].x) / 2;
            const yc = (el.points[i].y + el.points[i - 1].y) / 2;
            this.ctx.quadraticCurveTo(el.points[i - 1].x, el.points[i - 1].y, xc, yc);
          }
          
          // Draw final segment line if points exist
          if (el.points.length > 1) {
            const last = el.points[el.points.length - 1];
            this.ctx.lineTo(last.x, last.y);
          }
          this.ctx.stroke();
        }
        break;

      case 'rectangle':
        this.ctx.beginPath();
        // Modern rounded corners for rectangle vector cards
        const r = Math.min(8, Math.abs(el.w) / 4, Math.abs(el.h) / 4);
        if (r > 0) {
          this.ctx.roundRect(el.x, el.y, el.w, el.h, r);
        } else {
          this.ctx.rect(el.x, el.y, el.w, el.h);
        }
        if (fillColor !== 'transparent') {
          this.ctx.fillStyle = fillColor;
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;

      case 'circle':
        this.ctx.beginPath();
        const rx = el.w / 2;
        const ry = el.h / 2;
        const cx = el.x + rx;
        const cy = el.y + ry;
        
        // Use ellipse to handle unequal stretching
        this.ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        
        if (fillColor !== 'transparent') {
          this.ctx.fillStyle = fillColor;
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;

      case 'diamond':
        this.ctx.beginPath();
        this.ctx.moveTo(el.x + el.w / 2, el.y); // Top
        this.ctx.lineTo(el.x + el.w, el.y + el.h / 2); // Right
        this.ctx.lineTo(el.x + el.w / 2, el.y + el.h); // Bottom
        this.ctx.lineTo(el.x, el.y + el.h / 2); // Left
        this.ctx.closePath();
        
        if (fillColor !== 'transparent') {
          this.ctx.fillStyle = fillColor;
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;

      case 'arrow':
        const x1 = el.x;
        const y1 = el.y;
        const x2 = el.x + el.w;
        const y2 = el.y + el.h;
        
        // Draw the shaft line
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        // Draw the arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = Math.max(10, el.strokeWidth * 4); // Scale head with stroke width
        
        this.ctx.fillStyle = el.strokeColor || '#8B5CF6';
        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
          x2 - headLength * Math.cos(angle - Math.PI / 6),
          y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
          x2 - headLength * Math.cos(angle + Math.PI / 6),
          y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
        break;
    }
    
    this.ctx.restore();
  }

  /**
   * Draws sleek designer bounding boxes with handles
   */
  drawSelectionOutline(el) {
    this.ctx.save();
    
    // Sleek glowing selection outline
    this.ctx.strokeStyle = '#8B5CF6';
    this.ctx.lineWidth = 1.5;
    
    // Draw outer boundary
    this.ctx.beginPath();
    this.ctx.rect(el.x, el.y, el.w, el.h);
    this.ctx.stroke();
    
    // Draw 4 corner handles
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#8B5CF6';
    this.ctx.lineWidth = 1.5;
    
    const handleSize = 7;
    const half = handleSize / 2;
    
    const corners = [
      { x: el.x, y: el.y, cursor: 'nwse-resize' }, // Top Left
      { x: el.x + el.w, y: el.y, cursor: 'nesw-resize' }, // Top Right
      { x: el.x + el.w, y: el.y + el.h, cursor: 'nwse-resize' }, // Bottom Right
      { x: el.x, y: el.y + el.h, cursor: 'nesw-resize' } // Bottom Left
    ];
    
    corners.forEach(corner => {
      this.ctx.beginPath();
      this.ctx.rect(corner.x - half, corner.y - half, handleSize, handleSize);
      this.ctx.fill();
      this.ctx.stroke();
    });
    
    this.ctx.restore();
  }

  /**
   * Checks if coordinate is near selection handles and returns the handle type
   */
  getResizeHandleAtPosition(el, canvasX, canvasY, zoom) {
    const threshold = 8 / zoom; // Increase hit detection box at lower zooms
    
    const corners = [
      { x: el.x, y: el.y, type: 'nw' },
      { x: el.x + el.w, y: el.y, type: 'ne' },
      { x: el.x + el.w, y: el.y + el.h, type: 'se' },
      { x: el.x, y: el.y + el.h, type: 'sw' }
    ];

    for (let corner of corners) {
      if (
        Math.abs(canvasX - corner.x) <= threshold &&
        Math.abs(canvasY - corner.y) <= threshold
      ) {
        return corner.type;
      }
    }
    
    return null;
  }

  /**
   * Checks which shape is hit by the cursor (returns closest element)
   */
  getElementAtPosition(elements, canvasX, canvasY, zoom) {
    // Traverse from back to front (reverse order so top element gets selected first)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'sticky') continue; // Sticky note hits handled via DOM natively

      if (this.isPointNearElement(el, canvasX, canvasY, zoom)) {
        return el;
      }
    }
    return null;
  }

  isPointNearElement(el, px, py, zoom) {
    const threshold = 6 / zoom; // scale clicking tolerance
    
    const minX = Math.min(el.x, el.x + el.w);
    const maxX = Math.max(el.x, el.x + el.w);
    const minY = Math.min(el.y, el.y + el.h);
    const maxY = Math.max(el.y, el.y + el.h);

    switch (el.type) {
      case 'player':
      case 'ball':
        const radius = Math.abs(el.w) / 2;
        const centerX = el.x + radius;
        const centerY = el.y + radius;
        const distSq = (px - centerX) ** 2 + (py - centerY) ** 2;
        return distSq <= (radius + threshold) ** 2;

      case 'rectangle':
        // Check outline boundary or internal space (if filled)
        const inside = px >= minX && px <= maxX && py >= minY && py <= maxY;
        if (el.fillColor && el.fillColor !== 'transparent') return inside;
        
        // Outlines hit testing
        const nearLeft = Math.abs(px - minX) <= threshold && py >= minY && py <= maxY;
        const nearRight = Math.abs(px - maxX) <= threshold && py >= minY && py <= maxY;
        const nearTop = Math.abs(py - minY) <= threshold && px >= minX && px <= maxX;
        const nearBottom = Math.abs(py - maxY) <= threshold && px >= minX && px <= maxX;
        return nearLeft || nearRight || nearTop || nearBottom;

      case 'circle':
        const rx = el.w / 2;
        const ry = el.h / 2;
        const cx = el.x + rx;
        const cy = el.y + ry;
        
        // Calculate point relative to ellipse center
        const dx = px - cx;
        const dy = py - cy;
        
        // Ellipse equation value (<= 1 inside, ~= 1 boundary)
        const val = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        
        if (el.fillColor && el.fillColor !== 'transparent') {
          return val <= 1.05;
        } else {
          return Math.abs(val - 1.0) <= 0.15; // tolerance
        }

      case 'diamond':
        // Check inside bounds roughly for filled, then outline
        const midX = el.x + el.w / 2;
        const midY = el.y + el.h / 2;
        
        // Diamond equation normalized distance
        const dist = Math.abs(px - midX) / (el.w / 2) + Math.abs(py - midY) / (el.h / 2);
        
        if (el.fillColor && el.fillColor !== 'transparent') {
          return dist <= 1.0;
        }
        return Math.abs(dist - 1.0) <= 0.15;

      case 'arrow':
        // Line segment hit test
        return this.isPointNearLine(el.x, el.y, el.x + el.w, el.y + el.h, px, py, threshold);

      case 'pen':
        // Check all segments of freehand drawing
        if (!el.points || el.points.length < 2) return false;
        for (let i = 1; i < el.points.length; i++) {
          const p1 = el.points[i - 1];
          const p2 = el.points[i];
          if (this.isPointNearLine(p1.x, p1.y, p2.x, p2.y, px, py, threshold + (el.strokeWidth / 2))) {
            return true;
          }
        }
        return false;
    }
    
    return false;
  }

  /**
   * Renders a highly polished circular Player jersey on the canvas
   */
  drawPlayerJersey(el) {
    const r = Math.abs(el.w) / 2;
    const cx = el.x + r;
    const cy = el.y + r;
    
    this.ctx.save();
    
    // Sleek shadow for player circles
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetY = 3;
    
    // Outer highlight ring
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fillStyle = el.strokeColor || '#8B5CF6';
    this.ctx.fill();
    
    // Jersey white outline border
    this.ctx.shadowColor = 'transparent'; // Reset shadow for outline
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    this.ctx.lineWidth = 2.5;
    if (el.row === 'back') {
      this.ctx.setLineDash([4, 3]);
    } else {
      this.ctx.setLineDash([]);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]); // Reset line dash immediately

    // Inner glowing ring
    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Role abbreviation text (e.g. S, OH1, MB1)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(el.role || 'P', cx, cy);
    
    this.ctx.restore();
    
    // Player name floating capsule tag below circle
    if (el.name) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(15, 15, 20, 0.85)';
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.lineWidth = 1;
      
      this.ctx.font = "600 10px 'Inter', sans-serif";
      const textW = this.ctx.measureText(el.name).width;
      const padX = 6;
      const padY = 2;
      const capW = textW + padX * 2;
      const capH = 14 + padY * 2;
      
      const capX = cx - capW / 2;
      const capY = cy + r + 6;
      
      this.ctx.beginPath();
      this.ctx.roundRect(capX, capY, capW, capH, 5);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.fillStyle = el.team === 'home' ? '#c084fc' : '#fda4af'; // light colored names
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(el.name, cx, capY + padY + 1);
      
      this.ctx.restore();
    }
  }

  /**
   * Draws a beautiful yellow-and-blue professional volleyball ball
   */
  drawVolleyball(el) {
    const r = Math.abs(el.w) / 2;
    const cx = el.x + r;
    const cy = el.y + r;
    
    this.ctx.save();
    
    // Volleyball Shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetY = 4;

    // Draw base white background circle
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    
    // Stroke outline boundary
    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = '#09090b';
    this.ctx.lineWidth = 2.0;
    this.ctx.stroke();
    
    // Create clipped panel boundary to keep panels inside circular shape
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.clip();
    
    // Draw signature blue panel swooshes
    this.ctx.fillStyle = '#1E3A8A'; // mikasa deep blue
    this.ctx.beginPath();
    this.ctx.arc(cx - r, cy, r * 1.3, -Math.PI / 3, Math.PI / 3);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(cx + r, cy, r * 1.3, Math.PI * 2/3, Math.PI * 4/3);
    this.ctx.fill();
    
    // Draw signature bright yellow panels
    this.ctx.fillStyle = '#FACC15'; // mikasa yellow
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - r, r * 1.15, Math.PI / 6, Math.PI * 5 / 6);
    this.ctx.fill();
    
    // Draw black panel seams (arcs)
    this.ctx.strokeStyle = 'rgba(15, 15, 20, 0.45)';
    this.ctx.lineWidth = 1.8;
    
    this.ctx.beginPath();
    this.ctx.arc(cx - r, cy, r * 1.3, -Math.PI / 3, Math.PI / 3);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(cx + r, cy, r * 1.3, Math.PI * 2/3, Math.PI * 4/3);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - r, r * 1.15, Math.PI / 6, Math.PI * 5 / 6);
    this.ctx.stroke();

    // Highlights for sphere 3D look
    const grad = this.ctx.createRadialGradient(cx - r/3, cy - r/3, 1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  isPointNearLine(x1, y1, x2, y2, px, py, threshold) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) <= threshold;
    
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t)); // Clamp to line segment
    
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    
    const distance = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    return distance <= threshold;
  }
}
