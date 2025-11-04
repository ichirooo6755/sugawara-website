// functions/getComments.js
// Netlify Functions（読み出し用）
// 注意: Netlify の実行環境では global fetch が使えます。
//       import は不要にしてあります。

export async function handler() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO = "ichirooo6755/sugawara-website"; // ← ここを書き換えてください
  const PATH = "comments.json";
  const BRANCH = "main";

  const url = `https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3.raw"
      }
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "GitHubからcomments.jsonを取得できませんでした。", detail: text })
      };
    }

    const text = await res.text(); // raw JSON text
    // text は配列の JSON 文字列を期待
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "内部エラー", detail: String(err) })
    };
  }
}