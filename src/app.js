/**
 * AetherBoard Main Application Entry
 * Orchestrates CanvasManager, UIManager, CollaborationManager, State, History, and Canvas mouse/keyboard drivers.
 */

import { CanvasManager } from './canvas-manager.js';
import { UIManager } from './ui-manager.js';

class AetherBoard {
  constructor() {
    this.state = {
      elements: [],
      selectedElementId: null,
      tool: 'select', // 'select' | 'pen' | 'rectangle' | 'circle' | 'arrow' | 'diamond' | 'sticky' | 'eraser'
      zoom: 1.0,
      panX: window.innerWidth / 2,
      panY: window.innerHeight / 2,
      currentUser: {
        name: 'Designer',
        color: '#8B5CF6',
        x: 0,
        y: 0
      },
      history: [],
      historyIndex: -1
    };

    // Subsystem instances
    this.canvas = document.getElementById('paint-canvas');
    this.domOverlay = document.getElementById('canvas-dom-overlay');

    this.canvasManager = new CanvasManager(this.canvas, this.domOverlay);
    this.uiManager = new UIManager(this);

    // Mouse Interaction Tracking States
    this.isMouseDown = false;
    this.isPanning = false;
    this.isDragging = false;
    this.isResizing = false;
    this.activeResizeHandle = null;
    this.dragStartOffset = { x: 0, y: 0 };
    this.panStartOffset = { x: 0, y: 0 };
    this.dragStartCoords = { x: 0, y: 0 };
    this.activeElement = null; // element being currently drawn or manipulated

    this.spacePressed = false;

    // Load elements and canvas sizes instantly on startup
    this.canvasManager.resizeCanvas();
    this.initVolleyballStrategyBoard();
    this.saveHistory();
    this.render();
  }

  /**
   * Bind canvas events & window hooks
   */
  bindInteractions() {
    const canvas = this.canvas;

    // Mouse Listeners
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    
    // Zoom via wheel
    canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Keyboard Hotkeys
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  /**
   * Set active toolbox command
   */
  setTool(tool) {
    this.state.tool = tool;
    this.deselectAll();
    this.uiManager.syncActiveToolUI(tool);
    
    // Standard cursors updating
    if (tool === 'select') {
      this.canvas.style.cursor = 'default';
    } else if (tool === 'eraser') {
      this.canvas.style.cursor = 'crosshair';
    } else if (tool === 'pen') {
      this.canvas.style.cursor = 'cell';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  /**
   * Selection helpers
   */
  selectElement(id) {
    this.state.selectedElementId = id;
    const el = this.state.elements.find(e => e.id === id);
    this.uiManager.showContextToolbar(el);
    this.render();
  }

  deselectAll() {
    this.state.selectedElementId = null;
    this.uiManager.showContextToolbar(null);
    
    // Deselect sticky notes DOM outlines
    document.querySelectorAll('.sticky-note').forEach(note => {
      note.classList.remove('selected');
    });

    this.render();
  }

  deleteElementById(id) {
    this.state.elements = this.state.elements.filter(el => el.id !== id);
    this.uiManager.removeStickyNoteDOM(id);
    
    if (this.state.selectedElementId === id) {
      this.deselectAll();
    }
    
    this.saveHistory();
    this.render();
  }

  deleteSelectedElement() {
    if (this.state.selectedElementId) {
      this.deleteElementById(this.state.selectedElementId);
    }
  }

  /**
   * Update active selections stroke and filling styles
   */
  updateSelectedElementStyle(styles) {
    if (!this.state.selectedElementId) return;
    
    const el = this.state.elements.find(e => e.id === this.state.selectedElementId);
    if (el) {
      Object.assign(el, styles);
      this.saveHistory();
      this.render();
    }
  }

  /**
   * ==========================================================================
   * Canvas Pointer Drivers (Mouse Pan, Drag, Resize, Draw)
   * ==========================================================================
   */

  handleMouseDown(e) {
    this.isMouseDown = true;
    const screenX = e.clientX;
    const screenY = e.clientY;
    
    // Map screen mouse clicks to canvas coords
    const canvasCoords = this.canvasManager.screenToCanvas(
      screenX, screenY, this.state.panX, this.state.panY, this.state.zoom
    );
    
    const { tool, selectedElementId, zoom, elements } = this.state;

    // 1. Check Panning trigger (Spaceheld, Middleclick, or empty canvas click with select tool)
    if (e.button === 1 || this.spacePressed) {
      this.isPanning = true;
      this.panStartOffset = { x: screenX - this.state.panX, y: screenY - this.state.panY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // 2. Select Tool Interactions
    if (tool === 'select') {
      // 2a. Check if clicked a handle of already selected shape
      if (selectedElementId) {
        const selected = elements.find(el => el.id === selectedElementId);
        if (selected && selected.type !== 'sticky') {
          const handle = this.canvasManager.getResizeHandleAtPosition(selected, canvasCoords.x, canvasCoords.y, zoom);
          if (handle) {
            this.isResizing = true;
            this.activeResizeHandle = handle;
            this.activeElement = selected;
            this.dragStartCoords = { x: canvasCoords.x, y: canvasCoords.y };
            return;
          }
        }
      }

      // 2b. Check if clicked a shape
      const hitElement = this.canvasManager.getElementAtPosition(elements, canvasCoords.x, canvasCoords.y, zoom);
      if (hitElement) {
        this.selectElement(hitElement.id);
        this.isDragging = true;
        this.activeElement = hitElement;
        
        // Track offset relative to top left of shape
        this.dragStartOffset = {
          x: canvasCoords.x - hitElement.x,
          y: canvasCoords.y - hitElement.y
        };
        return;
      }

      // 2c. Clicked empty space: deselect and trigger panning
      this.deselectAll();
      this.isPanning = true;
      this.panStartOffset = { x: screenX - this.state.panX, y: screenY - this.state.panY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // 3. Freehand Pen Tool
    if (tool === 'pen') {
      const activeColor = document.querySelector('#accent-color-palette .context-color-btn.active')?.dataset.color || '#8B5CF6';
      const activeWidth = parseInt(document.querySelector('.thickness-btn.active')?.dataset.value) || 2;
      const activeStyle = document.querySelector('.style-btn.active')?.dataset.style || 'solid';

      this.activeElement = {
        id: 'element-' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'pen',
        points: [{ x: canvasCoords.x, y: canvasCoords.y }],
        strokeColor: activeColor,
        strokeWidth: activeWidth,
        strokeStyle: activeStyle
      };
      
      this.state.elements.push(this.activeElement);
      this.render();
      return;
    }

    // 4. Sticky Note Quick Place
    if (tool === 'sticky') {
      const stickyColors = ['pastel-yellow', 'pastel-pink', 'pastel-blue', 'pastel-green', 'pastel-purple'];
      const randomColor = stickyColors[Math.floor(Math.random() * stickyColors.length)];

      const sticky = {
        id: 'sticky-' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'sticky',
        // Center the note exactly on click coordinate
        x: canvasCoords.x - 90,
        y: canvasCoords.y - 90,
        w: 180,
        h: 180,
        text: '',
        noteColor: randomColor,
        rotation: (Math.random() - 0.5) * 4 // slight paper angle
      };

      this.state.elements.push(sticky);
      this.uiManager.renderStickyNoteDOM(sticky);
      this.selectElement(sticky.id);
      
      // Auto-focus the newly created note textarea for slick typography editing
      setTimeout(() => {
        const textNode = document.querySelector(`.sticky-note[data-id="${sticky.id}"] textarea`);
        if (textNode) textNode.focus();
      }, 50);

      this.setTool('select');
      this.saveHistory();
      return;
    }

    // 5. Geometric Canvas Shapes
    if (['rectangle', 'circle', 'diamond', 'arrow'].includes(tool)) {
      const activeColor = document.querySelector('#accent-color-palette .context-color-btn.active')?.dataset.color || '#8B5CF6';
      const fillBtn = document.querySelector('#fill-color-palette .context-color-btn.active');
      const activeFill = fillBtn ? fillBtn.dataset.color : 'transparent';
      const activeWidth = parseInt(document.querySelector('.thickness-btn.active')?.dataset.value) || 2;
      const activeStyle = document.querySelector('.style-btn.active')?.dataset.style || 'solid';

      this.activeElement = {
        id: 'element-' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: tool,
        x: canvasCoords.x,
        y: canvasCoords.y,
        w: 1,
        h: 1,
        strokeColor: activeColor,
        strokeWidth: activeWidth,
        strokeStyle: activeStyle,
        fillColor: activeFill
      };
      
      this.state.elements.push(this.activeElement);
      this.render();
      return;
    }

    // 6. Eraser Tool
    if (tool === 'eraser') {
      const hit = this.canvasManager.getElementAtPosition(elements, canvasCoords.x, canvasCoords.y, zoom);
      if (hit) this.deleteElementById(hit.id);
      return;
    }
  }

  handleMouseMove(e) {
    if (!this.isMouseDown) return;

    const screenX = e.clientX;
    const screenY = e.clientY;
    
    const canvasCoords = this.canvasManager.screenToCanvas(
      screenX, screenY, this.state.panX, this.state.panY, this.state.zoom
    );
    
    const { tool, zoom } = this.state;

    // 1. Execute Panning scroll
    if (this.isPanning) {
      this.state.panX = screenX - this.panStartOffset.x;
      this.state.panY = screenY - this.panStartOffset.y;
      
      this.uiManager.updateStickyNotesView();
      this.render();
      return;
    }

    // 2. Execute Drag Move shape
    if (this.isDragging && this.activeElement) {
      // Calculate target top left coords
      this.activeElement.x = canvasCoords.x - this.dragStartOffset.x;
      this.activeElement.y = canvasCoords.y - this.dragStartOffset.y;
      
      this.render();
      return;
    }

    // 3. Execute Drag Bounding box resizing
    if (this.isResizing && this.activeElement) {
      const el = this.activeElement;
      const handle = this.activeResizeHandle;
      
      const dx = canvasCoords.x - this.dragStartCoords.x;
      const dy = canvasCoords.y - this.dragStartCoords.y;
      
      this.dragStartCoords = { x: canvasCoords.x, y: canvasCoords.y };

      // Resizing math quadrants
      if (handle === 'se') {
        el.w += dx;
        el.h += dy;
      } else if (handle === 'nw') {
        el.x += dx;
        el.y += dy;
        el.w -= dx;
        el.h -= dy;
      } else if (handle === 'ne') {
        el.y += dy;
        el.w += dx;
        el.h -= dy;
      } else if (handle === 'sw') {
        el.x += dx;
        el.w -= dx;
        el.h += dy;
      }

      this.render();
      return;
    }

    // 4. Drawing Pen Stroke
    if (tool === 'pen' && this.activeElement) {
      this.activeElement.points.push({ x: canvasCoords.x, y: canvasCoords.y });
      this.render();
      return;
    }

    // 5. Drawing Shapes (Stretch diagonals)
    if (['rectangle', 'circle', 'diamond', 'arrow'].includes(tool) && this.activeElement) {
      const el = this.activeElement;
      el.w = canvasCoords.x - el.x;
      el.h = canvasCoords.y - el.y;
      this.render();
      return;
    }

    // 6. Active Eraser sweep
    if (tool === 'eraser') {
      const hit = this.canvasManager.getElementAtPosition(this.state.elements, canvasCoords.x, canvasCoords.y, zoom);
      if (hit) this.deleteElementById(hit.id);
      return;
    }
  }

  handleMouseUp(e) {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;
    
    // Cursor handles reset
    if (this.state.tool === 'select') {
      this.canvas.style.cursor = 'default';
    }

    // If an action took place, checkpoint history
    const drewOrManipulated = this.isDragging || this.isResizing || 
                             (this.activeElement && this.state.tool !== 'select');

    this.isDragging = false;
    this.isResizing = false;
    this.isPanning = false;
    this.activeResizeHandle = null;
    this.activeElement = null;

    if (drewOrManipulated) {
      this.saveHistory();
    }
    
    this.render();
  }

  /**
   * Professional center-focused panning & zooming via touchpad pinch / wheel
   */
  handleWheel(e) {
    e.preventDefault();

    const zoomSpeed = 0.05;
    
    // Zoom centered around cursor
    if (e.ctrlKey) {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Mouse position in infinite canvas coords BEFORE scale change
      const cPos = this.canvasManager.screenToCanvas(mouseX, mouseY, this.state.panX, this.state.panY, this.state.zoom);

      // Determine scale multiplier
      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = 1 + direction * zoomSpeed;
      
      let nextZoom = this.state.zoom * factor;
      // Clamp zooms securely between 15% and 400%
      nextZoom = Math.max(0.15, Math.min(4.0, nextZoom));

      // Calculate new pans so point under cursor stays fixed in place!
      this.state.panX = mouseX - cPos.x * nextZoom;
      this.state.panY = mouseY - cPos.y * nextZoom;
      
      this.state.zoom = nextZoom;
    } else {
      // Normal Trackpad scroll panned infinitely
      this.state.panX -= e.deltaX;
      this.state.panY -= e.deltaY;
    }

    this.uiManager.updateStickyNotesView();
    this.render();
  }

  /**
   * Keyboard Hotkeys Manager
   */
  handleKeyDown(e) {
    const isEditingText = document.activeElement.tagName.toLowerCase() === 'textarea' ||
                          document.activeElement.tagName.toLowerCase() === 'input';
    
    if (isEditingText) return;

    const key = e.key.toLowerCase();

    // Space panning trigger
    if (e.code === 'Space') {
      e.preventDefault();
      this.spacePressed = true;
      this.canvas.style.cursor = 'grab';
      return;
    }

    // Ctrl+Z Undo
    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      this.undo();
      return;
    }

    // Ctrl+Y Redo
    if ((e.ctrlKey || e.metaKey) && key === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }

    // Delete selected element
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.deleteSelectedElement();
      return;
    }

    // Bind Quick keys to tools
    switch (key) {
      case 'v': this.setTool('select'); break;
      case 'p': this.setTool('pen'); break;
      case 'n': this.setTool('sticky'); break;
      case 'r': this.setTool('rectangle'); break;
      case 'o': this.setTool('circle'); break;
      case 'd': this.setTool('diamond'); break;
      case 'a': this.setTool('arrow'); break;
      case 'e': this.setTool('eraser'); break;
    }
  }

  handleKeyUp(e) {
    if (e.code === 'Space') {
      this.spacePressed = false;
      this.setTool(this.state.tool); // resets cursor correct style
    }
  }

  /**
   * ==========================================================================
   * Undo/Redo Version Stack Management
   * ==========================================================================
   */

  saveHistory() {
    // Purge future redos
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    }

    // Clean clone vector state elements
    const elementsClone = JSON.parse(JSON.stringify(this.state.elements));
    this.state.history.push(elementsClone);
    
    // Maintain maximum history index of 50 revisions to conserve RAM
    if (this.state.history.length > 50) {
      this.state.history.shift();
    }
    
    this.state.historyIndex = this.state.history.length - 1;
    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      this.applyHistoryIndexState();
    }
  }

  redo() {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      this.applyHistoryIndexState();
    }
  }

  applyHistoryIndexState() {
    const historicalElements = this.state.history[this.state.historyIndex];
    
    // Clear DOM stickies not in historical elements
    document.querySelectorAll('.sticky-note').forEach(noteEl => {
      const id = noteEl.dataset.id;
      const stillExists = historicalElements.some(el => el.id === id);
      if (!stillExists) noteEl.remove();
    });

    // Replace central elements list
    this.state.elements = JSON.parse(JSON.stringify(historicalElements));
    
    // Re-render surviving sticky notes
    this.state.elements.forEach(el => {
      if (el.type === 'sticky') {
        this.uiManager.renderStickyNoteDOM(el);
      }
    });

    this.updateUndoRedoButtons();
    this.render();
  }

  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    undoBtn.disabled = this.state.historyIndex <= 0;
    redoBtn.disabled = this.state.historyIndex >= this.state.history.length - 1;
  }

  /**
   * Main repaint dispatch
   */
  render() {
    // Redraw Canvas elements
    this.canvasManager.drawElements(
      this.state.elements,
      this.state.panX,
      this.state.panY,
      this.state.zoom,
      this.state.selectedElementId
    );

    // Zoom label panel update
    const zoomText = document.getElementById('zoom-indicator');
    if (zoomText) {
      zoomText.textContent = `${Math.round(this.state.zoom * 100)}%`;
    }
  }

  resetView() {
    this.state.zoom = 1.0;
    this.state.panX = window.innerWidth / 2;
    this.state.panY = window.innerHeight / 2;
    
    this.uiManager.updateStickyNotesView();
    this.render();
  }

  /**
   * Volleyball Strategy Layout Initialization
   */
  initVolleyballStrategyBoard() {
    const homeColor = '#3B82F6'; // Vibrant Blue for Home Team
    const awayColor = '#F97316'; // Vibrant Orange for Away Team

    this.state.elements = [
      // 1. Volleyball (Ball)
      {
        id: 'volleyball-ball',
        type: 'ball',
        x: -15,
        y: -15,
        w: 30,
        h: 30,
        strokeColor: '#09090b',
        strokeWidth: 2,
        fillColor: 'transparent'
      },
      // 2. Home Players (Team A - Blue)
      // Rotations: Setter S (Zone 1) and Opposite OPP (Zone 4) are diagonals; OH1 (Zone 2) and OH2 (Zone 5) are diagonals.
      { id: 'player-h1', type: 'player', role: 'S', name: 'Alex (S)', team: 'home', row: 'back', strokeColor: homeColor, x: -350-18, y: 120-18, w: 36, h: 36 },
      { id: 'player-h2', type: 'player', role: 'OPP', name: 'Jordan (OP)', team: 'home', row: 'front', strokeColor: homeColor, x: -120-18, y: -140-18, w: 36, h: 36 },
      { id: 'player-h3', type: 'player', role: 'MB1', name: 'Chris (MB)', team: 'home', row: 'front', strokeColor: homeColor, x: -120-18, y: 0-18, w: 36, h: 36 },
      { id: 'player-h4', type: 'player', role: 'OH1', name: 'Sam (OH)', team: 'home', row: 'front', strokeColor: homeColor, x: -120-18, y: 140-18, w: 36, h: 36 },
      { id: 'player-h5', type: 'player', role: 'OH2', name: 'Taylor (OH)', team: 'home', row: 'back', strokeColor: homeColor, x: -350-18, y: -140-18, w: 36, h: 36 },
      { id: 'player-h6', type: 'player', role: 'L', name: 'Morgan (L)', team: 'home', row: 'back', strokeColor: homeColor, x: -350-18, y: 0-18, w: 36, h: 36 },

      // 3. Away Players (Team B - Orange)
      { id: 'player-a1', type: 'player', role: 'S', name: 'Pat (S)', team: 'away', row: 'back', strokeColor: awayColor, x: 350-18, y: -120-18, w: 36, h: 36 },
      { id: 'player-a2', type: 'player', role: 'OPP', name: 'Kim (OP)', team: 'away', row: 'front', strokeColor: awayColor, x: 120-18, y: 140-18, w: 36, h: 36 },
      { id: 'player-a3', type: 'player', role: 'MB1', name: 'Drew (MB)', team: 'away', row: 'front', strokeColor: awayColor, x: 120-18, y: 0-18, w: 36, h: 36 },
      { id: 'player-a4', type: 'player', role: 'OH1', name: 'Robin (OH)', team: 'away', row: 'front', strokeColor: awayColor, x: 120-18, y: -140-18, w: 36, h: 36 },
      { id: 'player-a5', type: 'player', role: 'OH2', name: 'Val (OH)', team: 'away', row: 'back', strokeColor: awayColor, x: 350-18, y: 140-18, w: 36, h: 36 },
      { id: 'player-a6', type: 'player', role: 'L', name: 'Kelly (L)', team: 'away', row: 'back', strokeColor: awayColor, x: 350-18, y: 0-18, w: 36, h: 36 }
    ];
  }

  /**
   * Plays a playbook strategic snapshot layout transition
   */
  setPlaybookPreset(presetName) {
    let targets = {};

    if (presetName === 'starting_rotation') {
      targets = {
        'volleyball-ball': { x: -15, y: -15 },
        'player-h1': { x: -350-18, y: 120-18 },
        'player-h2': { x: -120-18, y: -140-18 },
        'player-h3': { x: -120-18, y: 0-18 },
        'player-h4': { x: -120-18, y: 140-18 },
        'player-h5': { x: -350-18, y: -140-18 },
        'player-h6': { x: -350-18, y: 0-18 },
        'player-a1': { x: 350-18, y: -120-18 },
        'player-a2': { x: 120-18, y: 140-18 },
        'player-a3': { x: 120-18, y: 0-18 },
        'player-a4': { x: 120-18, y: -140-18 },
        'player-a5': { x: 350-18, y: 140-18 },
        'player-a6': { x: 350-18, y: 0-18 }
      };
    } else if (presetName === 'serve_receive') {
      targets = {
        'volleyball-ball': { x: 480, y: -200 }, // In server's hand (deep right)
        'player-h1': { x: -240-18, y: 160-18 },  // Setter S (back-row) hides deep right behind passing OH1
        'player-h2': { x: -40-18, y: -130-18 },  // Opposite OPP (front-row Zone 4) hides up at net
        'player-h3': { x: -50-18, y: -20-18 },   // Middle MB1 up near net, ready for quicks
        'player-h4': { x: -180-18, y: 110-18 },  // Outside OH1 (front-row Zone 2) drops back to pass
        'player-h5': { x: -300-18, y: -160-18 }, // Outside OH2 drops back deep left to pass
        'player-h6': { x: -320-18, y: 0-18 },    // Libero L drops back deep center to pass
        // Away team serving
        'player-a1': { x: 480-18, y: -160-18 },  // Setter serving deep right
        'player-a2': { x: 80-18, y: 140-18 },
        'player-a3': { x: 80-18, y: 0-18 },
        'player-a4': { x: 80-18, y: -140-18 },
        'player-a5': { x: 260-18, y: 140-18 },
        'player-a6': { x: 260-18, y: 0-18 }
      };
    } else if (presetName === 'base_defense') {
      targets = {
        'volleyball-ball': { x: -15, y: -15 },
        'player-h1': { x: -350-18, y: 120-18 }, // Setter right back
        'player-h2': { x: -40-18, y: -140-18 }, // Left side blocker
        'player-h3': { x: -40-18, y: 0-18 },    // Middle blocker
        'player-h4': { x: -40-18, y: 140-18 },   // Right side blocker
        'player-h5': { x: -350-18, y: -120-18 }, // Outside 2 left back
        'player-h6': { x: -320-18, y: 0-18 },    // Libero middle back
        'player-a1': { x: 350-18, y: -120-18 },
        'player-a2': { x: 40-18, y: 140-18 },
        'player-a3': { x: 40-18, y: 0-18 },
        'player-a4': { x: 40-18, y: -140-18 },
        'player-a5': { x: 350-18, y: 140-18 },
        'player-a6': { x: 350-18, y: 0-18 }
      };
    } else if (presetName === 'double_block') {
      targets = {
        'volleyball-ball': { x: 10, y: -130 },   // Ball is at the net attack point
        'player-h1': { x: -280-18, y: 140-18 }, // Setter covering deep tips
        'player-h2': { x: -25-18, y: -150-18 },  // OH1 forms block at left net
        'player-h3': { x: -25-18, y: -110-18 },  // MB1 closes double block
        'player-h4': { x: -90-18, y: 100-18 },   // OPP drops back off-blocker
        'player-h5': { x: -280-18, y: -150-18 }, // OH2 deep corner defense
        'player-h6': { x: -340-18, y: -40-18 },  // L deep middle back coverage
        // Away team attacking from right-front (Zone 2)
        'player-a1': { x: 80-18, y: 140-18 },   // Setter setting
        'player-a2': { x: 20-18, y: -130-18 },  // OH1 spiking at net
        'player-a3': { x: 60-18, y: 0-18 },
        'player-a4': { x: 240-18, y: -100-18 },
        'player-a5': { x: 320-18, y: 120-18 },
        'player-a6': { x: 280-18, y: 0-18 }
      };
    }

    // Run transition animation
    this.animateToTargets(targets);
  }

  animateToTargets(targets) {
    if (this.playbookAnimFrame) {
      cancelAnimationFrame(this.playbookAnimFrame);
    }

    const duration = 45; // 45 frames (~0.75 seconds)
    let currentFrame = 0;

    // Capture starting points
    const starts = {};
    Object.keys(targets).forEach(id => {
      const el = this.state.elements.find(e => e.id === id);
      if (el) {
        starts[id] = { x: el.x, y: el.y };
      }
    });

    const step = () => {
      currentFrame++;
      const progress = currentFrame / duration;
      
      // Smooth ease-out cubic interpolation
      const ease = 1 - Math.pow(1 - progress, 3);

      Object.keys(targets).forEach(id => {
        const el = this.state.elements.find(e => e.id === id);
        const start = starts[id];
        const target = targets[id];
        
        if (el && start && target) {
          el.x = start.x + (target.x - start.x) * ease;
          el.y = start.y + (target.y - start.y) * ease;
        }
      });

      this.render();

      if (currentFrame < duration) {
        this.playbookAnimFrame = requestAnimationFrame(step);
      } else {
        this.playbookAnimFrame = null;
        this.saveHistory(); // save history once transition finishes
      }
    };

    this.playbookAnimFrame = requestAnimationFrame(step);
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  const board = new AetherBoard();
  board.bindInteractions();
});
