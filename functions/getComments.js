// functions/getComments.js
import fetch from "node-fetch";

export async function handler() {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "ユーザー名/リポジトリ名"; // ←あなたのGitHubリポジトリに変更
    const PATH = "comments.json";
    const BRANCH = "main";

    const res = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`,
        {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3.raw",
            },
        }
    );

    if (!res.ok) {
        return {
            statusCode: res.status,
            body: JSON.stringify({ error: "コメントの取得に失敗しました。" }),
        };
    }

    const data = await res.json();
    return {
        statusCode: 200,
        body: JSON.stringify(data),
    };
}