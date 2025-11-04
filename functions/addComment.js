// functions/addComment.js
// Netlify Functions（書き込み用）
// 注意: Netlify の実行環境では global fetch が使えます。

export async function handler(event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: { "Allow": "POST", "Access-Control-Allow-Origin": "*" }, body: "Method Not Allowed" };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "ichirooo6755/sugawara-website"; // ← ここを書き換えてください
    const PATH = "comments.json";
    const BRANCH = "main";

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: "invalid json body" };
    }

    const name = (body.name || '名無し').toString().slice(0, 100);
    const comment = (body.comment || '').toString().slice(0, 2000);
    const createdAt = body.createdAt || new Date().toISOString();

    // 1) 既存の comments.json を取得
    const getUrl = `https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`;
    try {
        const getRes = await fetch(getUrl, {
            headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" }
        });

        if (!getRes.ok) {
            const txt = await getRes.text();
            return { statusCode: getRes.status, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "comments.json取得失敗", detail: txt }) };
        }

        const data = await getRes.json();
        const sha = data.sha;
        const contentBase64 = data.content;
        const contentStr = Buffer.from(contentBase64, 'base64').toString('utf8');

        let arr;
        try {
            arr = JSON.parse(contentStr);
            if (!Array.isArray(arr)) arr = [];
        } catch (e) {
            arr = [];
        }

        // 2) コメントを追加
        const newComment = { name, comment, createdAt };
        arr.push(newComment);

        // 3) 更新（PUT）
        const updatedBase64 = Buffer.from(JSON.stringify(arr, null, 2)).toString('base64');
        const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Add comment (${name})`,
                content: updatedBase64,
                sha,
                branch: BRANCH
            })
        });

        if (!putRes.ok) {
            const txt = await putRes.text();
            return { statusCode: putRes.status, headers: { "Access-Control-Allow-Origin": "*" }, body: txt };
        }

        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: true }) };
    } catch (err) {
        return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "内部エラー", detail: String(err) }) };
    }
}