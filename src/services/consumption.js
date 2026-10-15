import { query } from '../db/client.js';

/**
 * Consumption telemetry repository adhering to machine-consumption-telemetry specification.
 */

/**
 * Records a new electrical telemetry reading for a machine.
 * @param {Object} reading
 * @param {string} reading.machineId - Associated machine identifier
 * @param {Date|string} [reading.recordedAt] - Timestamp of measurement
 * @param {number} reading.activePowerKw - Active electrical power draw in kW
 * @param {number} reading.totalKwh - Cumulative energy counter in kWh
 * @param {number} [reading.voltageV] - Phase/line voltage in Volts
 * @param {number} [reading.currentA] - Current in Amperes
 * @param {string} [reading.status] - Machine operating state (e.g., 'OPERATIONAL', 'IDLE', 'OFFLINE')
 */
export async function recordReading({
  machineId,
  recordedAt = new Date(),
  activePowerKw,
  totalKwh,
  voltageV = null,
  currentA = null,
  status = 'OPERATIONAL',
}) {
  const sql = `
    INSERT INTO consumption_readings (
      machine_id, recorded_at, active_power_kw, total_kwh, voltage_v, current_a, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const res = await query(sql, [
    machineId,
    recordedAt,
    activePowerKw,
    totalKwh,
    voltageV,
    currentA,
    status,
  ]);

  return res.rows[0];
}

/**
 * Retrieves the most recent consumption reading for a given machine or all machines.
 * Uses the composite index (machine_id, recorded_at DESC) for sub-millisecond execution.
 * @param {string} [machineId] - Optional machine identifier
 * @returns {Promise<Object|Array<Object>|null>}
 */
export async function getLatestReading(machineId = null) {
  if (machineId) {
    const sql = `
      SELECT r.*, m.name as machine_name, m.nominal_power_kw
      FROM consumption_readings r
      JOIN machines m ON r.machine_id = m.id
      WHERE r.machine_id = $1
      ORDER BY r.recorded_at DESC
      LIMIT 1;
    `;
    const res = await query(sql, [machineId]);
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  // Retrieve latest reading across each active machine
  const sql = `
    SELECT DISTINCT ON (r.machine_id)
      r.*, m.name as machine_name, m.nominal_power_kw
    FROM consumption_readings r
    JOIN machines m ON r.machine_id = m.id
    ORDER BY r.machine_id, r.recorded_at DESC;
  `;
  const res = await query(sql);
  return res.rows;
}

/**
 * Computes aggregated consumption metrics over a specified date/time window.
 * Calculates total energy (kWh consumed), average power (kW), and peak demand (kW).
 * @param {Object} options
 * @param {string} [options.machineId] - Optional machine filter
 * @param {Date|string} [options.startDate] - Start timestamp of interval
 * @param {Date|string} [options.endDate] - End timestamp of interval
 * @returns {Promise<Array<Object>>}
 */
export async function getAggregatedConsumption({ machineId = null, startDate = null, endDate = null } = {}) {
  const conditions = [];
  const params = [];

  if (machineId) {
    params.push(machineId);
    conditions.push(`r.machine_id = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`r.recorded_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`r.recorded_at <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ` + conditions.join(' AND ') : '';

  const sql = `
    SELECT 
      r.machine_id,
      m.name as machine_name,
      m.machine_type,
      m.location,
      COUNT(r.id)::int as sample_count,
      MIN(r.recorded_at) as period_start,
      MAX(r.recorded_at) as period_end,
      ROUND(COALESCE(MAX(r.total_kwh) - MIN(r.total_kwh), 0)::numeric, 3) as total_kwh_consumed,
      ROUND(AVG(r.active_power_kw)::numeric, 2) as avg_power_kw,
      ROUND(MAX(r.active_power_kw)::numeric, 2) as peak_power_kw,
      ROUND(MIN(r.active_power_kw)::numeric, 2) as min_power_kw
    FROM consumption_readings r
    JOIN machines m ON r.machine_id = m.id
    ${whereClause}
    GROUP BY r.machine_id, m.name, m.machine_type, m.location
    ORDER BY total_kwh_consumed DESC;
  `;

  const res = await query(sql, params);
  return res.rows;
}

export default {
  recordReading,
  getLatestReading,
  getAggregatedConsumption,
};
