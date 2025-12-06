async function loadComments() {
  const res = await fetch('/comments.json');
  const comments = await res.json();
  const list = document.getElementById('comment-list');
  list.innerHTML = '';
  comments.forEach(c => {
    const li = document.createElement('li');
    li.textContent = `${c.name}: ${c.comment}`;
    list.appendChild(li);
  });
}

loadComments();