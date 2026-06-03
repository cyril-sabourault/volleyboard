/**
 * UIManager - Floating Panels & DOM Interactivity Engine
 * Controls theme styles, context bars, keyboard hotkeys, and dynamic SVG export routines.
 */

export class UIManager {
  constructor(app) {
    this.app = app;
    
    // Core DOM Elements
    this.domOverlay = document.getElementById('canvas-dom-overlay');
    this.contextToolbar = document.getElementById('context-toolbar');
    
    this.colors = [
      '#8B5CF6', // Purple
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#EC4899', // Pink
      '#F59E0B', // Orange
      '#EF4444', // Red
      '#FFFFFF', // White
      '#6B7280', // Gray
      '#111827'  // Charcoal
    ];

    this.stickyColors = [
      { name: 'pastel-yellow', hex: '#fef08a' },
      { name: 'pastel-pink', hex: '#fecdd3' },
      { name: 'pastel-blue', hex: '#bfdbfe' },
      { name: 'pastel-green', hex: '#bbf7d0' },
      { name: 'pastel-purple', hex: '#ddd6fe' },
      { name: 'charcoal', hex: '#3f3f46' }
    ];

    this.initStylePalette();
    this.setupEventListeners();
  }

  /**
   * Populates the context color sliders with design palettes
   */
  initStylePalette() {
    const strokePalette = document.getElementById('accent-color-palette');
    const fillPalette = document.getElementById('fill-color-palette');

    strokePalette.innerHTML = '';
    fillPalette.innerHTML = '';

    // Add normal stroke options
    this.colors.forEach((color, i) => {
      const btn = document.createElement('button');
      btn.className = `context-color-btn ${i === 0 ? 'active' : ''}`;
      btn.style.setProperty('--btn-color', color);
      btn.dataset.color = color;
      strokePalette.appendChild(btn);
    });

    // Add fill color options (including 'transparent')
    const transBtn = document.createElement('button');
    transBtn.className = 'context-color-btn active';
    transBtn.style.setProperty('--btn-color', 'transparent');
    transBtn.style.border = '2px dashed rgba(255,255,255,0.3)';
    transBtn.dataset.color = 'transparent';
    fillPalette.appendChild(transBtn);

    this.colors.forEach(color => {
      const btn = document.createElement('button');
      btn.className = 'context-color-btn';
      // Low opacity version of solid color for fill
      btn.style.setProperty('--btn-color', color + '20'); 
      btn.dataset.color = color + '20';
      fillPalette.appendChild(btn);
    });
  }

  /**
   * Attaches panel triggers & button actions
   */
  setupEventListeners() {
    // 1. Tool Selection Handlers
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = btn.dataset.tool;
        this.app.setTool(tool);
      });
    });

    // 2. Undo / Redo Click Bindings
    document.getElementById('undo-btn').addEventListener('click', () => this.app.undo());
    document.getElementById('redo-btn').addEventListener('click', () => this.app.redo());

    // 3. Zoom Controllers
    document.getElementById('zoom-in-btn').addEventListener('click', () => this.app.adjustZoom(0.1));
    document.getElementById('zoom-out-btn').addEventListener('click', () => this.app.adjustZoom(-0.1));
    document.getElementById('reset-view-btn').addEventListener('click', () => this.app.resetView());

    // 5. Context Style Bar Controls
    // Stroke color click
    document.getElementById('accent-color-palette').addEventListener('click', (e) => {
      const target = e.target.closest('.context-color-btn');
      if (!target) return;
      
      document.querySelectorAll('#accent-color-palette .context-color-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');
      
      this.app.updateSelectedElementStyle({ strokeColor: target.dataset.color });
    });

    // Fill color click
    document.getElementById('fill-color-palette').addEventListener('click', (e) => {
      const target = e.target.closest('.context-color-btn');
      if (!target) return;

      document.querySelectorAll('#fill-color-palette .context-color-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      this.app.updateSelectedElementStyle({ fillColor: target.dataset.color });
    });

    // Stroke width buttons
    document.querySelectorAll('.thickness-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.thickness-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.app.updateSelectedElementStyle({ strokeWidth: parseInt(btn.dataset.value) });
      });
    });

    // Stroke style buttons
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.app.updateSelectedElementStyle({ strokeStyle: btn.dataset.style });
      });
    });

    // Delete selected element
    document.getElementById('delete-element-btn').addEventListener('click', () => {
      this.app.deleteSelectedElement();
    });

    // 6. Keyboard shortcuts modal triggers
    const shortcutsModal = document.getElementById('shortcuts-modal');
    document.getElementById('shortcuts-trigger-btn').addEventListener('click', () => {
      shortcutsModal.classList.remove('hidden');
    });
    document.getElementById('close-shortcuts-btn').addEventListener('click', () => {
      shortcutsModal.classList.add('hidden');
    });
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) shortcutsModal.classList.add('hidden');
    });

    // 7. High-Res Board Exporter (PNG)
    document.getElementById('export-btn').addEventListener('click', () => this.exportAsPNG());

    // 8. Playbook Strategic Snaps
    document.querySelectorAll('.playbook-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.playbook-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.dataset.preset;
        this.app.setPlaybookPreset(preset);
      });
    });

    document.getElementById('playbook-reset-ball').addEventListener('click', () => {
      this.app.animateToTargets({ 'volleyball-ball': { x: -15, y: -15 } });
    });
  }

  /**
   * Refreshes the side context panel visual triggers based on current selection
   */
  showContextToolbar(element) {
    if (!element) {
      this.contextToolbar.classList.add('hidden');
      return;
    }

    this.contextToolbar.classList.remove('hidden');
    
    // Config panel details according to element type
    const fillGroup = document.getElementById('fill-color-group');
    const widthGroup = document.getElementById('stroke-width-group');
    const styleGroup = document.getElementById('stroke-style-group');

    if (element.type === 'sticky') {
      fillGroup.classList.add('hidden');
      widthGroup.classList.add('hidden');
      styleGroup.classList.add('hidden');
      return;
    }

    fillGroup.classList.remove('hidden');
    widthGroup.classList.remove('hidden');
    styleGroup.classList.remove('hidden');

    // Preselect stroke active color button
    document.querySelectorAll('#accent-color-palette .context-color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === element.strokeColor);
    });

    // Preselect fill active color button
    document.querySelectorAll('#fill-color-palette .context-color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === element.fillColor);
    });

    // Preselect active stroke thickness button
    document.querySelectorAll('.thickness-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value) === element.strokeWidth);
    });

    // Preselect active stroke style button
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === element.strokeStyle);
    });
  }

  /**
   * Renders/updates absolute sticky note HTML elements directly over canvas
   */
  renderStickyNoteDOM(note) {
    let noteEl = document.querySelector(`.sticky-note[data-id="${note.id}"]`);
    
    if (!noteEl) {
      noteEl = document.createElement('div');
      noteEl.className = `sticky-note ${note.noteColor || 'pastel-yellow'}`;
      noteEl.dataset.id = note.id;
      
      // Inside note editor
      const textarea = document.createElement('textarea');
      textarea.value = note.text;
      textarea.placeholder = "Write something...";
      
      // Sync writing with global vector element state
      textarea.addEventListener('input', (e) => {
        note.text = e.target.value;
      });

      textarea.addEventListener('blur', () => {
        this.app.saveHistory();
      });

      // Quick delete bubble
      const delBtn = document.createElement('button');
      delBtn.className = 'sticky-delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.app.deleteElementById(note.id);
      });

      noteEl.appendChild(textarea);
      noteEl.appendChild(delBtn);
      this.domOverlay.appendChild(noteEl);
      
      // Dragging sticky notes inside viewport boundaries
      this.setupStickyDragging(noteEl, note);
    }
    
    // Scale and translate the note according to current canvas zoom & panning
    const { panX, panY, zoom } = this.app.state;
    const screenPos = this.app.canvasManager.canvasToScreen(note.x, note.y, panX, panY, zoom);
    
    noteEl.style.left = `${screenPos.x}px`;
    noteEl.style.top = `${screenPos.y}px`;
    noteEl.style.width = `${note.w * zoom}px`;
    noteEl.style.height = `${note.h * zoom}px`;
    noteEl.style.fontSize = `${14 * zoom}px`;
    noteEl.style.transform = `rotate(${note.rotation || 0}deg)`;

    // Check selected state glow outline
    if (this.app.state.selectedElementId === note.id) {
      noteEl.classList.add('selected');
    } else {
      noteEl.classList.remove('selected');
    }
  }

  setupStickyDragging(noteEl, note) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    noteEl.addEventListener('mousedown', (e) => {
      // Focus textarea normal interaction
      if (e.target.tagName.toLowerCase() === 'textarea' && this.app.state.tool === 'select') {
        this.app.selectElement(note.id);
        return;
      }

      e.preventDefault();
      this.app.selectElement(note.id);
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      noteEl.style.cursor = 'grabbing';
      
      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        
        const dx = (moveEvent.clientX - startX) / this.app.state.zoom;
        const dy = (moveEvent.clientY - startY) / this.app.state.zoom;
        
        note.x += dx;
        note.y += dy;
        
        startX = moveEvent.clientX;
        startY = moveEvent.clientY;
        
        this.renderStickyNoteDOM(note);
      };
      
      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          noteEl.style.cursor = 'grab';
          this.app.saveHistory();
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        }
      };
      
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  /**
   * Syncs all sticky notes with the updated zoom & pan state
   */
  updateStickyNotesView() {
    this.app.state.elements.forEach(el => {
      if (el.type === 'sticky') {
        this.renderStickyNoteDOM(el);
      }
    });
  }

  /**
   * Remove a deleted sticky note element from the DOM view hierarchy
   */
  removeStickyNoteDOM(id) {
    const noteEl = document.querySelector(`.sticky-note[data-id="${id}"]`);
    if (noteEl) {
      noteEl.style.animation = 'scaleUp 0.15s reverse forwards';
      setTimeout(() => noteEl.remove(), 150);
    }
  }

  /**
   * Redraw tools active highlights in UI
   */
  syncActiveToolUI(tool) {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  /**
   * Export the entire canvas including vector paths, shapes, grids, and stickies!
   */
  exportAsPNG() {
    const elements = this.app.state.elements;
    if (elements.length === 0) {
      alert("Canvas is empty! Add shapes or drawings before exporting.");
      return;
    }

    // Determine drawing boundaries to crop beautifully
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    elements.forEach(el => {
      if (el.type === 'pen') {
        el.points.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });
      } else {
        const ex = el.x;
        const ey = el.y;
        const ew = el.w;
        const eh = el.h;
        
        const corners = [
          { x: ex, y: ey },
          { x: ex + ew, y: ey },
          { x: ex + ew, y: ey + eh },
          { x: ex, y: ey + eh }
        ];
        
        corners.forEach(c => {
          if (c.x < minX) minX = c.x;
          if (c.y < minY) minY = c.y;
          if (c.x > maxX) maxX = c.x;
          if (c.y > maxY) maxY = c.y;
        });
      }
    });

    // Add dynamic padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // Create an offscreen canvas to render pristine high-res vectors
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');

    // Draw deep obsidian background
    offCtx.fillStyle = '#0f0f13';
    offCtx.fillRect(0, 0, width, height);

    // Apply translation offset to center crop bounds
    offCtx.save();
    offCtx.translate(-minX, -minY);

    elements.forEach(el => {
      if (el.type === 'sticky') {
        // Draw sticky note onto export canvas using standard rect rendering
        offCtx.save();
        
        // Lookup sticky hex
        const colorClass = this.stickyColors.find(c => c.name === el.noteColor) || this.stickyColors[0];
        offCtx.fillStyle = colorClass.hex;
        
        // Handle rotation transforms
        offCtx.translate(el.x + el.w / 2, el.y + el.h / 2);
        offCtx.rotate((el.rotation || 0) * Math.PI / 180);
        
        // Draw paper card
        offCtx.beginPath();
        offCtx.roundRect(-el.w/2, -el.h/2, el.w, el.h, 6);
        offCtx.fill();
        
        // Render sticky paper shadow simulation overlay
        offCtx.fillStyle = 'rgba(0,0,0,0.1)';
        offCtx.fillRect(-el.w/2, -el.h/2, el.w, 4);

        // Draw note texts inside bounds
        offCtx.fillStyle = el.noteColor === 'charcoal' ? '#ffffff' : '#18181b';
        offCtx.font = "bold 13px 'Inter', sans-serif";
        
        // Wrap text manually in canvas context
        const words = el.text.split(' ');
        let line = '';
        let yPos = -el.h/2 + 25;
        const lineMaxW = el.w - 20;

        for (let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + ' ';
          let metrics = offCtx.measureText(testLine);
          if (metrics.width > lineMaxW && n > 0) {
            offCtx.fillText(line, -el.w/2 + 12, yPos);
            line = words[n] + ' ';
            yPos += 18;
          } else {
            line = testLine;
          }
        }
        offCtx.fillText(line, -el.w/2 + 12, yPos);
        offCtx.restore();
      } else {
        // Render elements using standard routines in canvas-manager
        this.app.canvasManager.drawSingleElement.call({ ctx: offCtx }, el);
      }
    });

    offCtx.restore();

    // Trigger local client image file download
    const link = document.createElement('a');
    link.download = `AetherBoard-${Date.now()}.png`;
    link.href = offCanvas.toDataURL('image/png');
    link.click();
  }
}
