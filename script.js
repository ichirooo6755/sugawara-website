
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("comment-form");
  const commentList = document.getElementById("comment-list");

  // コメントを表示する関数
  function renderComments(comments) {
    commentList.innerHTML = "";
    comments.forEach(c => {
      if (!c.name || !c.comment) {
        console.warn("Invalid comment:", c);
        return;
      }

      const li = document.createElement("li");
      const nameEl = document.createElement("strong");
      nameEl.textContent = c.name + ": ";
      li.appendChild(nameEl);

      // XSS対策としてcreateTextNodeを使用。良い実装です。
      const commentEl = document.createTextNode(c.comment); 
      li.appendChild(commentEl);

      commentList.appendChild(li);
    });
  }

  // サーバーからコメント取得
  async function fetchComments() {
    try {
      const res = await fetch("/.netlify/functions/getComments");
      if (!res.ok) throw new Error("関数呼び出しエラー");
      const comments = await res.json();
      renderComments(comments);
      localStorage.setItem("comments", JSON.stringify(comments));
    } catch (e) {
      console.warn("Netlify関数失敗。ローカルコメントを使用:", e.message);
      const local = JSON.parse(localStorage.getItem("comments") || "[]");
      renderComments(local);
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
      
      // ⭐ 変更点: サーバーから再取得せず、ローカルリストを更新して高速表示
      const local = JSON.parse(localStorage.getItem("comments") || "[]");
      local.push(newComment);
      localStorage.setItem("comments", JSON.stringify(local));
      renderComments(local);
      
      form.reset();
      
    } catch (e) {
      // サーバー関数失敗。ローカル保存（フォールバック）
      console.warn("Netlify関数エラー。ローカル保存:", e.message);
      const local = JSON.parse(localStorage.getItem("comments") || "[]");
      local.push(newComment);
      localStorage.setItem("comments", JSON.stringify(local));
      renderComments(local);
      form.reset();
    }
  });

  // 初期化
  fetchComments(); 
});