export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { number, text } = req.body || {};
  if (!number || !text) return res.status(400).json({ error: 'number e text obrigatórios' });

  try {
    const resp = await fetch('https://clara-ai.uazapi.com/sendText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': '10625a6c-1690-4356-a862-57da4401d555'
      },
      body: JSON.stringify({ number, text })
    });

    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
