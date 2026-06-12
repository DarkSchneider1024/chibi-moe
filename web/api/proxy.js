export const config = {
  api: {
    responseLimit: '8mb',
  },
};

export default async function handler(req, res) {
  // Add CORS headers to allow requests from localhost during dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const fetchRes = await fetch(url);
    
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: `Failed to fetch from GitHub: ${fetchRes.statusText}` });
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Proxy Error:', err);
    res.status(500).json({ error: err.message });
  }
}
