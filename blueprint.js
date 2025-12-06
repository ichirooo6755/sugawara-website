/**
 * Terminator T-800 Blueprint Effects
 * Grid animation, typewriter, and scan line effects
 */

(function() {
    'use strict';

    // ========== Canvas Grid Setup ==========
    const canvas = document.getElementById('grid-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    let gridInitialized = false;
    let xDone = false;
    let yDone = false;
    
    const grid = { x: [], y: [] };
    const gridSize = 50;
    
    // ========== Resize Handler ==========
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initGrid();
    }
    
    // ========== Initialize Grid ==========
    function initGrid() {
        const xCount = Math.ceil(canvas.width / gridSize);
        const yCount = Math.ceil(canvas.height / gridSize);
        
        grid.x = [];
        grid.y = [];
        
        for (let i = 0; i <= xCount; i++) {
            grid.x[i] = {
                x: gridSize * i,
                y: 0,
                h: gridInitialized ? canvas.height : 0,
                inc: yCount
            };
        }
        
        for (let i = 0; i <= yCount; i++) {
            grid.y[i] = {
                x: 0,
                y: gridSize * i,
                w: gridInitialized ? canvas.width : 0,
                inc: xCount
            };
        }
    }
    
    // ========== Render Grid ==========
    function renderGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        if (!gridInitialized) {
            // Animate grid lines
            let xComplete = true;
            let yComplete = true;
            
            for (let i = 0; i < grid.x.length; i++) {
                const line = grid.x[i];
                if (line.h < canvas.height) {
                    line.h += line.inc * 2;
                    xComplete = false;
                }
                ctx.moveTo(line.x, line.y);
                ctx.lineTo(line.x, Math.min(line.h, canvas.height));
            }
            
            for (let i = 0; i < grid.y.length; i++) {
                const line = grid.y[i];
                if (line.w < canvas.width) {
                    line.w += line.inc * 2;
                    yComplete = false;
                }
                ctx.moveTo(line.x, line.y);
                ctx.lineTo(Math.min(line.w, canvas.width), line.y);
            }
            
            if (xComplete && yComplete) {
                gridInitialized = true;
            }
        } else {
            // Static grid
            for (let i = 0; i < grid.x.length; i++) {
                const line = grid.x[i];
                ctx.moveTo(line.x, 0);
                ctx.lineTo(line.x, canvas.height);
            }
            
            for (let i = 0; i < grid.y.length; i++) {
                const line = grid.y[i];
                ctx.moveTo(0, line.y);
                ctx.lineTo(canvas.width, line.y);
            }
        }
        
        ctx.stroke();
    }
    
    // ========== Animation Loop ==========
    function animate() {
        renderGrid();
        requestAnimationFrame(animate);
    }
    
    // ========== Typewriter Effect (Disabled to avoid overlap) ==========
    function initTypewriter() {
        // Typewriter disabled - navigation is now in the main container
        const textElement = document.getElementById('text');
        const text2Element = document.getElementById('text2');
        
        // Hide typewriter elements
        if (textElement) textElement.style.display = 'none';
        if (text2Element) text2Element.style.display = 'none';
    }
    
    // ========== Initialize ==========
    function init() {
        resize();
        animate();
        initTypewriter();
    }
    
    // ========== Event Listeners ==========
    window.addEventListener('resize', resize);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
