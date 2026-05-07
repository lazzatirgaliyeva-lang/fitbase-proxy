export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, domain');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { path, ...queryParams } = req.query;

  if (!path) return res.status(400).json({ error: 'Missing path parameter' });

  const domain = req.headers['domain'] || req.headers['x-fitbase-domain'];
  const authorization = req.headers['authorization'];

  if (!domain || !authorization) {
    return res.status(400).json({ error: 'Missing domain or Authorization header' });
  }

  const qs = new URLSearchParams(queryParams).toString();
  const url = `https://api.fitbase.io/api/${path}${qs ? '?' + qs : ''}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'domain': domain,
        'Authorization': authorization,
        'Content-Type': 'application/json',
      },
      body: ['POST', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}
