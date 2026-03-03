// functions/callSugawara.js
// 「菅原を呼ぶ」ボタンが押されたら LINE Notify で通知を送る

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Method Not Allowed' };
  }

  const TOKEN = process.env.LINE_NOTIFY_TOKEN;
  if (!TOKEN) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'LINE_NOTIFY_TOKEN が設定されていません' })
    };
  }

  // 送信者のメッセージ（任意）
  let senderMsg = '';
  try {
    const body = JSON.parse(event.body || '{}');
    if (body.message) senderMsg = `\nメッセージ: ${body.message}`;
  } catch (e) {}

  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const message = `\n【1RAW デモサイト】\n誰かがあなたを呼んでいます！${senderMsg}\n時刻: ${now}\nhttps://sgwr-website.netlify.app`;

  try {
    const res = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `message=${encodeURIComponent(message)}`
    });

    if (res.ok) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true })
      };
    } else {
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: '送信失敗', detail: text })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '内部エラー', detail: String(err) })
    };
  }
}
