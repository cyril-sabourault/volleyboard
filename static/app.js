// Entry point for the volleyball strategy board
window.onload = function () {
    const canvas = document.getElementById('court-canvas');
    const ctx = canvas.getContext('2d');
    let orientation = 'horizontal'; // 'horizontal' or 'vertical'

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

    // Toolbar button event
    const toggleBtn = document.getElementById('toggle-orientation');
    toggleBtn.addEventListener('click', function () {
        orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
        toggleBtn.textContent = orientation === 'horizontal' ? 'Switch to Vertical View' : 'Switch to Horizontal View';
        redraw();
    });

    // Burger menu functionality for mobile
    const burgerMenu = document.getElementById('burger-menu');
    const navbarMenu = document.querySelector('.navbar-menu');
    burgerMenu.addEventListener('click', function () {
        navbarMenu.classList.toggle('active');
    });

    window.addEventListener('resize', redraw);

    redraw();
};
