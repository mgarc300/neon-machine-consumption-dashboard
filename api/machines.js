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
    const machines = await sql`
      SELECT 
        m.id,
        m.name,
        m.machine_type,
        m.model,
        m.location,
        m.nominal_power_kw,
        COALESCE(r.status, 'OPERATIONAL') as status,
        COALESCE(r.active_power_kw, 0)::numeric(10,2) as current_kw,
        COALESCE(r.total_kwh, 0)::numeric(10,2) as total_kwh,
        COALESCE(r.voltage_v, 400.0)::numeric(10,1) as voltage_v,
        COALESCE(r.current_a, 0)::numeric(10,1) as current_a,
        r.recorded_at
      FROM machines m
      LEFT JOIN LATERAL (
        SELECT active_power_kw, total_kwh, voltage_v, current_a, status, recorded_at
        FROM consumption_readings cr
        WHERE cr.machine_id = m.id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) r ON true
      ORDER BY m.id;
    `;

    return res.status(200).json({ ok: true, data: machines });
  } catch (error) {
    console.error('Error in /api/machines:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}