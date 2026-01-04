// App.js
const { jsPDF } = window.jspdf;

// --- Constants & Config ---
const DPI = 300;
const MM_TO_PX = DPI / 25.4; // approx 11.811

const BADGE_CONFIGS = {
    circle60: {
        type: 'circle',
        name: 'Círculo 60mm',
        visibleW: 60,
        visibleH: 60,
        bleedW: 66,
        bleedH: 66,
    },
    circle45: {
        type: 'circle',
        name: 'Círculo 45mm',
        visibleW: 45,
        visibleH: 45,
        bleedW: 51,
        bleedH: 51,
    },
    heart: {
        type: 'heart',
        name: 'Corazón',
        visibleW: 55,
        visibleH: 50,
        bleedW: 61,
        bleedH: 56,
    }
};

// --- State ---
let state = {
    image: null,      // Image object
    imgX: 0,          // Canvas pixels (relative to center)
    imgY: 0,          // Canvas pixels (relative to center)
    scale: 1,         // Combined scale
    baseScale: 1,     // Scale to fit image in view initially
    userZoom: 1,      // User slider value (0.1 - 3.0)
    currentShape: 'circle60',
    showMask: true,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    // Queue State
    queue: [] // Array of { id, dataUrl, config, widthMM, heightMM }
};

// --- Elements ---
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const placeholderState = document.getElementById('placeholderState');
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const shapeSelect = document.getElementById('shapeSelect');
const zoomRange = document.getElementById('zoomRange');
const zoomValue = document.getElementById('zoomValue');
const centerBtn = document.getElementById('centerBtn');
const resetBtn = document.getElementById('resetBtn');
const maskToggle = document.getElementById('maskToggle');
const addToQueueBtn = document.getElementById('addToQueueBtn');
const queueSection = document.getElementById('queueSection');
const queueList = document.getElementById('queueList');
const queueCount = document.getElementById('queueCount');
const clearQueueBtn = document.getElementById('clearQueueBtn');
const downloadBtn = document.getElementById('downloadBtn');

// --- Initialization ---
function init() {
    // Event Listeners
    uploadBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageUpload);

    shapeSelect.addEventListener('change', (e) => {
        state.currentShape = e.target.value;
        updateCanvasDimensions();
        resetView();
        draw();
    });

    zoomRange.addEventListener('input', (e) => {
        state.userZoom = parseFloat(e.target.value);
        zoomValue.textContent = Math.round(state.userZoom * 100) + '%';
        draw();
    });

    centerBtn.addEventListener('click', centerImage);
    resetBtn.addEventListener('click', resetView);

    maskToggle.addEventListener('change', (e) => {
        state.showMask = e.target.checked;
        draw();
    });

    addToQueueBtn.addEventListener('click', addToQueue);
    clearQueueBtn.addEventListener('click', clearQueue);
    downloadBtn.addEventListener('click', exportQueueToPDF);

    // Canvas Interaction
    canvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);

    // Touch support
    canvas.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
    window.addEventListener('touchmove', (e) => {
        if (state.isDragging) e.preventDefault();
        drag(e.touches[0]);
    }, { passive: false });
    window.addEventListener('touchend', endDrag);

    // Initial Setup
    updateCanvasDimensions();
    updateQueueUI();
}

// --- Logic ---

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            state.image = img;
            placeholderState.classList.add('d-none');
            canvas.classList.remove('d-none');
            resetView(); // calcs base scale and centers
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateCanvasDimensions() {
    const config = BADGE_CONFIGS[state.currentShape];
    canvas.width = config.bleedW * MM_TO_PX;
    canvas.height = config.bleedH * MM_TO_PX;
}

function resetView() {
    if (!state.image) return;
    state.imgX = 0;
    state.imgY = 0;
    state.userZoom = 1;
    zoomRange.value = 1;
    zoomValue.textContent = '100%';

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const imgW = state.image.width;
    const imgH = state.image.height;

    const scaleX = canvasW / imgW;
    const scaleY = canvasH / imgH;
    state.baseScale = Math.max(scaleX, scaleY);
    state.scale = state.baseScale * state.userZoom;

    draw();
}

function centerImage() {
    state.imgX = 0;
    state.imgY = 0;
    draw();
}

// --- Dragging Logic ---
function startDrag(e) {
    if (!state.image) return;
    state.isDragging = true;
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;
}

function drag(e) {
    if (!state.isDragging || !state.image) return;

    const dx = e.clientX - state.lastMouseX;
    const dy = e.clientY - state.lastMouseY;

    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;

    // Tracking drag in screen pixels but mapping to canvas? 
    // Actually we just move the image directly.
    // We need to account for canvas scaling on screen (CSS width vs attribute width) if we want 1:1 mouse movement.
    const rect = canvas.getBoundingClientRect();
    const displayRatio = canvas.width / rect.width;

    state.imgX += dx * displayRatio;
    state.imgY += dy * displayRatio;

    draw();
}

function endDrag() {
    state.isDragging = false;
}

// --- Drawing ---

function draw(exportMode = false) {
    if (!state.image) return;

    const config = BADGE_CONFIGS[state.currentShape];
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Image Transform
    const currentScale = state.baseScale * state.userZoom;
    const drawW = state.image.width * currentScale;
    const drawH = state.image.height * currentScale;

    const cx = w / 2;
    const cy = h / 2;

    ctx.save();
    ctx.translate(cx + state.imgX, cy + state.imgY);
    ctx.drawImage(state.image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // If Export Mode: We want to mask everything OUTSIDE the bleed as white?
    // No, the canvas IS the bleed area.
    // But we want to indicate the SHAPE.
    // So we should 'cut' the corners to white if it's a circle, so it prints as a circle (effectively).
    // This saves ink and looks better.
    // User requested "forma que se solicito". 
    // So for export: we MASK to the bleed shape (Circle 66mm or Heart Bbox).

    if (exportMode) {
        // Draw White Mask outside of the BLEED shape
        // Note: Bleed Shape is usually the full canvas for Rect/Square, but for Circle button, the bleed is circular.
        // The machine punches a circle. The corners are waste.
        // So we can mask the corners white.
        drawBleedMask(config, w, h);

        // Draw Cut Line (Thin Grey) on the edge of the bleed
        // This helps if the mask is white and paper is white.
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (config.type === 'circle') {
            ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2); // w is bleedW_px
        } else if (config.type === 'heart') {
            // Use the heart path logic but fitted to the full bleed size
            // Our 'visible' heart code was for the visible area.
            // We need a path for the BLEED heart.
            // For simplicity, let's assume the canvas rect IS the bleed bounds.
            // We'll mask using the heart path scaled to fill the canvas.
            drawCenteredHeartPath(ctx, cx, cy, w); // w is max width
        }
        ctx.stroke();

    } else {
        // Normal Editor Mode
        if (state.showMask) {
            drawOverlay(config, w, h);
        }
    }
}

// Used for Export: Masks out the corners -> White
// Used for Export: Masks out the corners -> White
function drawBleedMask(config, w, h) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.rect(0, 0, w, h); // Outer

    // Inner punch (Bleed Shape)
    const cx = w / 2;
    const cy = h / 2;

    // We want to remove the shape from the white rect.
    // We extend the hole slightly (+1 px) to avoid any white anti-aliasing slivers at the very edge.
    // The machine cuts at the edge, so we want the image to definitely bleeding past/to it.

    if (config.type === 'circle') {
        ctx.arc(cx, cy, (w / 2) + 1, 0, Math.PI * 2, true);
    } else if (config.type === 'heart') {
        // Use the heart path logic but fitted to the full bleed size
        // We also scale it slightly up to ensure coverage
        drawCenteredHeartPath(ctx, cx, cy, w + 1);
    }

    ctx.clip('evenodd');
    ctx.fill();
    ctx.restore();

    // Draw Cut Line (Very Thin Grey)
    // We draw this ON TOP of the mask.
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)'; // More transparent
    ctx.lineWidth = 0.5; // Very fine line
    ctx.beginPath();
    if (config.type === 'circle') {
        // Exact edge
        ctx.arc(cx, cy, (w / 2) - 0.5, 0, Math.PI * 2);
    } else if (config.type === 'heart') {
        drawCenteredHeartPath(ctx, cx, cy, w); // Exact size
    }
    ctx.stroke();
}

// Helper: Just defines the path (no fill/stroke)
// Helper: Just defines the path (no fill/stroke)
function drawCenteredHeartPath(ctx, x, y, width) {
    // The SVG path below has a drawing width of roughly 20 units (from x=2 to x=22).
    // The previous divisor was 24, which included padding.
    // We use 20 to ensure the heart shape actually touches the 'width' bounds.
    const scale = width / 20;

    ctx.save();
    ctx.translate(x - 12 * scale, y - 11 * scale);
    ctx.scale(scale, scale);
    ctx.moveTo(12, 21.35);
    ctx.lineTo(10.55, 20.03);
    ctx.bezierCurveTo(5.4, 15.36, 2, 12.28, 2, 8.5);
    ctx.bezierCurveTo(2, 5.42, 4.42, 3, 7.5, 3);
    ctx.bezierCurveTo(9.24, 3, 10.91, 3.81, 12, 5.09);
    ctx.bezierCurveTo(13.09, 3.81, 14.76, 3, 16.5, 3);
    ctx.bezierCurveTo(19.58, 3, 22, 5.42, 22, 8.5);
    ctx.bezierCurveTo(22, 12.28, 18.6, 15.36, 13.45, 20.03);
    ctx.lineTo(12, 21.35);
    ctx.closePath();
    ctx.restore();
}

function drawOverlay(config, w, h) {
    // Editor Overlay: Shows Visible Area vs Bleed Area
    if (!state.image) return;

    ctx.save();

    // 1. Mask Logic (Using evenodd rule to create a hole)
    // We draw the Outer Rect AND the Inner Shape in the same path.
    // 'evenodd' fill will leave the center hole transparency (0 opacity), preserving the image below.

    ctx.beginPath();
    // Outer Rect
    ctx.rect(0, 0, w, h);

    // Inner Shape
    const visibleW_px = config.visibleW * MM_TO_PX;
    const cx = w / 2;
    const cy = h / 2;

    if (config.type === 'circle') {
        ctx.arc(cx, cy, visibleW_px / 2, 0, Math.PI * 2);
    } else if (config.type === 'heart') {
        drawCenteredHeartPath(ctx, cx, cy, visibleW_px);
    }

    // Fill the path using 'evenodd' rule
    // This fills the area BETWEN the rect and the shape.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill('evenodd');

    // 2. Outlines (Thinner now)
    // Visible Area (Green)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2; // Fixed pixels
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    if (config.type === 'circle') {
        ctx.arc(cx, cy, visibleW_px / 2, 0, Math.PI * 2);
    } else if (config.type === 'heart') {
        drawCenteredHeartPath(ctx, cx, cy, visibleW_px);
    }
    ctx.stroke();

    // Bleed Edge (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1; // Thinner
    ctx.setLineDash([]);
    ctx.strokeRect(0, 0, w, h);

    ctx.restore();
}

// --- Queue & Export Logic ---

function addToQueue() {
    try {
        if (!state.image) {
            alert('Primero sube una imagen.');
            return;
        }

        // 1. Render for Export (With Bleed Mask!)
        draw(true); // exportMode = true
        const dataUrl = canvas.toDataURL('image/png', 1.0);

        // 2. Restore View
        draw(false);

        // 3. Add to Queue
        const config = BADGE_CONFIGS[state.currentShape];
        state.queue.push({
            id: Date.now(),
            dataUrl: dataUrl,
            config: config,
            widthMM: config.bleedW,
            heightMM: config.bleedH
        });

        updateQueueUI();
    } catch (err) {
        console.error("Queue Error:", err);
        alert("Error al agregar a la cola: " + err.message);
        try { draw(false); } catch (e) { }
    }
}

function updateQueueUI() {
    queueCount.textContent = state.queue.length;

    if (state.queue.length > 0) {
        queueSection.classList.remove('d-none');
        downloadBtn.innerHTML = `<span class="position-relative z-1"><i class="bi bi-file-earmark-pdf-fill me-2"></i> Descargar PDF (${state.queue.length})</span>`;
    } else {
        queueSection.classList.add('d-none');
        downloadBtn.innerHTML = `<span class="position-relative z-1"><i class="bi bi-file-earmark-pdf-fill me-2"></i> Descargar PDF</span>`;
    }

    queueList.innerHTML = '';
    state.queue.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'queue-item shadow-sm';
        div.style.backgroundImage = `url(${item.dataUrl})`;
        div.innerHTML = `<div class="queue-remove" onclick="removeItem(${index})">&times;</div>`;
        queueList.appendChild(div);
    });
}

// Global for inline onclick
window.removeItem = function (index) {
    state.queue.splice(index, 1);
    updateQueueUI();
}

function clearQueue() {
    state.queue = [];
    updateQueueUI();
}

function exportQueueToPDF() {
    if (state.queue.length === 0) {
        // If nothing in queue, try to add current canvas?
        if (state.image) {
            addToQueue();
            // Continue immediately
        } else {
            alert("Agrega diseños a la lista primero.");
            return;
        }
    }

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;

    let currentX = margin;
    let currentY = margin;
    let rowMaxH = 0;

    state.queue.forEach((item, index) => {
        // Check if fits in current row
        if (currentX + item.widthMM > pageWidth - margin) {
            // New Row
            currentX = margin;
            currentY += rowMaxH + 2; // + padding
            rowMaxH = 0;
        }

        // Check if fits in page
        if (currentY + item.heightMM > pageHeight - margin) {
            // New Page
            doc.addPage();
            currentX = margin;
            currentY = margin;
            rowMaxH = 0;
        }

        // Draw
        doc.addImage(item.dataUrl, 'PNG', currentX, currentY, item.widthMM, item.heightMM);

        // Update Grid State
        currentX += item.widthMM + 2; // + padding
        if (item.heightMM > rowMaxH) rowMaxH = item.heightMM;
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ALaMedida: ${state.queue.length} diseños`, 10, 10);

    doc.save(`ALaMedida-${state.queue.length}-imagenes.pdf`);
}

init();
