// Entry point for the volleyball strategy board
window.onload = function () {
    const canvas = document.getElementById('court-canvas');
    const ctx = canvas.getContext('2d');
    let orientation = null; // will be set by loadCourtState or default

    // Debug flag to show grabable area borders
    let showGrabAreas = false;

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
        // Transform arrows' coordinates (clockwise)
        objects.forEach(a => {
            if (a.type === 'arrow') {
                // Clockwise: (x, y) -> (1 - y, x)
                [a.rx1, a.ry1] = [1 - a.ry1, a.rx1];
                [a.rx2, a.ry2] = [1 - a.ry2, a.rx2];
            } else if (a.type === 'player' || a.type === 'ball') {
                // Transform center point
                [a.rx, a.ry] = [1 - a.ry, a.rx];
            }
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

    // --- Generalized Object Logic ---
    let objects = [];
    let currentObject = null;
    let objectInsertMode = null; // 'arrow', 'ball', 'player', or null
    let dragMode = null;
    let dragOffset = { x: 0, y: 0 };
    let dragObjectIndex = -1;

    // Default style values for new objects
    let defaultWidth = 4;
    let defaultColor = '#d32f2f';
    let defaultHead = true;

    // Insert mode buttons
    const insertArrowBtn = document.getElementById('insert-arrow');
    const insertBallBtn = document.getElementById('insert-ball');
    const insertPlayerBtn = document.getElementById('insert-player');
    const cursorBtn = document.getElementById('cursor-mode');
    const clearBtn = document.getElementById('clear-state');

    insertArrowBtn.addEventListener('click', function () {
        objectInsertMode = 'arrow';
        canvas.style.cursor = 'crosshair';
        objects.forEach(o => o.selected = false);
        updateArrowControlsFromSelection();
        updateToolbarActiveButton();
    });
    insertBallBtn.addEventListener('click', function () {
        objectInsertMode = 'ball';
        canvas.style.cursor = 'crosshair';
        objects.forEach(o => o.selected = false);
        updateArrowControlsFromSelection();
        updateToolbarActiveButton();
    });
    insertPlayerBtn.addEventListener('click', function () {
        objectInsertMode = 'player';
        canvas.style.cursor = 'crosshair';
        objects.forEach(o => o.selected = false);
        updateArrowControlsFromSelection();
        updateToolbarActiveButton();
    });

    cursorBtn.addEventListener('click', function () {
        objectInsertMode = null;
        canvas.style.cursor = '';
        [cursorBtn, insertArrowBtn, insertBallBtn, insertPlayerBtn].forEach(btn => btn.classList.remove('active'));
        cursorBtn.classList.add('active');
        objects.forEach(o => o.selected = false);
        updateArrowControlsFromSelection();
    });

    clearBtn.addEventListener('click', function () {
        objects = [];
        localStorage.removeItem('volleyCourtState');
        persistAndRedraw();
        updateDebug();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', function (e) {
        // Listen for Escape key to switch to cursor mode
        if (e.key === 'Escape') {
            objectInsertMode = null;
            canvas.style.cursor = '';
            [cursorBtn, insertArrowBtn, insertBallBtn, insertPlayerBtn].forEach(btn => btn.classList.remove('active'));
            cursorBtn.classList.add('active');
            objects.forEach(o => o.selected = false);
            updateArrowControlsFromSelection();
        }
    });

    // Helper to update toolbar button active state
    function updateToolbarActiveButton() {
        [cursorBtn, insertArrowBtn, insertBallBtn, insertPlayerBtn].forEach(btn => btn.classList.remove('active'));
        if (objectInsertMode === 'arrow') insertArrowBtn.classList.add('active');
        else if (objectInsertMode === 'ball') insertBallBtn.classList.add('active');
        else if (objectInsertMode === 'player') insertPlayerBtn.classList.add('active');
        else cursorBtn.classList.add('active');
    }

    // Utility: Deselect all objects except one (by index)
    function selectOnlyObject(idx) {
        objects.forEach((o, i) => o.selected = (i === idx));
    }

    const widthSel = document.getElementById('arrow-width');
    const colorSel = document.getElementById('arrow-color');
    const headChk = document.getElementById('arrow-head');

    // Update style controls from selected object, or set defaults
    function updateArrowControlsFromSelection() {
        const sel = objects.find(a => a.selected);
        if (sel) {
            widthSel.value = sel.width || defaultWidth;
            colorSel.value = sel.color || defaultColor;
            headChk.checked = sel.head !== false;
        } else {
            widthSel.value = defaultWidth;
            colorSel.value = defaultColor;
            headChk.checked = defaultHead;
        }
    }

    // When controls change, update selected object or defaults
    widthSel.addEventListener('change', function () {
        const val = parseInt(this.value);
        const sel = objects.find(a => a.selected);
        if (sel) { sel.width = val; persistAndRedraw(); }
        else defaultWidth = val;
    });
    colorSel.addEventListener('input', function () {
        const val = this.value;
        const sel = objects.find(a => a.selected);
        if (sel) { sel.color = val; persistAndRedraw(); }
        else defaultColor = val;
    });
    headChk.addEventListener('change', function () {
        const val = this.checked;
        const sel = objects.find(a => a.selected);
        if (sel) { sel.head = val; persistAndRedraw(); }
        else defaultHead = val;
    });

    // Update drawArrows to use relative coordinates
    function drawObjects() {
        ctx.save();
        // Draw all non-ball objects first
        for (const obj of objects) {
            if (obj.type === 'ball') continue;
            if (obj.type === 'arrow') {
                const start = toAbsolute(obj.rx1, obj.ry1);
                const end = toAbsolute(obj.rx2, obj.ry2);
                ctx.strokeStyle = obj.color || '#d32f2f';
                ctx.lineWidth = obj.width || 4;
                ctx.fillStyle = obj.color || '#d32f2f';
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
                if (obj.head !== false) {
                    drawArrowhead(start.x, start.y, end.x, end.y, obj.color || '#d32f2f');
                }
                if (obj.selected) {
                    drawHandle(start.x, start.y);
                    drawHandle(end.x, end.y);
                }
            } else if (obj.type === 'player') {
                const center = toAbsolute(obj.rx, obj.ry);
                let rx = obj.rxLen || 32, ry = obj.ryLen || 18;
                let angle = 0;
                if (orientation === 'horizontal') angle = Math.PI / 2;
                ctx.save();
                ctx.translate(center.x, center.y);
                ctx.rotate((obj.rotation || 0) + angle);
                ctx.strokeStyle = obj.color || '#388e3c';
                ctx.lineWidth = obj.width || 4;
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.stroke();
                // --- Draw grab area border for player (ellipse) ---
                if (showGrabAreas) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
                    ctx.strokeStyle = 'rgba(0,128,255,0.4)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }
                // Draw tilt handle if selected
                if (obj.selected) {
                    // Place handle above ellipse (0, -ry - 20)
                    drawTiltHandle(0, -ry - 20);
                    // --- Draw grab area border for tilt handle ---
                    if (showGrabAreas) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(0, -ry - 20, 12, 0, 2 * Math.PI);
                        ctx.strokeStyle = 'rgba(0,128,255,0.4)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([4, 4]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.restore();
                    }
                }
                ctx.restore();
            }
        }
        // Draw all balls last (topmost)
        for (const obj of objects) {
            if (obj.type !== 'ball') continue;
            const center = toAbsolute(obj.rx, obj.ry);
            const r = (obj.width || 20) / 2 * 20;
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(obj.rotation || 0);
            ctx.scale(r / 10, r / 10);
            ctx.lineWidth = 2 / (r / 10);
            ctx.strokeStyle = obj.color || '#1976d2';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            // --- Draw grab area border for ball ---
            if (showGrabAreas) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, 8 * 0.8, 0, 2 * Math.PI);
                ctx.strokeStyle = 'rgba(0,128,255,0.4)';
                ctx.lineWidth = 2 / (r / 10);
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
            ctx.lineWidth = 1.2 / (r / 10);
            ctx.beginPath();
            ctx.arc(0, 0, 8, Math.PI, 2 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-6, -6); ctx.bezierCurveTo(-2, -5, 2, -5, 6, -6); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-6, 6); ctx.bezierCurveTo(-2, 5, 2, 5, 6, 6); ctx.stroke();
            // No handle for ball
            ctx.restore();
        }
        // --- Draw grab area border for arrow handles and line ---
        if (showGrabAreas) {
            for (const obj of objects) {
                if (obj.type !== 'arrow') continue;
                const s = toAbsolute(obj.rx1, obj.ry1), e = toAbsolute(obj.rx2, obj.ry2);
                // Handles
                ctx.save();
                ctx.beginPath();
                ctx.arc(s.x, s.y, 12, 0, 2 * Math.PI);
                ctx.strokeStyle = 'rgba(0,128,255,0.4)';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(e.x, e.y, 12, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
                // Line grab area (draw as a thick transparent line)
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(e.x, e.y);
                ctx.strokeStyle = 'rgba(0,128,255,0.2)';
                ctx.lineWidth = 20;
                ctx.stroke();
                ctx.restore();
            }
        }
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

    // Draw a tilt handle (small circle)
    function drawTiltHandle(x, y) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(x, y); // line from center to handle
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
        drawObjects();
    }

    // --- Local Storage Persistence ---
    function saveCourtState() {
        const state = {
            orientation,
            objects: objects.map(a => ({ ...a, selected: false })) // don't persist selection
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
            if (Array.isArray(state.objects)) objects = state.objects;
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
    }

    widthSel.addEventListener('change', function () {
        const val = parseInt(this.value);
        const sel = objects.find(a => a.selected);
        if (sel) { sel.width = val; persistAndRedraw(); }
        else defaultWidth = val;
    });
    colorSel.addEventListener('input', function () {
        const val = this.value;
        const sel = objects.find(a => a.selected);
        if (sel) { sel.color = val; persistAndRedraw(); }
        else defaultColor = val;
    });
    headChk.addEventListener('change', function () {
        const val = this.checked;
        const sel = objects.find(a => a.selected);
        if (sel) { sel.head = val; persistAndRedraw(); }
        else defaultHead = val;
    });
    canvas.addEventListener('mouseup', function (e) {
        if (objectInsertMode && currentObject) {
            objects.push(currentObject);
            // If placing a ball, immediately switch to cursor mode
            if (currentObject.type === 'ball') {
                objectInsertMode = null;
                updateToolbarActiveButton();
                canvas.style.cursor = '';
            }
            currentObject = null;
            startPt = null;
            persistAndRedraw();
            updateArrowControlsFromSelection();
        } else if (dragMode) {
            dragMode = null;
            dragObjectIndex = -1;
        }
    });

    // Mouse events for arrow tool
    let startPt = null;
    canvas.addEventListener('mousedown', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (objectInsertMode) {
            startPt = { x: mx, y: my };
            const relStart = toRelative(mx, my);
            if (objectInsertMode === 'arrow') {
                currentObject = {
                    type: 'arrow',
                    rx1: relStart.rx, ry1: relStart.ry, rx2: relStart.rx, ry2: relStart.ry, selected: true,
                    width: defaultWidth,
                    color: defaultColor,
                    head: defaultHead
                };
            } else if (objectInsertMode === 'ball') {
                currentObject = {
                    type: 'ball',
                    rx: relStart.rx, ry: relStart.ry, selected: true,
                    width: defaultWidth,
                    color: defaultColor
                };
            } else if (objectInsertMode === 'player') {
                currentObject = {
                    type: 'player',
                    rx: relStart.rx, ry: relStart.ry, selected: true,
                    width: defaultWidth,
                    color: defaultColor,
                    rxLen: 32, ryLen: 18
                };
            }
        } else {
            // --- Player tilt handle hit test (before player move) ---
            dragObjectIndex = objects.findIndex(a => {
                if (a.type !== 'player' || !a.selected) return false;
                const center = toAbsolute(a.rx, a.ry);
                let rx = a.rxLen || 32, ry = a.ryLen || 18;
                let angle = (a.rotation || 0) + (orientation === 'horizontal' ? Math.PI / 2 : 0);
                // Compute handle position by rotating (0, -ry-20) by angle
                const localX = 0, localY = -ry - 20;
                const hx = center.x + localX * Math.cos(angle) - localY * Math.sin(angle);
                const hy = center.y + localX * Math.sin(angle) + localY * Math.cos(angle);
                const dist = Math.hypot(mx - hx, my - hy);
                return dist < 12;
            });
            if (dragObjectIndex !== -1) {
                dragMode = 'rotate-player';
                const a = objects[dragObjectIndex];
                const center = toAbsolute(a.rx, a.ry);
                dragOffset = { cx: center.x, cy: center.y, startAngle: a.rotation || 0 };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Ball: check if mouse is inside any ball
            dragObjectIndex = objects.findIndex(a => {
                if (a.type !== 'ball') return false;
                const center = toAbsolute(a.rx, a.ry);
                const r = (a.width || 20) / 2 * 20;
                return Math.hypot(mx - center.x, my - center.y) < r * 0.8;
            });
            if (dragObjectIndex !== -1) {
                selectOnlyObject(dragObjectIndex);
                dragMode = 'move-ball';
                dragOffset = {
                    x: mx - toAbsolute(objects[dragObjectIndex].rx, objects[dragObjectIndex].ry).x,
                    y: my - toAbsolute(objects[dragObjectIndex].rx, objects[dragObjectIndex].ry).y
                };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Player: check if mouse is inside any player (but not on tilt handle)
            dragObjectIndex = objects.findIndex(a => {
                if (a.type !== 'player') return false;
                const center = toAbsolute(a.rx, a.ry);
                let rx = a.rxLen || 32, ry = a.ryLen || 18;
                const dx = mx - center.x, dy = my - center.y;
                // Also check not on tilt handle
                let angle = (a.rotation || 0) + (orientation === 'horizontal' ? Math.PI / 2 : 0);
                const hx = center.x + Math.sin(angle) * 0 + Math.cos(angle) * (0) - Math.sin(angle) * (ry + 20);
                const hy = center.y - Math.cos(angle) * (0) + Math.sin(angle) * (0) - Math.cos(angle) * (ry + 20);
                if (Math.hypot(mx - hx, my - hy) < 16) return false;
                return ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) <= 1;
            });
            if (dragObjectIndex !== -1) {
                selectOnlyObject(dragObjectIndex);
                dragMode = 'move-player';
                dragOffset = {
                    x: mx - toAbsolute(objects[dragObjectIndex].rx, objects[dragObjectIndex].ry).x,
                    y: my - toAbsolute(objects[dragObjectIndex].rx, objects[dragObjectIndex].ry).y
                };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Check for handle hover (resize zone)
            dragObjectIndex = objects.findIndex(a => {
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                return isNearHandle(mx, my, s.x, s.y) || isNearHandle(mx, my, e.x, e.y);
            });
            if (dragObjectIndex !== -1) {
                selectOnlyObject(dragObjectIndex);
                const a = objects[dragObjectIndex];
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
            dragObjectIndex = objects.findIndex(a => {
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                return isNearLine(mx, my, { x1: s.x, y1: s.y, x2: e.x, y2: e.y });
            });
            if (dragObjectIndex !== -1) {
                selectOnlyObject(dragObjectIndex);
                const a = objects[dragObjectIndex];
                a.selected = true;
                dragMode = 'move';
                dragOffset = { x: mx, y: my };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Deselect all if not clicking on any object
            objects.forEach(a => a.selected = false);
            redrawAll();
            updateArrowControlsFromSelection();
        }
    });

    canvas.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (objectInsertMode && startPt && currentObject) {
            const relEnd = toRelative(mx, my);
            currentObject.rx2 = relEnd.rx;
            currentObject.ry2 = relEnd.ry;
            redrawAll();
            // Draw preview
            const s = toAbsolute(currentObject.rx1, currentObject.ry1);
            const ept = toAbsolute(currentObject.rx2, currentObject.ry2);
            ctx.save();
            ctx.strokeStyle = '#1976d2';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(ept.x, ept.y);
            ctx.stroke();
            drawArrowhead(s.x, s.y, ept.x, ept.y);
            ctx.restore();
        } else if (dragMode && dragObjectIndex !== -1) {
            if (dragMode === 'move-ball' || dragMode === 'move-player') {
                const a = objects[dragObjectIndex];
                const newCenter = toRelative(mx - dragOffset.x, my - dragOffset.y);
                a.rx = newCenter.rx;
                a.ry = newCenter.ry;
                persistAndRedraw();
            } else {
                const a = objects[dragObjectIndex];
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
        } else if (dragMode === 'rotate-player' && dragObjectIndex !== -1) {
            const a = objects[dragObjectIndex];
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            // Calculate angle from center to mouse
            const angle = Math.atan2(my - dragOffset.cy, mx - dragOffset.cx);
            // Subtract orientation offset
            let orient = (orientation === 'horizontal') ? Math.PI / 2 : 0;
            a.rotation = angle - orient;
            persistAndRedraw();
        }
    });

    canvas.addEventListener('mouseup', function (e) {
        if (objectInsertMode && currentObject) {
            objects.push(currentObject);
            // If placing a ball, immediately switch to cursor mode
            if (currentObject.type === 'ball') {
                objectInsertMode = null;
                updateToolbarActiveButton();
                canvas.style.cursor = '';
            }
            currentObject = null;
            startPt = null;
            persistAndRedraw();
            updateArrowControlsFromSelection();
        } else if (dragMode) {
            dragMode = null;
            dragObjectIndex = -1;
        }
    });

    // --- Cursor feedback for all objects (arrows, players, balls) ---
    function updateCursor(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (objectInsertMode) {
            canvas.style.cursor = 'crosshair';
            return;
        }
        // Player: tilt handle (show grab cursor)
        for (const a of objects) {
            if (a.type === 'player' && a.selected) {
                const center = toAbsolute(a.rx, a.ry);
                let rx = a.rxLen || 32, ry = a.ryLen || 18;
                let angle = (a.rotation || 0) + (orientation === 'horizontal' ? Math.PI / 2 : 0);
                // Compute handle position by rotating (0, -ry-20) by angle
                const localX = 0, localY = -ry - 20;
                const hx = center.x + localX * Math.cos(angle) - localY * Math.sin(angle);
                const hy = center.y + localX * Math.sin(angle) + localY * Math.cos(angle);
                const dist = Math.hypot(mx - hx, my - hy);
                if (dist < 12) {
                    if (!updateCursor._wasOnTiltHandle) {
                        console.log('Hovering tilt handle');
                    }
                    updateCursor._wasOnTiltHandle = true;
                    canvas.style.cursor = 'grab';
                    return;
                }
            }
        }
        updateCursor._wasOnTiltHandle = false;
        // Ball: check if mouse is inside any ball
        for (const a of objects) {
            if (a.type === 'ball') {
                const center = toAbsolute(a.rx, a.ry);
                const r = (a.width || 20) / 2 * 20;
                if (Math.hypot(mx - center.x, my - center.y) < r * 0.8) {
                    canvas.style.cursor = 'grab';
                    return;
                }
            }
        }
        // Player: ellipse hit test
        for (const a of objects) {
            if (a.type === 'player') {
                const center = toAbsolute(a.rx, a.ry);
                let rx = a.rxLen || 32, ry = a.ryLen || 18;
                const dx = mx - center.x, dy = my - center.y;
                if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
                    canvas.style.cursor = 'grab';
                    return;
                }
            }
        }
        // Arrow handles
        for (const a of objects) {
            if (a.type === 'arrow') {
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                if (isNearHandle(mx, my, s.x, s.y) || isNearHandle(mx, my, e.x, e.y)) {
                    canvas.style.cursor = 'pointer';
                    return;
                }
            }
        }
        // Arrow line
        for (const a of objects) {
            if (a.type === 'arrow') {
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                if (isNearLine(mx, my, { x1: s.x, y1: s.y, x2: e.x, y2: e.y })) {
                    canvas.style.cursor = 'grab';
                    return;
                }
            }
        }
        canvas.style.cursor = '';
    }
    canvas.removeEventListener('mousemove', updateCursor); // Remove old if present
    canvas.addEventListener('mousemove', updateCursor);
    canvas.addEventListener('mouseleave', function () { canvas.style.cursor = ''; });

    // --- Ball/player move logic in mousedown ---
    canvas.addEventListener('mousedown', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (objectInsertMode) {
            startPt = { x: mx, y: my };
            const relStart = toRelative(mx, my);
            if (objectInsertMode === 'arrow') {
                currentObject = {
                    type: 'arrow',
                    rx1: relStart.rx, ry1: relStart.ry, rx2: relStart.rx, ry2: relStart.ry, selected: true,
                    width: defaultWidth,
                    color: defaultColor,
                    head: defaultHead
                };
            } else if (objectInsertMode === 'ball') {
                currentObject = {
                    type: 'ball',
                    rx: relStart.rx, ry: relStart.ry, selected: true,
                    width: defaultWidth,
                    color: defaultColor
                };
            } else if (objectInsertMode === 'player') {
                currentObject = {
                    type: 'player',
                    rx: relStart.rx, ry: relStart.ry, selected: true,
                    width: defaultWidth,
                    color: defaultColor,
                    rxLen: 32, ryLen: 18
                };
            }
        } else {
            // --- Player tilt handle hit test (before player move) ---
            dragObjectIndex = objects.findIndex(a => {
                if (a.type !== 'player' || !a.selected) return false;
                const center = toAbsolute(a.rx, a.ry);
                let rx = a.rxLen || 32, ry = a.ryLen || 18;
                let angle = (a.rotation || 0) + (orientation === 'horizontal' ? Math.PI / 2 : 0);
                // Compute handle position by rotating (0, -ry-20) by angle
                const localX = 0, localY = -ry - 20;
                const hx = center.x + localX * Math.cos(angle) - localY * Math.sin(angle);
                const hy = center.y + localX * Math.sin(angle) + localY * Math.cos(angle);
                const dist = Math.hypot(mx - hx, my - hy);
                return dist < 12;
            });
            if (dragObjectIndex !== -1) {
                dragMode = 'rotate-player';
                const a = objects[dragObjectIndex];
                const center = toAbsolute(a.rx, a.ry);
                dragOffset = { cx: center.x, cy: center.y, startAngle: a.rotation || 0 };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Ball: check if mouse is inside any ball
            dragObjectIndex = objects.findIndex(a => {
                if (a.type !== 'ball') return false;
                const center = toAbsolute(a.rx, a.ry);
                const r = (a.width || 20) / 2 * 20;
                return Math.hypot(mx - center.x, my - center.y) < r * 0.8;
            });
            if (dragObjectIndex !== -1) {
                selectOnlyObject(dragObjectIndex);
                dragMode = 'move-ball';
                dragOffset = {
                    x: mx - toAbsolute(objects[dragObjectIndex].rx, objects[dragObjectIndex].ry).x,
                    y: my - toAbsolute(objects[dragObjectIndex].rx, objects[dragObjectIndex].ry).y
                };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Player: check if mouse is inside any player (but not on tilt handle)
            dragObjectIndex = objects.findIndex(a => {
                if (a.type !== 'player') return false;
                const center = toAbsolute(a.rx, a.ry);
                let rx = a.rxLen || 32, ry = a.ryLen || 18;
                const dx = mx - center.x, dy = my - center.y;
                // Also check not on tilt handle
                let angle = (a.rotation || 0) + (orientation === 'horizontal' ? Math.PI / 2 : 0);
                const hx = center.x + Math.sin(angle) * 0 + Math.cos(angle) * (0) - Math.sin(angle) * (ry + 20);
                const hy = center.y - Math.cos(angle) * (0) + Math.sin(angle) * (0) - Math.cos(angle) * (ry + 20);
                if (Math.hypot(mx - hx, my - hy) < 16) return false;
                return ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) <= 1;
            });
            if (dragObjectIndex !== -1) {
                selectOnlyObject(dragObjectIndex);
                dragMode = 'move-player';
                dragOffset = {
                    x: mx - toAbsolute(objects[dragObjectIndex].rx, objects[dragObjectIndex].ry).x,
                    y: my - toAbsolute(objects[dragObjectIndex].rx, objects[dragObjectIndex].ry).y
                };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Check for handle hover (resize zone)
            dragObjectIndex = objects.findIndex(a => {
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                return isNearHandle(mx, my, s.x, s.y) || isNearHandle(mx, my, e.x, e.y);
            });
            if (dragObjectIndex !== -1) {
                selectOnlyObject(dragObjectIndex);
                const a = objects[dragObjectIndex];
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
            dragObjectIndex = objects.findIndex(a => {
                const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                return isNearLine(mx, my, { x1: s.x, y1: s.y, x2: e.x, y2: e.y });
            });
            if (dragObjectIndex !== -1) {
                selectOnlyObject(dragObjectIndex);
                const a = objects[dragObjectIndex];
                a.selected = true;
                dragMode = 'move';
                dragOffset = { x: mx, y: my };
                redrawAll();
                updateArrowControlsFromSelection();
                return;
            }
            // Deselect all if not clicking on any object
            objects.forEach(a => a.selected = false);
            redrawAll();
            updateArrowControlsFromSelection();
        }
    });

    // --- Utility: near tests ---
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
        drawObjects();
    };

    // Call on load to set initial state
    updateToolbarActiveButton();
};
