import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return res.status(500).json({ ok: false, error: 'DATABASE_URL not configured' });
    }

    const sql = neon(databaseUrl);
    const history = await sql`
      SELECT 
        machine_id,
        date_trunc('hour', recorded_at) as hour_bucket,
        AVG(active_power_kw)::numeric(10,2) as avg_power_kw,
        MAX(active_power_kw)::numeric(10,2) as peak_power_kw,
        MAX(total_kwh)::numeric(10,2) as max_kwh
      FROM consumption_readings
      WHERE recorded_at >= NOW() - INTERVAL '24 hours'
      GROUP BY machine_id, date_trunc('hour', recorded_at)
      ORDER BY hour_bucket ASC;
    `;

    return res.status(200).json({ ok: true, data: history });
  } catch (error) {
    console.error('Error in /api/history:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}