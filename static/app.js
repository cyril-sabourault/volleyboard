// Entry point for the volleyball strategy board
window.onload = function () {
    // Website-related initialization
    const burgerMenu = document.getElementById('burger-menu');
    const navbarMenu = document.querySelector('.navbar-menu');
    burgerMenu.addEventListener('click', function () {
        navbarMenu.classList.toggle('active');
    });


    // Volleyball canvas
    const canvas = document.getElementById('court-canvas');
    const ctx = canvas.getContext('2d');
    let orientation = null; // will be set by loadCourtState or default

    // Debug flag to show grabable area borders
    let showGrabAreas = false;

    function _getMaxCourtSize() {
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
        const size = _getMaxCourtSize();
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

    function redrawCourt() {
        setCanvasSize();
        drawCourt();
    }

    window.addEventListener('resize', redrawCourt);

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

    // Toolbar buttons
    const insertArrowBtn = document.getElementById('insert-arrow');
    const insertBallBtn = document.getElementById('insert-ball');
    const insertPlayerBtn = document.getElementById('insert-player');
    const cursorBtn = document.getElementById('cursor-mode');
    const clearBtn = document.getElementById('clear-state');
    const rotateBtn = document.getElementById('rotate-court');

    const widthSel = document.getElementById('arrow-width');
    const colorSel = document.getElementById('arrow-color');
    const headChk = document.getElementById('arrow-head');


    // Events
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
    });

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


    // Remove object on right click (context menu)
    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Check for object under mouse (player, ball, arrow)
        let foundIdx = -1;
        // Check balls first (topmost), then players, then arrows
        foundIdx = objects.findIndex(a => {
            if (a.type === 'ball') {
                const center = toAbsolute(a.rx, a.ry);
                const r = (a.width || 20) / 2 * 20;
                return Math.hypot(mx - center.x, my - center.y) < r * 0.8;
            }
            return false;
        });
        if (foundIdx === -1) {
            foundIdx = objects.findIndex(a => {
                if (a.type === 'player') {
                    const center = toAbsolute(a.rx, a.ry);
                    let rx = a.rxLen || 32, ry = a.ryLen || 18;
                    const dx = mx - center.x, dy = my - center.y;
                    return ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) <= 1;
                }
                return false;
            });
        }
        if (foundIdx === -1) {
            foundIdx = objects.findIndex(a => {
                if (a.type === 'arrow') {
                    const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                    return isNearLine(mx, my, { x1: s.x, y1: s.y, x2: e.x, y2: e.y });
                }
                return false;
            });
        }
        if (foundIdx !== -1) {
            objects.splice(foundIdx, 1);
            persistAndRedraw();
        }
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', function (e) {
        // Listen for Shift key to enter arrow insert mode
        if (e.key === 'Shift' && !objectInsertMode) {
            objectInsertMode = 'arrow';
            canvas.style.cursor = 'crosshair';
            objects.forEach(o => o.selected = false);
            updateArrowControlsFromSelection();
            updateToolbarActiveButton();
        }
        // Listen for Escape key to switch to cursor mode
        if (e.key === 'Escape') {
            objectInsertMode = null;
            canvas.style.cursor = '';
            [cursorBtn, insertArrowBtn, insertBallBtn, insertPlayerBtn].forEach(btn => btn.classList.remove('active'));
            cursorBtn.classList.add('active');
            objects.forEach(o => o.selected = false);
            updateArrowControlsFromSelection();
        }
        // Remove selected object with Delete or Backspace
        if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            const idx = objects.findIndex(o => o.selected);
            if (idx !== -1) {
                objects.splice(idx, 1);
                persistAndRedraw();
            }
        }
    });
    window.addEventListener('keyup', function (e) {
        // Only exit arrow insert mode if it was entered by Shift (not by button), and not currently drawing
        if (e.key === 'Shift' && objectInsertMode === 'arrow' && !currentObject) {
            objectInsertMode = null;
            canvas.style.cursor = '';
            updateToolbarActiveButton();
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

    // Object drawing logic
    // --- Utility: convert between absolute and relative coordinates ---
    function toRelative(x, y) {
        return { rx: x / canvas.width, ry: y / canvas.height };
    }
    function toAbsolute(rx, ry) {
        return { x: rx * canvas.width, y: ry * canvas.height };
    }

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
                // --- Draw grab area border for player (square instead of ellipse) ---
                if (showGrabAreas) {
                    ctx.save();
                    const size = Math.max(rx, ry) * 2 + 8; // Make square large enough
                    ctx.beginPath();
                    ctx.rect(-size / 2, -size / 2, size, size);
                    ctx.strokeStyle = 'rgba(0,128,255,0.85)';
                    ctx.lineWidth = 4;
                    ctx.setLineDash([6, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }
                // Draw tilt handle if selected (draw last for foreground)
                if (obj.selected) {
                    ctx.restore(); // End player drawing context
                    ctx.save();
                    ctx.translate(center.x, center.y);
                    ctx.rotate((obj.rotation || 0) + angle);
                    drawTiltHandle(0, -ry - 20);
                    if (showGrabAreas) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(0, -ry - 20, 16, 0, 2 * Math.PI);
                        ctx.strokeStyle = 'rgba(0,128,255,0.85)';
                        ctx.lineWidth = 3;
                        ctx.setLineDash([6, 4]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.restore();
                    }
                    ctx.restore();
                } else {
                    ctx.restore();
                }
            }
        }
        // Draw all balls last (to make sure they're at the front)
        for (const obj of objects) {
            if (obj.type !== 'ball') continue;
            const center = toAbsolute(obj.rx, obj.ry);
            const r = (obj.width || 20) / 3 * 20;
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(obj.rotation || 0);
            // Draw SVG volleyball icon
            // SVG viewBox is 0 0 512 512, so scale to fit r*2
            const scale = (r * 2) / 512;
            ctx.scale(scale, scale);
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = obj.color || '#1976d2';
            const vbCenter = 256;
            ctx.translate(-vbCenter, -vbCenter);
            // Fill background with white circle
            ctx.beginPath();
            ctx.arc(256, 256, 256, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            const ballPath = new Path2D("M509.568,222.003c-0.051-0.265-0.026-0.538-0.094-0.802C496.58,127.59,432.563,47.044,341.871,14.763c-4.429-1.587-9.318,0.734-10.897,5.171c-1.579,4.446,0.734,9.318,5.18,10.897c74.411,26.496,129.527,87.834,149.973,161.638C432.256,134.093,362.01,93.44,284.638,76.049c8.149-19.985,18.253-39.194,30.353-57.293c1.621-2.415,1.894-5.487,0.734-8.149c-1.152-2.662-3.584-4.548-6.451-5.018C307.866,5.367,274.551,0,256,0C197.291,0,143.164,19.917,99.925,53.291c-0.282,0.23-0.597,0.401-0.853,0.666C38.852,100.838,0,173.943,0,256c0,16.444,1.579,32.913,4.676,48.939c0.794,4.079,4.361,6.912,8.371,6.912c0.538,0,1.084-0.051,1.63-0.154c4.634-0.896,7.654-5.376,6.758-10.001c-2.901-14.959-4.369-30.336-4.369-45.696c0-65.263,26.325-124.476,68.89-167.646c-23.637,75.87-23.748,157.065-0.12,232.806c-21.385,2.935-43.068,3.797-64.785,2.355c-2.816-0.222-5.547,1.033-7.287,3.26c-1.732,2.219-2.261,5.163-1.408,7.851C46.191,440.721,144.111,512,256,512c61.372,0,120.738-22.059,167.159-62.106c3.567-3.081,3.968-8.465,0.887-12.041c-3.081-3.567-8.465-3.959-12.032-0.887c-43.332,37.385-98.739,57.967-156.015,57.967c-20.804,0-41.045-2.782-60.45-7.791c77.645-17.425,148.122-57.95,201.967-116.361c13.235,17.05,24.815,35.396,34.432,54.929c1.246,2.534,3.661,4.284,6.46,4.676c0.401,0.06,0.802,0.085,1.195,0.085c2.381,0,4.685-0.998,6.315-2.79C488.533,380.809,512,319.838,512,256C512,244.506,511.07,233.182,509.568,222.003z M256,17.067c10.317,0,26.359,1.92,37.598,3.465c-41.882,68.309-58.325,149.879-46.703,231.714c-20.591,16.137-42.607,29.705-65.655,40.55c-22.63-92.723-9.182-189.099,38.272-272.947C231.415,18.014,243.601,17.067,256,17.067z M112.273,65.271c25.079-18.944,53.99-33.058,85.35-40.96c-44.373,85.461-55.723,182.298-32.247,275.43c-20.267,8.286-41.199,14.515-62.532,18.611C76.51,235.819,79.787,146.355,112.273,65.271z M69.444,405.692c-15.292-19.132-27.81-40.789-36.762-64.546c80.154,2.167,159.386-24.286,224.623-75.383c24.269,9.754,47.027,22.042,67.951,36.574C256.196,368.367,165.897,404.932,69.444,405.692z M162.287,475.896c-29.423-12.45-55.919-30.652-78.029-53.495c96.307-4.25,185.95-42.829,254.933-109.807c17.323,13.414,33.178,28.433,47.386,44.86C328.183,421.623,248.909,463.556,162.287,475.896z M441.395,406.801c-38.187-70.656-100.719-125.884-177.587-156.817c-3.686-25.899-4.429-51.755-2.295-77.141c91.571,26.761,168.294,86.554,217.182,169.515C469.726,365.542,457.301,387.345,441.395,406.801z M485.794,321.195c-51.831-81.109-129.997-139.324-222.37-165.564c2.953-21.692,8.03-42.931,15.147-63.454c84.599,18.449,160.418,65.98,214.391,134.622c1.195,9.617,1.971,19.337,1.971,29.201C494.933,278.306,491.725,300.186,485.794,321.195z");
            ctx.fill(ballPath);
            ctx.stroke(ballPath);
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
                ctx.arc(s.x, s.y, 16, 0, 2 * Math.PI); // Larger
                ctx.strokeStyle = 'rgba(0,128,255,0.85)';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(e.x, e.y, 16, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
                // Line grab area (draw as a thick transparent line)
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(e.x, e.y);
                ctx.strokeStyle = 'rgba(0,128,255,0.25)';
                ctx.lineWidth = 28;
                ctx.stroke();
                ctx.restore();
            }
        }
        // --- Draw grab area for remove button ---
        if (showGrabAreas) {
            let idx = hoveredObjectIndex;
            if (idx === -1) idx = objects.findIndex(o => o.selected);
            if (idx !== -1) {
                const obj = objects[idx];
                let x, y, rBtn = 18; // Larger radius for grab area
                if (obj.type === 'player') {
                    const center = toAbsolute(obj.rx, obj.ry);
                    let rx = obj.rxLen || 32, ry = obj.ryLen || 18;
                    x = center.x + rx * 0.7;
                    y = center.y - ry * 0.7;
                } else if (obj.type === 'ball') {
                    const center = toAbsolute(obj.rx, obj.ry);
                    x = center.x + 16;
                    y = center.y - 16;
                } else if (obj.type === 'arrow') {
                    const s = toAbsolute(obj.rx1, obj.ry1), e = toAbsolute(obj.rx2, obj.ry2);
                    x = (s.x + e.x) / 2 + 14;
                    y = (s.y + e.y) / 2 - 14;
                }
                if (x !== undefined && y !== undefined) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x, y, rBtn, 0, 2 * Math.PI);
                    ctx.strokeStyle = 'rgba(255,0,0,0.7)'; // Red for remove
                    ctx.lineWidth = 4;
                    ctx.setLineDash([4, 2]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }
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

    // --- Remove button drawing utility ---
    function drawRemoveButton(x, y, r = 11) { // smaller radius
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = '#444'; // dark grey background
        ctx.strokeStyle = '#444'; // dark grey border
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        // Draw cross
        ctx.beginPath();
        ctx.moveTo(x - r * 0.45, y - r * 0.45);
        ctx.lineTo(x + r * 0.45, y + r * 0.45);
        ctx.moveTo(x + r * 0.45, y - r * 0.45);
        ctx.lineTo(x - r * 0.45, y + r * 0.45);
        ctx.strokeStyle = '#bbbbbb'; // light grey cross
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    function redrawAll() {
        redrawCourt();
        drawObjects();
    }


    // Track hovered object and remove button hover
    let hoveredObjectIndex = -1;
    canvas.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        hoveredObjectIndex = -1;
        hoveredRemoveButton = false;
        // Check balls first (topmost), then players, then arrows
        hoveredObjectIndex = objects.findIndex(a => {
            if (a.type === 'ball') {
                const center = toAbsolute(a.rx, a.ry);
                const r = (a.width || 20) / 2 * 20;
                return Math.hypot(mx - center.x, my - center.y) < r * 0.8;
            }
            return false;
        });
        if (hoveredObjectIndex === -1) {
            hoveredObjectIndex = objects.findIndex(a => {
                if (a.type === 'player') {
                    const center = toAbsolute(a.rx, a.ry);
                    let rx = a.rxLen || 32, ry = a.ryLen || 18;
                    const dx = mx - center.x, dy = my - center.y;
                    return ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) <= 1;
                }
                return false;
            });
        }
        if (hoveredObjectIndex === -1) {
            hoveredObjectIndex = objects.findIndex(a => {
                if (a.type === 'arrow') {
                    const s = toAbsolute(a.rx1, a.ry1), e = toAbsolute(a.rx2, a.ry2);
                    return isNearLine(mx, my, { x1: s.x, y1: s.y, x2: e.x, y2: e.y });
                }
                return false;
            });
        }
        // Remove button position (closer to center)
        let x, y, rBtn = 11;
        if (hoveredObjectIndex !== -1) {
            const obj = objects[hoveredObjectIndex];
            if (obj.type === 'player') {
                const center = toAbsolute(obj.rx, obj.ry);
                let rx = obj.rxLen || 32, ry = obj.ryLen || 18;
                x = center.x + rx * 0.7;
                y = center.y - ry * 0.7;
            } else if (obj.type === 'ball') {
                const center = toAbsolute(obj.rx, obj.ry);
                x = center.x + 16;
                y = center.y - 16;
            } else if (obj.type === 'arrow') {
                const s = toAbsolute(obj.rx1, obj.ry1), e = toAbsolute(obj.rx2, obj.ry2);
                x = (s.x + e.x) / 2 + 14;
                y = (s.y + e.y) / 2 - 14;
            }
            if (x !== undefined && y !== undefined && Math.hypot(mx - x, my - y) < rBtn) {
                hoveredRemoveButton = true;
            }
        }
        redrawAll();
    });

    // --- Patch drawObjects to draw remove button ---
    const origDrawObjects = drawObjects;
    drawObjects = function () {
        origDrawObjects();
        // Draw remove button for hovered or selected object
        let idx = hoveredObjectIndex;
        if (idx === -1) idx = objects.findIndex(o => o.selected);
        if (idx !== -1) {
            const obj = objects[idx];
            let x, y, rBtn = 11;
            if (obj.type === 'player') {
                const center = toAbsolute(obj.rx, obj.ry);
                let rx = obj.rxLen || 32, ry = obj.ryLen || 18;
                x = center.x + rx * 0.7;
                y = center.y - ry * 0.7;
            } else if (obj.type === 'ball') {
                const center = toAbsolute(obj.rx, obj.ry);
                x = center.x + 16;
                y = center.y - 16;
            } else if (obj.type === 'arrow') {
                const s = toAbsolute(obj.rx1, obj.ry1), e = toAbsolute(obj.rx2, obj.ry2);
                x = (s.x + e.x) / 2 + 14;
                y = (s.y + e.y) / 2 - 14;
            }
            if (x !== undefined && y !== undefined) {
                drawRemoveButton(x, y, rBtn);
            }
        }
    };

    // --- Remove object on remove button click ---
    canvas.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return; // Only left click
        if (hoveredObjectIndex === -1) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Remove button position (closer to center)
        const obj = objects[hoveredObjectIndex];
        let x, y, rBtn = 11;
        if (obj.type === 'player') {
            const center = toAbsolute(obj.rx, obj.ry);
            let rx = obj.rxLen || 32, ry = obj.ryLen || 18;
            x = center.x + rx * 0.7;
            y = center.y - ry * 0.7;
        } else if (obj.type === 'ball') {
            const center = toAbsolute(obj.rx, obj.ry);
            x = center.x + 16;
            y = center.y - 16;
        } else if (obj.type === 'arrow') {
            const s = toAbsolute(obj.rx1, obj.ry1), e = toAbsolute(obj.rx2, obj.ry2);
            x = (s.x + e.x) / 2 + 14;
            y = (s.y + e.y) / 2 - 14;
        }
        if (x !== undefined && y !== undefined && Math.hypot(mx - x, my - y) < rBtn) {
            objects.splice(hoveredObjectIndex, 1);
            hoveredObjectIndex = -1;
            persistAndRedraw();
            e.stopPropagation();
            return;
        }
    }, true);

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
        // --- ALT/OPTION key for duplicate-drag ---
        let altClone = false;
        if (!objectInsertMode && (e.altKey || e.metaKey)) {
            // Try to find an object under the mouse (same as normal drag logic)
            let idx = -1;
            // Player tilt handle (skip for clone)
            // Ball
            idx = objects.findIndex(a => {
                if (a.type !== 'ball') return false;
                const center = toAbsolute(a.rx, a.ry);
                const r = (a.width || 20) / 2 * 20;
                return Math.hypot(mx - center.x, my - center.y) < r * 0.8;
            });
            if (idx === -1) {
                idx = objects.findIndex(a => {
                    if (a.type !== 'player') return false;
                    const center = toAbsolute(a.rx, a.ry);
                    let rx = a.rxLen || 32, ry = a.ryLen || 18;
                    const dx = mx - center.x, dy = my - center.y;
                    // Not on tilt handle
                    let angle = (a.rotation || 0) + (orientation === 'horizontal' ? Math.PI / 2 : 0);
                    const hx = center.x + Math.sin(angle) * 0 + Math.cos(angle) * (0) - Math.sin(angle) * (ry + 20);
                    const hy = center.y - Math.cos(angle) * (0) + Math.sin(angle) * (0) - Math.cos(angle) * (ry + 20);
                    if (Math.hypot(mx - hx, my - hy) < 16) return false;
                    return ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) <= 1;
                });
            }
            if (idx === -1) {
                idx = objects.findIndex(a => {
                    if (!a.rx1) return false;
                    const s = toAbsolute(a.rx1, a.ry1), ept = toAbsolute(a.rx2, a.ry2);
                    return isNearHandle(mx, my, s.x, s.y) || isNearHandle(mx, my, ept.x, ept.y) || isNearLine(mx, my, { x1: s.x, y1: s.y, x2: ept.x, y2: ept.y });
                });
            }
            if (idx !== -1) {
                // Clone the object
                const orig = objects[idx];
                const clone = JSON.parse(JSON.stringify(orig));
                // Deselect all, select only clone
                objects.forEach(o => o.selected = false);
                clone.selected = true;
                objects.push(clone);
                dragObjectIndex = objects.length - 1;
                // Set dragMode as appropriate
                if (clone.type === 'ball') {
                    dragMode = 'move-ball';
                    dragOffset = {
                        x: mx - toAbsolute(clone.rx, clone.ry).x,
                        y: my - toAbsolute(clone.rx, clone.ry).y
                    };
                } else if (clone.type === 'player') {
                    dragMode = 'move-player';
                    dragOffset = {
                        x: mx - toAbsolute(clone.rx, clone.ry).x,
                        y: my - toAbsolute(clone.rx, clone.ry).y
                    };
                } else if (clone.type === 'arrow') {
                    dragMode = 'move';
                    dragOffset = { x: mx, y: my };
                }
                redrawAll();
                updateArrowControlsFromSelection();
                altClone = true;
                return;
            }
        }
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
                const { rxLen, ryLen } = getProportionalPlayerSize(orientation);
                currentObject = {
                    type: 'player',
                    rx: relStart.rx, ry: relStart.ry, selected: true,
                    width: defaultWidth,
                    color: defaultColor,
                    rxLen, ryLen
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
                const { rxLen, ryLen } = getProportionalPlayerSize(orientation);
                currentObject = {
                    type: 'player',
                    rx: relStart.rx, ry: relStart.ry, selected: true,
                    width: defaultWidth,
                    color: defaultColor,
                    rxLen, ryLen
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

    function getProportionalPlayerSize(orientation) {
        // because default view is horizontal, and players face the net
        // so width of player is proportional to height of canvas
        const playerWidth = canvas.height * 0.07; // 15% of height
        const playerHeight = 18;

        if (orientation === 'horizontal') {
            return { rxLen: playerWidth, ryLen: playerHeight };
        } else {
            return { rxLen: playerWidth, ryLen: playerHeight };
        }
    }

    // Add player on double click shortcut
    canvas.addEventListener('dblclick', function (e) {
        // Only add if not in insert mode (so double click is a shortcut)
        if (!objectInsertMode) {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const rel = toRelative(mx, my);

            // Add a default player at the mouse position
            const { rxLen, ryLen } = getProportionalPlayerSize(orientation);
            objects.push({
                type: 'player',
                rx: rel.rx, ry: rel.ry, selected: false,
                width: defaultWidth,
                color: defaultColor,
                rxLen, ryLen
            });
            persistAndRedraw();
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

    // --- Selection rectangle state ---
    let selectRect = null; // {x1, y1, x2, y2}
    let isSelecting = false;

    // --- Selection area mouse events (cursor mode only) ---
    canvas.addEventListener('mousedown', function (e) {
        if (objectInsertMode || e.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Only start selection if not on any object
        let onObject = false;
        for (const a of objects) {
            if (a.type === 'ball') {
                const center = toAbsolute(a.rx, a.ry);
                const r = (a.width || 20) / 2 * 20;
                if (Math.hypot(mx - center.x, my - center.y) < r * 0.8) { onObject = true; break; }
            } else if (a.type === 'player') {
                const center = toAbsolute(a.rx, a.ry);
                let rx = a.rxLen || 32, ry = a.ryLen || 18;
                const dx = mx - center.x, dy = my - center.y;
                if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) { onObject = true; break; }
            } else if (a.type === 'arrow') {
                const s = toAbsolute(a.rx1, a.ry1), ept = toAbsolute(a.rx2, a.ry2);
                if (isNearHandle(mx, my, s.x, s.y) || isNearHandle(mx, my, ept.x, ept.y) || isNearLine(mx, my, { x1: s.x, y1: s.y, x2: ept.x, y2: ept.y })) { onObject = true; break; }
            }
        }
        if (!onObject) {
            isSelecting = true;
            selectRect = { x1: mx, y1: my, x2: mx, y2: my };
            objects.forEach(a => a.selected = false);
            redrawAll();
        }
    }, true);

    canvas.addEventListener('mousemove', function (e) {
        if (!isSelecting || !selectRect) return;
        const rect = canvas.getBoundingClientRect();
        selectRect.x2 = e.clientX - rect.left;
        selectRect.y2 = e.clientY - rect.top;
        redrawAll();
    });

    canvas.addEventListener('mouseup', function (e) {
        if (!isSelecting || !selectRect) return;
        isSelecting = false;
        // Compute selection bounds
        const xMin = Math.min(selectRect.x1, selectRect.x2);
        const xMax = Math.max(selectRect.x1, selectRect.x2);
        const yMin = Math.min(selectRect.y1, selectRect.y2);
        const yMax = Math.max(selectRect.y1, selectRect.y2);
        let anySelected = false;
        for (const [i, a] of objects.entries()) {
            let inRect = false;
            if (a.type === 'ball') {
                const center = toAbsolute(a.rx, a.ry);
                const r = (a.width || 20) / 2 * 20;
                // Use center for selection
                if (center.x >= xMin && center.x <= xMax && center.y >= yMin && center.y <= yMax) inRect = true;
            } else if (a.type === 'player') {
                const center = toAbsolute(a.rx, a.ry);
                let rx = a.rxLen || 32, ry = a.ryLen || 18;
                // Use bounding box
                if (center.x - rx >= xMin && center.x + rx <= xMax && center.y - ry >= yMin && center.y + ry <= yMax) inRect = true;
            } else if (a.type === 'arrow') {
                const s = toAbsolute(a.rx1, a.ry1), ept = toAbsolute(a.rx2, a.ry2);
                // Both endpoints in rect
                if (
                    s.x >= xMin && s.x <= xMax && s.y >= yMin && s.y <= yMax &&
                    ept.x >= xMin && ept.x <= xMax && ept.y >= yMin && ept.y <= yMax
                ) inRect = true;
            }
            a.selected = inRect;
            if (inRect) anySelected = true;
        }
        if (!anySelected) objects.forEach(a => a.selected = false);
        selectRect = null;
        redrawAll();
        updateArrowControlsFromSelection();
    });

    // --- Draw selection rectangle in drawObjects ---
    const origDrawObjects2 = drawObjects;
    drawObjects = function () {
        origDrawObjects2();
        if (selectRect && isSelecting) {
            ctx.save();
            ctx.strokeStyle = '#1976d2';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.rect(
                Math.min(selectRect.x1, selectRect.x2),
                Math.min(selectRect.y1, selectRect.y2),
                Math.abs(selectRect.x2 - selectRect.x1),
                Math.abs(selectRect.y2 - selectRect.y1)
            );
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    };

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
    const origRedraw = redrawCourt;
    redrawCourt = function () {
        origRedraw();
        drawObjects();
    };

    // Call on load to set initial state
    updateToolbarActiveButton();
};
