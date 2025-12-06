/* ===== 設定値 ===== */

const PRE_DRAW_TIME = 400; // フォームの枠線アニメーション時間 (ms)
const POST_DRAW_TIME = 100; // 次の要素までの待機時間 (ms)
const LINE_DRAW_SPEED = 2.5; // 線の描画速度 (px/ms)
const TEXT_DRAW_SPEED = 50; // 1文字あたりの描画速度 (ms)

/**
 * 処理を一時停止するヘルパー関数
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* ===== 描画エンジン (SVG/rAF) ===== */

/**
 * 1本のSVGストローク(line/polyline)を requestAnimationFrame で描画する
 */
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


/**
 * コンテナにSVGボーダーを生成し、アニメーション描画する (Polyline版)
 */
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

    // コメントフォームの底辺消失を防ぐため、待機時間を最小限に短縮
    await sleep(20);
}

/**
 * コンテナにSVGボーダーを静的に（アニメーションなしで）生成する
 */
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

    // 1文字ずつ表示するタイプか (全てのテキスト)
    const isTypingText = type.startsWith('text-') || type === 'comment' || type === 'block-red';
    // 枠線アニメーションのみのタイプか (フォーム)
    const isFormAnim = type.startsWith('form-');

    let originalText = '';
    let isAnchor = el.tagName === 'A';

    // 1. 共通の初期化処理
    el.classList.add('drawing-element-pre', preClass);
    el.style.visibility = 'visible';
    el.style.opacity = '1';

    // 2. 1文字ずつ表示 (isTypingText が true の場合)
    if (isTypingText) {

        originalText = el.innerHTML;

        const nodeContents = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalText;

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

        const totalChars = nodeContents.reduce((sum, node) => sum + (node.type !== 'br' ? node.content.length : 0), 0);
        let currentTotalCharsDisplayed = 0;

        el.innerHTML = '';

        // 1文字ずつ表示アニメーション実行
        for (let i = 0; i < totalChars; i++) {
            currentTotalCharsDisplayed++;
            let tempContent = '';
            let charsProcessed = 0;

            for (const tNode of nodeContents) {
                if (tNode.type === 'br') {
                    tempContent += tNode.content;
                    continue;
                }
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

            if (i < totalChars - 1) {
                await sleep(TEXT_DRAW_SPEED);
            }
        }

        // 1文字ずつ表示完了後の待機
        await sleep(100);

    } else if (isFormAnim) {
        // 3. フォーム要素の枠線アニメーション
        await sleep(PRE_DRAW_TIME);
    }

    // 4. 塗りつぶしへ移行 (post)
    el.classList.remove('drawing-element-pre', preClass);
    el.classList.add('drawing-element-post', postClass);

    // テキストタイプの場合、元の内容を完全表示に戻す
    if (isTypingText) {
        el.innerHTML = originalText;
    }

    await sleep(POST_DRAW_TIME / 2);
}

/**
 * メインの描画エンジン (再帰処理)
 */
async function drawEngine(rootElement) {
    // ':scope > [data-draw]' で直下の要素のみを取得
    const children = rootElement.querySelectorAll(':scope > [data-draw]');

    for (const child of children) {
        const drawType = child.dataset.draw;

        if (drawType === 'container') {
            await drawBorderSVG(child);
            // 枠線を描画してから、子要素を描画する
            await drawEngine(child);

        } else if (drawType === 'element') {
            await drawElement(child);

        } else if (drawType === 'comments') {
            // コメントリストの描画をここで待機
            await initializeComments(child);

            // ★★★ 修正箇所: 親コンテナの枠線SVGを正しい高さで再描画 ★★★
            const containerParent = child.closest('[data-draw="container"]');
            if (containerParent) {

                // **重要: 既存のSVGを全て削除する処理を確実に実行**
                containerParent.querySelectorAll('.dynamic-svg-border').forEach(svg => svg.remove());

                // ブラウザにリフローを強制し、正しい高さを確定させる
                containerParent.getBoundingClientRect().height;

                // 正しい高さで静的に枠線を描画する
                drawBorderSVGStatic(containerParent);
            }

            // 親の親（rootElement）もリフローさせる（フッターの座標確定用）
            rootElement.getBoundingClientRect().height;
            await sleep(50);
        }
    }
}


/* ===== コメント機能 ===== */

/**
 * コメント機能の初期化、データ取得、描画を担う (描画完了まで待機)
 * @param {HTMLUListElement} commentListElement - コメントを表示するUL要素
 */
async function initializeComments(commentListElement) {
    const form = document.getElementById("comment-form");
    if (!form || !commentListElement) return;

    // コメントを DOM にレンダリングし、必要に応じてアニメーション描画する
    async function renderComments(comments, animate = false) {
        commentListElement.innerHTML = "";
        const commentElements = [];

        // 1. DOMに追加
        comments.forEach(c => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${c.name}</strong>: ${c.comment}`;

            li.dataset.draw = "element";
            li.dataset.drawType = "comment";

            commentListElement.appendChild(li);
            commentElements.push(li);
        });

        // 2. アニメーション実行
        if (animate) {
            const drawTasks = commentElements.map(async (li) => {
                await drawElement(li);
            });
            await Promise.all(drawTasks);
        } else {
            // アニメーションなしの場合は、即座に最終スタイルを適用
            for (const li of commentElements) {
                li.style.visibility = 'visible';
                li.style.opacity = '1';
                li.classList.add('drawing-element-post', 'comment-post');
            }
        }

        // ★★★ 最終修正箇所 A: コメントリストと親要素の高さ確定（リフロー強制） ★★★
        const parentContainer = commentListElement.closest('[data-draw="container"]');

        // コメントリストの高さ確定
        commentListElement.getBoundingClientRect().height;

        // 最も近い親コンテナ（mainタグなど）の高さ確定
        if (parentContainer) {
            parentContainer.getBoundingClientRect().height;
        }
        await sleep(20);
    }

    // コメントをサーバーまたはローカルストレージから取得する
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

    // フォーム送信時の処理
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
            await fetchComments(true);
        } catch (e) {
            console.warn("Netlify関数エラー。ローカル保存:", e.message);
            const local = JSON.parse(localStorage.getItem("comments") || "[]");
            local.push(newComment);
            localStorage.setItem("comments", JSON.stringify(local));
            await renderComments(local, true);
            form.reset();
        }
    });


    // 初回ロード時: コメントの取得と描画を実行し、完了まで drawEngine を待機させる
    await fetchComments(true);

    // ★★★ 最終修正箇所 B: 親要素の再確認（リフロー強制） ★★★
    const grandParentContainer = commentListElement.closest('[data-draw="container"]');
    if (grandParentContainer) {
        grandParentContainer.getBoundingClientRect().height;
    }
}


/* ===== ページ読み込み時のメイン処理 ===== */
document.addEventListener("DOMContentLoaded", async () => {

    const terminal = document.getElementById('terminal-screen');
    // #terminal-screen 自体の枠線は描画せず、visibility/opacityのみONにする
    terminal.style.visibility = 'visible';
    terminal.style.opacity = '1';

    // drawEngine が #terminal-screen の中身（nav, main, footer）を順番に描画開始
    await drawEngine(terminal);
});