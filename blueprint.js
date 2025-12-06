/**
 * Terminator T-800 Blueprint Effects
 * Grid animation, typing effect, and anime.js content animations
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
                inc: yCount * 2
            };
        }
        
        for (let i = 0; i <= yCount; i++) {
            grid.y[i] = {
                x: 0,
                y: gridSize * i,
                w: gridInitialized ? canvas.width : 0,
                inc: xCount * 2
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
        
        for (let i = 0; i < grid.x.length; i++) {
            const line = grid.x[i];
            
            if (!gridInitialized && line.h < canvas.height) {
                line.h += line.inc;
                xComplete = false;
            }
            
            ctx.moveTo(line.x, 0);
            ctx.lineTo(line.x, Math.min(line.h, canvas.height));
        }
        
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
    
    // ========== Typing Effect (No Cursor) ==========
    function typeText(element, text, speed = 50, callback) {
        element.textContent = '';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        let i = 0;
        
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else if (callback) {
                callback();
            }
        }
        
        type();
    }
    
    // ========== Init Typing Effects ==========
    function initTypingEffects() {
        const navLeft = document.querySelector('.nav-left');
        const heroTitle = document.querySelector('.hero-title');
        const tagline = document.querySelector('.tagline');
        const taglineSub = document.querySelector('.tagline-sub');
        const commentHeader = document.querySelector('.comment-section h2');
        
        // Save original text
        const texts = {
            navLeft: navLeft ? navLeft.textContent : '',
            heroTitle: heroTitle ? heroTitle.textContent : '',
            tagline: tagline ? tagline.textContent : '',
            taglineSub: taglineSub ? taglineSub.textContent : '',
            commentHeader: commentHeader ? commentHeader.textContent : ''
        };
        
        // Clear all text initially
        if (navLeft) navLeft.textContent = '';
        if (heroTitle) heroTitle.textContent = '';
        if (tagline) tagline.textContent = '';
        if (taglineSub) taglineSub.textContent = '';
        if (commentHeader) commentHeader.textContent = '';
        
        // Start typing sequence after grid animation starts
        setTimeout(() => {
            // Nav left typing
            if (navLeft) {
                typeText(navLeft, texts.navLeft, 40);
            }
        }, 500);
        
        setTimeout(() => {
            // Hero title typing
            if (heroTitle) {
                typeText(heroTitle, texts.heroTitle, 60);
            }
        }, 800);
        
        setTimeout(() => {
            // Tagline typing
            if (tagline) {
                typeText(tagline, texts.tagline, 50, () => {
                    // Tagline sub after main tagline
                    if (taglineSub) {
                        setTimeout(() => {
                            typeText(taglineSub, texts.taglineSub, 50);
                        }, 200);
                    }
                });
            }
        }, 1200);
        
        setTimeout(() => {
            // Comment header typing
            if (commentHeader) {
                typeText(commentHeader, texts.commentHeader, 60);
            }
        }, 2000);
    }
    
    // ========== Content Animations with anime.js ==========
    function initContentAnimations() {
        if (typeof anime === 'undefined') return;
        
        // Nav slides down
        anime({
            targets: 'nav',
            opacity: [0, 1],
            translateY: [-30, 0],
            easing: 'easeOutExpo',
            duration: 800,
            delay: 300
        });
        
        // Hero section fades in
        anime({
            targets: '.hero-section',
            opacity: [0, 1],
            scale: [0.9, 1],
            easing: 'easeOutExpo',
            duration: 1000,
            delay: 600
        });
        
        // Tagline section slides up
        anime({
            targets: '.tagline-section',
            opacity: [0, 1],
            translateY: [40, 0],
            easing: 'easeOutExpo',
            duration: 1000,
            delay: 1000
        });
        
        // Comment section slides in from left
        anime({
            targets: '.comment-section',
            opacity: [0, 1],
            translateX: [-30, 0],
            easing: 'easeOutExpo',
            duration: 800,
            delay: 1500
        });
        
        // Footer fades in
        anime({
            targets: 'footer',
            opacity: [0, 1],
            easing: 'easeOutExpo',
            duration: 600,
            delay: 1800
        });
    }
    
    // ========== Initialize ==========
    function init() {
        resize();
        animate();
        
        setTimeout(() => {
            initContentAnimations();
            initTypingEffects();
        }, 200);
    }
    
    // ========== Event Listeners ==========
    window.addEventListener('resize', resize);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
