import { query } from '../db/client.js';

/**
 * Machine entity repository adhering to machine-inventory specification.
 */

/**
 * Creates or registers a new machine in the inventory.
 * @param {Object} machineData
 * @param {string} machineData.id - Unique identifier (e.g. 'CNC-01')
 * @param {string} machineData.name - Human-readable name
 * @param {string} machineData.machineType - Type/category (e.g. 'Milling Machine')
 * @param {string} [machineData.model] - Model/serial identifier
 * @param {string} [machineData.location] - Factory floor location
 * @param {number} [machineData.nominalPowerKw] - Nominal power rating in kW
 */
export async function createMachine({
  id,
  name,
  machineType,
  model = null,
  location = null,
  nominalPowerKw = 0.0,
}) {
  const sql = `
    INSERT INTO machines (id, name, machine_type, model, location, nominal_power_kw)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      machine_type = EXCLUDED.machine_type,
      model = EXCLUDED.model,
      location = EXCLUDED.location,
      nominal_power_kw = EXCLUDED.nominal_power_kw
    RETURNING *;
  `;

  const res = await query(sql, [id, name, machineType, model, location, nominalPowerKw]);
  return res.rows[0];
}

/**
 * Retrieves a machine by its unique identifier.
 * Returns null if the machine is not found (avoids unhandled exceptions).
 * @param {string} id - Machine identifier
 * @returns {Promise<Object|null>}
 */
export async function getMachineById(id) {
  const sql = `
    SELECT id, name, machine_type, model, location, nominal_power_kw, created_at
    FROM machines
    WHERE id = $1;
  `;

  const res = await query(sql, [id]);
  return res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * Lists all registered machines with optional location filtering.
 * @param {Object} [filter]
 * @param {string} [filter.location]
 * @param {string} [filter.machineType]
 * @returns {Promise<Array<Object>>}
 */
export async function listMachines(filter = {}) {
  let sql = `
    SELECT id, name, machine_type, model, location, nominal_power_kw, created_at
    FROM machines
  `;
  const params = [];
  const conditions = [];

  if (filter.location) {
    params.push(filter.location);
    conditions.push(`location = $${params.length}`);
  }

  if (filter.machineType) {
    params.push(filter.machineType);
    conditions.push(`machine_type = $${params.length}`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  sql += ` ORDER BY id ASC;`;
  const res = await query(sql, params);
  return res.rows;
}
export default {
  createMachine,
  getMachineById,
  listMachines,
};
