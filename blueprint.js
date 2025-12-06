/**
 * Terminator T-800 Blueprint Effects
 * Grid animation, typewriter, and stroke animations
 */

(function() {
    'use strict';

    // ========== Canvas Grid Setup ==========
    const canvas = document.getElementById('grid-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    let gridInitialized = false;
    
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
        const xCount = Math.ceil(canvas.width / gridSize) + 1;
        const yCount = Math.ceil(canvas.height / gridSize) + 1;
        
        grid.x = [];
        grid.y = [];
        
        for (let i = 0; i <= xCount; i++) {
            grid.x[i] = {
                x: gridSize * i,
                y: 0,
                h: gridInitialized ? canvas.height : 0,
                inc: yCount * 2  // Speed multiplier
            };
        }
        
        for (let i = 0; i <= yCount; i++) {
            grid.y[i] = {
                x: 0,
                y: gridSize * i,
                w: gridInitialized ? canvas.width : 0,
                inc: xCount * 2  // Speed multiplier
            };
        }
    }
    
    // ========== Render Grid ==========
    function renderGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        let xComplete = true;
        let yComplete = true;
        
        // Draw vertical lines (growing downward)
        for (let i = 0; i < grid.x.length; i++) {
            const line = grid.x[i];
            
            if (!gridInitialized && line.h < canvas.height) {
                line.h += line.inc;
                xComplete = false;
            }
            
            ctx.moveTo(line.x, 0);
            ctx.lineTo(line.x, Math.min(line.h, canvas.height));
        }
        
        // Draw horizontal lines (growing rightward)
        for (let i = 0; i < grid.y.length; i++) {
            const line = grid.y[i];
            
            if (!gridInitialized && line.w < canvas.width) {
                line.w += line.inc;
                yComplete = false;
            }
            
            ctx.moveTo(0, line.y);
            ctx.lineTo(Math.min(line.w, canvas.width), line.y);
        }
        
        ctx.stroke();
        
        if (xComplete && yComplete && !gridInitialized) {
            gridInitialized = true;
        }
    }
    
    // ========== Animation Loop ==========
    function animate() {
        renderGrid();
        requestAnimationFrame(animate);
    }
    
    // ========== Typewriter Effect ==========
    function initTypewriter() {
        const textElement = document.getElementById('text');
        const text2Element = document.getElementById('text2');
        
        if (textElement && typeof Typewriter !== 'undefined') {
            const typewriter = new Typewriter(textElement, {
                delay: 30,
                cursor: '█'
            });
            
            typewriter
                .pauseFor(800)
                .typeString('SGWR PORTFOLIO')
                .pauseFor(2000)
                .start();
        }
        
        if (text2Element && typeof Typewriter !== 'undefined') {
            const typewriter2 = new Typewriter(text2Element, {
                loop: true,
                delay: 30,
                cursor: '█'
            });
            
            typewriter2
                .pauseFor(3000)
                .typeString('WITHOUT FILM')
                .pauseFor(2500)
                .deleteAll()
                .pauseFor(300)
                .typeString('STILL FILM')
                .pauseFor(2500)
                .deleteAll()
                .start();
        }
    }
    
    // ========== SVG Stroke Animation with anime.js ==========
    function initSVGAnimations() {
        // Animate any SVG paths, circles, lines in the page
        if (typeof anime !== 'undefined') {
            // Animate nav border
            anime({
                targets: '.dynamic-svg-border polyline',
                strokeDashoffset: [anime.setDashoffset, 0],
                easing: 'easeInOutSine',
                duration: 800,
                delay: function(el, i) { return i * 100; }
            });
            
            // Animate text with stagger
            anime({
                targets: '.hero-title',
                opacity: [0, 1],
                translateY: [30, 0],
                easing: 'easeOutExpo',
                duration: 1200,
                delay: 1000
            });
            
            // Animate comment section
            anime({
                targets: '.comment-section',
                opacity: [0, 1],
                translateX: [-20, 0],
                easing: 'easeOutExpo',
                duration: 800,
                delay: 1500
            });
            
            // Animate nav
            anime({
                targets: 'nav',
                opacity: [0, 1],
                translateY: [-20, 0],
                easing: 'easeOutExpo',
                duration: 600,
                delay: 500
            });
            
            // Animate footer
            anime({
                targets: 'footer',
                opacity: [0, 1],
                easing: 'easeOutExpo',
                duration: 600,
                delay: 2000
            });
        }
    }
    
    // ========== Initialize ==========
    function init() {
        resize();
        animate();
        
        // Wait a bit for grid to start, then show content
        setTimeout(() => {
            initTypewriter();
            initSVGAnimations();
        }, 300);
    }
    
    // ========== Event Listeners ==========
    window.addEventListener('resize', resize);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
