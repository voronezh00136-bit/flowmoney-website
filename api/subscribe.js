export default async function handler(req, res) {
  const ALLOWED_ORIGINS = ['https://tryflowmoney.com', 'https://www.tryflowmoney.com', 'https://flowmoney-app.vercel.app'];
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const email = ((body && body.email) || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase env vars');
    return res.status(500).json({ error: 'Server config error' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        email,
        source: 'website_waitlist',
        created_at: new Date().toISOString(),
      }),
    });

    // 201 = created, 409 = already exists (duplicate) — both are success for user
    if (response.status === 201 || response.status === 200) {
      return res.status(200).json({ success: true });
    }
    if (response.status === 409) {
      return res.status(200).json({ success: true, already: true });
    }

    console.error('Supabase error:', response.status); // no body — avoid leaking schema info
    return res.status(500).json({ error: 'Could not save email' });
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Network error' });
  }
}
