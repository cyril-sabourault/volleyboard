document.addEventListener('DOMContentLoaded', () => {
    const court = document.getElementById('court');
    const svgCourt = document.getElementById('svg-court');
    const addPlayerBtn = document.getElementById('add-player');
    const addBallBtn = document.getElementById('add-ball');
    const drawLineBtn = document.getElementById('draw-line');
    const clearAllBtn = document.getElementById('clear-all');
    const selectToolBtn = document.getElementById('select-tool');
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');
    const colorPalette = document.getElementById('color-palette');
    const colorPickerBtn = document.getElementById('color-picker');

    const paletteColors = [
        '#000000', '#FFFFFF', '#FF0000', '#008000', '#0000FF',
        '#FFA500', '#800080', '#808080', '#A52A2A'
    ];
    let isPaletteOpen = false;

    function createColorPalette() {
        paletteColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color; // Use data attribute for reliable color value
            if (color === '#FFFFFF') {
                swatch.style.outlineColor = '#ccc';
            }
            swatch.addEventListener('click', () => handleColorClick(color));
            colorPalette.appendChild(swatch);
        });
    }

    function handleColorClick(color) {
        state.currentColor = color;
        isPaletteOpen = false; // Close after selection
        recordState();
        updatePaletteState();
    }

    function updatePaletteState() {
        if (isPaletteOpen) {
            colorPalette.classList.add('palette-open');
        } else {
            colorPalette.classList.remove('palette-open');
        }

        // Update the color of the picker button itself to the selected color
        updateColorPicker();


        Array.from(colorPalette.children).forEach(swatch => {
            const swatchColor = swatch.dataset.color;
            if (swatchColor === state.currentColor) {
                swatch.classList.add('selected');
            } else {
                swatch.classList.remove('selected');
            }
        });
    }

    function updateColorPicker() {
        const preview = colorPickerBtn.querySelector('.color-picker-preview');
        if (preview) {
            preview.style.backgroundColor = state.currentColor;
        }
    }

    const toolButtons = {
        player: addPlayerBtn,
        ball: addBallBtn,
        line: drawLineBtn,
        select: selectToolBtn,
    };


    // Prevent double-tap zoom
    document.body.addEventListener('dblclick', function(e) {
        e.preventDefault();
    });
    
    colorPickerBtn.addEventListener('click', () => {
        isPaletteOpen = !isPaletteOpen;
        updatePaletteState();
    });


    let state = {
        objects: [],
        currentColor: '#0000ff',
        nextId: 0,
        selectedObjectId: null,
        placementMode: null,
        lineDrawingInfo: null,
    };
    
    let history = [];
    let historyIndex = -1;

    let activeItem = null;

    // --- State Management & History ---
    function recordState() {
        // Clear "redo" history if we make a new change after undoing
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        
        // Deep copy of state
        const newState = JSON.parse(JSON.stringify(state));
        history.push(newState);
        historyIndex = history.length - 1;
        
        updateUndoRedoButtons();
        saveState();
    }

    function saveState() {
        localStorage.setItem('volleyboardState', JSON.stringify(state));
    }

    function loadState() {
        const savedState = localStorage.getItem('volleyboardState');
        if (savedState) {
            // Don't restore selection on load
            state = JSON.parse(savedState);
            state.selectedObjectId = null; 
            history = [JSON.parse(JSON.stringify(state))]; // Start history with loaded state
            historyIndex = 0;
        } else {
            // If no saved state, start with a clean slate
            history = [JSON.parse(JSON.stringify(state))];
            historyIndex = 0;
        }
        updateUndoRedoButtons();
    }
    
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            state = JSON.parse(JSON.stringify(history[historyIndex]));
            renderAllObjects();
            updateUndoRedoButtons();
            saveState();
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            state = JSON.parse(JSON.stringify(history[historyIndex]));
            renderAllObjects();
            updateUndoRedoButtons();
            saveState();
        }
    }

    function updateUndoRedoButtons() {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= history.length - 1;
    }

    function renderAllObjects() {
        // Remove rendered objects before redrawing
        court.querySelectorAll('.court-object').forEach(obj => obj.remove());
        court.querySelectorAll('.delete-handle').forEach(handle => handle.remove());
        
        // Clear SVG canvas
        svgCourt.innerHTML = '';
        
        // Re-add SVG defs for markers
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svgCourt.appendChild(defs);

        state.objects.forEach(obj => {
            if (obj.type === 'line') {
                const markerId = `arrowhead-${obj.id}`;
                const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
                marker.id = markerId;
                marker.setAttribute('markerWidth', '4');
                marker.setAttribute('markerHeight', '5');
                marker.setAttribute('refX', '4');
                marker.setAttribute('refY', '2.5');
                marker.setAttribute('orient', 'auto');
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', '0 0, 4 2, 4 3, 0 5');
                polygon.setAttribute('fill', obj.color);
                marker.appendChild(polygon);
                defs.appendChild(marker);
            }
        });

        state.objects.forEach(obj => {
            if (obj.type === 'player') {
                createPlayerElement(obj);
            } else if (obj.type === 'ball') {
                createBallElement(obj);
            } else if (obj.type === 'line') {
                createLineElement(obj);
            }
        });
        
        // Ensure color palette is up-to-date
        updatePaletteState();

        if (state.selectedObjectId) {
            let selectedEl = document.getElementById(state.selectedObjectId);
            if (selectedEl) {
                // For lines, the ID is on the line element, but we need to select the parent group
                if (selectedEl.tagName === 'line') {
                    selectedEl = selectedEl.parentElement;
                }
                selectObject(selectedEl, state.selectedObjectId);
            }
        }
    }


    // --- Event Listeners ---
    addPlayerBtn.addEventListener('click', () => enterPlacementMode('player'));
    addBallBtn.addEventListener('click', () => enterPlacementMode('ball'));
    drawLineBtn.addEventListener('click', () => enterPlacementMode('line'));
    selectToolBtn.addEventListener('click', () => exitPlacementMode());

    court.addEventListener('mousedown', handleMouseDown);
    court.addEventListener('touchstart', handleMouseDown, { passive: false });

    function handleMouseDown(e) {
        if (state.placementMode !== 'line') return;

        e.preventDefault();
        
        const rect = court.getBoundingClientRect();
        const startX = (( (e.clientX || e.touches[0].clientX) - rect.left) / rect.width) * 100;
        const startY = (( (e.clientY || e.touches[0].clientY) - rect.top) / rect.height) * 100;

        const lineId = addLine(startX, startY, startX, startY);
        const line = state.objects.find(o => o.id === lineId);
        const lineEl = document.getElementById(lineId);

        function handleMouseMove(moveEvent) {
            moveEvent.preventDefault();
            const currentX = (( (moveEvent.clientX || moveEvent.touches[0].clientX) - rect.left) / rect.width) * 100;
            const currentY = (( (moveEvent.clientY || moveEvent.touches[0].clientY) - rect.top) / rect.height) * 100;
            
            line.x2 = currentX;
            line.y2 = currentY;
            
            renderAllObjects();
        }

        function handleMouseUp(upEvent) {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('touchend', handleMouseUp);

            const endX = (( (upEvent.clientX || upEvent.changedTouches[0].clientX) - rect.left) / rect.width) * 100;
            const endY = (( (upEvent.clientY || upEvent.changedTouches[0].clientY) - rect.top) / rect.height) * 100;
            
            // Check if the line is too short (i.e., it was a click)
            const dx = endX - startX;
            const dy = endY - startY;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 2) { // Threshold for minimal length
                line.x2 = startX + 10; // Default length
                line.y2 = startY;
                 if (lineEl) {
                    lineEl.setAttribute('x2', `${line.x2}%`);
                    lineEl.setAttribute('y2', `${line.y2}%`);
                }
            }

            recordState();
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleMouseMove, { passive: false });
        document.addEventListener('touchend', handleMouseUp);
    }
    
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    court.addEventListener('click', (e) => {
        if (state.placementMode === 'player' || state.placementMode === 'ball') {
            const rect = court.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            if (state.placementMode === 'player') addPlayer(x, y);
            if (state.placementMode === 'ball') addBall(x, y);
            recordState();
            return;
        }

        // Deselect if clicking on a non-interactive area
        if (!e.target.closest('.court-object, .line-object, .line-hitbox, .delete-handle, .rotate-handle, .line-handle')) {
            deselectAll();
        }
    });
    court.addEventListener('dblclick', (e) => {
        const rect = court.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        addPlayer(x, y);
        recordState();
    });
    clearAllBtn.addEventListener('click', () => {
        clearAll();
        recordState();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            exitPlacementMode();
        }
        if (e.key === 'Shift') {
            enterPlacementMode('line');
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (state.selectedObjectId) {
                e.preventDefault(); // Prevents browser from navigating back
                deleteObject(state.selectedObjectId);
            }
        }
    });

    createColorPalette();
    updatePaletteState();

    // --- Functions ---
    function enterPlacementMode(type) {
        state.placementMode = type;
        court.classList.add('placement-mode');
        
        Object.values(toolButtons).forEach(btn => btn.classList.remove('active'));
        toolButtons[type].classList.add('active');
    }

    function exitPlacementMode() {
        state.placementMode = null;
        state.lineDrawingInfo = null;
        court.classList.remove('placement-mode');

        Object.values(toolButtons).forEach(btn => btn.classList.remove('active'));
        toolButtons.select.classList.add('active');
    }

    function addPlayer(x, y) {
        const playerWidth = 10;
        const playerHeight = 3; // Adjusted for 1:2 aspect ratio to maintain visual shape
        const playerId = `player-${state.nextId++}`;
        const player = {
            id: playerId,
            type: 'player',
            color: state.currentColor,
            x: x - (playerWidth / 2),
            y: y - (playerHeight / 2),
            width: playerWidth,
            height: playerHeight,
            rotation: 0, // 0 degrees = parallel to the net
        };
        state.objects.push(player);
        state.selectedObjectId = playerId;
        renderAllObjects();
    }

    function addBall(x, y) {
        const ballWidthPercent = 6;
        const ballHeightPercent = ballWidthPercent / 2; // To compensate for 1:2 court aspect ratio
        const ballId = `ball-${state.nextId++}`;
        const ball = {
            id: ballId,
            type: 'ball',
            color: '#000000', // Balls are always black
            x: x - (ballWidthPercent / 2),
            y: y - (ballHeightPercent / 2),
            width: ballWidthPercent,
            height: ballHeightPercent,
            rotation: 0,
        };
        state.objects.push(ball);
        state.selectedObjectId = ballId;
        renderAllObjects();
    }
    
    function addLine(x1, y1, x2, y2) {
        const lineId = `line-${state.nextId++}`;
        const line = {
            id: lineId,
            type: 'line',
            color: state.currentColor,
            x1: x1, y1: y1,
            x2: x2, y2: y2,
        };
        state.objects.push(line);
        renderAllObjects();
        return lineId;
    }
    
    function clearAll() {
        state.objects = [];
        state.selectedObjectId = null;
        renderAllObjects();
    }

    function deleteObject(objectId) {
        state.objects = state.objects.filter(obj => obj.id !== objectId);
        state.selectedObjectId = null;
        recordState();
        renderAllObjects();
    }

    function deselectAll() {
        // Remove selection class from any selected element
        const selected = document.querySelector('.selected');
        if (selected) {
            selected.classList.remove('selected');
        }

        // Remove ALL handles, regardless of type.
        // This is safe because handles only exist for the selected object.
        document.querySelectorAll('.delete-handle, .rotate-handle, .line-handle').forEach(h => h.remove());

        state.selectedObjectId = null;
    }

    function selectObject(element, objectId) {
        if (state.selectedObjectId === objectId) return;

        deselectAll();

        state.selectedObjectId = objectId;
        element.classList.add('selected');
        addHandles(element, objectId);
    }


    function createPlayerElement(player) {
        const playerEl = document.createElement('div');
        playerEl.id = player.id;
        playerEl.classList.add('court-object', 'player');
        playerEl.style.backgroundColor = player.color;
        playerEl.style.left = `${player.x}%`;
        playerEl.style.top = `${player.y}%`;
        playerEl.style.width = `${player.width}%`;
        playerEl.style.height = `${player.height}%`;
        playerEl.style.transform = `rotate(${player.rotation}deg)`;

        playerEl.addEventListener('click', (e) => {
            selectObject(playerEl, player.id);
        });

        makeDraggable(playerEl);

        playerEl.addEventListener('mouseenter', () => {
            if (state.selectedObjectId !== player.id) {
                addHandles(playerEl, player.id);
            }
        });
        playerEl.addEventListener('mouseleave', () => {
            if (state.selectedObjectId !== player.id) {
                playerEl.querySelectorAll('.delete-handle, .rotate-handle').forEach(h => h.remove());
            }
        });

        court.appendChild(playerEl);
    }

    function createBallElement(ball) {
        const ballEl = document.createElement('div');
        ballEl.id = ball.id;
        ballEl.classList.add('court-object', 'ball');
        ballEl.style.backgroundColor = ball.color;
        ballEl.style.left = `${ball.x}%`;
        ballEl.style.top = `${ball.y}%`;
        ballEl.style.width = `${ball.width}%`;
        ballEl.style.height = `${ball.height}%`;
        ballEl.style.transform = `rotate(${ball.rotation}deg)`;

        ballEl.addEventListener('click', (e) => {
            selectObject(ballEl, ball.id);
        });

        makeDraggable(ballEl);

        ballEl.addEventListener('mouseenter', () => {
            if (state.selectedObjectId !== ball.id) {
                addHandles(ballEl, ball.id);
            }
        });
        ballEl.addEventListener('mouseleave', () => {
            if (state.selectedObjectId !== ball.id) {
                ballEl.querySelectorAll('.delete-handle, .rotate-handle').forEach(h => h.remove());
            }
        });

        court.appendChild(ballEl);
    }
    
    function createLineElement(line) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineEl.id = line.id;
        lineEl.setAttribute('x1', `${line.x1}%`);
        lineEl.setAttribute('y1', `${line.y1}%`);
        lineEl.setAttribute('x2', `${line.x2}%`);
        lineEl.setAttribute('y2', `${line.y2}%`);
        lineEl.setAttribute('stroke', line.color);
        lineEl.setAttribute('class', 'line-object');
        lineEl.setAttribute('marker-end', `url(#arrowhead-${line.id})`);

        const hitBoxLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hitBoxLine.setAttribute('x1', `${line.x1}%`);
        hitBoxLine.setAttribute('y1', `${line.y1}%`);
        hitBoxLine.setAttribute('x2', `${line.x2}%`);
        hitBoxLine.setAttribute('y2', `${line.y2}%`);
        hitBoxLine.setAttribute('stroke', 'rgba(0, 0, 0, 0)');
        hitBoxLine.setAttribute('stroke-width', '30');
        hitBoxLine.setAttribute('class', 'line-hitbox');
        
        group.appendChild(hitBoxLine);
        group.appendChild(lineEl);

        // Stop click from bubbling up to the court and causing a deselect
        group.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        makeLineDraggable(group, line);

        group.addEventListener('mouseenter', () => {
            if (state.selectedObjectId !== line.id) {
                addHandles(group, line.id);
            }
        });
        group.addEventListener('mouseleave', () => {
            if (state.selectedObjectId !== line.id) {
                group.querySelectorAll('.line-handle, foreignObject').forEach(h => h.remove());
            }
        });

        svgCourt.appendChild(group);
    }
    
    function makeLineHandleDraggable(handle, line, point) {
        handle.addEventListener('mousedown', onDragStart);
        handle.addEventListener('touchstart', onDragStart, { passive: false });

        function onDragStart(e) {
            e.preventDefault();
            e.stopPropagation();
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);
        }

        function onDragMove(e) {
            e.preventDefault();
            const courtRect = svgCourt.getBoundingClientRect();
            let currentX, currentY;
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - courtRect.left;
                currentY = e.touches[0].clientY - courtRect.top;
            } else {
                currentX = e.clientX - courtRect.left;
                currentY = e.clientY - courtRect.top;
            }

            const newX = (currentX / courtRect.width) * 100;
            const newY = (currentY / courtRect.height) * 100;

            // Update state
            if (point === 'p1') {
                line.x1 = newX;
                line.y1 = newY;
            } else {
                line.x2 = newX;
                line.y2 = newY;
            }

            // Update DOM elements manually
            const lineEl = document.getElementById(line.id);
            if (!lineEl) return;
            const group = lineEl.parentElement;
            const hitboxLine = group.querySelector('.line-hitbox');
            const deleteHandle = document.getElementById(`delete-handle-${line.id}`);

            // 1. Update the handle being dragged
            handle.setAttribute('cx', `${newX}%`);
            handle.setAttribute('cy', `${newY}%`);

            // 2. Update the visible line and the hitbox
            if (point === 'p1') {
                lineEl.setAttribute('x1', `${newX}%`);
                lineEl.setAttribute('y1', `${newY}%`);
                hitboxLine.setAttribute('x1', `${newX}%`);
                hitboxLine.setAttribute('y1', `${newY}%`);
            } else { // 'p2'
                lineEl.setAttribute('x2', `${newX}%`);
                lineEl.setAttribute('y2', `${newY}%`);
                hitboxLine.setAttribute('x2', `${newX}%`);
                hitboxLine.setAttribute('y2', `${newY}%`);
            }

            // 3. Update the delete handle position (midpoint)
            const foreignObject = group.querySelector('foreignObject');
            if (foreignObject) {
                const handleSize = 26;
                const midX_px = ((line.x1 + line.x2) / 2 / 100) * courtRect.width;
                const midY_px = ((line.y1 + line.y2) / 2 / 100) * courtRect.height;
                foreignObject.setAttribute('x', midX_px - (handleSize / 2));
                foreignObject.setAttribute('y', midY_px - (handleSize / 2));
            }
        }

        function onDragEnd() {
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchend', onDragEnd);
            recordState();
        }
    }
    
    function makeLineDraggable(group, line) {
        group.addEventListener('mousedown', onDragStart);
        group.addEventListener('touchstart', onDragStart, { passive: false });
        let startX, startY, lineStartX1, lineStartY1, lineStartX2, lineStartY2;

        function onDragStart(e) {
            if (e.shiftKey) { return; }
             if (e.target.classList.contains('line-handle')) return;
            e.preventDefault();

            if (state.placementMode) {
                exitPlacementMode();
            }

            selectObject(group, line.id);
            
            const courtRect = svgCourt.getBoundingClientRect();
            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX - courtRect.left;
                startY = e.touches[0].clientY - courtRect.top;
            } else {
                startX = e.clientX - courtRect.left;
                startY = e.clientY - courtRect.top;
            }
            
            lineStartX1 = line.x1;
            lineStartY1 = line.y1;
            lineStartX2 = line.x2;
            lineStartY2 = line.y2;

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);
        }

        function onDragMove(e) {
            e.preventDefault();
            const courtRect = svgCourt.getBoundingClientRect();
            let currentX, currentY;
             if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - courtRect.left;
                currentY = e.touches[0].clientY - courtRect.top;
            } else {
                currentX = e.clientX - courtRect.left;
                currentY = e.clientY - courtRect.top;
            }
            
            const dx = (currentX - startX) / courtRect.width * 100;
            const dy = (currentY - startY) / courtRect.height * 100;
            
            line.x1 = lineStartX1 + dx;
            line.y1 = lineStartY1 + dy;
            line.x2 = lineStartX2 + dx;
            line.y2 = lineStartY2 + dy;
            
            renderAllObjects();
        }

        function onDragEnd() {
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchend', onDragEnd);
            recordState();
        }
    }
    
    function addHandles(element, objectId) {
        if (element.tagName === 'g') { // It's an SVG line
            const line = state.objects.find(o => o.id === objectId);
            if (!line) return;

            const handle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            handle1.setAttribute('cx', `${line.x1}%`);
            handle1.setAttribute('cy', `${line.y1}%`);
            handle1.setAttribute('r', '12');
            handle1.setAttribute('class', 'line-handle');
            makeLineHandleDraggable(handle1, line, 'p1');
            
            const handle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            handle2.setAttribute('cx', `${line.x2}%`);
            handle2.setAttribute('cy', `${line.y2}%`);
            handle2.setAttribute('r', '12');
            handle2.setAttribute('class', 'line-handle');
            makeLineHandleDraggable(handle2, line, 'p2');

            element.appendChild(handle1);
            element.appendChild(handle2);
            
            const midX = (line.x1 + line.x2) / 2;
            const midY = (line.y1 + line.y2) / 2;
            
            // Embed the HTML delete handle inside the SVG group using foreignObject
            const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            const handleSize = 26;
            
            // Calculate pixel positions since foreignObject x/y doesn't use percentages well
            const courtRect = court.getBoundingClientRect();
            const midX_px = ((line.x1 + line.x2) / 2 / 100) * courtRect.width;
            const midY_px = ((line.y1 + line.y2) / 2 / 100) * courtRect.height;

            foreignObject.setAttribute('x', midX_px - (handleSize / 2));
            foreignObject.setAttribute('y', midY_px - (handleSize / 2));
            foreignObject.setAttribute('width', handleSize);
            foreignObject.setAttribute('height', handleSize);
            
            // Create a new div without the conflicting class, and style it manually
            const deleteHandleDiv = document.createElement('div');
            Object.assign(deleteHandleDiv.style, {
                width: `${handleSize}px`,
                height: `${handleSize}px`,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '18px',
                cursor: 'pointer',
                userSelect: 'none',
                color: 'red',
                boxSizing: 'border-box'
            });
            deleteHandleDiv.innerHTML = '&#x2715;';
            deleteHandleDiv.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            deleteHandleDiv.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            });
            deleteHandleDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteObject(line.id);
            });
            
            foreignObject.appendChild(deleteHandleDiv);
            element.appendChild(foreignObject);
            return;
        }


        const deleteHandle = document.createElement('div');
        deleteHandle.className = 'delete-handle';
        deleteHandle.innerHTML = '&#x2715;'; // Cross icon
        deleteHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteObject(objectId);
        });
        
        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'rotate-handle';
        rotateHandle.innerHTML = '&#x21bb;'; // Rotate icon
        
        makeRotatable(rotateHandle, element, objectId);

        element.appendChild(deleteHandle);
        element.appendChild(rotateHandle);
    }

    function makeRotatable(handle, element, objectId) {
        handle.addEventListener('mousedown', onRotateStart);
        handle.addEventListener('touchstart', onRotateStart, { passive: false });

        function onRotateStart(e) {
            e.preventDefault();
            e.stopPropagation();

            document.addEventListener('mousemove', onRotateMove);
            document.addEventListener('touchmove', onRotateMove, { passive: false });
            document.addEventListener('mouseup', onRotateEnd);
            document.addEventListener('touchend', onRotateEnd);
        }

        function onRotateMove(e) {
            e.preventDefault();
            
            const courtRect = court.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            // Find the center of the element in client coordinates
            const elementCenterX = elementRect.left + elementRect.width / 2;
            const elementCenterY = elementRect.top + elementRect.height / 2;

            let clientX, clientY;
            if (e.type === 'touchmove') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // Calculate angle
            const angleRad = Math.atan2(clientY - elementCenterY, clientX - elementCenterX);
            let angleDeg = angleRad * 180 / Math.PI;

            // Apply rotation to the element
            element.style.transform = `rotate(${angleDeg}deg)`;
            
            // Update state
            const objectState = state.objects.find(obj => obj.id === objectId);
            if(objectState) {
                objectState.rotation = angleDeg;
            }
        }

        function onRotateEnd() {
            document.removeEventListener('mousemove', onRotateMove);
            document.removeEventListener('touchmove', onRotateMove);
            document.removeEventListener('mouseup', onRotateEnd);
            document.removeEventListener('touchend', onRotateEnd);
            recordState(); // Save the final rotation state
        }
    }

    function makeDraggable(element) {
        element.addEventListener('mousedown', onDragStart);
        element.addEventListener('touchstart', onDragStart, { passive: false });

        function onDragStart(e) {
            if (e.shiftKey) { return; }
            // Do not drag if the target is a handle
            if (e.target.classList.contains('delete-handle') || e.target.classList.contains('rotate-handle')) {
                return;
            }
            e.preventDefault();
            
            if (state.placementMode) {
                exitPlacementMode();
            }

            selectObject(element, element.id);
            activeItem = element;

            const courtRect = court.getBoundingClientRect();
            let initialX, initialY;

            if (e.type === 'touchstart') {
                initialX = e.touches[0].clientX - courtRect.left;
                initialY = e.touches[0].clientY - courtRect.top;
            } else {
                initialX = e.clientX - courtRect.left;
                initialY = e.clientY - courtRect.top;
            }
            
            // Calculate the offset from the top-left of the element
            const offsetXPercent = (initialX / courtRect.width) * 100 - parseFloat(activeItem.style.left);
            const offsetYPercent = (initialY / courtRect.height) * 100 - parseFloat(activeItem.style.top);


            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);

            function onDragMove(e) {
                if (!activeItem) return;
                e.preventDefault();

                let currentX, currentY;
                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - courtRect.left;
                    currentY = e.touches[0].clientY - courtRect.top;
                } else {
                    currentX = e.clientX - courtRect.left;
                    currentY = e.clientY - courtRect.top;
                }

                let newX = (currentX / courtRect.width) * 100 - offsetXPercent;
                let newY = (currentY / courtRect.height) * 100 - offsetYPercent;
                
                // Constrain to court boundaries
                const elementWidth = parseFloat(activeItem.style.width);
                const elementHeight = parseFloat(activeItem.style.height);
                newX = Math.max(0, Math.min(newX, 100 - elementWidth));
                newY = Math.max(0, Math.min(newY, 100 - elementHeight));


                activeItem.style.left = `${newX}%`;
                activeItem.style.top = `${newY}%`;
                
                // Update state in real-time
                const objectState = state.objects.find(obj => obj.id === activeItem.id);
                if(objectState) {
                    objectState.x = newX;
                    objectState.y = newY;
                }
            }

            function onDragEnd() {
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('touchmove', onDragMove);
                document.removeEventListener('mouseup', onDragEnd);
                document.removeEventListener('touchend', onDragEnd);
                activeItem = null;
                recordState(); // Record state after dragging
            }
        }
    }

    // --- Initial Load ---
    loadState();
    renderAllObjects();
    exitPlacementMode();
    updateColorPicker();

    const toolbar = document.getElementById('toolbar');
    const toggleToolbarBtn = document.getElementById('toggle-toolbar-btn');

    toggleToolbarBtn.addEventListener('click', () => {
        toolbar.classList.toggle('collapsed');
        if (toolbar.classList.contains('collapsed')) {
            toggleToolbarBtn.innerHTML = '&laquo;'; // Arrow pointing left
        } else {
            toggleToolbarBtn.innerHTML = '&raquo;'; // Arrow pointing right
        }
    });

    // Set initial state
    toggleToolbarBtn.innerHTML = '&raquo;'; // Arrow pointing right
});