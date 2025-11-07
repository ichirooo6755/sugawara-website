/* ===== 描画エンジン (SVG/rAF) ===== */

const PRE_DRAW_TIME = 400; // block-red のみが光る時間 (ms)
const POST_DRAW_TIME = 100; // 次の要素までの待機時間 (ms)
const LINE_DRAW_SPEED = 2.5; // 線の描画速度 (px/ms)
const TEXT_DRAW_SPEED = 50; // 1文字あたりの描画速度 (ms)

/**
 * 処理を一時停止するヘルパー関数
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ... (animateStroke, drawBorderSVG, drawBorderSVGStatic の関数は変更なし) ...
function animateStroke(el, duration) {
    return new Promise(resolve => {
        const length = parseFloat(el.dataset.length);
        let startTime = null;

        function frame(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            
            const progress = Math.min(elapsed / duration, 1);
            const newOffset = length * (1 - progress);
            
            el.style.strokeDashoffset = newOffset;

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(frame);
    });
}


async function drawBorderSVG(container) {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w <= 2 || h <= 2) {
        container.style.visibility = 'visible'; 
        container.style.opacity = '1';
        return;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "dynamic-svg-border");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const p = { x1: 1, y1: 1, x2: w - 1, y2: h - 1 };
    if (p.x2 < p.x1) p.x2 = p.x1;
    if (p.y2 < p.y1) p.y2 = p.y1;

    const points = `${p.x1},${p.y1} ${p.x2},${p.y1} ${p.x2},${p.y2} ${p.x1},${p.y2} ${p.x1},${p.y1}`;
    const length = (p.x2 - p.x1) * 2 + (p.y2 - p.y1) * 2; 

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points);
    polyline.dataset.length = length;
    polyline.style.strokeDasharray = length;
    polyline.style.strokeDashoffset = length;

    polyline.style.stroke = "#550";
    polyline.style.strokeWidth = "1px";
    svg.appendChild(polyline);
    
    container.style.visibility = 'visible';
    container.style.opacity = '1'; 
    container.appendChild(svg);

    const duration = length / LINE_DRAW_SPEED;
    await animateStroke(polyline, duration);
    
    polyline.style.stroke = "#FF0";
    polyline.style.strokeWidth = "2px";

    await sleep(POST_DRAW_TIME);
}

function drawBorderSVGStatic(container) {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w <= 2 || h <= 2) return; 

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "dynamic-svg-border");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const p = { x1: 1, y1: 1, x2: w - 1, y2: h - 1 };
    const points = `${p.x1},${p.y1} ${p.x2},${p.y1} ${p.x2},${p.y2} ${p.x1},${p.y2} ${p.x1},${p.y1}`;

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points);
    polyline.style.strokeDashoffset = 0; 
    
    polyline.style.stroke = "#FF0";
    polyline.style.strokeWidth = "2px";
    
    svg.appendChild(polyline);
    container.appendChild(svg);
    container.style.visibility = 'visible';
    container.style.opacity = '1';
}

/**
 * 要素（テキストやブロック）を「枠線→塗りつぶし」で描画する (1文字ずつ表示にも対応)
 * @param {HTMLElement} el - 対象の要素
 */
async function drawElement(el) {
    const type = el.dataset.drawType;
    if (!type) {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        return;
    }
    
    const preClass = `${type}-pre`;
    const postClass = `${type}-post`;

    const isTypingText = type.startsWith('text-') || type === 'comment';
    const isFullAnim = type === 'block-red' || type.startsWith('form-');


    let originalText = '';
    let isAnchor = el.tagName === 'A';

    // 1. 共通の初期化処理
    el.classList.add('drawing-element-pre', preClass);
    el.style.visibility = 'visible';
    el.style.opacity = '1'; 
    
    // 2. 1文字ずつ表示が必要な要素の処理
    if (isTypingText && !type.startsWith('form-')) { 
        
        // 元のHTMLを保持
        originalText = el.innerHTML;
        
        // テキストノードと特殊タグを配列に格納
        const nodeContents = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalText;
        
        // <a>タグの場合は全体を一つのテキストノードとして扱う
        if (isAnchor) {
            nodeContents.push({ type: 'text', content: el.textContent.trim() });
        } else {
            Array.from(tempDiv.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                    nodeContents.push({ type: 'text', content: node.textContent });
                } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG') {
                    nodeContents.push({ type: 'strong', content: node.textContent });
                } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
                    nodeContents.push({ type: 'br', content: '<br>' });
                }
            });
        }
        
        // 描画用の文字数をカウント（<br>などは数に含めない）
        const totalChars = nodeContents.reduce((sum, node) => sum + (node.type !== 'br' ? node.content.length : 0), 0);
        let currentTotalCharsDisplayed = 0;
        
        el.innerHTML = ''; // 一旦中身を空にする
        
        // 1文字ずつ表示を実行
        for (let i = 0; i < totalChars; i++) {
            currentTotalCharsDisplayed++;
            let tempContent = '';
            let charsProcessed = 0;

            for (const tNode of nodeContents) {
                if (tNode.type === 'br') {
                     tempContent += tNode.content; // <br>は即時表示
                     continue;
                }
                // 現在表示すべき文字数
                const charsToDisplay = Math.min(tNode.content.length, currentTotalCharsDisplayed - charsProcessed);
                if (charsToDisplay > 0) {
                    const partialContent = tNode.content.substring(0, charsToDisplay);
                    if (tNode.type === 'strong') {
                        tempContent += `<strong>${partialContent}</strong>`;
                    } else {
                        tempContent += partialContent;
                    }
                }
                charsProcessed += tNode.content.length;
            }
            el.innerHTML = tempContent;
            
            if (i < totalChars - 1) { // 最後の文字以外で待機
                 await sleep(TEXT_DRAW_SPEED);
            }
        }
    
        // 1文字ずつ表示完了後の待機 (block-red の場合は枠線→塗りつぶしアニメーション前の待機)
        await sleep(isFullAnim ? PRE_DRAW_TIME : 100); 

    } else if (isFullAnim) {
        // フォーム要素 (form-input, form-button) は、枠線→塗りつぶしアニメーションのみ
        await sleep(PRE_DRAW_TIME); 
    }
    
    // 3. 塗りつぶしへ移行 (post)
    el.classList.remove('drawing-element-pre', preClass);
    el.classList.add('drawing-element-post', postClass);
    
    // テキストタイプの場合、元の内容を完全表示に戻す
    if (isTypingText && !type.startsWith('form-')) {
        el.innerHTML = originalText; 
    }
    
    await sleep(POST_DRAW_TIME / 2);
}


/**
 * メインの描画エンジン (再帰処理に変更)
 */
async function drawEngine(rootElement) {
    const children = rootElement.querySelectorAll(':scope > [data-draw]');

    for (const child of children) {
        const drawType = child.dataset.draw;

        if (drawType === 'container') {
            await drawBorderSVG(child);
            await drawEngine(child); 
            
        } else if (drawType === 'element') {
            await drawElement(child);
        }
    }
}


/* ===== コメント機能 & ページ読み込み時のメイン処理 (変更なし) ===== */

function initializeComments() {
    const form = document.getElementById("comment-form");
    const commentList = document.getElementById("comment-list");
    if (!form || !commentList) return;

    async function renderComments(comments, animate = false) {
        commentList.innerHTML = "";
        const commentElements = [];

        comments.forEach(c => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${c.name}</strong>: ${c.comment}`;
            
            li.dataset.draw = "element"; 
            li.dataset.drawType = "comment"; 
            
            commentList.appendChild(li);
            commentElements.push(li);
        });

        if (animate) {
            const drawTasks = commentElements.map(async (li) => {
                await drawElement(li); 
            });
            await Promise.all(drawTasks);
        } else {
            for (const li of commentElements) {
                li.style.visibility = 'visible';
                li.style.opacity = '1';
                li.classList.add('drawing-element-post', 'comment-post');
            }
        }
    }

    async function fetchComments(animateOnLoad = false) {
        try {
            // Netlify Functions からコメントを取得
            const res = await fetch("/.netlify/functions/getComments");
            if (!res.ok) throw new Error("関数呼び出しエラー");
            const comments = await res.json();
            await renderComments(comments, animateOnLoad);
            localStorage.setItem("comments", JSON.stringify(comments));
        } catch (e) {
            console.warn("Netlify関数失敗。ローカルコメントを使用:", e.message);
            // 失敗時はローカルストレージから取得
            const local = JSON.parse(localStorage.getItem("comments") || "[]");
            await renderComments(local, animateOnLoad);
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = form.name.value.trim();
        const comment = form.comment.value.trim();
        if (!name || !comment) return;

        const newComment = { name, comment };

        try {
            // Netlify Functions でコメントを送信
            const res = await fetch("/.netlify/functions/addComment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newComment),
            });
            if (!res.ok) throw new Error("送信失敗");
            form.reset();
            await fetchComments(true); 
        } catch (e) {
            console.warn("Netlify関数エラー。ローカル保存:", e.message);
            // 失敗時はローカルストレージに追加
            const local = JSON.parse(localStorage.getItem("comments") || "[]");
            local.push(newComment);
            localStorage.setItem("comments", JSON.stringify(local));
            await renderComments(local, true);
            form.reset();
        }
    });


    fetchComments(true); 
}


/* ===== ページ読み込み時のメイン処理 ===== */
document.addEventListener("DOMContentLoaded", async () => {
    
    const terminal = document.getElementById('terminal-screen');
    
    terminal.style.visibility = 'visible'; 
    
    await drawBorderSVG(terminal);
    
    await drawEngine(terminal);
    
    initializeComments();
});