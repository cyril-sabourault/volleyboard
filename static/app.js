// Entry point for the volleyball strategy board
window.onload = function () {
    const canvas = document.getElementById('court-canvas');
    const ctx = canvas.getContext('2d');
    let orientation = null; // will be set by loadCourtState or default

    function getMaxCourtSize() {
        const padding = 16; // smaller margin for better fit
        const toolbarHeight = document.getElementById('toolbar').offsetHeight;
        const maxWidth = window.innerWidth - padding;
        const maxHeight = window.innerHeight - toolbarHeight - padding;
        if (orientation === 'horizontal') {
            // 2:1 aspect ratio
            let width = maxWidth;
            let height = width / 2;
            if (height > maxHeight) {
                height = maxHeight;
                width = height * 2;
            }
            return { width, height };
        } else {
            // 1:2 aspect ratio
            let height = maxHeight;
            let width = height / 2;
            if (width > maxWidth) {
                width = maxWidth;
                height = width * 2;
            }
            return { width, height };
        }
    }

    // Set canvas size
    function setCanvasSize() {
        const size = getMaxCourtSize();
        canvas.width = size.width;
        canvas.height = size.height;
    }

    // Draw volleyball court (basic)
    function drawCourt() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e0cda9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        if (orientation === 'horizontal') {
            // Center line
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.stroke();
            // Attack lines (3m from net, which is 1/6 of court width)
            const attackDist = canvas.width / 6;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - attackDist, 0);
            ctx.lineTo(canvas.width / 2 - attackDist, canvas.height);
            ctx.moveTo(canvas.width / 2 + attackDist, 0);
            ctx.lineTo(canvas.width / 2 + attackDist, canvas.height);
            ctx.strokeStyle = '#888';
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Center line
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
            // Attack lines (3m from net, which is 1/6 of court height)
            const attackDist = canvas.height / 6;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2 - attackDist);
            ctx.lineTo(canvas.width, canvas.height / 2 - attackDist);
            ctx.moveTo(0, canvas.height / 2 + attackDist);
            ctx.lineTo(canvas.width, canvas.height / 2 + attackDist);
            ctx.strokeStyle = '#888';
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function redraw() {
        setCanvasSize();
        drawCourt();
    }

    // Toolbar button event (now rotate)
    const rotateBtn = document.getElementById('rotate-court');
    rotateBtn.addEventListener('click', function () {
        // Before changing orientation, transform all arrows' coordinates (clockwise)
        arrows.forEach(a => {
            // Clockwise: (x, y) -> (1 - y, x)
            [a.rx1, a.ry1] = [1 - a.ry1, a.rx1];
            [a.rx2, a.ry2] = [1 - a.ry2, a.rx2];
        });
        orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
        persistAndRedraw();
    });

    // Burger menu functionality for mobile
    const burgerMenu = document.getElementById('burger-menu');
    const navbarMenu = document.querySelector('.navbar-menu');
    burgerMenu.addEventListener('click', function () {
        navbarMenu.classList.toggle('active');
    });

    window.addEventListener('resize', redraw);

    // --- Utility: convert between absolute and relative coordinates ---
    function toRelative(x, y) {
        return { rx: x / canvas.width, ry: y / canvas.height };
    }
    function toAbsolute(rx, ry) {
        return { x: rx * canvas.width, y: ry * canvas.height };
    }

    // --- Arrow Tool Logic ---
    let arrows = [];
    let currentArrow = null;
    let dragMode = null; // 'move', 'resize-start', 'resize-end', or null
    let dragOffset = { x: 0, y: 0 };
    let dragArrowIndex = -1;

    // Arrow style controls
    const insertArrowBtn = document.getElementById('insert-arrow');
    const arrowWidthSel = document.getElementById('arrow-width');
    const arrowColorSel = document.getElementById('arrow-color');
    const arrowHeadChk = document.getElementById('arrow-head');

    // Defaults for new arrows
    let defaultArrowWidth = 4;
    let defaultArrowColor = '#d32f2f';
    let defaultArrowHead = true;

    let arrowInsertMode = false;

    // Update style controls from selected arrow, or set defaults
    function updateArrowControlsFromSelection() {
        const sel = arrows.find(a => a.selected);
        if (sel) {
            arrowWidthSel.value = sel.width || 4;
            arrowColorSel.value = sel.color || '#d32f2f';
            arrowHeadChk.checked = sel.head !== false;
        } else {
            arrowWidthSel.value = defaultArrowWidth;
            arrowColorSel.value = defaultArrowColor;
            arrowHeadChk.checked = defaultArrowHead;
        }
    }

    // When controls change, update selected arrow or defaults
    arrowWidthSel.addEventListener('change', function () {
        const val = parseInt(this.value);
        const sel = arrows.find(a => a.selected);
        if (sel) { sel.width = val; persistAndRedraw(); }
        else defaultArrowWidth = val;
    });
    arrowColorSel.addEventListener('input', function () {
        const val = this.value;
        const sel = arrows.find(a => a.selected);
        if (sel) { sel.color = val; persistAndRedraw(); }
        else defaultArrowColor = val;
    });
    arrowHeadChk.addEventListener('change', function () {
        const val = this.checked;
        const sel = arrows.find(a => a.selected);
        if (sel) { sel.head = val; persistAndRedraw(); }
        else defaultArrowHead = val;
    });

    insertArrowBtn.addEventListener('click', function () {
        arrowInsertMode = true;
        canvas.style.cursor = 'crosshair';
        // Deselect all arrows
        arrows.forEach(a => a.selected = false);
        updateArrowControlsFromSelection();
    });

    // Update drawArrows to use relative coordinates
    function drawArrows() {
        ctx.save();
        arrows.forEach(arrow => {
            const start = toAbsolute(arrow.rx1, arrow.ry1);
            const end = toAbsolute(arrow.rx2, arrow.ry2);
            ctx.strokeStyle = arrow.color || '#d32f2f';
            ctx.lineWidth = arrow.width || 4;
            ctx.fillStyle = arrow.color || '#d32f2f';
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            if (arrow.head !== false) {
                drawArrowhead(start.x, start.y, end.x, end.y, arrow.color || '#d32f2f');
            }
            if (arrow.selected) {
                drawHandle(start.x, start.y);
                drawHandle(end.x, end.y);
            }
        });
        ctx.restore();
    }

    function drawArrowhead(x1, y1, x2, y2, color) {
        const headlen = 18;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.save();
        ctx.fillStyle = color || '#d32f2f';
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 7), y2 - headlen * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 7), y2 - headlen * Math.sin(angle + Math.PI / 7));
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 7), y2 - headlen * Math.sin(angle - Math.PI / 7));
        ctx.fill();
        ctx.restore();
    }

    function drawHandle(x, y) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function redrawAll() {
        redraw();
        drawArrows();
        updateDebug();
    }

    // --- Debug and Clear State ---
    // Add debug output for orientation
    function updateDebug() {
        let dbg = document.getElementById('debug-orientation');
        if (!dbg) {
            dbg = document.createElement('div');
            dbg.id = 'debug-orientation';
            dbg.style.position = 'fixed';
            dbg.style.bottom = '8px';
            dbg.style.right = '16px';
            dbg.style.background = 'rgba(0,0,0,0.7)';
            dbg.style.color = '#fff';
            dbg.style.padding = '4px 12px';
            dbg.style.borderRadius = '6px';
            dbg.style.fontSize = '1em';
            dbg.style.zIndex = 1000;
            document.body.appendChild(dbg);
        }
        dbg.textContent = 'Orientation: ' + orientation;
    }

    // Add clear state button to toolbar
    const toolbar = document.getElementById('toolbar');
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-state';
    clearBtn.title = 'Clear Court';
    clearBtn.style.marginLeft = '16px';
    clearBtn.style.display = 'flex';
    clearBtn.style.alignItems = 'center';
    clearBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="7" width="10" height="9" rx="2" stroke="#222" stroke-width="2"/><path d="M3 7h14" stroke="#222" stroke-width="2"/><path d="M8 7V5a2 2 0 0 1 4 0v2" stroke="#222" stroke-width="2"/></svg><span style="margin-left:6px;">Clear</span>`;
    toolbar.appendChild(clearBtn);
    clearBtn.addEventListener('click', function () {
        arrows = [];
        localStorage.removeItem('volleyCourtState');
        persistAndRedraw();
        updateDebug();
    });

    // --- Local Storage Persistence ---
    function saveCourtState() {
        const state = {
            orientation,
            arrows: arrows.map(a => ({ ...a, selected: false })) // don't persist selection
        };
        localStorage.setItem('volleyCourtState', JSON.stringify(state));
    }
    function loadCourtState() {
        const stateStr = localStorage.getItem('volleyCourtState');
        if (!stateStr) {
            orientation = 'horizontal';
            return;
        }
        try {
            const state = JSON.parse(stateStr);
            orientation = state.orientation || 'horizontal';
            if (Array.isArray(state.arrows)) arrows = state.arrows;
        } catch (e) { orientation = 'horizontal'; }
    }

    // Call load on startup (before any drawing or event setup)
    loadCourtState();
    // Redraw everything after loading state
    redrawAll();

    // Save on every relevant change
    function persistAndRedraw() {
        saveCourtState();
        redrawAll();
        updateDebug();
    }

    arrowWidthSel.addEventListener('change', function () {
        const val = parseInt(this.value);
        const sel = arrows.find(a => a.selected);
        if (sel) { sel.width = val; persistAndRedraw(); }
        else defaultArrowWidth = val;
    });
    arrowColorSel.addEventListener('input', function () {
        const val = this.value;
        const sel = arrows.find(a => a.selected);
        if (sel) { sel.color = val; persistAndRedraw(); }
        else defaultArrowColor = val;
    });
    arrowHeadChk.addEventListener('change', function () {
        const val = this.checked;
        const sel = arrows.find(a => a.selected);
        if (sel) { sel.head = val; persistAndRedraw(); }
        else defaultArrowHead = val;
    });
    canvas.addEventListener('mouseup', function (e) {
        if (arrowInsertMode && currentArrow) {
            arrows.push(currentArrow);
            currentArrow = null;
            startPt = null;
            arrowInsertMode = false;
            canvas.style.cursor = '';
            persistAndRedraw();
            updateArrowControlsFromSelection();
        } else if (dragMode) {
            dragMode = null;
            dragArrowIndex = -1;
        }
    });

    // Mouse events for arrow tool
    let startPt = null;
    canvas.addEventListener('mousedown', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (arrowInsertMode) {
            startPt = { x: mx, y: my };
            const relStart = toRelative(mx, my);
            currentArrow = {
                rx1: relStart.rx, ry1: relStart.ry, rx2: relStart.rx, ry2: relStart.ry, selected: true,
                width: defaultArrowWidth,
                color: defaultArrowColor,
                head: defaultArrowHead
            };
        } else {
            // Check for handle hover (resize zone)
            dragArrowIndex = arrows.findIndex(a => {
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                return isNearHandle(mx, my, s.x, s.y) || isNearHandle(mx, my, e.x, e.y);
            });
            if (dragArrowIndex !== -1) {
                selectOnlyArrow(dragArrowIndex);
                const a = arrows[dragArrowIndex];
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                if (isNearHandle(mx, my, s.x, s.y)) {
                    dragMode = 'resize-start';
                } else {
                    dragMode = 'resize-end';
                }
                dragOffset = { x: mx, y: my };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Check for line hover (move zone)
            dragArrowIndex = arrows.findIndex(a => {
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                return isNearLine(mx, my, { x1: s.x, y1: s.y, x2: e.x, y2: e.y });
            });
            if (dragArrowIndex !== -1) {
                selectOnlyArrow(dragArrowIndex);
                const a = arrows[dragArrowIndex];
                a.selected = true;
                dragMode = 'move';
                dragOffset = { x: mx, y: my };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Deselect all if not clicking on any arrow
            arrows.forEach(a => a.selected = false);
            redrawAll();
            updateArrowControlsFromSelection();
        }
    });

    canvas.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (arrowInsertMode && startPt && currentArrow) {
            const relEnd = toRelative(mx, my);
            currentArrow.rx2 = relEnd.rx;
            currentArrow.ry2 = relEnd.ry;
            redrawAll();
            // Draw preview
            const s = toAbsolute(currentArrow.rx1, currentArrow.ry1);
            const ept = toAbsolute(currentArrow.rx2, currentArrow.ry2);
            ctx.save();
            ctx.strokeStyle = '#1976d2';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(ept.x, ept.y);
            ctx.stroke();
            drawArrowhead(s.x, s.y, ept.x, ept.y);
            ctx.restore();
        } else if (dragMode && dragArrowIndex !== -1) {
            const a = arrows[dragArrowIndex];
            const s = toAbsolute(a.rx1, a.ry1), ept = toAbsolute(a.rx2, a.ry2);
            if (dragMode === 'move') {
                const dx = mx - dragOffset.x;
                const dy = my - dragOffset.y;
                const newS = toRelative(s.x + dx, s.y + dy);
                const newE = toRelative(ept.x + dx, ept.y + dy);
                a.rx1 = newS.rx; a.ry1 = newS.ry; a.rx2 = newE.rx; a.ry2 = newE.ry;
                dragOffset = { x: mx, y: my };
            } else if (dragMode === 'resize-start') {
                const rel = toRelative(mx, my);
                a.rx1 = rel.rx; a.ry1 = rel.ry;
            } else if (dragMode === 'resize-end') {
                const rel = toRelative(mx, my);
                a.rx2 = rel.rx; a.ry2 = rel.ry;
            }
            persistAndRedraw();
        }
    });

    canvas.addEventListener('mouseup', function (e) {
        if (arrowInsertMode && currentArrow) {
            arrows.push(currentArrow);
            currentArrow = null;
            startPt = null;
            arrowInsertMode = false;
            canvas.style.cursor = '';
            persistAndRedraw();
            updateArrowControlsFromSelection();
        } else if (dragMode) {
            dragMode = null;
            dragArrowIndex = -1;
        }
    });

    // --- Cursor feedback for arrows ---
    function updateCursor(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (arrowInsertMode) {
            canvas.style.cursor = 'crosshair';
            return;
        }
        // Check for handle hover (resize zone)
        for (const a of arrows) {
            if (isNearHandle(mx, my, a.x1, a.y1) || isNearHandle(mx, my, a.x2, a.y2)) {
                // Determine direction for better UX (optional: use pointer for now)
                canvas.style.cursor = 'pointer';
                return;
            }
        }
        // Check for line hover (move zone)
        for (const a of arrows) {
            if (isNearLine(mx, my, a)) {
                canvas.style.cursor = 'grab';
                return;
            }
        }
        canvas.style.cursor = '';
    }
    canvas.addEventListener('mousemove', updateCursor);
    canvas.addEventListener('mouseleave', function () { canvas.style.cursor = ''; });

    function isNearHandle(mx, my, x, y) {
        return Math.hypot(mx - x, my - y) < 12;
    }
    function isNearLine(mx, my, a) {
        // Distance from point to line segment
        const { x1, y1, x2, y2 } = a;
        const A = mx - x1, B = my - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        const dist = Math.hypot(mx - xx, my - yy);
        return dist < 10;
    }

    // Redraw arrows on resize/orientation change
    const origRedraw = redraw;
    redraw = function () {
        origRedraw();
        drawArrows();
    };

    // Utility: Deselect all arrows except one (by index)
    function selectOnlyArrow(idx) {
        arrows.forEach((a, i) => a.selected = (i === idx));
    }
};
