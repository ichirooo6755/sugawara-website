/* ===== 描画エンジン (SVG/rAF) ===== */

const PRE_DRAW_TIME = 400; // テキストが光る時間 (ms)
const POST_DRAW_TIME = 100; // 次の要素までの待機時間 (ms)
const LINE_DRAW_SPEED = 2.5; // 線の描画速度 (px/ms)。大きいほど速い

/**
 * 処理を一時停止するヘルパー関数
 * @param {number} ms - 停止するミリ秒
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 1本のSVGストローク(line/polyline)を requestAnimationFrame で描画する
 * @param {SVGGeometryElement} el - 対象のline/polyline要素
 * @param {number} duration - アニメーション時間 (ms)
 */
function animateStroke(el, duration) { // animateLine からリネーム
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

/**
 * コンテナにSVGボーダーを生成し、アニメーション描画する (Polyline版)
 * @param {HTMLElement} container - 対象のコンテナ要素
 */
async function drawBorderSVG(container) {
    // 0. コンテナの寸法を正確に測定
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // 1. SVG要素を生成
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "dynamic-svg-border");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    // 2. 1本のポリラインを生成 (左上から時計回り)
    //    (1pxのオフセットを考慮)
    const p = { x1: 1, y1: 1, x2: w - 1, y2: h - 1 };
    // w=0, h=0 のコンテナ（非表示要素など）の場合、座標がマイナスになるのを防ぐ
    if (p.x2 < p.x1) p.x2 = p.x1;
    if (p.y2 < p.y1) p.y2 = p.y1;

    const points = `${p.x1},${p.y1} ${p.x2},${p.y1} ${p.x2},${p.y2} ${p.x1},${p.y2} ${p.x1},${p.y1}`;
    const length = (p.x2 - p.x1) * 2 + (p.y2 - p.y1) * 2; // 周長

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points);
    polyline.dataset.length = length;
    polyline.style.strokeDasharray = length;
    polyline.style.strokeDashoffset = length; // 初期状態（描画前）
    polyline.style.fill = "none"; // Polylineはfillの無効化が必須

    // 3. 描画フェーズ1: 薄い線 (#550, 1px)
    polyline.style.stroke = "#550";
    polyline.style.strokeWidth = "1px";
    svg.appendChild(polyline);
    
    container.appendChild(svg);
    container.style.opacity = '1'; // コンテナを表示

    // 4. アニメーション実行
    const duration = length / LINE_DRAW_SPEED;
    await animateStroke(polyline, duration); // animateLine -> animateStroke
    
    // 5. 描画フェーズ2: 濃い線 (#FF0, 2px)
    polyline.style.stroke = "#FF0";
    polyline.style.strokeWidth = "2px";

    await sleep(POST_DRAW_TIME); // 濃くなってから一呼吸おく
}

/**
 * コンテナにSVGボーダーを静的に（アニメーションなしで）生成する
 * @param {HTMLElement} container - 対象のコンテナ要素
 */
function drawBorderSVGStatic(container) {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w <= 2 || h <= 2) return; // 小さすぎる要素は描画しない

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "dynamic-svg-border");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const p = { x1: 1, y1: 1, x2: w - 1, y2: h - 1 };
    const points = `${p.x1},${p.y1} ${p.x2},${p.y1} ${p.x2},${p.y2} ${p.x1},${p.y2} ${p.x1},${p.y1}`;

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points);
    polyline.style.strokeDashoffset = 0; // アニメーション完了状態
    polyline.style.fill = "none";
    
    // 描画フェーズ2（濃い線）のスタイルを直接適用
    polyline.style.stroke = "#FF0";
    polyline.style.strokeWidth = "2px";
    
    svg.appendChild(polyline);
    container.appendChild(svg);
    container.style.opacity = '1';
}

/**
 * 要素（テキストやブロック）を「光らせて」描画する
 * @param {HTMLElement} el - 対象の要素
 */
async function drawElement(el) {
    const type = el.dataset.drawType;
    if (!type) {
        el.style.opacity = '1';
        return;
    }
    
    const preClass = `${type}-pre`;
    const postClass = `${type}-post`;
    
    // 1. ぼんやり光る（pre）= 枠線
    el.classList.add('drawing-element-pre', preClass);
    
    const waitTime = type === 'comment' ? (PRE_DRAW_TIME / 2) : PRE_DRAW_TIME;
    await sleep(waitTime);
    
    // 2. くっきり表示（post）= 塗りつぶし
    el.classList.remove('drawing-element-pre', preClass);
    el.classList.add('drawing-element-post', postClass);
    
    await sleep(POST_DRAW_TIME / 2); // テキスト描画は高速に
}

/**
 * メインの描画エンジン
 */
async function drawEngine() {
    // 1. ページ全体のコンテナを描画
    const terminal = document.getElementById('terminal-screen');
    await drawBorderSVG(terminal);

    // 2. ページ内の主要コンテナを順番に取得して描画
    const mainContainers = document.querySelectorAll(
        '#terminal-screen > .draw-container[data-draw="container"]'
    );

    for (const container of mainContainers) {
        // 2a. コンテナの枠線を描画
        await drawBorderSVG(container);
        
        // 2b. コンテナ内の要素（テキストなど）を描画
        const elements = container.querySelectorAll('[data-draw="element"]');
        for (const el of elements) {
            await drawElement(el);
        }
    }
}


/* ===== コメント機能 ===== */

function initializeComments() {
    const form = document.getElementById("comment-form");
    const commentList = document.getElementById("comment-list");
    if (!form || !commentList) return;

    /**
     * コメントリストをアニメーション付きで描画します。
     * @param {Array} comments - コメントの配列
     * @param {boolean} animate - アニメーションさせるか
     */
    async function renderComments(comments, animate = false) {
        commentList.innerHTML = "";
        const commentElements = [];

        // まずDOMにすべて挿入
        comments.forEach(c => {
            const li = document.createElement("li");
            const nameStrong = document.createElement('strong');
            nameStrong.textContent = c.name;
            const commentText = document.createTextNode(`: ${c.comment}`);
            li.appendChild(nameStrong);
            li.appendChild(commentText);
            
            li.dataset.draw = "element"; // テキスト描画対象
            li.dataset.drawType = "comment"; // コメント用スタイル
            
            commentList.appendChild(li);
            commentElements.push(li);
        });

        // 順番にアニメーション
        for (const li of commentElements) {
            if (animate) {
                // 1. 枠線を描画 (SVG)
                await drawBorderSVG(li);
                // 2. テキストを描画 (Glow)
                await drawElement(li);
            } else {
                // アニメーション無しの場合は、静的ボーダー（SVG）とテキストを即時表示
                li.style.opacity = '1';
                // li.style.border = '2px solid #FF0'; // <-- ★静的borderを削除
                drawBorderSVGStatic(li); // <-- ★静的SVG描画関数を呼ぶ
                li.classList.add('drawing-element-post', 'comment-post');
            }
        }
    }

    // サーバーからコメント取得
    async function fetchComments(animateOnLoad = false) {
        try {
            const res = await fetch("/.netlify/functions/getComments");
            if (!res.ok) throw new Error("関数呼び出しエラー");
            const comments = await res.json();
            await renderComments(comments, animateOnLoad);
            localStorage.setItem("comments", JSON.stringify(comments));
        } catch (e) {
            console.warn("Netlify関数失敗。ローカルコメントを使用:", e.message);
            const local = JSON.parse(localStorage.getItem("comments") || "[]");
            await renderComments(local, animateOnLoad);
        }
    }

    // フォーム送信処理
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = form.name.value.trim();
        const comment = form.comment.value.trim();
        if (!name || !comment) return;

        const newComment = { name, comment };

        try {
            const res = await fetch("/.netlify/functions/addComment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newComment),
            });
            if (!res.ok) throw new Error("送信失敗");
            form.reset();
            await fetchComments(true); // 送信後はアニメーション付きで再読み込み
        } catch (e) {
            console.warn("Netlify関数エラー。ローカル保存:", e.message);
            const local = JSON.parse(localStorage.getItem("comments") || "[]");
            local.push(newComment);
            localStorage.setItem("comments", JSON.stringify(local));
            await renderComments(local, true); // ローカル保存でもアニメーション付きで再描画
            form.reset();
        }
    });

    // 初期読み込み（DOMContentLoadedで呼び出される）
    fetchComments(true); // ページロード時のコメントもアニメーションさせる
}


/* ===== ページ読み込み時のメイン処理 ===== */
document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. メインの描画エンジン（SVGボーダー＋テキスト）を開始
    await drawEngine();
    
    // 2. メイン描画完了後、コメント機能の初期化と読み込みを開始
    initializeComments();
});