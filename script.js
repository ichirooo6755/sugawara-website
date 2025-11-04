<script>
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("comment-form");
    const commentList = document.getElementById("comment-list");

    // コメントを表示する関数
    function renderComments(comments) {
        commentList.innerHTML = "";
    comments.forEach(c => {
      const li = document.createElement("li");
    li.innerHTML = `<strong>${c.name}</strong>: ${c.comment}`;
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
    localStorage.setItem("comments", JSON.stringify(comments)); // ローカルにも保存
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

    const newComment = {name, comment};

    try {
      const res = await fetch("/.netlify/functions/addComment", {
        method: "POST",
    headers: {"Content-Type": "application/json" },
    body: JSON.stringify(newComment),
      });
    if (!res.ok) throw new Error("送信失敗");
    form.reset();
    await fetchComments();
    } catch (e) {
        console.warn("Netlify関数エラー。ローカル保存:", e.message);
    const local = JSON.parse(localStorage.getItem("comments") || "[]");
    local.push(newComment);
    localStorage.setItem("comments", JSON.stringify(local));
    renderComments(local);
    form.reset();
    }
  });

    // 初期化
    await fetchComments();
});
</script>