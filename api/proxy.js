export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, domain, x-api-key, anthropic-version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Claude AI proxy
  if (req.url.includes('/api/claude')) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Fitbase proxy
  const { path, ...queryParams } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path' });
  const domain = req.headers['domain'];
  const authorization = req.headers['authorization'];
  if (!domain || !authorization) return res.status(400).json({ error: 'Missing headers' });
  const qs = new URLSearchParams(queryParams).toString();
  const url = `https://api.fitbase.io/api/${path}${qs ? '?' + qs : ''}`;
  try {
    const response = await fetch(url, {
      method: req.method,
      headers: { 'domain': domain, 'Authorization': authorization, 'Content-Type': 'application/json' },
      body: ['POST','PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
